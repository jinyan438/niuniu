const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { paragraphControl, chapterControl, escapeMarkup } = require('./fixtures/legadoContent.js');

function loadReader() {
    const stats = { paragraphs: 0, measurements: 0, warnings: 0 };
    function element(tag = 'div') {
        if (tag === 'p') stats.paragraphs++;
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
            appendChild(child) {
                if (child.isFragment) this.children.push(...child.children);
                else this.children.push(child);
            },
            cloneNode() {
                const copy = element(tag);
                copy.id = this.id;
                copy.dataset = { ...this.dataset };
                copy.innerHTML = this.innerHTML;
                classes.forEach((value) => copy.classList.add(value));
                return copy;
            },
            clientWidth: 400,
            clientHeight: 3,
            get fixtureHeight() { return tag === 'p' ? 1 : this.children.reduce((sum, child) => sum + child.fixtureHeight, 0); },
            getBoundingClientRect() {
                stats.measurements++;
                return { top: 0, bottom: this.fixtureHeight, height: this.fixtureHeight };
            },
            // Each paragraph occupies one unit in this pagination fixture.
            get scrollHeight() { return this.children.length; }
        };
    }

    const NR = {
        state: {},
        els: { 'content-wrapper': element(), 'calculation-ruler': element() },
        stats,
        layoutStyle: { fontFamily: 'sans-serif' },
        populateCatalog() {}
    };
    const context = vm.createContext({
        window: { NovelReader: NR },
        document: { createElement: element, createDocumentFragment: () => ({ isFragment: true, children: [], appendChild(child) { this.children.push(child); } }), addEventListener() {}, body: {} },
        getComputedStyle: () => NR.layoutStyle,
        setTimeout,
        console: { ...console, warn() { stats.warnings++; } }
    });
    for (const file of ['bookSourceEngine.js', 'utils.js', 'core.js']) {
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

test('repairs existing Legado caches while keeping paragraph indexes and EPUB illustrations', async () => {
    const NR = loadReader();
    const splitControl = paragraphControl.replace(' src=', '\r\n src=');
    const imageMarker = ':::EPUB_IMG:::data%3Aimage%2Fpng%3Bbase64%2CAA%3D%3D|插图';
    const text = ['第478章 对妖', '他说：“因为啊。”' + splitControl,
        '刹时间，妖歌神色阴沉无比。', escapeMarkup(chapterControl), imageMarker,
        '第479章 后续', '结尾'].join('\r\n');
    NR.prepareContent(text);
    await NR.paginate();

    assert.equal(NR.state.originalParagraphs.length, text.split('\r\n').length);
    assert.deepEqual(Array.from(NR.state.chapters, (chapter) => chapter.p_index), [0, 6]);
    assert.match(NR.state.originalParagraphs[1].innerHTML, /他说：/);
    assert.equal(NR.state.originalParagraphs[2].innerHTML, '');
    assert.equal(NR.state.originalParagraphs[3].innerHTML, '刹时间，妖歌神色阴沉无比。');
    assert.ok(NR.state.originalParagraphs[5].classList.contains('epub-image-paragraph'));
    assert.doesNotMatch(pageContents(NR).flat().join(''), /showCmt|showFanqieComment|&lt;img|svg\+xml|qtbzs/);
});

function cacheDatabase() {
    const layouts = new Map();
    return {
        layouts,
        async loadReaderLayout(name) { return layouts.get(name); },
        async saveReaderLayout(layout) { layouts.set(layout.id, JSON.parse(JSON.stringify(layout))); }
    };
}

function prepareShelfBook(NR, database, text, name = '长篇.txt') {
    NR.storageDB = database;
    NR.state.activeSubView = 'original';
    NR.state.currentFileName = name;
    NR.prepareContent(text);
}

test('preparing a long book and its catalog creates no paragraph DOM', () => {
    const NR = loadReader();
    const text = Array.from({ length: 400 }, (_, index) => `第${index + 1}章 开始\n\n正文\n　\n后续`).join('\n');
    NR.prepareContent(text);

    assert.equal(NR.stats.paragraphs, 0);
    assert.equal(NR.state.chapters.length, 400);
    assert.equal(NR.state.chapters[0].charCount, '第1章 开始\n\n正文\n\n后续'.length);
    assert.equal(NR.state.originalParagraphs[2].textContent, '正文');
    assert.equal(NR.stats.paragraphs, 1);
    assert.equal(NR.state.originalParagraphs[2], NR.state.originalParagraphs[2]);
});

test('warm opening skips all measurements and creates only the requested page', async () => {
    const NR = loadReader();
    const text = Array.from({ length: 600 }, (_, index) => `正文${index}`).join('\n');
    NR.prepareContent(text);
    await NR.paginate();
    assert.equal(NR.state.totalPages, 200);
    const measured = { ...NR.stats };

    NR.prepareContent(text);
    await NR.paginate();
    assert.deepEqual(NR.stats, measured);
    assert.equal(NR.getPageForParagraph(599), 200);
    assert.equal(NR.getPageForParagraph(600), -1);
    assert.equal(NR.getPageForParagraph(NaN), -1);
    assert.equal(NR.getPageForParagraph(undefined), -1);
    assert.equal(NR.state.allRenderedPages[199].children[0].textContent, '正文597');
    assert.equal(NR.stats.paragraphs - measured.paragraphs, 6);
    assert.equal(NR.state.allRenderedPages[199], NR.state.allRenderedPages[199]);
});

test('persisted layouts survive a fresh reader and preserve paragraph indexes and chapter starts', async () => {
    const database = cacheDatabase();
    const text = '简介\n\n第1章 开始\n\n甲\n乙\n丙\n第2章 后续\n\n丁';
    const first = loadReader();
    prepareShelfBook(first, database, text);
    await first.paginate();
    const expected = pageContents(first);

    const restarted = loadReader();
    prepareShelfBook(restarted, database, text);
    await restarted.paginate();
    assert.equal(restarted.stats.measurements, 0);
    assert.equal(restarted.stats.paragraphs, 0);
    assert.deepEqual(pageContents(restarted), expected);
    assert.equal(restarted.getPageForParagraph(7), 4);
    assert.equal(restarted.els['calculation-ruler'].children.length, 0);
    assert.equal(restarted.els['calculation-ruler'].classList.contains('page'), false);
});

test('equal-length content changes invalidate the persisted layout', async () => {
    const database = cacheDatabase();
    const first = loadReader();
    prepareShelfBook(first, database, '甲\n乙\n丙\n丁');
    await first.paginate();
    const restarted = loadReader();
    prepareShelfBook(restarted, database, '戊\n己\n庚\n辛');
    await restarted.paginate();

    assert.ok(restarted.stats.measurements > 0);
    assert.equal(restarted.state.allRenderedPages[0].children[0].textContent, '戊');
});

test('viewport, typography and custom font revisions invalidate cached layouts', async () => {
    for (const change of [
        NR => { NR.els['calculation-ruler'].clientWidth = 500; },
        NR => { NR.els['calculation-ruler'].clientHeight = 4; },
        NR => { NR.layoutStyle.fontSize = '28px'; },
        NR => { NR.layoutStyle.lineHeight = '2'; },
        NR => { NR.layoutStyle.letterSpacing = '2px'; },
        NR => { NR.layoutStyle.paddingLeft = '30px'; },
        NR => { NR.state.currentCustomFontKey = 'new-font'; }
    ]) {
        const database = cacheDatabase();
        const NR = loadReader();
        prepareShelfBook(NR, database, '甲\n乙\n丙\n丁');
        await NR.paginate();
        const measurements = NR.stats.measurements;
        change(NR);
        await NR.paginate();
        assert.ok(NR.stats.measurements > measurements);
    }
});

test('malformed cached ranges are discarded instead of dropping book content', async () => {
    for (const ranges of [[], [[0, 2]], [[0, 99]], [[-1, 4]], [[0, 3], [0, 4]], [[0, 1.5]], null]) {
        const database = cacheDatabase();
        const first = loadReader();
        prepareShelfBook(first, database, '甲\n乙\n丙\n丁');
        await first.paginate();
        database.layouts.get('长篇.txt').ranges = ranges;
        const restarted = loadReader();
        prepareShelfBook(restarted, database, '甲\n乙\n丙\n丁');
        await restarted.paginate();
        assert.ok(restarted.stats.measurements > 0, JSON.stringify(ranges));
        assert.deepEqual(pageContents(restarted), [['甲', '乙', '丙'], ['丁']]);
    }
});

test('cache read and write failures fall back to normal pagination', async () => {
    const NR = loadReader();
    prepareShelfBook(NR, {
        async loadReaderLayout() { throw new Error('unavailable'); },
        async saveReaderLayout() { throw new Error('quota'); }
    }, '甲\n乙\n丙\n丁');
    await NR.paginate();
    assert.deepEqual(pageContents(NR), [['甲', '乙', '丙'], ['丁']]);
    assert.equal(NR.els['calculation-ruler'].children.length, 0);
    assert.equal(NR.stats.warnings, 2);
});

test('a delayed cache read from a previous book cannot replace the current book', async () => {
    const NR = loadReader();
    let release;
    prepareShelfBook(NR, { loadReaderLayout: () => new Promise(resolve => { release = resolve; }) }, '旧书\n正文', '旧书.txt');
    const previous = NR.paginate();
    NR.state.currentFileName = '新书.txt';
    NR.prepareContent('新书\n新正文\n后续\n结尾');
    NR.storageDB = {};
    await NR.paginate();
    release(null);
    await previous;

    assert.deepEqual(pageContents(NR), [['新书', '新正文', '后续'], ['结尾']]);
    assert.equal(NR.els['calculation-ruler'].classList.contains('page'), false);
});

test('cached ranges cannot merge separate chapters', async () => {
    const database = cacheDatabase();
    const text = '第1章 开始\n甲\n第2章 后续\n乙';
    const first = loadReader();
    prepareShelfBook(first, database, text);
    await first.paginate();
    database.layouts.get('长篇.txt').ranges = [[0, 4]];
    const restarted = loadReader();
    prepareShelfBook(restarted, database, text);
    await restarted.paginate();
    assert.ok(restarted.stats.measurements > 0);
    assert.deepEqual(pageContents(restarted), [['第1章 开始', '甲'], ['第2章 后续', '乙']]);
});

function shelfLoader(NR, book) {
    const label = { textContent: '' };
    NR.els['app-loader'] = {
        classList: { add() {}, remove() {} },
        querySelector: () => label
    };
    NR.state.bookshelf = [{ name: book.id, cover: '封面' }];
    NR.showReaderView = () => {};
    NR.loadBook = async (name, content) => { NR.loadedBook = { name, content }; };
    NR.storageDB = { async loadBook() { return book; }, async saveBook(value) { Object.assign(book, value); } };
}

test('EPUB books imported as text reopen without decompressing and preload their illustrations', async () => {
    const NR = loadReader();
    const imageUrl = 'data:image/png;base64,AA==';
    const book = { id: '插图.epub', content: '第1章\n:::EPUB_IMG:::' + encodeURIComponent(imageUrl) + '|插图\n正文' };
    shelfLoader(NR, book);
    NR.parseEpubToPlainText = () => { assert.fail('Already parsed EPUB must not be decompressed'); };
    await NR.loadBookFromShelf(book.id);

    assert.equal(NR.loadedBook.content, book.content);
    assert.equal(NR.state.currentBookCoverUrl, '封面');
    assert.deepEqual(Array.from(NR.state.epubImagePreloadList), [imageUrl]);
});

test('raw EPUBs save and reuse their parsed text on the next opening', async () => {
    const NR = loadReader();
    const book = { id: '原始.epub', content: new Uint8Array([1, 2, 3]) };
    shelfLoader(NR, book);
    let parsed = 0;
    NR.parseEpubToPlainText = async () => { parsed++; return { textContent: '第1章\n正文', coverUrl: 'EPUB封面' }; };
    await NR.loadBookFromShelf(book.id);
    await NR.loadBookFromShelf(book.id);

    assert.equal(parsed, 1);
    assert.equal(NR.loadedBook.content, '第1章\n正文');
    assert.equal(NR.state.currentBookCoverUrl, 'EPUB封面');
});
