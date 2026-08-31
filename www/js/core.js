// 核心功能
(function() {
    var NR = window.NovelReader;

    NR.loadBook = function(fileName, content, options) {
        options = options || {};
        if (NR.bookSourceState && NR.bookSourceState.onlineReader && NR.bookSourceState.onlineReader.fileName !== fileName) {
            NR.bookSourceState.onlineReader = null;
        }
        if (NR.state.isListenMode) NR.stopTts();
        NR.clearSearch();
        NR.state.currentFileName = fileName;
        NR.state.currentFileContent = content;
        document.title = NR.state.currentFileName.replace(/\.(txt|epub)$/i, '');
        NR.els['header-filename'].textContent = NR.state.currentFileName;
        if (NR.state.activeSubView === 'original') {
            NR.loadBookData();
        }
        NR.updatePageInfo(0, 0, true);
        NR.prepareContent(content);
        return NR.preloadImages(NR.state.epubImagePreloadList, 2000).then(function() {
            return new Promise(function(resolve) {
                setTimeout(function() {
                    NR.paginate().then(resolve);
                }, 50);
            });
        }).then(function() {
            var startPage = 1;
            if (NR.state.activeSubView === 'original' && !options.isRepagination) {
                var savedPage = NR.loadProgress(NR.state.currentFileName);
                if (savedPage) startPage = savedPage;
            }
            NR.state.currentPage = options.startPage || ((startPage > 0 && startPage <= NR.state.totalPages) ? startPage : 1);
            NR.updateDOMPages();
            NR.updateUI();
            NR.updateHeaderForState();
        });
    };

    NR.createEmptyBookData = function() {
        return {
            summaries: [],
            sequels: [],
            translations: [],
            characterProfiles: [],
            sceneImages: [],
            comments: [],
            globalData: null,
            globalDataHistory: [],
            protagonistInfo: null,
            protagonistHistory: [],
            importantNPCs: [],
            npcHistory: [],
            skills: [],
            skillsHistory: [],
            items: [],
            itemsHistory: [],
            quests: [],
            questsHistory: [],
            locations: [],
            locationsHistory: [],
            equipments: [],
            equipmentsHistory: [],
            factions: [],
            factionsHistory: [],
            intels: [],
            intelsHistory: [],
            timelines: [],
            phoneChatHistory: {},
            phoneUserRole: null,
            phoneLastSelectedCharacter: null,
            diaries: [],
            dynamics: [],
            browserHistory: [],
            forumPosts: [],
            mapData: null,
            calendarEvents: [],
            groupChats: [],
            groupChatHistory: {},
            emails: [],
            calls: [],
            liveRooms: [],
            liveHistory: {},
            musicData: null
        };
    };

    NR.prepareContent = function(text) {
        NR.state.chapters = [];
        var chapterRegex = /^(第\s*[一二三四五六七八九十百千\d\s]+[章回节卷])|^(Chapter\s+\d+)|(^\d{1,3}\s+)/;
        // 匹配中文引号 "" 、英文引号 "" 和日式引号 「」
        var dialogueRegex = /(\u201c[^\u201d]*\u201d|"[^"]*"|「[^」]*」)/g;
        var IMG_MARK = ':::EPUB_IMG:::';
        NR.state.originalParagraphs = (text || '').split(/\r?\n/).map(function(pText, index) {
            var p = document.createElement('p');
            p.dataset.originalIndex = index;
            var trimmedText = pText.trim();
            if (trimmedText.startsWith(IMG_MARK)) {
                var parts = trimmedText.slice(IMG_MARK.length).split('|');
                var urlEnc = parts[0];
                var altEnc = parts[1] || '';
                p.classList.add('epub-image-paragraph');
                p.innerHTML = '<img class="epub-image" src="' + decodeURIComponent(urlEnc || '') + '" alt="' + NR.escapeHtml(decodeURIComponent(altEnc || '')) + '">';
            } else if (trimmedText === '') {
                p.classList.add('blank-line');
                p.innerHTML = '&nbsp;';
            } else {
                if (chapterRegex.test(trimmedText) && trimmedText.length < 50) {
                    var chapId = 'chap-' + index;
                    NR.state.chapters.push({
                        title: trimmedText,
                        p_id: chapId,
                        p_index: index,
                        chap_num: NR.state.chapters.length + 1
                    });
                    p.id = chapId;
                    p.classList.add('chapter-title');
                }
                p.innerHTML = NR.escapeHtml(pText).replace(dialogueRegex, '<span class="dialogue">$1</span>');
            }
            return p;
        });
        NR.populateCatalog();
    };

    NR.paginate = function() {
        return new Promise(function(resolve) {
            NR.state.viewportWidth = NR.els['content-wrapper'].clientWidth;
            if (NR.state.viewportWidth === 0) {
                setTimeout(function() { NR.paginate().then(resolve); }, 50);
                return;
            }
            var ruler = NR.els['calculation-ruler'];
            ruler.classList.add('page');
            ruler.style.width = NR.state.viewportWidth + 'px';
            ruler.style.height = NR.els['content-wrapper'].clientHeight + 'px';
            ruler.style.fontFamily = getComputedStyle(document.body).fontFamily;
            
            NR.state.allRenderedPages = [];
            var currentPageParas = [];
            var createPage = function(paras) {
                if (paras.length === 0) return;
                var pageDiv = document.createElement('div');
                pageDiv.className = 'page';
                paras.forEach(function(p) { pageDiv.appendChild(p.cloneNode(true)); });
                NR.state.allRenderedPages.push(pageDiv);
            };
            for (var i = 0; i < NR.state.originalParagraphs.length; i++) {
                var p = NR.state.originalParagraphs[i];
                if (p.id && p.id.startsWith('chap-') && currentPageParas.length > 0) {
                    createPage(currentPageParas);
                    currentPageParas = [];
                }
                if (currentPageParas.length === 0 && p.classList.contains('blank-line')) continue;
                ruler.innerHTML = '';
                currentPageParas.concat([p]).forEach(function(testP) { ruler.appendChild(testP.cloneNode(true)); });
                if (ruler.scrollHeight > ruler.clientHeight) {
                    createPage(currentPageParas);
                    currentPageParas = p.classList.contains('blank-line') ? [] : [p];
                } else {
                    currentPageParas.push(p);
                }
            }
            createPage(currentPageParas);
            NR.state.totalPages = NR.state.allRenderedPages.length;
            ruler.classList.remove('page');
            ruler.innerHTML = ''; 
            resolve();
        });
    };

    NR.jumpToPage = function(page) {
        // Online books expose only the chapters already cached.  A request for
        // the page immediately after the cached end is treated as a chapter
        // boundary and fulfilled asynchronously; this keeps the reader
        // responsive while Legado rules fetch the next chapter.
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
            NR.bookSourceState.onlineReader.currentIndex > 0 &&
            typeof NR.openOnlineChapterAt === 'function') {
            return NR.openOnlineChapterAt(NR.bookSourceState.onlineReader.currentIndex - 1);
        }
        if (page < 1 || page === NR.state.currentPage || NR.state.isTransitioning) return;

        if (NR.state.settings.enableFocusMode) {
            NR.clearFocusHighlight();
        }
        
        if (NR.state.isInImmersiveMode) {
            NR.clearImmersiveHighlight();
        }
        
        var isAdjacent = Math.abs(NR.state.currentPage - page) === 1;
        if (isAdjacent) {
            NR.state.isTransitioning = true;
            var direction = page > NR.state.currentPage ? 1 : -1;
            NR.state.currentTranslate += -direction * NR.state.viewportWidth;
            NR.els['content-inner'].style.transform = 'translateX(' + NR.state.currentTranslate + 'px)';
            setTimeout(function() {
                NR.state.currentPage = page;
                NR.updateDOMPages();
                NR.updateUI();
                if (NR.state.activeSubView === 'original') NR.saveProgress(NR.state.currentFileName, NR.state.currentPage);
                NR.state.isTransitioning = false;
            }, 300);
        } else {
            NR.state.currentPage = page;
            NR.updateDOMPages();
            NR.updateUI();
            if (NR.state.activeSubView === 'original') NR.saveProgress(NR.state.currentFileName, NR.state.currentPage);
        }
    };

    NR.rePaginateBook = function(silent) {
        if (NR.state.currentFileName && NR.els.readerView.style.display !== 'none') {
            var currentPageParas = (NR.state.currentPage > 0 && NR.state.currentPage <= NR.state.allRenderedPages.length) ? NR.state.allRenderedPages[NR.state.currentPage - 1].querySelectorAll('p[data-original-index]') : null;
            var startPIndex = currentPageParas && currentPageParas.length > 0 ? parseInt(currentPageParas[0].dataset.originalIndex, 10) : 0;
            
            var repaginateAction = function() {
                NR.paginate().then(function() {
                    var targetPage = 1;
                    if (startPIndex > 0) {
                        for (var i = 0; i < NR.state.allRenderedPages.length; i++) {
                            var firstParaOnNewPage = NR.state.allRenderedPages[i].querySelector('p[data-original-index]');
                            if (firstParaOnNewPage && parseInt(firstParaOnNewPage.dataset.originalIndex, 10) >= startPIndex) {
                                targetPage = i + 1;
                                break;
                            }
                        }
                    }
                    NR.state.currentPage = targetPage;
                    NR.updateDOMPages();
                    NR.updateUI();
                });
            };

            if (silent) {
                repaginateAction();
            } else {
                var options = { isRepagination: true };
                NR.loadBook(NR.state.currentFileName, NR.state.currentFileContent, options).then(function() {
                    var targetPage = 1;
                    if (startPIndex > 0) {
                        for (var i = 0; i < NR.state.allRenderedPages.length; i++) {
                            var firstParaOnNewPage = NR.state.allRenderedPages[i].querySelector('p[data-original-index]');
                            if (firstParaOnNewPage && parseInt(firstParaOnNewPage.dataset.originalIndex, 10) >= startPIndex) {
                                targetPage = i + 1;
                                break;
                            }
                        }
                    }
                    NR.jumpToPage(targetPage);
                });
            }
        }
    };

    NR.loadBookData = function() {
        if (!NR.state.currentFileName) {
            NR.state.currentBookData = NR.createEmptyBookData();
            return Promise.resolve();
        }
        try {
            var data = localStorage.getItem('novelReaderData_' + NR.state.currentFileName);
            var parsedData = data ? JSON.parse(data) : {};
            var bookData = NR.createEmptyBookData();
            Object.keys(bookData).forEach(function(key) {
                if (parsedData[key] !== undefined && parsedData[key] !== null) {
                    bookData[key] = parsedData[key];
                }
            });
            NR.state.currentBookData = bookData;
            // 异步恢复图片数据
            return NR.restoreImages(NR.state.currentBookData).catch(function(err) {
                console.error('恢复图片数据失败:', err);
            });
        } catch (e) {
            console.error("Failed to load book data:", e);
            NR.state.currentBookData = NR.createEmptyBookData();
            return Promise.resolve();
        }
    };

    NR.saveBookData = function() {
        if (!NR.state.currentFileName) return;
        
        // 捕获当前文件名，避免异步回调时文件名已变化
        var fileNameToSave = NR.state.currentFileName;
        
        // 深拷贝数据，避免修改原始数据
        var dataToSave = JSON.parse(JSON.stringify(NR.state.currentBookData));
        
        // 提取图片到IndexedDB，然后保存元数据到localStorage
        NR.extractAndSaveImages(dataToSave, fileNameToSave).then(function() {
            try {
                localStorage.setItem('novelReaderData_' + fileNameToSave, JSON.stringify(dataToSave));
            } catch (e) {
                console.error('保存数据失败:', e);
                // 如果还是失败，可能是其他数据太大，提示用户
                if (e.name === 'QuotaExceededError') {
                    console.warn('存储空间不足，部分数据可能未保存');
                }
            }
        }).catch(function(err) {
            console.error('保存图片到IndexedDB失败:', err);
        });
    };

    NR.loadProgress = function(fileName) {
        return fileName ? parseInt(localStorage.getItem('novelReaderProgress_' + fileName), 10) : null;
    };

    NR.saveProgress = function(fileName, page) {
        if (fileName) localStorage.setItem('novelReaderProgress_' + fileName, page);
    };

    NR.loadBookshelf = function() {
        var data = localStorage.getItem('novelReaderBookshelf');
        NR.state.bookshelf = data ? JSON.parse(data) : [];
        NR.state.bookshelf.forEach(function(book) {
            if (!book.tags) book.tags = [];
        });
    };

    NR.saveBookshelf = function() {
        localStorage.setItem('novelReaderBookshelf', JSON.stringify(NR.state.bookshelf));
    };

    NR.loadBookFromShelf = function(bookName) {
        var bookMeta = NR.state.bookshelf.find(function(b) { return b.name === bookName; });
        if (bookMeta) {
            NR.els['app-loader'].classList.remove('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在从书库加载...';
            return NR.storageDB.loadBook(bookName).then(function(book) {
                if (book) {
                    NR.state.activeSubView = 'original';
                    NR.state.currentBookCoverUrl = null;
                    NR.state.epubImagePreloadList = [];
                    NR.showReaderView();
                    
                    // 检查是否是 EPUB 文件（通过文件名或标记）
                    var isEpub = /\.epub$/i.test(bookName) || book.isEpub;
                    
                    if (isEpub && book.content) {
                        // EPUB 文件需要解析
                        NR.els['app-loader'].querySelector('span').textContent = '正在解析 EPUB...';
                        
                        // content 可能是 Blob、ArrayBuffer 或其他格式
                        // JSZip.loadAsync 可以直接处理这些格式
                        return NR.parseEpubToPlainText(book.content).then(function(result) {
                            NR.state.currentBookCoverUrl = result.coverUrl;
                            return NR.loadBook(book.id, result.textContent);
                        });
                    } else {
                        // TXT 文件直接加载
                        var restoreOnline = typeof NR.restoreOnlineReaderSession === 'function'
                            ? NR.restoreOnlineReaderSession(bookMeta, book.content)
                            : Promise.resolve(false);
                        return Promise.resolve(restoreOnline).then(function() {
                            return NR.loadBook(book.id, book.content);
                        });
                    }
                } else {
                    throw new Error("在数据库中未找到书籍内容。");
                }
            }).catch(function(err) {
                console.error("从书库加载书籍失败:", err);
                alert('加载《' + bookName + '》失败: ' + err.message);
            }).finally(function() {
                NR.els['app-loader'].classList.add('hidden');
            });
        }
        return Promise.resolve();
    };

    NR.handleAddToShelf = function() {
        if (!NR.state.currentFileName || !NR.state.currentFileContent) return Promise.resolve();
        if (NR.state.bookshelf.some(function(b) { return b.name === NR.state.currentFileName; })) return Promise.resolve();

        var detectedAuthor = NR.extractAuthor(NR.state.currentFileContent);
        var bookMetadata = {
            name: NR.state.currentFileName,
            cover: NR.state.currentBookCoverUrl,
            tags: [],
            author: detectedAuthor,
            chapterCount: NR.state.chapters.length
        };
        var bookContent = {
            id: NR.state.currentFileName,
            content: NR.state.currentFileContent
        };
        return NR.storageDB.saveBook(bookContent).then(function() {
            NR.state.bookshelf.push(bookMetadata);
            NR.saveBookshelf();
            NR.updateAddToShelfButton();
        }).catch(function(e) {
            console.error("添加到书架失败:", e);
            alert("添加到书架失败: " + e.message);
        });
    };

    NR.handleFileImport = function(event) {
        var files = Array.from(event.target.files);
        if (files.length === 0) return Promise.resolve();
        NR.els['app-loader'].classList.remove('hidden');
        var newBooksMetadata = [];
        var contentSavePromises = [];
        var skippedCount = 0;
        var filesToProcess = files.filter(function(file) {
            var isValidType = /\.(txt|epub)$/i.test(file.name);
            var isNew = !NR.state.bookshelf.some(function(b) { return b.name === file.name; });
            if (!isValidType || !isNew) skippedCount++;
            return isValidType && isNew;
        });
        var processedCount = 0;
        var totalToProcess = filesToProcess.length;
        
        function processFile(index) {
            if (index >= filesToProcess.length) {
                NR.els['app-loader'].querySelector('span').textContent = '正在写入数据库...';
                return Promise.all(contentSavePromises).then(function() {
                    NR.els['app-loader'].querySelector('span').textContent = '正在更新书架...';
                    return new Promise(function(resolve) { setTimeout(resolve, 50); });
                }).then(function() {
                    NR.state.bookshelf.push.apply(NR.state.bookshelf, newBooksMetadata);
                    NR.saveBookshelf();
                    NR.populateFilterDropdown();
                    NR.renderBookshelf();
                    NR.els['app-loader'].classList.add('hidden');
                    NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
                    alert('导入完成。\n成功: ' + newBooksMetadata.length + ' 本\n跳过 (已存在或格式错误): ' + skippedCount + ' 个');
                    event.target.value = null;
                });
            }
            
            var file = filesToProcess[index];
            processedCount++;
            NR.els['app-loader'].querySelector('span').textContent = '正在处理 (' + processedCount + '/' + totalToProcess + '): ' + file.name;
            
            return new Promise(function(resolve) { setTimeout(resolve, 10); }).then(function() {
                var contentPromise;
                var coverDataUrl = null;
                NR.state.epubImagePreloadList = [];
                
                if (NR.isEpubFile(file)) {
                    contentPromise = NR.parseEpubToPlainText(file).then(function(epubData) {
                        coverDataUrl = epubData.coverUrl;
                        return epubData.textContent;
                    });
                } else {
                    contentPromise = NR.readFileAsText(file, 'UTF-8').then(function(content) {
                        if (content.includes('\uFFFD')) {
                            throw new Error("Fallback to GBK.");
                        }
                        return content;
                    }).catch(function() {
                        return NR.readFileAsText(file, 'GBK');
                    });
                }
                
                return contentPromise.then(function(content) {
                    var detectedAuthor = NR.extractAuthor(content);
                    var chapterCount = NR.countChapters(content);

                    newBooksMetadata.push({
                        name: file.name,
                        cover: coverDataUrl,
                        tags: [],
                        author: detectedAuthor,
                        chapterCount: chapterCount
                    });
                    contentSavePromises.push(NR.storageDB.saveBook({
                        id: file.name,
                        content: content
                    }));
                }).catch(function(err) {
                    console.error('导入文件失败: ' + file.name, err);
                    skippedCount++;
                });
            }).then(function() {
                return processFile(index + 1);
            });
        }
        
        return processFile(0);
    };

    NR.getTextForPage = function(e) {
        return e < 1 || e > NR.state.allRenderedPages.length ? "" : NR.state.allRenderedPages[e - 1].innerText;
    };

    NR.getTextForPageRange = function(e, t) {
        var n = [];
        for (var o = Math.max(1, e); o <= Math.min(NR.state.totalPages, t); o++) n.push(NR.getTextForPage(o));
        return n.join("\n\n");
    };

    NR.getTextForChapter = function(chapNum) {
        if (!NR.state.chapters[chapNum - 1]) return null;
        var chap = NR.state.chapters[chapNum - 1];
        var nextChap = NR.state.chapters[chapNum];
        var startIdx = chap.p_index;
        var endIdx = nextChap ? nextChap.p_index : NR.state.originalParagraphs.length;
        return NR.state.originalParagraphs.slice(startIdx, endIdx).map(function(p) { return p.textContent; }).join('\n');
    };

    NR.getTextForCurrentChapter = function() {
        if (NR.state.chapters.length === 0) {
            alert("未能解析到章节目录。");
            return null;
        }
        if (NR.state.currentPage < 1 || NR.state.currentPage > NR.state.allRenderedPages.length) {
             alert("无效的当前页码。");
             return null;
        }
        var p = NR.state.allRenderedPages[NR.state.currentPage - 1].querySelector("p[data-original-index]");
        if (!p) {
            alert("无法定位当前页的段落信息。");
            return null;
        }
        var pIndex = parseInt(p.dataset.originalIndex, 10);
        var currentChap = null;
        for (var i = NR.state.chapters.length - 1; i >= 0; i--) {
            if (NR.state.chapters[i].p_index <= pIndex) {
                currentChap = NR.state.chapters[i];
                break;
            }
        }
        if (!currentChap) {
            alert("无法定位当前章节。");
            return null;
        }
        return {
            text: NR.getTextForChapter(currentChap.chap_num),
            title: currentChap.title
        };
    };

    // Handler for immersive next/prev events triggered from UI
    document.addEventListener('immersive-next-page', function() {
        if (NR.state.currentPage < NR.state.totalPages || (NR.canLoadNextOnlineChapter && NR.canLoadNextOnlineChapter())) {
            NR.jumpToPage(NR.state.currentPage + 1);
            setTimeout(function() {
                NR.initImmersiveHighlight();
            }, 350);
        }
    });

    document.addEventListener('immersive-prev-page', function() {
        if (NR.state.currentPage > 1) {
            NR.jumpToPage(NR.state.currentPage - 1);
            setTimeout(function() {
                var newPageEl = document.getElementById('current-page-container');
                if (newPageEl) {
                    var paragraphs = Array.from(newPageEl.querySelectorAll('p:not(.blank-line)'));
                    if (paragraphs.length > 0) {
                        NR.setImmersiveHighlight(paragraphs[paragraphs.length - 1]);
                    }
                }
            }, 350);
        }
    });

    // Handler for focus mode next/prev events triggered from UI
    document.addEventListener('focus-next-page', function() {
        if (NR.state.currentPage < NR.state.totalPages || (NR.canLoadNextOnlineChapter && NR.canLoadNextOnlineChapter())) {
            NR.jumpToPage(NR.state.currentPage + 1);
            setTimeout(function() {
                NR.initFocusHighlight();
            }, 350);
        }
    });

    document.addEventListener('focus-prev-page', function() {
        if (NR.state.currentPage > 1) {
            NR.jumpToPage(NR.state.currentPage - 1);
            setTimeout(function() {
                var newPageEl = document.getElementById('current-page-container');
                if (newPageEl) {
                    var paragraphs = Array.from(newPageEl.querySelectorAll('p:not(.blank-line)'));
                    if (paragraphs.length > 0) {
                        NR.setFocusHighlight(paragraphs[paragraphs.length - 1]);
                    }
                }
            }, 350);
        }
    });

    // 渲染导出书籍列表
    NR.renderExportBookList = function() {
        NR.els['export-book-list'].innerHTML = '';
        NR.els['btn-export-selected'].disabled = true;
        NR.els['btn-export-selected'].textContent = '导出选中';
        
        if (NR.state.bookshelf.length === 0) {
            NR.els['export-book-list'].innerHTML = '<p style="padding: 15px; text-align: center;">书架是空的</p>';
            return;
        }
        
        NR.state.bookshelf.forEach(function(book) {
            var item = document.createElement('label');
            item.style.cssText = 'display: flex; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-color); cursor: pointer;';
            item.innerHTML = '<input type="checkbox" value="' + NR.escapeHtml(book.name) + '" style="margin-right: 10px;">' +
                '<span style="flex: 1;">' + NR.escapeHtml(book.name.replace(/\.(txt|epub)$/i, '')) + '</span>' +
                '<span style="font-size: 12px; opacity: 0.6;">' + (book.author || '未知作者') + '</span>';
            NR.els['export-book-list'].appendChild(item);
        });
    };

    // 检测是否在Capacitor环境中
    NR.isCapacitor = function() {
        return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    };

    // 获取导出目录（相对路径部分）
    NR.getExportDir = function() {
        return NR.state.settings.exportDir || '小说';
    };

    // 保存导出目录
    NR.saveExportDir = function(dir) {
        // 清理路径：去除首尾斜杠和空格，移除 /storage/emulated/0/ 前缀
        dir = (dir || '').trim()
            .replace(/^\/storage\/emulated\/0\//i, '')
            .replace(/^\/+|\/+$/g, '');
        if (!dir) dir = '小说';
        NR.state.settings.exportDir = dir;
        NR.saveSettings();
        return dir;
    };

    // 导出书籍（支持Android选择目录）
    NR.exportBooks = function(bookNames) {
        if (bookNames.length === 0) return;
        
        // 在Android上使用Capacitor Filesystem
        if (NR.isCapacitor()) {
            NR.exportBooksNative(bookNames);
        } else {
            NR.exportBooksWeb(bookNames);
        }
    };

    // 检查并请求所有文件访问权限 (Android 11+)
    NR.checkStoragePermission = async function() {
        try {
            var Filesystem = window.Capacitor.Plugins.Filesystem;
            
            // 先尝试请求基本权限
            try {
                await Filesystem.requestPermissions();
            } catch (e) {
                console.log('基本权限请求:', e);
            }
            
            // 测试是否可以写入外部存储
            try {
                await Filesystem.writeFile({
                    path: '/storage/emulated/0/.niuniu_test',
                    data: 'test',
                    encoding: 'utf8'
                });
                // 删除测试文件
                await Filesystem.deleteFile({
                    path: '/storage/emulated/0/.niuniu_test'
                });
                return true;
            } catch (e) {
                console.log('外部存储写入测试失败:', e);
                return false;
            }
        } catch (e) {
            return false;
        }
    };

    // Android原生导出（使用Capacitor Filesystem）
    NR.exportBooksNative = async function(bookNames) {
        try {
            var Filesystem = window.Capacitor.Plugins.Filesystem;
            
            // 检查权限
            var hasPermission = await NR.checkStoragePermission();
            if (!hasPermission) {
                var goSettings = confirm('需要"所有文件访问"权限才能导出到外部存储。\n\n点击"确定"前往设置页面授权，授权后返回重试。');
                if (goSettings) {
                    // 打开应用设置页面
                    try {
                        if (window.Capacitor.Plugins.App) {
                            await window.Capacitor.Plugins.App.openUrl({ url: 'package:' + window.Capacitor.Plugins.Device?.getInfo?.()?.appId || 'com.niuniu.reader' });
                        }
                    } catch (e) {
                        alert('请手动前往：设置 → 应用 → 牛牛阅读器 → 权限 → 文件和媒体 → 允许管理所有文件');
                    }
                }
                return;
            }
            
            var exportedCount = 0;
            var failedBooks = [];
            var exportedPaths = [];
            
            // 使用用户设置的导出目录
            var exportSubDir = NR.getExportDir();
            var fullBasePath = '/storage/emulated/0/' + exportSubDir;
            
            // 确保目录存在
            try {
                await Filesystem.mkdir({
                    path: fullBasePath,
                    recursive: true
                });
            } catch (e) {
                // 目录可能已存在
            }
            
            for (var i = 0; i < bookNames.length; i++) {
                var bookName = bookNames[i];
                try {
                    var bookData = await NR.storageDB.loadBook(bookName);
                    if (!bookData || !bookData.content) {
                        failedBooks.push(bookName);
                        continue;
                    }
                    
                    // 使用绝对路径写入到 /storage/emulated/0/
                    var fullFilePath = fullBasePath + '/' + bookName;
                    
                    var result = await Filesystem.writeFile({
                        path: fullFilePath,
                        data: bookData.content,
                        encoding: 'utf8'
                    });
                    
                    console.log('导出成功:', result);
                    exportedCount++;
                    exportedPaths.push(fullFilePath);
                } catch (err) {
                    console.error('导出失败:', bookName, err);
                    failedBooks.push(bookName + ' (' + (err.message || err) + ')');
                }
            }
            
            NR.els['export-book-modal'].style.display = 'none';
            
            if (failedBooks.length === 0) {
                alert('导出完成！共导出 ' + exportedCount + ' 本书籍\n\n保存位置:\n' + fullBasePath);
            } else if (exportedCount > 0) {
                alert('导出完成！\n成功: ' + exportedCount + ' 本\n失败: ' + failedBooks.length + ' 本\n\n保存位置:\n' + fullBasePath + '\n\n失败书籍:\n' + failedBooks.join('\n'));
            } else {
                alert('导出失败！\n\n' + failedBooks.join('\n'));
            }
        } catch (err) {
            console.error('导出错误:', err);
            alert('导出失败: ' + (err.message || err));
        }
    };

    // Web端导出（浏览器下载）
    NR.exportBooksWeb = function(bookNames) {
        var exportNext = function(index) {
            if (index >= bookNames.length) {
                NR.els['export-book-modal'].style.display = 'none';
                alert('导出完成！共导出 ' + bookNames.length + ' 本书籍');
                return;
            }
            
            var bookName = bookNames[index];
            NR.storageDB.loadBook(bookName).then(function(bookData) {
                if (!bookData || !bookData.content) {
                    console.warn('书籍内容不存在:', bookName);
                    exportNext(index + 1);
                    return;
                }
                
                // 创建Blob并触发下载
                var blob = new Blob([bookData.content], { type: 'text/plain;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = bookName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // 延迟导出下一本，避免浏览器阻止多次下载
                setTimeout(function() {
                    exportNext(index + 1);
                }, 500);
            }).catch(function(err) {
                console.error('导出失败:', bookName, err);
                exportNext(index + 1);
            });
        };
        
        exportNext(0);
    };
})();
