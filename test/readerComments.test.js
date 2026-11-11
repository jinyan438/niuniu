const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadComments({ respond = () => [{ persona: '剧情党', comment: '快开宝箱！' }] } = {}) {
    function element() {
        const handlers = {};
        return {
            dataset: {}, style: {}, children: [], textContent: '', disabled: false,
            get innerHTML() { return this.html || ''; },
            set innerHTML(value) { this.html = value; this.children = []; },
            offsetHeight: 30, offsetWidth: 100,
            classList: { add() {}, remove() {} },
            addEventListener(type, handler) { (handlers[type] ||= []).push(handler); },
            dispatch(type, values = {}) {
                const event = { currentTarget: this, target: this, preventDefault() {}, stopPropagation() {}, ...values };
                (handlers[type] || []).forEach((handler) => handler(event));
            },
            appendChild(child) { this.children.push(child); },
            closest() { return this; },
            getBoundingClientRect: () => ({ width: 200, top: 150, left: 40 })
        };
    }
    const ids = ['comment-selection-popover', 'btn-open-reader-comments', 'btn-read-paragraph', 'btn-generate-reader-comments', 'btn-close-reader-comments',
        'reader-comment-modal', 'reader-comment-list', 'comment-selected-text', 'reader-comment-persona-count', 'reader-comment-context-note'];
    const elements = Object.fromEntries(ids.map((id) => [id, element()]));
    const requests = [];
    const saved = new Map();
    const alerts = [];
    const NR = {
        state: {
            currentFileName: 'book.txt', currentBookData: {}, allRenderedPages: [],
            aiSettings: { apiUrl: 'https://example.invalid/v1', apiKey: 'mock-key', modelName: 'mock', readerPersonas: [{ name: '剧情党', prompt: '关注剧情' }] },
            chapters: [{ title: '第4章', chap_num: 4, p_index: 0 }, { title: '第5章', chap_num: 5, p_index: 4 }],
            originalParagraphs: ['第4章', '本章已经读过的内容', '选中的木宝箱片段', '本章尚未读到的真相', '第5章', '后续章节正文'].map((textContent) => ({ textContent }))
        },
        els: { 'content-wrapper': element() },
        DEFAULT_AI_PROMPTS: { COMMENT: '只根据已读内容生成段评' },
        escapeHtml: String,
        saveBookData() {},
        handleAddToShelf: () => Promise.resolve()
    };
    const context = vm.createContext({
        window: { NovelReader: NR, innerWidth: 800, getSelection: () => ({ removeAllRanges() {} }) },
        document: { getElementById: (id) => elements[id] || null, querySelectorAll: () => [], createElement: element, addEventListener() {} },
        console: { log() {}, warn() {}, error() {} },
        localStorage: { setItem: (key, value) => saved.set(key, value), getItem: key => saved.get(key) || null },
        alert(message) { alerts.push(message); },
        fetch: async (url, options) => {
            requests.push({ url, body: JSON.parse(options.body) });
            const result = await respond(requests.at(-1), requests.length);
            return { ok: true, json: async () => ({ choices: [{ message: { content: typeof result === 'string' ? result : JSON.stringify(result) } }] }) };
        }
    });
    for (const file of ['settings.js', 'characterForm.js', 'comments.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js', file), 'utf8'), context);
    }
    NR.initCharacterFormData();
    NR.initCommentFeature();
    function open(chapter = 4) {
        NR.state.chapters[0].chap_num = chapter;
        NR.state.chapters[0].title = '第' + chapter + '章';
        NR.state.originalParagraphs[0].textContent = '第' + chapter + '章';
        const paragraph = element();
        paragraph.dataset.originalIndex = '2';
        NR.els['content-wrapper'].dispatch('contextmenu', { target: paragraph });
        elements['btn-open-reader-comments'].dispatch('click');
    }
    async function flush() {
        for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
    }
    async function generate(chapter = 4) {
        open(chapter);
        const requestStart = requests.length;
        elements['btn-generate-reader-comments'].dispatch('click');
        await flush();
        assert.ok(requests.length > 0, elements['reader-comment-list'].innerHTML);
        assert.equal(elements['btn-generate-reader-comments'].disabled, false);
        assert.ok(NR.state.activeCommentThread.comments.length > 0);
        return requests[requestStart].body.messages[0].content;
    }
    return { NR, elements, requests, generate, open, flush, saved, alerts };
}

function chapterPayload(NR, prefix) {
    return Object.fromEntries(Array.from(NR.FORM_DATA_TYPES, (def) => {
        const data = def.key === 'globalData' ? { currentLocation: prefix + def.key } : { name: prefix + def.key };
        return [def.key, def.list ? [data] : data];
    }));
}

test('paragraph comment requests include all ten categories from distant earlier chapters', async () => {
    const { NR, elements, requests, generate } = loadComments();
    NR.saveChapterFormData(chapterPayload(NR, '第二章资料_'), '第2章');
    NR.saveChapterFormData({ npcs: [] }, '第3章');
    NR.saveChapterFormData(chapterPayload(NR, '本章完整资料_'), '第4章');
    NR.saveChapterFormData(chapterPayload(NR, '后续章节资料_'), '第9章');
    const prompt = await generate();
    NR.FORM_DATA_TYPES.forEach((def) => assert.ok(prompt.includes('第二章资料_' + def.key), def.key));
    assert.doesNotMatch(prompt, /本章完整资料_|后续章节资料_/);
    assert.match(prompt, /此前章节AI数据库资料（不含本章）/);
    assert.match(elements['reader-comment-context-note'].textContent, /前文章节AI数据库/);
    assert.doesNotMatch(elements['reader-comment-context-note'].textContent, /上一章/);
    assert.equal(requests[0].url, 'https://example.invalid/v1/chat/completions');
    assert.equal(NR.state.currentBookData.comments.length, 1);
});

test('comment context retains historical identities and relationships while using the latest prior chapter facts', async () => {
    const { NR, generate } = loadComments();
    NR.saveChapterFormData({ npcs: [{ name: '丁飞翼', age: '25岁', occupation: '学生', relationships: '主角:朋友' }, { name: '董嘉庆', age: '22岁' }] }, '第2章');
    NR.saveChapterFormData({ npcs: [{ name: '丁飞翼', age: '26岁', occupation: '-', relationships: '-' }] }, '第3章');
    NR.saveChapterFormData({ npcs: [{ name: '丁飞翼', age: '99岁', occupation: '后文身份', relationships: '主角:后文关系' }] }, '第9章');
    const prompt = await generate();
    assert.match(prompt, /丁飞翼/);
    assert.match(prompt, /董嘉庆/);
    assert.match(prompt, /年龄：26岁/);
    assert.match(prompt, /职业\/身份：学生/);
    assert.match(prompt, /丁飞翼 -> 主角：朋友/);
    assert.doesNotMatch(prompt, /25岁|99岁|后文身份|后文关系/);
});

test('summaries and timeline modules include all completed prior chapters and exclude overlapping or unverified sources', async () => {
    const { NR, generate } = loadComments();
    const book = NR.state.currentBookData;
    book.summaries = [
        { range: '第3章', text: '第三章总结' }, { range: '第一章', text: '第一章总结' }, { range: '第2章', text: '第二章总结' },
        { range: '第4章', text: '本章完整总结' }, { range: '第 2-8 章', text: '跨过阅读进度的总结' },
        { range: '未知范围', text: '无法确认进度的总结' }, { range: '第9章', text: '后文总结' }
    ];
    book.timelines = [
        { range: '第1章', timeNode: '第一章节点', events: [{ title: '最早事件' }] },
        { range: '第2章', timeNode: '第二章节点', events: [{ title: '更早事件' }] },
        { range: '第三章', timeNode: '第三章节点', events: [{ title: '上章事件' }] },
        { range: '第4章', timeNode: '本章完整时间线', events: [] },
        { range: '第 2-9 章', timeNode: '跨过阅读进度的时间线', events: [] },
        { range: '未知范围', timeNode: '无法确认进度的时间线', events: [] },
        { range: '第2章', timeNode: '错误夹带后文的模块', events: [{ title: '后文事件', sourceRange: '第8章' }] }
    ];
    const prompt = await generate();
    for (const text of ['第一章总结', '第二章总结', '第三章总结', '最早事件', '更早事件', '上章事件']) assert.ok(prompt.includes(text), text);
    assert.ok(prompt.indexOf('第一章总结') < prompt.indexOf('第二章总结'));
    assert.ok(prompt.indexOf('第二章总结') < prompt.indexOf('第三章总结'));
    assert.doesNotMatch(prompt, /本章完整总结|跨过阅读进度的总结|无法确认进度的总结|后文总结|本章完整时间线|跨过阅读进度的时间线|无法确认进度的时间线|错误夹带后文的模块|后文事件/);
});

test('first chapter comments cannot fall back to later or unscoped database records', async () => {
    const { NR, generate } = loadComments();
    NR.saveChapterFormData(chapterPayload(NR, '不应出现的后文_'), '第2章');
    NR.state.currentBookData.importantNPCs.push({ data: { name: '没有来源章节的人物' } });
    NR.state.currentBookData.timelines.push({ timeNode: '没有来源章节的时间线', events: [] });
    const prompt = await generate(1);
    assert.match(prompt, /暂无前文章节AI数据库资料/);
    assert.doesNotMatch(prompt, /不应出现的后文_|没有来源章节的人物|没有来源章节的时间线/);
});

test('comments exclude unscoped and overlapping form snapshots instead of using a potentially future fallback', async () => {
    const { NR, generate } = loadComments();
    const book = NR.state.currentBookData;
    book.npcHistory = [
        { lastUpdated: '第 1-2 章', data: [{ data: { name: '已读范围中的人物' } }] },
        { lastUpdated: '第 2-7 章', data: [{ data: { name: '跨到后文的人物' } }] },
        { lastUpdated: '手动编辑', data: [{ data: { name: '无法确认来源的人物' } }] }
    ];
    book.importantNPCs = [{ data: { name: '无范围的当前人物' } }];
    book.globalData = { data: { currentLocation: '无范围的当前地点' } };
    const prompt = await generate();
    assert.match(prompt, /已读范围中的人物/);
    assert.doesNotMatch(prompt, /跨到后文的人物|无法确认来源的人物|无范围的当前人物|无范围的当前地点/);
});

test('only text through the selected paragraph is sent and regenerating comments keeps a single thread', async () => {
    const { NR, generate, requests } = loadComments();
    NR.saveChapterFormData({ npcs: [{ name: '前文人物' }] }, '第2章');
    const snapshot = JSON.stringify(NR.state.currentBookData.npcHistory);
    const first = await generate();
    assert.match(first, /本章已经读过的内容/);
    assert.match(first, /选中的木宝箱片段/);
    assert.doesNotMatch(first, /本章尚未读到的真相|后续章节正文/);
    assert.match(first, /当前场景和状态以本章已读文本为准/);
    await generate();
    assert.equal(requests.length, 2);
    assert.equal(NR.state.currentBookData.comments.length, 1);
    assert.equal(JSON.stringify(NR.state.currentBookData.npcHistory), snapshot);
});

test('the paragraph menu reads the selected paragraph once for touch plus synthetic click', () => {
    const { NR, elements, requests } = loadComments();
    const paragraph = { dataset: { originalIndex: '2' }, classList: { add() {} },
        getBoundingClientRect: () => ({ width: 200, top: 150, left: 40 }), closest() { return this; } };
    const calls = [];
    NR.startTtsFrom = (p, options) => calls.push({ p, options });
    NR.els['content-wrapper'].dispatch('contextmenu', { target: paragraph });
    assert.equal(elements['comment-selection-popover'].style.display, 'flex');
    elements['btn-read-paragraph'].dispatch('touchend');
    elements['btn-read-paragraph'].dispatch('click');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].p, paragraph);
    assert.equal(calls[0].options.paragraphOnly, true);
    assert.equal(elements['comment-selection-popover'].style.display, 'none');
    assert.equal(requests.length, 0, 'reading must not generate a paragraph comment');
});

test('adding readers increases generated comments, including name-only readers', async () => {
    const { NR, elements, requests, generate } = loadComments({ respond: request => {
        const prompt = request.body.messages[0].content;
        return NR.state.aiSettings.readerPersonas.map(persona => ({ persona: persona.name, comment: persona.name + '看到了宝箱！' }));
    } });
    await generate();
    assert.equal(NR.state.activeCommentThread.comments.length, 1);
    NR.state.aiSettings.readerPersonas.push({ name: '新读者', prompt: '' }, { name: '分析党', prompt: '分析伏笔' });
    const prompt = await generate();

    assert.match(prompt, /当前共3位读者，必须恰好返回3条评论/);
    assert.match(prompt, /新读者：以普通小说读者的身份/);
    assert.equal(elements['reader-comment-persona-count'].textContent, '3 位读者人格');
    assert.deepEqual(Array.from(NR.state.activeCommentThread.comments, comment => comment.persona), ['剧情党', '新读者', '分析党']);
    assert.equal(requests.length, 2);
    assert.equal(NR.state.currentBookData.comments.length, 1);
    assert.equal(elements['reader-comment-list'].children.length, 3);
});

test('missing readers are requested individually and duplicate or unknown replies do not increase the count', async () => {
    const { NR, requests, generate } = loadComments({ respond: (request, number) => {
        if (number === 1) return [
            { persona: '剧情党', comment: '快开宝箱！' },
            { persona: '剧情党', comment: '重复评论' },
            { persona: '不存在的读者', comment: '未知评论' }
        ];
        const prompt = request.body.messages[0].content;
        const persona = prompt.includes('1. 分析党：') ? '分析党' : '吐槽党';
        return { persona, comment: persona + '也在看宝箱！' };
    } });
    NR.state.aiSettings.readerPersonas.push({ name: '分析党', prompt: '分析' }, { name: '吐槽党', prompt: '吐槽' });
    await generate();

    assert.equal(requests.length, 3);
    assert.deepEqual(Array.from(NR.state.activeCommentThread.comments, comment => comment.persona), ['剧情党', '分析党', '吐槽党']);
    for (const request of requests.slice(1)) {
        const prompt = request.body.messages[0].content;
        assert.match(prompt, /当前共1位读者，必须恰好返回1条评论/);
        assert.match(prompt, /选中的木宝箱片段/);
        assert.doesNotMatch(prompt, /本章尚未读到的真相|后续章节正文/);
    }
});

test('complete responses are reordered to match configured readers, including duplicate names', async () => {
    const { NR, requests, generate } = loadComments({ respond: () => [
        { persona: '同名', comment: '同名读者甲' }, { persona: '剧情党', comment: '快开宝箱！' },
        { persona: '同名', comment: '同名读者乙' }
    ] });
    NR.state.aiSettings.readerPersonas.push({ name: '同名', prompt: '乐观' }, { name: '同名', prompt: '谨慎' });
    await generate();

    assert.equal(requests.length, 1);
    assert.deepEqual(Array.from(NR.state.activeCommentThread.comments, comment => comment.text), ['快开宝箱！', '同名读者甲', '同名读者乙']);
});

test('failed or truncated responses stop retrying and preserve previously saved comments', async () => {
    for (const failedResponse of ['[]', '[{"persona":"分析党","comment":"截断', '']) {
        const { NR, elements, requests, generate, open, flush } = loadComments({ respond: (request, count) =>
            count === 1 ? [{ persona: '剧情党', comment: '快开宝箱！' }] : failedResponse });
        await generate();
        const previous = JSON.stringify(NR.state.currentBookData.comments);
        NR.state.aiSettings.readerPersonas.push({ name: '分析党', prompt: '分析' });
        open();
        elements['btn-generate-reader-comments'].dispatch('click');
        await flush();

        assert.equal(requests.length, 4, 'one initial request plus one bounded retry for each missing reader');
        assert.equal(JSON.stringify(NR.state.currentBookData.comments), previous);
        assert.match(elements['reader-comment-list'].innerHTML, /未返回有效段评/);
        assert.equal(elements['btn-generate-reader-comments'].disabled, false);
    }
});

test('an empty reader list does not send an API request or clear saved comments', async () => {
    const { NR, elements, requests, generate, open, flush, alerts } = loadComments();
    await generate();
    NR.state.aiSettings.readerPersonas = [];
    open();
    elements['btn-generate-reader-comments'].dispatch('click');
    await flush();
    assert.equal(requests.length, 1);
    assert.match(alerts[0], /至少一位读者人格/);
    assert.equal(NR.state.activeCommentThread.comments.length, 1);
});

test('a delayed generation cannot save comments into another book', async () => {
    let release;
    const { NR, elements, requests, open, flush } = loadComments({ respond: () => new Promise(resolve => { release = resolve; }) });
    open();
    elements['btn-generate-reader-comments'].dispatch('click');
    elements['btn-generate-reader-comments'].dispatch('click');
    await flush();
    assert.equal(requests.length, 1, 'double clicking must not start another generation');
    NR.state.currentFileName = 'another.txt';
    NR.state.currentBookData = { comments: [] };
    release([{ persona: '剧情党', comment: '旧书的评论' }]);
    await flush();
    assert.equal(NR.state.currentBookData.comments.length, 0);
    assert.equal(elements['btn-generate-reader-comments'].disabled, false);
});
