const test = require('node:test');
const assert = require('node:assert/strict');
const {
    BookSourceEngine,
    BookSourceImporter,
    normalizeSource,
    jsonPath,
    splitUrlOption
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
        ruleSearch: { bookList: '$.data[*]', name: '$.title', author: '$.author', bookUrl: '$.url', coverUrl: '$.cover' },
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
