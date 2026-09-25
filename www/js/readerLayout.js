// 连续滚动阅读布局及阅读页工具栏
(function() {
    var NR = window.NovelReader;
    var reader = document.querySelector('.reader-container');
    if (!reader) return;
    reader.classList.add('reader-scroll-layout');

    var originalUpdateDOMPages = NR.updateDOMPages;
    var originalJumpToPage = NR.jumpToPage;
    // The saved preference is loaded after this file. Start unknown so the
    // first applySettings() call synchronizes the class and renderer even when
    // the user previously saved paginated mode.
    var scrollModeActive = null;

    var contentWrapper = document.getElementById('content-wrapper');
    var currentPageContainer = document.getElementById('current-page-container');
    var inner = document.getElementById('content-inner');
    var progressValue = document.getElementById('reader-progress-value');
    var chapterInfo = document.getElementById('chapter-info');
    var pageInfo = document.getElementById('page-info');
    var bookmarkButton = document.getElementById('reader-bookmark-button');
    var bookmarkList = document.getElementById('reader-bookmark-list');
    var tocSearch = document.getElementById('reader-toc-search');
    var moreToggle = document.getElementById('reader-more-toggle');
    var moreMenu = document.getElementById('reader-more-menu');
    var searchBar = document.getElementById('search-bar');
    var modeLoading = document.getElementById('reader-mode-loading');
    var bookmarkStorageKey = 'niuniuReaderBookmarks';
    var scrollFrame = 0;
    var lastScrollTop = contentWrapper.scrollTop;
    var bottomChromePinned = false;
    var modeTransitionId = 0;

    function setModeLoading(visible) {
        if (!modeLoading) return;
        modeLoading.classList.toggle('is-active', visible);
        modeLoading.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function hideModeLoadingAfterPaint(transitionId, startedAt) {
        var minimumDuration = 650;
        var delay = Math.max(0, minimumDuration - (Date.now() - startedAt));
        setTimeout(function() {
            requestAnimationFrame(function() {
                if (transitionId === modeTransitionId) setModeLoading(false);
            });
        }, delay);
    }

    function getPageElements() {
        return Array.prototype.slice.call(currentPageContainer.querySelectorAll('.page[data-reader-page]'));
    }

    function getPageForParagraph(paragraphIndex) {
        var pages = NR.state.allRenderedPages || [];
        var target = Number(paragraphIndex);
        var low = 0;
        var high = pages.length - 1;
        while (low <= high) {
            var middle = Math.floor((low + high) / 2);
            var paragraphs = pages[middle].querySelectorAll('p[data-original-index]');
            if (!paragraphs.length) {
                low = middle + 1;
                continue;
            }
            var firstIndex = Number(paragraphs[0].dataset.originalIndex);
            var lastIndex = Number(paragraphs[paragraphs.length - 1].dataset.originalIndex);
            if (target < firstIndex) {
                high = middle - 1;
            } else if (target > lastIndex) {
                low = middle + 1;
            } else {
                for (var i = 0; i < paragraphs.length; i++) {
                    if (Number(paragraphs[i].dataset.originalIndex) === target) return middle + 1;
                }
                return -1;
            }
        }
        return -1;
    }

    function getChapterPageRange(chapterIndex) {
        var pages = NR.state.allRenderedPages || [];
        var chapters = NR.state.chapters || [];
        if (!pages.length || !chapters.length) return { startPage: 1, endPage: pages.length };

        var nextChapter = chapterIndex >= 0 ? chapters[chapterIndex + 1] : chapters[0];
        var startPage = chapterIndex >= 0
            ? getPageForParagraph(chapters[chapterIndex].p_index)
            : 1;
        var endPage = nextChapter
            ? getPageForParagraph(nextChapter.p_index) - 1
            : pages.length;

        if (startPage < 1) return { startPage: 1, endPage: pages.length };
        return { startPage: startPage, endPage: Math.max(startPage, endPage) };
    }

    function getCurrentChapterIndex() {
        var page = NR.state.allRenderedPages && NR.state.allRenderedPages[NR.state.currentPage - 1];
        var paragraph = page && page.querySelector('p[data-original-index]');
        if (!paragraph) return -1;
        var paragraphIndex = Number(paragraph.dataset.originalIndex);
        var chapterIndex = -1;
        (NR.state.chapters || []).forEach(function(chapter, index) {
            if (Number(chapter.p_index) <= paragraphIndex) chapterIndex = index;
        });
        return chapterIndex;
    }

    function getProgressPercent() {
        var current = Number(NR.state.currentPage) || 1;
        var total = Number(NR.state.totalPages) || 1;
        return Math.max(0, Math.min(100, Math.round((current - 1) / Math.max(1, total - 1) * 100)));
    }

    function setChapterHeadingProgress(pageRange) {
        var chapters = NR.state.chapters || [];
        var pages = NR.state.allRenderedPages || [];
        var firstPage = Math.max(1, Number(pageRange && pageRange.startPage) || 1);
        var lastPage = Math.min(pages.length, Number(pageRange && pageRange.endPage) || pages.length);
        var chapterIndexes = Object.create(null);
        chapters.forEach(function(chapter, index) {
            chapterIndexes[Number(chapter.p_index)] = index;
        });
        for (var pageIndex = firstPage - 1; pageIndex < lastPage; pageIndex++) {
            var page = pages[pageIndex];
            page.querySelectorAll('p.chapter-title').forEach(function(title) {
                var paragraphIndex = Number(title.dataset.originalIndex);
                var chapterIndex = chapterIndexes[paragraphIndex];
                if (chapterIndex !== undefined) {
                    title.dataset.readerChapterProgress = (chapterIndex + 1) + ' / ' + chapters.length;
                } else {
                    delete title.dataset.readerChapterProgress;
                }
            });
        }
    }

    function getBookmarks() {
        try {
            var data = JSON.parse(localStorage.getItem(bookmarkStorageKey) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }

    function saveBookmarks(bookmarks) {
        try {
            localStorage.setItem(bookmarkStorageKey, JSON.stringify(bookmarks));
        } catch (e) {
            console.warn('书签未能保存到本地存储。', e);
        }
    }

    function renderBookmarks() {
        var bookName = NR.state.currentFileName;
        var bookmarks = getBookmarks().filter(function(item) { return item.bookName === bookName; }).reverse();
        bookmarkList.innerHTML = '';
        if (!bookmarks.length) {
            var empty = document.createElement('div');
            empty.className = 'reader-bookmark-empty';
            empty.textContent = '还没有书签';
            bookmarkList.appendChild(empty);
            return;
        }
        bookmarks.forEach(function(item) {
            var row = document.createElement('div');
            row.className = 'reader-bookmark-item';
            var open = document.createElement('button');
            open.type = 'button';
            open.className = 'reader-bookmark-open';
            var title = document.createElement('span');
            title.textContent = item.chapterTitle || '书签';
            var detail = document.createElement('small');
            detail.textContent = (item.progress || 0) + '% · 第 ' + item.page + ' 页';
            open.appendChild(title);
            open.appendChild(detail);
            open.addEventListener('click', function() {
                document.getElementById('catalog-modal').style.display = 'none';
                NR.jumpToPage(item.page);
            });
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'reader-bookmark-remove';
            remove.title = '删除书签';
            remove.setAttribute('aria-label', '删除书签');
            remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            remove.addEventListener('click', function() {
                saveBookmarks(getBookmarks().filter(function(saved) { return saved.id !== item.id; }));
                renderBookmarks();
            });
            row.appendChild(open);
            row.appendChild(remove);
            bookmarkList.appendChild(row);
        });
    }

    function updateBookmarkButton() {
        var exists = getBookmarks().some(function(item) {
            return item.bookName === NR.state.currentFileName && item.page === NR.state.currentPage;
        });
        bookmarkButton.classList.toggle('is-bookmarked', exists);
        var icon = bookmarkButton.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-solid', exists);
            icon.classList.toggle('fa-regular', !exists);
        }
        bookmarkButton.title = exists ? '当前页已加入书签' : '添加书签';
        bookmarkButton.setAttribute('aria-label', bookmarkButton.title);
    }

    function updateReaderChrome() {
        if (!NR.state.currentFileName) return;
        var chapter = NR.getChapterInfoForPage(NR.state.currentPage);
        var chapterIndex = getCurrentChapterIndex();
        var scrollMode = reader.classList.contains('reader-scroll-layout');
        if (chapter) {
            chapterInfo.textContent = chapter.title + (!scrollMode ? '（' + chapter.current + '/' + chapter.total + '）' : '');
            chapterInfo.title = chapterInfo.textContent + (chapterIndex >= 0 ? ' · 第 ' + (chapterIndex + 1) + ' / ' + NR.state.chapters.length + ' 章' : '');
            chapterInfo.style.visibility = 'visible';
        } else if (chapterIndex < 0 && NR.state.chapters && NR.state.chapters.length) {
            chapterInfo.textContent = '开篇';
            chapterInfo.title = '开篇内容';
            chapterInfo.style.visibility = 'visible';
        } else {
            chapterInfo.textContent = '';
            chapterInfo.style.visibility = 'hidden';
        }

        var percent = getProgressPercent();
        var totalBookPages = Number(NR.state.totalPages) || 0;
        var currentBookPage = Number(NR.state.currentPage) || 1;
        pageInfo.textContent = currentBookPage + '/' + totalBookPages + ' 页';
        pageInfo.title = '全书第 ' + currentBookPage + ' / 共 ' + totalBookPages + ' 页（点击跳转）';
        progressValue.style.width = percent + '%';

        var previous = document.getElementById('reader-prev-chapter');
        var next = document.getElementById('reader-next-chapter');
        var online = NR.bookSourceState && NR.bookSourceState.onlineReader;
        var onlineChapters = online && online.chapters ? online.chapters : [];
        previous.textContent = scrollMode ? '上一章' : '上一页';
        next.textContent = scrollMode ? '下一章' : '下一页';
        if (scrollMode) {
            var chapterCount = (NR.state.chapters || []).length;
            previous.disabled = online
                ? online.currentIndex <= 0
                : chapterIndex <= 0;
            next.disabled = online
                ? online.currentIndex >= onlineChapters.length - 1
                : chapterCount === 0 || chapterIndex >= chapterCount - 1;
        } else {
            var canLoadPreviousOnlineChapter = !!(online && online.currentIndex > 0);
            var canLoadMoreOnlinePages = !!(online && NR.canLoadNextOnlineChapter && NR.canLoadNextOnlineChapter());
            previous.disabled = currentBookPage <= 1 && !canLoadPreviousOnlineChapter;
            next.disabled = currentBookPage >= totalBookPages && !canLoadMoreOnlinePages;
        }

        var currentTitle = chapter && chapter.title;
        document.querySelectorAll('#catalog-list li').forEach(function(item) {
            item.classList.toggle('reader-current-chapter', !!currentTitle && item.dataset.chapterTitle === currentTitle);
        });
        updateBookmarkButton();
    }

    function scrollToPage(pageNumber, behavior) {
        var page = currentPageContainer.querySelector('.page[data-reader-page="' + pageNumber + '"]');
        if (!page) return;
        var top = page.getBoundingClientRect().top - contentWrapper.getBoundingClientRect().top + contentWrapper.scrollTop;
        var topbar = reader.querySelector('.reader-topbar');
        var topbarHeight = topbar ? topbar.getBoundingClientRect().height : 72;
        contentWrapper.scrollTo({ top: Math.max(0, top - topbarHeight), behavior: behavior || 'auto' });
    }

    function renderAllPages() {
        var previousContainer = document.getElementById('prev-page-container');
        var nextContainer = document.getElementById('next-page-container');
        previousContainer.innerHTML = '';
        nextContainer.innerHTML = '';
        currentPageContainer.innerHTML = '';
        var pages = NR.state.allRenderedPages || [];
        var chapterIndex = getCurrentChapterIndex();
        var pageRange = getChapterPageRange(chapterIndex);
        var visiblePageCount = 0;
        var visiblePages = [];
        for (var index = pageRange.startPage - 1; index < pageRange.endPage && index < pages.length; index++) {
            var page = pages[index];
            if (!page) continue;
            page.dataset.readerPage = String(index + 1);
            currentPageContainer.appendChild(page);
            visiblePages.push(page);
            visiblePageCount++;
        }
        if (!pages.length) {
            currentPageContainer.innerHTML = '<div class="page"><p>请选择一个 .txt 或 .epub 文件开始阅读。</p></div>';
        } else if (!visiblePageCount) {
            var fallbackIndex = Math.max(0, Math.min(pages.length - 1, (Number(NR.state.currentPage) || 1) - 1));
            var fallbackPage = pages[fallbackIndex];
            fallbackPage.dataset.readerPage = String(fallbackIndex + 1);
            currentPageContainer.appendChild(fallbackPage);
            visiblePages.push(fallbackPage);
            visiblePageCount = 1;
        }
        if (visiblePageCount && (chapterIndex >= 0 || (NR.state.chapters || []).length)) {
            var endMarker = document.createElement('div');
            endMarker.className = 'reader-chapter-end';
            endMarker.textContent = chapterIndex >= 0 ? '— 本章完 —' : '— 开篇完 —';
            currentPageContainer.appendChild(endMarker);
        }
        inner.style.transform = 'none';
        NR.state.currentTranslate = 0;
        setChapterHeadingProgress(pageRange);
        if (NR.refreshCommentMarkers) NR.refreshCommentMarkers(visiblePages);
        requestAnimationFrame(function() {
            scrollToPage(NR.state.currentPage || 1, 'auto');
            lastScrollTop = contentWrapper.scrollTop;
            updateReaderChrome();
        });
    }

    NR.updateDOMPages = renderAllPages;

    var originalPopulateCatalog = NR.populateCatalog;
    NR.populateCatalog = function() {
        originalPopulateCatalog();
        document.querySelectorAll('#catalog-list li').forEach(function(item) {
            var title = item.textContent.trim();
            var chapterIndex = item.dataset.chapterIndex !== undefined
                ? Number(item.dataset.chapterIndex)
                : (NR.state.chapters || []).findIndex(function(chapter) { return chapter.p_id === item.dataset.pId; });
            var count = 0;
            if (chapterIndex >= 0 && NR.getTextForChapter) {
                var text = NR.getTextForChapter(chapterIndex + 1);
                count = text ? text.length : 0;
            }
            item.dataset.chapterTitle = title;
            item.textContent = '';
            var titleNode = document.createElement('span');
            titleNode.textContent = title;
            item.appendChild(titleNode);
            if (count) {
                var countNode = document.createElement('small');
                countNode.textContent = count + ' 字';
                item.appendChild(countNode);
            }
        });
    };

    var originalUpdateUI = NR.updateUI;
    NR.updateUI = function() {
        originalUpdateUI();
        updateReaderChrome();
    };

    function scrollJumpToPage(page) {
        page = Number(page);
        if (page > NR.state.totalPages) {
            if (page === NR.state.currentPage + 1 && typeof NR.loadNextOnlineChapter === 'function') {
                return NR.loadNextOnlineChapter().then(function(loaded) {
                    if (loaded && page <= NR.state.totalPages && NR.state.currentPage < page) NR.jumpToPage(page);
                });
            }
            return;
        }
        if (page < 1 && page === NR.state.currentPage - 1 && NR.state.currentPage === 1 &&
            NR.bookSourceState && NR.bookSourceState.onlineReader &&
            NR.bookSourceState.onlineReader.currentIndex > 0 && typeof NR.openOnlineChapterAt === 'function') {
            return NR.openOnlineChapterAt(NR.bookSourceState.onlineReader.currentIndex - 1);
        }
        if (page < 1 || page > NR.state.totalPages || NR.state.isTransitioning) return;
        if (NR.state.settings.enableFocusMode) NR.clearFocusHighlight();
        if (NR.state.isInImmersiveMode) NR.clearImmersiveHighlight();
        NR.state.currentPage = page;
        if (!currentPageContainer.querySelector('.page[data-reader-page="' + page + '"]')) NR.updateDOMPages();
        NR.updateUI();
        if (NR.state.activeSubView === 'original') NR.saveProgress(NR.state.currentFileName, page);
        scrollToPage(page, 'smooth');
    }

    NR.jumpToPage = scrollJumpToPage;

    NR.applyReaderMode = function() {
        var normalizedScrollMode = NR.state.settings.enableClickPage !== false;
        var readerModeSettingsChanged = NR.state.settings.enableClickPage !== normalizedScrollMode ||
            NR.state.settings.enableSwipePage !== !normalizedScrollMode;
        NR.state.settings.enableClickPage = normalizedScrollMode;
        NR.state.settings.enableSwipePage = !normalizedScrollMode;
        if (readerModeSettingsChanged) NR.saveSettings();
        if (scrollModeToggle) scrollModeToggle.checked = normalizedScrollMode;
        if (swipeModeToggle) swipeModeToggle.checked = !normalizedScrollMode;

        var scrollMode = NR.state.settings.enableClickPage !== false;
        var nextRenderer = scrollMode ? renderAllPages : originalUpdateDOMPages;
        var nextPageJump = scrollMode ? scrollJumpToPage : originalJumpToPage;
        var classMatchesMode = reader.classList.contains('reader-scroll-layout') === scrollMode;
        var modeChanged = scrollMode !== scrollModeActive || !classMatchesMode ||
            NR.updateDOMPages !== nextRenderer || NR.jumpToPage !== nextPageJump;
        if (!modeChanged) return;

        var fallbackPage = Number(NR.state.currentPage) || 1;
        if (reader.classList.contains('reader-scroll-layout')) {
            var readingLine = contentWrapper.getBoundingClientRect().top + Math.min(120, contentWrapper.clientHeight * 0.22);
            var visiblePage = null;
            getPageElements().some(function(page) {
                var rect = page.getBoundingClientRect();
                if (rect.top <= readingLine) {
                    visiblePage = page;
                    return false;
                }
                if (!visiblePage && rect.bottom > readingLine) {
                    visiblePage = page;
                    return true;
                }
                return true;
            });
            if (visiblePage) {
                fallbackPage = Number(visiblePage.dataset.readerPage) || fallbackPage;
            }
        }

        var hasPages = NR.state.totalPages > 0;
        var transitionId = hasPages ? ++modeTransitionId : 0;
        var transitionStartedAt = hasPages ? Date.now() : 0;
        if (hasPages) setModeLoading(true);

        scrollModeActive = scrollMode;
        bottomChromePinned = false;
        reader.classList.toggle('reader-scroll-layout', scrollMode);
        reader.classList.remove('chrome-hidden');
        NR.updateDOMPages = nextRenderer;
        NR.jumpToPage = nextPageJump;

        if (hasPages) {
            contentWrapper.scrollTop = 0;
            // Reuse the existing page fragments. Mode changes do not alter the
            // text settings or viewport width, so paginating a large book again
            // only blocks the UI without changing its page boundaries.
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    if (transitionId !== modeTransitionId) return;
                    try {
                        NR.state.currentPage = Math.max(1, Math.min(fallbackPage, NR.state.totalPages));
                        NR.updateDOMPages();
                        NR.updateUI();
                        if (NR.state.activeSubView === 'original') NR.saveProgress(NR.state.currentFileName, NR.state.currentPage);
                    } catch (error) {
                        console.error('切换阅读模式失败:', error);
                    } finally {
                        hideModeLoadingAfterPaint(transitionId, transitionStartedAt);
                    }
                });
            });
        }
    };

    var scrollModeToggle = document.getElementById('toggle-click-page');
    var swipeModeToggle = document.getElementById('toggle-swipe-page');
    function handleReaderModeToggle(event) {
        var changedToggle = event.currentTarget;
        var scrollMode = changedToggle === scrollModeToggle
            ? scrollModeToggle.checked
            : !swipeModeToggle.checked;
        NR.state.settings.enableClickPage = scrollMode;
        NR.state.settings.enableSwipePage = !scrollMode;
        scrollModeToggle.checked = scrollMode;
        swipeModeToggle.checked = !scrollMode;
        NR.saveSettings();
        if (contentWrapper) contentWrapper.style.cursor = scrollMode ? 'default' : 'pointer';
        NR.applyReaderMode();
    }
    scrollModeToggle.addEventListener('change', handleReaderModeToggle);
    swipeModeToggle.addEventListener('change', handleReaderModeToggle);

    var originalLoadBook = NR.loadBook;
    NR.loadBook = function(fileName, content, options) {
        var result = originalLoadBook(fileName, content, options);
        return result.then(function() {
            NR.applyReaderMode();
            var title = String(fileName || '').replace(/\.(txt|epub)$/i, '');
            var book = (NR.state.bookshelf || []).find(function(item) { return item.name === fileName; });
            if (book && book.author) title += '  作者：' + book.author;
            document.getElementById('header-filename').textContent = title;
        });
    };

    function goToChapter(offset) {
        var online = NR.bookSourceState && NR.bookSourceState.onlineReader;
        if (online && typeof NR.openOnlineChapterAt === 'function') {
            var onlineTarget = Number(online.currentIndex) + offset;
            if (onlineTarget >= 0 && onlineTarget < (online.chapters || []).length) {
                NR.openOnlineChapterAt(onlineTarget);
                return;
            }
        }
        var chapters = NR.state.chapters || [];
        var targetIndex = getCurrentChapterIndex() + offset;
        if (targetIndex < 0 || targetIndex >= chapters.length) return;
        var targetPage = getPageForParagraph(chapters[targetIndex].p_index);
        if (targetPage > 0) NR.jumpToPage(targetPage);
    }

    document.getElementById('reader-prev-chapter').addEventListener('click', function() {
        if (reader.classList.contains('reader-scroll-layout')) goToChapter(-1);
        else NR.jumpToPage((Number(NR.state.currentPage) || 1) - 1);
    });
    document.getElementById('reader-next-chapter').addEventListener('click', function() {
        if (reader.classList.contains('reader-scroll-layout')) goToChapter(1);
        else NR.jumpToPage((Number(NR.state.currentPage) || 1) + 1);
    });
    bookmarkButton.addEventListener('click', function() {
        if (!NR.state.currentFileName) return;
        var chapter = NR.getChapterInfoForPage(NR.state.currentPage);
        var bookmarks = getBookmarks().filter(function(item) {
            return !(item.bookName === NR.state.currentFileName && item.page === NR.state.currentPage);
        });
        if (!bookmarkButton.classList.contains('is-bookmarked')) {
            bookmarks.push({
                id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
                bookName: NR.state.currentFileName,
                page: NR.state.currentPage,
                chapterTitle: chapter ? chapter.title : '书签',
                progress: getProgressPercent(),
                time: Date.now()
            });
        }
        saveBookmarks(bookmarks);
        updateBookmarkButton();
        renderBookmarks();
    });

    document.querySelectorAll('[data-reader-tab]').forEach(function(tab) {
        tab.addEventListener('click', function() {
            var showToc = tab.dataset.readerTab === 'toc';
            document.querySelectorAll('[data-reader-tab]').forEach(function(item) {
                item.classList.toggle('active', item === tab);
            });
            document.getElementById('catalog-list').hidden = !showToc;
            bookmarkList.hidden = showToc;
            tocSearch.parentElement.hidden = !showToc;
            if (!showToc) renderBookmarks();
        });
    });

    tocSearch.addEventListener('input', function() {
        var query = tocSearch.value.trim().toLocaleLowerCase();
        document.querySelectorAll('#catalog-list li').forEach(function(item) {
            item.hidden = query && item.textContent.toLocaleLowerCase().indexOf(query) < 0;
        });
    });

    moreToggle.addEventListener('click', function(event) {
        event.stopPropagation();
        moreMenu.hidden = !moreMenu.hidden;
        moreToggle.setAttribute('aria-expanded', String(!moreMenu.hidden));
    });
    moreMenu.addEventListener('click', function(event) {
        if (event.target.closest('.reader-menu-action')) {
            moreMenu.hidden = true;
            moreToggle.setAttribute('aria-expanded', 'false');
        }
    });
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.reader-actions')) {
            moreMenu.hidden = true;
            moreToggle.setAttribute('aria-expanded', 'false');
        }
    });

    var lastScrollPage = 0;
    contentWrapper.addEventListener('scroll', function() {
        if (scrollFrame) return;
        scrollFrame = requestAnimationFrame(function() {
            scrollFrame = 0;
            var currentScrollTop = contentWrapper.scrollTop;
            var scrollDelta = currentScrollTop - lastScrollTop;
            if (reader.classList.contains('reader-scroll-layout')) {
                var distanceToBottom = contentWrapper.scrollHeight - currentScrollTop - contentWrapper.clientHeight;
                if (distanceToBottom <= 1) {
                    bottomChromePinned = true;
                } else {
                    bottomChromePinned = false;
                }
            } else {
                bottomChromePinned = false;
            }
            var modalOpen = Array.prototype.some.call(document.querySelectorAll('.modal'), function(modal) {
                return window.getComputedStyle(modal).display !== 'none';
            });
            var interactionOpen = modalOpen || !moreMenu.hidden || window.getComputedStyle(searchBar).display !== 'none';
            if (interactionOpen || bottomChromePinned) {
                reader.classList.remove('chrome-hidden');
            } else if (currentScrollTop <= 24 || scrollDelta < -6) {
                reader.classList.remove('chrome-hidden');
            } else if (currentScrollTop > 120 && scrollDelta > 6) {
                reader.classList.add('chrome-hidden');
            }
            lastScrollTop = currentScrollTop;

            var marker = contentWrapper.getBoundingClientRect().top + Math.min(120, contentWrapper.clientHeight * 0.22);
            var activePage = 1;
            getPageElements().some(function(page) {
                if (page.getBoundingClientRect().top <= marker) {
                    activePage = Number(page.dataset.readerPage);
                    return false;
                }
                return true;
            });
            if (activePage !== NR.state.currentPage) {
                NR.state.currentPage = activePage;
                NR.updateUI();
                if (activePage !== lastScrollPage && NR.state.activeSubView === 'original') {
                    NR.saveProgress(NR.state.currentFileName, activePage);
                }
                lastScrollPage = activePage;
            }
        });
    }, { passive: true });
})();
