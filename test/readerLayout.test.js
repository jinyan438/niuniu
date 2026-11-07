const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadReader() {
    function element() {
        const classes = new Set();
        return {
            id: '', dataset: {}, style: {}, children: [],
            classList: {
                add: (value) => classes.add(value),
                remove: (value) => classes.delete(value),
                contains: (value) => classes.has(value)
            },
            get innerHTML() { return this.html || ''; },
            set innerHTML(value) { this.html = value; this.children = []; },
            get textContent() { return this.innerHTML; },
            appendChild(child) { this.children.push(child); },
            cloneNode() {
                const copy = element();
                copy.id = this.id;
                copy.dataset = { ...this.dataset };
                copy.innerHTML = this.innerHTML;
                classes.forEach((value) => copy.classList.add(value));
                return copy;
            },
            clientWidth: 400,
            clientHeight: 3,
            // Each paragraph occupies one unit in this pagination fixture.
            get scrollHeight() { return this.children.length; }
        };
    }

    const NR = {
        state: {},
        els: { 'content-wrapper': element(), 'calculation-ruler': element() },
        populateCatalog() {}
    };
    const context = vm.createContext({
        window: { NovelReader: NR },
        document: { createElement: element, addEventListener() {}, body: {} },
        getComputedStyle: () => ({ fontFamily: 'sans-serif' })
    });
    for (const file of ['utils.js', 'core.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js', file), 'utf8'), context);
    }
    return NR;
}

function pageContents(NR) {
    return Array.from(NR.state.allRenderedPages, (page) =>
        page.children.map((paragraph) => paragraph.innerHTML));
}

test('blank-line variants produce the same compact pages as single-newline text', async () => {
    const compact = loadReader();
    compact.prepareContent('第1章 开始\n第一段\n第二段\n第三段\n第四段\n第2章 后续\n结尾');
    await compact.paginate();

    const spaced = loadReader();
    spaced.prepareContent('\r\n\r\n第1章 开始\r\n\r\n第1章 开始\r\n \t\u3000\u00a0\r\n第一段\r\n\r\n第二段\r\n\r\n\r\n第三段\r\n\r\n第四段\r\n\r\n第2章 后续\r\n\r\n结尾\r\n\r\n');
    await spaced.paginate();

    assert.deepEqual(pageContents(spaced), pageContents(compact));
    assert.equal(spaced.state.totalPages, 3);
    assert.equal(spaced.state.chapters.length, 2);
});

test('keeps source indexes for body paragraphs and chapter navigation', async () => {
    const NR = loadReader();
    const text = '\n第1章 开始\n\n第1章 开始\n\t\n正文\n\n第2章 后续\n\n结尾';
    NR.prepareContent(text);
    await NR.paginate();

    assert.equal(NR.state.originalParagraphs.length, text.split('\n').length);
    assert.deepEqual(Array.from(NR.state.chapters, (chapter) => chapter.p_index), [1, 7]);
    assert.deepEqual(Array.from(NR.state.allRenderedPages, (page) =>
        page.children.map((paragraph) => paragraph.dataset.originalIndex)), [[1, 5], [7, 9]]);
    assert.equal(NR.state.originalParagraphs[2].textContent, '');
    assert.match(NR.getTextForChapter(1), /正文/);
});

test('keeps EPUB images between text paragraphs while skipping surrounding blanks', async () => {
    const NR = loadReader();
    NR.prepareContent('正文\n\n:::EPUB_IMG:::data%3Aimage%2Fpng%3Bbase64%2CAA%3D%3D|插图\n\n后文');
    await NR.paginate();

    const paragraphs = NR.state.allRenderedPages[0].children;
    assert.equal(NR.state.totalPages, 1);
    assert.equal(paragraphs.length, 3);
    assert.equal(paragraphs[1].dataset.originalIndex, 2);
    assert.ok(paragraphs[1].classList.contains('epub-image-paragraph'));
    assert.match(paragraphs[1].innerHTML, /<img class="epub-image"/);
});

test('whitespace-only text does not create blank reading pages', async () => {
    const NR = loadReader();
    NR.prepareContent('\n\n \t\u3000\u00a0\n\n');
    await NR.paginate();

    assert.equal(NR.state.totalPages, 0);
});
