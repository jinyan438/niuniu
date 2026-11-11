const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const audioBytes = Buffer.from('524946462800000057415645666d74201000000001000100007d000000fa00000200100064617461040000000000ff7f', 'hex');
const audioResponse = () => new Response(audioBytes, { headers: { 'Content-Type': 'audio/wav' } });
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
async function flush() {
    for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
}

function setup({ fetch = async () => audioResponse(), nativeRequest, filesystem, play = async () => {} } = {}) {
    let nextTimer = 0;
    let now = 10000;
    const timers = new Map();
    const blobs = [];
    const revoked = [];
    const paragraph = text => {
        const classes = new Set();
        return { textContent: text, dataset: { originalIndex: '0' }, isSameNode(other) { return this === other; },
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) } };
    };
    const paragraphs = [paragraph('第一段。'), paragraph('第二段。')];
    paragraphs[1].dataset.originalIndex = '1';
    const els = new Proxy({}, { get(target, key) { return target[key] ||= { style: {}, textContent: '', innerHTML: '', classList: { toggle() {} } }; } });
    const audio = { playCalls: 0, load() {}, pause() {}, removeAttribute() {}, play() { this.playCalls++; return play(); } };
    const NR = {
        els,
        state: { ttsAudioElement: audio, originalParagraphs: paragraphs, currentPage: 1,
            allRenderedPages: [{ querySelectorAll: () => paragraphs, querySelector: selector =>
                paragraphs.find(p => selector.includes('"' + p.dataset.originalIndex + '"')) || null }] },
        isCapacitor: () => !!nativeRequest
    };
    const context = vm.createContext({
        window: { NovelReader: NR, Capacitor: nativeRequest ? {
            Plugins: { CapacitorHttp: { request: nativeRequest }, Filesystem: filesystem },
            convertFileSrc: uri => 'http://localhost/_capacitor_file_' + uri
        } : undefined },
        console: { log() {}, warn() {}, error() {} },
        localStorage: { setItem() {} },
        document: { querySelector: () => null },
        alert() {}, requestAnimationFrame: fn => fn(),
        AbortController, Response, Headers, Blob, Uint8Array,
        Date: class extends Date { static now() { return now; } },
        atob: data => Buffer.from(data, 'base64').toString('binary'),
        btoa: data => Buffer.from(data, 'binary').toString('base64'),
        URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:audio-' + blobs.length; }, revokeObjectURL(url) { revoked.push(url); } },
        setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
        clearTimeout: id => timers.delete(id), setInterval: () => ++nextTimer, clearInterval() {}
    });
    context.fetch = fetch;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js/tts.js'), 'utf8'), context);
    const voice = { id: 'voice', name: '测试音色', gptPath: 'model.ckpt', sovitsPath: 'model.pth', refAudioPath: 'ref.wav', promptLang: 'zh', promptText: '你好。' };
    Object.assign(NR.ttsController.settings, {
        gptSovitsApiUrl: 'http://example.test:9880/', gptSovitsVoices: [voice], gptSovitsActiveVoiceId: voice.id,
        indexTtsApiUrl: '[2001:db8::1]:9881/', indexTtsVoices: [voice], indexTtsActiveVoiceId: voice.id
    });
    NR.ttsController.renderAllUI = () => {};
    NR.ttsController.updateProviderUI = () => {};
    NR.ttsController.loadVoiceById = async () => voice;
    return {
        NR, audio, paragraphs, blobs, revoked, context,
        advanceClock(ms) { now += ms; },
        start(index = 0) { NR.startTtsFrom(paragraphs[index]); },
        runTimers(ms) {
            for (const [id, timer] of [...timers]) {
                if (timer.ms === ms) { timers.delete(id); timer.fn(); }
            }
        }
    };
}

test('normalizes bare IPv6 and endpoint URLs before fetching the IndexTTS catalog', async () => {
    const urls = [];
    const h = setup({ fetch: async url => {
        urls.push(url);
        return Response.json({ voices: [{ id: '沐小语', name: '沐小语' }] });
    } });
    h.NR.ttsController.settings.provider = 'indextts';
    await h.NR.ttsController.fetchIndexTtsVoices(false, true);
    assert.equal(urls[0], 'http://[2001:db8::1]:9881/voices');
    h.NR.ttsController.setCurrentApiUrl(' http://example.test:9881/tts/ ');
    assert.equal(h.NR.ttsController.getCurrentApiUrl(), 'http://example.test:9881');
    assert.equal(h.NR.ttsController.settings.indexTtsVoices[0].name, '沐小语');
});

test('Android requests explicit binary audio and preserves every WAV byte', async t => {
    const calls = [];
    const h = setup({ nativeRequest: async options => {
        calls.push(options);
        return { status: 200, headers: { 'content-type': 'audio/wav' }, data: audioBytes.toString('base64') };
    } });
    t.after(() => h.NR.stopTts());
    h.start();
    await flush();
    assert.equal(calls[0].responseType, 'arraybuffer');
    assert.equal(calls[0].data.streaming_mode, false);
    assert.equal(calls[0].data.media_type, 'wav');
    assert.equal(calls[0].readTimeout, 120000);
    assert.deepEqual(Buffer.from(await h.blobs[0].arrayBuffer()), audioBytes);
    assert.equal(h.NR.ttsState.isPlaying, true);
});

test('prefetch completion cannot consume another segment while play is pending', async t => {
    const pending = deferred();
    const h = setup({ play: () => pending.promise });
    t.after(() => h.NR.stopTts());
    h.start();
    await flush();
    h.runTimers(0);
    await flush();
    assert.equal(h.NR.ttsState.isStarting, true);
    assert.equal(h.NR.ttsState.currentSequence, 0);
    assert.equal(h.NR.ttsState.audioQueue.size, 1);
    assert.equal(h.audio.playCalls, 1);
    assert.equal(h.NR.els['tts-status'].textContent, '准备播放...');
    pending.resolve();
    await flush();
    assert.equal(h.NR.ttsState.isPlaying, true);
    h.NR.onAudioEnded();
    h.runTimers(0);
    await flush();
    assert.equal(h.NR.ttsState.currentSequence, 1);
    assert.equal(h.audio.playCalls, 1, 'the next paragraph waits for its natural pause');
    h.runTimers(700);
    await flush();
    assert.equal(h.audio.playCalls, 2);
});

test('autoplay rejection retains the paragraph and resumes on a user click', async t => {
    let blocked = true;
    const h = setup({ play: async () => {
        if (blocked) throw Object.assign(new Error('user gesture required'), { name: 'NotAllowedError' });
    } });
    t.after(() => h.NR.stopTts());
    h.start();
    await flush();
    assert.equal(h.NR.ttsState.isPaused, true);
    assert.equal(h.NR.ttsState.currentSequence, 0);
    assert.match(h.NR.els['tts-status'].textContent, /点击播放/);
    blocked = false;
    h.NR.toggleTtsPlayback();
    await flush();
    assert.equal(h.NR.ttsState.isPlaying, true);
    assert.equal(h.NR.ttsState.currentSequence, 0);
});

test('a never-resolving play promise fails visibly instead of buffering forever', async () => {
    const h = setup({ play: () => new Promise(() => {}) });
    h.start();
    await flush();
    h.runTimers(15000);
    await flush();
    assert.equal(h.NR.ttsState.isActive, false);
    assert.match(h.NR.els['tts-status'].textContent, /播放启动超时/);
});

test('a late response from a stopped session cannot replace the current audio', async t => {
    const old = deferred();
    let count = 0;
    const h = setup({ fetch: async () => ++count === 1 ? old.promise : audioResponse() });
    t.after(() => h.NR.stopTts());
    h.start();
    await flush();
    h.start(1);
    await flush();
    const current = h.NR.ttsState.currentPlayItem;
    old.resolve(audioResponse());
    await flush();
    assert.equal(h.NR.ttsState.currentPlayItem, current);
    assert.equal(current.paragraph, h.paragraphs[1]);
    assert.equal(h.blobs.length, 1);
    assert.equal(h.NR.ttsState.inFlightRequests, 0);
});

test('HTTP and non-audio responses produce an error instead of silent skipping', async () => {
    const h = setup({ fetch: async () => Response.json({ detail: 'model unavailable' }, { status: 503 }) });
    h.start();
    await flush();
    h.runTimers(1000);
    await flush();
    assert.equal(h.NR.ttsState.isActive, false);
    assert.match(h.NR.els['tts-status'].textContent, /503.*model unavailable/);
});

test('unplayable blob falls back to a local file once on Android', async t => {
    let plays = 0;
    let cachedBytes;
    const h = setup({
        nativeRequest: async () => ({ status: 200, headers: { 'Content-Type': 'audio/wav' }, data: audioBytes.toString('base64') }),
        filesystem: {
            writeFile: async options => { cachedBytes = Buffer.from(options.data, 'base64'); return { uri: 'file:///cache/tts.wav' }; },
            deleteFile: async () => {}
        },
        play: async () => { if (++plays === 1) throw new Error('blob unsupported'); }
    });
    t.after(() => h.NR.stopTts());
    h.start();
    await flush();
    assert.deepEqual(cachedBytes, audioBytes);
    assert.equal(h.NR.ttsState.isPlaying, true);
    assert.match(h.audio.src, /_capacitor_file_/);
    assert.equal(h.revoked.length, 1);
});

test('Fish Speech accepts root and /v1 base URLs and loads reference IDs', async () => {
    const urls = [];
    const h = setup({ fetch: async (url, options) => {
        urls.push(url);
        assert.equal(options.headers.Accept, 'application/json');
        return Response.json({ success: true, reference_ids: ['speaker-a', 'speaker-b'] });
    } });
    const controller = h.NR.ttsController;
    controller.settings.provider = 'fishspeech';
    controller.setCurrentApiUrl('http://example.test:9882/v1/tts');
    await controller.fetchFishSpeechVoices(false, true);
    assert.equal(urls[0], 'http://example.test:9882/v1/references/list');
    assert.equal(controller.settings.fishSpeechVoices.length, 3);
    controller.setCurrentApiUrl('http://example.test:9882');
    await controller.fetchFishSpeechVoices(false, true);
    assert.equal(urls[1], urls[0]);
    controller.setActiveVoiceId('speaker-b');
    const payload = controller.getTtsPayload('你好。');
    assert.equal(payload.reference_id, 'speaker-b');
    assert.equal(payload.use_memory_cache, 'on');
    assert.equal(payload.format, 'wav');
    assert.equal(payload.streaming, false);
    controller.setActiveVoiceId('__default__');
    assert.equal(controller.getTtsPayload('你好。').reference_id, null);
});

test('Fish Speech preserves one audio boundary per paragraph and uses the official binary endpoint', async t => {
    const calls = [];
    const h = setup({ nativeRequest: async options => {
        calls.push(options);
        return { status: 200, headers: { 'Content-Type': 'audio/wav' }, data: audioBytes.toString('base64') };
    } });
    t.after(() => h.NR.stopTts());
    h.NR.ttsController.settings.provider = 'fishspeech';
    h.NR.ttsController.settings.fishSpeechApiUrl = 'http://example.test:9882';
    h.start();
    await flush();
    h.runTimers(0);
    await flush();
    assert.equal(calls[0].url, 'http://example.test:9882/v1/tts');
    assert.equal(calls[0].responseType, 'arraybuffer');
    assert.equal(calls[0].data.text, '第一段。');
    assert.equal(calls[1].data.text, '第二段。');
    assert.equal(h.NR.ttsState.textChunks[0].paragraph, h.paragraphs[0]);
    assert.equal(h.NR.ttsState.textChunks[1].paragraph, h.paragraphs[1]);
    assert.equal(h.NR.ttsState.isPlaying, true);
    assert.equal(h.NR.ttsState.bufferSize, 6);
});

test('Fish Speech prebuffers two bounded batches and preserves separate dialogue voices', async t => {
    const h = setup();
    t.after(() => h.NR.stopTts());
    const controller = h.NR.ttsController;
    controller.settings.provider = 'fishspeech';
    controller.settings.fishSpeechApiUrl = 'http://example.test:9882';
    controller.settings.fishSpeechVoices.push({ id: 'dialogue', name: '对白', referenceId: 'dialogue' });
    controller.settings.fishSpeechDialogueVoiceId = 'dialogue';
    h.paragraphs[0].textContent = '清晨阳光照进窗户。'.repeat(30) + '“早上好。”';
    h.start();
    await flush();
    assert.equal(h.NR.ttsState.isPlaying, false);
    assert.match(h.NR.els['tts-status'].textContent, /预缓冲/);
    assert.ok(h.NR.ttsState.textChunks.every(chunk => chunk.text.length <= 160));
    const dialogue = h.NR.ttsState.textChunks.find(chunk => chunk.voiceId === 'dialogue');
    assert.equal(dialogue.text, '“早上好。”');
    h.runTimers(0);
    await flush();
    assert.equal(h.NR.ttsState.isPlaying, true);
    const combined = h.NR.ttsState.textChunks.map(chunk => chunk.text).join('').replace(/\n/g, '');
    assert.equal(combined, h.paragraphs.map(p => p.textContent).join(''));
});

function pagedReader(h, count = 6) {
    const paragraphs = Array.from({ length: count }, (_, index) => {
        const classes = new Set();
        return { textContent: '第' + index + '段。', dataset: { originalIndex: String(index) },
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
            scrollIntoView() { this.scrolled = true; } };
    });
    const pages = [];
    for (let i = 0; i < count; i += 2) {
        const children = paragraphs.slice(i, i + 2);
        pages.push({ querySelectorAll: () => children, querySelector: selector =>
            selector === 'p[data-original-index]' ? children[0] :
                children.find(p => selector.includes('"' + p.dataset.originalIndex + '"')) || null });
    }
    Object.assign(h.NR.state, { originalParagraphs: paragraphs, allRenderedPages: pages, currentPage: 1,
        totalPages: pages.length, settings: {}, currentTranslate: -400, viewportWidth: 400, isTransitioning: false });
    const visible = selector => {
        if (selector === '.speaking-paragraph') return paragraphs.find(p => p.classList.contains('speaking-paragraph')) || null;
        // Render only the current and adjacent pages; other pages are detached.
        const current = h.NR.state.currentPage - 1;
        for (let i = Math.max(0, current - 1); i <= Math.min(pages.length - 1, current + 1); i++) {
            const p = pages[i].querySelector(selector);
            if (p) return p;
        }
        return null;
    };
    h.context.document.querySelector = visible;
    h.context.document.addEventListener = () => {};
    h.NR.els['current-page-container'] = { querySelector: selector => pages[h.NR.state.currentPage - 1].querySelector(selector) };
    h.NR.updateDOMPages = () => {};
    h.NR.updateUI = () => {};
    h.NR.saveProgress = () => {};
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js/core.js'), 'utf8'), h.context);
    return paragraphs;
}

function bindReaderEvents(h) {
    function element() {
        const handlers = new Map();
        return {
            addEventListener(type, handler) {
                if (!handlers.has(type)) handlers.set(type, []);
                if (handler) handlers.get(type).push(handler);
            },
            dispatch(type, values = {}) {
                for (const fn of handlers.get(type) || []) fn({ target: this, currentTarget: this, ...values });
            },
            querySelector: () => element(), querySelectorAll: () => []
        };
    }
    const existing = h.NR.els;
    h.NR.els = new Proxy({}, { get(target, key) {
        const el = existing[key];
        if (!el.addEventListener) {
            const methods = element();
            for (const name of Object.keys(methods)) if (!el[name]) el[name] = methods[name];
        }
        return el;
    } });
    h.NR.defaultFontSettings = {};
    h.NR.setupModal = () => {};
    h.context.document.addEventListener = () => {};
    h.context.document.querySelectorAll = () => [];
    h.context.window.addEventListener = () => {};
    h.context.window.getSelection = () => ({ toString: () => '' });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js/events.js'), 'utf8'), h.context);
    h.NR.bindEventListeners();
}

test('clicking a chapter title starts continuous listening ahead of focus and immersive handlers', async t => {
    const requests = [];
    const h = setup({ fetch: async (url, options) => { requests.push(JSON.parse(options.body)); return audioResponse(); } });
    t.after(() => h.NR.stopTts());
    const paragraphs = pagedReader(h);
    paragraphs[0].textContent = '第一章 护仙观';
    paragraphs[0].classList.add('chapter-title');
    Object.assign(h.NR.state, { isListenMode: true, isInImmersiveMode: true });
    h.NR.state.settings.enableFocusMode = true;
    h.NR.setImmersiveHighlight = h.NR.setFocusHighlight = () => assert.fail('listening clicks must reach TTS');
    bindReaderEvents(h);
    h.NR.els['content-wrapper'].dispatch('click', { target: { closest: () => paragraphs[0] } });
    await flush();
    assert.equal(requests[0].text, '第一章，护仙观');
    assert.equal(h.NR.ttsState.textChunks.length, 6);
    assert.equal(h.NR.ttsState.textChunks[0].pauseBeforeMs, 0, 'a manually selected title starts immediately');
    assert.equal(h.NR.ttsState.textChunks[1].pauseBeforeMs, 1400);
    assert.equal(paragraphs[0].classList.contains('speaking-paragraph'), true);
});

test('the top chapter name restarts the current chapter from its detached title, only in listen mode', async t => {
    const requests = [];
    const h = setup({ fetch: async (url, options) => { requests.push(JSON.parse(options.body)); return audioResponse(); } });
    t.after(() => h.NR.stopTts());
    const paragraphs = pagedReader(h, 10);
    for (const index of [0, 4, 8]) paragraphs[index].classList.add('chapter-title');
    paragraphs[4].textContent = '第2章 故人';
    h.NR.state.chapters = [0, 4, 8].map((index, n) => ({ p_index: index, chap_num: n + 1 }));
    h.NR.state.currentPage = 4;
    bindReaderEvents(h);
    h.NR.els['chapter-info'].dispatch('click');
    await flush();
    assert.equal(requests.length, 0);
    h.NR.state.isListenMode = true;
    h.NR.els['chapter-info'].dispatch('click');
    await flush();
    assert.equal(requests[0].text, '第2章，故人');
    assert.equal(h.NR.ttsState.textChunks[0].paragraph, paragraphs[4]);
    assert.equal(h.NR.state.isTransitioning, true);
    h.runTimers(300); h.runTimers(30);
    assert.equal(h.NR.state.currentPage, 3);
    assert.equal(paragraphs[4].classList.contains('speaking-paragraph'), true);
});

test('a detached paragraph on a later page can start playback and receive the highlight', async t => {
    const h = setup();
    t.after(() => h.NR.stopTts());
    const paragraphs = pagedReader(h);
    h.NR.startTtsFrom(paragraphs[5]);
    await flush();
    assert.equal(h.NR.state.currentPage, 3);
    assert.equal(h.NR.ttsState.isPlaying, true);
    assert.equal(paragraphs[5].classList.contains('speaking-paragraph'), true);
    assert.equal(paragraphs[5].scrolled, true);
});

test('highlight advances on each paragraph and follows the actual page transition', async t => {
    const h = setup();
    t.after(() => h.NR.stopTts());
    const paragraphs = pagedReader(h);
    h.NR.startTtsFrom(paragraphs[0]);
    await flush();
    h.runTimers(0);
    await flush();
    assert.equal(paragraphs[0].classList.contains('speaking-paragraph'), true);
    h.NR.onAudioEnded(); h.runTimers(0); await flush();
    assert.equal(paragraphs[0].classList.contains('speaking-paragraph'), true, 'highlight stays with the previous paragraph during silence');
    h.runTimers(700); await flush();
    assert.equal(paragraphs[0].classList.contains('speaking-paragraph'), false);
    assert.equal(paragraphs[1].classList.contains('speaking-paragraph'), true);
    h.runTimers(0); await flush();
    h.NR.onAudioEnded(); h.runTimers(0); await flush();
    assert.equal(h.NR.state.isTransitioning, false, 'page turns wait until audio starts after the pause');
    h.runTimers(700); await flush();
    assert.equal(h.NR.state.isTransitioning, true);
    assert.equal(paragraphs[2].classList.contains('speaking-paragraph'), true, 'the next page is colored before the turn finishes');
    h.runTimers(300); h.runTimers(30);
    assert.equal(h.NR.state.currentPage, 2);
    assert.equal(paragraphs[1].classList.contains('speaking-paragraph'), false);
    assert.equal(paragraphs[2].classList.contains('speaking-paragraph'), true);
});

test('a new playback session supersedes an unfinished highlight/page change', async t => {
    const h = setup();
    t.after(() => h.NR.stopTts());
    const paragraphs = pagedReader(h);
    h.NR.startTtsFrom(paragraphs[2]); await flush();
    assert.equal(h.NR.state.isTransitioning, true);
    h.NR.startTtsFrom(paragraphs[0]); await flush();
    h.runTimers(300); h.runTimers(30);
    h.runTimers(300); h.runTimers(30);
    assert.equal(h.NR.state.currentPage, 1);
    assert.equal(paragraphs[0].classList.contains('speaking-paragraph'), true);
    assert.equal(paragraphs[2].classList.contains('speaking-paragraph'), false);
});

function enableBufferedPlayback(h) {
    const nodes = [];
    class AudioContext {
        constructor() { this.currentTime = 0; this.state = 'running'; }
        resume() { return Promise.resolve(); }
        close() { return Promise.resolve(); }
        decodeAudioData() { return Promise.resolve({ duration: 1 }); }
        createBufferSource() {
            const node = { connect() {}, disconnect() {}, stop() {}, start(time, offset) { this.time = time; this.offset = offset; } };
            nodes.push(node); return node;
        }
    }
    h.context.window.AudioContext = AudioContext;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js/ttsBufferedPlayer.js'), 'utf8'), h.context);
    Object.assign(h.NR.ttsController.settings, { provider: 'fishspeech', fishSpeechApiUrl: 'http://example.test:9882' });
    return nodes;
}

test('buffered playback follows the audio clock when ended events are delayed or coalesced', async t => {
    const h = setup();
    const nodes = enableBufferedPlayback(h);
    t.after(() => h.NR.stopTts());
    const paragraphs = pagedReader(h);
    h.NR.startTtsFrom(paragraphs[0]); await flush();
    for (let i = 0; i < 6; i++) { h.runTimers(0); await flush(); }
    assert.equal(nodes.length, 6);
    h.NR.ttsBufferedPlayer.context.currentTime = nodes[2].time + 0.2;
    h.NR.syncTtsPlayback(); await flush();
    h.runTimers(300); h.runTimers(30);
    assert.equal(h.NR.ttsState.currentSequence, 2);
    assert.equal(h.NR.state.currentPage, 2);
    assert.equal(paragraphs[2].classList.contains('speaking-paragraph'), true);
    nodes[0].onended(); nodes[1].onended(); await flush();
    assert.equal(h.NR.ttsState.currentSequence, 2);
    assert.equal(h.NR.ttsState.isPlaying, true);
    assert.equal(nodes.length, 6, 'late ended events must not replay scheduled audio');
    h.NR.toggleTtsPlayback();
    assert.equal(h.NR.ttsState.isPaused, true);
    h.NR.toggleTtsPlayback(); await flush();
    assert.equal(h.NR.ttsState.currentSequence, 2);
    assert.ok(Math.abs(nodes[6].offset - 0.2) < 0.000001);
});

test('buffered silence keeps the previous highlight and page until the next paragraph is audible', async t => {
    const h = setup();
    const nodes = enableBufferedPlayback(h);
    t.after(() => h.NR.stopTts());
    const paragraphs = pagedReader(h);
    h.NR.startTtsFrom(paragraphs[1]); await flush();
    for (let i = 0; i < 5; i++) { h.runTimers(0); await flush(); }
    const clock = h.NR.ttsBufferedPlayer.context;
    clock.currentTime = nodes[0].time + 0.1;
    h.NR.syncTtsPlayback();
    assert.equal(paragraphs[1].classList.contains('speaking-paragraph'), true);
    clock.currentTime = nodes[0].time + 1.1;
    h.NR.syncTtsPlayback(); await flush();
    assert.equal(h.NR.ttsState.currentSequence, 1);
    assert.equal(h.NR.state.currentPage, 1);
    assert.equal(h.NR.state.isTransitioning, false);
    assert.equal(paragraphs[1].classList.contains('speaking-paragraph'), true);
    assert.equal(paragraphs[2].classList.contains('speaking-paragraph'), false);
    clock.currentTime = nodes[1].time + 0.01;
    h.NR.syncTtsPlayback(); await flush();
    assert.equal(paragraphs[2].classList.contains('speaking-paragraph'), true);
    assert.equal(h.NR.state.isTransitioning, true);
});

for (const provider of ['gptsovits', 'indextts', 'fishspeech']) {
    test(provider + ' reads chapter titles in the narrator voice and distinguishes each pause boundary', async t => {
        const h = setup();
        t.after(() => h.NR.stopTts());
        const paragraphs = pagedReader(h);
        paragraphs[0].classList.add('chapter-title');
        paragraphs[0].textContent = '第一章 护仙观';
        paragraphs[1].textContent = '他问：“你是谁？”她没有回答。';
        paragraphs[4].classList.add('chapter-title');
        paragraphs[4].textContent = '第2章：“故人”';
        Object.assign(h.NR.ttsController.settings, { provider, fishSpeechApiUrl: 'http://example.test:9882' });
        h.NR.startTtsFrom(paragraphs[0]); await flush();
        const chunks = h.NR.ttsState.textChunks;
        assert.deepEqual(Array.from(chunks, c => c.pauseBeforeMs), [0, 1400, 440, 440, 700, 700, 3000, 1400]);
        assert.equal(chunks[0].text, '第一章，护仙观');
        assert.equal(chunks[6].text, '第2章，“故人”');
        assert.equal(chunks[6].isDialogue, false, 'quotes inside chapter titles still use the narrator');
        assert.equal(chunks[2].isDialogue, true);
        assert.equal(chunks.length, 8, 'Fish Speech must preserve dialogue boundaries even when using the same voice');
    });
}

test('long paragraph fragments join without adding paragraph pauses in the middle', async t => {
    const h = setup();
    t.after(() => h.NR.stopTts());
    enableBufferedPlayback(h);
    h.paragraphs[0].textContent = '夜色渐深，远处的灯光仍在闪烁。'.repeat(25);
    h.start(); await flush();
    const chunks = h.NR.ttsState.textChunks;
    assert.ok(chunks.length > 3);
    assert.ok(chunks.filter(c => c.paragraph === h.paragraphs[0]).every(c => c.pauseBeforeMs === 0));
    assert.equal(chunks[chunks.length - 1].pauseBeforeMs, 700);
});

test('HTML audio can pause during silence, resume only its remainder, and cancel it on stop', async t => {
    const h = setup();
    t.after(() => h.NR.stopTts());
    h.start(); await flush(); h.runTimers(0); await flush();
    h.NR.onAudioEnded(); h.runTimers(0); await flush();
    assert.equal(h.audio.playCalls, 1);
    h.advanceClock(100);
    h.NR.toggleTtsPlayback();
    assert.equal(h.NR.ttsState.isPaused, true);
    h.runTimers(700); await flush();
    assert.equal(h.audio.playCalls, 1);
    h.advanceClock(5000);
    h.NR.toggleTtsPlayback();
    h.runTimers(600); await flush();
    assert.equal(h.audio.playCalls, 2, 'time spent manually paused does not consume the remaining natural pause');
    h.start(); await flush(); h.runTimers(0); await flush();
    h.NR.onAudioEnded(); h.runTimers(0); await flush();
    const callsBeforeStop = h.audio.playCalls;
    h.NR.stopTts(); h.runTimers(700); await flush();
    assert.equal(h.audio.playCalls, callsBeforeStop);
});

test('waiting for a slow API already covers the HTML audio paragraph pause', async t => {
    const next = deferred();
    let requests = 0;
    const h = setup({ fetch: () => ++requests === 1 ? audioResponse() : next.promise });
    t.after(() => h.NR.stopTts());
    h.start(); await flush(); h.runTimers(0); await flush();
    h.NR.onAudioEnded(); h.runTimers(0); await flush();
    h.advanceClock(2000);
    next.resolve(audioResponse()); await flush();
    assert.equal(h.audio.playCalls, 2, 'a late segment starts without another artificial pause');
});

test('paragraph-only playback reads the selected paragraph and stops without requesting the next one', async t => {
    const requests = [];
    const h = setup({ fetch: async (url, options) => { requests.push(JSON.parse(options.body)); return audioResponse(); } });
    t.after(() => h.NR.stopTts());
    h.NR.ttsController.settings.provider = 'fishspeech';
    h.NR.ttsController.settings.fishSpeechApiUrl = 'http://example.test:9882';
    h.NR.startTtsFrom(h.paragraphs[0], { paragraphOnly: true });
    await flush();
    h.runTimers(0); await flush();
    assert.equal(h.NR.ttsState.isPlaying, true);
    assert.equal(h.NR.ttsState.textChunks.length, 1);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].text, h.paragraphs[0].textContent);
    h.NR.onAudioEnded(); h.runTimers(0); await flush();
    assert.equal(h.NR.ttsState.isActive, false);
    assert.equal(requests.length, 1);
});

test('paragraph-only playback keeps every bounded fragment of a long paragraph', async t => {
    const h = setup();
    t.after(() => h.NR.stopTts());
    h.NR.ttsController.settings.provider = 'fishspeech';
    h.NR.ttsController.settings.fishSpeechApiUrl = 'http://example.test:9882';
    h.paragraphs[0].textContent = '这一段的内容需要完整朗读。'.repeat(30);
    h.NR.startTtsFrom(h.paragraphs[0], { paragraphOnly: true }); await flush();
    assert.ok(h.NR.ttsState.textChunks.length > 1);
    assert.ok(h.NR.ttsState.textChunks.every(chunk => chunk.paragraph === h.paragraphs[0] && chunk.text.length <= 160));
    assert.equal(h.NR.ttsState.textChunks.map(chunk => chunk.text).join(''), h.paragraphs[0].textContent);
});
