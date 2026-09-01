const test = require('node:test');
const assert = require('node:assert/strict');
const {
    BookSourceEngine,
    BookSourceImporter,
    normalizeSource,
    jsonPath,
    splitUrlOption,
    normalizeInlineBookUrl,
    decodeInlineDataUrl
} = require('../www/js/bookSourceEngine.js');

test('normalizes legacy flat Legado fields', () => {
    const source = normalizeSource({
        bookSourceUrl: 'https://books.test',
        bookSourceName: '旧版源',
        ruleSearchUrl: '/search?key=searchKey',
        ruleSearchList: '$.books[*]',
        ruleSearchName: '$.title',
        ruleSearchNoteUrl: '$.url',
        ruleChapterList: '$.chapters[*]',
        ruleChapterName: '$.title',
        ruleContentUrl: '$.url',
        ruleBookContent: '$.content'
    });

    assert.equal(source.searchUrl, '/search?key=searchKey');
    assert.equal(source.ruleSearch.bookList, '$.books[*]');
    assert.equal(source.ruleSearch.name, '$.title');
    assert.equal(source.ruleToc.chapterList, '$.chapters[*]');
    assert.equal(source.ruleToc.chapterUrl, '$.url');
    assert.equal(source.ruleContent.content, '$.content');
});

test('imports sourceUrls manifests recursively and de-duplicates sources', async () => {
    const payloads = {
        'https://list.test/a.json': JSON.stringify([{ bookSourceUrl: 'https://a.test', bookSourceName: 'A' }]),
        'https://list.test/b.json': JSON.stringify([
            { bookSourceUrl: 'https://a.test', bookSourceName: 'A2' },
            { bookSourceUrl: 'https://b.test', bookSourceName: 'B' }
        ])
    };
    const importer = new BookSourceImporter(async (url) => payloads[url]);
    const sources = await importer.parse(JSON.stringify({ sourceUrls: Object.keys(payloads) }));

    assert.equal(sources.length, 2);
    assert.equal(sources.find((source) => source.bookSourceUrl === 'https://a.test').bookSourceName, 'A2');
});

test('supports JSONPath properties, wildcards, recursion and filters', () => {
    const value = {
        data: [{ name: 'A', score: 1 }, { name: 'B', score: 3 }],
        nested: { name: 'C' }
    };
    assert.deepEqual(jsonPath(value, '$.data[*].name'), ['A', 'B']);
    assert.deepEqual(jsonPath(value, '$.data[?(@.score >= 2)].name'), ['B']);
    assert.deepEqual(jsonPath(value, '$..name'), ['A', 'B', 'C']);
});

test('parses URL options without losing commas in request bodies', () => {
    const parsed = splitUrlOption('https://books.test/search,{"method":"POST","body":{"q":"a,b"}}');
    assert.equal(parsed.url, 'https://books.test/search');
    assert.equal(parsed.option.method, 'POST');
    assert.deepEqual(parsed.option.body, { q: 'a,b' });
});

test('converts encoded JSON book URLs into inline data URLs', async () => {
    const payload = JSON.stringify({ book_name: '测试书', book_id: 'abc123' });
    const withPlainOptions = encodeURIComponent(payload) + ',{"type":"qingtian"}';
    const withEncodedOptions = encodeURIComponent(payload + ',{"type":"qingtian"}');

    for (const value of [encodeURIComponent(payload), withPlainOptions, withEncodedOptions]) {
        const normalized = normalizeInlineBookUrl(value);
        assert.match(normalized, /^data:application\/json,/);
        assert.equal(decodeInlineDataUrl(normalized), payload);
    }

    const engine = new BookSourceEngine();
    const response = await engine.transport.request({ url: withEncodedOptions });
    assert.equal(response.status, 200);
    assert.equal(response.body, payload);
});

test('opens a book whose search result URL is encoded JSON', async () => {
    const payload = JSON.stringify({ book_name: '编码书', author: '作者', chapters: [{ title: '第一章', content: '正文' }] });
    const source = normalizeSource({
        bookSourceUrl: 'https://encoded-book.test',
        bookSourceName: 'Encoded Book Test',
        searchUrl: '/search',
        ruleSearch: { bookList: '$.books', name: '$.title', author: '$.author', bookUrl: '$.url' },
        ruleBookInfo: { name: '$.book_name', author: '$.author' }
    });
    const engine = new BookSourceEngine({
        transport: {
            async request(options) {
                if (options.url === 'https://encoded-book.test/search') {
                    return { status: 200, url: options.url, headers: {}, body: JSON.stringify({ books: [{ title: '编码书', author: '作者', url: encodeURIComponent(payload) }] }) };
                }
                return new BookSourceEngine().transport.request(options);
            }
        }
    });

    const [book] = await engine.search(source, '编码书', 1);
    assert.match(book.bookUrl, /^data:application\/json,/);
    const info = await engine.bookInfo(source, book);
    assert.equal(info.name, '编码书');
    assert.equal(info.author, '作者');
});

test('keeps existing base64 data book URLs intact', () => {
    const url = 'data:;base64,eyJib29rX2lkIjoiYWJjMTIzIn0=,{"type":"qingtian"}';
    assert.equal(normalizeInlineBookUrl(url), url);
    assert.equal(decodeInlineDataUrl(url), '{"book_id":"abc123"}');
});

test('interpolates and encodes form POST requests', () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({ bookSourceUrl: 'https://books.test', bookSourceName: 'Test' });
    const request = engine.prepareRequest('/search,{"method":"POST","body":"q=searchKey&page={{page}}"}', {
        source,
        key: '中文 书名',
        page: 2
    });
    assert.equal(request.method, 'POST');
    assert.equal(request.body, 'q=%E4%B8%AD%E6%96%87+%E4%B9%A6%E5%90%8D&page=2');
});

test('runs a declarative source from search through chapter content', async () => {
    const responses = {
        'https://books.test/search?q=hello&page=1': { data: [{ title: 'Hello Book', author: 'Ada', url: '/book/1', cover: '/cover/1.jpg' }] },
        'https://books.test/book/1': { title: 'Hello Book', author: 'Ada', intro: 'Intro', toc: '/book/1/toc' },
        'https://books.test/book/1/toc': { chapters: [{ title: '第1章 开始', url: '/chapter/1' }, { title: '第2章 继续', url: '/chapter/2' }] },
        'https://books.test/chapter/1': { content: '第一章正文' },
        'https://books.test/chapter/2': { content: '第二章正文' }
    };
    const transport = {
        async request(options) {
            const data = responses[options.url];
            if (!data) throw new Error(`unexpected URL ${options.url}`);
            return { status: 200, url: options.url, headers: {}, body: JSON.stringify(data) };
        }
    };
    const engine = new BookSourceEngine({ transport });
    const source = normalizeSource({
        bookSourceUrl: 'https://books.test',
        bookSourceName: 'Test',
        searchUrl: '/search?q=searchKey&page={{page}}',
        ruleSearch: { bookList: '$.data', name: '$.title', author: '$.author', bookUrl: '$.url', coverUrl: '$.cover' },
        ruleBookInfo: { name: '$.title', author: '$.author', intro: '$.intro', tocUrl: '$.toc' },
        ruleToc: { chapterList: '$.chapters[*]', chapterName: '$.title', chapterUrl: '$.url' },
        ruleContent: { content: '$.content' }
    });

    const books = await engine.search(source, 'hello', 1);
    assert.equal(books.length, 1);
    assert.equal(books[0].bookUrl, 'https://books.test/book/1');
    assert.equal(books[0].coverUrl, 'https://books.test/cover/1.jpg');

    const info = await engine.bookInfo(source, books[0]);
    assert.equal(info.tocUrl, 'https://books.test/book/1/toc');
    const chapters = await engine.toc(source, info);
    assert.equal(chapters.length, 2);
    const content = await engine.downloadBook(source, info, chapters, { concurrency: 2 });
    assert.match(content, /第1章 开始\n\n第一章正文/);
    assert.match(content, /第2章 继续\n\n第二章正文/);
});

test('imports and executes a pure JavaScript book source', async () => {
    const script = `
        const config = {
            bookSourceUrl: 'https://js.test',
            bookSourceName: 'JS Test',
            exploreUrl: [{ title: '热门', url: 'hot' }]
        };
        function search(key, page) { return [{ name: key, author: 'JS', bookUrl: '/b/' + page }]; }
        function explore(url, page) { return [{ name: url, author: 'JS', bookUrl: '/e/' + page }]; }
        function getBookInfo(book) { return Object.assign({}, book, { tocUrl: '/toc' }); }
        function getChapters(book) { return [{ title: '第一章', url: '/c/1' }]; }
        function getContent(chapter, book) { return 'JS 正文'; }
    `;
    const importer = new BookSourceImporter();
    const [source] = await importer.parse(script);
    const engine = new BookSourceEngine();

    assert.match(source.mainJs, /function search/);
    const books = await engine.search(source, '关键字', 2);
    assert.equal(books[0].bookUrl, 'https://js.test/b/2');
    const info = await engine.bookInfo(source, books[0]);
    const chapters = await engine.toc(source, info);
    assert.equal(chapters[0].url, 'https://js.test/c/1');
    assert.equal(await engine.chapterContent(source, info, chapters[0]), 'JS 正文');
});

test('loads jsLib in the same scope as declarative JavaScript rules', () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({
        bookSourceUrl: 'https://library.test',
        bookSourceName: 'Library Test',
        jsLib: `
            var host = ['https://one.test', 'https://two.test'];
            function selectedHost() { return this.source.getVariable() || host[0]; }
        `,
        exploreUrl: '<js>JSON.stringify([{title:"线路",url:selectedHost()}])</js>'
    });

    assert.deepEqual(engine.parseExploreKinds(source), [
        { type: 'url', title: '线路', url: 'https://one.test' }
    ]);
});

test('exposes jsLib helpers on this while a rule executes', () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({
        bookSourceUrl: 'https://library-helper.test',
        bookSourceName: 'Library Helper Test',
        jsLib: `
            function createSvg(value) { return 'svg:' + value; }
            function render() { return this.createSvg.bind(this)('ok'); }
        `,
        exploreUrl: '<js>JSON.stringify([{title:"辅助",url:render()}])</js>'
    });

    assert.deepEqual(engine.parseExploreKinds(source), [
        { type: 'url', title: '辅助', url: 'svg:ok' }
    ]);
});

test('supports Legado cookie key lookups used by content rules', () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({ bookSourceUrl: 'https://cookie.test', bookSourceName: 'Cookie Test' });
    const context = { source, result: '', src: '', baseUrl: source.bookSourceUrl };
    const bindings = engine.scriptBindings(context);

    bindings.cookie.setCookie(source.bookSourceUrl, 'qttoken=abc123; device=android');
    assert.equal(bindings.cookie.getKey(source.bookSourceUrl, 'qttoken'), 'abc123');
    assert.equal(bindings.cookie.getKey(source.bookSourceUrl, 'device'), 'android');
});

test('routes source login pages through the native in-app browser', () => {
    const previousBridge = global.NiuniuBookSource;
    const calls = [];
    global.NiuniuBookSource = {
        startBrowser(url, title) { calls.push([url, title]); return true; }
    };
    try {
        const engine = new BookSourceEngine();
        const source = normalizeSource({ bookSourceUrl: 'https://login.test', bookSourceName: 'Login Test' });
        const bindings = engine.scriptBindings({ source, result: '', src: '', baseUrl: source.bookSourceUrl });
        assert.equal(bindings.java.startBrowser('https://login.test/sign-in', '大灰狼登录'), '');
        const response = bindings.java.startBrowserAwait('https://login.test/user', '用户后台');
        assert.equal(response.body(), '');
        assert.equal(response.request().url(), 'https://login.test/user');
        assert.deepEqual(calls, [
            ['https://login.test/sign-in', '大灰狼登录'],
            ['https://login.test/user', '用户后台']
        ]);
    } finally {
        if (previousBridge === undefined) delete global.NiuniuBookSource;
        else global.NiuniuBookSource = previousBridge;
    }
});

test('uses the asynchronous native transport when available', async () => {
    const previousBridge = global.NiuniuBookSource;
    global.NiuniuBookSource = {
        requestAsync(requestJson, callbackId) {
            const request = JSON.parse(requestJson);
            setImmediate(() => global.NovelReader.__bookSourceRequestCallbacks[callbackId](JSON.stringify({
                status: 200,
                url: request.url,
                headers: {},
                body: 'async response'
            })));
        }
    };
    try {
        const engine = new BookSourceEngine();
        const response = await engine.transport.request({ url: 'https://async.test/chapter', timeout: 1000 });
        assert.equal(response.body, 'async response');
    } finally {
        if (previousBridge === undefined) delete global.NiuniuBookSource;
        else global.NiuniuBookSource = previousBridge;
        if (global.NovelReader) delete global.NovelReader.__bookSourceRequestCallbacks;
    }
});

test('executes chapter JS ajax rules without blocking on the sync transport', async () => {
    const source = normalizeSource({
        bookSourceUrl: 'https://async-rule.test',
        bookSourceName: 'Async Rule Test',
        ruleContent: {
            content: '<js>var data = java.ajax("https://async-rule.test/content"); data;</js>$.content'
        }
    });
    const calls = [];
    const engine = new BookSourceEngine({
        transport: {
            async request(options) {
                calls.push(options.url);
                return { status: 200, url: options.url, headers: {}, body: JSON.stringify({ content: '异步正文' }) };
            },
            requestSync() {
                throw new Error('chapter rule used synchronous transport');
            }
        }
    });

    const content = await engine.chapterContent(source, { bookUrl: source.bookSourceUrl }, {
        title: '第一章',
        url: source.bookSourceUrl + '/chapter/1',
        index: 0
    });
    assert.equal(content, '异步正文');
    assert.deepEqual(calls, [
        'https://async-rule.test/chapter/1',
        'https://async-rule.test/content'
    ]);
});

test('returns Legado URL variables assigned inside conditional JS rules', async () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({ bookSourceUrl: 'https://variable-rule.test', bookSourceName: 'Variable Rule Test' });
    const rule = '<js>if (result.kind === "encoded") { content_url = "data:text/plain,正文"; } else { content_url = "https://variable-rule.test/fallback"; }</js>';
    const context = { source, result: { kind: 'encoded' }, src: { kind: 'encoded' }, baseUrl: source.bookSourceUrl };

    delete globalThis.content_url;
    assert.equal(await engine.extractStringAsync(context.result, rule, context, true), 'data:text/plain,正文');
    assert.equal(Object.hasOwn(globalThis, 'content_url'), false);
});

test('isolates concurrent asynchronous source rules', async () => {
    const engine = new BookSourceEngine();
    const sourceA = normalizeSource({
        bookSourceUrl: 'https://isolated-a.test',
        bookSourceName: 'Isolated A',
        jsLib: 'function readSourceValue() { return this.source.getVariable(); }'
    });
    const sourceB = normalizeSource({
        bookSourceUrl: 'https://isolated-b.test',
        bookSourceName: 'Isolated B',
        jsLib: 'function readSourceValue() { return this.source.getVariable(); }'
    });
    engine.variableMap(sourceA).set('__source_variable', 'A');
    engine.variableMap(sourceB).set('__source_variable', 'B');
    const rule = '<js>await new Promise((resolve) => setTimeout(resolve, result.delay)); readSourceValue()</js>';
    const run = (source, delay) => engine.evalJsAsync(rule, { source, result: { delay }, src: { delay }, baseUrl: source.bookSourceUrl });

    assert.deepEqual(await Promise.all([run(sourceA, 1), run(sourceB, 10)]), ['A', 'B']);
});

test('preserves source defaults when an async rule initializes empty variables', async () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({
        bookSourceUrl: 'https://source-defaults.test',
        bookSourceName: 'Source Defaults',
        jsLib: `
            function getArguments(value, key) {
                var settings;
                try { settings = JSON.parse(value); }
                catch (error) {
                    settings = {
                        server: 'https://default-server.test',
                        tab: 'novel',
                        sources: 'all',
                        fqcommunity: 'on',
                        fqpara: 'on'
                    };
                }
                return key ? settings[key] : settings;
            }
            function setArguments(key, value) {
                var settings = getArguments(this.source.getVariable(), '');
                settings[key] = value;
                this.source.setVariable(JSON.stringify(settings));
            }
        `
    });
    const rule = '<js>var server = getArguments(source.getVariable(), "server"); setArguments("session", "ready"); return server;</js>';

    assert.equal(await engine.evalJsAsync(rule, { source, result: '', baseUrl: source.bookSourceUrl }), 'https://default-server.test');
    assert.deepEqual(JSON.parse(engine.variableMap(source).get('__source_variable')), {
        server: 'https://default-server.test',
        tab: 'novel',
        sources: 'all',
        fqcommunity: 'on',
        fqpara: 'on',
        session: 'ready'
    });
});

test('reports each chapter as soon as background downloading completes', async () => {
    const source = normalizeSource({ bookSourceUrl: 'https://progress.test', bookSourceName: 'Progress Test' });
    const engine = new BookSourceEngine({
        transport: {
            async request() { return { status: 200, url: 'https://progress.test', headers: {}, body: '' }; }
        }
    });
    engine.chapterContent = async function(_, __, chapter) {
        await new Promise((resolve) => setTimeout(resolve, chapter.index === 0 ? 5 : 1));
        return '正文 ' + chapter.index;
    };
    const events = [];
    const chapters = [
        { index: 0, title: '第一章' },
        { index: 1, title: '第二章' },
        { index: 2, title: '第三章' }
    ];
    const content = await engine.downloadBook(source, {}, chapters, {
        concurrency: 2,
        onChapter(index, text, chapter, completed, total) {
            events.push({ index, text, title: chapter.title, completed, total });
        }
    });
    assert.match(content, /第一章\n\n正文 0/);
    assert.equal(events.length, 3);
    assert.equal(events[2].total, 3);
    assert.deepEqual(new Set(events.map((event) => event.index)), new Set([0, 1, 2]));
});

test('interpolates multiple Legado field rules inside a text template', () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({ bookSourceUrl: 'https://template.test', bookSourceName: 'Template Test' });
    const item = { status: '连载', score: '9.4', tags: '玄幻' };

    assert.equal(
        engine.extractString(item, '{{$.status}},{{$.score}},{{$.tags}}', { source, result: item, src: item }, false),
        '连载,9.4,玄幻'
    );
});

test('executes JavaScript request URLs before expanding Legado placeholders', () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({ bookSourceUrl: 'https://request.test', bookSourceName: 'Request Test' });
    const request = engine.prepareRequest(
        '<js>`https://request.test/search?key=${key}&page={{page}}`</js>',
        { source, key: '斗破苍穹', page: 2 }
    );

    assert.equal(request.url, 'https://request.test/search?key=%E6%96%97%E7%A0%B4%E8%8B%8D%E7%A9%B9&page=2');
});

test('does not split JavaScript logical OR as a Legado fallback rule', () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({ bookSourceUrl: 'https://js-rule.test', bookSourceName: 'JS Rule Test' });
    const item = { name: '备用书名' };

    assert.equal(
        engine.extractString(item, '<js>let name = result.missing || result.name; name;</js>', { source, result: item, src: item }, false),
        '备用书名'
    );
});

test('applies a trailing data rule after a JavaScript rule block', () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({ bookSourceUrl: 'https://chain.test', bookSourceName: 'Chain Test' });
    const value = { data: [{ name: 'A' }, { name: 'B' }] };

    assert.deepEqual(
        engine.extract(value, '<js>JSON.stringify(result)</js>$.data', { source, result: value, src: value }, true),
        [{ name: 'A' }, { name: 'B' }]
    );
});
