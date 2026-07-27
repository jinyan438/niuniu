// TTS 语音合成
(function() {
    var NR = window.NovelReader;

    var TTS_TIMEOUTS = {
        gptsovits: {
            downloadStallMs: 15000,
            totalRequestMs: 120000,
            requestStallMs: 90000
        },
        indextts: {
            downloadStallMs: 60000,
            totalRequestMs: 900000,
            requestStallMs: 900000
        }
    };
    var ttsWatchdogTimer = null;
    var ttsSeqStartTime = new Map();

    function getCurrentTtsTimeouts() {
        if (NR.ttsController && NR.ttsController.isIndexTtsProvider && NR.ttsController.isIndexTtsProvider()) {
            return TTS_TIMEOUTS.indextts;
        }
        return TTS_TIMEOUTS.gptsovits;
    }

    function getFilesystemPlugin() {
        return window.Capacitor &&
            window.Capacitor.Plugins &&
            window.Capacitor.Plugins.Filesystem
            ? window.Capacitor.Plugins.Filesystem
            : null;
    }

    function inferAudioExtension(mimeType) {
        if (mimeType === 'audio/aac') return 'aac';
        if (mimeType === 'audio/ogg') return 'ogg';
        if (mimeType === 'audio/raw' || mimeType === 'audio/x-raw') return 'raw';
        return 'wav';
    }

    function arrayBufferToBase64(buffer) {
        var bytes = new Uint8Array(buffer);
        var binary = '';
        var chunkSize = 0x8000;

        for (var i = 0; i < bytes.length; i += chunkSize) {
            var chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

    function deleteCachedAudio(item) {
        var Filesystem = getFilesystemPlugin();
        if (!item || !item.cachePath || !Filesystem) return Promise.resolve();
        return Filesystem.deleteFile({
            path: item.cachePath,
            directory: item.cacheDirectory || 'CACHE'
        }).catch(function(error) {
            console.warn('Failed to delete cached TTS audio:', error);
        });
    }

    function cleanupAudioResource(item) {
        if (!item) return;
        if (item.blobUrl) {
            URL.revokeObjectURL(item.blobUrl);
        }
        if (item.cachePath) {
            deleteCachedAudio(item);
        }
    }

    function setTtsStatus(message, sequence) {
        if (!NR.ttsState || !NR.ttsState.isActive) return;
        if (sequence !== undefined && sequence !== null && sequence !== NR.ttsState.currentSequence) return;
        NR.els['tts-status'].textContent = message;
    }

    var dialogueRegex = /(\u201c[^\u201d]*\u201d|"[^"]*"|「[^」]*」)/g;

    function appendTtsChunk(chunks, text, paragraph, isDialogue) {
        var cleanedText = String(text || '').trim();
        if (!cleanedText) return;
        chunks.push({
            text: cleanedText,
            paragraph: paragraph,
            isDialogue: !!isDialogue
        });
    }

    function splitParagraphIntoTtsChunks(paragraph) {
        var text = paragraph && paragraph.textContent ? paragraph.textContent : '';
        var chunks = [];
        var match;
        var lastIndex = 0;

        dialogueRegex.lastIndex = 0;
        while ((match = dialogueRegex.exec(text)) !== null) {
            appendTtsChunk(chunks, text.slice(lastIndex, match.index), paragraph, false);
            appendTtsChunk(chunks, match[0], paragraph, true);
            lastIndex = match.index + match[0].length;
        }

        appendTtsChunk(chunks, text.slice(lastIndex), paragraph, false);

        if (chunks.length === 0) {
            appendTtsChunk(chunks, text, paragraph, false);
        }

        return chunks;
    }

    function createPlayableAudioSource(blob, sequence) {
        var mimeType = blob.type || 'audio/wav';
        var useNativeCache = NR.isCapacitor &&
            NR.isCapacitor() &&
            window.Capacitor &&
            window.Capacitor.convertFileSrc &&
            getFilesystemPlugin();

        if (!useNativeCache) {
            return Promise.resolve({
                playUrl: URL.createObjectURL(blob),
                blobUrl: null,
                cachePath: null,
                cacheDirectory: null
            }).then(function(result) {
                result.blobUrl = result.playUrl;
                return result;
            });
        }

        return blob.arrayBuffer().then(function(buffer) {
            var Filesystem = getFilesystemPlugin();
            var ext = inferAudioExtension(mimeType);
            var relativePath = 'niuniu-tts/seq-' + Date.now() + '-' + sequence + '.' + ext;
            var base64Data = arrayBufferToBase64(buffer);

            return Filesystem.writeFile({
                path: relativePath,
                directory: 'CACHE',
                data: base64Data,
                recursive: true
            }).then(function(writeResult) {
                setTtsStatus('已写入本地缓存...', sequence);
                if (writeResult && writeResult.uri) {
                    return writeResult;
                }
                return Filesystem.getUri({
                    path: relativePath,
                    directory: 'CACHE'
                });
            }).then(function(uriResult) {
                if (!uriResult || !uriResult.uri) {
                    throw new Error('TTS cache file uri is missing.');
                }
                return {
                    playUrl: window.Capacitor.convertFileSrc(uriResult.uri),
                    blobUrl: null,
                    cachePath: relativePath,
                    cacheDirectory: 'CACHE'
                };
            });
        });
    }

    NR.ttsState = {
        isPlaying: false,
        isPaused: false,
        isActive: false,
        currentSequence: 0,
        nextSequenceToFetch: 0,
        textChunks: [],
        audioQueue: new Map(),
        currentPlayItem: null,
        inFlightRequests: 0,
        pumpTimer: null,
        pumpActive: false,
        maxConcurrency: 1,
        bufferSize: 2,
    };

    NR.ttsController = {
        settings: {
            provider: 'gptsovits',
            gptSovitsApiUrl: '',
            indexTtsApiUrl: '',
            speedFactor: 1.0,
            topK: 5,
            topP: 1.0,
            temperature: 1.0,
            gptSovitsVoices: [],
            gptSovitsActiveVoiceId: null,
            gptSovitsDialogueVoiceId: '',
            indexTtsVoices: [],
            indexTtsActiveVoiceId: '',
            indexTtsDialogueVoiceId: '',
        },
        loadedVoiceId: null,
        indexTtsVoiceCatalogStatus: 'idle',
        isFetchingIndexTtsVoices: false,

        normalizeProvider: function(provider) {
            return provider === 'indextts' ? 'indextts' : 'gptsovits';
        },

        migrateLegacySettings: function() {
            if (!this.settings.gptSovitsApiUrl && this.settings.apiUrl) {
                this.settings.gptSovitsApiUrl = this.settings.apiUrl;
            }
            if ((!this.settings.gptSovitsVoices || this.settings.gptSovitsVoices.length === 0) && this.settings.voices) {
                this.settings.gptSovitsVoices = this.settings.voices.slice();
            }
            if (!this.settings.gptSovitsActiveVoiceId && this.settings.activeVoiceId) {
                this.settings.gptSovitsActiveVoiceId = this.settings.activeVoiceId;
            }
            if (!this.settings.gptSovitsDialogueVoiceId && this.settings.dialogueVoiceId) {
                this.settings.gptSovitsDialogueVoiceId = this.settings.dialogueVoiceId;
            }
        },

        ensureSettingsShape: function() {
            this.settings.provider = this.normalizeProvider(this.settings.provider);
            if (!this.settings.gptSovitsVoices) this.settings.gptSovitsVoices = [];
            if (!this.settings.indexTtsVoices) this.settings.indexTtsVoices = [];
            if (!this.settings.gptSovitsDialogueVoiceId) this.settings.gptSovitsDialogueVoiceId = '';
            if (!this.settings.indexTtsDialogueVoiceId) this.settings.indexTtsDialogueVoiceId = '';
            if (!this.settings.gptSovitsApiUrl) this.settings.gptSovitsApiUrl = '';
            if (!this.settings.indexTtsApiUrl) this.settings.indexTtsApiUrl = '';
        },

        loadSettings: function() {
            var saved = localStorage.getItem('novelReaderTtsSettings');
            if (saved) {
                var parsed = JSON.parse(saved);
                this.settings = Object.assign({}, this.settings, parsed);
            }
            this.migrateLegacySettings();
            this.ensureSettingsShape();
        },

        saveSettings: function() {
            localStorage.setItem('novelReaderTtsSettings', JSON.stringify(this.settings));
        },

        getCurrentProvider: function() {
            return this.normalizeProvider(this.settings.provider);
        },

        isIndexTtsProvider: function() {
            return this.getCurrentProvider() === 'indextts';
        },

        getCurrentApiUrl: function() {
            return this.isIndexTtsProvider() ? this.settings.indexTtsApiUrl : this.settings.gptSovitsApiUrl;
        },

        setCurrentApiUrl: function(apiUrl) {
            if (this.isIndexTtsProvider()) {
                this.settings.indexTtsApiUrl = apiUrl || '';
            } else {
                this.settings.gptSovitsApiUrl = apiUrl || '';
            }
        },

        getVoicesForProvider: function(provider) {
            return this.normalizeProvider(provider) === 'indextts' ? this.settings.indexTtsVoices : this.settings.gptSovitsVoices;
        },

        setVoicesForProvider: function(provider, voices) {
            if (this.normalizeProvider(provider) === 'indextts') {
                this.settings.indexTtsVoices = voices || [];
            } else {
                this.settings.gptSovitsVoices = voices || [];
            }
        },

        getAvailableVoices: function() {
            return this.getVoicesForProvider(this.getCurrentProvider());
        },

        getActiveVoiceId: function() {
            return this.isIndexTtsProvider() ? this.settings.indexTtsActiveVoiceId : this.settings.gptSovitsActiveVoiceId;
        },

        setActiveVoiceId: function(voiceId) {
            if (this.isIndexTtsProvider()) {
                this.settings.indexTtsActiveVoiceId = voiceId || '';
            } else {
                this.settings.gptSovitsActiveVoiceId = voiceId || null;
            }
        },

        getDialogueVoiceId: function() {
            return this.isIndexTtsProvider() ? this.settings.indexTtsDialogueVoiceId : this.settings.gptSovitsDialogueVoiceId;
        },

        setStoredDialogueVoiceId: function(voiceId) {
            if (this.isIndexTtsProvider()) {
                this.settings.indexTtsDialogueVoiceId = voiceId || '';
            } else {
                this.settings.gptSovitsDialogueVoiceId = voiceId || '';
            }
        },

        getVoiceById: function(id, provider) {
            var normalizedProvider = this.normalizeProvider(provider || this.getCurrentProvider());
            var voices = this.getVoicesForProvider(normalizedProvider);
            return voices.find(function(v) { return v.id === id; }) || null;
        },

        getDialogueVoice: function() {
            var voiceId = this.getDialogueVoiceId();
            if (!voiceId) return null;
            return this.getVoiceById(voiceId);
        },

        getVoiceForTextChunk: function(chunk) {
            if (chunk && chunk.isDialogue) {
                return this.getDialogueVoice() || this.getVoiceById(this.getActiveVoiceId());
            }
            return this.getVoiceById(this.getActiveVoiceId());
        },

        getIndexTtsRequestVoiceName: function(voice) {
            return voice && (voice.presetName || voice.name || voice.id);
        },

        updateStatusIndicatorForIndexTts: function() {
            if (this.indexTtsVoiceCatalogStatus === 'loading') {
                NR.els['tts-status-indicator'].className = 'tts-status-indicator loading';
            } else if (this.indexTtsVoiceCatalogStatus === 'error') {
                NR.els['tts-status-indicator'].className = 'tts-status-indicator error';
            } else if (this.settings.indexTtsVoices.length > 0) {
                NR.els['tts-status-indicator'].className = 'tts-status-indicator ready';
            } else {
                NR.els['tts-status-indicator'].className = 'tts-status-indicator';
            }
        },

        updateProviderUI: function() {
            var isIndexTts = this.isIndexTtsProvider();
            NR.els['tts-provider-selector'].value = this.getCurrentProvider();
            NR.els['tts-provider-selector-ai'].value = this.getCurrentProvider();
            NR.els['tts-api-url-label'].textContent = isIndexTts ? 'IndexTTS API 基地址' : 'GPT-SoVITS API 基地址';
            NR.els['tts-api-url'].placeholder = isIndexTts ? '例如: http://127.0.0.1:9881' : '例如: http://127.0.0.1:9880';
            NR.els['tts-gptsovits-voice-management'].style.display = isIndexTts ? 'none' : '';
            NR.els['tts-indextts-provider-hint'].style.display = isIndexTts ? 'block' : 'none';
            NR.els['tts-gptsovits-params'].style.display = isIndexTts ? 'none' : '';
            NR.els['tts-refresh-voices-row'].style.display = isIndexTts ? '' : 'none';
            if (isIndexTts) {
                this.updateStatusIndicatorForIndexTts();
            }
        },

        ensureVoiceSelections: function() {
            var availableVoices = this.getAvailableVoices();
            var activeVoiceId = this.getActiveVoiceId();
            var dialogueVoiceId = this.getDialogueVoiceId();

            if (availableVoices.length === 0) {
                this.setActiveVoiceId(this.isIndexTtsProvider() ? '' : null);
                this.setStoredDialogueVoiceId('');
                return;
            }

            if (!activeVoiceId || !this.getVoiceById(activeVoiceId)) {
                this.setActiveVoiceId(availableVoices[0].id);
            }
            if (dialogueVoiceId && !this.getVoiceById(dialogueVoiceId)) {
                this.setStoredDialogueVoiceId('');
            }
        },

        renderVoiceManagementList: function() {
            var voices = this.getAvailableVoices();
            NR.els['tts-voice-list'].innerHTML = '';

            if (this.isIndexTtsProvider()) {
                if (voices.length === 0) {
                    NR.els['tts-voice-list'].innerHTML = '<li>未拉取到 IndexTTS 预设。</li>';
                } else {
                    voices.forEach(function(voice) {
                        var li = document.createElement('li');
                        li.innerHTML = '<span class="voice-item-name">' + NR.escapeHtml(voice.name) + '</span>';
                        NR.els['tts-voice-list'].appendChild(li);
                    });
                }
                return;
            }

            if (voices.length === 0) {
                NR.els['tts-voice-list'].innerHTML = '<li>没有已保存的音色。</li>';
                return;
            }

            voices.forEach(function(voice) {
                var li = document.createElement('li');
                li.innerHTML = '<span class="voice-item-name">' + NR.escapeHtml(voice.name) + '</span><div class="modal-list-actions"><button class="action-btn edit-voice-btn" data-id="' + voice.id + '">编辑</button><button class="action-btn delete-btn delete-voice-btn" data-id="' + voice.id + '">删除</button></div>';
                NR.els['tts-voice-list'].appendChild(li);
            });
        },

        renderVoiceSelectors: function() {
            var availableVoices = this.getAvailableVoices();
            var activeVoiceId;
            var dialogueVoiceId;

            this.ensureVoiceSelections();
            activeVoiceId = this.getActiveVoiceId();
            dialogueVoiceId = this.getDialogueVoiceId();

            NR.els['tts-voice-selector'].innerHTML = '';
            NR.els['tts-dialogue-voice-selector'].innerHTML = '';

            if (availableVoices.length === 0) {
                var option = document.createElement('option');
                option.textContent = this.isIndexTtsProvider() ? '无可用预设' : '无可用音色';
                option.disabled = true;
                NR.els['tts-voice-selector'].appendChild(option);

                var dialogueOption = document.createElement('option');
                dialogueOption.textContent = '跟随主音色';
                dialogueOption.disabled = true;
                NR.els['tts-dialogue-voice-selector'].appendChild(dialogueOption);
                if (!this.isIndexTtsProvider()) {
                    NR.els['tts-status-indicator'].className = 'tts-status-indicator';
                }
                return;
            }

            var followOption = document.createElement('option');
            followOption.value = '';
            followOption.textContent = '跟随主音色';
            NR.els['tts-dialogue-voice-selector'].appendChild(followOption);

            availableVoices.forEach(function(voice) {
                var option = document.createElement('option');
                option.value = voice.id;
                option.textContent = voice.name;
                NR.els['tts-voice-selector'].appendChild(option);

                var dialogueVoiceOption = document.createElement('option');
                dialogueVoiceOption.value = voice.id;
                dialogueVoiceOption.textContent = voice.name;
                NR.els['tts-dialogue-voice-selector'].appendChild(dialogueVoiceOption);
            });

            NR.els['tts-voice-selector'].value = activeVoiceId;
            NR.els['tts-dialogue-voice-selector'].value = dialogueVoiceId || '';
        },

        maybeFetchIndexTtsVoices: function() {
            if (!this.isIndexTtsProvider()) return;
            if (this.isFetchingIndexTtsVoices) return;
            if (!this.getCurrentApiUrl()) return;
            if (this.settings.indexTtsVoices.length > 0 || this.indexTtsVoiceCatalogStatus !== 'idle') return;
            this.fetchIndexTtsVoices(true, true).catch(function() {});
        },

        renderAllUI: function() {
            NR.els['tts-api-url'].value = this.getCurrentApiUrl();
            NR.els['tts-speed-factor-slider'].value = this.settings.speedFactor;
            NR.els['tts-speed-factor-value'].textContent = this.settings.speedFactor.toFixed(1);
            NR.els['tts-top-k-slider'].value = this.settings.topK;
            NR.els['tts-top-k-value'].textContent = this.settings.topK;
            NR.els['tts-top-p-slider'].value = this.settings.topP;
            NR.els['tts-top-p-value'].textContent = this.settings.topP.toFixed(2);
            NR.els['tts-temperature-slider'].value = this.settings.temperature;
            NR.els['tts-temperature-value'].textContent = this.settings.temperature.toFixed(2);
            this.updateProviderUI();
            this.renderVoiceManagementList();
            this.renderVoiceSelectors();
            this.maybeFetchIndexTtsVoices();
        },

        setProvider: function(provider) {
            this.settings.provider = this.normalizeProvider(provider);
            if (this.isIndexTtsProvider() && this.settings.indexTtsVoices.length === 0) {
                this.indexTtsVoiceCatalogStatus = 'idle';
            }
            this.saveSettings();
            this.renderAllUI();
        },

        setProviderFromSelector: function(provider, fromAiModal) {
            if (fromAiModal) {
                this.setCurrentApiUrl(NR.els['tts-api-url'].value.trim());
            }
            this.setProvider(provider);
        },

        refreshVoiceCatalog: function(showAlert) {
            if (this.isIndexTtsProvider()) {
                return this.fetchIndexTtsVoices(!!showAlert, false);
            }
            this.renderAllUI();
            if (showAlert) {
                alert('GPT-SoVITS 音色列表使用本地保存配置。');
            }
            return Promise.resolve();
        },

        fetchIndexTtsVoices: function(showAlert, silent) {
            var self = this;
            var apiUrl = this.settings.indexTtsApiUrl;
            if (!apiUrl) {
                this.indexTtsVoiceCatalogStatus = 'error';
                this.renderAllUI();
                if (showAlert && !silent) {
                    alert('请先配置 IndexTTS API 基地址。');
                }
                return Promise.resolve([]);
            }

            this.isFetchingIndexTtsVoices = true;
            this.indexTtsVoiceCatalogStatus = 'loading';
            this.renderAllUI();

            return fetch(apiUrl + '/voices', { cache: 'no-store' }).then(function(response) {
                if (!response.ok) {
                    return response.text().then(function(errText) {
                        throw new Error('IndexTTS voice list error: ' + response.status + ' ' + errText);
                    });
                }
                return response.json();
            }).then(function(data) {
                var voices = Array.isArray(data) ? data : (data && Array.isArray(data.voices) ? data.voices : []);
                var normalizedVoices = voices.map(function(voice, index) {
                    var id = String((voice && (voice.id || voice.name || voice.preset_name)) || ('preset-' + index));
                    var name = String((voice && (voice.name || voice.id || voice.preset_name)) || id);
                    return {
                        id: id,
                        name: name,
                        presetName: String((voice && (voice.presetName || voice.preset_name || voice.name || voice.id)) || name),
                        provider: 'indextts'
                    };
                });
                self.settings.indexTtsVoices = normalizedVoices;
                self.ensureVoiceSelections();
                self.indexTtsVoiceCatalogStatus = normalizedVoices.length > 0 ? 'ready' : 'error';
                self.saveSettings();
                self.renderAllUI();
                if (showAlert && !silent) {
                    alert(normalizedVoices.length > 0 ? 'IndexTTS 预设已刷新。' : '未拉取到任何 IndexTTS 预设。');
                }
                return normalizedVoices;
            }).catch(function(error) {
                console.error('Failed to fetch IndexTTS voices:', error);
                self.indexTtsVoiceCatalogStatus = 'error';
                self.renderAllUI();
                if (showAlert && !silent) {
                    alert('拉取 IndexTTS 预设失败：\n\n' + error.message);
                }
                throw error;
            }).finally(function() {
                self.isFetchingIndexTtsVoices = false;
                self.updateProviderUI();
            });
        },

        setDialogueVoiceId: function(voiceId) {
            this.setStoredDialogueVoiceId(voiceId || '');
            this.saveSettings();
            this.renderAllUI();
        },

        openEditModal: function(voiceId) {
            var isNew = voiceId === null || voiceId === undefined;
            var voice = isNew ? {} : this.getVoiceById(voiceId, 'gptsovits');
            NR.els['tts-voice-edit-modal-title'].textContent = isNew ? '添加新音色' : '编辑音色';
            NR.els['tts-voice-edit-modal'].dataset.id = isNew ? '' : voiceId;
            NR.els['tts-voice-name'].value = voice && voice.name || '';
            NR.els['tts-gpt-path'].value = voice && voice.gptPath || '';
            NR.els['tts-sovits-path'].value = voice && voice.sovitsPath || '';
            NR.els['tts-ref-audio-path'].value = voice && voice.refAudioPath || '';
            NR.els['tts-prompt-text'].value = voice && voice.promptText || '';
            NR.els['tts-prompt-lang'].value = voice && voice.promptLang || 'zh';
            NR.els['tts-voice-edit-modal'].style.display = 'flex';
        },

        saveVoiceFromModal: function() {
            var voiceId = NR.els['tts-voice-edit-modal'].dataset.id;
            var voiceData = {
                id: voiceId || Date.now().toString(),
                name: NR.els['tts-voice-name'].value.trim(),
                gptPath: NR.els['tts-gpt-path'].value.trim(),
                sovitsPath: NR.els['tts-sovits-path'].value.trim(),
                refAudioPath: NR.els['tts-ref-audio-path'].value.trim(),
                promptText: NR.els['tts-prompt-text'].value.trim(),
                promptLang: NR.els['tts-prompt-lang'].value,
            };
            if (!voiceData.name || !voiceData.gptPath || !voiceData.sovitsPath || !voiceData.refAudioPath) {
                alert('请填写所有必填字段 (名称, GPT/SoVITS/参考音频路径)。');
                return;
            }

            var voices = this.settings.gptSovitsVoices.slice();
            var existingIndex = voices.findIndex(function(v) { return v.id === voiceData.id; });
            if (existingIndex > -1) {
                voices[existingIndex] = voiceData;
            } else {
                voices.push(voiceData);
            }
            this.settings.gptSovitsVoices = voices;
            if (this.loadedVoiceId === voiceData.id) {
                this.loadedVoiceId = null;
            }

            NR.els['tts-voice-edit-modal'].style.display = 'none';
            this.saveSettings();
            this.renderAllUI();
            if (this.settings.gptSovitsActiveVoiceId === voiceData.id && this.getCurrentProvider() === 'gptsovits') {
                this.switchAndValidateActiveVoice();
            }
        },

        deleteVoice: function(voiceId) {
            if (!confirm('确定要删除这个音色吗？')) {
                return;
            }
            this.settings.gptSovitsVoices = this.settings.gptSovitsVoices.filter(function(v) { return v.id !== voiceId; });
            if (this.settings.gptSovitsActiveVoiceId === voiceId) {
                this.settings.gptSovitsActiveVoiceId = this.settings.gptSovitsVoices.length > 0 ? this.settings.gptSovitsVoices[0].id : null;
            }
            if (this.settings.gptSovitsDialogueVoiceId === voiceId) {
                this.settings.gptSovitsDialogueVoiceId = '';
            }
            if (this.loadedVoiceId === voiceId) {
                this.loadedVoiceId = null;
            }
            this.saveSettings();
            this.renderAllUI();
            if (this.getCurrentProvider() === 'gptsovits') {
                this.switchAndValidateActiveVoice();
            }
        },

        loadGptSovitsVoiceById: function(voiceId, options) {
            var self = this;
            var loadOptions = options || {};
            var apiUrl = this.settings.gptSovitsApiUrl;
            var voice = this.getVoiceById(voiceId, 'gptsovits');

            if (!voiceId || this.settings.gptSovitsVoices.length === 0) {
                if (loadOptions.updateIndicator) {
                    NR.els['tts-status-indicator'].className = 'tts-status-indicator';
                }
                return Promise.resolve(null);
            }
            if (!apiUrl) {
                if (loadOptions.updateIndicator) {
                    NR.els['tts-status-indicator'].className = 'tts-status-indicator error';
                }
                if (!loadOptions.silent) {
                    alert('请先在"AI 功能设置"中配置 GPT-SoVITS API 基地址。');
                }
                return Promise.reject(new Error('GPT-SoVITS API 基地址未配置。'));
            }
            if (!voice || !voice.gptPath || !voice.sovitsPath) {
                if (loadOptions.updateIndicator) {
                    NR.els['tts-status-indicator'].className = 'tts-status-indicator error';
                }
                if (!loadOptions.silent) {
                    alert('音色 "' + ((voice && voice.name) || '未知') + '" 配置不完整，请检查模型路径。');
                }
                return Promise.reject(new Error('音色 "' + ((voice && voice.name) || '未知') + '" 配置不完整。'));
            }
            if (loadOptions.updateIndicator) {
                NR.els['tts-status-indicator'].className = 'tts-status-indicator loading';
            }
            if (this.loadedVoiceId === voiceId) {
                if (loadOptions.persistSelection) {
                    this.saveSettings();
                }
                if (loadOptions.updateIndicator) {
                    NR.els['tts-status-indicator'].className = 'tts-status-indicator ready';
                }
                return Promise.resolve(voice);
            }

            var gptUrl = apiUrl + '/set_gpt_weights?weights_path=' + encodeURIComponent(voice.gptPath);
            return fetch(gptUrl).then(function(gptRes) {
                if (!gptRes.ok) {
                    return gptRes.json().then(function(err) {
                        throw new Error('GPT模型加载失败: ' + ((err && err.Exception) || JSON.stringify(err)));
                    });
                }
                var sovitsUrl = apiUrl + '/set_sovits_weights?weights_path=' + encodeURIComponent(voice.sovitsPath);
                return fetch(sovitsUrl);
            }).then(function(sovitsRes) {
                if (!sovitsRes.ok) {
                    return sovitsRes.json().then(function(err) {
                        throw new Error('SoVITS模型加载失败: ' + ((err && err.Exception) || JSON.stringify(err)));
                    });
                }
                self.loadedVoiceId = voiceId;
                if (loadOptions.persistSelection) {
                    self.saveSettings();
                }
                if (loadOptions.updateIndicator) {
                    NR.els['tts-status-indicator'].className = 'tts-status-indicator ready';
                }
                console.log('音色 "' + voice.name + '" 加载成功。');
                return voice;
            }).catch(function(error) {
                console.error("切换音色失败:", error);
                if (loadOptions.updateIndicator) {
                    NR.els['tts-status-indicator'].className = 'tts-status-indicator error';
                }
                if (!loadOptions.silent) {
                    alert('切换音色失败: \n\n' + error.message);
                }
                throw error;
            });
        },

        loadIndexTtsVoiceById: function(voiceId, options) {
            var self = this;
            var loadOptions = options || {};
            if (!this.settings.indexTtsApiUrl) {
                this.indexTtsVoiceCatalogStatus = 'error';
                this.updateStatusIndicatorForIndexTts();
                if (!loadOptions.silent) {
                    alert('请先在"AI 功能设置"中配置 IndexTTS API 基地址。');
                }
                return Promise.reject(new Error('IndexTTS API 基地址未配置。'));
            }
            if (loadOptions.updateIndicator) {
                this.indexTtsVoiceCatalogStatus = 'loading';
                this.updateStatusIndicatorForIndexTts();
            }
            var voice = this.getVoiceById(voiceId, 'indextts');
            if (voice) {
                this.indexTtsVoiceCatalogStatus = 'ready';
                this.updateStatusIndicatorForIndexTts();
                if (loadOptions.persistSelection) {
                    this.saveSettings();
                }
                return Promise.resolve(voice);
            }
            return this.fetchIndexTtsVoices(false, true).then(function() {
                var refreshedVoice = self.getVoiceById(voiceId, 'indextts');
                if (!refreshedVoice) {
                    throw new Error('IndexTTS 预设不存在：' + voiceId);
                }
                self.indexTtsVoiceCatalogStatus = 'ready';
                self.updateStatusIndicatorForIndexTts();
                if (loadOptions.persistSelection) {
                    self.saveSettings();
                }
                return refreshedVoice;
            });
        },

        loadVoiceById: function(voiceId, options) {
            if (this.isIndexTtsProvider()) {
                return this.loadIndexTtsVoiceById(voiceId, options);
            }
            return this.loadGptSovitsVoiceById(voiceId, options);
        },

        switchAndValidateActiveVoice: function() {
            var voiceId = NR.els['tts-voice-selector'].value;
            this.setActiveVoiceId(voiceId);
            return this.loadVoiceById(voiceId, {
                updateIndicator: true,
                persistSelection: true
            }).catch(function() {
                return null;
            });
        },

        getTtsPayload: function(text, voice) {
            var activeVoice = voice || this.getVoiceById(this.getActiveVoiceId());
            if (!activeVoice) return null;

            if (this.isIndexTtsProvider()) {
                return {
                    text: text,
                    preset_name: this.getIndexTtsRequestVoiceName(activeVoice)
                };
            }

            return {
                "text": text,
                "text_lang": activeVoice.promptLang,
                "ref_audio_path": activeVoice.refAudioPath,
                "prompt_text": activeVoice.promptText,
                "prompt_lang": activeVoice.promptLang,
                "top_k": this.settings.topK,
                "top_p": this.settings.topP,
                "temperature": this.settings.temperature,
                "speed_factor": this.settings.speedFactor,
                "media_type": "wav",
                "streaming_mode": false
            };
        }
    };

    function startTtsWatchdog() {
        if (ttsWatchdogTimer) return;
        ttsWatchdogTimer = setInterval(function() {
            if (!NR.ttsState.isActive || NR.ttsState.isPlaying || NR.ttsState.isPaused) {
                return;
            }
            var seq = NR.ttsState.currentSequence;
            var startAt = ttsSeqStartTime.get(seq);
            if (!startAt) {
                return;
            }
            var waitMs = Date.now() - startAt;
            var timeoutConfig = getCurrentTtsTimeouts();

            if (!NR.ttsState.audioQueue.has(seq) && waitMs > timeoutConfig.requestStallMs) {
                console.warn('Watchdog: Sequence ' + seq + ' stalled for ' + waitMs + 'ms, skipping.');
                NR.ttsState.audioQueue.set(seq, { failed: true });
                if (NR.ttsState.isActive) {
                    tryPlayNext();
                }
            }
        }, 1000);
    }

    function stopTtsWatchdog() {
        if (ttsWatchdogTimer) {
            clearInterval(ttsWatchdogTimer);
            ttsWatchdogTimer = null;
        }
        ttsSeqStartTime.clear();
    }

    function resetTtsState() {
        if (NR.ttsState.pumpTimer) {
            clearTimeout(NR.ttsState.pumpTimer);
        }
        NR.ttsState.pumpActive = false;

        if (NR.state.ttsAudioElement) {
            NR.state.ttsAudioElement.pause();
            NR.state.ttsAudioElement.removeAttribute('src');
            NR.state.ttsAudioElement.load();
        }

        cleanupAudioResource(NR.ttsState.currentPlayItem);

        NR.ttsState.audioQueue.forEach(function(item) {
            cleanupAudioResource(item);
        });

        var speakingPara = document.querySelector('.speaking-paragraph');
        if (speakingPara) speakingPara.classList.remove('speaking-paragraph');

        Object.assign(NR.ttsState, {
            isPlaying: false,
            isPaused: false,
            isActive: false,
            currentSequence: 0,
            nextSequenceToFetch: 0,
            textChunks: [],
            audioQueue: new Map(),
            currentPlayItem: null,
            inFlightRequests: 0,
            pumpTimer: null,
        });

        stopTtsWatchdog();
    }

    NR.stopTts = function(shouldHideControls) {
        if (shouldHideControls === undefined) shouldHideControls = true;
        resetTtsState();
        if (shouldHideControls) {
            NR.els['tts-player-controls'].style.display = 'none';
        }
        NR.els['tts-status'].textContent = '已停止';
        NR.els['btn-tts-play-pause'].innerHTML = '▶️';
    };

    NR.toggleListenMode = function() {
        NR.state.isListenMode = !NR.state.isListenMode;
        NR.els['btn-listen-mode'].classList.toggle('active', NR.state.isListenMode);
        NR.els['content-wrapper'].style.cursor = NR.state.isListenMode ? 'cell' : (NR.state.settings.enableClickPage ? 'pointer' : 'default');
        if (!NR.state.isListenMode) {
            NR.stopTts();
        } else {
            if (!NR.ttsController.getCurrentApiUrl() || !NR.ttsController.getActiveVoiceId()) {
                alert('听书功能需要配置后才能使用，请在【设置】中配置当前听书引擎的 API 地址并选择音色。');
                NR.toggleListenMode();
                return;
            }
            alert('听书模式已开启。\n请点击任意段落开始朗读。');
        }
    };

    function chunkTextAndParagraphs(startParagraphElement) {
        var chunks = [];
        var allParagraphsInDom = [];
        NR.state.allRenderedPages.forEach(function(page) {
            var paras = Array.from(page.querySelectorAll('p:not(.blank-line):not(.chapter-title)'));
            allParagraphsInDom.push.apply(allParagraphsInDom, paras);
        });

        var globalStartIndex = allParagraphsInDom.findIndex(function(p) { return p.isSameNode(startParagraphElement); });
        if (globalStartIndex === -1) return [];

        var parasToProcess = allParagraphsInDom.slice(globalStartIndex);

        for (var i = 0; i < parasToProcess.length; i++) {
            var para = parasToProcess[i];
            var text = para.textContent.trim();
            var originalParaIndex = para.dataset.originalIndex;
            if (text && originalParaIndex !== undefined) {
                var originalPara = NR.state.originalParagraphs[originalParaIndex];
                if (originalPara) {
                    var paragraphChunks = splitParagraphIntoTtsChunks(originalPara);
                    chunks.push.apply(chunks, paragraphChunks);
                }
            }
        }
        return chunks;
    }

    NR.startTtsFrom = function(startParagraphElement) {
        if (!NR.ttsController.getCurrentApiUrl() || !NR.ttsController.getVoiceById(NR.ttsController.getActiveVoiceId())) {
            alert('请先在 AI 设置中配置当前听书引擎的 TTS API，并选择一个有效的音色。');
            if (NR.state.isListenMode) NR.toggleListenMode();
            return;
        }
        NR.stopTts(false);

        NR.ttsState.isActive = true;
        NR.els['tts-player-controls'].style.display = 'flex';

        NR.ttsState.textChunks = chunkTextAndParagraphs(startParagraphElement);
        if (NR.ttsState.textChunks.length === 0) {
            NR.els['tts-status'].textContent = '错误: 无内容';
            NR.ttsState.isActive = false;
            return;
        }

        NR.els['tts-status'].textContent = '连接中...';
        fetchCurrentSequenceFirst();
    };

    function fetchCurrentSequenceFirst() {
        if (!NR.ttsState.isActive) return;

        var sequence = NR.ttsState.currentSequence;
        var chunk = NR.ttsState.textChunks[sequence];
        if (!chunk || !chunk.text) {
            NR.els['tts-status'].textContent = '错误: 无内容';
            NR.ttsState.isActive = false;
            return;
        }

        NR.ttsState.nextSequenceToFetch = sequence + 1;
        ttsSeqStartTime.set(sequence, Date.now());
        NR.ttsState.inFlightRequests++;
        setTtsStatus('首段缓冲中...', sequence);

        fetchAudioWithRetry(chunk, sequence)
            .then(function(result) {
                if (result && NR.ttsState.isActive) {
                    NR.ttsState.audioQueue.set(sequence, Object.assign({}, result, {
                        paragraph: chunk.paragraph
                    }));
                    tryPlayNext();
                    startTtsPump();
                }
            })
            .catch(function(err) {
                console.error('Initial TTS fetch error for sequence ' + sequence + ':', err);
                if (NR.ttsState.isActive) {
                    NR.ttsState.audioQueue.set(sequence, { failed: true });
                    tryPlayNext();
                    startTtsPump();
                }
            })
            .finally(function() {
                NR.ttsState.inFlightRequests = Math.max(0, NR.ttsState.inFlightRequests - 1);
                schedulePump(0);
            });
    }

    function startTtsPump() {
        if (NR.ttsState.pumpActive || !NR.ttsState.isActive) return;
        NR.ttsState.pumpActive = true;
        startTtsWatchdog();
        schedulePump(0);
    }

    function schedulePump(delayMs) {
        if (!NR.ttsState.pumpActive || !NR.ttsState.isActive) return;
        if (NR.ttsState.pumpTimer) clearTimeout(NR.ttsState.pumpTimer);
        NR.ttsState.pumpTimer = setTimeout(runPumpOnce, delayMs);
    }

    function runPumpOnce() {
        if (!NR.ttsState.pumpActive || !NR.ttsState.isActive) return;

        var shouldFetchMore = function() {
            return NR.ttsState.inFlightRequests < NR.ttsState.maxConcurrency &&
                NR.ttsState.nextSequenceToFetch < NR.ttsState.textChunks.length &&
                (NR.ttsState.audioQueue.size + NR.ttsState.inFlightRequests) < NR.ttsState.bufferSize;
        };

        while (shouldFetchMore()) {
            var sequence = NR.ttsState.nextSequenceToFetch;
            var chunk = NR.ttsState.textChunks[sequence];
            NR.ttsState.nextSequenceToFetch++;

            if (!chunk || !chunk.text) continue;

            ttsSeqStartTime.set(sequence, Date.now());
            NR.ttsState.inFlightRequests++;

            (function(seq, chk) {
                fetchAudioWithRetry(chk, seq)
                    .then(function(result) {
                        if (result && NR.ttsState.isActive) {
                            NR.ttsState.audioQueue.set(seq, Object.assign({}, result, {
                                paragraph: chk.paragraph
                            }));
                            if (seq === NR.ttsState.currentSequence && !NR.ttsState.isPlaying && !NR.ttsState.isPaused) {
                                tryPlayNext();
                            }
                        }
                    })
                    .catch(function(err) {
                        console.error('TTS fetch error for sequence ' + seq + ':', err);
                        if (NR.ttsState.isActive) {
                            NR.ttsState.audioQueue.set(seq, { failed: true });
                            if (seq === NR.ttsState.currentSequence && !NR.ttsState.isPlaying && !NR.ttsState.isPaused) {
                                tryPlayNext();
                            }
                        }
                    })
                    .finally(function() {
                        NR.ttsState.inFlightRequests = Math.max(0, NR.ttsState.inFlightRequests - 1);
                        schedulePump(0);
                    });
            })(sequence, chunk);
        }
        schedulePump(200);
    }

    function fetchAudioWithRetry(chunk, sequence, maxRetries) {
        if (maxRetries === undefined) maxRetries = 2;
        var attempt = 0;
        
        function tryFetch() {
            return fetchAudioBlob(chunk, sequence).then(function(blob) {
                if (blob) {
                    return createPlayableAudioSource(blob, sequence).then(function(source) {
                        source.sequence = sequence;
                        return source;
                    });
                }
                return null;
            }).catch(function(error) {
                console.error('Fetch attempt ' + (attempt + 1) + ' for seq ' + sequence + ' failed:', error);
                attempt++;
                if (attempt > maxRetries) throw error;
                return new Promise(function(res) { setTimeout(res, 1000 * attempt); }).then(tryFetch);
            });
        }
        
        return tryFetch();
    }

    function readAudioBlobWithTimeout(response, controller, stallTimeoutMs) {
        var contentType = response.headers.get('content-type') || 'audio/wav';
        if (!response.body || !response.body.getReader) {
            return new Promise(function(resolve, reject) {
                var fallbackTimer = setTimeout(function() {
                    try {
                        controller.abort();
                    } catch (_) {}
                    reject(new Error('TTS audio download timed out before completion.'));
                }, stallTimeoutMs);

                response.arrayBuffer().then(function(buffer) {
                    clearTimeout(fallbackTimer);
                    resolve(new Blob([buffer], { type: contentType }));
                }).catch(function(error) {
                    clearTimeout(fallbackTimer);
                    reject(error);
                });
            });
        }

        return new Promise(function(resolve, reject) {
            var reader = response.body.getReader();
            var chunks = [];
            var isSettled = false;
            var stallTimer = null;

            function cleanup() {
                if (stallTimer) {
                    clearTimeout(stallTimer);
                    stallTimer = null;
                }
            }

            function fail(error) {
                if (isSettled) return;
                isSettled = true;
                cleanup();
                try {
                    reader.cancel(error);
                } catch (_) {}
                reject(error);
            }

            function resetStallTimer() {
                if (stallTimer) clearTimeout(stallTimer);
                stallTimer = setTimeout(function() {
                    try {
                        controller.abort();
                    } catch (_) {}
                    fail(new Error('TTS audio download stalled before completion.'));
                }, stallTimeoutMs);
            }

            function pump() {
                reader.read().then(function(result) {
                    if (isSettled) return;
                    if (result.done) {
                        isSettled = true;
                        cleanup();
                        resolve(new Blob(chunks, { type: contentType }));
                        return;
                    }

                    if (result.value && result.value.byteLength > 0) {
                        chunks.push(result.value);
                    }
                    resetStallTimer();
                    pump();
                }).catch(function(error) {
                    fail(error);
                });
            }

            resetStallTimer();
            pump();
        });
    }

    function tryPlayNext() {
        if (!NR.ttsState.isActive || NR.ttsState.isPlaying || NR.ttsState.isPaused) return;

        var nextItem = NR.ttsState.audioQueue.get(NR.ttsState.currentSequence);

        if (nextItem) {
            NR.ttsState.audioQueue.delete(NR.ttsState.currentSequence);

            if (nextItem.failed) {
                console.warn('Skipping failed sequence ' + NR.ttsState.currentSequence + '.');
                NR.onAudioEnded();
                return;
            }

            cleanupAudioResource(NR.ttsState.currentPlayItem);

            NR.ttsState.currentPlayItem = nextItem;
            if (!nextItem.playUrl) {
                console.error('TTS item is missing playUrl for sequence ' + NR.ttsState.currentSequence + ':', nextItem);
                NR.onAudioEnded();
                return;
            }
            setTtsStatus('准备播放...', nextItem.sequence);
            NR.state.ttsAudioElement.src = nextItem.playUrl;
            NR.state.ttsAudioElement.load();

            NR.state.ttsAudioElement.play().then(function() {
                NR.ttsState.isPlaying = true;
                NR.els['tts-status'].textContent = '播放中...';
                NR.els['btn-tts-play-pause'].innerHTML = '⏸️';
                highlightAndScrollToPara(nextItem.paragraph);
            }).catch(function(error) {
                console.error('Playback failed to start for seq ' + NR.ttsState.currentSequence + ':', error);
                NR.onAudioEnded();
            });
        } else if (NR.ttsState.nextSequenceToFetch >= NR.ttsState.textChunks.length && NR.ttsState.inFlightRequests === 0) {
            NR.els['tts-status'].textContent = "朗读完毕";
            NR.els['btn-tts-play-pause'].innerHTML = '▶️';
            if (NR.state.isListenMode) NR.toggleListenMode();
            else NR.stopTts();
        } else {
            NR.els['tts-status'].textContent = "缓冲中...";
            NR.els['btn-tts-play-pause'].innerHTML = '⏳';
        }
    }

    function highlightAndScrollToPara(para) {
        requestAnimationFrame(function() {
            var paraInDom = document.querySelector('p[data-original-index="' + para.dataset.originalIndex + '"]');
            if (!paraInDom) return;

            var paraPage = paraInDom.closest('.page');
            if (!paraPage) return;

            var targetPageNum = NR.state.allRenderedPages.findIndex(function(p) { return p === paraPage; }) + 1;

            var doHighlightAndScroll = function() {
                var finalParaEl = document.querySelector('p[data-original-index="' + para.dataset.originalIndex + '"]');
                if (finalParaEl) {
                    var prevHighlight = document.querySelector('.speaking-paragraph');
                    if (prevHighlight) prevHighlight.classList.remove('speaking-paragraph');
                    finalParaEl.classList.add('speaking-paragraph');
                    finalParaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            };

            if (targetPageNum > 0 && targetPageNum !== NR.state.currentPage) {
                NR.jumpToPage(targetPageNum);
                setTimeout(doHighlightAndScroll, 350);
            } else {
                doHighlightAndScroll();
            }
        });
    }

    NR.onAudioEnded = function() {
        if (!NR.ttsState.isActive) return;

        ttsSeqStartTime.delete(NR.ttsState.currentSequence);
        NR.ttsState.isPlaying = false;
        cleanupAudioResource(NR.ttsState.currentPlayItem);
        NR.ttsState.currentPlayItem = null;
        NR.ttsState.currentSequence++;

        setTimeout(function() { tryPlayNext(); }, 0);
    };

    function fetchAudioBlob(chunk, sequence) {
        var voice = NR.ttsController.getVoiceForTextChunk(chunk);
        var payload = NR.ttsController.getTtsPayload(chunk && chunk.text, voice);
        if (!payload) {
            setTtsStatus('无有效音色');
            return Promise.reject(new Error('TTS payload could not be created.'));
        }

        return NR.ttsController.loadVoiceById(voice && voice.id, {
            updateIndicator: voice && voice.id === NR.ttsController.getActiveVoiceId(),
            silent: true
        }).then(function() {
            var apiUrl = NR.ttsController.getCurrentApiUrl();
            var timeoutConfig = getCurrentTtsTimeouts();
            var controller = new AbortController();
            var totalTimer = setTimeout(function() {
                controller.abort();
            }, timeoutConfig.totalRequestMs);
            setTtsStatus(chunk && chunk.isDialogue
                ? (NR.ttsController.isIndexTtsProvider() ? '请求对白TTS...IndexTTS较慢，请等待' : '请求对白TTS...')
                : (NR.ttsController.isIndexTtsProvider() ? '请求TTS...IndexTTS较慢，请等待' : '请求TTS...'), sequence);

            return fetch(apiUrl + '/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                cache: 'no-store',
                signal: controller.signal
            }).then(function(response) {
                if (!response.ok) {
                    return response.text().then(function(errText) {
                        throw new Error('TTS API Error: ' + response.status + ' ' + errText);
                    });
                }
                setTtsStatus('已收到音频，写入缓存...', sequence);
                return readAudioBlobWithTimeout(response, controller, timeoutConfig.downloadStallMs);
            }).finally(function() {
                clearTimeout(totalTimer);
            });
        }).catch(function(error) {
            console.error("Failed to fetch TTS audio:", error);
            setTtsStatus(chunk && chunk.isDialogue ? '对白音色请求失败' : 'API错误');
            throw error;
        });
    }

    NR.toggleTtsPlayback = function() {
        if (!NR.ttsState.isActive) return;

        if (NR.ttsState.isPlaying && !NR.ttsState.isPaused) {
            NR.state.ttsAudioElement.pause();
            NR.ttsState.isPaused = true;
            NR.ttsState.isPlaying = false;
            NR.els['btn-tts-play-pause'].innerHTML = '▶️';
            NR.els['tts-status'].textContent = '已暂停';
            NR.ttsState.pumpActive = false;
            if (NR.ttsState.pumpTimer) clearTimeout(NR.ttsState.pumpTimer);

        } else if (NR.ttsState.isPaused) {
            NR.ttsState.isPaused = false;
            startTtsPump();

            if (NR.ttsState.currentPlayItem) {
                NR.state.ttsAudioElement.play().then(function() {
                    NR.ttsState.isPlaying = true;
                    NR.els['btn-tts-play-pause'].innerHTML = '⏸️';
                    NR.els['tts-status'].textContent = '播放中...';
                }).catch(function(e) {
                    console.error("Resume playback failed:", e);
                    NR.onAudioEnded();
                });
            } else {
                tryPlayNext();
            }
        }
    };
})();
