const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadReaderUtils() {
    const context = vm.createContext({ window: { NovelReader: {} } });
    const source = fs.readFileSync(path.join(__dirname, '../www/js/utils.js'), 'utf8');
    vm.runInContext(source, context);
    return context.window.NovelReader;
}

test('counts consecutive duplicate chapter titles as one chapter', () => {
    const NR = loadReaderUtils();
    const text = '第1章 无限合成！\n\n第1章 无限合成！\n正文\n第2章 人？\n\n第2章 人？\n后续正文';

    assert.equal(NR.countChapters(text), 2);
});

test('removes repeated headings across blank lines without shifting paragraph indexes', () => {
    const NR = loadReaderUtils();
    const text = '简介\r\n第1章 无限合成！\r\n\t\r\n  第1章 无限合成！  \r\n第1章 无限合成！\r\n章末正文';

    assert.deepEqual(Array.from(NR.getReaderContentLines(text)), [
        '简介', '第1章 无限合成！', '\t', '', '', '章末正文'
    ]);
});

test('preserves repeated titles when actual content separates the chapters', () => {
    const NR = loadReaderUtils();
    const text = 'Chapter 1\nFirst story\n\nChapter 1\nSecond story';

    assert.equal(NR.countChapters(text), 2);
    assert.equal(NR.getReaderContentLines(text).join('\n'), text);
});

test('preserves repeated body paragraphs and normal books', () => {
    const NR = loadReaderUtils();
    const text = '第1章 开始\n同一段正文\n\n同一段正文\n第2章 继续\n结尾';

    assert.equal(NR.getReaderContentLines(text).join('\n'), text);
    assert.equal(NR.countChapters(text), 2);
    assert.equal(NR.countChapters(''), 0);
});

test('deduplicates supported Chinese, English and numbered chapter headings', () => {
    const NR = loadReaderUtils();
    const text = '第一章 开始\n第一章 开始\n正文\nChapter 2\nChapter 2\n正文\n3 继续\n3 继续\n正文';

    assert.equal(NR.countChapters(text), 3);
});
