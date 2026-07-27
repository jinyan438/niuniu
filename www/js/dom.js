// DOM 元素管理
(function() {
    var NR = window.NovelReader;
    NR.els = {};

    NR.initDOM = function() {
        var ids = [
            'app-container', 'bookshelf-view', 'app-loader', 'file-input', 'theme-selector',
            'btn-back-to-shelf', 'btn-add-to-shelf', 'btn-catalog', 'btn-back-to-original', 'btn-search',
            'btn-listen-mode', 'btn-immersive-mode', 'btn-ai-menu', 'header-filename', 'page-info',
            'chapter-info', 'content-wrapper', 'content-inner', 'prev-page-container', 'current-page-container',
            'next-page-container', 'calculation-ruler', 'bookshelf-grid', 'bookshelf-filter', 'import-files-input',
            'import-folder-input', 'catalog-modal', 'catalog-list', 'tag-edit-modal', 'tag-edit-modal-title',
            'current-tags-list', 'add-tag-form', 'new-tag-input', 'btn-close-tag-modal', 'settings-modal',
            'btn-settings', 'toggle-click-page', 'toggle-swipe-page', 'toggle-hover-highlight',
            'toggle-dialogue-highlight', 'toggle-focus-mode', 'dialogue-color-picker', 'btn-reset-dialogue-color',
            'theme-selector', 'tts-provider-selector', 'tts-provider-selector-ai', 'tts-voice-selector', 'tts-dialogue-voice-selector', 'tts-status-indicator', 'btn-font-settings', 'font-settings-modal',
            'text-color-picker', 'btn-reset-text-color', 'bg-color-picker', 'btn-reset-bg-color', 'bg-image-input',
            'btn-clear-bg-image', 'btn-ai-settings', 'ai-settings-modal', 'btn-factory-reset', 'font-settings-list',
            'font-size-slider', 'font-size-value', 'reset-font-size', 'letter-spacing-slider', 'letter-spacing-value',
            'reset-letter-spacing', 'line-height-slider', 'line-height-value', 'reset-line-height',
            'paragraph-spacing-slider', 'paragraph-spacing-value', 'reset-paragraph-spacing', 'font-file-input',
            'btn-clear-font', 'custom-font-status', 'ai-menu-modal', 'ai-api-url', 'ai-api-key', 'ai-model-name',
            'btn-open-custom-prompts', 'custom-prompts-modal', 'ai-summary-prompt', 'ai-summary-length', 'ai-sequel-prompt', 'ai-translation-prompt',
            'ai-comment-prompt', 'btn-open-reader-persona-settings', 'reader-persona-settings-modal', 'ai-reader-personas', 'btn-add-reader-persona', 'btn-clear-book-comments', 'btn-save-ai-settings',
            'tts-api-url', 'tts-api-url-label', 'tts-voice-list', 'btn-add-tts-voice', 'btn-refresh-tts-voices', 'tts-refresh-voices-row', 'tts-gptsovits-voice-management', 'tts-indextts-provider-hint', 'tts-gptsovits-params', 'tts-speed-factor-slider', 'tts-speed-factor-value',
            'tts-top-k-slider', 'tts-top-k-value', 'tts-top-p-slider', 'tts-top-p-value', 'tts-temperature-slider',
            'tts-temperature-value', 'tts-voice-edit-modal', 'tts-voice-edit-modal-title', 'tts-voice-name',
            'tts-gpt-path', 'tts-sovits-path', 'tts-ref-audio-path', 'tts-prompt-text', 'tts-prompt-lang',
            'btn-save-tts-voice', 'btn-summary', 'btn-sequel', 'btn-translate', 'btn-character-profiling',
            'btn-summary-history', 'btn-sequel-history', 'btn-translation-history', 'btn-character-history',
            'summary-choice-modal', 'summary-range-type', 'summary-page-range-selector', 'summary-page-range',
            'summary-chapter-range-selector', 'summary-chapter-range',
            'summary-context-list', 'btn-generate-summary', 'summary-display-modal', 'summary-content',
            'btn-save-summary', 'translation-choice-modal', 'translation-range-type',
            'translation-page-range-selector', 'translation-page-range',
            'translation-chapter-range-selector', 'translation-chapter-range', 'translation-context-list',
            'btn-generate-translation', 'sequel-choice-modal', 'sequel-range-type', 'sequel-page-range-selector',
            'sequel-chapter-range-selector', 'sequel-page-range', 'sequel-chapter-range', 'sequel-summary-context-list',
            'btn-generate-sequel', 'summary-history-modal', 'summary-history-list', 'sequel-history-modal',
            'sequel-history-list', 'translation-history-modal', 'translation-history-list', 'character-history-modal',
            'character-history-list', 'character-range-type',
            'character-page-range-selector', 'character-chapter-range-selector', 'character-page-range',
            'character-chapter-range', 'character-sequel-range-selector', 'character-sequel-select', 'comfyui-api-url', 
            'image-provider-selector', 'comfyui-settings-group', 'nanobananapro-settings-group', 'nanobananapro-api-key', 'nanobananapro-model',
            'search-bar', 'search-input',
            'btn-search-chapter', 'btn-search-all', 'btn-search-prev', 'btn-search-next', 'search-results-info',
            'btn-close-search', 'tts-player-controls', 'tts-status', 'btn-tts-prev', 'btn-tts-play-pause',
            'btn-tts-stop', 'btn-tts-next',
            'btn-scene-image', 'btn-scene-image-history', 'scene-image-choice-modal', 'scene-image-range-type',
            'scene-image-page-range-selector', 'scene-image-chapter-range-selector', 'scene-image-page-range',
            'scene-image-chapter-range', 'scene-image-size', 'btn-generate-scene-image', 'scene-image-history-modal',
            'scene-image-history-list',
            'btn-fanqie-search', 'fanqie-search-modal', 'fanqie-search-form', 'fanqie-search-input',
            'fanqie-search-results', 'fanqie-download-modal', 'fanqie-download-book-name',
            'fanqie-download-progress-bar', 'fanqie-download-status', 'btn-fanqie-cancel',
            'fanqie-backup-api',
            'btn-export-book', 'export-book-modal', 'export-book-list', 'btn-export-selected',
            'export-dir-input', 'btn-save-export-dir',
            'character-form-choice-modal', 'btn-generate-all-characters', 'btn-view-global-data', 'btn-view-protagonist',
            'btn-view-npc-list', 'btn-view-skills', 'btn-view-items', 'btn-view-quests',
            'btn-view-locations', 'btn-view-equipments', 'btn-view-factions', 'btn-view-intels',
            'btn-view-relationships', 'btn-clear-all-data'
        ];
        
        ids.forEach(function(id) {
            NR.els[id] = document.getElementById(id);
        });
        
        // Non-ID selections
        NR.els.readerView = document.querySelector('.reader-container');
        NR.els.footer = document.querySelector('footer');
    };
})();
