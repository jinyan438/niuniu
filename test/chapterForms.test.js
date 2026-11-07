const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadForms() {
    const alerts = [];
    const saved = [];
    const label = { textContent: '' };
    const hidden = new Set(['hidden']);
    const NR = {
        state: { currentBookData: {}, currentFileName: 'book.txt', aiSettings: {} },
        els: {
            'btn-generate-all-characters': { disabled: false },
            'character-form-choice-modal': { style: {} },
            'app-loader': {
                classList: { add: (key) => hidden.add(key), remove: (key) => hidden.delete(key) },
                querySelector: () => label
            }
        },
        saveBookData() { saved.push(JSON.parse(JSON.stringify(NR.state.currentBookData))); },
        initEmbeddedDataBrowser() {},
        escapeHtml: (value) => String(value),
        formatTimestamp: String
    };
    const context = vm.createContext({ window: { NovelReader: NR }, console: { log() {}, warn() {}, error() {} }, alert: (message) => alerts.push(message) });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js/characterForm.js'), 'utf8'), context);
    NR.initEmbeddedDataBrowser = () => {};
    NR.initCharacterFormData();
    return { NR, alerts, saved, hidden, context };
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const chapterEntry = (data, label, timestamp) => ({ data, lastUpdated: label, timestamp });

test('replaces the entire chapter across all tables without merging or retaining removed rows', () => {
    const { NR } = loadForms();
    const payload = {
        globalData: { currentLocation: '城主府', currentTime: '夜晚' },
        protagonist: { name: '主角', location: '城主府' },
        npcs: [{ name: '旧人物' }], skills: [{ name: '旧技能' }], items: [{ name: '旧物品' }],
        quests: [{ name: '旧任务' }], locations: [{ name: '旧地点' }], equipments: [{ name: '旧装备' }],
        factions: [{ name: '旧势力' }], intels: [{ name: '旧情报' }]
    };
    NR.saveChapterFormData(payload, '第2章', { summaryText: '旧总结', timelineModules: [{ timeNode: '夜晚', events: [{ title: '旧事件' }] }] });
    NR.saveChapterFormData({ globalData: { currentLocation: '湖边' }, npcs: [{ name: '新人物' }] }, '第 2 章');
    const book = NR.state.currentBookData;
    assert.deepEqual(plain(book.globalData.data), { currentLocation: '湖边' });
    assert.equal(book.protagonistInfo, null);
    assert.deepEqual(plain(book.importantNPCs.map((item) => item.data.name)), ['新人物']);
    assert.deepEqual(plain(book.skills), []);
    NR.FORM_DATA_TYPES.forEach((def) => assert.equal(book[def.history].length, 1, def.key));
    assert.equal(book.summaries.length, 0);
    assert.equal(book.timelines.length, 0);
    payload.globalData.currentLocation = '不应修改快照';
    assert.equal(book.globalDataHistory[0].data.currentLocation, '湖边');
});

test('preserves other chapters and keeps snapshots detached from current data', () => {
    const { NR } = loadForms();
    NR.saveChapterFormData({ globalData: { currentLocation: '第一章' }, items: [{ name: '第一章物品' }] }, '第 1 章');
    NR.saveChapterFormData({ globalData: { currentLocation: '第二章' }, items: [{ name: '第二章物品' }] }, '第 2 章');
    const before = plain(NR.state.currentBookData.itemsHistory[1]);
    NR.saveChapterFormData({ globalData: { currentLocation: '第一章重生成' }, items: [] }, '第 1 章');
    const book = NR.state.currentBookData;
    assert.equal(book.globalDataHistory.length, 2);
    assert.deepEqual(plain(book.itemsHistory[0]), before);
    assert.deepEqual(plain(book.items), []);
    book.globalData.data.currentLocation = '手动修改当前数据';
    assert.equal(book.globalDataHistory[1].data.currentLocation, '第一章重生成');
    NR.state.viewingglobalDataVersion = 0;
    assert.equal(NR.getViewingVersionData('globalData').data.currentLocation, '第二章');
});

test('migrates duplicate chapter labels using the newest timestamp and preserves page and sequel histories', () => {
    const { NR, saved } = loadForms();
    NR.FORM_DATA_TYPES.forEach((def) => {
        NR.state.currentBookData[def.history] = [
            chapterEntry('old', '第2章', 1), chapterEntry('page', '第 2-3 页', 2),
            chapterEntry('new', '第 2 章', 5), chapterEntry('older', '第2章', 3),
            chapterEntry('sequel', '续写: 第 2 章', 4), chapterEntry('other', '第 3 章', 6)
        ];
        NR.state['viewing' + def.type + 'Version'] = 5;
    });
    NR.initCharacterFormData();
    NR.FORM_DATA_TYPES.forEach((def) => {
        assert.deepEqual(plain(NR.state.currentBookData[def.history].map((item) => item.data)), ['page', 'new', 'sequel', 'other']);
        assert.equal(NR.state['viewing' + def.type + 'Version'], undefined);
    });
    const count = saved.length;
    NR.initCharacterFormData();
    assert.equal(saved.length, count, 'migration is idempotent');
});

test('individual saves use only their target chapter and overwrite fields including empty values', () => {
    const { NR } = loadForms();
    NR.saveChapterFormData({ globalData: { currentLocation: '第一章' }, npcs: [{ name: '甲', location: '旧位置' }] }, '第 1 章');
    NR.saveChapterFormData({ globalData: { currentLocation: '第二章' }, npcs: [{ name: '乙' }], skills: [{ name: '第二章技能' }] }, '第 2 章');
    NR.saveNPCData({ name: '甲', location: '-' }, '第1章');
    NR.saveNPCData({ name: '丙' }, '第 1 章');
    NR.saveGlobalData({ currentLocation: '-' }, '第 1 章');
    NR.saveProtagonistData({ name: '主角' }, '第 1 章');
    for (const [method, key] of [['saveSkillData', 'skills'], ['saveItemData', 'items'], ['saveQuestData', 'quests'], ['saveLocationData', 'locations'], ['saveEquipmentData', 'equipments'], ['saveFactionData', 'factions'], ['saveIntelData', 'intels']]) {
        NR[method]({ name: '本章' }, '第 1 章');
        NR[method]({ name: '本章', description: '-' }, '第1章');
        assert.equal(NR.state.currentBookData[key].length, 1);
    }
    const book = NR.state.currentBookData;
    assert.equal(book.globalData.data.currentLocation, '-');
    assert.deepEqual(plain(book.importantNPCs.map((item) => item.data)), [{ name: '甲', location: '-' }, { name: '丙' }]);
    assert.equal(book.npcHistory.length, 2);
    assert.deepEqual(plain(book.npcHistory[0].data.map((item) => item.data.name)), ['乙']);
    NR.saveAllDataSnapshot('第 1 章');
    NR.saveAllDataSnapshot('第1章');
    assert.equal(book.npcHistory.length, 2);
    assert.equal(book.globalDataHistory.length, 2);
});

test('same timeline time node in different chapters remains independent and is replaced on regeneration', () => {
    const { NR } = loadForms();
    const timeline = (title) => [{ timeNode: '子时', events: [{ title }] }];
    NR.saveChapterFormData({ npcs: [] }, '第1章', { summaryText: '一', timelineModules: timeline('一') });
    NR.saveChapterFormData({ npcs: [] }, '第2章', { summaryText: '二', timelineModules: timeline('二') });
    NR.saveChapterFormData({ npcs: [] }, '第1章', { summaryText: '新一', timelineModules: timeline('新一') });
    const book = NR.state.currentBookData;
    assert.equal(book.timelines.length, 2);
    assert.equal(book.summaries.length, 2);
    assert.deepEqual(plain(book.timelines.map((item) => item.events[0].title)).sort(), ['二', '新一']);
    assert.ok(book.timelines.every((item) => item.events[0].sourceRange === item.range));
});

test('batch generation serializes chapters, saves each separately and overwrites existing chapters', async () => {
    const { NR, hidden, saved, alerts } = loadForms();
    NR.saveChapterFormData({ globalData: { currentLocation: '原第二章' } }, '第2章');
    let active = 0;
    let maxActive = 0;
    const seen = [];
    NR.getTextForChapter = (chapter) => '正文' + chapter;
    NR.callAIForForm = async (prompt) => {
        active++;
        maxActive = Math.max(maxActive, active);
        assert.ok(!prompt.includes('原第二章'));
        const chapter = Number(/正文(\d+)/.exec(prompt)[1]);
        if (chapter > 1) assert.ok(prompt.includes('人物' + (chapter - 1)), 'each batch references completed earlier chapters');
        seen.push(chapter);
        await new Promise((resolve) => setImmediate(resolve));
        active--;
        return { globalData: { currentLocation: '章' + chapter }, npcs: [{ name: '人物' + chapter }] };
    };
    NR.generateSummaryForFillForm = async (text) => text;
    NR.generateTimelineForFillForm = async () => [];
    assert.equal(await NR.generateChapterCharacterForms(1, 3), 3);
    assert.equal(maxActive, 1);
    assert.deepEqual(seen, [1, 2, 3]);
    assert.ok(saved.some((book) => book.globalDataHistory.length === 2));
    NR.FORM_DATA_TYPES.forEach((def) => assert.equal(NR.state.currentBookData[def.history].length, 3));
    assert.deepEqual(plain(NR.state.currentBookData.npcHistory.map((item) => item.data.map((record) => record.data.name))), [['人物1'], ['人物2'], ['人物3']]);
    assert.equal(NR.els['btn-generate-all-characters'].disabled, false);
    assert.equal(NR.state.generatingChapterForms, false);
    assert.ok(hidden.has('hidden'));
    assert.match(alerts.at(-1), /3 个章节/);
});

test('failure stops the batch, retains completed chapters and leaves failed chapter data intact', async () => {
    const { NR, alerts } = loadForms();
    NR.saveChapterFormData({ globalData: { currentLocation: '原第二章' } }, '第2章');
    const seen = [];
    NR.getTextForChapter = (chapter) => '正文' + chapter;
    NR.callAIForForm = async (prompt) => {
        const chapter = Number(/正文(\d+)/.exec(prompt)[1]);
        seen.push(chapter);
        if (chapter === 2) throw new Error('网络错误');
        return { globalData: { currentLocation: '新一' } };
    };
    NR.generateSummaryForFillForm = async () => null;
    NR.generateTimelineForFillForm = async () => [];
    assert.equal(await NR.generateChapterCharacterForms(1, 3), 1);
    assert.deepEqual(seen, [1, 2]);
    assert.deepEqual(plain(NR.state.currentBookData.globalDataHistory.map((item) => item.data.currentLocation)), ['原第二章', '新一']);
    assert.match(alerts.at(-1), /已保存 1 个章节。第 2 章生成失败/);
});

test('rejects malformed output before changing saved data', () => {
    const { NR } = loadForms();
    NR.saveChapterFormData({ npcs: [] }, '第1章');
    const before = plain(NR.state.currentBookData);
    for (const data of [null, [], {}, { unrelated: true }]) {
        assert.throws(() => NR.saveChapterFormData(data, '第1章'), /有效的章节填表/);
        assert.deepEqual(plain(NR.state.currentBookData), before);
    }
    assert.equal(NR.getFormChapterNumber('第 1-3 章'), null);
    assert.equal(NR.getFormChapterNumber('续写: 第 1 章'), null);
});

test('latest NPC and protagonist views display their chapter snapshots instead of accumulated profiles', () => {
    const { NR } = loadForms();
    NR.saveChapterFormData({ protagonist: { name: '主角' }, npcs: [{ name: '第一章人物' }] }, '第1章');
    NR.saveChapterFormData({ protagonist: null, npcs: [{ name: '第二章人物' }] }, '第2章');
    const html = NR.renderNPCsTab();
    assert.match(html, /第二章人物/);
    assert.doesNotMatch(html, /第一章人物/);
    assert.match(NR.renderProtagonistTab(), /该章节暂无主角数据/);
    NR.state.viewingnpcVersion = 0;
    assert.match(NR.renderNPCsTab(), /第一章人物/);
    assert.doesNotMatch(NR.renderNPCsTab(), /第二章人物<\/h4>/);
});

test('single-chapter preview does not merge old data and the save button replaces the chapter', async () => {
    const fixture = loadForms();
    const { NR, context } = fixture;
    NR.saveChapterFormData({ npcs: [{ name: '新人物', age: '25岁', relationships: '主角:朋友' }] }, '第1章');
    NR.saveChapterFormData({ globalData: { currentLocation: '旧地点', currentTime: '旧时间' }, npcs: [{ name: '旧人物' }], skills: [{ name: '旧技能' }] }, '第2章');
    const before = plain(NR.state.currentBookData);
    const values = { 'global-currentLocation': '新地点', 'global-currentTime': '-', 'npc-0-name': '新人物', 'npc-0-location': '-' };
    function button() {
        return { addEventListener(event, handler) { this[event] = handler; } };
    }
    const saveButton = button();
    const closeButton = button();
    const card = {
        dataset: { index: '0' },
        querySelector(selector) { return { value: values[selector.replace('#form-', '')] || '-' }; }
    };
    const modal = {
        removed: false,
        remove() { this.removed = true; },
        addEventListener() {},
        querySelector(selector) {
            if (selector === '.close-button') return closeButton;
            if (selector.startsWith('#form-')) return { value: values[selector.replace('#form-', '')] || '-' };
            return null;
        },
        querySelectorAll(selector) {
            return selector === '.npc-form-card[data-type="npc"]' ? [card] : [];
        }
    };
    let inserted = false;
    context.document = {
        getElementById(id) {
            if (id === 'btn-save-all-characters') return saveButton;
            if (id === 'all-characters-form-modal' && inserted) return modal;
            return null;
        },
        body: { insertAdjacentHTML() { inserted = true; } }
    };
    const preview = {};
    const buildFields = NR.buildFormFields;
    NR.buildFormFields = (fields, data, prefix) => {
        preview[prefix] = plain(data);
        return buildFields(fields, data, prefix);
    };
    NR.callAIForForm = async (prompt) => {
        assert.ok(!prompt.includes('旧时间'));
        assert.ok(prompt.includes('25岁'));
        assert.ok(prompt.includes('主角:朋友'));
        return { globalData: { currentLocation: '新地点' }, npcs: [{ name: '新人物', location: '-' }] };
    };
    NR.generateSummaryForFillForm = async () => '新总结';
    NR.generateTimelineForFillForm = async () => [];
    await NR.generateAllCharacterForms('本章正文', '第 2 章');
    assert.deepEqual(plain(NR.state.currentBookData), before, 'preview is not saved until the user clicks save');
    assert.deepEqual(preview.global, { currentLocation: '新地点' });
    saveButton.click();
    assert.equal(NR.state.currentBookData.globalDataHistory.length, 2);
    assert.equal(NR.state.currentBookData.globalData.data.currentTime, '-');
    assert.deepEqual(plain(NR.state.currentBookData.importantNPCs.map((item) => item.data.name)), ['新人物']);
    assert.equal(NR.state.currentBookData.skills.length, 0);
    assert.equal(NR.state.currentBookData.summaries[0].text, '新总结');
    assert.ok(modal.removed);
});

test('batch waits for persistence before starting the next chapter and ignores repeated starts', async () => {
    const { NR } = loadForms();
    const seen = [];
    let finishSave;
    NR.getTextForChapter = (chapter) => '正文' + chapter;
    NR.callAIForForm = async (prompt) => {
        seen.push(Number(/正文(\d+)/.exec(prompt)[1]));
        return { npcs: [] };
    };
    NR.generateSummaryForFillForm = async () => null;
    NR.generateTimelineForFillForm = async () => [];
    NR.saveBookData = () => new Promise((resolve) => { finishSave = resolve; });
    const pending = NR.generateChapterCharacterForms(1, 2);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(seen, [1]);
    assert.equal(await NR.generateChapterCharacterForms(1, 2), undefined);
    finishSave();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(seen, [1, 2]);
    finishSave();
    assert.equal(await pending, 2);
});

test('switching books while a chapter request is pending cannot write into the new book', async () => {
    const { NR } = loadForms();
    let finishRequest;
    NR.getTextForChapter = () => '正文';
    NR.callAIForForm = () => new Promise((resolve) => { finishRequest = resolve; });
    NR.generateSummaryForFillForm = async () => null;
    NR.generateTimelineForFillForm = async () => [];
    const pending = NR.generateChapterCharacterForms(1, 2);
    const otherBook = {};
    NR.state.currentFileName = 'other.txt';
    NR.state.currentBookData = otherBook;
    finishRequest({ npcs: [] });
    assert.equal(await pending, 0);
    assert.deepEqual(otherBook, {});
    assert.equal(NR.els['btn-generate-all-characters'].disabled, false);
});

test('chapter details use the selected snapshot even when current data belongs to another chapter', () => {
    const { NR, context } = loadForms();
    NR.saveChapterFormData({ npcs: [{ name: '同名人物', location: '第一章地点' }], skills: [{ name: '技能', description: '第一章效果' }] }, '第1章');
    NR.saveChapterFormData({ npcs: [{ name: '同名人物', location: '第二章地点' }], skills: [{ name: '技能', description: '第二章效果' }] }, '第2章');
    NR.state.viewingnpcVersion = 0;
    NR.state.viewingskillsVersion = 0;
    let html;
    context.document = {
        getElementById: () => ({ querySelector: () => ({ addEventListener() {} }), remove() {}, addEventListener() {} }),
        body: { insertAdjacentHTML(position, value) { html = value; } }
    };
    NR.showFormCharacterDetail('同名人物', 'npc');
    assert.match(html, /第一章地点/);
    assert.doesNotMatch(html, /第二章地点/);
    NR.showDataItemDetail('skill', 0);
    assert.match(html, /第一章效果/);
    assert.doesNotMatch(html, /第二章效果/);
});

test('all ten form types reference distant earlier chapters without leaking current or future data', () => {
    const { NR } = loadForms();
    const payload = (prefix) => Object.fromEntries(Array.from(NR.FORM_DATA_TYPES, (def) => {
        const data = { name: def.key, description: prefix + def.key };
        return [def.key, def.list ? [data] : data];
    }));
    NR.saveChapterFormData(payload('第二章资料_'), '第2章');
    NR.saveChapterFormData({ npcs: [] }, '第3章');
    NR.saveChapterFormData(payload('后文资料_'), '第10章');
    const before = plain(NR.state.currentBookData);
    const prompt = NR.buildAllDataPrompt('第四章原文', '第4章');
    NR.FORM_DATA_TYPES.forEach((def) => {
        assert.ok(prompt.includes('第二章资料_' + def.key), def.key);
        assert.ok(!prompt.includes('后文资料_' + def.key), def.key);
    });
    assert.match(prompt, /仅返回本章出现、提及或明确发生状态变化的条目/);
    assert.match(prompt, /临时状态需要本章证据/);
    const redo = NR.buildAllDataPrompt('重做第二章', '第2章');
    assert.ok(!redo.includes('第二章资料_'));
    assert.ok(!redo.includes('后文资料_'));
    assert.deepEqual(plain(NR.state.currentBookData), before, 'reference gathering does not mutate snapshots or profiles');
});

test('reference values follow chapter order, preserve known fields across omissions and accept new facts', () => {
    const { NR } = loadForms();
    NR.saveChapterFormData({ globalData: { currentLocation: '第二章地点' }, npcs: [{ name: '甲', age: '25岁', occupation: '学生' }] }, '第2章');
    NR.saveChapterFormData({ globalData: { currentLocation: '第十章地点' }, npcs: [{ name: '甲', age: '30岁', occupation: '-' }] }, '第10章');
    NR.saveChapterFormData({ globalData: { currentLocation: '第一章地点' }, npcs: [{ name: '甲', age: '20岁' }] }, '第1章');
    const later = NR.getChapterFormReferenceData('第11章');
    assert.equal(later.importantNPCs[0].data.age, '30岁');
    assert.equal(later.importantNPCs[0].data.occupation, '学生');
    assert.equal(later.globalData.data.currentLocation, '第十章地点');
    const earlier = NR.getChapterFormReferenceData('第3章');
    assert.equal(earlier.importantNPCs[0].data.age, '25岁');
    assert.equal(earlier.globalData.data.currentLocation, '第二章地点');
    const profile = NR.state.currentBookData.characterProfiles.find((item) => item.name === '甲');
    assert.equal(profile.data['年龄'], '30岁', 'regenerating an earlier chapter cannot roll the shared profile back');
    assert.equal(profile.lastUpdated, '第 10 章');
});

test('legacy chapter ranges and records without snapshots are filtered using the entire source range', () => {
    const { NR } = loadForms();
    const book = NR.state.currentBookData;
    book.npcHistory = [
        chapterEntry([{ data: { name: '前文人物' } }, { data: { name: '错误夹带后文' }, lastUpdated: '第4章' }], '第 1-2 章', 1),
        chapterEntry([{ data: { name: '跨越目标章' } }], '第 2-8 章', 2),
        chapterEntry([{ data: { name: '无法判断章节' } }], '手动编辑', 3)
    ];
    book.importantNPCs = [chapterEntry({ name: '当前后文人物' }, '第10章', 4)];
    book.globalData = chapterEntry({ currentLocation: '旧版前文地点' }, '第2章', 1);
    const prompt = NR.buildAllDataPrompt('本章原文', '第3章');
    assert.match(prompt, /前文人物/);
    assert.match(prompt, /旧版前文地点/);
    assert.doesNotMatch(prompt, /错误夹带后文|跨越目标章|无法判断章节|当前后文人物/);
});

test('shared NPC and protagonist profiles retain known values while chapter snapshots remain independent', () => {
    const { NR } = loadForms();
    const known = { age: '25岁', occupation: '学生', appearance: '黑发', relationships: '主角:朋友', inScene: '在场' };
    NR.saveChapterFormData({ protagonist: { ...known, name: '主角' }, npcs: [{ ...known, name: '甲' }] }, '第2章');
    const history = plain(NR.state.currentBookData.npcHistory[0]);
    NR.saveChapterFormData({
        protagonist: { name: '主角', age: '-', occupation: '', appearance: '未知', inScene: '离场' },
        npcs: [{ name: '甲', age: '-', occupation: null, appearance: '不详', relationships: '-', inScene: '离场' }]
    }, '第3章');
    NR.state.currentBookData.characterProfiles.forEach((profile) => {
        assert.equal(profile.data['年龄'], '25岁');
        assert.equal(profile.data['身份'], '学生');
        assert.equal(profile.data['外貌'], '黑发');
        assert.equal(profile.data['人际关系'], '主角:朋友');
        assert.equal(profile.data['在场状态'], '离场');
    });
    assert.deepEqual(plain(NR.state.currentBookData.npcHistory[0]), history);
    assert.equal(NR.state.currentBookData.npcHistory[1].data[0].data.age, '-');
    assert.equal(NR.state.currentBookData.protagonistHistory[1].data.age, '-');
});

test('profile synchronization matches aliases, preserves metadata and updates relationships by person', () => {
    const { NR } = loadForms();
    NR.saveChapterFormData({ npcs: [{ name: '甲', age: '25岁', relationships: '乙:朋友;丙:老师', baseAttributes: '力量:60;敏捷:70' }] }, '第2章');
    const profile = NR.state.currentBookData.characterProfiles[0];
    profile.aliases = ['小甲'];
    profile.cover = 'existing-cover';
    NR.saveChapterFormData({ npcs: [{ name: '小甲', age: '26岁', relationships: '乙:敌人;丁:同伴', baseAttributes: '力量:80;敏捷:未知' }] }, '第3章');
    const updated = NR.state.currentBookData.characterProfiles[0];
    assert.equal(NR.state.currentBookData.characterProfiles.length, 1);
    assert.equal(updated.name, '甲');
    assert.equal(updated.data['年龄'], '26岁');
    assert.equal(updated.data['人际关系'], '乙:敌人;丙:老师;丁:同伴');
    assert.equal(updated.data['基础属性'], '力量:80;敏捷:70');
    assert.equal(updated.cover, 'existing-cover');
    assert.deepEqual(plain(updated.aliases), ['小甲']);
    NR.syncNPCToCharacterProfiles({ name: '甲', relationships: '无', items: '无' }, '第4章');
    assert.equal(NR.state.currentBookData.characterProfiles[0].data['人际关系'], '无');
    assert.equal(NR.state.currentBookData.characterProfiles[0].data['物品'], '无');
});

test('initialization restores previously blanked profile fields from history without changing manual values or snapshots', () => {
    const { NR, saved } = loadForms();
    NR.saveChapterFormData({ npcs: [{ name: '甲', age: '25岁', relationships: '主角:朋友', occupation: '学生' }] }, '第2章');
    NR.saveChapterFormData({ npcs: [{ name: '甲', age: '-', relationships: '-' }] }, '第3章');
    const book = NR.state.currentBookData;
    const profile = book.characterProfiles[0];
    profile.data['年龄'] = '-';
    profile.data['人际关系'] = '-';
    profile.data['身份'] = '手动修改的身份';
    profile.cover = 'existing-cover';
    const snapshots = plain(book.npcHistory);
    const count = saved.length;
    NR.initCharacterFormData();
    assert.equal(profile.data['年龄'], '25岁');
    assert.equal(profile.data['人际关系'], '主角:朋友');
    assert.equal(profile.data['身份'], '手动修改的身份');
    assert.equal(profile.cover, 'existing-cover');
    assert.deepEqual(plain(book.npcHistory), snapshots);
    assert.equal(saved.length, count + 1);
    NR.initCharacterFormData();
    assert.equal(saved.length, count + 1, 'restoration is persisted once and then idempotent');
});

test('timeline references exclude current, future and overlapping chapter summaries and modules', async () => {
    const { NR } = loadForms();
    NR.saveChapterFormData({ globalData: { currentTime: '前文时间' }, npcs: [{ name: '前文人物' }] }, '第2章', {
        summaryText: '前文总结', timelineModules: [{ timeNode: '前文节点', summary: '前文事件', events: [] }]
    });
    NR.saveChapterFormData({ globalData: { currentTime: '后文时间' }, npcs: [{ name: '后文人物' }] }, '第10章', {
        summaryText: '后文总结', timelineModules: [{ timeNode: '后文节点', summary: '后文事件', events: [] }]
    });
    NR.state.currentBookData.summaries.push({ range: '第 1-5 章', text: '跨越本章总结' }, { range: '第3章', text: '本章旧总结' });
    NR.callAIForForm = async (prompt) => {
        assert.match(prompt, /前文时间|前文人物/);
        assert.match(prompt, /前文总结/);
        assert.match(prompt, /前文事件/);
        assert.doesNotMatch(prompt, /后文时间|后文人物|后文总结|后文事件|跨越本章总结|本章旧总结/);
        return { modules: [{ timeNode: '新节点', events: [{ title: '本章事件' }] }] };
    };
    const modules = await NR.generateTimelineForFillForm('本章原文', '第3章');
    assert.equal(modules.length, 1);
    assert.equal(modules[0].events[0].sourceTime, '前文时间');
});

test('phone chat reads the updated profile even when the selected character object is cached', () => {
    const { NR } = loadForms();
    NR.saveChapterFormData({ npcs: [{ name: '甲', age: '25岁', relationships: '主角:朋友' }] }, '第2章');
    const cached = NR.state.currentBookData.characterProfiles[0];
    NR.saveChapterFormData({ npcs: [{ name: '甲', age: '26岁', relationships: '-' }] }, '第3章');
    NR.DEFAULT_AI_PROMPTS = { PHONE_CHAT_ROLEPLAY: '{character_info}\n{user_info}\n{context_info}\n{sticker_list}' };
    NR.getUserRoleInfo = () => '';
    NR.getStickerListForPrompt = () => '';
    const prompt = NR.buildPhoneChatPrompt(cached, []);
    assert.match(prompt, /26岁/);
    assert.match(prompt, /主角:朋友/);
    assert.doesNotMatch(prompt, /25岁/);
});
