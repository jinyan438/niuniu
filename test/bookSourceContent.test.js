const test = require('node:test');
const assert = require('node:assert/strict');
const { BookSourceEngine, normalizeSource } = require('../www/js/bookSourceEngine.js');
const { paragraphControl, chapterControl, escapeMarkup } = require('./fixtures/legadoContent.js');

function chapterEngine(pages, rule = { content: '$.content' }) {
    const source = normalizeSource({
        bookSourceUrl: 'https://books.test', bookSourceName: '番茄测试源', ruleContent: rule
    });
    const engine = new BookSourceEngine({
        transport: {
            async request(request) {
                assert.ok(Object.hasOwn(pages, request.url), request.url);
                return { status: 200, url: request.url, headers: {}, body: JSON.stringify(pages[request.url]) };
            }
        }
    });
    return { engine, source };
}

for (const [name, encode] of [
    ['raw', (text) => text],
    ['escaped', escapeMarkup],
    ['double escaped', (text) => escapeMarkup(escapeMarkup(text))],
    ['numeric entities', (text) => escapeMarkup(text).replace(/&lt;/g, '&#60;').replace(/&gt;/g, '&#x3e;')]
]) {
    test(`removes ${name} Legado paragraph and chapter controls from downloaded text`, async () => {
        const { engine, source } = chapterEngine({
            'https://books.test/chapter/478': {
                content: `<p>李十五微笑道：“因为啊。”${encode(paragraphControl)}</p><p>刹时间，妖歌神色阴沉无比。</p>${encode(chapterControl)}`
            }
        });
        const content = await engine.downloadBook(source, {}, [{ title: '第478章 对妖', url: 'https://books.test/chapter/478' }]);

        assert.equal(content, '第478章 对妖\n\n李十五微笑道：“因为啊。”\n刹时间，妖歌神色阴沉无比。');
    });
}

test('cleans controls returned by async content rules, subcontent and later pages', async () => {
    const { engine, source } = chapterEngine({
        'https://books.test/chapter/1': { content: `<p>第一页${paragraphControl}</p>`, extra: '<p>补充内容<comment ident="/review" count="9" /></p>', next: '/chapter/2' },
        'https://books.test/chapter/2': { content: `<div rs-native>第二页<comment count="99" onPress="java.showReadingBrowser('/review','番茄段评')"></div>`, extra: chapterControl }
    }, {
        content: '<js>var data = JSON.stringify(result); data;</js>$.content',
        subContent: '$.extra', nextContentUrl: '$.next'
    });

    assert.equal(await engine.chapterContent(source, {}, { url: 'https://books.test/chapter/1' }), '第一页\n\n补充内容\n\n第二页');
});

test('cleans single-file JavaScript sources as well as declarative sources', async () => {
    const engine = new BookSourceEngine();
    const source = normalizeSource({
        bookSourceUrl: 'https://books.test',
        mainJs: `function getContent() { return ${JSON.stringify('<p>正文' + escapeMarkup(paragraphControl) + '</p>')}; }`
    });

    assert.equal(await engine.chapterContent(source, {}, { url: '/chapter/1' }), '正文');
});

test('plain text retains comparisons, dialogue, encoded examples and EPUB image markers', async () => {
    const text = '他说：“1 < 2，3 > 2。”\n示例：&lt;img src=&quot;cover.jpg&quot;&gt;\n:::EPUB_IMG:::data%3Aimage%2Fpng%3Bbase64%2CAA%3D%3D|插图';
    const { engine, source } = chapterEngine({ 'https://books.test/chapter/1': { content: text } });

    assert.equal(await engine.chapterContent(source, {}, { url: 'https://books.test/chapter/1' }), text);
    assert.equal(BookSourceEngine.stripLegadoArtifacts(text, true), text);
});

test('removes ordinary HTML images and non-story scripts without leaking their attributes', async () => {
    const { engine, source } = chapterEngine({
        'https://books.test/chapter/1': { content: '<p>前文<img src="cover.jpg" alt="插图 > 预览"></p><script>tracking()</script><style>.ad { color: red }</style><p>后文<br>结尾 &amp; &#x4e2d;文</p>' }
    });

    assert.equal(await engine.chapterContent(source, {}, { url: 'https://books.test/chapter/1' }), '前文\n后文\n结尾 & 中文');
});
