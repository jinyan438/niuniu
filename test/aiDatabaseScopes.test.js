const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const plain = (value) => JSON.parse(JSON.stringify(value));

function loadReader() {
    function element() {
        const handlers = {};
        return {
            value: '', dataset: {}, style: {}, innerHTML: '', textContent: '', disabled: false,
            classList: { add() {}, remove() {} },
            addEventListener(type, handler) { (handlers[type] ||= []).push(handler); },
            async click() { for (const handler of handlers.click || []) await handler.call(this, { target: this }); },
            querySelector() { return element(); }, querySelectorAll() { return []; }, remove() {}
        };
    }
    const elements = new Map();
    const el = (id) => {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
    };
    const alerts = [];
    const requests = [];
    const saves = [];
    const chapters = Array.from({ length: 9 }, (_, i) => ({ chap_num: i + 1, p_index: i * 5 }));
    const NR = {
        state: {
            currentFileName: 'book.txt', currentFileContent: 'original', currentPage: 5,
            currentBookData: { summaries: [], translations: [], sequels: [] },
            aiSettings: { apiUrl: 'https://example.invalid/v1', apiKey: 'mock', modelName: 'mock', imageProvider: 'comfyui', comfyuiApiUrl: 'https://example.invalid/images' },
            chapters, originalParagraphs: Array.from({ length: 45 }, (_, i) => ({ textContent: '段落' + i })),
            allRenderedPages: chapters.flatMap((chapter) => [[chapter.p_index, chapter.p_index + 1], [chapter.p_index + 2, chapter.p_index + 3, chapter.p_index + 4]]).map((indexes) => ({
                querySelectorAll: () => indexes.map((index) => ({ dataset: { originalIndex: String(index) } }))
            })),
            phoneChatState: { calendarState: { selectedSummaries: [] } }
        },
        els: { 'app-loader': el('app-loader'), 'scene-image-choice-modal': el('scene-image-choice-modal'), 'translation-choice-modal': el('translation-choice-modal'), 'character-form-choice-modal': el('character-form-choice-modal') },
        DEFAULT_AI_PROMPTS: { TRANSLATION: '翻译本次原文', SCENE_IMAGE_PROMPT: '画面原文：{text}', SCENE_IMAGE_PROMPT_GEMINI: '漫画原文：{text}' },
        escapeHtml: String, formatTimestamp: String,
        saveBookData() { saves.push(plain(NR.state.currentBookData)); return Promise.resolve(); },
        handleAddToShelf: () => Promise.resolve(), loadBook: () => Promise.resolve(),
        getTextForChapter: (chapter) => '正文标记' + chapter
    };
    el('character-range-type').dataset.value = 'chapter';
    el('character-chapter-range').value = '3';
    el('unified-data-version').dataset.value = 'current';
    const context = vm.createContext({
        window: { NovelReader: NR },
        document: { getElementById: (id) => elements.get(id) || null, body: { insertAdjacentHTML() { el('global-data-edit-modal'); el('btn-save-edit-global'); el('btn-cancel-edit-global'); } } },
        console: { log() {}, warn() {}, error() {} }, alert: (message) => alerts.push(message),
        fetch: async (url, options) => {
            requests.push(JSON.parse(options.body));
            return { ok: true, json: async () => ({ choices: [{ message: { content: '生成结果' } }] }) };
        }
    });
    for (const file of ['ai.js', 'characterForm.js', 'phoneCalendar.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js', file), 'utf8'), context);
    }
    NR.initCharacterFormData();
    NR.renderEmbeddedDataBrowserTab = () => {};
    return { NR, el, elements, context, alerts, requests, saves };
}

function seed(NR) {
    NR.saveChapterFormData({ globalData: { currentLocation: '第二章地点' }, npcs: [{ name: '第二章人物', appearance: '黑发紫眸' }], skills: [{ name: '早期技能' }] }, '第2章', { summaryText: '第二章总结' });
    NR.saveChapterFormData({ globalData: { currentLocation: '第三章地点' }, npcs: [{ name: '第三章人物' }] }, '第3章', { summaryText: '第三章总结' });
    NR.saveChapterFormData({ globalData: { currentLocation: '第八章地点' }, npcs: [{ name: '后文人物' }] }, '第8章', { summaryText: '后文总结' });
}

test('sequel context accumulates earlier records and caps both tables and summaries by the chosen version and range', () => {
    const { NR } = loadReader();
    seed(NR);
    const version = NR.collectAllHistoryVersions().find((item) => item.label === '第 3 章');
    const historical = NR.buildAIFormContextForSequel(version, '第8章');
    assert.match(historical, /第二章人物|黑发紫眸/);
    assert.match(historical, /早期技能/);
    assert.match(historical, /第三章人物/);
    assert.match(historical, /第三章总结/);
    assert.doesNotMatch(historical, /后文人物|后文总结|第八章地点/);
    const earlier = NR.buildAIFormContextForSequel(version, '第2章');
    assert.match(earlier, /第二章人物/);
    assert.doesNotMatch(earlier, /第三章人物|第三章总结/);
    assert.doesNotMatch(NR.buildAIFormContextForSequel(), /后文人物|后文总结/);
});

test('custom actions rebuild context from the current selection instead of reusing another book or version cache', async () => {
    const { NR, el } = loadReader();
    seed(NR);
    NR.state.currentActionContext = '其他书籍的旧缓存';
    el('btn-unified-custom-action');
    el('unified-custom-action-input').value = '查看背包';
    let received;
    NR.executeActionOption = (action, context) => { received = { action, context }; };
    NR.initUnifiedActionSection();
    el('character-chapter-range').value = '2';
    await el('btn-unified-custom-action').click();
    assert.equal(received.action, '查看背包');
    assert.match(received.context, /第二章人物/);
    assert.doesNotMatch(received.context, /其他书籍的旧缓存|第三章人物|后文人物|后文总结/);
});

test('page references use paragraph positions, include earlier page snapshots and reject the full unread chapter', () => {
    const { NR } = loadReader();
    NR.saveChapterFormData({ npcs: [{ name: '第一章人物' }] }, '第1章');
    NR.saveChapterFormData({ npcs: [{ name: '本章末尾才出现的人物' }] }, '第2章');
    NR.saveChapterFormData({ npcs: [{ name: '后文人物' }] }, '第8章');
    assert.doesNotMatch(NR.buildAllDataPrompt('本次页码正文', '第 3-3 页'), /本章末尾才出现的人物|后文人物/);
    NR.saveChapterFormData({ npcs: [{ name: '前一页的人物', age: '25岁' }] }, '第 3-3 页');
    const prompt = NR.buildAllDataPrompt('本次页码正文', '第 4-4 页');
    assert.match(prompt, /第一章人物/);
    assert.match(prompt, /前一页的人物/);
    assert.doesNotMatch(prompt, /本章末尾才出现的人物|后文人物/);
    const record = NR.state.currentBookData.npcHistory.at(-1);
    assert.equal(record.sourceStartIndex, 5);
    assert.equal(record.sourceEndIndex, 6);
    assert.equal(record.sourceChapterStart, 2);
    assert.match(NR.buildAIFormContextForSequel(null, '第 4-4 页'), /本章末尾才出现的人物/);
});

test('page regeneration replaces only its own scope, clears obsolete rows and does not pollute chapter snapshots or its display', () => {
    const { NR } = loadReader();
    seed(NR);
    const oldChapter = plain(NR.state.currentBookData.npcHistory[0]);
    NR.saveChapterFormData({ npcs: [{ name: '页码旧人物' }], skills: [{ name: '页码旧技能' }] }, '第 3-3 页');
    NR.saveChapterFormData({ npcs: [{ name: '页码新人物' }], skills: [] }, '第 3-3 页');
    const book = NR.state.currentBookData;
    assert.equal(book.npcHistory.length, 4);
    assert.deepEqual(plain(book.npcHistory[0]), oldChapter);
    assert.deepEqual(plain(book.skills), []);
    assert.match(NR.renderNPCsTab(), /页码新人物/);
    assert.doesNotMatch(NR.renderNPCsTab(), /页码旧人物|后文人物/);
    assert.equal(book.npcHistory.filter((item) => item.formScopeKey === 'paragraphs:5-6').length, 1);
});

test('page scope survives repagination when its original range is referenced later', () => {
    const { NR } = loadReader();
    NR.saveChapterFormData({ npcs: [{ name: '有原文位置的人物' }] }, '第 3-3 页');
    NR.state.allRenderedPages.reverse();
    assert.match(JSON.stringify(NR.getChapterFormReferenceData('第3章')), /有原文位置的人物/);
});

test('standalone timelines keep identical time nodes in different chapters and replace all obsolete modules in the regenerated scope', () => {
    const { NR } = loadReader();
    const module = (title, timeNode = '清晨') => ({ timeNode, events: [{ title }] });
    NR.saveTimelineModules([module('第一章事件')], '第1章');
    NR.saveTimelineModules([module('第二章旧事件'), module('第二章旧阶段', '傍晚')], '第2章');
    NR.saveTimelineModules([module('第二章新事件')], '第2章');
    assert.equal(NR.state.currentBookData.timelines.length, 2);
    assert.deepEqual(plain(NR.state.currentBookData.timelines.map((item) => item.events[0].title)).sort(), ['第一章事件', '第二章新事件']);
    NR.saveTimelineModules([], '第2章');
    assert.equal(NR.state.currentBookData.timelines.length, 1);
    assert.equal(NR.state.currentBookData.timelines[0].range, '第1章');
});

test('multi-chapter timeline generation runs one chapter at a time and persists independent chapter scopes', async () => {
    const { NR } = loadReader();
    let active = 0;
    let maximum = 0;
    const seen = [];
    NR.callAIForForm = async (prompt) => {
        active++;
        maximum = Math.max(maximum, active);
        const body = prompt.split('【本次原文】\n')[1];
        const chapter = Number(/正文标记(\d+)/.exec(body)[1]);
        seen.push(chapter);
        assert.doesNotMatch(body, new RegExp('正文标记' + (chapter === 1 ? 2 : 1)));
        await new Promise((resolve) => setImmediate(resolve));
        active--;
        return { modules: [{ timeNode: '清晨', events: [{ title: '事件' + chapter }] }] };
    };
    await NR.generateTimeline('已选择两章正文', '第 1-2 章', '');
    assert.equal(maximum, 1);
    assert.deepEqual(seen, [1, 2]);
    assert.deepEqual(plain(NR.state.currentBookData.timelines.map((item) => item.range)), ['第 1 章', '第 2 章']);
});

test('malformed timeline results preserve saved data and a valid empty result clears the requested scope', async () => {
    const { NR, alerts } = loadReader();
    NR.saveTimelineModules([{ timeNode: '清晨', events: [{ title: '已有事件' }] }], '第2章');
    NR.callAIForForm = async () => ({});
    await NR.generateTimeline('本章正文', '第2章', '');
    assert.equal(NR.state.currentBookData.timelines[0].events[0].title, '已有事件');
    assert.match(alerts.at(-1), /有效的时间线/);
    NR.callAIForForm = async () => ({ modules: [] });
    await NR.generateTimeline('本章正文', '第2章', '');
    assert.equal(NR.state.currentBookData.timelines.length, 0);
});

test('historical global editor displays and saves its selected chapter without changing the latest chapter', async () => {
    const { NR, el } = loadReader();
    seed(NR);
    NR.state.viewingglobalDataVersion = 0;
    let displayed;
    NR.buildFormFields = (fields, data) => { displayed = plain(data); return ''; };
    NR.collectFormData = () => ({ currentLocation: '第二章修正地点', currentTime: '-' });
    NR.showGlobalDataEditModal();
    assert.equal(displayed.currentLocation, '第二章地点');
    await el('btn-save-edit-global').click();
    const book = NR.state.currentBookData;
    assert.equal(book.globalDataHistory.length, 3);
    assert.equal(book.globalDataHistory[0].lastUpdated, '第 2 章');
    assert.equal(book.globalDataHistory[0].data.currentLocation, '第二章修正地点');
    assert.equal(book.globalData.data.currentLocation, '第八章地点');
    assert.equal(NR.getChapterFormReferenceData('第3章').globalData.data.currentLocation, '第二章修正地点');
    assert.equal(NR.state.viewingglobalDataVersion, 0);
});

test('latest global edits update the current record, retain its source and allow clearing fields', () => {
    const { NR } = loadReader();
    seed(NR);
    const entry = NR.state.currentBookData.globalDataHistory.at(-1);
    NR.saveGlobalDataVersion({ currentLocation: '-', currentTime: '深夜' }, entry);
    assert.equal(NR.state.currentBookData.globalData.data.currentLocation, '-');
    assert.equal(NR.state.currentBookData.globalData.lastUpdated, '第 8 章');
    assert.equal(NR.state.currentBookData.globalDataHistory.length, 3);
});

test('calendar context unwraps stored data and filters automatic references by the chosen chapter', () => {
    const { NR } = loadReader();
    NR.saveChapterFormData({ globalData: { currentLocation: '历史地点', currentTime: '清晨' }, quests: [{ name: '旧任务', description: '解救村民', progress: '进行中' }], intels: [{ name: '旧线索', content: '钥匙在井边' }] }, '第2章');
    NR.saveChapterFormData({ globalData: { currentLocation: '后文地点' }, quests: [{ name: '后文任务' }], intels: [{ name: '后文线索' }] }, '第8章');
    const context = NR.buildCalendarContextText();
    assert.match(context, /历史地点|清晨/);
    assert.match(context, /解救村民/);
    assert.match(context, /钥匙在井边/);
    assert.doesNotMatch(context, /\[object Object\]|undefined|后文地点|后文任务|后文线索/);
});

test('translation and image requests carry earlier character settings while excluding later chapters', async () => {
    const { NR, requests } = loadReader();
    seed(NR);
    NR.state.currentBookData.translations = [
        { sourceRange: '第2章', content: 'Earlier translated terminology' },
        { sourceRange: '第8章', content: 'Future translated spoilers' }
    ];
    await NR.getTranslation('第三章待翻译正文', '第3章', '');
    let prompt = requests.at(-1).messages[0].content;
    assert.match(prompt, /黑发紫眸/);
    assert.match(prompt, /Earlier translated terminology/);
    assert.doesNotMatch(prompt, /后文人物|后文总结|Future translated spoilers/);
    await NR.generateSceneImagePrompt('第三章人物再次出现', '第3章');
    prompt = requests.at(-1).messages[0].content;
    assert.match(prompt, /黑发紫眸/);
    assert.match(prompt, /第三章人物再次出现/);
    assert.doesNotMatch(prompt, /后文人物|后文总结/);
});

test('previous translations with only sourceRange are sorted and referenced without reading later translations', async () => {
    const { NR, requests } = loadReader();
    NR.state.currentBookData.translations = [
        { sourceRange: '第2章', content: 'Second chapter terminology' },
        { sourceRange: '第1章', content: 'First chapter terminology' },
        { sourceRange: '第8章', content: 'Future spoilers' }
    ];
    await NR.getTranslation('第三章正文', '第3章', '');
    const prompt = requests.at(-1).messages[0].content;
    assert.ok(prompt.indexOf('First chapter terminology') < prompt.indexOf('Second chapter terminology'));
    assert.doesNotMatch(prompt, /Future spoilers/);
});

test('a selected page history version keeps its saved paragraph boundary after pagination changes', () => {
    const { NR } = loadReader();
    NR.saveChapterFormData({ npcs: [{ name: '第一章人物' }] }, '第1章');
    NR.saveChapterFormData({ npcs: [{ name: '页面中的人物' }] }, '第 3-3 页');
    NR.saveChapterFormData({ npcs: [{ name: '第三章后文人物' }] }, '第3章');
    NR.saveChapterFormData({ npcs: [{ name: '第八章后文人物' }] }, '第8章');
    const version = NR.collectAllHistoryVersions().find((item) => item.label === '第 3-3 页');
    NR.state.allRenderedPages.reverse();
    const context = NR.buildAIFormContextForSequel(version, '第8章');
    assert.match(context, /页面中的人物/);
    assert.match(context, /第一章人物/);
    assert.doesNotMatch(context, /第三章后文人物|第八章后文人物/);
});

test('legacy cross-chapter timeline modules are separated using event sources and do not expose a mixed summary', () => {
    const { NR, saves } = loadReader();
    NR.state.currentBookData.timelines = [{
        range: '第1章', timeNode: '清晨', summary: '错误混入第二章结局',
        events: [{ title: '第一章事件', sourceRange: '第1章' }, { title: '第二章旧事件', sourceRange: '第2章' }]
    }];
    NR.initCharacterFormData();
    assert.equal(NR.state.currentBookData.timelines.length, 2);
    const context = NR.buildTimelineUpdateContext('第2章', '');
    assert.match(context, /第一章事件/);
    assert.doesNotMatch(context, /第二章旧事件|错误混入第二章结局/);
    assert.equal(NR.state.currentBookData.timelines[0].legacySummary, '错误混入第二章结局');
    const count = saves.length;
    NR.initCharacterFormData();
    assert.equal(saves.length, count, 'repair is idempotent');
    NR.saveTimelineModules([{ timeNode: '清晨', events: [{ title: '第二章新事件' }] }], '第2章');
    assert.deepEqual(plain(NR.state.currentBookData.timelines.map((item) => item.events[0].title)).sort(), ['第一章事件', '第二章新事件']);
});

test('timeline batch failures retain completed chapters and the failed chapter original data', async () => {
    const { NR, alerts } = loadReader();
    NR.saveTimelineModules([{ timeNode: '清晨', events: [{ title: '原第二章事件' }] }], '第2章');
    const seen = [];
    NR.callAIForForm = async (prompt) => {
        const chapter = Number(/正文标记(\d+)/.exec(prompt.split('【本次原文】\n')[1])[1]);
        seen.push(chapter);
        if (chapter === 2) throw new Error('网络失败');
        return { modules: [{ timeNode: '清晨', events: [{ title: '已完成第一章' }] }] };
    };
    await NR.generateTimeline('选择三章正文', '第 1-3 章', '');
    assert.deepEqual(seen, [1, 2]);
    assert.deepEqual(plain(NR.state.currentBookData.timelines.map((item) => item.events[0].title)).sort(), ['原第二章事件', '已完成第一章']);
    assert.match(alerts.at(-1), /网络失败/);
});

test('an editor opened for another book cannot write into the newly selected book', async () => {
    const { NR, el } = loadReader();
    seed(NR);
    NR.showGlobalDataEditModal();
    const nextBook = { globalDataHistory: [] };
    NR.state.currentBookData = nextBook;
    NR.collectFormData = () => ({ currentLocation: '不应保存' });
    await el('btn-save-edit-global').click();
    assert.deepEqual(nextBook, { globalDataHistory: [] });
});

test('page image and translation requests reference only facts before the selected page', async () => {
    const { NR, requests } = loadReader();
    NR.saveChapterFormData({ npcs: [{ name: '第一章人物' }] }, '第1章');
    NR.saveChapterFormData({ npcs: [{ name: '第二章未读人物' }] }, '第2章');
    await NR.getTranslation('页码原文', '第 3-3 页', '');
    assert.match(requests.at(-1).messages[0].content, /第一章人物/);
    assert.doesNotMatch(requests.at(-1).messages[0].content, /第二章未读人物/);
    await NR.generateSceneImagePrompt('页码原文', '第 3-3 页');
    assert.match(requests.at(-1).messages[0].content, /第一章人物/);
    assert.doesNotMatch(requests.at(-1).messages[0].content, /第二章未读人物/);
});
