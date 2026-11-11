const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function settings(saved = new Map()) {
    function element() {
        const inputs = { '.reader-persona-name': { value: '' }, '.reader-persona-prompt': { value: '' } };
        return {
            children: [],
            set innerHTML(value) { this.children = []; },
            querySelector(selector) { return inputs[selector]; },
            querySelectorAll() { return this.children; },
            appendChild(child) { this.children.push(child); child.parent = this; },
            remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
        };
    }
    const NR = {
        state: { aiSettings: JSON.parse(saved.get('novelReaderAiSettings') || '{"apiUrl":"mock-url","modelName":"mock-model"}') },
        els: { 'ai-reader-personas': element() },
        DEFAULT_READER_PERSONAS_TEXT: '剧情党：关注剧情\n吐槽党：轻松吐槽'
    };
    const context = vm.createContext({ window: { NovelReader: NR }, document: { createElement: element },
        localStorage: { setItem: (key, value) => saved.set(key, value) } });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js/settings.js'), 'utf8'), context);
    NR.renderReaderPersonaCards(NR.state.aiSettings.readerPersonas || NR.DEFAULT_READER_PERSONAS_TEXT);
    return { NR, saved, container: NR.els['ai-reader-personas'] };
}

test('adding multiple readers preserves earlier blank prompts and immediately persists the new count', () => {
    const { NR, saved } = settings();
    NR.addReaderPersonaCard();
    NR.addReaderPersonaCard();
    const stored = JSON.parse(saved.get('novelReaderAiSettings'));
    assert.equal(stored.readerPersonas.length, 4);
    assert.equal(stored.readerPersonas[2].name, '读者3');
    assert.equal(stored.readerPersonas[2].prompt, '');
    assert.equal(stored.readerPersonas[3].name, '读者4');
    assert.equal(stored.apiUrl, 'mock-url');
    assert.equal(stored.modelName, 'mock-model');
});

test('a name-only reader survives editing, adding another reader and restarting settings', () => {
    const { NR, container, saved } = settings();
    NR.addReaderPersonaCard();
    container.children[2].querySelector('.reader-persona-name').value = '  新读者  ';
    NR.saveReaderPersonas();
    NR.addReaderPersonaCard();
    const restarted = settings(saved);
    const readers = restarted.NR.collectReaderPersonaCards();
    assert.equal(readers.length, 4);
    assert.equal(readers[2].name, '新读者');
    assert.equal(readers[2].prompt, '');
});

test('removing readers persists deletion including an intentionally empty list', () => {
    const { NR, container, saved } = settings();
    while (container.children.length) NR.removeReaderPersonaCard({ closest: () => container.children[0] });
    assert.equal(JSON.parse(saved.get('novelReaderAiSettings')).readerPersonas.length, 0);
    assert.equal(settings(saved).NR.collectReaderPersonaCards().length, 0);
    NR.addReaderPersonaCard();
    assert.equal(NR.state.aiSettings.readerPersonas.length, 1);
});

test('legacy persona text and blank array names normalize consistently', () => {
    const { NR } = settings();
    const legacy = NR.normalizeReaderPersonaList(' 剧情党： 关注剧情\n\n吐槽党: 风格:轻松 ');
    assert.deepEqual(Array.from(legacy, reader => ({ ...reader })), [
        { name: '剧情党', prompt: '关注剧情' }, { name: '吐槽党', prompt: '风格：轻松' }
    ]);
    const readers = NR.normalizeReaderPersonaList([{ name: '　 ', prompt: '' }, { name: ' 甲 ', prompt: ' 提示 ' }]);
    assert.deepEqual(Array.from(readers, reader => ({ ...reader })), [{ name: '读者1', prompt: '' }, { name: '甲', prompt: '提示' }]);
});
