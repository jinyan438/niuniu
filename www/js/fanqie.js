// 番茄小说搜索下载模块（无水印版）
(function() {
    var NR = window.NovelReader;

    // API配置
    var FANQIE_CONFIG = {
        // 主API源
        primarySources: [
            { name: "番茄小说API", baseUrl: "http://101.35.133.34:5000", useProxy: false }
        ],
        // 备用API模式保留入口，但不再切换到旧失效节点
        backupSources: [
            { name: "番茄小说API", baseUrl: "http://101.35.133.34:5000", useProxy: false }
        ],
        // 当前使用的API源列表
        apiSources: [],
        apiBaseUrl: '',
        currentSourceIndex: 0,
        // 是否使用备用API
        useBackupApi: false,
        // CORS代理
        corsProxy: 'https://corsproxy.io/?',
        // API端点
        endpoints: {
            search: '/api/search',
            detail: '/api/detail',
            book: '/api/book',
            directory: '/api/directory',
            content: '/api/content',
            iosContent: '/api/ios/content',
            chapter: '/api/chapter',
            rawFull: '/api/raw_full'
        },
        // 并发配置
        primaryBatchSize: 4,
        backupBatchSize: 3,
        batchDelay: 150,
        requestTimeout: 30000,
        configLoaded: true
    };

    // 初始化API源
    function initApiSources() {
        if (FANQIE_CONFIG.useBackupApi) {
            FANQIE_CONFIG.apiSources = FANQIE_CONFIG.backupSources.slice();
        } else {
            FANQIE_CONFIG.apiSources = FANQIE_CONFIG.primarySources.slice();
        }
        FANQIE_CONFIG.currentSourceIndex = 0;
        FANQIE_CONFIG.apiBaseUrl = FANQIE_CONFIG.apiSources[0].baseUrl;
    }

    // 切换到下一个API节点
    function switchToNextApiSource() {
        var nextIndex = (FANQIE_CONFIG.currentSourceIndex + 1) % FANQIE_CONFIG.apiSources.length;
        FANQIE_CONFIG.currentSourceIndex = nextIndex;
        FANQIE_CONFIG.apiBaseUrl = FANQIE_CONFIG.apiSources[nextIndex].baseUrl;
        console.log('[Fanqie] 切换API节点:', FANQIE_CONFIG.apiSources[nextIndex].name);
        return FANQIE_CONFIG.apiBaseUrl;
    }

    // 获取当前并发量
    function getBatchSize() {
        return FANQIE_CONFIG.useBackupApi ? FANQIE_CONFIG.backupBatchSize : FANQIE_CONFIG.primaryBatchSize;
    }

    // 获取请求头
    function getHeaders() {
        return {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };
    }

    function getCurrentSource() {
        return FANQIE_CONFIG.apiSources[FANQIE_CONFIG.currentSourceIndex] || FANQIE_CONFIG.apiSources[0] || null;
    }

    // 构建请求URL
    function buildUrl(urlPath) {
        var originalUrl = FANQIE_CONFIG.apiBaseUrl + urlPath;
        var source = getCurrentSource();
        if (source && source.useProxy) {
            return FANQIE_CONFIG.corsProxy + encodeURIComponent(originalUrl);
        }
        return originalUrl;
    }

    // 带自动切换节点的fetch请求
    function fetchWithFallback(urlPath, options, maxRetries) {
        maxRetries = maxRetries || FANQIE_CONFIG.apiSources.length * 2;
        var retryCount = 0;
        var startIndex = FANQIE_CONFIG.currentSourceIndex;

        function tryFetch() {
            var url = buildUrl(urlPath);
            console.log('[Fanqie] 请求:', url);

            var fetchOptions = Object.assign({}, options);
            if (!FANQIE_CONFIG.useBackupApi) {
                fetchOptions.headers = Object.assign({}, getHeaders(), options.headers || {});
            } else {
                fetchOptions.headers = { 'Accept': 'application/json' };
            }

            return fetch(url, fetchOptions)
                .then(function(response) {
                    console.log('[Fanqie] 响应状态:', response.status);
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response;
                })
                .catch(function(err) {
                    console.error('[Fanqie] 请求失败:', err.message);
                    retryCount++;
                    if (retryCount < maxRetries && FANQIE_CONFIG.apiSources.length > 1) {
                        console.warn('[Fanqie] 尝试切换节点');
                        switchToNextApiSource();
                        return tryFetch();
                    }
                    FANQIE_CONFIG.currentSourceIndex = startIndex;
                    FANQIE_CONFIG.apiBaseUrl = FANQIE_CONFIG.apiSources[startIndex].baseUrl;
                    throw err;
                });
        }

        return tryFetch();
    }

    // 当前下载状态
    var downloadState = {
        isDownloading: false,
        currentBookId: null,
        progress: 0,
        aborted: false
    };

    // 获取选择的下载格式
    function getSelectedFormat() {
        var epubRadio = document.getElementById('fanqie-format-epub');
        return (epubRadio && epubRadio.checked) ? 'epub' : 'txt';
    }

    // 初始化
    function initFanqieConfig() {
        // 从localStorage读取备用API设置
        try {
            FANQIE_CONFIG.useBackupApi = localStorage.getItem('fanqie_use_backup_api') === 'true';
        } catch (e) {}
        
        initApiSources();
        console.log('[Fanqie] 使用API:', FANQIE_CONFIG.apiBaseUrl, '备用模式:', FANQIE_CONFIG.useBackupApi);
        return Promise.resolve();
    }

    // 切换备用API模式
    NR.fanqieToggleBackupApi = function(useBackup) {
        FANQIE_CONFIG.useBackupApi = !!useBackup;
        try {
            localStorage.setItem('fanqie_use_backup_api', FANQIE_CONFIG.useBackupApi ? 'true' : 'false');
        } catch (e) {}
        initApiSources();
        console.log('[Fanqie] 切换API模式:', useBackup ? '备用模式(新API, 并发3)' : '主模式(新API, 并发4)');
        return FANQIE_CONFIG.useBackupApi;
    };

    // 获取当前API模式
    NR.fanqieIsBackupApi = function() {
        return FANQIE_CONFIG.useBackupApi;
    };

    // 确保配置已加载
    function ensureConfigLoaded() {
        if (!FANQIE_CONFIG.apiSources || FANQIE_CONFIG.apiSources.length === 0 || !FANQIE_CONFIG.apiBaseUrl) {
            initApiSources();
        }
        return Promise.resolve();
    }

    function hasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function isSuccessCode(code) {
        return code === undefined || code === null || String(code) === '200' || String(code) === '0';
    }

    function getOuterPayload(data) {
        if (!data) return null;
        if (!isSuccessCode(data.code)) {
            throw new Error(data.message || '番茄接口返回失败');
        }
        return hasOwn(data, 'data') && data.data !== null && data.data !== undefined ? data.data : data;
    }

    function unwrapInnerPayload(payload) {
        if (!payload || typeof payload !== 'object') return payload;
        if (!isSuccessCode(payload.code)) {
            throw new Error(payload.message || '番茄接口返回失败');
        }
        if (hasOwn(payload, 'data') && payload.data !== null && payload.data !== undefined) {
            return payload.data;
        }
        return payload;
    }

    function pick(obj, fields) {
        if (!obj) return undefined;
        for (var i = 0; i < fields.length; i++) {
            var value = obj[fields[i]];
            if (value !== undefined && value !== null && value !== '') return value;
        }
        return undefined;
    }

    function toInt(value) {
        var num = parseInt(value || 0, 10);
        return isNaN(num) ? 0 : num;
    }

    function normalizeStatus(status) {
        var statusCode = String(status === undefined || status === null ? '' : status);
        if (statusCode === '0') return '已完结';
        if (statusCode === '1') return '连载中';
        return '';
    }

    function flattenArrays(list) {
        var result = [];
        if (!Array.isArray(list)) return result;
        list.forEach(function(item) {
            if (Array.isArray(item)) {
                result = result.concat(flattenArrays(item));
            } else {
                result.push(item);
            }
        });
        return result;
    }

    function normalizeBookSearchItems(items) {
        var results = [];
        var seen = {};
        if (!Array.isArray(items)) return results;

        items.forEach(function(item) {
            var bookDataList = item && item.book_data;
            if (!Array.isArray(bookDataList)) {
                bookDataList = bookDataList ? [bookDataList] : [item];
            }

            bookDataList.forEach(function(book) {
                var bookId = pick(book, ['book_id', 'search_result_id', 'recommend_group_id']) || pick(item, ['book_id', 'search_result_id']);
                if (!bookId || seen[String(bookId)]) return;
                seen[String(bookId)] = true;

                results.push({
                    id: String(bookId),
                    name: pick(book, ['book_name', 'raw_book_name', 'original_book_name', 'name', 'title']) || '未知书名',
                    author: pick(book, ['author', 'author_name']) || '未知作者',
                    cover: pick(book, ['thumb_url', 'cover', 'expand_thumb_url', 'audio_thumb_url_hd']) || '',
                    description: pick(book, ['abstract', 'book_abstract_v2', 'description', 'intro']) || '',
                    wordCount: toInt(pick(book, ['word_number', 'word_count', 'words'])),
                    chapterCount: toInt(pick(book, ['serial_count', 'chapter_count', 'chapterCount'])),
                    status: normalizeStatus(pick(book, ['creation_status', 'status', 'update_status'])),
                    category: pick(book, ['category', 'pure_category_tags', 'tags', 'genre']) || ''
                });
            });
        });

        return results;
    }

    function parseSearchPayload(data) {
        var payload = getOuterPayload(data);
        var searchRoot = payload && payload.search_tabs ? payload : unwrapInnerPayload(payload);
        var searchTabs = searchRoot && Array.isArray(searchRoot.search_tabs) ? searchRoot.search_tabs : [];
        var items = [];

        searchTabs.forEach(function(tab) {
            if (String(tab.tab_type) !== '3' && tab.title !== '书籍') return;
            if (Array.isArray(tab.data)) {
                items = items.concat(tab.data);
            }
        });

        return normalizeBookSearchItems(items);
    }

    function searchByNativeBridge(keyword) {
        if (!window.NiuniuFanqie || typeof window.NiuniuFanqie.search !== 'function') {
            return Promise.resolve(null);
        }

        return new Promise(function(resolve) {
            try {
                var raw = window.NiuniuFanqie.search(keyword);
                var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (!data || data.error) {
                    console.warn('[Fanqie] 原生搜索失败:', data && data.error ? data.error : 'empty response');
                    resolve(null);
                    return;
                }

                var results = normalizeBookSearchItems(Array.isArray(data.items) ? data.items : []);
                if (results.length === 0 && data.raw) {
                    try {
                        results = parseSearchPayload({ code: 200, data: data.raw });
                    } catch (e) {
                        console.warn('[Fanqie] 原生搜索raw解析失败:', e.message);
                    }
                }

                console.log('[Fanqie] 原生搜索解析到', results.length, '本书');
                resolve(results.length > 0 ? results : null);
            } catch (e) {
                console.warn('[Fanqie] 原生搜索异常:', e.message);
                resolve(null);
            }
        });
    }

    function findArrayByKeys(obj, keys, depth) {
        if (!obj || typeof obj !== 'object' || depth < 0) return null;
        for (var i = 0; i < keys.length; i++) {
            if (Array.isArray(obj[keys[i]])) return obj[keys[i]];
        }
        var objKeys = Object.keys(obj);
        for (var j = 0; j < objKeys.length; j++) {
            var child = obj[objKeys[j]];
            if (child && typeof child === 'object') {
                var found = findArrayByKeys(child, keys, depth - 1);
                if (found) return found;
            }
        }
        return null;
    }

    function extractContentText(data) {
        var payload = getOuterPayload(data);
        var roots = [payload, unwrapInnerPayload(payload)];
        function readFrom(obj, depth) {
            if (!obj || depth < 0) return '';
            if (typeof obj === 'string') return obj;
            if (typeof obj !== 'object') return '';
            var direct = pick(obj, ['content', 'text', 'raw', 'html', 'body']);
            if (typeof direct === 'string') return direct;
            if (direct && typeof direct === 'object') {
                var nestedDirect = readFrom(direct, depth - 1);
                if (nestedDirect) return nestedDirect;
            }
            var preferred = ['data', 'chapter', 'item', 'novel_data', 'chapter_data'];
            for (var i = 0; i < preferred.length; i++) {
                if (obj[preferred[i]]) {
                    var nested = readFrom(obj[preferred[i]], depth - 1);
                    if (nested) return nested;
                }
            }
            return '';
        }
        for (var i = 0; i < roots.length; i++) {
            var text = readFrom(roots[i], 4);
            if (text) return text;
        }
        return '';
    }

    // 搜索小说
    NR.fanqieSearch = function(keyword) {
        if (!keyword || !keyword.trim()) {
            return Promise.reject(new Error('请输入搜索关键词'));
        }

        return ensureConfigLoaded().then(function() {
            var urlPath = FANQIE_CONFIG.endpoints.search;
            urlPath += '?key=' + encodeURIComponent(keyword.trim()) + '&tab_type=3&offset=0';

            return searchByNativeBridge(keyword.trim()).then(function(nativeResults) {
                if (nativeResults) return nativeResults;
                return fetchWithFallback(urlPath, { method: 'GET' });
            })
                .then(function(response) {
                    if (Array.isArray(response)) return response;
                    return response.json();
                })
                .then(function(data) {
                    if (Array.isArray(data)) return data;
                    console.log('[Fanqie] 搜索响应:', JSON.stringify(data).substring(0, 500));
                    var results = parseSearchPayload(data);
                    console.log('[Fanqie] 解析到', results.length, '本书');
                    return results;
                });
        });
    };

    // 获取书籍详情
    NR.fanqieGetBookDetail = function(bookId) {
        return ensureConfigLoaded().then(function() {
            var urlPath = FANQIE_CONFIG.endpoints.detail + '?book_id=' + encodeURIComponent(bookId);
            return fetchWithFallback(urlPath, { method: 'GET' })
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    var detail = unwrapInnerPayload(getOuterPayload(data));
                    if (!detail || typeof detail !== 'object') throw new Error('获取书籍详情失败');
                    return {
                        id: String(pick(detail, ['book_id', 'id']) || bookId),
                        name: pick(detail, ['book_name', 'raw_book_name', 'original_book_name', 'name', 'title']) || '未知书名',
                        author: pick(detail, ['author', 'author_name']) || '未知作者',
                        cover: pick(detail, ['thumb_url', 'cover', 'expand_thumb_url', 'audio_thumb_url_hd']) || '',
                        description: pick(detail, ['abstract', 'book_abstract_v2', 'description', 'intro']) || '',
                        wordCount: toInt(pick(detail, ['word_number', 'word_count', 'words'])),
                        chapterCount: toInt(pick(detail, ['serial_count', 'chapter_count', 'content_chapter_number', 'chapterCount'])),
                        status: normalizeStatus(pick(detail, ['creation_status', 'status', 'update_status']))
                    };
                });
        });
    };

    function parseDirectoryResponse(data) {
        var payload = getOuterPayload(data);
        var roots = [payload, unwrapInnerPayload(payload)];
        var keys = ['lists', 'chapterListWithVolume', 'chapter_list', 'chapterList', 'item_list', 'itemList', 'chapters', 'list', 'items'];
        var rawChapters = null;

        for (var i = 0; i < roots.length; i++) {
            rawChapters = findArrayByKeys(roots[i], keys, 4);
            if (rawChapters && rawChapters.length) break;
        }

        rawChapters = flattenArrays(rawChapters || []);
        return rawChapters.map(function(ch, idx) {
            var id = typeof ch === 'string' ? ch : pick(ch, ['item_id', 'itemId', 'id', 'chapter_id', 'chapterId', 'group_id', 'groupId']);
            if (!id) return null;
            var order = typeof ch === 'object' ? toInt(pick(ch, ['realChapterOrder', 'chapter_order', 'order', 'index'])) : 0;
            return {
                id: String(id),
                title: (typeof ch === 'object' && pick(ch, ['title', 'chapter_title', 'chapterName', 'name'])) || ('第' + (idx + 1) + '章'),
                index: order > 0 ? order - 1 : idx
            };
        }).filter(function(ch) {
            return !!ch;
        }).sort(function(a, b) {
            return a.index - b.index;
        }).map(function(ch, idx) {
            ch.index = idx;
            return ch;
        });
    }

    // 获取章节目录
    NR.fanqieGetDirectory = function(bookId) {
        return ensureConfigLoaded().then(function() {
            var urlPath = FANQIE_CONFIG.endpoints.directory + '?book_id=' + encodeURIComponent(bookId);
            return fetchWithFallback(urlPath, { method: 'GET' })
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    var chapters = parseDirectoryResponse(data);
                    if (chapters.length > 0) return chapters;
                    var fallbackPath = FANQIE_CONFIG.endpoints.book + '?book_id=' + encodeURIComponent(bookId);
                    return fetchWithFallback(fallbackPath, { method: 'GET' })
                        .then(function(response) { return response.json(); })
                        .then(parseDirectoryResponse);
                });
        });
    };

    // 极速下载：获取整本书内容
    function getFullContent(bookId, catalog) {
        var itemIds = Array.isArray(catalog) ? catalog.map(function(ch) { return ch.id; }).filter(Boolean) : [];
        var downloadModes = itemIds.length > 0 ? [
            { tab: '批量', book_id: bookId, item_ids: itemIds.join(',') }
        ] : [
            { tab: '下载', book_id: bookId }
        ];

        function tryDownload(modeIndex, sourceIndex) {
            if (modeIndex >= downloadModes.length) {
                var nextSourceIndex = (sourceIndex + 1) % FANQIE_CONFIG.apiSources.length;
                if (nextSourceIndex !== FANQIE_CONFIG.currentSourceIndex) {
                    FANQIE_CONFIG.currentSourceIndex = nextSourceIndex;
                    FANQIE_CONFIG.apiBaseUrl = FANQIE_CONFIG.apiSources[nextSourceIndex].baseUrl;
                    return tryDownload(0, nextSourceIndex);
                }
                return Promise.resolve(null);
            }

            var mode = downloadModes[modeIndex];
            var urlPath = FANQIE_CONFIG.endpoints.content + '?tab=' + encodeURIComponent(mode.tab) + '&book_id=' + encodeURIComponent(mode.book_id);
            if (mode.item_ids) urlPath += '&item_ids=' + encodeURIComponent(mode.item_ids);
            var url = buildUrl(urlPath);

            console.log('[Fanqie] 极速下载:', url, '模式:', mode.tab);

            return fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
                .then(function(response) {
                    if (response.status === 400) return tryDownload(modeIndex + 1, sourceIndex);
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.json().then(function(data) {
                        var nested = getOuterPayload(data);
                        var innerData = unwrapInnerPayload(nested);
                        if (innerData && typeof innerData === 'object') {
                            var bulkData = innerData.data || innerData.content || innerData;
                            if (bulkData && typeof bulkData === 'object') {
                                var keys = Object.keys(bulkData);
                                if (keys.length > 0 && keys.slice(0, 5).every(function(k) { return /^\d+$/.test(k); })) {
                                    console.log('[Fanqie] 批量模式成功，获取到', keys.length, '章');
                                    return { type: 'bulk', data: bulkData };
                                }
                            }
                        }
                        var text = extractContentText(data);
                        if (typeof text === 'string' && text.length > 1000) {
                            return { type: 'text', data: text };
                        }
                        return tryDownload(modeIndex + 1, sourceIndex);
                    });
                })
                .catch(function(err) {
                    console.warn('[Fanqie] 极速下载失败:', err.message);
                    return tryDownload(modeIndex + 1, sourceIndex);
                });
        }

        return tryDownload(0, FANQIE_CONFIG.currentSourceIndex);
    }

    // 解析整本内容
    function parseFullContentWithCatalog(fullContent, catalog) {
        if (!fullContent || !catalog || catalog.length === 0) return null;

        if (fullContent.type === 'bulk' && fullContent.data) {
            var bulkData = fullContent.data;
            var chapters = [];
            catalog.forEach(function(ch) {
                var itemId = String(ch.id);
                var content = bulkData[itemId];
                if (content) {
                    chapters.push({
                        title: ch.title,
                        content: processContent(typeof content === 'string' ? content : (content.content || content.text || '')),
                        index: ch.index
                    });
                }
            });
            if (chapters.length > 0) {
                chapters.sort(function(a, b) { return a.index - b.index; });
                return chapters;
            }
        }

        var text = fullContent.type === 'text' ? fullContent.data : null;
        if (!text) return null;
        
        var chapters = [];
        var positions = [];
        catalog.forEach(function(ch) {
            var idx = text.indexOf(ch.title);
            if (idx !== -1) {
                positions.push({ title: ch.title, index: ch.index, pos: idx, titleEnd: idx + ch.title.length });
            }
        });
        positions.sort(function(a, b) { return a.pos - b.pos; });
        
        for (var i = 0; i < positions.length; i++) {
            var start = positions[i].titleEnd;
            var end = (i + 1 < positions.length) ? positions[i + 1].pos : text.length;
            chapters.push({
                title: positions[i].title,
                content: processContent(text.substring(start, end).trim()),
                index: positions[i].index
            });
        }
        chapters.sort(function(a, b) { return a.index - b.index; });
        return chapters;
    }

    // 获取单章内容
    function getChapterContent(itemId, retryCount) {
        retryCount = retryCount || 0;
        var maxRetries = 2;

        function tryContentEndpoint(label, urlPath) {
            var url = buildUrl(urlPath);
            return fetch(url, {
                method: 'GET',
                headers: getHeaders()
            })
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function(data) {
                var content = extractContentText(data);
                if (content) console.log('[Fanqie] 章节内容接口成功:', label, itemId);
                return content || '';
            }).catch(function(err) {
                console.warn('[Fanqie] 章节内容接口失败:', label, itemId, err.message);
                return '';
            });
        }

        var endpoints = [
            {
                label: 'raw_full',
                path: FANQIE_CONFIG.endpoints.rawFull + '?item_id=' + encodeURIComponent(itemId)
            },
            {
                label: 'content',
                path: FANQIE_CONFIG.endpoints.content + '?tab=' + encodeURIComponent('小说') + '&item_id=' + encodeURIComponent(itemId)
            },
            {
                label: 'ios',
                path: FANQIE_CONFIG.endpoints.iosContent + '?item_id=' + encodeURIComponent(itemId)
            },
            {
                label: 'chapter',
                path: FANQIE_CONFIG.endpoints.chapter + '?item_id=' + encodeURIComponent(itemId)
            }
        ];

        function tryNext(index) {
            if (index >= endpoints.length) return Promise.resolve('');
            return tryContentEndpoint(endpoints[index].label, endpoints[index].path).then(function(content) {
                if (content && content.length > 0) return content;
                return tryNext(index + 1);
            });
        }

        return tryNext(0).then(function(content) {
            if ((!content || content.length === 0) && retryCount < maxRetries) {
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve(getChapterContent(itemId, retryCount + 1));
                    }, 300 * (retryCount + 1));
                });
            }
            return content || '';
        }).then(function(content) {
            return content || '';
        });
    }

    // 并发下载章节（参照fanqie_flutter的实现）
    function downloadChaptersBatch(chapters, batchSize, onProgress) {
        var results = [];
        var completed = 0;
        var total = chapters.length;
        
        function downloadBatch(startIdx) {
            if (startIdx >= total) return Promise.resolve(results);
            
            var batch = chapters.slice(startIdx, startIdx + batchSize);
            var promises = batch.map(function(ch) {
                return getChapterContent(ch.id).then(function(content) {
                    return { title: ch.title, content: processContent(content), index: ch.index };
                });
            });
            
            return Promise.all(promises).then(function(batchResults) {
                results = results.concat(batchResults);
                completed += batchResults.length;
                if (onProgress) onProgress(completed, total);
                
                // 批次间延迟（参照fanqie_flutter）
                if (startIdx + batchSize < total) {
                    return new Promise(function(resolve) {
                        setTimeout(function() { 
                            resolve(downloadBatch(startIdx + batchSize)); 
                        }, FANQIE_CONFIG.batchDelay);
                    });
                }
                return downloadBatch(startIdx + batchSize);
            });
        }
        
        return downloadBatch(0);
    }

    // 处理章节内容
    function processContent(content) {
        if (!content) return '';
        content = content.replace(/<br\s*\/?>\s*/gi, '\n');
        content = content.replace(/<p[^>]*>\s*/gi, '\n');
        content = content.replace(/<\/p>\s*/gi, '\n');
        content = content.replace(/<[^>]+>/g, '');
        content = content.replace(/[ \t]+/g, ' ');
        content = content.replace(/\n[ \t]+/g, '\n');
        content = content.replace(/[ \t]+\n/g, '\n');
        content = content.replace(/\n{3,}/g, '\n\n');
        var lines = content.split('\n');
        var paragraphs = [];
        lines.forEach(function(line) {
            line = line.trim();
            if (line) paragraphs.push(line);
        });
        return paragraphs.join('\n\n');
    }


    // 下载小说核心函数
    NR.fanqieDownload = function(bookId, progressCallback, format) {
        if (downloadState.isDownloading) {
            return Promise.reject(new Error('已有下载任务在进行中'));
        }

        format = format || getSelectedFormat();
        downloadState.isDownloading = true;
        downloadState.currentBookId = bookId;
        downloadState.progress = 0;
        downloadState.aborted = false;

        var bookInfo = null;
        var chapters = [];
        var batchSize = getBatchSize();

        function updateProgress(percent, message) {
            downloadState.progress = percent;
            if (progressCallback) progressCallback(percent, message);
        }

        return NR.fanqieGetBookDetail(bookId)
            .then(function(detail) {
                if (downloadState.aborted) throw new Error('下载已取消');
                bookInfo = detail;
                updateProgress(10, '获取章节目录...');
                return NR.fanqieGetDirectory(bookId);
            })
            .then(function(directory) {
                if (downloadState.aborted) throw new Error('下载已取消');
                if (!directory || directory.length === 0) throw new Error('获取章节目录失败');
                chapters = directory;
                
                // 直接使用并发下载（参照fanqie_flutter，不使用极速下载）
                console.log('[Fanqie] 并发下载，并发量:', batchSize, '批次延迟:', FANQIE_CONFIG.batchDelay, 'ms');
                updateProgress(15, '并发下载 ' + chapters.length + ' 章 (并发' + batchSize + ')...');
                return downloadChaptersBatch(chapters, batchSize, function(completed, total) {
                    if (downloadState.aborted) return;
                    var percent = 15 + Math.floor((completed / total) * 80);
                    updateProgress(percent, '下载中: ' + completed + '/' + total);
                });
            })
            .then(function(downloadedChapters) {
                if (downloadState.aborted) throw new Error('下载已取消');
                updateProgress(95, '生成' + format.toUpperCase() + '文件...');
                downloadedChapters.sort(function(a, b) { return a.index - b.index; });

                downloadState.isDownloading = false;
                downloadState.currentBookId = null;

                if (format === 'epub') {
                    var epubContent = createEpubContent(bookInfo, downloadedChapters);
                    updateProgress(100, '下载完成');
                    return { bookInfo: bookInfo, content: epubContent, chapterCount: downloadedChapters.length, format: 'epub' };
                } else {
                    var txtContent = bookInfo.name + '\n作者: ' + bookInfo.author + '\n';
                    if (bookInfo.description) txtContent += '\n简介:\n' + bookInfo.description + '\n';
                    txtContent += '\n' + '='.repeat(50) + '\n\n';
                    downloadedChapters.forEach(function(ch) {
                        txtContent += '\n' + ch.title + '\n\n' + ch.content + '\n\n';
                    });
                    updateProgress(100, '下载完成');
                    return { bookInfo: bookInfo, content: txtContent, chapterCount: downloadedChapters.length, format: 'txt' };
                }
            })
            .catch(function(err) {
                downloadState.isDownloading = false;
                downloadState.currentBookId = null;
                throw err;
            });
    };

    // 创建EPUB内容
    function createEpubContent(bookInfo, chapters) {
        var mimetype = 'application/epub+zip';
        var containerXml = '<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n  <rootfiles>\n    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n  </rootfiles>\n</container>';
        
        function escapeXml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        
        var bookId = 'fanqie_' + Date.now();
        var manifestItems = '    <item id="intro" href="intro.xhtml" media-type="application/xhtml+xml"/>\n';
        var spineItems = '    <itemref idref="intro"/>\n';
        
        chapters.forEach(function(ch, idx) {
            var chapterId = 'chapter_' + (idx + 1);
            manifestItems += '    <item id="' + chapterId + '" href="' + chapterId + '.xhtml" media-type="application/xhtml+xml"/>\n';
            spineItems += '    <itemref idref="' + chapterId + '"/>\n';
        });
        
        var contentOpf = '<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <dc:identifier id="BookId">' + escapeXml(bookId) + '</dc:identifier>\n    <dc:title>' + escapeXml(bookInfo.name) + '</dc:title>\n    <dc:creator>' + escapeXml(bookInfo.author) + '</dc:creator>\n    <dc:language>zh-CN</dc:language>\n    <meta property="dcterms:modified">' + new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') + '</meta>\n  </metadata>\n  <manifest>\n    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n' + manifestItems + '  </manifest>\n  <spine>\n' + spineItems + '  </spine>\n</package>';
        
        var navItems = '<li><a href="intro.xhtml">书籍信息</a></li>\n';
        chapters.forEach(function(ch, idx) {
            navItems += '      <li><a href="chapter_' + (idx + 1) + '.xhtml">' + escapeXml(ch.title) + '</a></li>\n';
        });
        var navXhtml = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n<head><title>目录</title></head>\n<body>\n  <nav epub:type="toc">\n    <h1>目录</h1>\n    <ol>\n      ' + navItems + '    </ol>\n  </nav>\n</body>\n</html>';
        
        var introContent = '<h1>' + escapeXml(bookInfo.name) + '</h1>\n<p><strong>作者：</strong>' + escapeXml(bookInfo.author) + '</p>\n';
        if (bookInfo.description) {
            introContent += '<hr/>\n<h3>简介</h3>\n';
            bookInfo.description.split('\n').forEach(function(line) {
                if (line.trim()) introContent += '<p>' + escapeXml(line.trim()) + '</p>\n';
            });
        }
        var introXhtml = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head><title>' + escapeXml(bookInfo.name) + '</title></head>\n<body>\n' + introContent + '</body>\n</html>';
        
        var chapterFiles = [];
        chapters.forEach(function(ch, idx) {
            var paragraphs = (ch.content || '').split('\n\n');
            var htmlContent = '';
            paragraphs.forEach(function(p) {
                if (p.trim()) htmlContent += '<p>' + escapeXml(p.trim()) + '</p>\n';
            });
            chapterFiles.push({
                name: 'chapter_' + (idx + 1) + '.xhtml',
                content: '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head><title>' + escapeXml(ch.title) + '</title></head>\n<body>\n<h1>' + escapeXml(ch.title) + '</h1>\n' + htmlContent + '</body>\n</html>'
            });
        });
        
        return { isEpub: true, mimetype: mimetype, container: containerXml, contentOpf: contentOpf, nav: navXhtml, intro: introXhtml, chapters: chapterFiles, bookInfo: bookInfo };
    }

    // 打包EPUB
    function packEpubToBlob(epubData) {
        if (typeof JSZip === 'undefined') return null;
        var zip = new JSZip();
        zip.file('mimetype', epubData.mimetype, { compression: 'STORE' });
        zip.file('META-INF/container.xml', epubData.container);
        zip.file('OEBPS/content.opf', epubData.contentOpf);
        zip.file('OEBPS/nav.xhtml', epubData.nav);
        zip.file('OEBPS/intro.xhtml', epubData.intro);
        epubData.chapters.forEach(function(ch) { zip.file('OEBPS/' + ch.name, ch.content); });
        return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    }

    // 取消下载
    NR.fanqieCancelDownload = function() { downloadState.aborted = true; };

    // 搜索并导入
    NR.fanqieSearchAndImport = function(keyword) { return NR.fanqieSearch(keyword); };

    // 下载并导入书架
    NR.fanqieDownloadAndImport = function(bookId, progressCallback) {
        var format = getSelectedFormat();
        return NR.fanqieDownload(bookId, progressCallback, format)
            .then(function(result) {
                var fileExt = result.format === 'epub' ? '.epub' : '.txt';
                var fileName = result.bookInfo.name.replace(/[\\/:*?"<>|]/g, '_') + fileExt;
                
                if (result.format === 'epub' && result.content && result.content.isEpub) {
                    return packEpubToBlob(result.content).then(function(blob) {
                        if (!blob) throw new Error('EPUB打包失败');
                        return NR.storageDB.saveBook({ id: fileName, content: blob, isEpub: true });
                    }).then(function() {
                        var existingBook = NR.state.bookshelf.find(function(b) { return b.name === fileName; });
                        if (!existingBook) {
                            NR.state.bookshelf.push({ name: fileName, cover: result.bookInfo.cover || null, author: result.bookInfo.author, chapterCount: result.chapterCount, tags: ['番茄小说', 'EPUB'] });
                            NR.saveBookshelf();
                        }
                        return { fileName: fileName, bookInfo: result.bookInfo, chapterCount: result.chapterCount, format: 'epub' };
                    });
                }
                
                return NR.storageDB.saveBook({ id: fileName, content: result.content }).then(function() {
                    var existingBook = NR.state.bookshelf.find(function(b) { return b.name === fileName; });
                    if (!existingBook) {
                        NR.state.bookshelf.push({ name: fileName, cover: result.bookInfo.cover || null, author: result.bookInfo.author, chapterCount: result.chapterCount, tags: ['番茄小说'] });
                        NR.saveBookshelf();
                    }
                    return { fileName: fileName, bookInfo: result.bookInfo, chapterCount: result.chapterCount, format: 'txt' };
                });
            });
    };

    // 初始化
    NR.initFanqie = initFanqieConfig;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFanqieConfig);
    } else {
        initFanqieConfig();
    }
})();
