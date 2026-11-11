// TTS 语音合成
(function() {
    var NR = window.NovelReader;

    var TTS_TIMEOUTS = {
        gptsovits: {
            downloadStallMs: 15000,
            totalRequestMs: 120000,
            requestStallMs: 360000
        },
        indextts: {
            downloadStallMs: 60000,
            totalRequestMs: 900000,
            requestStallMs: 900000
        },
        fishspeech: {
            downloadStallMs: 120000,
            totalRequestMs: 900000,
            requestStallMs: 1800000
        }
    };
    var ttsWatchdogTimer = null;
    var ttsSeqStartTime = new Map();
    var ttsSession = 0;
    var ttsRequestControllers = new Set();
    var playbackStartTimer = null;
    var playbackAttempt = 0;
    var playbackFailure = null;
    var ttsPlaybackSyncTimer = null;
    var ttsHighlightTimer = null;
    var ttsHighlightVersion = 0;
    var ttsHighlightedParagraph = null;
    var ttsNaturalPauseTimer = null;
    var ttsNaturalPauseDeadline = 0;
    var ttsNaturalPauseRemaining = 0;
    var ttsLastAudioEndedAt = 0;
    var TTS_PAUSES = { paragraph: 700, dialogue: 440, chapter: 3000, afterTitle: 1400 };

    function normalizeApiUrl(value) {
        var url = String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:tts|voices|docs)$/i, '');
        if (url && !/^https?:\/\//i.test(url)) url = 'http://' + url;
        return url;
    }

    // Request binary data explicitly: Capacitor's patched fetch does not expose
    // a real streaming body or consistently honor AbortSignal on Android.
    function requestTts(path, options, timeoutMs, binary, apiUrl) {
        options = Object.assign({}, options || {});
        options.headers = Object.assign({ Accept: binary ? 'audio/wav' : 'application/json' }, options.headers || {});
        apiUrl = normalizeApiUrl(apiUrl || NR.ttsController.getCurrentApiUrl());
        var controller = new AbortController();
        var timer;
        ttsRequestControllers.add(controller);
        var http = NR.isCapacitor && NR.isCapacitor() && window.Capacitor &&
            window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
        var request = Promise.resolve().then(function() {
            if (controller.signal.aborted) throw new Error('TTS 请求已取消。');
            if (http) {
                return http.request({
                    url: apiUrl + path,
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    data: options.body ? JSON.parse(options.body) : undefined,
                    responseType: binary ? 'arraybuffer' : 'text',
                    connectTimeout: Math.min(timeoutMs, 30000),
                    readTimeout: timeoutMs
                }).then(function(result) {
                    var headers = new Headers(result.headers || {});
                    var contentType = headers.get('content-type') || '';
                    var data = result.data;
                    if (binary && result.status >= 200 && result.status < 300 &&
                        !/json|text\/|html/i.test(contentType)) {
                        var raw = atob(data);
                        data = new Uint8Array(raw.length);
                        for (var i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
                    } else if (typeof data !== 'string') {
                        data = JSON.stringify(data);
                    }
                    return new Response(data, { status: result.status, headers: headers });
                });
            }
            return fetch(apiUrl + path,
                Object.assign({}, options, { cache: 'no-store', signal: controller.signal }));
        }).then(function(response) {
            if (!response.ok) {
                return response.text().then(function(message) {
                    throw new Error('TTS API HTTP ' + response.status + ': ' + message.slice(0, 300));
                });
            }
            return binary ? readAudioBlobWithTimeout(response, controller,
                getCurrentTtsTimeouts().downloadStallMs) : response.json();
        });
        var cancelled = new Promise(function(resolve, reject) {
            controller.signal.addEventListener('abort', function() {
                reject(new Error('TTS 请求已取消或超时，请检查 API 地址和网络。'));
            }, { once: true });
            timer = setTimeout(function() { controller.abort(); }, timeoutMs);
        });
        return Promise.race([request, cancelled]).finally(function() {
            clearTimeout(timer);
            ttsRequestControllers.delete(controller);
        });
    }

    function getCurrentTtsTimeouts() {
        return TTS_TIMEOUTS[NR.ttsController.getCurrentProvider()] || TTS_TIMEOUTS.gptsovits;
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
        if (paragraph && paragraph.classList && paragraph.classList.contains('chapter-title')) {
            var title = text.trim().replace(/^(第\s*[零〇一二三四五六七八九十百千万两\d\s]+[章回节卷])(.*)$/, function(_, chapter, name) {
                name = name.replace(/^[\s、，,:：.．-]+/, '').trim();
                return chapter + (name ? '，' + name : '');
            });
            appendTtsChunk(chunks, title, paragraph, false);
            if (chunks.length) chunks[0].isChapterTitle = true;
            return chunks;
        }
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

    function addTtsPauses(chunks) {
        chunks.forEach(function(chunk, index) {
            var previous = chunks[index - 1];
            chunk.pauseBeforeMs = 0;
            if (!previous) return;
            var newParagraph = previous.paragraph !== chunk.paragraph;
            if (newParagraph && chunk.isChapterTitle) chunk.pauseBeforeMs = TTS_PAUSES.chapter;
            else if (newParagraph && previous.isChapterTitle) chunk.pauseBeforeMs = TTS_PAUSES.afterTitle;
            else if (newParagraph) chunk.pauseBeforeMs = TTS_PAUSES.paragraph;
            else if (previous.isDialogue !== chunk.isDialogue) chunk.pauseBeforeMs = TTS_PAUSES.dialogue;
        });
        return chunks;
    }

    function createPlayableAudioSource(blob, sequence, preferNativeCache) {
        var mimeType = blob.type || 'audio/wav';
        var useNativeCache = preferNativeCache && NR.isCapacitor &&
            NR.isCapacitor() &&
            window.Capacitor &&
            window.Capacitor.convertFileSrc &&
            getFilesystemPlugin();

        if (!useNativeCache) {
            return Promise.resolve({
                playUrl: URL.createObjectURL(blob),
                blobUrl: null,
                cachePath: null,
                cacheDirectory: null,
                audioBlob: blob
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
                    cacheDirectory: 'CACHE',
                    audioBlob: blob
                };
            });
        });
    }

    NR.ttsState = {
        isPlaying: false,
        isStarting: false,
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
        initialBufferPending: false,
    };

    NR.ttsController = {
        settings: {
            provider: 'gptsovits',
            gptSovitsApiUrl: '',
            indexTtsApiUrl: '',
            fishSpeechApiUrl: '',
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
            fishSpeechVoices: [{ id: '__default__', name: '默认音色', referenceId: null }],
            fishSpeechActiveVoiceId: '__default__',
            fishSpeechDialogueVoiceId: '',
        },
        loadedVoiceId: null,
        indexTtsVoiceCatalogStatus: 'idle',
        isFetchingIndexTtsVoices: false,
        fishSpeechVoiceCatalogStatus: 'idle',
        isFetchingFishSpeechVoices: false,

        normalizeProvider: function(provider) {
            return provider === 'indextts' || provider === 'fishspeech' ? provider : 'gptsovits';
        },

        providerSettingKey: function(suffix, provider) {
            var prefixes = { gptsovits: 'gptSovits', indextts: 'indexTts', fishspeech: 'fishSpeech' };
            return prefixes[this.normalizeProvider(provider || this.getCurrentProvider())] + suffix;
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
            if (!Array.isArray(this.settings.fishSpeechVoices)) this.settings.fishSpeechVoices = [{ id: '__default__', name: '默认音色', referenceId: null }];
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

        isFishSpeechProvider: function() {
            return this.getCurrentProvider() === 'fishspeech';
        },

        isRemoteVoiceProvider: function() {
            return this.getCurrentProvider() !== 'gptsovits';
        },

        getFishSpeechPath: function(path) {
            return /\/v1$/i.test(normalizeApiUrl(this.settings.fishSpeechApiUrl)) ? path : '/v1' + path;
        },

        getCurrentApiUrl: function() {
            return normalizeApiUrl(this.settings[this.providerSettingKey('ApiUrl')]);
        },

        setCurrentApiUrl: function(apiUrl) {
            apiUrl = normalizeApiUrl(apiUrl);
            if (this.getCurrentApiUrl() !== apiUrl) {
                this.loadedVoiceId = null;
                if (this.isFishSpeechProvider()) this.fishSpeechVoiceCatalogStatus = 'idle';
                if (NR.ttsState.isActive) NR.stopTts(false);
            }
            this.settings[this.providerSettingKey('ApiUrl')] = apiUrl || '';
        },

        getVoicesForProvider: function(provider) {
            return this.settings[this.providerSettingKey('Voices', provider)];
        },

        setVoicesForProvider: function(provider, voices) {
            this.settings[this.providerSettingKey('Voices', provider)] = voices || [];
        },

        getAvailableVoices: function() {
            return this.getVoicesForProvider(this.getCurrentProvider());
        },

        getActiveVoiceId: function() {
            return this.settings[this.providerSettingKey('ActiveVoiceId')];
        },

        setActiveVoiceId: function(voiceId) {
            this.settings[this.providerSettingKey('ActiveVoiceId')] = voiceId || '';
        },

        getDialogueVoiceId: function() {
            return this.settings[this.providerSettingKey('DialogueVoiceId')];
        },

        setStoredDialogueVoiceId: function(voiceId) {
            this.settings[this.providerSettingKey('DialogueVoiceId')] = voiceId || '';
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
            var isFishSpeech = this.isFishSpeechProvider();
            var isRemote = this.isRemoteVoiceProvider();
            NR.els['tts-provider-selector'].value = this.getCurrentProvider();
            NR.els['tts-provider-selector-ai'].value = this.getCurrentProvider();
            NR.els['tts-api-url-label'].textContent = (isFishSpeech ? 'Fish Speech' : isIndexTts ? 'IndexTTS' : 'GPT-SoVITS') + ' API 基地址';
            NR.els['tts-api-url'].placeholder = '例如: http://127.0.0.1:' + (isFishSpeech ? '9882' : isIndexTts ? '9881' : '9880');
            NR.els['tts-gptsovits-voice-management'].style.display = isRemote ? 'none' : '';
            NR.els['tts-indextts-provider-hint'].style.display = isRemote ? 'block' : 'none';
            NR.els['tts-indextts-provider-hint'].textContent = isFishSpeech
                ? '将参考录音和同名 .lab 文本放入服务端 references/音色ID 文件夹，再刷新音色。'
                : 'IndexTTS 音色从服务端预设列表获取。';
            NR.els['tts-gptsovits-params'].style.display = isRemote ? 'none' : '';
            NR.els['tts-refresh-voices-row'].style.display = isRemote ? '' : 'none';
            if (isIndexTts) {
                this.updateStatusIndicatorForIndexTts();
            } else if (isFishSpeech) {
                NR.els['tts-status-indicator'].className = 'tts-status-indicator ' +
                    (this.fishSpeechVoiceCatalogStatus === 'loading' ? 'loading' : this.fishSpeechVoiceCatalogStatus === 'error' ? 'error' : 'ready');
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
            if (this.isFishSpeechProvider()) {
                if (this.getCurrentApiUrl() && this.fishSpeechVoiceCatalogStatus === 'idle' && !this.isFetchingFishSpeechVoices) {
                    this.fetchFishSpeechVoices(false, true).catch(function() {});
                }
                return;
            }
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
            if (NR.ttsState.isActive) NR.stopTts(false);
            this.loadedVoiceId = null;
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
            if (this.isFishSpeechProvider()) return this.fetchFishSpeechVoices(!!showAlert, false);
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

            return requestTts('/voices', {}, 30000, false, apiUrl).then(function(data) {
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

        fetchFishSpeechVoices: function(showAlert, silent) {
            var self = this;
            if (!this.settings.fishSpeechApiUrl) return Promise.resolve([]);
            this.isFetchingFishSpeechVoices = true;
            this.fishSpeechVoiceCatalogStatus = 'loading';
            this.renderAllUI();
            return requestTts(this.getFishSpeechPath('/references/list'), {}, 30000, false,
                this.settings.fishSpeechApiUrl).then(function(data) {
                if (data.success === false || !Array.isArray(data.reference_ids)) {
                    throw new Error(data.message || 'Fish Speech 音色列表格式错误。');
                }
                self.settings.fishSpeechVoices = [{ id: '__default__', name: '默认音色', referenceId: null }].concat(
                    data.reference_ids.map(function(id) { return { id: id, name: id, referenceId: id }; }));
                self.fishSpeechVoiceCatalogStatus = 'ready';
                if (self.isFishSpeechProvider()) self.ensureVoiceSelections();
                self.saveSettings();
                if (showAlert && !silent) alert('Fish Speech 音色已刷新。');
                return self.settings.fishSpeechVoices;
            }).catch(function(error) {
                self.fishSpeechVoiceCatalogStatus = 'error';
                if (showAlert && !silent) alert('拉取 Fish Speech 音色失败：\n\n' + error.message);
                throw error;
            }).finally(function() {
                self.isFetchingFishSpeechVoices = false;
                self.renderAllUI();
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

            return requestTts('/set_gpt_weights?weights_path=' + encodeURIComponent(voice.gptPath), {}, 120000, false, apiUrl).then(function() {
                return requestTts('/set_sovits_weights?weights_path=' + encodeURIComponent(voice.sovitsPath), {}, 120000, false, apiUrl);
            }).then(function() {
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
            if (this.isFishSpeechProvider()) {
                var voice = this.getVoiceById(voiceId);
                if (!voice || !this.getCurrentApiUrl()) return Promise.reject(new Error('请配置 Fish Speech API 并选择音色。'));
                if (options && options.persistSelection) this.saveSettings();
                return Promise.resolve(voice);
            }
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

            if (this.isFishSpeechProvider()) {
                return {
                    text: text,
                    reference_id: activeVoice.referenceId === null ? null : (activeVoice.referenceId || activeVoice.id),
                    format: 'wav',
                    streaming: false,
                    use_memory_cache: 'on',
                    chunk_length: 200,
                    seed: 42
                };
            }

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
            if (!NR.ttsState.isActive || NR.ttsState.isPlaying || NR.ttsState.isStarting || NR.ttsState.isPaused) {
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
                failTts(new Error('语音请求超时，请检查服务端是否正常运行。'));
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
        clearTimeout(ttsNaturalPauseTimer);
        ttsNaturalPauseTimer = null;
        ttsNaturalPauseDeadline = 0;
        ttsNaturalPauseRemaining = 0;
        ttsLastAudioEndedAt = 0;
        clearInterval(ttsPlaybackSyncTimer);
        ttsPlaybackSyncTimer = null;
        clearTimeout(ttsHighlightTimer);
        ttsHighlightVersion++;
        if (ttsHighlightedParagraph) ttsHighlightedParagraph.classList.remove('speaking-paragraph');
        ttsHighlightedParagraph = null;
        if (NR.ttsBufferedPlayer) {
            NR.ttsBufferedPlayer.close();
            NR.ttsBufferedPlayer = null;
        }
        ttsSession++;
        playbackAttempt++;
        playbackFailure = null;
        clearTimeout(playbackStartTimer);
        playbackStartTimer = null;
        ttsRequestControllers.forEach(function(controller) { controller.abort(); });
        ttsRequestControllers.clear();
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
            isStarting: false,
            isPaused: false,
            isActive: false,
            currentSequence: 0,
            nextSequenceToFetch: 0,
            textChunks: [],
            audioQueue: new Map(),
            currentPlayItem: null,
            inFlightRequests: 0,
            pumpTimer: null,
            initialBufferPending: false,
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

    function failTts(error) {
        NR.stopTts(false);
        NR.els['tts-status'].textContent = '听书失败：' + error.message;
    }

    NR.toggleListenMode = function() {
        NR.state.isListenMode = !NR.state.isListenMode;
        NR.els['btn-listen-mode'].classList.toggle('active', NR.state.isListenMode);
        NR.els['content-wrapper'].style.cursor = NR.state.isListenMode ? 'cell' : (NR.state.settings.enableClickPage ? 'default' : (NR.state.settings.enableSwipePage ? 'pointer' : 'default'));
        if (!NR.state.isListenMode) {
            NR.stopTts();
        } else {
            if (!NR.ttsController.getCurrentApiUrl() || !NR.ttsController.getActiveVoiceId()) {
                alert('听书功能需要配置后才能使用，请在【设置】中配置当前听书引擎的 API 地址并选择音色。');
                NR.toggleListenMode();
                return;
            }
            alert('听书模式已开启。\n点击章节标题或任意段落开始朗读。');
        }
    };

    function chunkTextAndParagraphs(startParagraphElement, paragraphOnly) {
        var chunks = [];
        var allParagraphsInDom = [];
        if (paragraphOnly) {
            allParagraphsInDom.push(startParagraphElement);
        } else {
            NR.state.allRenderedPages.forEach(function(page) {
                var paras = Array.from(page.querySelectorAll('p:not(.blank-line)'));
                allParagraphsInDom.push.apply(allParagraphsInDom, paras);
            });
        }

        var globalStartIndex = allParagraphsInDom.findIndex(function(p) {
            return String(p.dataset.originalIndex) === String(startParagraphElement.dataset.originalIndex);
        });
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
        if (!NR.ttsController.isFishSpeechProvider()) return addTtsPauses(chunks);
        // Keep paragraph boundaries in the audio. The API returns no alignment
        // marks, so joining paragraphs would lose their real playback positions.
        var batches = [];
        chunks.forEach(function(chunk) {
            var remaining = chunk.text;
            while (remaining) {
                var previous = batches[batches.length - 1];
                var voiceId = NR.ttsController.getVoiceForTextChunk(chunk).id;
                var limit = batches.length <= 1 ? 60 : 160;
                if (previous && previous.paragraph === chunk.paragraph && previous.isDialogue === chunk.isDialogue && previous.voiceId === voiceId && previous.text.length + remaining.length + 1 <= limit) {
                    previous.text += '\n' + remaining;
                    break;
                }
                limit = batches.length === 0 ? 60 : 160;
                var end = Math.min(limit, remaining.length);
                if (remaining.length > limit) {
                    var candidate = remaining.slice(0, limit);
                    var punctuation = /[。！？!?；;，,]/g;
                    var match;
                    while ((match = punctuation.exec(candidate))) {
                        if (match.index >= limit / 2) end = match.index + 1;
                    }
                    // Keep surrogate pairs together when a hard split is needed.
                    if (/[\uD800-\uDBFF]/.test(remaining.charAt(end - 1))) end--;
                }
                batches.push({ text: remaining.slice(0, end), paragraph: chunk.paragraph,
                    isDialogue: chunk.isDialogue, isChapterTitle: !!chunk.isChapterTitle, voiceId: voiceId });
                remaining = remaining.slice(end).trim();
            }
        });
        return addTtsPauses(batches);
    }

    NR.startTtsFromCurrentChapter = function() {
        var page = NR.state.allRenderedPages[NR.state.currentPage - 1];
        var firstParagraph = page && page.querySelector('p[data-original-index]');
        if (!firstParagraph) return;
        var paragraphIndex = Number(firstParagraph.dataset.originalIndex);
        var chapters = NR.state.chapters || [];
        for (var i = chapters.length - 1; i >= 0; i--) {
            if (Number(chapters[i].p_index) <= paragraphIndex) {
                var title = NR.state.originalParagraphs[chapters[i].p_index];
                if (title) NR.startTtsFrom(title);
                return;
            }
        }
    };

    NR.startTtsFrom = function(startParagraphElement, options) {
        if (!NR.ttsController.getCurrentApiUrl() || !NR.ttsController.getVoiceById(NR.ttsController.getActiveVoiceId())) {
            alert('请先在 AI 设置中配置当前听书引擎的 TTS API，并选择一个有效的音色。');
            if (NR.state.isListenMode) NR.toggleListenMode();
            return;
        }
        NR.stopTts(false);

        NR.ttsState.isActive = true;
        NR.ttsState.bufferSize = NR.ttsController.isFishSpeechProvider() ? 6 : 2;
        NR.ttsState.initialBufferPending = NR.ttsController.isFishSpeechProvider();
        if (NR.ttsController.isFishSpeechProvider() && NR.BufferedTtsPlayer && (window.AudioContext || window.webkitAudioContext)) {
            NR.ttsBufferedPlayer = new NR.BufferedTtsPlayer(function(sequence) {
                if (!NR.ttsState.isActive || NR.ttsState.isPaused) return;
                syncBufferedPlayback();
                if (sequence >= NR.ttsState.currentSequence) {
                    advanceBufferedPlayback(sequence + 1);
                    tryPlayNext();
                }
            });
            ttsPlaybackSyncTimer = setInterval(syncBufferedPlayback, 50);
        }
        NR.els['tts-player-controls'].style.display = 'flex';

        NR.ttsState.textChunks = chunkTextAndParagraphs(startParagraphElement, options && options.paragraphOnly);
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
        var session = ttsSession;

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

        startTtsWatchdog();
        fetchAudioWithRetry(chunk, sequence, session)
            .then(function(result) {
                if (session !== ttsSession) { cleanupAudioResource(result); return; }
                if (result && NR.ttsState.isActive) {
                    NR.ttsState.audioQueue.set(sequence, Object.assign({}, result, {
                        paragraph: chunk.paragraph
                    }));
                    startTtsPump();
                    tryPlayNext();
                }
            })
            .catch(function(err) {
                if (session !== ttsSession) return;
                console.error('Initial TTS fetch error for sequence ' + sequence + ':', err);
                if (NR.ttsState.isActive) failTts(err);
            })
            .finally(function() {
                if (session !== ttsSession) return;
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

            (function(seq, chk, session) {
                fetchAudioWithRetry(chk, seq, session)
                    .then(function(result) {
                        if (session !== ttsSession || seq < NR.ttsState.currentSequence) {
                            cleanupAudioResource(result);
                            return;
                        }
                        if (result && NR.ttsState.isActive) {
                            NR.ttsState.audioQueue.set(seq, Object.assign({}, result, {
                                paragraph: chk.paragraph
                            }));
                            if ((seq === NR.ttsState.currentSequence || NR.ttsState.initialBufferPending) && !NR.ttsState.isPlaying && !NR.ttsState.isPaused) {
                                tryPlayNext();
                            }
                        }
                    })
                    .catch(function(err) {
                        if (session !== ttsSession) return;
                        console.error('TTS fetch error for sequence ' + seq + ':', err);
                        if (NR.ttsState.isActive) {
                            NR.ttsState.audioQueue.set(seq, { failed: true, error: err });
                            if ((seq === NR.ttsState.currentSequence || NR.ttsState.initialBufferPending) && !NR.ttsState.isPlaying && !NR.ttsState.isPaused) {
                                if (NR.ttsState.initialBufferPending) { failTts(err); return; }
                                tryPlayNext();
                            }
                        }
                    })
                    .finally(function() {
                        if (session !== ttsSession) return;
                        NR.ttsState.inFlightRequests = Math.max(0, NR.ttsState.inFlightRequests - 1);
                        schedulePump(0);
                    });
            })(sequence, chunk, ttsSession);
        }
        schedulePump(200);
    }

    function fetchAudioWithRetry(chunk, sequence, session, maxRetries) {
        if (maxRetries === undefined) maxRetries = 1;
        var attempt = 0;
        
        function tryFetch() {
            if (session !== ttsSession) return Promise.resolve(null);
            return fetchAudioBlob(chunk, sequence, session).then(function(blob) {
                if (session !== ttsSession) return null;
                if (blob) {
                    return createPlayableAudioSource(blob, sequence).then(function(source) {
                        source.sequence = sequence;
                        var player = NR.ttsBufferedPlayer;
                        if (player) {
                            return player.decode(blob).then(function(buffer) {
                                if (session === ttsSession && buffer) {
                                    source.audioBuffer = buffer;
                                    player.queue(sequence, buffer, chunk.pauseBeforeMs);
                                }
                                return source;
                            }).catch(function(error) {
                                cleanupAudioResource(source);
                                throw error;
                            });
                        }
                        return source;
                    });
                }
                return null;
            }).catch(function(error) {
                console.error('Fetch attempt ' + (attempt + 1) + ' for seq ' + sequence + ' failed:', error);
                attempt++;
                if (session !== ttsSession) return null;
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
                    reader.cancel(error).catch(function() {});
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
        if (!NR.ttsState.isActive || NR.ttsState.isPlaying || NR.ttsState.isStarting || NR.ttsState.isPaused) return;
        if (NR.ttsState.currentPlayItem) return;
        if (NR.ttsState.initialBufferPending) {
            var needed = Math.min(2, NR.ttsState.textChunks.length);
            for (var i = 0; i < needed; i++) {
                if (!NR.ttsState.audioQueue.has(i)) {
                    setTtsStatus('预缓冲 ' + NR.ttsState.audioQueue.size + '/' + needed + '...');
                    return;
                }
            }
            NR.ttsState.initialBufferPending = false;
        }

        var nextItem = NR.ttsState.audioQueue.get(NR.ttsState.currentSequence);

        if (nextItem) {
            NR.ttsState.audioQueue.delete(NR.ttsState.currentSequence);

            if (nextItem.failed) {
                failTts(nextItem.error || new Error('语音合成失败，请检查 API。'));
                return;
            }

            cleanupAudioResource(NR.ttsState.currentPlayItem);

            NR.ttsState.currentPlayItem = nextItem;
            if (!nextItem.playUrl) {
                failTts(new Error('没有可播放的音频。'));
                return;
            }
            var chunk = NR.ttsState.textChunks[nextItem.sequence];
            var remaining = ttsLastAudioEndedAt ? Math.max(0,
                ((chunk && chunk.pauseBeforeMs) || 0) - (Date.now() - ttsLastAudioEndedAt)) : 0;
            if (!nextItem.audioBuffer && remaining > 0) queueNaturalPause(nextItem, remaining);
            else playCurrentItem(true);
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

    function queueNaturalPause(item, remaining) {
        var session = ttsSession;
        item.waitingForPause = true;
        ttsNaturalPauseRemaining = remaining;
        ttsNaturalPauseDeadline = Date.now() + remaining;
        NR.ttsState.isPlaying = true;
        NR.els['tts-status'].textContent = '停顿...';
        NR.els['btn-tts-play-pause'].innerHTML = '⏸️';
        ttsNaturalPauseTimer = setTimeout(function() {
            ttsNaturalPauseTimer = null;
            ttsNaturalPauseRemaining = 0;
            ttsNaturalPauseDeadline = 0;
            if (session !== ttsSession || NR.ttsState.isPaused || NR.ttsState.currentPlayItem !== item) return;
            item.waitingForPause = false;
            playCurrentItem(true);
        }, remaining);
    }

    function markCurrentAudioStarted(item) {
        if (!NR.ttsState.isActive || NR.ttsState.isPaused || NR.ttsState.currentPlayItem !== item) return;
        item.playbackStarted = true;
        NR.els['tts-status'].textContent = '播放中...';
        highlightAndScrollToPara(item.paragraph);
    }

    function playCurrentItem(loadSource) {
        var item = NR.ttsState.currentPlayItem;
        if (!item) return;
        item.playbackStarted = false;
        var session = ttsSession;
        var attempt = ++playbackAttempt;
        var audio = NR.state.ttsAudioElement;
        NR.ttsState.isStarting = true;
        setTtsStatus('准备播放...', item.sequence);

        function isCurrent() {
            return session === ttsSession && attempt === playbackAttempt &&
                NR.ttsState.currentPlayItem === item;
        }
        function failed(error) {
            if (!isCurrent()) return;
            clearTimeout(playbackStartTimer);
            playbackFailure = null;
            playbackAttempt++;
            NR.ttsState.isStarting = false;
            if (error.name === 'NotAllowedError') {
                NR.ttsState.isPaused = true;
                NR.ttsState.isPlaying = false;
                NR.els['tts-status'].textContent = '点击播放按钮开始朗读';
                NR.els['btn-tts-play-pause'].innerHTML = '▶️';
                return;
            }
            if (!item.audioBuffer && !item.cacheAttempted && getFilesystemPlugin()) {
                item.cacheAttempted = true;
                var cacheAttempt = playbackAttempt;
                playbackStartTimer = setTimeout(function() {
                    if (session === ttsSession && cacheAttempt === playbackAttempt) {
                        failTts(new Error('音频缓存超时，请重试。'));
                    }
                }, 15000);
                createPlayableAudioSource(item.audioBlob, item.sequence, true).then(function(source) {
                    if (session !== ttsSession || cacheAttempt !== playbackAttempt) {
                        cleanupAudioResource(source);
                        return;
                    }
                    clearTimeout(playbackStartTimer);
                    cleanupAudioResource(item);
                    Object.assign(item, source);
                    playCurrentItem(true);
                }).catch(function(cacheError) {
                    if (session === ttsSession && cacheAttempt === playbackAttempt) failTts(cacheError);
                });
                return;
            }
            failTts(new Error('音频无法播放：' + error.message));
        }
        playbackFailure = failed;
        playbackStartTimer = setTimeout(function() {
            failed(new Error('播放启动超时，请检查音频格式或重试。'));
        }, 15000);
        if (loadSource && !item.audioBuffer) {
            audio.src = item.playUrl;
            audio.load();
        }
        Promise.resolve().then(function() {
            if (isCurrent()) return item.audioBuffer && NR.ttsBufferedPlayer
                ? NR.ttsBufferedPlayer.start(item.sequence) : audio.play();
        }).then(function() {
            if (!isCurrent()) return;
            clearTimeout(playbackStartTimer);
            NR.ttsState.isStarting = false;
            NR.ttsState.isPlaying = true;
            NR.els['tts-status'].textContent = '播放中...';
            NR.els['btn-tts-play-pause'].innerHTML = '⏸️';
            var position = item.audioBuffer && NR.ttsBufferedPlayer ? NR.ttsBufferedPlayer.getPosition() : null;
            if (!item.audioBuffer || (position && !position.ended && position.sequence === item.sequence)) markCurrentAudioStarted(item);
            else NR.els['tts-status'].textContent = '停顿...';
        }).catch(failed);
    }

    NR.onTtsPlaybackError = function(error) {
        if (NR.ttsState.isActive && playbackFailure) playbackFailure(error);
    };

    function advanceBufferedPlayback(sequence) {
        playbackAttempt++;
        clearTimeout(playbackStartTimer);
        playbackFailure = null;
        cleanupAudioResource(NR.ttsState.currentPlayItem);
        NR.ttsState.currentPlayItem = null;
        NR.ttsState.audioQueue.forEach(function(item, key) {
            if (key < sequence) {
                cleanupAudioResource(item);
                NR.ttsState.audioQueue.delete(key);
            }
        });
        ttsSeqStartTime.forEach(function(value, key) { if (key < sequence) ttsSeqStartTime.delete(key); });
        NR.ttsState.currentSequence = sequence;
        NR.ttsState.isPlaying = false;
        NR.ttsState.isStarting = false;
    }

    function syncBufferedPlayback() {
        if (!NR.ttsState.isActive || NR.ttsState.isPaused || !NR.ttsBufferedPlayer) return;
        var position = NR.ttsBufferedPlayer.getPosition();
        if (position && position.sequence > NR.ttsState.currentSequence) {
            advanceBufferedPlayback(position.sequence);
            tryPlayNext();
        }
        var item = NR.ttsState.currentPlayItem;
        if (position && !position.ended && item && !item.playbackStarted && position.sequence === item.sequence) markCurrentAudioStarted(item);
    }

    NR.syncTtsPlayback = syncBufferedPlayback;

    function highlightAndScrollToPara(para) {
        if (!para || para.dataset.originalIndex === undefined) return;
        var session = ttsSession;
        var sequence = NR.ttsState.currentSequence;
        var version = ++ttsHighlightVersion;
        var selector = 'p[data-original-index="' + para.dataset.originalIndex + '"]';
        clearTimeout(ttsHighlightTimer);
        function follow() {
            if (session !== ttsSession || version !== ttsHighlightVersion || !NR.ttsState.isActive ||
                sequence !== NR.ttsState.currentSequence) return;
            // Pages outside the current/adjacent pages (or current chapter in
            // scroll mode) are detached, but are still in allRenderedPages.
            var paragraphElement = null;
            var target = NR.state.allRenderedPages.findIndex(function(page) {
                var found = page.querySelector(selector);
                if (found) paragraphElement = found;
                return !!found;
            });
            if (target < 0) return;
            // Color the cached page before the turn starts so it is already
            // correct when mounted, rather than showing the old paragraph for
            // the duration of the animation plus a delayed callback.
            if (ttsHighlightedParagraph !== paragraphElement) {
                if (ttsHighlightedParagraph) ttsHighlightedParagraph.classList.remove('speaking-paragraph');
                var previous = document.querySelector('.speaking-paragraph');
                if (previous && previous !== paragraphElement) previous.classList.remove('speaking-paragraph');
                paragraphElement.classList.add('speaking-paragraph');
                ttsHighlightedParagraph = paragraphElement;
            }
            if (!NR.state.isTransitioning && target + 1 !== NR.state.currentPage) NR.jumpToPage(target + 1);
            if (NR.state.isTransitioning) {
                ttsHighlightTimer = setTimeout(follow, 30);
                return;
            }
            var currentContainer = NR.els['current-page-container'];
            var element = currentContainer && currentContainer.querySelector ? currentContainer.querySelector(selector) : null;
            element = element || document.querySelector(selector);
            if (!element) return;
            element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        }
        follow();
    }

    NR.onAudioEnded = function() {
        if (!NR.ttsState.isActive) return;
        if (!NR.ttsState.currentPlayItem) return;
        ttsLastAudioEndedAt = Date.now();
        playbackAttempt++;
        playbackFailure = null;
        clearTimeout(playbackStartTimer);

        ttsSeqStartTime.delete(NR.ttsState.currentSequence);
        NR.ttsState.isPlaying = false;
        NR.ttsState.isStarting = false;
        cleanupAudioResource(NR.ttsState.currentPlayItem);
        NR.ttsState.currentPlayItem = null;
        NR.ttsState.currentSequence++;

        setTimeout(function() { tryPlayNext(); }, 0);
    };

    function fetchAudioBlob(chunk, sequence, session) {
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
            if (session !== ttsSession) return null;
            var timeoutConfig = getCurrentTtsTimeouts();
            setTtsStatus(chunk && chunk.isDialogue
                ? (NR.ttsController.isIndexTtsProvider() ? '请求对白TTS...IndexTTS较慢，请等待' : '请求对白TTS...')
                : (NR.ttsController.isIndexTtsProvider() ? '请求TTS...IndexTTS较慢，请等待' : '请求TTS...'), sequence);

            return requestTts(NR.ttsController.isFishSpeechProvider() ? NR.ttsController.getFishSpeechPath('/tts') : '/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, timeoutConfig.totalRequestMs, true).then(function(blob) {
                if (!blob.size) throw new Error('服务端返回了空音频。');
                if (/json|text\/|html/i.test(blob.type)) {
                    return blob.text().then(function(message) {
                        throw new Error('服务端未返回音频：' + message.slice(0, 200));
                    });
                }
                return blob;
            });
        }).catch(function(error) {
            console.error("Failed to fetch TTS audio:", error);
            if (session === ttsSession) setTtsStatus('语音请求失败，正在重试...', sequence);
            throw error;
        });
    }

    NR.toggleTtsPlayback = function() {
        if (!NR.ttsState.isActive) return;

        if (NR.ttsState.isPlaying && !NR.ttsState.isPaused) {
            syncBufferedPlayback();
            if (ttsNaturalPauseTimer) {
                ttsNaturalPauseRemaining = Math.max(0, ttsNaturalPauseDeadline - Date.now());
                clearTimeout(ttsNaturalPauseTimer);
                ttsNaturalPauseTimer = null;
            }
            if (NR.ttsBufferedPlayer) NR.ttsBufferedPlayer.pause();
            NR.state.ttsAudioElement.pause();
            playbackAttempt++;
            playbackFailure = null;
            clearTimeout(playbackStartTimer);
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
                if (NR.ttsState.currentPlayItem.waitingForPause) queueNaturalPause(NR.ttsState.currentPlayItem, ttsNaturalPauseRemaining);
                else playCurrentItem(false);
            } else {
                tryPlayNext();
            }
        }
    };
})();
