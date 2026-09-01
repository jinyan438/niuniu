// 事件绑定
(function() {
    var NR = window.NovelReader;

    // 自定义下拉菜单处理
    function initCustomDropdown(dropdown, onChange) {
        var selected = dropdown.querySelector('.custom-dropdown-selected');
        var options = dropdown.querySelectorAll('.custom-dropdown-option');
        
        selected.addEventListener('click', function(e) {
            e.stopPropagation();
            // 关闭其他下拉菜单
            document.querySelectorAll('.custom-dropdown.open').forEach(function(d) {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });
        
        options.forEach(function(option) {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                var value = option.dataset.value;
                var text = option.textContent;
                dropdown.dataset.value = value;
                selected.textContent = text;
                options.forEach(function(o) { o.classList.remove('selected'); });
                option.classList.add('selected');
                dropdown.classList.remove('open');
                if (onChange) onChange(value);
            });
        });
    }
    
    function setCustomDropdownValue(dropdown, value) {
        var options = dropdown.querySelectorAll('.custom-dropdown-option');
        var selected = dropdown.querySelector('.custom-dropdown-selected');
        dropdown.dataset.value = value;
        options.forEach(function(option) {
            if (option.dataset.value === value) {
                selected.textContent = option.textContent;
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
    
    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', function() {
        document.querySelectorAll('.custom-dropdown.open').forEach(function(d) {
            d.classList.remove('open');
        });
    });

    NR.bindEventListeners = function() {
        function loadBookFromFile(event) {
            var file = event.target.files[0];
            if (!file) return;
            NR.showReaderView();
            NR.state.activeSubView = 'original';
            NR.state.currentBookCoverUrl = null;
            NR.state.epubImagePreloadList = [];

            var loadPromise;
            if (NR.isEpubFile(file)) {
                NR.els['app-loader'].classList.remove('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在解析 EPUB...';
                loadPromise = NR.parseEpubToPlainText(file).then(function(result) {
                    NR.state.currentBookCoverUrl = result.coverUrl;
                    return NR.loadBook(file.name, result.textContent);
                });
            } else {
                loadPromise = NR.readFileAsText(file, 'UTF-8').then(function(text) {
                    if (text.includes('\uFFFD')) {
                        throw new Error("Fallback to GBK.");
                    }
                    return text;
                }).catch(function() {
                    return NR.readFileAsText(file, 'GBK');
                }).then(function(text) {
                    return NR.loadBook(file.name, text);
                });
            }

            loadPromise.catch(function(err) {
                console.error('书籍加载失败:', err);
                alert('加载书籍失败：' + (err.message || err));
                NR.showBookshelfView();
            }).finally(function() {
                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
                event.target.value = null;
            });
        }

        function getEventX(e) {
            return e.type.startsWith('touch') ? e.changedTouches[0].clientX : e.clientX;
        }
        function dragStart(e) {
            if (!NR.state.settings.enableSwipePage || NR.state.totalPages <= 0 || NR.state.isTransitioning) return;
            if (e.type === 'mousedown' && e.target.closest && e.target.closest('.page p')) return;
            NR.state.isDragging = true;
            NR.state.dragStartX = getEventX(e);
            NR.els['content-inner'].classList.add('is-dragging');
        }
        function dragMove(e) {
            if (!NR.state.isDragging) return;
            NR.state.dragDelta = getEventX(e) - NR.state.dragStartX;
            NR.els['content-inner'].style.transform = 'translateX(' + (NR.state.currentTranslate + NR.state.dragDelta) + 'px)';
        }
        function dragEnd() {
            if (!NR.state.isDragging) return;
            NR.state.isDragging = false;
            NR.els['content-inner'].classList.remove('is-dragging');
            var threshold = NR.state.viewportWidth * 0.3;
            if (Math.abs(NR.state.dragDelta) > 10) NR.state.ignoreNextClick = true;
            if (NR.state.dragDelta < -threshold) NR.jumpToPage(NR.state.currentPage + 1);
            else if (NR.state.dragDelta > threshold) NR.jumpToPage(NR.state.currentPage - 1);
            else NR.els['content-inner'].style.transform = 'translateX(' + NR.state.currentTranslate + 'px)';
            NR.state.dragDelta = 0;
        }
        function getEventY(e) {
            return e.type.startsWith('touch') ? e.touches[0].pageY : e.pageY;
        }
        function shelfDragStart(e) {
            // Action buttons must never start the bookshelf drag/selection
            // gesture; otherwise a tap can select the whole row and swallow
            // the subsequent button click on Android WebView.
            if (e.target && e.target.closest && e.target.closest('.book-actions')) {
                NR.state.isShelfDragging = false;
                NR.state.ignoreNextClick = false;
                if (window.getSelection) {
                    var selection = window.getSelection();
                    if (selection && selection.removeAllRanges) selection.removeAllRanges();
                }
                return;
            }
            if (e.button !== 0 && e.type.startsWith('mouse')) return;
            var scrollbarWidth = NR.els['bookshelf-grid'].offsetWidth - NR.els['bookshelf-grid'].clientWidth;
            if (e.offsetX > NR.els['bookshelf-grid'].clientWidth - scrollbarWidth) return;
            NR.state.isShelfDragging = true;
            NR.state.shelfStartY = getEventY(e);
            NR.state.shelfScrollTopStart = NR.els['bookshelf-grid'].scrollTop;
            NR.els['bookshelf-grid'].classList.add('is-dragging');
            NR.state.ignoreNextClick = false;
        }
        function shelfDragMove(e) {
            if (!NR.state.isShelfDragging) return;
            e.preventDefault();
            var currentY = getEventY(e);
            var deltaY = currentY - NR.state.shelfStartY;
            NR.els['bookshelf-grid'].scrollTop = NR.state.shelfScrollTopStart - deltaY;
            if (Math.abs(deltaY) > 10) {
                NR.state.ignoreNextClick = true;
            }
        }
        function shelfDragEnd() {
            if (!NR.state.isShelfDragging) return;
            NR.state.isShelfDragging = false;
            NR.els['bookshelf-grid'].classList.remove('is-dragging');
        }

        // --- Binding ---
        NR.els['file-input'].addEventListener('change', loadBookFromFile);
        NR.els['theme-selector'].addEventListener('change', function(e) { NR.switchTheme(e.target.value); });
        NR.els['btn-back-to-shelf'].addEventListener('click', function() {
            if (NR.state.isListenMode) NR.stopTts();
            NR.showBookshelfView();
        });
        
        NR.els['catalog-list'].addEventListener('click', function(event) {
            if (event.target.tagName !== 'LI') return;
            var onlineSession = NR.bookSourceState && NR.bookSourceState.onlineReader;
            if (onlineSession && event.target.dataset.chapterIndex !== undefined) {
                var chapterIndex = Number(event.target.dataset.chapterIndex);
                var chapterTitle = onlineSession.chapters[chapterIndex] && onlineSession.chapters[chapterIndex].title;
                var targetPage = -1;
                for (var onlinePageIndex = 0; onlinePageIndex < NR.state.allRenderedPages.length; onlinePageIndex++) {
                    var titleNode = NR.state.allRenderedPages[onlinePageIndex].querySelector('p.chapter-title');
                    if (!titleNode) {
                        var firstMatchingParagraph = Array.from(NR.state.allRenderedPages[onlinePageIndex].querySelectorAll('p')).find(function(node) {
                            return node.textContent.trim() === String(chapterTitle || '').trim();
                        });
                        titleNode = firstMatchingParagraph;
                    }
                    if (titleNode && titleNode.textContent.trim() === String(chapterTitle || '').trim()) {
                        targetPage = onlinePageIndex + 1;
                        break;
                    }
                }
                NR.els['catalog-modal'].style.display = 'none';
                if (targetPage !== -1) NR.jumpToPage(targetPage);
                else if (typeof NR.openOnlineChapterAt === 'function') NR.openOnlineChapterAt(chapterIndex);
                return;
            }
            var pId = event.target.dataset.pId;
            var targetPage = -1;
            for (var i = 0; i < NR.state.allRenderedPages.length; i++) {
                if (NR.state.allRenderedPages[i].querySelector('#' + pId)) {
                    targetPage = i + 1;
                    break;
                }
            }
            if (targetPage !== -1) {
                NR.els['catalog-modal'].style.display = 'none';
                NR.jumpToPage(targetPage);
            }
        });

        NR.els['btn-add-to-shelf'].addEventListener('click', function() { NR.handleAddToShelf(); });
        
        NR.els['btn-back-to-original'].addEventListener('click', function() {
            if (NR.state.activeSubView !== 'original') {
                if (NR.state.isListenMode) NR.stopTts();
                NR.state.activeSubView = 'original';
                NR.loadBook(NR.state.originalContentForSubView.name, NR.state.originalContentForSubView.content);
            }
        });
        
        ['toggle-click-page', 'toggle-swipe-page', 'toggle-hover-highlight', 'toggle-dialogue-highlight', 'toggle-focus-mode'].forEach(function(id) {
            NR.els[id].addEventListener('change', NR.handleSettingsChange);
        });
        
        NR.els['import-files-input'].addEventListener('change', NR.handleFileImport);
        NR.els['import-folder-input'].addEventListener('change', NR.handleFileImport);
        
        NR.els['bookshelf-filter'].addEventListener('change', function(e) {
            NR.state.activeFilterTag = e.target.value || null;
            NR.renderBookshelf();
        });

        // Handle shelf actions in the capture phase.  This runs before the
        // row's normal click handler, so a tap on an icon can never fall
        // through to opening the book or start a text-selection gesture.
        NR.els['bookshelf-grid'].addEventListener('click', function(event) {
            var capturedButton = event.target && event.target.closest ? event.target.closest('.book-actions button') : null;
            var isDownloadButton = capturedButton && capturedButton.classList.contains('download-book-btn-on-shelf');
            var isTagButton = capturedButton && capturedButton.classList.contains('tag-book-btn');
            if (capturedButton && (isDownloadButton || isTagButton)) {
                event.preventDefault();
                event.stopPropagation();
                var capturedBook = capturedButton.closest('.book-item');
                var capturedName = capturedBook && capturedBook.dataset.bookName;
                if (capturedName && isDownloadButton && typeof NR.downloadOnlineBookFromShelf === 'function') {
                    var clickNow = Date.now();
                    if (NR.state.lastShelfDownloadName !== capturedName || clickNow - (NR.state.lastShelfDownloadAt || 0) >= 700) {
                        NR.state.lastShelfDownloadName = capturedName;
                        NR.state.lastShelfDownloadAt = clickNow;
                        NR.downloadOnlineBookFromShelf(capturedName);
                    }
                } else if (capturedName && capturedButton.classList.contains('tag-book-btn')) {
                    NR.openTagEditModal(capturedName);
                }
                return;
            }
            var target = event.target;
            var actionButton = target && target.closest ? target.closest('.book-actions button') : null;
            if (actionButton) NR.state.ignoreNextClick = false;
            if (NR.state.ignoreNextClick) {
                event.preventDefault();
                event.stopPropagation();
                NR.state.ignoreNextClick = false;
                return;
            }
            var bookItem = target.closest('.book-item');
            if (!bookItem) return;

            var bookName = bookItem.dataset.bookName;
            
            if (target.closest('.tag-book-btn')) {
                event.stopPropagation();
                NR.openTagEditModal(bookName);
            } else if (target.closest('.download-book-btn-on-shelf')) {
                event.stopPropagation();
                if (typeof NR.downloadOnlineBookFromShelf === 'function') {
                    var bubbleNow = Date.now();
                    if (NR.state.lastShelfDownloadName !== bookName || bubbleNow - (NR.state.lastShelfDownloadAt || 0) >= 700) {
                        NR.state.lastShelfDownloadName = bookName;
                        NR.state.lastShelfDownloadAt = bubbleNow;
                        NR.downloadOnlineBookFromShelf(bookName);
                    }
                }
            } else if (target.closest('.delete-book-btn-on-shelf')) {
                event.stopPropagation();
                if (confirm('确定要从书架删除《' + bookName + '》吗？\n\n这将一并删除该书内容、阅读进度、AI数据库全部数据、人物图片和生图资源。此操作无法撤销。')) {
                    var rawBookData = localStorage.getItem('novelReaderData_' + bookName);
                    var bookDataForCleanup = null;
                    try {
                        bookDataForCleanup = rawBookData ? JSON.parse(rawBookData) : null;
                    } catch (parseErr) {
                        console.warn('解析待删除书籍数据失败，将继续删除基础记录:', parseErr);
                    }

                    var cleanupResources = NR.storageDB && NR.storageDB.deleteBookResources
                        ? NR.storageDB.deleteBookResources(bookName, bookDataForCleanup || {})
                        : Promise.resolve();

                    cleanupResources.catch(function(err) {
                        console.warn('删除书籍关联资源失败，将继续删除书籍记录:', err);
                    }).then(function() {
                        return NR.storageDB.deleteBook(bookName);
                    }).then(function() {
                        NR.state.bookshelf = NR.state.bookshelf.filter(function(b) { return b.name !== bookName; });
                        NR.saveBookshelf();
                        localStorage.removeItem('novelReaderData_' + bookName);
                        localStorage.removeItem('novelReaderProgress_' + bookName);
                        if (NR.state.currentFileName === bookName) {
                            NR.state.currentFileName = '';
                            NR.state.currentFileContent = '';
                            NR.state.currentBookData = NR.createEmptyBookData ? NR.createEmptyBookData() : {};
                            NR.state.currentPage = 1;
                            NR.state.totalPages = 0;
                            NR.state.chapters = [];
                            NR.state.originalParagraphs = [];
                            NR.state.allRenderedPages = [];
                        }
                        NR.populateFilterDropdown();
                        NR.renderBookshelf();
                    }).catch(function(e) {
                        console.error('删除书籍 ' + bookName + ' 失败:', e);
                        alert('删除书籍失败: ' + (e && e.message ? e.message : e));
                    });
                }
            } else {
                NR.loadBookFromShelf(bookName);
            }
        });

        function handleShelfDownloadGesture(event) {
            var button = event.target && event.target.closest ? event.target.closest('.download-book-btn-on-shelf') : null;
            if (!button) return;
            var book = button.closest('.book-item');
            var name = book && book.dataset.bookName;
            if (!name || typeof NR.downloadOnlineBookFromShelf !== 'function') return;
            event.preventDefault();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
            else event.stopPropagation();
            var now = Date.now();
            if (NR.state.lastShelfDownloadName === name && now - (NR.state.lastShelfDownloadAt || 0) < 700) return;
            NR.state.lastShelfDownloadName = name;
            NR.state.lastShelfDownloadAt = now;
            NR.downloadOnlineBookFromShelf(name);
        }
        // Some Android WebViews suppress click after a touch on a selectable
        // flex row. Handle the end of the touch/pointer gesture as a fallback.
        NR.els['bookshelf-grid'].addEventListener('touchend', handleShelfDownloadGesture, { capture: true, passive: false });
        NR.els['bookshelf-grid'].addEventListener('pointerup', handleShelfDownloadGesture, { capture: true, passive: false });

        NR.els['add-tag-form'].addEventListener('submit', function(event) {
            event.preventDefault();
            var book = NR.state.bookshelf.find(function(b) { return b.name === NR.state.bookNameToEditTags; });
            var newTag = NR.els['new-tag-input'].value.trim();
            if (book && newTag && !(book.tags || []).includes(newTag)) {
                if (!book.tags) book.tags = [];
                book.tags.push(newTag);
                book.tags.sort();
                NR.saveBookshelf();
                NR.renderTagPills();
            }
            NR.els['new-tag-input'].value = '';
        });

        NR.els['current-tags-list'].addEventListener('click', function(event) {
            if (event.target.classList.contains('remove-tag-btn')) {
                var book = NR.state.bookshelf.find(function(b) { return b.name === NR.state.bookNameToEditTags; });
                var tagToRemove = event.target.dataset.tag;
                if (book && (book.tags || []).includes(tagToRemove)) {
                    book.tags = book.tags.filter(function(t) { return t !== tagToRemove; });
                    NR.saveBookshelf();
                    NR.renderTagPills();
                }
            }
        });

        NR.els['btn-close-tag-modal'].addEventListener('click', function() {
            NR.els['tag-edit-modal'].style.display = 'none';
            NR.state.bookNameToEditTags = null;
            NR.populateFilterDropdown();
            NR.renderBookshelf();
        });

        NR.els['dialogue-color-picker'].addEventListener('input', function(e) {
            NR.state.settings.dialogueCustomColor = e.target.value;
            NR.saveSettings();
            NR.applySettings();
        });
        NR.els['btn-reset-dialogue-color'].addEventListener('click', function() {
            NR.state.settings.dialogueCustomColor = null;
            NR.saveSettings();
            NR.applySettings();
        });
        NR.els['text-color-picker'].addEventListener('input', function(e) {
            NR.state.settings.customTextColor = e.target.value;
            NR.saveSettings();
            NR.applySettings();
        });
        NR.els['btn-reset-text-color'].addEventListener('click', function() {
            NR.state.settings.customTextColor = null;
            NR.saveSettings();
            NR.applySettings();
        });
        NR.els['bg-color-picker'].addEventListener('input', function(e) {
            NR.state.settings.customBgColor = e.target.value;
            document.body.classList.remove("custom-background-active");
            NR.saveSettings();
            NR.applySettings();
        });
        NR.els['btn-reset-bg-color'].addEventListener('click', function() {
            NR.state.settings.customBgColor = null;
            if (NR.state.currentBgImageUrl) document.body.classList.add("custom-background-active");
            NR.saveSettings();
            NR.applySettings();
        });

        NR.els['bg-image-input'].addEventListener('change', function(e) {
            var t = e.target.files[0];
            if (!t) return;
            NR.storageDB.saveAsset({ id: "custom-bg-image", data: t }).then(function() {
                NR.applyCustomBgImage(t);
            }).catch(function(err) {
                console.error("Error handling bg image:", err);
                alert("保存或应用背景图时出错。");
            });
        });
        NR.els['btn-clear-bg-image'].addEventListener('click', function() { NR.removeCustomBgImage(); });

        NR.els['btn-immersive-mode'].addEventListener('click', NR.toggleImmersiveMode);

        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (document.querySelector('.modal[style*="display: flex"]')) return;
            
            if (NR.state.isInImmersiveMode) {
                if (e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    NR.immersiveNextParagraph();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    NR.immersivePrevParagraph();
                }
            } else if (NR.state.settings.enableFocusMode) {
                if (e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    NR.focusNextParagraph();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    NR.focusPrevParagraph();
                }
            }
        });
        
        NR.els['btn-save-ai-settings'].addEventListener('click', NR.saveAiSettings);
        if (NR.els['btn-open-custom-prompts']) {
            NR.els['btn-open-custom-prompts'].addEventListener('click', function() {
                NR.els['custom-prompts-modal'].style.display = 'flex';
            });
        }
        if (NR.els['btn-open-reader-persona-settings']) {
            NR.els['btn-open-reader-persona-settings'].addEventListener('click', function() {
                NR.els['reader-persona-settings-modal'].style.display = 'flex';
            });
        }
        if (NR.els['btn-add-reader-persona']) {
            NR.els['btn-add-reader-persona'].addEventListener('click', NR.addReaderPersonaCard);
        }
        if (NR.els['ai-reader-personas']) {
            NR.els['ai-reader-personas'].addEventListener('click', function(e) {
                var removeBtn = e.target.closest('.reader-persona-card-remove');
                if (removeBtn) NR.removeReaderPersonaCard(removeBtn);
            });
        }
        if (NR.els['btn-clear-book-comments']) {
            NR.els['btn-clear-book-comments'].addEventListener('click', NR.clearCurrentBookComments);
        }

        NR.els['font-file-input'].addEventListener('change', function(e) {
            var t = e.target.files[0];
            if (!t) return;
            NR.storageDB.saveAsset({ id: "custom-font", name: t.name, data: t }).then(function() {
                NR.applyCustomFont(t, t.name);
                NR.state.fontSettingsChanged = true;
            }).catch(function(err) {
                console.error("Error handling font file:", err);
                alert("保存或应用字体时出错。");
            });
        });

        NR.els['btn-clear-font'].addEventListener('click', function() {
            NR.storageDB.deleteAsset("custom-font").then(function() {
                NR.removeCustomFont();
                NR.state.fontSettingsChanged = true;
            }).catch(function(err) {
                console.error("Error clearing font:", err);
                alert("清除字体时出错。");
            });
        });

        NR.els['btn-factory-reset'].addEventListener('click', NR.handleFactoryReset);
        NR.els['btn-save-summary'].addEventListener('click', NR.saveCurrentSummary);

        function setupFontControl(slider, valueDisplay, settingKey, unit, isFloat) {
            slider.addEventListener('input', function() {
                var value = isFloat ? parseFloat(slider.value) : parseInt(slider.value, 10);
                NR.state.settings[settingKey] = value;
                valueDisplay.textContent = value.toFixed(isFloat ? 1 : 0) + unit;
                NR.applySettings();
                NR.state.fontSettingsChanged = true;
            });
            slider.addEventListener('change', function() {
                NR.saveSettings();
                if (NR.state.fontSettingsChanged) NR.rePaginateBook();
                NR.state.fontSettingsChanged = false;
            });
        }

        function setupFontReset(button, settingKey, defaultValue) {
            button.addEventListener('click', function() {
                if (NR.state.settings[settingKey] !== defaultValue) {
                    NR.state.settings[settingKey] = defaultValue;
                    NR.saveSettings();
                    NR.applySettings();
                    NR.state.fontSettingsChanged = true;
                    if (NR.state.fontSettingsChanged) NR.rePaginateBook();
                    NR.state.fontSettingsChanged = false;
                }
            });
        }

        function setupTtsSlider(slider, valueDisplay) {
            slider.addEventListener('input', function() {
                valueDisplay.textContent = parseFloat(slider.value).toFixed(slider.step.includes('.0') ? 2 : (slider.step.includes('.') ? 1 : 0));
            });
        }

        setupFontControl(NR.els['font-size-slider'], NR.els['font-size-value'], 'fontSize', 'px', false);
        setupFontControl(NR.els['letter-spacing-slider'], NR.els['letter-spacing-value'], 'letterSpacing', 'px', true);
        setupFontControl(NR.els['line-height-slider'], NR.els['line-height-value'], 'lineHeight', '', true);
        setupFontControl(NR.els['paragraph-spacing-slider'], NR.els['paragraph-spacing-value'], 'paragraphSpacing', 'em', true);
        setupFontReset(NR.els['reset-font-size'], 'fontSize', NR.defaultFontSettings.fontSize);
        setupFontReset(NR.els['reset-letter-spacing'], 'letterSpacing', NR.defaultFontSettings.letterSpacing);
        setupFontReset(NR.els['reset-line-height'], 'lineHeight', NR.defaultFontSettings.lineHeight);
        setupFontReset(NR.els['reset-paragraph-spacing'], 'paragraphSpacing', NR.defaultFontSettings.paragraphSpacing);

        [NR.els['tts-speed-factor-slider'], NR.els['tts-top-k-slider'], NR.els['tts-top-p-slider'], NR.els['tts-temperature-slider']].forEach(function(slider) {
            setupTtsSlider(slider, slider.nextElementSibling);
        });

        NR.els['btn-search'].addEventListener('click', function() {
            NR.els['search-bar'].style.display = NR.els['search-bar'].style.display === 'none' ? 'flex' : 'none';
            if (NR.els['search-bar'].style.display === 'none') {
                NR.clearSearch();
            } else {
                NR.els['search-input'].focus();
            }
        });

        NR.els['btn-close-search'].addEventListener('click', NR.clearSearch);
        NR.els['search-input'].addEventListener('keydown', function(e) {
            if (e.key === 'Enter') NR.executeSearch('all');
        });
        NR.els['btn-search-all'].addEventListener('click', function() { NR.executeSearch('all'); });
        NR.els['btn-search-chapter'].addEventListener('click', function() { NR.executeSearch('chapter'); });
        NR.els['btn-search-next'].addEventListener('click', function() { NR.navigateToSearchResult('next'); });
        NR.els['btn-search-prev'].addEventListener('click', function() { NR.navigateToSearchResult('prev'); });

        NR.els['btn-listen-mode'].addEventListener('click', NR.toggleListenMode);
        NR.els['btn-tts-play-pause'].addEventListener('click', NR.toggleTtsPlayback);
        NR.els['btn-tts-stop'].addEventListener('click', function() {
            if (NR.state.isListenMode) {
                NR.toggleListenMode();
            } else {
                NR.stopTts();
            }
        });

        var getParagraphElementForSequence = function(seq, step) {
            if (seq < 0 || seq >= NR.ttsState.textChunks.length) return null;
            var currentChunk = NR.ttsState.textChunks[NR.ttsState.currentSequence];
            var currentParagraphIndex = currentChunk && currentChunk.paragraph ? currentChunk.paragraph.dataset.originalIndex : null;

            while (seq >= 0 && seq < NR.ttsState.textChunks.length) {
                var chunk = NR.ttsState.textChunks[seq];
                if (chunk && chunk.paragraph && chunk.paragraph.dataset.originalIndex !== undefined) {
                    if (currentParagraphIndex === null || chunk.paragraph.dataset.originalIndex !== currentParagraphIndex) {
                        return document.querySelector('p[data-original-index="' + chunk.paragraph.dataset.originalIndex + '"]');
                    }
                }
                seq += step;
            }
            return null;
        };

        NR.els['btn-tts-next'].addEventListener('click', function() {
            if (NR.ttsState.isActive && NR.ttsState.currentSequence < NR.ttsState.textChunks.length - 1) {
                var nextParaElement = getParagraphElementForSequence(NR.ttsState.currentSequence + 1, 1);
                if (nextParaElement) NR.startTtsFrom(nextParaElement);
            }
        });

        NR.els['btn-tts-prev'].addEventListener('click', function() {
            if (NR.ttsState.isActive && NR.ttsState.currentSequence > 0) {
                var prevParaElement = getParagraphElementForSequence(NR.ttsState.currentSequence - 1, -1);
                if (prevParaElement) NR.startTtsFrom(prevParaElement);
            }
        });
        
        NR.els['tts-provider-selector'].addEventListener('change', function() {
            NR.ttsController.setProviderFromSelector(NR.els['tts-provider-selector'].value, false);
        });
        NR.els['tts-provider-selector-ai'].addEventListener('change', function() {
            NR.ttsController.setProviderFromSelector(NR.els['tts-provider-selector-ai'].value, true);
        });
        NR.els['tts-voice-selector'].addEventListener('change', function() { NR.ttsController.switchAndValidateActiveVoice(); });
        NR.els['tts-dialogue-voice-selector'].addEventListener('change', function() { NR.ttsController.setDialogueVoiceId(NR.els['tts-dialogue-voice-selector'].value); });
        NR.els['btn-refresh-tts-voices'].addEventListener('click', function() { NR.ttsController.refreshVoiceCatalog(true); });
        NR.els['btn-add-tts-voice'].addEventListener('click', function() { NR.ttsController.openEditModal(); });
        NR.els['tts-voice-list'].addEventListener('click', function(e) {
            if (e.target.classList.contains('edit-voice-btn')) {
                NR.ttsController.openEditModal(e.target.dataset.id);
            } else if (e.target.classList.contains('delete-voice-btn')) {
                NR.ttsController.deleteVoice(e.target.dataset.id);
            }
        });
        NR.els['btn-save-tts-voice'].addEventListener('click', function() { NR.ttsController.saveVoiceFromModal(); });

        function checkAiConfigAndShow(modalToShow, onOpen) {
            if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
                alert('AI 功能需要配置后才能使用，请点击【设置】按钮进行配置。');
                return;
            }
            NR.els['ai-menu-modal'].style.display = 'none';
            if (onOpen) onOpen();
            modalToShow.style.display = 'flex';
        }

        // 解析范围字符串中的起始数字用于排序
        function parseRangeStartNumber(rangeStr) {
            if (!rangeStr) return Infinity;
            var match = rangeStr.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : Infinity;
        }

        // 记录勾选顺序
        NR.state.contextCheckOrder = [];

        // 创建上下文列表项
        function createContextListItem(type, range, content, text, index) {
            var li = document.createElement('li');
            li.style.cursor = 'default';
            li.innerHTML = '<label style="display: flex; align-items: start; width:100%;"><span class="context-order-badge" style="display:none; min-width:20px; height:20px; line-height:20px; text-align:center; background:#2196F3; color:#fff; border-radius:50%; font-size:12px; margin-right:8px; flex-shrink:0;"></span><input type="checkbox" data-context-type="' + type + '" data-context-index="' + index + '" value="' + NR.escapeHtml(content) + '" style="margin-top: 5px; margin-right: 8px;"><div><strong>' + NR.escapeHtml(range) + '</strong><div style="font-size:0.9em; white-space:normal; opacity:0.8;">' + NR.escapeHtml(text.substring(0,80)) + '...</div></div></label>';
            return li;
        }

        // 更新所有序号显示
        function updateContextOrderBadges(listElement) {
            var checkboxes = listElement.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(function(cb) {
                var key = cb.dataset.contextType + '_' + cb.dataset.contextIndex;
                var badge = cb.parentElement.querySelector('.context-order-badge');
                if (!badge) return;
                var order = NR.state.contextCheckOrder.indexOf(key);
                if (order !== -1) {
                    badge.textContent = order + 1;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            });
        }

        // 绑定勾选顺序监听
        function bindCheckOrderListener(listElement) {
            listElement.addEventListener('change', function(e) {
                if (e.target.type !== 'checkbox') return;
                var key = e.target.dataset.contextType + '_' + e.target.dataset.contextIndex;
                if (e.target.checked) {
                    if (NR.state.contextCheckOrder.indexOf(key) === -1) {
                        NR.state.contextCheckOrder.push(key);
                    }
                } else {
                    NR.state.contextCheckOrder = NR.state.contextCheckOrder.filter(function(k) { return k !== key; });
                }
                updateContextOrderBadges(listElement);
            });
        }

        NR.els['btn-summary'].addEventListener('click', function() {
            checkAiConfigAndShow(NR.els['summary-choice-modal'], function() {
                NR.els['summary-context-list'].innerHTML = '';
                NR.state.contextCheckOrder = [];
                NR.els['summary-page-range'].value = NR.state.currentPage + '-' + Math.min(NR.state.currentPage + 4, NR.state.totalPages);
                var chapInfo = NR.getChapterInfoForPage(NR.state.currentPage);
                NR.els['summary-chapter-range'].value = chapInfo ? NR.state.chapters.findIndex(function(c) { return c.title === chapInfo.title; }) + 1 : '1';
                setCustomDropdownValue(NR.els['summary-range-type'], 'page');
                NR.els['summary-page-range-selector'].style.display = 'flex';
                NR.els['summary-chapter-range-selector'].style.display = 'none';
                var hasContext = false;

                // 总结按页码/章节排序
                if (NR.state.currentBookData.summaries && NR.state.currentBookData.summaries.length > 0) {
                    hasContext = true;
                    var header = document.createElement('li');
                    header.innerHTML = '<strong>参考已有总结:</strong>';
                    header.style.cursor = 'default';
                    NR.els['summary-context-list'].appendChild(header);
                    
                    var sortedSummaries = NR.state.currentBookData.summaries.slice().sort(function(a, b) {
                        return parseRangeStartNumber(a.range) - parseRangeStartNumber(b.range);
                    });
                    sortedSummaries.forEach(function(s, idx) {
                        var li = createContextListItem('Summary', s.range, s.text, s.text, idx);
                        NR.els['summary-context-list'].appendChild(li);
                    });
                }

                // 续写按创建顺序排序
                if (NR.state.currentBookData.sequels && NR.state.currentBookData.sequels.length > 0) {
                    hasContext = true;
                    var header = document.createElement('li');
                    header.innerHTML = '<strong>参考续写:</strong>';
                    header.style.cursor = 'default';
                    header.style.marginTop = '10px';
                    NR.els['summary-context-list'].appendChild(header);
                    
                    var sortedSequels = NR.state.currentBookData.sequels.slice().sort(function(a, b) {
                        return (a.timestamp || 0) - (b.timestamp || 0);
                    });
                    sortedSequels.forEach(function(s, idx) {
                        var li = createContextListItem('Sequel', s.sourceRange, s.content, s.content, idx);
                        NR.els['summary-context-list'].appendChild(li);
                    });
                }
                if (NR.state.currentBookData.translations && NR.state.currentBookData.translations.length > 0) {
                    hasContext = true;
                    var header = document.createElement('li');
                    header.innerHTML = '<strong>参考译文:</strong>';
                    header.style.cursor = 'default';
                    header.style.marginTop = '10px';
                    NR.els['summary-context-list'].appendChild(header);
                    
                    var sortedTranslations = NR.state.currentBookData.translations.slice().sort(function(a, b) {
                        return parseRangeStartNumber(a.sourceRange) - parseRangeStartNumber(b.sourceRange);
                    });
                    sortedTranslations.forEach(function(t, idx) {
                        var li = createContextListItem('Translation', t.sourceRange, t.content, t.content, idx);
                        NR.els['summary-context-list'].appendChild(li);
                    });
                }
                if (!hasContext) {
                    NR.els['summary-context-list'].innerHTML = '<li style="cursor:default;">无可用上下文 (总结/续写/翻译)。</li>';
                }
                bindCheckOrderListener(NR.els['summary-context-list']);
            });
        });

        initCustomDropdown(NR.els['summary-range-type'], function(type) {
            NR.els['summary-page-range-selector'].style.display = type === 'page' ? 'flex' : 'none';
            NR.els['summary-chapter-range-selector'].style.display = type === 'chapter' ? 'flex' : 'none';
        });

        NR.els['btn-generate-summary'].addEventListener('click', function() {
            var selectedContexts = Array.from(NR.els['summary-context-list'].querySelectorAll('input[type="checkbox"]:checked'));
            var text, rangeDesc, contextPrompt = '';
            var type = NR.els['summary-range-type'].dataset.value;

            if (type === 'none') {
                if (selectedContexts.length === 0) {
                    alert('请选择一个总结范围，或者至少选择一个参考上下文进行总结。');
                    return;
                }
                text = '';
                rangeDesc = '基于上下文总结';
            } else if (type === 'page') {
                var rangeStr = NR.els['summary-page-range'].value;
                if (!rangeStr) return alert('请输入页码范围');
                var parts = rangeStr.trim().split(/[-\s,]+/);
                if (parts.length !== 2) {
                    alert('页码格式不正确。');
                    return;
                }
                var start = parseInt(parts[0], 10);
                var end = parseInt(parts[1], 10);
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.totalPages || start > end) {
                    alert('无效的页码范围。');
                    return;
                }
                text = NR.getTextForPageRange(start, end);
                rangeDesc = '第 ' + start + '-' + end + ' 页';
            } else if (type === 'chapter') {
                var rangeStr = NR.els['summary-chapter-range'].value;
                if (!rangeStr) return alert('请输入章节范围');
                var parts = rangeStr.trim().split(/[-\s,]+/);
                if (parts.length > 2) {
                    alert('章节格式不正确。');
                    return;
                }
                var start = parseInt(parts[0], 10);
                var end = parts.length === 2 ? parseInt(parts[1], 10) : start;
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.chapters.length || start > end) {
                    alert('无效的章节序号。');
                    return;
                }
                var texts = [];
                for (var i = start; i <= end; i++) {
                    texts.push(NR.getTextForChapter(i));
                }
                text = texts.join('\n\n');
                rangeDesc = '第 ' + start + (start === end ? '' : '-' + end) + ' 章';
            }

            if (selectedContexts.length > 0) {
                // 按勾选顺序排序
                var sortedContexts = selectedContexts.slice().sort(function(a, b) {
                    var keyA = a.dataset.contextType + '_' + a.dataset.contextIndex;
                    var keyB = b.dataset.contextType + '_' + b.dataset.contextIndex;
                    var orderA = NR.state.contextCheckOrder.indexOf(keyA);
                    var orderB = NR.state.contextCheckOrder.indexOf(keyB);
                    if (orderA === -1) orderA = Infinity;
                    if (orderB === -1) orderB = Infinity;
                    return orderA - orderB;
                });
                
                var summaries = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Summary'; }).map(function(cb) { return cb.value; });
                var sequels = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Sequel'; }).map(function(cb) { return cb.value; });
                var translations = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Translation'; }).map(function(cb) { return cb.value; });
                var contextParts = [];
                if (summaries.length > 0) contextParts.push('请参考以下已有总结：\n' + summaries.join('\n---\n'));
                if (sequels.length > 0) contextParts.push('请参考以下相关续写内容：\n' + sequels.join('\n---\n'));
                if (translations.length > 0) contextParts.push('请参考以下相关译文：\n' + translations.join('\n---\n'));
                contextPrompt = type === 'none' ?
                    summaries.concat(sequels).concat(translations).join('\n\n---\n\n') 
                    :
                    '在总结前，请先浏览以下参考信息：\n\n' + contextParts.join('\n\n') + '\n\n---\n\n';
            }

            NR.getSummary(text, rangeDesc, contextPrompt);
        });

        NR.els['btn-translate'].addEventListener('click', function() {
            checkAiConfigAndShow(NR.els['translation-choice-modal'], function() {
                NR.els['translation-context-list'].innerHTML = '';
                NR.state.contextCheckOrder = [];
                NR.els['translation-page-range'].value = NR.state.currentPage + '-' + Math.min(NR.state.currentPage + 4, NR.state.totalPages);
                var chapInfo = NR.getChapterInfoForPage(NR.state.currentPage);
                NR.els['translation-chapter-range'].value = chapInfo ? NR.state.chapters.findIndex(function(c) { return c.title === chapInfo.title; }) + 1 : '1';
                setCustomDropdownValue(NR.els['translation-range-type'], 'page');
                NR.els['translation-page-range-selector'].style.display = 'flex';
                NR.els['translation-chapter-range-selector'].style.display = 'none';
                
                // 翻译历史按页码/章节排序
                if (NR.state.currentBookData.translations && NR.state.currentBookData.translations.length > 0) {
                    var sortedTranslations = NR.state.currentBookData.translations.slice().sort(function(a, b) {
                        return parseRangeStartNumber(a.sourceRange) - parseRangeStartNumber(b.sourceRange);
                    });
                    sortedTranslations.forEach(function(t, idx) {
                        var li = createContextListItem('Translation', t.sourceRange, t.content, t.content, idx);
                        NR.els['translation-context-list'].appendChild(li);
                    });
                    bindCheckOrderListener(NR.els['translation-context-list']);
                } else {
                    NR.els['translation-context-list'].innerHTML = '<li style="cursor:default;">无已有翻译可供参考。</li>';
                }
            });
        });

        NR.els['btn-sequel'].addEventListener('click', function() {
            checkAiConfigAndShow(NR.els['sequel-choice-modal'], function() {
                NR.els['sequel-summary-context-list'].innerHTML = '';
                NR.state.contextCheckOrder = [];
                NR.els['sequel-page-range'].value = NR.state.currentPage + '-' + Math.min(NR.state.currentPage + 4, NR.state.totalPages);
                setCustomDropdownValue(NR.els['sequel-range-type'], 'page');
                NR.els['sequel-page-range-selector'].style.display = 'flex';
                NR.els['sequel-chapter-range-selector'].style.display = 'none';
                var hasContext = false;
                
                // 总结按页码/章节排序
                if (NR.state.currentBookData.summaries && NR.state.currentBookData.summaries.length > 0) {
                    hasContext = true;
                    var header = document.createElement('li');
                    header.innerHTML = '<strong>参考总结:</strong>';
                    header.style.cursor = 'default';
                    NR.els['sequel-summary-context-list'].appendChild(header);
                    
                    var sortedSummaries = NR.state.currentBookData.summaries.slice().sort(function(a, b) {
                        return parseRangeStartNumber(a.range) - parseRangeStartNumber(b.range);
                    });
                    sortedSummaries.forEach(function(s, idx) {
                        var li = createContextListItem('Summary', s.range, s.text, s.text, idx);
                        NR.els['sequel-summary-context-list'].appendChild(li);
                    });
                }
                
                // 续写按创建顺序排序
                if (NR.state.currentBookData.sequels && NR.state.currentBookData.sequels.length > 0) {
                    hasContext = true;
                    var header = document.createElement('li');
                    header.innerHTML = '<strong>参考续写:</strong>';
                    header.style.cursor = 'default';
                    header.style.marginTop = '10px';
                    NR.els['sequel-summary-context-list'].appendChild(header);
                    
                    var sortedSequels = NR.state.currentBookData.sequels.slice().sort(function(a, b) {
                        return (a.timestamp || 0) - (b.timestamp || 0);
                    });
                    sortedSequels.forEach(function(s, idx) {
                        var li = createContextListItem('Sequel', s.sourceRange, s.content, s.content, idx);
                        NR.els['sequel-summary-context-list'].appendChild(li);
                    });
                }
                
                if (NR.state.currentBookData.translations && NR.state.currentBookData.translations.length > 0) {
                    hasContext = true;
                    var header = document.createElement('li');
                    header.innerHTML = '<strong>参考译文:</strong>';
                    header.style.cursor = 'default';
                    header.style.marginTop = '10px';
                    NR.els['sequel-summary-context-list'].appendChild(header);
                    
                    var sortedTranslations = NR.state.currentBookData.translations.slice().sort(function(a, b) {
                        return parseRangeStartNumber(a.sourceRange) - parseRangeStartNumber(b.sourceRange);
                    });
                    sortedTranslations.forEach(function(t, idx) {
                        var li = createContextListItem('Translation', t.sourceRange, t.content, t.content, idx);
                        NR.els['sequel-summary-context-list'].appendChild(li);
                    });
                }
                if (!hasContext) {
                    NR.els['sequel-summary-context-list'].innerHTML = '<li style="cursor:default;">无可用上下文 (总结/续写/翻译)。</li>';
                }
                bindCheckOrderListener(NR.els['sequel-summary-context-list']);
            });
        });

        initCustomDropdown(NR.els['translation-range-type'], function(type) {
            NR.els['translation-page-range-selector'].style.display = type === 'page' ? 'flex' : 'none';
            NR.els['translation-chapter-range-selector'].style.display = type === 'chapter' ? 'flex' : 'none';
        });

        NR.els['btn-generate-translation'].addEventListener('click', function() {
            var type = NR.els['translation-range-type'].dataset.value;
            var text, rangeDesc;

            if (type === 'page') {
                var rangeStr = NR.els['translation-page-range'].value;
                if (!rangeStr) return alert('请输入页码范围');
                var parts = rangeStr.trim().split(/[-\s,]+/);
                if (parts.length !== 2) {
                    alert('页码格式不正确。');
                    return;
                }
                var start = parseInt(parts[0], 10);
                var end = parseInt(parts[1], 10);
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.totalPages || start > end) {
                    alert('无效的页码范围。');
                    return;
                }
                text = NR.getTextForPageRange(start, end);
                rangeDesc = '第 ' + start + '-' + end + ' 页';
            } else {
                var rangeStr = NR.els['translation-chapter-range'].value;
                if (!rangeStr) return alert('请输入章节范围');
                var parts = rangeStr.trim().split(/[-\s,]+/);
                if (parts.length > 2) {
                    alert('章节格式不正确。');
                    return;
                }
                var start = parseInt(parts[0], 10);
                var end = parts.length === 2 ? parseInt(parts[1], 10) : start;
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.chapters.length || start > end) {
                    alert('无效的章节序号。');
                    return;
                }
                var texts = [];
                for (var i = start; i <= end; i++) {
                    texts.push(NR.getTextForChapter(i));
                }
                text = texts.join('\n\n');
                rangeDesc = '第 ' + start + (start === end ? '' : '-' + end) + ' 章';
            }
            
            // 收集参考翻译上下文
            var selectedContexts = Array.from(NR.els['translation-context-list'].querySelectorAll('input[type="checkbox"]:checked'));
            var contextPrompt = '';
            if (selectedContexts.length > 0) {
                var sortedContexts = selectedContexts.slice().sort(function(a, b) {
                    var keyA = a.dataset.contextType + '_' + a.dataset.contextIndex;
                    var keyB = b.dataset.contextType + '_' + b.dataset.contextIndex;
                    var orderA = NR.state.contextCheckOrder.indexOf(keyA);
                    var orderB = NR.state.contextCheckOrder.indexOf(keyB);
                    if (orderA === -1) orderA = Infinity;
                    if (orderB === -1) orderB = Infinity;
                    return orderA - orderB;
                });
                var translations = sortedContexts.map(function(cb) { return cb.value; });
                contextPrompt = '请参考以下已有翻译的风格和术语：\n' + translations.join('\n---\n') + '\n\n---\n\n';
            }
            
            NR.getTranslation(text, rangeDesc, contextPrompt);
        });

        initCustomDropdown(NR.els['sequel-range-type'], function(type) {
            NR.els['sequel-page-range-selector'].style.display = type === 'page' ? 'flex' : 'none';
            NR.els['sequel-chapter-range-selector'].style.display = type === 'chapter' ? 'flex' : 'none';
        });
        NR.els['btn-generate-sequel'].addEventListener('click', function() {
            var type = NR.els['sequel-range-type'].dataset.value;
            var text, rangeDesc;
            if (type === 'none') {
                text = '';
                rangeDesc = '自由创作';
            } else if (type === 'page') {
                var rangeStr = NR.els['sequel-page-range'].value;
                if (!rangeStr) return alert('请输入页码范围');
                var parts = rangeStr.trim().split(/[-\s,]+/);
                if (parts.length !== 2) {
                    alert('页码格式不正确。');
                    return;
                }
                var start = parseInt(parts[0], 10);
                var end = parseInt(parts[1], 10);
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.totalPages || start > end) {
                    alert('无效的页码范围。');
                    return;
                }
                text = NR.getTextForPageRange(start, end);
                rangeDesc = '第 ' + start + '-' + end + ' 页';
            } else {
                var rangeStr = NR.els['sequel-chapter-range'].value;
                if (!rangeStr) return alert('请输入章节范围');
                var parts = rangeStr.trim().split(/[-\s,]+/);
                if (parts.length > 2) {
                    alert('章节格式不正确。');
                    return;
                }
                var start = parseInt(parts[0], 10);
                var end = parts.length === 2 ? parseInt(parts[1], 10) : start;
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.chapters.length || start > end) {
                    alert('无效的章节序号。');
                    return;
                }
                var texts = [];
                for (var i = start; i <= end; i++) {
                    texts.push(NR.getTextForChapter(i));
                }
                text = texts.join('\n\n');
                rangeDesc = '第 ' + start + (start === end ? '' : '-' + end) + ' 章';
            }
            NR.getSequel(text, rangeDesc);
        });

        NR.els['btn-summary-history'].addEventListener('click', function() {
            NR.els['ai-menu-modal'].style.display = 'none';
            NR.renderHistoryList(NR.els['summary-history-list'], NR.state.currentBookData.summaries, 'summary');
            NR.els['summary-history-modal'].style.display = 'flex';
        });
        NR.els['btn-sequel-history'].addEventListener('click', function() {
            NR.els['ai-menu-modal'].style.display = 'none';
            NR.renderHistoryList(NR.els['sequel-history-list'], NR.state.currentBookData.sequels, 'sequel');
            NR.els['sequel-history-modal'].style.display = 'flex';
        });
        NR.els['btn-translation-history'].addEventListener('click', function() {
            NR.els['ai-menu-modal'].style.display = 'none';
            NR.renderHistoryList(NR.els['translation-history-list'], NR.state.currentBookData.translations, 'translation');
            NR.els['translation-history-modal'].style.display = 'flex';
        });
        
        // --- History View & Delete Handlers ---
        var historyListViewOrDeleteHandler = function(e, type, listElement, modalElement) {
            if (!e.target.dataset.timestamp) return;

            var ts = parseInt(e.target.dataset.timestamp, 10);
            if (e.target.classList.contains('delete-btn')) {
                NR.state.currentBookData[type + 's'] = NR.state.currentBookData[type + 's'].filter(function(s) { return s.timestamp !== ts; });
                NR.saveBookData();
                NR.renderHistoryList(listElement, NR.state.currentBookData[type + 's'], type);
            } else if (e.target.classList.contains('view-btn')) {
                var item = NR.state.currentBookData[type + 's'].find(function(s) { return s.timestamp === ts; });
                if (item) {
                    NR.state.originalContentForSubView = {
                        name: NR.state.currentFileName,
                        content: NR.state.currentFileContent
                    };
                    NR.state.activeSubView = type;
                    modalElement.style.display = 'none';
                    var prefix = { sequel: '【续】', translation: '【译】' }[type] || '【阅】';
                    NR.loadBook(prefix + NR.state.originalContentForSubView.name, item.content);
                }
            }
        };
        NR.els['summary-history-list'].addEventListener('click', function(e) {
            if (!e.target.dataset.timestamp) return;
            var ts = parseInt(e.target.dataset.timestamp, 10);
            if (e.target.classList.contains('delete-btn')) {
                NR.state.currentBookData.summaries = NR.state.currentBookData.summaries.filter(function(s) { return s.timestamp !== ts; });
                NR.saveBookData();
                NR.renderHistoryList(NR.els['summary-history-list'], NR.state.currentBookData.summaries, 'summary');
            } else if (e.target.classList.contains('view-btn')) {
                var item = NR.state.currentBookData.summaries.find(function(s) { return s.timestamp === ts; });
                if (item) {
                    NR.els['summary-history-modal'].style.display = 'none';
                    NR.els['summary-display-modal'].style.display = 'flex';
                    NR.els['summary-content'].textContent = item.text;
                    NR.els['btn-save-summary'].style.display = 'none';
                }
            }
        });
        NR.els['sequel-history-list'].addEventListener('click', function(e) { historyListViewOrDeleteHandler(e, 'sequel', NR.els['sequel-history-list'], NR.els['sequel-history-modal']); });
        NR.els['translation-history-list'].addEventListener('click', function(e) { historyListViewOrDeleteHandler(e, 'translation', NR.els['translation-history-list'], NR.els['translation-history-modal']); });

        NR.els['btn-character-profiling'].addEventListener('click', function() {
            checkAiConfigAndShow(NR.els['character-form-choice-modal'], function() {
                NR.initCharacterFormData();
                NR.els['character-page-range'].value = NR.state.currentPage + '-' + Math.min(NR.state.currentPage + 2, NR.state.totalPages);
                var chapInfo = NR.getChapterInfoForPage(NR.state.currentPage);
                var currentChapter = chapInfo ? NR.state.chapters.findIndex(function(c) { return c.title === chapInfo.title; }) + 1 : 1;
                NR.els['character-chapter-range'].value = currentChapter;
                setCustomDropdownValue(NR.els['character-range-type'], 'chapter');
                NR.els['character-page-range-selector'].style.display = 'none';
                NR.els['character-chapter-range-selector'].style.display = 'flex';
                NR.els['character-sequel-range-selector'].style.display = 'none';
                // 初始化内嵌的数据浏览器
                NR.initEmbeddedDataBrowser();
            });
        });

        // 一键生成人物表单（主角+重要人物）或AI功能
        NR.els['btn-generate-all-characters'].addEventListener('click', function() {
            var currentTab = NR.state.currentDataBrowserTab;
            
            // 如果是AI功能标签页，触发对应标签页内的生成按钮
            if (currentTab === 'summary') {
                var tabBtn = document.getElementById('btn-tab-generate-summary');
                if (tabBtn) tabBtn.click();
                return;
            } else if (currentTab === 'sequel') {
                var tabBtn = document.getElementById('btn-tab-generate-sequel');
                if (tabBtn) tabBtn.click();
                return;
            } else if (currentTab === 'translation') {
                var tabBtn = document.getElementById('btn-tab-generate-translation');
                if (tabBtn) tabBtn.click();
                return;
            } else if (currentTab === 'sceneImage') {
                var tabBtn = document.getElementById('btn-tab-generate-scene-image');
                if (tabBtn) tabBtn.click();
                return;
            } else if (currentTab === 'timeline') {
                var tabBtn = document.getElementById('btn-tab-generate-timeline');
                if (tabBtn) tabBtn.click();
                return;
            }
            
            // 默认行为：AI填表
            var type = NR.els['character-range-type'].dataset.value;
            var text, rangeDesc;
            if (type === 'page') {
                var rangeStr = NR.els['character-page-range'].value.trim();
                if (!rangeStr) return alert('请输入页码范围');
                var parts = rangeStr.split(/[-\s,]+/);
                if (parts.length !== 2) return alert('页码格式不正确。');
                var start = parseInt(parts[0], 10);
                var end = parseInt(parts[1], 10);
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.totalPages || start > end) return alert('无效的页码范围。');
                text = NR.getTextForPageRange(start, end);
                rangeDesc = '第 ' + start + '-' + end + ' 页';
            } else if (type === 'sequel') {
                var selectEl = NR.els['character-sequel-select'];
                var selectedIdx = selectEl ? selectEl.value : '';
                if (selectedIdx === '') return alert('请选择一条续写历史');
                var sequels = NR.state.currentBookData.sequels || [];
                var sortedSequels = sequels.slice().sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
                var sequel = sortedSequels[parseInt(selectedIdx, 10)];
                if (!sequel) return alert('未找到该续写记录');
                text = sequel.content || '';
                rangeDesc = '续写: ' + (sequel.sourceRange || '未知范围');
            } else {
                var rangeStr = NR.els['character-chapter-range'].value.trim();
                if (!rangeStr) return alert('请输入章节范围');
                var parts = rangeStr.split(/[-\s,]+/);
                if (parts.length > 2) return alert('章节格式不正确。');
                var start = parseInt(parts[0], 10);
                var end = parts.length === 2 ? parseInt(parts[1], 10) : start;
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.chapters.length || start > end) return alert('无效的章节序号。');
                var texts = [];
                for (var i = start; i <= end; i++) { texts.push(NR.getTextForChapter(i)); }
                text = texts.join('\n\n');
                rangeDesc = '第 ' + start + (start === end ? '' : '-' + end) + ' 章';
            }
            NR.generateAllCharacterForms(text, rangeDesc);
        });

        // 清空所有AI数据库数据按钮
        NR.els['btn-clear-all-data'].addEventListener('click', function() {
            NR.clearAllCharacterFormData();
            // 刷新内嵌的数据浏览器
            NR.renderEmbeddedDataBrowserTab(NR.state.currentDataBrowserTab || 'global');
        });

        initCustomDropdown(NR.els['character-range-type'], function(type) {
            NR.els['character-page-range-selector'].style.display = type === 'page' ? 'flex' : 'none';
            NR.els['character-chapter-range-selector'].style.display = type === 'chapter' ? 'flex' : 'none';
            NR.els['character-sequel-range-selector'].style.display = type === 'sequel' ? 'flex' : 'none';
            if (type === 'sequel') {
                NR.populateSequelSelect();
            }
        });

        // 场景生图事件绑定
        NR.els['btn-scene-image'].addEventListener('click', function() {
            checkAiConfigAndShow(NR.els['scene-image-choice-modal'], function() {
                NR.els['scene-image-page-range'].value = NR.state.currentPage + '-' + Math.min(NR.state.currentPage + 1, NR.state.totalPages);
                var chapInfo = NR.getChapterInfoForPage(NR.state.currentPage);
                NR.els['scene-image-chapter-range'].value = chapInfo ? NR.state.chapters.findIndex(function(c) { return c.title === chapInfo.title; }) + 1 : '1';
                setCustomDropdownValue(NR.els['scene-image-range-type'], 'page');
                setCustomDropdownValue(NR.els['scene-image-size'], 'landscape_4_3');
                NR.els['scene-image-page-range-selector'].style.display = 'flex';
                NR.els['scene-image-chapter-range-selector'].style.display = 'none';
            });
        });

        initCustomDropdown(NR.els['scene-image-range-type'], function(type) {
            NR.els['scene-image-page-range-selector'].style.display = type === 'page' ? 'flex' : 'none';
            NR.els['scene-image-chapter-range-selector'].style.display = type === 'chapter' ? 'flex' : 'none';
        });

        initCustomDropdown(NR.els['scene-image-size'], function() {});

        NR.els['btn-generate-scene-image'].addEventListener('click', function() {
            var type = NR.els['scene-image-range-type'].dataset.value;
            var imageSize = NR.els['scene-image-size'].dataset.value;
            var text, rangeDesc;

            if (type === 'page') {
                var rangeStr = NR.els['scene-image-page-range'].value.trim();
                if (!rangeStr) return alert('请输入页码范围');
                var parts = rangeStr.split(/[-\s,]+/);
                if (parts.length !== 2) return alert('页码格式不正确。');
                var start = parseInt(parts[0], 10);
                var end = parseInt(parts[1], 10);
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.totalPages || start > end) return alert('无效的页码范围。');
                text = NR.getTextForPageRange(start, end);
                rangeDesc = '第 ' + start + '-' + end + ' 页';
            } else {
                var rangeStr = NR.els['scene-image-chapter-range'].value.trim();
                if (!rangeStr) return alert('请输入章节范围');
                var parts = rangeStr.split(/[-\s,]+/);
                if (parts.length > 2) return alert('章节格式不正确。');
                var start = parseInt(parts[0], 10);
                var end = parts.length === 2 ? parseInt(parts[1], 10) : start;
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.chapters.length || start > end) return alert('无效的章节序号。');
                var texts = [];
                for (var i = start; i <= end; i++) {
                    texts.push(NR.getTextForChapter(i));
                }
                text = texts.join('\n\n');
                rangeDesc = '第 ' + start + (start === end ? '' : '-' + end) + ' 章';
            }

            NR.generateSceneImagePrompt(text, rangeDesc).then(function(promptData) {
                NR.showSceneImagePromptModal(promptData, imageSize);
            }).catch(function(err) {
                if (err !== '无内容' && err !== '未配置ComfyUI') {
                    console.error('生成场景提示词失败:', err);
                    alert('生成失败: ' + (err.message || err));
                }
                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
            });
        });

        NR.els['btn-scene-image-history'].addEventListener('click', function() {
            NR.els['ai-menu-modal'].style.display = 'none';
            NR.renderSceneImageHistory();
            NR.els['scene-image-history-modal'].style.display = 'flex';
        });

        NR.els['btn-character-history'].addEventListener('click', function() {
            NR.els['ai-menu-modal'].style.display = 'none';
            NR.renderCharacterHistory();
            NR.els['character-history-modal'].style.display = 'flex';
        });

        NR.els['character-history-list'].addEventListener('click', function(e) {
            var deleteBtn = e.target.closest('.character-card-delete');
            var starBtn = e.target.closest('.character-card-star');

            if (deleteBtn) {
                e.stopPropagation(); 
                var name = deleteBtn.dataset.characterName;
                if (confirm('确定要删除人物 "' + name + '" 的所有信息吗？')) {
                    NR.state.currentBookData.characterProfiles = NR.state.currentBookData.characterProfiles.filter(function(p) { return p.name !== name; });
                    NR.saveBookData();
                    NR.renderCharacterHistory();
                }
            } else if (starBtn) {
                e.stopPropagation();
                var name = starBtn.dataset.characterName;
                if (name) {
                    NR.toggleCharacterImportance(name);
                }
            } else {
                var card = e.target.closest('.character-card');
                if (card) {
                    var characterName = card.dataset.characterName;
                    if (characterName) {
                        // 合并模式下点击卡片切换选中状态
                        if (NR.state.characterMergeMode) {
                            NR.toggleCharacterSelection(characterName);
                        } else {
                            NR.showCharacterDetail(characterName);
                        }
                    }
                }
            }
        });

        NR.els['page-info'].addEventListener('click', function() {
            if (!NR.state.totalPages || NR.state.totalPages <= 0) return;
            var targetPageStr = prompt('请输入要跳转的页码 (1 - ' + NR.state.totalPages + '):', NR.state.currentPage);
            if (!targetPageStr) return;
            var targetPage = parseInt(targetPageStr, 10);
            if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= NR.state.totalPages) NR.jumpToPage(targetPage);
            else alert('输入无效。');
        });
        
        // Core interaction listeners
        NR.els['content-wrapper'].addEventListener('click', function(event) {
            if (NR.state.ignoreNextClick) {
                NR.state.ignoreNextClick = false;
                return;
            }
            if (NR.state.isTransitioning || window.getSelection().toString().length > 0) return;

            if (NR.state.isInImmersiveMode) {
                var clickedP = event.target.closest('p:not(.blank-line)');
                if (clickedP) {
                    NR.setImmersiveHighlight(clickedP);
                } else {
                    NR.immersiveNextParagraph();
                }
                return;
            }

            if (NR.state.settings.enableFocusMode) {
                var clickedP = event.target.closest('p:not(.blank-line)');
                if (clickedP) {
                    NR.setFocusHighlight(clickedP);
                } else {
                    NR.focusNextParagraph();
                }
                return; 
            }
            
            if (NR.state.isListenMode) {
                var clickedP = event.target.closest('p:not(.blank-line)');
                if (clickedP) NR.startTtsFrom(clickedP);
                return;
            }
            var rect = event.currentTarget.getBoundingClientRect();
            var clickX = event.clientX;
            var leftBoundary = rect.left + rect.width / 3;
            var rightBoundary = rect.right - rect.width / 3;
            if (NR.state.settings.enableClickPage && clickX < leftBoundary) {
                NR.jumpToPage(NR.state.currentPage - 1);
            } else if (NR.state.settings.enableClickPage && clickX > rightBoundary) {
                NR.jumpToPage(NR.state.currentPage + 1);
            }
        });
        
        function startImmersiveLongPress(event) {
            if (!NR.state.isInImmersiveMode) return;
            var clickedP = event.target.closest('p:not(.blank-line)');
            if (clickedP) return;
            
            if (NR.state.immersiveLongPressTimer) {
                clearTimeout(NR.state.immersiveLongPressTimer);
            }
            
            NR.state.immersiveLongPressTimer = setTimeout(function() {
                NR.toggleImmersiveMode();
                NR.state.immersiveLongPressTimer = null;
            }, 3000);
        }
        
        function cancelImmersiveLongPress() {
            if (NR.state.immersiveLongPressTimer) {
                clearTimeout(NR.state.immersiveLongPressTimer);
                NR.state.immersiveLongPressTimer = null;
            }
        }
        
        NR.els['content-wrapper'].addEventListener('mousedown', function(e) {
            startImmersiveLongPress(e);
            dragStart(e);
        });
        NR.els['content-wrapper'].addEventListener('touchstart', function(e) {
            startImmersiveLongPress(e);
            dragStart(e);
        }, { passive: true });
        
        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function(evt) {
            NR.els['content-wrapper'].addEventListener(evt, cancelImmersiveLongPress);
        });
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('touchmove', dragMove, { passive: true });
        ['mouseup', 'mouseleave', 'touchend'].forEach(function(evt) { document.addEventListener(evt, dragEnd); });
        NR.els['bookshelf-grid'].addEventListener('mousedown', function(event) {
            if (event.target && event.target.closest && event.target.closest('.book-actions')) {
                event.stopPropagation();
                return;
            }
            shelfDragStart(event);
        });
        NR.els['bookshelf-grid'].addEventListener('touchstart', function(event) {
            if (event.target && event.target.closest && event.target.closest('.book-actions')) {
                event.stopPropagation();
                return;
            }
            shelfDragStart(event);
        }, { passive: false });
        document.addEventListener('mousemove', shelfDragMove, { passive: false });
        ['mouseup', 'mouseleave', 'touchend'].forEach(function(evt) { document.addEventListener(evt, shelfDragEnd); });

        NR.setupModal(NR.els['settings-modal'], NR.els['btn-settings'], function() {
            // 打开设置时加载导出目录
            NR.els['export-dir-input'].value = NR.getExportDir();
        });

        // 保存导出目录
        NR.els['btn-save-export-dir'].addEventListener('click', function() {
            var dir = NR.saveExportDir(NR.els['export-dir-input'].value);
            NR.els['export-dir-input'].value = dir;
            alert('导出目录已保存:\n/storage/emulated/0/' + dir);
        });

        // 番茄小说搜索下载事件绑定
        NR.setupModal(NR.els['fanqie-search-modal'], NR.els['btn-fanqie-search'], function() {
            // 打开模态框时初始化备用API复选框状态
            if (NR.els['fanqie-backup-api']) {
                NR.els['fanqie-backup-api'].checked = NR.fanqieIsBackupApi();
            }
        });
        
        // 备用API切换事件
        if (NR.els['fanqie-backup-api']) {
            NR.els['fanqie-backup-api'].addEventListener('change', function(e) {
                NR.fanqieToggleBackupApi(e.target.checked);
            });
        }
        
        NR.els['fanqie-search-form'].addEventListener('submit', function(e) {
            e.preventDefault();
            var keyword = NR.els['fanqie-search-input'].value.trim();
            if (!keyword) {
                alert('请输入搜索关键词');
                return;
            }
            NR.els['fanqie-search-results'].innerHTML = '<p style="text-align:center;">搜索中...</p>';
            NR.fanqieSearch(keyword).then(function(results) {
                if (results.length === 0) {
                    NR.els['fanqie-search-results'].innerHTML = '<p style="text-align:center;">未找到相关小说</p>';
                    return;
                }
                var html = '';
                results.forEach(function(book) {
                    html += '<div class="fanqie-book-item" style="display:flex; gap:10px; padding:10px; border-bottom:1px solid var(--border-color); cursor:pointer;" data-book-id="' + book.id + '">';
                    html += '<div style="width:60px; height:80px; flex-shrink:0; background:#ddd; border-radius:4px; overflow:hidden;">';
                    if (book.cover) {
                        html += '<img src="' + NR.escapeHtml(book.cover) + '" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display=\'none\'">';
                    }
                    html += '</div>';
                    html += '<div style="flex:1; overflow:hidden;">';
                    html += '<div style="font-weight:bold; margin-bottom:4px;">' + NR.escapeHtml(book.name) + '</div>';
                    html += '<div style="font-size:12px; opacity:0.7;">作者: ' + NR.escapeHtml(book.author) + '</div>';
                    html += '<div style="font-size:12px; opacity:0.7;">' + NR.escapeHtml(book.status) + ' · ' + (book.chapterCount || '?') + '章</div>';
                    html += '<div style="font-size:12px; opacity:0.6; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + NR.escapeHtml(book.description || '').substring(0, 50) + '</div>';
                    html += '</div></div>';
                });
                NR.els['fanqie-search-results'].innerHTML = html;
            }).catch(function(err) {
                NR.els['fanqie-search-results'].innerHTML = '<p style="text-align:center; color:red;">搜索失败: ' + NR.escapeHtml(err.message) + '</p>';
            });
        });

        NR.els['fanqie-search-results'].addEventListener('click', function(e) {
            var bookItem = e.target.closest('.fanqie-book-item');
            if (!bookItem) return;
            var bookId = bookItem.dataset.bookId;
            var bookName = bookItem.querySelector('div[style*="font-weight:bold"]').textContent;
            
            // 关闭搜索模态框，打开下载模态框
            NR.els['fanqie-search-modal'].style.display = 'none';
            NR.els['fanqie-download-modal'].style.display = 'flex';
            NR.els['fanqie-download-book-name'].textContent = bookName;
            NR.els['fanqie-download-progress-bar'].style.width = '0%';
            NR.els['fanqie-download-status'].textContent = '准备中...';

            NR.fanqieDownloadAndImport(bookId, function(percent, message) {
                NR.els['fanqie-download-progress-bar'].style.width = percent + '%';
                NR.els['fanqie-download-status'].textContent = message;
            }).then(function(result) {
                NR.els['fanqie-download-modal'].style.display = 'none';
                alert('下载完成！\n\n《' + result.bookInfo.name + '》已添加到书架\n共 ' + result.chapterCount + ' 章');
                NR.renderBookshelf();
            }).catch(function(err) {
                NR.els['fanqie-download-modal'].style.display = 'none';
                if (err.message !== '下载已取消') {
                    alert('下载失败: ' + err.message);
                }
            });
        });

        NR.els['btn-fanqie-cancel'].addEventListener('click', function() {
            NR.fanqieCancelDownload();
            NR.els['fanqie-download-modal'].style.display = 'none';
        });

        // 导出书籍功能
        NR.setupModal(NR.els['export-book-modal'], NR.els['btn-export-book'], function() {
            // 打开时渲染书籍列表
            NR.renderExportBookList();
        });

        NR.els['export-book-list'].addEventListener('change', function(e) {
            if (e.target.type === 'checkbox') {
                var checkedCount = NR.els['export-book-list'].querySelectorAll('input[type="checkbox"]:checked').length;
                NR.els['btn-export-selected'].disabled = checkedCount === 0;
                NR.els['btn-export-selected'].textContent = checkedCount > 0 ? '导出选中 (' + checkedCount + ')' : '导出选中';
            }
        });

        NR.els['btn-export-selected'].addEventListener('click', function() {
            var checkboxes = NR.els['export-book-list'].querySelectorAll('input[type="checkbox"]:checked');
            var bookNames = [];
            checkboxes.forEach(function(cb) {
                bookNames.push(cb.value);
            });
            if (bookNames.length === 0) {
                alert('请选择要导出的书籍');
                return;
            }
            NR.exportBooks(bookNames);
        });

        NR.setupModal(NR.els['font-settings-modal'], NR.els['btn-font-settings'], function() {
            NR.state.fontSettingsChanged = false;
        }, function() {
            if (NR.state.fontSettingsChanged) {
                NR.state.fontSettingsChanged = false;
            }
        });
        NR.setupModal(NR.els['catalog-modal'], NR.els['btn-catalog']);
        NR.setupModal(NR.els['ai-settings-modal'], NR.els['btn-ai-settings']);
        NR.setupModal(NR.els['custom-prompts-modal']);
        NR.setupModal(NR.els['reader-persona-settings-modal']);
        NR.setupModal(NR.els['tts-voice-edit-modal'], null, null, function() {
            NR.els['tts-voice-edit-modal'].dataset.id = '';
        });
        NR.setupModal(NR.els['ai-menu-modal']);
        // btn-ai-menu 现在打开 AI数据库弹窗
        NR.els['btn-ai-menu'].addEventListener('click', function() {
            if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
                alert('AI 功能需要配置后才能使用，请点击【设置】按钮进行配置。');
                return;
            }
            NR.initCharacterFormData();
            NR.els['character-page-range'].value = NR.state.currentPage + '-' + Math.min(NR.state.currentPage + 2, NR.state.totalPages);
            var chapInfo = NR.getChapterInfoForPage(NR.state.currentPage);
            var currentChapter = chapInfo ? NR.state.chapters.findIndex(function(c) { return c.title === chapInfo.title; }) + 1 : 1;
            NR.els['character-chapter-range'].value = currentChapter;
            setCustomDropdownValue(NR.els['character-range-type'], 'chapter');
            NR.els['character-page-range-selector'].style.display = 'none';
            NR.els['character-chapter-range-selector'].style.display = 'flex';
            NR.els['character-sequel-range-selector'].style.display = 'none';
            NR.initEmbeddedDataBrowser();
            NR.els['character-form-choice-modal'].style.display = 'flex';
        });
        NR.setupModal(NR.els['summary-choice-modal']);
        NR.setupModal(NR.els['summary-display-modal']);
        NR.setupModal(NR.els['translation-choice-modal']);
        NR.setupModal(NR.els['summary-history-modal']);
        NR.setupModal(NR.els['sequel-history-modal']);
        NR.setupModal(NR.els['translation-history-modal']);
        NR.setupModal(NR.els['sequel-choice-modal']);
        NR.setupModal(NR.els['tag-edit-modal'], null, null, function() {
            NR.els['tag-edit-modal'].style.display = 'none';
            NR.state.bookNameToEditTags = null;
            NR.populateFilterDropdown();
            NR.renderBookshelf();
        });
        NR.setupModal(NR.els['character-history-modal']);
        NR.setupModal(NR.els['character-form-choice-modal']);
        NR.setupModal(NR.els['scene-image-choice-modal']);
        NR.setupModal(NR.els['scene-image-history-modal']);

        // 生图服务选择器事件
        NR.els['image-provider-selector'].addEventListener('change', function() {
            NR.updateImageProviderUI();
        });

        var resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (NR.state.currentFileName && NR.els.readerView.style.display !== 'none') {
                    if (NR.els['content-wrapper'].clientWidth === NR.state.viewportWidth) {
                        return;
                    }
                    NR.clearSearch();
                    if (NR.state.isDragging) dragEnd();
                    NR.rePaginateBook();
                }
            }, 250);
        });
    };
})();
