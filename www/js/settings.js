// 设置管理
(function() {
    var NR = window.NovelReader;

    NR.defaultFontSettings = {
        fontSize: 20,
        letterSpacing: 0,
        lineHeight: 1.9,
        paragraphSpacing: 1.0
    };

    NR.saveSettings = function() {
        localStorage.setItem('novelReaderSettings', JSON.stringify(NR.state.settings));
    };

    NR.loadSettings = function() {
        var saved = localStorage.getItem('novelReaderSettings');
        if (saved) {
            try {
                var parsedSettings = JSON.parse(saved);
                NR.state.settings = Object.assign({}, NR.state.settings, parsedSettings);
            } catch (e) {
                console.error("Failed to parse settings, using defaults.", e);
            }
        }
    };

    NR.applySettings = function() {
        if (NR.els['content-wrapper']) {
            NR.els['content-wrapper'].style.cursor = NR.state.settings.enableClickPage ? 'pointer' : 'default';
        }
        NR.els['toggle-click-page'].checked = NR.state.settings.enableClickPage;
        NR.els['toggle-swipe-page'].checked = NR.state.settings.enableSwipePage;
        NR.els['toggle-hover-highlight'].checked = NR.state.settings.enableHoverHighlight;
        NR.els['toggle-dialogue-highlight'].checked = NR.state.settings.enableDialogueHighlight;
        NR.els['toggle-focus-mode'].checked = NR.state.settings.enableFocusMode;

        document.body.classList.toggle('hover-highlight-disabled', !NR.state.settings.enableHoverHighlight);
        document.body.classList.toggle('dialogue-highlight-disabled', !NR.state.settings.enableDialogueHighlight);
        document.body.classList.toggle('focus-mode-active', NR.state.settings.enableFocusMode);

        if (!NR.state.settings.enableFocusMode) {
            NR.clearFocusHighlight();
        } else {
            NR.initFocusHighlight();
        }

        document.documentElement.style.removeProperty('--text-color');
        document.documentElement.style.removeProperty('--bg-color');
        document.documentElement.style.removeProperty('--dialogue-color');
        document.body.style.removeProperty('--text-color');
        document.body.style.removeProperty('--bg-color');
        document.body.style.removeProperty('--dialogue-color');
        var isEinkTheme = document.body.classList.contains('theme-eink');
        if (NR.state.settings.customTextColor) {
            document.documentElement.style.setProperty('--text-color', NR.state.settings.customTextColor);
            document.body.style.setProperty('--text-color', NR.state.settings.customTextColor);
        }
        if (NR.state.settings.customBgColor && !isEinkTheme) {
            document.documentElement.style.setProperty('--bg-color', NR.state.settings.customBgColor);
            document.body.style.setProperty('--bg-color', NR.state.settings.customBgColor);
        }
        if (NR.state.settings.dialogueCustomColor) {
            document.documentElement.style.setProperty('--dialogue-color', NR.state.settings.dialogueCustomColor);
            document.body.style.setProperty('--dialogue-color', NR.state.settings.dialogueCustomColor);
        }
        
        var currentTextColor = getComputedStyle(document.body).getPropertyValue('--text-color').trim();
        NR.els['text-color-picker'].value = currentTextColor.startsWith('rgb') ? NR.rgbToHex(currentTextColor) : currentTextColor;
        var currentBgColor = getComputedStyle(document.body).getPropertyValue('--bg-color').trim();
        NR.els['bg-color-picker'].value = currentBgColor.startsWith('rgb') ? NR.rgbToHex(currentBgColor) : currentBgColor;
        var currentDialogueColor = getComputedStyle(document.body).getPropertyValue('--dialogue-color').trim();
        NR.els['dialogue-color-picker'].value = currentDialogueColor.startsWith('rgb') ? NR.rgbToHex(currentDialogueColor) : currentDialogueColor;
        
        document.documentElement.style.setProperty('--font-size', NR.state.settings.fontSize + 'px');
        document.documentElement.style.setProperty('--letter-spacing', NR.state.settings.letterSpacing + 'px');
        document.documentElement.style.setProperty('--line-height', NR.state.settings.lineHeight);
        document.documentElement.style.setProperty('--paragraph-spacing', NR.state.settings.paragraphSpacing + 'em');
        
        NR.els['font-size-slider'].value = NR.state.settings.fontSize;
        NR.els['font-size-value'].textContent = NR.state.settings.fontSize + 'px';
        NR.els['letter-spacing-slider'].value = NR.state.settings.letterSpacing;
        NR.els['letter-spacing-value'].textContent = NR.state.settings.letterSpacing.toFixed(1) + 'px';
        NR.els['line-height-slider'].value = NR.state.settings.lineHeight;
        NR.els['line-height-value'].textContent = NR.state.settings.lineHeight.toFixed(1);
        NR.els['paragraph-spacing-slider'].value = NR.state.settings.paragraphSpacing;
        NR.els['paragraph-spacing-value'].textContent = NR.state.settings.paragraphSpacing.toFixed(1) + 'em';
    };

    function normalizeReaderPersonaList(value) {
        if (Array.isArray(value)) {
            return value.map(function(item, index) {
                item = item || {};
                return {
                    name: String(item.name || ('读者' + (index + 1))).trim(),
                    prompt: String(item.prompt || '').trim()
                };
            }).filter(function(item) { return item.name || item.prompt; });
        }

        value = String(value || NR.DEFAULT_READER_PERSONAS_TEXT || '').trim();
        if (!value) return [];
        return value.split(/\n+/).map(function(line, index) {
            line = line.trim();
            if (!line) return null;
            var parts = line.split(/[:：]/);
            var name;
            var prompt;
            if (parts.length > 1) {
                name = parts.shift().trim();
                prompt = parts.join('：').trim();
            } else {
                name = '读者' + (index + 1);
                prompt = line;
            }
            return { name: name || ('读者' + (index + 1)), prompt: prompt || line };
        }).filter(Boolean);
    }

    NR.renderReaderPersonaCards = function(personas) {
        var container = NR.els['ai-reader-personas'];
        if (!container) return;
        personas = normalizeReaderPersonaList(personas);

        container.innerHTML = '';
        personas.forEach(function(persona, index) {
            var card = document.createElement('div');
            card.className = 'reader-persona-card';
            card.innerHTML =
                '<div class="reader-persona-card-header">' +
                    '<span class="reader-persona-card-title">读者 ' + (index + 1) + '</span>' +
                    '<button type="button" class="control-button reader-persona-card-remove">删除</button>' +
                '</div>' +
                '<div class="reader-persona-field">' +
                    '<label>读者名称</label>' +
                    '<input type="text" class="reader-persona-name" placeholder="例如：剧情党">' +
                '</div>' +
                '<div class="reader-persona-field">' +
                    '<label>人格提示词</label>' +
                    '<textarea class="reader-persona-prompt" placeholder="设置这个读者的评论视角、语气和关注点"></textarea>' +
                '</div>';
            card.querySelector('.reader-persona-name').value = persona.name || '';
            card.querySelector('.reader-persona-prompt').value = persona.prompt || '';
            container.appendChild(card);
        });
    };

    NR.collectReaderPersonaCards = function() {
        var container = NR.els['ai-reader-personas'];
        if (!container) return normalizeReaderPersonaList(NR.DEFAULT_READER_PERSONAS_TEXT);
        return Array.prototype.slice.call(container.querySelectorAll('.reader-persona-card')).map(function(card, index) {
            var nameInput = card.querySelector('.reader-persona-name');
            var promptInput = card.querySelector('.reader-persona-prompt');
            return {
                name: (nameInput && nameInput.value.trim()) || ('读者' + (index + 1)),
                prompt: (promptInput && promptInput.value.trim()) || ''
            };
        }).filter(function(item) { return item.prompt; });
    };

    NR.addReaderPersonaCard = function() {
        var personas = NR.collectReaderPersonaCards();
        personas.push({ name: '读者' + (personas.length + 1), prompt: '' });
        NR.renderReaderPersonaCards(personas);
    };

    NR.removeReaderPersonaCard = function(button) {
        var card = button && button.closest ? button.closest('.reader-persona-card') : null;
        if (!card) return;
        card.remove();
        NR.renderReaderPersonaCards(NR.collectReaderPersonaCards());
    };

    NR.handleSettingsChange = function() {
        NR.state.settings.enableClickPage = NR.els['toggle-click-page'].checked;
        NR.state.settings.enableSwipePage = NR.els['toggle-swipe-page'].checked;
        NR.state.settings.enableHoverHighlight = NR.els['toggle-hover-highlight'].checked;
        NR.state.settings.enableDialogueHighlight = NR.els['toggle-dialogue-highlight'].checked;
        NR.state.settings.enableFocusMode = NR.els['toggle-focus-mode'].checked;
        NR.saveSettings();
        NR.applySettings();
    };

    NR.clearCurrentBookComments = function() {
        if (!NR.state.currentFileName) {
            alert('请先打开一本小说。');
            return;
        }
        var comments = NR.state.currentBookData && NR.state.currentBookData.comments ? NR.state.currentBookData.comments : [];
        if (!comments.length) {
            alert('当前小说没有段评。');
            return;
        }
        if (!confirm('确定要清除当前小说的全部段评吗？')) return;
        NR.state.currentBookData.comments = [];
        if (NR.state.activeCommentThread) NR.state.activeCommentThread = null;
        if (NR.state.commentSelectionInfo) NR.state.commentSelectionInfo = null;
        var commentModal = document.getElementById('reader-comment-modal');
        if (commentModal) commentModal.style.display = 'none';
        if (NR.refreshCommentMarkers) NR.refreshCommentMarkers();
        NR.saveBookData();
        alert('当前小说的全部段评已清除。');
    };

    NR.saveAiSettings = function() {
        NR.state.aiSettings.apiUrl = NR.els['ai-api-url'].value.trim();
        NR.state.aiSettings.apiKey = NR.els['ai-api-key'].value.trim();
        NR.state.aiSettings.modelName = NR.els['ai-model-name'].value.trim();
        NR.state.aiSettings.summaryPrompt = NR.els['ai-summary-prompt'].value.trim();
        NR.state.aiSettings.summaryLength = parseInt(NR.els['ai-summary-length'].value, 10) || 150;
        NR.state.aiSettings.sequelPrompt = NR.els['ai-sequel-prompt'].value.trim();
        NR.state.aiSettings.translationPrompt = NR.els['ai-translation-prompt'].value.trim();
        NR.state.aiSettings.commentPrompt = NR.els['ai-comment-prompt'].value.trim();
        NR.state.aiSettings.readerPersonas = NR.collectReaderPersonaCards();
        NR.state.aiSettings.comfyuiApiUrl = NR.els['comfyui-api-url'].value.trim();
        NR.state.aiSettings.imageProvider = NR.els['image-provider-selector'].value;
        NR.state.aiSettings.nanoBananaProApiKey = NR.els['nanobananapro-api-key'].value.trim();
        NR.state.aiSettings.nanoBananaProModel = NR.els['nanobananapro-model'].value.trim() || 'gemini-2.0-flash-preview-image-generation';
        localStorage.setItem("novelReaderAiSettings", JSON.stringify(NR.state.aiSettings));

        NR.ttsController.settings.provider = NR.ttsController.normalizeProvider(NR.els['tts-provider-selector-ai'].value);
        NR.ttsController.setCurrentApiUrl(NR.els['tts-api-url'].value.trim());
        NR.ttsController.settings.speedFactor = parseFloat(NR.els['tts-speed-factor-slider'].value);
        NR.ttsController.settings.topK = parseInt(NR.els['tts-top-k-slider'].value, 10);
        NR.ttsController.settings.topP = parseFloat(NR.els['tts-top-p-slider'].value);
        NR.ttsController.settings.temperature = parseFloat(NR.els['tts-temperature-slider'].value);
        if (NR.ttsController.isIndexTtsProvider()) {
            NR.ttsController.indexTtsVoiceCatalogStatus = 'idle';
        }
        NR.ttsController.saveSettings();
        NR.ttsController.renderAllUI();

        alert("AI 设置已保存。");
        NR.els['ai-settings-modal'].style.display = "none";
    };

    NR.loadAiSettings = function() {
        var savedAi = localStorage.getItem("novelReaderAiSettings");
        if (savedAi) {
            var parsed = JSON.parse(savedAi);
            NR.state.aiSettings = Object.assign({}, NR.state.aiSettings, parsed);
        }
        NR.els['ai-api-url'].value = NR.state.aiSettings.apiUrl || "";
        NR.els['ai-api-key'].value = NR.state.aiSettings.apiKey || "";
        NR.els['ai-model-name'].value = NR.state.aiSettings.modelName || "";
        NR.els['comfyui-api-url'].value = NR.state.aiSettings.comfyuiApiUrl || "";
        NR.els['image-provider-selector'].value = NR.state.aiSettings.imageProvider || "comfyui";
        NR.els['nanobananapro-api-key'].value = NR.state.aiSettings.nanoBananaProApiKey || "";
        NR.els['nanobananapro-model'].value = NR.state.aiSettings.nanoBananaProModel || "gemini-2.0-flash-preview-image-generation";
        
        // 根据选择的生图服务显示/隐藏对应设置
        NR.updateImageProviderUI();

        NR.els['ai-summary-prompt'].value = NR.state.aiSettings.summaryPrompt || NR.DEFAULT_AI_PROMPTS.SUMMARY;
        NR.els['ai-sequel-prompt'].value = NR.state.aiSettings.sequelPrompt || NR.DEFAULT_AI_PROMPTS.SEQUEL;
        NR.els['ai-translation-prompt'].value = NR.state.aiSettings.translationPrompt || NR.DEFAULT_AI_PROMPTS.TRANSLATION;
        NR.els['ai-comment-prompt'].value = NR.state.aiSettings.commentPrompt || NR.DEFAULT_AI_PROMPTS.COMMENT;
        NR.renderReaderPersonaCards(NR.state.aiSettings.readerPersonas || NR.DEFAULT_READER_PERSONAS_TEXT);
        NR.els['ai-summary-length'].value = NR.state.aiSettings.summaryLength || 150;

        NR.ttsController.loadSettings();
        NR.ttsController.renderAllUI();
    };

    NR.switchTheme = function(themeName, isInitial) {
        document.body.classList.remove("theme-dark", "theme-green", "theme-blue", "theme-gray", "theme-eink");
        if (themeName !== 'default') document.body.classList.add(themeName);
        localStorage.setItem('novelReaderTheme', themeName);
        if (!isInitial) {
            NR.applySettings();
        }
    };

    NR.applyInitialTheme = function() {
        var savedTheme = localStorage.getItem('novelReaderTheme') || 'default';
        NR.switchTheme(savedTheme, true);
        if (NR.els['theme-selector']) {
            NR.els['theme-selector'].value = savedTheme;
        }
    };

    NR.applyCustomFont = function(file, fileName) {
        NR.removeCustomFont();
        NR.state.currentCustomFontUrl = URL.createObjectURL(file);
        var style = document.createElement("style");
        style.id = "custom-font-stylesheet";
        style.textContent = "@font-face { font-family: 'user-custom-font'; src: url('" + NR.state.currentCustomFontUrl + "'); }";
        document.head.appendChild(style);
        document.body.style.fontFamily = "'user-custom-font', " + getComputedStyle(document.body).fontFamily;
        NR.els['custom-font-status'].textContent = "当前字体: " + fileName;
    };

    NR.removeCustomFont = function() {
        var e = document.getElementById("custom-font-stylesheet");
        if (e) e.remove();
        if (NR.state.currentCustomFontUrl) {
            URL.revokeObjectURL(NR.state.currentCustomFontUrl);
            NR.state.currentCustomFontUrl = null;
        }
        document.body.style.fontFamily = "";
        NR.els['custom-font-status'].textContent = "未设置";
        NR.els['font-file-input'].value = "";
    };

    NR.applyCustomBgImage = function(file) {
        NR.removeCustomBgImage(false);
        NR.state.currentBgImageUrl = URL.createObjectURL(file);
        document.body.style.backgroundImage = "url(" + NR.state.currentBgImageUrl + ")";
        if (!NR.state.settings.customBgColor) {
            document.body.classList.add("custom-background-active");
        }
    };

    NR.removeCustomBgImage = function(shouldDeleteFromDB) {
        if (shouldDeleteFromDB === undefined) shouldDeleteFromDB = true;
        if (NR.state.currentBgImageUrl) {
            URL.revokeObjectURL(NR.state.currentBgImageUrl);
            NR.state.currentBgImageUrl = null;
        }
        document.body.style.backgroundImage = "";
        document.body.classList.remove("custom-background-active");
        NR.els['bg-image-input'].value = "";
        if (shouldDeleteFromDB) {
            NR.storageDB.deleteAsset("custom-bg-image").catch(function(e) { console.error("Failed to delete bg image", e); });
        }
    };

    NR.loadAndApplyAssetsFromDB = function() {
        return NR.storageDB.loadAsset("custom-font").then(function(fontAsset) {
            if (fontAsset) NR.applyCustomFont(fontAsset.data, fontAsset.name);
            return NR.storageDB.loadAsset("custom-bg-image");
        }).then(function(bgImageAsset) {
            if (bgImageAsset) NR.applyCustomBgImage(bgImageAsset.data);
        }).catch(function(e) {
            console.error("Failed to load assets from DB:", e);
        });
    };

    NR.handleFactoryReset = function() {
        if (!confirm('确定要恢复所有默认设置吗？\n\n这将重置所有阅读设置、主题、字体和颜色配置。\n书架和阅读进度不会受影响。')) {
            return;
        }

        // Reset settings to defaults
        NR.state.settings = {
            enableClickPage: true,
            enableSwipePage: true,
            enableHoverHighlight: true,
            enableDialogueHighlight: true,
            enableFocusMode: false,
            dialogueCustomColor: null,
            customTextColor: null,
            customBgColor: null,
            fontSize: NR.defaultFontSettings.fontSize,
            letterSpacing: NR.defaultFontSettings.letterSpacing,
            lineHeight: NR.defaultFontSettings.lineHeight,
            paragraphSpacing: NR.defaultFontSettings.paragraphSpacing,
        };
        NR.saveSettings();

        // Reset theme
        NR.switchTheme('default');

        // Remove custom font and background
        NR.removeCustomFont();
        NR.removeCustomBgImage();

        // Apply all settings
        NR.applySettings();

        alert('所有设置已恢复为默认值。');
    };

    // 更新生图服务提供商UI显示
    NR.updateImageProviderUI = function() {
        var provider = NR.els['image-provider-selector'].value;
        if (provider === 'comfyui') {
            NR.els['comfyui-settings-group'].style.display = 'block';
            NR.els['nanobananapro-settings-group'].style.display = 'none';
        } else if (provider === 'nanobananapro') {
            NR.els['comfyui-settings-group'].style.display = 'none';
            NR.els['nanobananapro-settings-group'].style.display = 'block';
        }
    };
})();
