// Book source discovery, search, management and online book import UI.
(function() {
    'use strict';
    var NR = window.NovelReader;
    if (!NR || !NR.BookSourceEngine || !NR.BookSourceImporter) return;

    var state = {
        initialized: false,
        sources: [],
        activeTab: 'explore',
        activeSourceUrl: '',
        activeKind: null,
        explorePage: 1,
        exploreBusy: false,
        searchBusy: false,
        selectedFiles: [],
        currentDetail: null,
        downloadController: null,
        backgroundDownload: null,
        onlineReader: null
    };
    var engine = new NR.BookSourceEngine();
    var el = {};

    function byId(id) { return document.getElementById(id); }
    function escapeHtml(value) { return NR.escapeHtml ? NR.escapeHtml(String(value || '')) : String(value || '').replace(/[&<>"']/g, function(ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]; }); }
    function sourceByUrl(url) { return state.sources.find(function(source) { return source.bookSourceUrl === url; }); }
    function activeSource() { return sourceByUrl(state.activeSourceUrl) || state.sources.find(function(source) { return source.enabledExplore && source.exploreUrl; }) || state.sources[0] || null; }

    function cacheElements() {
        [
            'book-source-view', 'btn-book-source', 'source-back', 'source-page-title', 'source-refresh', 'source-import-open',
            'source-explore-filter', 'source-explore-selector', 'source-explore-kinds', 'source-explore-results', 'source-explore-more',
            'source-search-form', 'source-search-keyword', 'source-search-scope', 'source-search-summary', 'source-search-results',
            'source-manage-filter', 'source-group-filter', 'source-manage-summary', 'source-list',
            'source-detail', 'source-detail-back', 'source-detail-content', 'source-toast',
            'source-import-modal', 'source-import-close', 'source-import-text', 'source-import-file', 'source-import-file-names', 'source-import-confirm',
            'source-download-modal', 'source-download-title', 'source-download-progress', 'source-download-status', 'source-download-cancel'
        ].forEach(function(id) { el[id] = byId(id); });
        el.tabs = Array.from(document.querySelectorAll('.source-tab'));
        el.panels = Array.from(document.querySelectorAll('.source-panel'));
    }

    function toast(message, isError) {
        el['source-toast'].textContent = message;
        el['source-toast'].classList.toggle('error', !!isError);
        el['source-toast'].classList.add('show');
        clearTimeout(toast.timer);
        toast.timer = setTimeout(function() { el['source-toast'].classList.remove('show'); }, 2800);
    }

    function emptyState(icon, title, action) {
        return '<div class="source-empty"><i class="fa-solid ' + icon + '"></i><strong>' + escapeHtml(title) + '</strong>' +
            (action ? '<button type="button" class="source-primary-button" data-source-action="' + escapeHtml(action) + '">导入书源</button>' : '') + '</div>';
    }

    function setBusy(container, text) {
        container.innerHTML = '<div class="source-loading"><span class="source-spinner"></span><span>' + escapeHtml(text || '加载中...') + '</span></div>';
    }

    function showView() {
        NR.els.readerView.style.display = 'none';
        NR.els['bookshelf-view'].style.display = 'none';
        el['book-source-view'].style.display = 'flex';
        closeDetail();
        switchTab(state.activeTab);
    }

    function hideView() {
        closeDetail();
        NR.showBookshelfView();
    }

    function switchTab(tab) {
        state.activeTab = tab;
        el.tabs.forEach(function(button) { button.classList.toggle('active', button.dataset.sourceTab === tab); });
        el.panels.forEach(function(panel) { panel.classList.toggle('active', panel.dataset.sourcePanel === tab); });
        el['source-page-title'].textContent = tab === 'explore' ? '发现' : tab === 'search' ? '搜索' : '书源管理';
        if (tab === 'explore') renderExplore();
        else if (tab === 'manage') renderManage();
    }

    async function loadSources() {
        try {
            state.sources = (await NR.storageDB.loadBookSources()).map(NR.BookSourceEngine.normalizeSource);
        } catch (e) {
            console.error('[BookSource] 加载书源失败:', e);
            state.sources = [];
        }
        state.sources.sort(function(a, b) { return (a.customOrder || 0) - (b.customOrder || 0) || a.bookSourceName.localeCompare(b.bookSourceName, 'zh-CN'); });
        if (!sourceByUrl(state.activeSourceUrl)) {
            var first = state.sources.find(function(source) { return source.enabledExplore && source.exploreUrl; }) || state.sources[0];
            state.activeSourceUrl = first ? first.bookSourceUrl : '';
        }
        renderSourceSelector();
        renderManage();
    }

    function renderSourceSelector() {
        var exploreSources = state.sources.filter(function(source) { return source.enabled && source.enabledExplore && source.exploreUrl; });
        el['source-explore-selector'].innerHTML = '';
        if (!exploreSources.length) {
            el['source-explore-selector'].innerHTML = '<option value="">暂无发现书源</option>';
            return;
        }
        exploreSources.forEach(function(source) {
            var option = document.createElement('option');
            option.value = source.bookSourceUrl;
            option.textContent = source.bookSourceName;
            el['source-explore-selector'].appendChild(option);
        });
        if (!exploreSources.some(function(source) { return source.bookSourceUrl === state.activeSourceUrl; })) state.activeSourceUrl = exploreSources[0].bookSourceUrl;
        el['source-explore-selector'].value = state.activeSourceUrl;
    }

    function kindControl(kind, index) {
        var type = String(kind.type || 'url').toLowerCase();
        if (type === 'text') {
            return '<label class="source-kind-input"><span>' + escapeHtml(kind.title) + '</span><input type="text" data-kind-index="' + index + '" value="' + escapeHtml(kind.default || '') + '"></label>';
        }
        if (type === 'select') {
            var chars = Array.isArray(kind.chars) ? kind.chars : [];
            return '<label class="source-kind-select"><span>' + escapeHtml(kind.title) + '</span><select data-kind-index="' + index + '">' + chars.map(function(value) { return '<option' + (value === kind.default ? ' selected' : '') + '>' + escapeHtml(value) + '</option>'; }).join('') + '</select></label>';
        }
        if (type === 'toggle') {
            return '<button type="button" class="source-kind-pill source-kind-toggle" data-kind-index="' + index + '">' + escapeHtml(kind.title) + '</button>';
        }
        return '<button type="button" class="source-kind-pill' + (state.activeKind && state.activeKind._index === index ? ' active' : '') + '" data-kind-index="' + index + '">' + escapeHtml(kind.title) + '</button>';
    }

    function renderExplore() {
        renderSourceSelector();
        var source = activeSource();
        if (!source || !source.exploreUrl) {
            el['source-explore-kinds'].innerHTML = '';
            el['source-explore-results'].innerHTML = emptyState('fa-file-circle-plus', '导入带发现规则的书源', 'import');
            el['source-explore-more'].hidden = true;
            return;
        }
        var filter = el['source-explore-filter'].value.trim().toLowerCase();
        var kinds;
        try { kinds = engine.parseExploreKinds(source); } catch (e) {
            el['source-explore-kinds'].innerHTML = '';
            el['source-explore-results'].innerHTML = emptyState('fa-triangle-exclamation', e.message);
            return;
        }
        kinds = kinds.map(function(kind, index) { return Object.assign({ _index: index }, kind); });
        var shownKinds = filter ? kinds.filter(function(kind) { return String(kind.title).toLowerCase().includes(filter); }) : kinds;
        el['source-explore-kinds'].innerHTML = shownKinds.map(function(kind) { return kindControl(kind, kind._index); }).join('');
        el['source-explore-kinds'].dataset.kinds = JSON.stringify(kinds);
        if (!kinds.length) {
            el['source-explore-results'].innerHTML = emptyState('fa-compass', '这个书源没有发现分类');
            el['source-explore-more'].hidden = true;
            return;
        }
        if (!state.activeKind || !kinds.some(function(kind) { return kind._index === state.activeKind._index; })) {
            state.activeKind = kinds.find(function(kind) { return (kind.type || 'url') === 'url' && kind.url; }) || null;
            if (state.activeKind) loadExplore(true);
        }
    }

    async function loadExplore(reset) {
        var source = activeSource();
        if (!source || !state.activeKind || !state.activeKind.url || state.exploreBusy) return;
        if (reset) {
            state.explorePage = 1;
            setBusy(el['source-explore-results'], '正在加载 ' + state.activeKind.title);
        }
        state.exploreBusy = true;
        el['source-explore-more'].disabled = true;
        try {
            var books = await engine.explore(source, state.activeKind.url, state.explorePage);
            if (reset) el['source-explore-results'].innerHTML = '';
            appendBooks(el['source-explore-results'], books);
            if (!books.length && reset) el['source-explore-results'].innerHTML = emptyState('fa-book-open', '这个分类暂时没有内容');
            el['source-explore-more'].hidden = books.length === 0;
            state.explorePage++;
        } catch (e) {
            console.error('[BookSource] 发现加载失败:', e);
            if (reset) el['source-explore-results'].innerHTML = emptyState('fa-triangle-exclamation', '加载失败：' + e.message);
            else toast('加载失败：' + e.message, true);
            el['source-explore-more'].hidden = true;
        } finally {
            state.exploreBusy = false;
            el['source-explore-more'].disabled = false;
        }
    }

    function bookCard(book) {
        var data = encodeURIComponent(JSON.stringify(book));
        var meta = [book.author, book.kind, book.wordCount, book.lastChapter].filter(Boolean);
        return '<article class="source-book-item" data-book="' + data + '">' +
            '<div class="source-book-cover">' + (book.coverUrl ? '<img src="' + escapeHtml(book.coverUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span>' + escapeHtml((book.name || '书').slice(0, 4)) + '</span>') + '</div>' +
            '<div class="source-book-copy"><h3>' + escapeHtml(book.name || '未命名') + '</h3><p class="source-book-meta">' + escapeHtml(meta.join(' · ') || '信息暂无') + '</p>' +
            (book.intro ? '<p class="source-book-intro">' + escapeHtml(book.intro) + '</p>' : '') +
            '<span class="source-badge">' + escapeHtml(book.sourceName || '') + '</span></div><i class="fa-solid fa-chevron-right source-chevron"></i></article>';
    }

    function appendBooks(container, books) {
        if (!books || !books.length) return;
        container.insertAdjacentHTML('beforeend', books.map(bookCard).join(''));
    }

    async function searchSources(keyword) {
        if (state.searchBusy) return;
        var scope = el['source-search-scope'].value;
        var sources = state.sources.filter(function(source) { return source.enabled && (source.searchUrl || source.mainJs); });
        if (scope === 'current') {
            var current = activeSource();
            sources = current && current.enabled && (current.searchUrl || current.mainJs) ? [current] : [];
        }
        if (!sources.length) {
            el['source-search-results'].innerHTML = emptyState('fa-file-circle-plus', '没有已启用的搜索书源', 'import');
            return;
        }
        state.searchBusy = true;
        el['source-search-results'].innerHTML = '';
        el['source-search-summary'].textContent = '0 / ' + sources.length + ' 个书源';
        var completed = 0;
        var resultCount = 0;
        var failureCount = 0;
        var seen = new Set();
        var cursor = 0;

        async function worker() {
            while (cursor < sources.length) {
                var source = sources[cursor++];
                try {
                    var books = await engine.search(source, keyword, 1);
                    books = books.filter(function(book) {
                        var key = [book.name, book.author, book.bookUrl].join('|');
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    resultCount += books.length;
                    appendBooks(el['source-search-results'], books);
                } catch (e) {
                    failureCount++;
                    console.warn('[BookSource] 搜索失败:', source.bookSourceName, e);
                } finally {
                    completed++;
                    el['source-search-summary'].textContent = completed + ' / ' + sources.length + ' 个书源 · ' + resultCount + ' 本' + (failureCount ? ' · ' + failureCount + ' 失败' : '');
                }
            }
        }

        try {
            await Promise.all(Array.from({ length: Math.min(4, sources.length) }, worker));
            if (!resultCount) el['source-search-results'].innerHTML = emptyState('fa-magnifying-glass', '没有找到相关书籍');
        } finally {
            state.searchBusy = false;
        }
    }

    function groupsForSource(source) {
        return String(source.bookSourceGroup || '').split(/[,;，；\n]+/).map(function(group) { return group.trim(); }).filter(Boolean);
    }

    function renderManage() {
        if (!el['source-list']) return;
        var groups = new Set();
        state.sources.forEach(function(source) { groupsForSource(source).forEach(function(group) { groups.add(group); }); });
        var selectedGroup = el['source-group-filter'].value;
        el['source-group-filter'].innerHTML = '<option value="">全部分组</option>' + Array.from(groups).sort().map(function(group) { return '<option value="' + escapeHtml(group) + '">' + escapeHtml(group) + '</option>'; }).join('');
        el['source-group-filter'].value = selectedGroup;
        var filter = el['source-manage-filter'].value.trim().toLowerCase();
        var sources = state.sources.filter(function(source) {
            return (!filter || (source.bookSourceName + ' ' + source.bookSourceUrl + ' ' + source.bookSourceGroup).toLowerCase().includes(filter)) &&
                (!selectedGroup || groupsForSource(source).includes(selectedGroup));
        });
        var enabled = state.sources.filter(function(source) { return source.enabled; }).length;
        el['source-manage-summary'].innerHTML = '<span>共 ' + state.sources.length + ' 个</span><span>已启用 ' + enabled + ' 个</span>';
        if (!sources.length) {
            el['source-list'].innerHTML = state.sources.length ? emptyState('fa-filter', '没有匹配的书源') : emptyState('fa-file-circle-plus', '还没有导入书源', 'import');
            return;
        }
        el['source-list'].innerHTML = sources.map(function(source) {
            var encoded = encodeURIComponent(source.bookSourceUrl);
            var capabilities = [(source.searchUrl || source.mainJs) ? '搜索' : '', source.exploreUrl ? '发现' : '', source.mainJs ? 'JS' : '', source.bookSourceType === 1 ? '音频' : source.bookSourceType === 2 ? '图片' : '文本'].filter(Boolean);
            return '<article class="source-manage-item" data-source-url="' + encoded + '">' +
                '<label class="source-switch" title="启用书源"><input type="checkbox" data-source-toggle="enabled"' + (source.enabled ? ' checked' : '') + '><span></span></label>' +
                '<div class="source-manage-copy"><h3>' + escapeHtml(source.bookSourceName) + '</h3><p>' + escapeHtml(source.bookSourceUrl) + '</p><div>' + capabilities.map(function(item) { return '<span class="source-badge">' + item + '</span>'; }).join('') + '</div></div>' +
                '<div class="source-manage-actions"><button type="button" class="source-icon-button" data-source-action="explore" title="打开发现"' + (!source.exploreUrl ? ' disabled' : '') + '><i class="fa-solid fa-compass"></i></button>' +
                '<button type="button" class="source-icon-button" data-source-action="export" title="导出"><i class="fa-solid fa-file-export"></i></button>' +
                '<button type="button" class="source-icon-button danger" data-source-action="delete" title="删除"><i class="fa-solid fa-trash"></i></button></div></article>';
        }).join('');
    }

    async function updateSource(source, field, value) {
        source[field] = value;
        source.lastUpdateTime = Date.now();
        await NR.storageDB.saveBookSource(source);
        renderSourceSelector();
        renderManage();
    }

    async function deleteSource(source) {
        if (!confirm('确定删除书源“' + source.bookSourceName + '”吗？')) return;
        await NR.storageDB.deleteBookSource(source.bookSourceUrl);
        state.sources = state.sources.filter(function(item) { return item.bookSourceUrl !== source.bookSourceUrl; });
        if (state.activeSourceUrl === source.bookSourceUrl) state.activeSourceUrl = '';
        renderSourceSelector();
        renderManage();
        toast('已删除书源');
    }

    function exportSource(source) {
        var blob = new Blob([JSON.stringify(source, null, 2)], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = source.bookSourceName.replace(/[\\/:*?"<>|]/g, '_') + '.json';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }

    function openImport() {
        el['source-import-modal'].style.display = 'flex';
        setTimeout(function() { el['source-import-text'].focus(); }, 30);
    }

    function closeImport() {
        el['source-import-modal'].style.display = 'none';
        state.selectedFiles = [];
        el['source-import-file'].value = '';
        el['source-import-file-names'].textContent = '';
    }

    async function readImportFile(file) {
        if (/\.gz$/i.test(file.name) || file.type === 'application/gzip') {
            if (typeof DecompressionStream === 'undefined') throw new Error(file.name + '：当前系统不支持 GZIP 解压');
            var stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
            return new Response(stream).text();
        }
        return file.text();
    }

    async function importSources() {
        var inputs = [];
        var pasted = el['source-import-text'].value.trim();
        if (pasted) inputs.push(pasted);
        for (var i = 0; i < state.selectedFiles.length; i++) inputs.push(await readImportFile(state.selectedFiles[i]));
        if (!inputs.length) {
            toast('请粘贴内容或选择文件', true);
            return;
        }
        el['source-import-confirm'].disabled = true;
        el['source-import-confirm'].innerHTML = '<span class="source-spinner small"></span> 导入中';
        try {
            var importer = new NR.BookSourceImporter(async function(url) {
                var response = await engine.transport.request({ url: url, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json,text/plain,*/*' }, timeout: 30000 });
                return response.body;
            });
            var nested = [];
            for (var n = 0; n < inputs.length; n++) nested.push.apply(nested, await importer.parse(inputs[n]));
            var map = new Map(state.sources.map(function(source) { return [source.bookSourceUrl, source]; }));
            nested.forEach(function(source) { map.set(source.bookSourceUrl, source); });
            await NR.storageDB.saveBookSources(nested);
            state.sources = Array.from(map.values());
            closeImport();
            await loadSources();
            switchTab('manage');
            toast('已导入或更新 ' + nested.length + ' 个书源');
        } catch (e) {
            console.error('[BookSource] 导入失败:', e);
            toast('导入失败：' + e.message, true);
        } finally {
            el['source-import-confirm'].disabled = false;
            el['source-import-confirm'].innerHTML = '<i class="fa-solid fa-file-import"></i> 导入';
        }
    }

    async function openBookDetail(book) {
        var source = sourceByUrl(book.sourceUrl);
        if (!source) {
            toast('找不到这本书对应的书源', true);
            return;
        }
        state.currentDetail = { source: source, book: book, chapters: [] };
        el['source-detail'].hidden = false;
        setBusy(el['source-detail-content'], '正在获取书籍详情');
        try {
            var info = await engine.bookInfo(source, book);
            state.currentDetail.book = info;
            renderBookDetail(info, [], true);
            var chapters = await engine.toc(source, info, function(count) {
                var status = byId('source-detail-toc-status');
                if (status) status.textContent = '已获取 ' + count + ' 章';
            });
            state.currentDetail.chapters = chapters;
            renderBookDetail(info, chapters, false);
        } catch (e) {
            console.error('[BookSource] 详情加载失败:', e);
            el['source-detail-content'].innerHTML = emptyState('fa-triangle-exclamation', '详情加载失败：' + e.message);
        }
    }

    function renderBookDetail(book, chapters, loadingToc) {
        var source = state.currentDetail.source;
        var tags = String(book.kind || '').split(/[,/|，、\s]+/).filter(Boolean).slice(0, 8);
        var existingName = onlineFileName(book);
        var exists = NR.state.bookshelf.some(function(item) { return item.name === existingName; });
        el['source-detail-content'].innerHTML = '<section class="source-detail-hero">' +
            '<div class="source-detail-cover">' + (book.coverUrl ? '<img src="' + escapeHtml(book.coverUrl) + '" alt="" referrerpolicy="no-referrer">' : '<span>' + escapeHtml((book.name || '书').slice(0, 4)) + '</span>') + '</div>' +
            '<div class="source-detail-copy"><h1>' + escapeHtml(book.name || '未命名') + '</h1><p>' + escapeHtml(book.author || '作者未知') + '</p><span class="source-badge">' + escapeHtml(source.bookSourceName) + '</span>' +
            (book.wordCount ? '<span class="source-badge">' + escapeHtml(book.wordCount) + '</span>' : '') + '</div></section>' +
            (tags.length ? '<div class="source-detail-tags">' + tags.map(function(tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('') + '</div>' : '') +
            '<p class="source-detail-intro">' + escapeHtml(book.intro || '暂无简介') + '</p>' +
            '<div class="source-detail-actions"><button type="button" class="source-primary-button" data-detail-action="read"' + (!chapters.length ? ' disabled' : '') + '><i class="fa-solid fa-book-open"></i> ' + (exists ? '更新并阅读' : '开始阅读') + '</button>' +
            '<button type="button" class="source-secondary-button" data-detail-action="shelf"' + (!chapters.length ? ' disabled' : '') + '><i class="fa-solid fa-bookmark"></i> ' + (exists ? '更新缓存' : '加入书架') + '</button></div>' +
            '<section class="source-toc-section"><div class="source-toc-heading"><h2>目录</h2><span id="source-detail-toc-status">' + (loadingToc ? '获取中...' : chapters.length + ' 章') + '</span></div>' +
            '<ol class="source-toc-list">' + chapters.map(function(chapter, index) { return '<li><span>' + (index + 1) + '</span><p>' + escapeHtml(chapter.title) + '</p></li>'; }).join('') + '</ol></section>';
    }

    function closeDetail() {
        el['source-detail'].hidden = true;
        el['source-detail-content'].innerHTML = '';
        state.currentDetail = null;
    }

    function onlineFileName(book) {
        var cleanName = String(book.name || '网络小说').replace(/[\\/:*?"<>|]/g, '_').trim();
        var cleanAuthor = String(book.author || '').replace(/[\\/:*?"<>|]/g, '_').trim();
        return cleanName + (cleanAuthor ? ' - ' + cleanAuthor : '') + '.txt';
    }

    function formatChapter(chapter, content) {
        if (chapter.isVolume) return chapter.title;
        return chapter.title + '\n\n' + (content || '[本章暂无可用正文]');
    }

    function snapshotOnlineBook(book) {
        var snapshot = {};
        ['name', 'author', 'intro', 'kind', 'wordCount', 'lastChapter', 'updateTime', 'bookUrl', 'tocUrl', 'coverUrl', 'variable', 'sourceUrl', 'sourceName'].forEach(function(key) {
            if (book && book[key] !== undefined && book[key] !== null) snapshot[key] = book[key];
        });
        return snapshot;
    }

    function snapshotOnlineChapters(chapters) {
        return (chapters || []).map(function(chapter, index) {
            return {
                title: String(chapter.title || ('第 ' + (index + 1) + ' 章')),
                url: chapter.url || '',
                index: Number.isFinite(Number(chapter.index)) ? Number(chapter.index) : index,
                isVolume: !!chapter.isVolume
            };
        });
    }

    function buildOnlineSource(source, book, chapters, cachedChapters, status, nextIndex, sessionInfo) {
        sessionInfo = sessionInfo || {};
        var result = {
            sourceUrl: source.bookSourceUrl,
            sourceName: source.bookSourceName,
            bookUrl: book.bookUrl,
            tocUrl: book.tocUrl,
            totalChapters: chapters.length,
            cachedChapters: cachedChapters,
            downloadState: status,
            nextIndex: Number.isFinite(Number(nextIndex)) ? Number(nextIndex) : cachedChapters,
            book: snapshotOnlineBook(book),
            chapters: snapshotOnlineChapters(chapters),
            cachedAt: Date.now()
        };
        if (Number.isFinite(Number(sessionInfo.currentIndex))) result.currentIndex = Number(sessionInfo.currentIndex);
        if (Array.isArray(sessionInfo.loadedIndexes)) result.loadedIndexes = sessionInfo.loadedIndexes.slice();
        return result;
    }

    function buildOnlineMetadata(source, book, chapters, fileName, cachedChapters, status, nextIndex, sessionInfo) {
        return {
            name: fileName,
            cover: book.coverUrl || null,
            author: book.author || '未知',
            chapterCount: chapters.filter(function(chapter) { return !chapter.isVolume; }).length,
            cachedChapterCount: cachedChapters,
            downloadState: status,
            tags: Array.from(new Set(['网络书源', source.bookSourceName].concat(String(book.kind || '').split(/[,/|，、\s]+/).filter(Boolean).slice(0, 5)))),
            onlineSource: buildOnlineSource(source, book, chapters, cachedChapters, status, nextIndex, sessionInfo)
        };
    }

    function saveShelfMetadata(metadata) {
        var index = NR.state.bookshelf.findIndex(function(item) { return item.name === metadata.name; });
        if (index >= 0) NR.state.bookshelf[index] = metadata;
        else NR.state.bookshelf.push(metadata);
        NR.saveBookshelf();
    }

    function refreshOpenReader(fileName, content) {
        if (NR.state.currentFileName !== fileName || !NR.els.readerView || NR.els.readerView.style.display === 'none') return Promise.resolve();
        var targetPage = NR.state.currentPage || 1;
        NR.state.currentFileContent = content;
        NR.prepareContent(content);
        return NR.paginate().then(function() {
            NR.state.currentPage = Math.max(1, Math.min(targetPage, NR.state.totalPages || 1));
            NR.updateDOMPages();
            NR.updateUI();
        });
    }

    function showOnlineReaderStatus(message, isError) {
        if (typeof document === 'undefined' || !document.body) return;
        var node = document.getElementById('online-reader-status');
        if (!node) {
            node = document.createElement('div');
            node.id = 'online-reader-status';
            node.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:1200;max-width:80%;padding:8px 14px;border-radius:18px;background:rgba(25,25,30,.86);color:#fff;font-size:13px;line-height:1.4;text-align:center;pointer-events:none;transition:opacity .2s;';
            document.body.appendChild(node);
        }
        node.textContent = message || '';
        node.style.background = isError ? 'rgba(170,45,45,.92)' : 'rgba(25,25,30,.86)';
        node.style.opacity = '1';
        clearTimeout(showOnlineReaderStatus.timer);
        if (message) {
            showOnlineReaderStatus.timer = setTimeout(function() {
                node.style.opacity = '0';
            }, isError ? 4200 : 2200);
        }
    }

    function createOnlineSession(source, book, chapters, fileName, parts, nextIndex) {
        var normalizedNext = Math.max(0, Math.min(chapters.length, Number(nextIndex) || 0));
        var cachedCount = chapters.slice(0, normalizedNext).filter(function(chapter) { return !chapter.isVolume; }).length;
        var loadedIndexes = new Set();
        chapters.slice(0, normalizedNext).forEach(function(chapter, index) {
            if (!chapter.isVolume) loadedIndexes.add(index);
        });
        return {
            source: source,
            book: book,
            chapters: chapters,
            fileName: fileName,
            parts: parts || [],
            nextIndex: normalizedNext,
            cachedCount: cachedCount,
            currentIndex: Math.max(0, normalizedNext - 1),
            loadedIndexes: loadedIndexes,
            loadingPromise: null,
            controller: null
        };
    }

    async function persistOnlineSession(session, status, refreshReader) {
        var text = session.parts.join('\n\n').trim();
        var complete = session.nextIndex >= session.chapters.length;
        var actualStatus = complete ? 'complete' : (status || 'downloading');
        var metadata = buildOnlineMetadata(session.source, session.book, session.chapters, session.fileName, session.cachedCount, actualStatus, session.nextIndex, {
            currentIndex: session.currentIndex,
            loadedIndexes: Array.from(session.loadedIndexes || [])
        });
        await NR.storageDB.saveBook({ id: session.fileName, content: text, onlineSource: metadata.onlineSource });
        saveShelfMetadata(metadata);
        if (refreshReader) await refreshOpenReader(session.fileName, text);
        return text;
    }

    /**
     * Fetch exactly one (possibly volume-prefixed) chapter when the reader
     * reaches the cached end.  Keeping this request out of a background loop
     * is important for Legado sources whose java.ajax implementation is
     * synchronous and would otherwise freeze the WebView.
     */
    NR.loadNextOnlineChapter = function() {
        var session = state.onlineReader;
        if (!session) return Promise.resolve(false);
        if (session.loadingPromise) return session.loadingPromise;
        if (session.nextIndex >= session.chapters.length) {
            showOnlineReaderStatus('已经读到目录末尾');
            return Promise.resolve(false);
        }
        showOnlineReaderStatus('正在加载下一章…');
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        session.controller = controller;
        state.downloadController = controller;
        session.loadingPromise = (async function() {
            var appended = [];
            var failed = false;
            while (session.nextIndex < session.chapters.length) {
                var chapter = session.chapters[session.nextIndex];
                session.nextIndex += 1;
                if (chapter.isVolume) {
                    appended.push(formatChapter(chapter, ''));
                    continue;
                }
                try {
                    var content = await engine.chapterContent(session.source, session.book, chapter);
                    appended.push(formatChapter(chapter, content));
                } catch (error) {
                    failed = true;
                    appended.push(formatChapter(chapter, '[本章加载失败：' + (error.message || error) + ']'));
                }
                if (session.loadedIndexes) session.loadedIndexes.add(session.nextIndex - 1);
                break;
            }
            session.parts.push.apply(session.parts, appended);
            session.cachedCount = session.chapters.slice(0, session.nextIndex).filter(function(item) { return !item.isVolume; }).length;
            await persistOnlineSession(session, failed ? 'partial' : 'downloading', true);
            if (failed) showOnlineReaderStatus('本章加载失败，已显示错误提示', true);
            else showOnlineReaderStatus(session.nextIndex >= session.chapters.length ? '已加载到最后一章' : '下一章已就绪');
            return true;
        })().catch(function(error) {
            console.error('[BookSource] 下一章加载失败:', error);
            showOnlineReaderStatus('下一章加载失败：' + (error.message || error), true);
            return false;
        }).finally(function() {
            session.loadingPromise = null;
            session.controller = null;
            if (state.downloadController === controller) state.downloadController = null;
        });
        return session.loadingPromise;
    };

    NR.canLoadNextOnlineChapter = function() {
        var session = state.onlineReader;
        return !!(session && session.nextIndex < session.chapters.length);
    };

    // Open an arbitrary chapter selected from the complete online TOC.  Only
    // that chapter is requested; we do not walk all chapters between the
    // current position and the selected one.
    NR.openOnlineChapterAt = function(index) {
        var session = state.onlineReader;
        index = Number(index);
        if (!session || !Number.isInteger(index) || index < 0 || index >= session.chapters.length) return Promise.resolve(false);
        if (session.loadingPromise) return session.loadingPromise;
        var chapter = session.chapters[index];
        showOnlineReaderStatus('正在加载第 ' + (index + 1) + ' 章…');
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        session.controller = controller;
        state.downloadController = controller;
        session.loadingPromise = (async function() {
            var content = '';
            var failed = false;
            if (!chapter.isVolume) {
                try {
                    content = await engine.chapterContent(session.source, session.book, chapter);
                } catch (error) {
                    failed = true;
                    content = '[本章加载失败：' + (error.message || error) + ']';
                }
            }
            session.parts = [formatChapter(chapter, content)];
            session.currentIndex = index;
            session.nextIndex = Math.min(session.chapters.length, index + 1);
            if (session.loadedIndexes && !chapter.isVolume) session.loadedIndexes.add(index);
            session.cachedCount = session.loadedIndexes ? session.loadedIndexes.size : (chapter.isVolume ? 0 : 1);
            var text = await persistOnlineSession(session, failed ? 'partial' : 'downloading', false);
            if (NR.state.currentFileName === session.fileName && NR.els.readerView && NR.els.readerView.style.display !== 'none') {
                await NR.loadBook(session.fileName, text, { startPage: 1 });
            }
            showOnlineReaderStatus(failed ? '本章加载失败，已显示错误提示' : '已跳转到第 ' + (index + 1) + ' 章', failed);
            return !failed;
        })().catch(function(error) {
            console.error('[BookSource] 跳转章节加载失败:', error);
            showOnlineReaderStatus('章节加载失败：' + (error.message || error), true);
            return false;
        }).finally(function() {
            session.loadingPromise = null;
            session.controller = null;
            if (state.downloadController === controller) state.downloadController = null;
        });
        return session.loadingPromise;
    };

    // Rebuild an online-reader session when a partially cached book is opened
    // from the shelf (including after the app has been restarted).
    NR.restoreOnlineReaderSession = async function(bookMeta, content) {
        var online = bookMeta && bookMeta.onlineSource;
        if (!online || !Array.isArray(online.chapters) || !online.chapters.length) return false;
        var source = sourceByUrl(online.sourceUrl);
        if (!source) {
            try {
                var savedSources = await NR.storageDB.loadBookSources();
                state.sources = (savedSources || []).map(NR.BookSourceEngine.normalizeSource);
                source = sourceByUrl(online.sourceUrl);
            } catch (error) {
                console.warn('[BookSource] 恢复在线书源失败:', error);
            }
        }
        if (!source) return false;
        var book = Object.assign({}, online.book || {}, {
            bookUrl: online.bookUrl || (online.book && online.book.bookUrl) || '',
            tocUrl: online.tocUrl || (online.book && online.book.tocUrl) || ''
        });
        if (!book.bookUrl) return false;
        var nextIndex = Number(online.nextIndex);
        if (!Number.isFinite(nextIndex)) nextIndex = Number(online.cachedChapters) || 0;
        state.onlineReader = createOnlineSession(source, book, online.chapters, bookMeta.name, [content || ''], nextIndex);
        state.onlineReader.currentIndex = Number.isFinite(Number(online.currentIndex)) ? Number(online.currentIndex) : Math.max(0, nextIndex - 1);
        if (Array.isArray(online.loadedIndexes)) {
            state.onlineReader.loadedIndexes = new Set(online.loadedIndexes.map(function(value) { return Number(value); }).filter(function(value) { return Number.isInteger(value) && value >= 0; }));
            state.onlineReader.cachedCount = state.onlineReader.loadedIndexes.size;
        }
        return true;
    };

    async function cacheCurrentBookLazy() {
        if (!state.currentDetail || !state.currentDetail.chapters.length) return;
        var source = state.currentDetail.source;
        var book = state.currentDetail.book;
        var chapters = state.currentDetail.chapters;
        var fileName = onlineFileName(book);
        var firstIndex = chapters.findIndex(function(chapter) { return !chapter.isVolume; });
        if (firstIndex < 0) firstIndex = 0;

        var initialParts = chapters.slice(0, firstIndex).map(function(chapter) { return formatChapter(chapter, ''); });
        var firstChapter = chapters[firstIndex];
        el['source-download-modal'].style.display = 'flex';
        el['source-download-title'].textContent = '正在准备第一章';
        el['source-download-progress'].style.width = '8%';
        el['source-download-status'].textContent = firstChapter.title;
        try {
            var firstContent = firstChapter.isVolume ? '' : await engine.chapterContent(source, book, firstChapter);
            initialParts.push(formatChapter(firstChapter, firstContent));
            var initialText = initialParts.join('\n\n').trim();
            var session = createOnlineSession(source, book, chapters, fileName, initialParts.slice(), firstIndex + 1);
            var initialMetadata = buildOnlineMetadata(source, book, chapters, fileName, session.cachedCount, session.nextIndex >= chapters.length ? 'complete' : 'downloading', session.nextIndex, {
                currentIndex: session.currentIndex,
                loadedIndexes: Array.from(session.loadedIndexes)
            });
            await NR.storageDB.saveBook({
                id: fileName,
                content: initialText,
                onlineSource: initialMetadata.onlineSource
            });
            saveShelfMetadata(initialMetadata);
            el['source-download-modal'].style.display = 'none';
            NR.state.activeSubView = 'original';
            NR.state.currentBookCoverUrl = book.coverUrl || null;
            state.onlineReader = session;
            NR.showReaderView();
            await NR.loadBook(fileName, initialText);
            // The first chapter is the only request made before the reader is
            // shown.  Remaining chapters are fetched by loadNextOnlineChapter
            // when the user turns past the cached end.
            state.backgroundDownload = null;
            state.downloadController = null;
        } catch (error) {
            el['source-download-modal'].style.display = 'none';
            if (error.message !== '下载已取消') toast('首章加载失败：' + error.message, true);
        }
    }

    async function cacheCurrentBook(openAfter) {
        if (openAfter) return cacheCurrentBookLazy();
        if (!state.currentDetail || !state.currentDetail.chapters.length) return;
        state.onlineReader = null;
        var source = state.currentDetail.source;
        var book = state.currentDetail.book;
        var chapters = state.currentDetail.chapters;
        var controller = new AbortController();
        state.downloadController = controller;
        el['source-download-modal'].style.display = 'flex';
        el['source-download-title'].textContent = openAfter ? '正在准备阅读' : '正在加入书架';
        el['source-download-progress'].style.width = '0%';
        el['source-download-status'].textContent = '共 ' + chapters.length + ' 章';
        try {
            var content = await engine.downloadBook(source, book, chapters, {
                concurrency: 3,
                signal: controller.signal,
                onProgress: function(done, total, title) {
                    el['source-download-progress'].style.width = Math.round(done / total * 100) + '%';
                    el['source-download-status'].textContent = done + ' / ' + total + ' · ' + title;
                }
            });
            var fileName = onlineFileName(book);
            await NR.storageDB.saveBook({
                id: fileName,
                content: content,
                onlineSource: { sourceUrl: source.bookSourceUrl, sourceName: source.bookSourceName, bookUrl: book.bookUrl, tocUrl: book.tocUrl, cachedAt: Date.now() }
            });
            var metadata = {
                name: fileName,
                cover: book.coverUrl || null,
                author: book.author || '未知',
                chapterCount: chapters.filter(function(chapter) { return !chapter.isVolume; }).length,
                tags: Array.from(new Set(['网络书源', source.bookSourceName].concat(String(book.kind || '').split(/[,/|，、\s]+/).filter(Boolean).slice(0, 5)))),
                onlineSource: { sourceUrl: source.bookSourceUrl, bookUrl: book.bookUrl }
            };
            var existingIndex = NR.state.bookshelf.findIndex(function(item) { return item.name === fileName; });
            if (existingIndex >= 0) NR.state.bookshelf[existingIndex] = metadata;
            else NR.state.bookshelf.push(metadata);
            NR.saveBookshelf();
            el['source-download-modal'].style.display = 'none';
            toast(existingIndex >= 0 ? '书籍缓存已更新' : '已加入书架');
            if (openAfter) {
                NR.state.activeSubView = 'original';
                NR.state.currentBookCoverUrl = book.coverUrl || null;
                state.onlineReader = null;
                NR.showReaderView();
                await NR.loadBook(fileName, content);
            }
        } catch (e) {
            el['source-download-modal'].style.display = 'none';
            if (e.message !== '下载已取消') toast('缓存失败：' + e.message, true);
        } finally {
            state.downloadController = null;
        }
    }

    function sourceUrlFromItem(item) { return decodeURIComponent(item.dataset.sourceUrl || ''); }

    function bindEvents() {
        el['btn-book-source'].addEventListener('click', showView);
        el['source-back'].addEventListener('click', hideView);
        el['source-detail-back'].addEventListener('click', closeDetail);
        el.tabs.forEach(function(button) { button.addEventListener('click', function() { switchTab(button.dataset.sourceTab); }); });
        el['source-import-open'].addEventListener('click', openImport);
        el['source-import-close'].addEventListener('click', closeImport);
        el['source-import-confirm'].addEventListener('click', importSources);
        el['source-import-modal'].addEventListener('click', function(event) { if (event.target === el['source-import-modal']) closeImport(); });
        el['source-import-file'].addEventListener('change', function(event) {
            state.selectedFiles = Array.from(event.target.files || []);
            el['source-import-file-names'].textContent = state.selectedFiles.map(function(file) { return file.name; }).join('、');
        });
        el['source-explore-selector'].addEventListener('change', function(event) {
            state.activeSourceUrl = event.target.value;
            state.activeKind = null;
            el['source-explore-results'].innerHTML = '';
            renderExplore();
        });
        el['source-explore-filter'].addEventListener('input', renderExplore);
        el['source-explore-kinds'].addEventListener('click', function(event) {
            var button = event.target.closest('[data-kind-index]');
            if (!button || !button.matches('button')) return;
            var kinds = JSON.parse(el['source-explore-kinds'].dataset.kinds || '[]');
            var kind = kinds[Number(button.dataset.kindIndex)];
            if (!kind) return;
            var type = String(kind.type || 'url').toLowerCase();
            if (type === 'url') {
                state.activeKind = kind;
                Array.from(el['source-explore-kinds'].querySelectorAll('.source-kind-pill')).forEach(function(item) { item.classList.toggle('active', item === button); });
                loadExplore(true);
            } else if (type === 'toggle') button.classList.toggle('active');
        });
        el['source-explore-more'].addEventListener('click', function() { loadExplore(false); });
        el['source-search-form'].addEventListener('submit', function(event) {
            event.preventDefault();
            var keyword = el['source-search-keyword'].value.trim();
            if (!keyword) { toast('请输入书名或作者', true); return; }
            searchSources(keyword);
        });
        el['source-manage-filter'].addEventListener('input', renderManage);
        el['source-group-filter'].addEventListener('change', renderManage);
        el['source-list'].addEventListener('change', function(event) {
            if (!event.target.matches('[data-source-toggle]')) return;
            var item = event.target.closest('[data-source-url]');
            var source = sourceByUrl(sourceUrlFromItem(item));
            if (source) updateSource(source, event.target.dataset.sourceToggle, event.target.checked);
        });
        el['source-list'].addEventListener('click', function(event) {
            var actionButton = event.target.closest('[data-source-action]');
            if (!actionButton) return;
            var item = actionButton.closest('[data-source-url]');
            var source = item && sourceByUrl(sourceUrlFromItem(item));
            if (actionButton.dataset.sourceAction === 'import') openImport();
            else if (source && actionButton.dataset.sourceAction === 'delete') deleteSource(source);
            else if (source && actionButton.dataset.sourceAction === 'export') exportSource(source);
            else if (source && actionButton.dataset.sourceAction === 'explore') {
                state.activeSourceUrl = source.bookSourceUrl;
                state.activeKind = null;
                switchTab('explore');
            }
        });
        el['book-source-view'].addEventListener('click', function(event) {
            var emptyAction = event.target.closest('[data-source-action="import"]');
            if (emptyAction) { openImport(); return; }
            var item = event.target.closest('.source-book-item');
            if (!item) return;
            try { openBookDetail(JSON.parse(decodeURIComponent(item.dataset.book))); } catch (e) { toast('书籍数据损坏', true); }
        });
        el['source-detail-content'].addEventListener('click', function(event) {
            var button = event.target.closest('[data-detail-action]');
            if (!button) return;
            cacheCurrentBook(button.dataset.detailAction === 'read');
        });
        el['source-refresh'].addEventListener('click', function() {
            if (state.activeTab === 'manage') loadSources();
            else if (state.activeTab === 'explore') loadExplore(true);
            else {
                var keyword = el['source-search-keyword'].value.trim();
                if (keyword) searchSources(keyword);
            }
        });
        el['source-download-cancel'].addEventListener('click', function() {
            if (state.downloadController) state.downloadController.abort();
        });
    }

    NR.initBookSourceFeature = function() {
        if (state.initialized) return;
        state.initialized = true;
        cacheElements();
        bindEvents();
        loadSources();
    };

    // Called by the native login WebView after its cookies have been flushed.
    NR.bookSourceLoginCompleted = function() {
        if (!state.initialized) return;
        toast('登录信息已同步，可继续阅读');
        // Do not re-run the active discovery rule here. Some Legado sources expose
        // a login entry as their first explore item, and re-running it would open
        // the login browser again immediately after it was closed.
    };

    NR.bookSourceState = state;
    NR.bookSourceEngine = engine;
})();
