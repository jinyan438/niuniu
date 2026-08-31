// 应用入口
(function() {
    var NR = window.NovelReader;

    function runMigration() {
        if (NR.state.bookshelf.length > 0 && NR.state.bookshelf[0].hasOwnProperty('content')) {
            NR.els['app-loader'].classList.remove('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在升级书库格式，请稍候...';
            var migrationPromises = NR.state.bookshelf.map(function(book) {
                if (book.name && book.content) {
                    return NR.storageDB.saveBook({ id: book.name, content: book.content });
                }
                return Promise.resolve();
            });
            return Promise.all(migrationPromises).then(function() {
                NR.state.bookshelf = NR.state.bookshelf.map(function(book) {
                    return {
                        name: book.name,
                        cover: book.cover,
                        tags: book.tags || []
                    };
                }).filter(function(b) { return b.name; });
                NR.saveBookshelf();
                NR.els['app-loader'].querySelector('span').textContent = '升级完成！';
            }).catch(function(e) {
                console.error("Migration failed:", e);
                NR.els['app-loader'].querySelector('span').textContent = '升级失败，请检查控制台。';
            }).then(function() {
                return new Promise(function(resolve) { setTimeout(resolve, 1500); });
            });
        }
        return Promise.resolve();
    }

    function continueInit() {
        NR.state.ttsAudioElement = new Audio();
        NR.state.ttsAudioElement.preload = 'auto';
        NR.state.ttsAudioElement.addEventListener('waiting', function() {
            if (NR.ttsState && NR.ttsState.isActive && !NR.ttsState.isPlaying) {
                NR.els['tts-status'].textContent = '服务器合成/网络缓冲中...';
            }
        });
        NR.state.ttsAudioElement.addEventListener('playing', function() {
            if (NR.ttsState && NR.ttsState.isActive) {
                NR.els['tts-status'].textContent = '播放中...';
            }
        });
        NR.state.ttsAudioElement.addEventListener('stalled', function() {
            if (NR.ttsState && NR.ttsState.isActive) {
                NR.els['tts-status'].textContent = '音频连接卡顿...';
            }
        });
        NR.state.ttsAudioElement.addEventListener('ended', NR.onAudioEnded);
        NR.state.ttsAudioElement.addEventListener('error', function(e) {
            console.error('Core audio element error:', e);
            if (NR.ttsState && NR.ttsState.isActive) {
                var mediaError = NR.state.ttsAudioElement && NR.state.ttsAudioElement.error;
                NR.els['tts-status'].textContent = '播放失败' + (mediaError && mediaError.code ? ' #' + mediaError.code : '');
            }
            NR.onAudioEnded();
        });

        NR.loadSettings();
        NR.applyInitialTheme();
        NR.loadBookshelf();
        
        runMigration().then(function() {
            return NR.loadAndApplyAssetsFromDB();
        }).then(function() {
            NR.loadAiSettings();
            NR.applySettings();

            if (NR.ttsController.getActiveVoiceId()) {
                NR.ttsController.switchAndValidateActiveVoice();
            }

            NR.bindEventListeners();
            if (NR.initBookSourceFeature) NR.initBookSourceFeature();
            if (NR.initCommentFeature) NR.initCommentFeature();
            NR.showBookshelfView();
            NR.els['app-loader'].classList.add('hidden');
        }).catch(function(e) {
            console.error("初始化过程出错:", e);
            NR.els['app-loader'].classList.add('hidden');
            NR.showBookshelfView();
        });
    }

    function initializeApp() {
        // 确保 NovelReader 命名空间存在
        if (!NR || !NR.initDOM) {
            console.error("NovelReader 命名空间未正确初始化");
            document.body.innerHTML = '<h1>应用初始化失败</h1><p>请刷新页面重试</p>';
            return;
        }
        
        NR.initDOM();
        
        if (typeof JSZip === 'undefined') {
            document.body.innerHTML = '<h1>关键组件 JSZip 加载失败，请检查网络连接或文件完整性。</h1>';
            return;
        }
        
        // 检查 IndexedDB 是否可用
        if (!window.indexedDB) {
            console.warn("IndexedDB 不可用，使用降级模式");
            NR.storageDB.db = null;
            continueInit();
            return;
        }
        
        NR.storageDB.init().then(function() {
            continueInit();
        }).catch(function(e) {
            console.error("数据库初始化失败:", e);
            // 即使数据库失败，也尝试继续运行（降级模式）
            console.warn("使用降级模式运行，书架功能可能受限");
            NR.storageDB.db = null;
            continueInit();
        });
    }

    document.addEventListener('DOMContentLoaded', initializeApp);
})();
