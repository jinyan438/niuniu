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
    const timers = new Map();
    const blobs = [];
    const revoked = [];
    const paragraph = text => ({ textContent: text, dataset: { originalIndex: '0' }, isSameNode(other) { return this === other; } });
    const paragraphs = [paragraph('第一段。'), paragraph('第二段。')];
    paragraphs[1].dataset.originalIndex = '1';
    const els = new Proxy({}, { get(target, key) { return target[key] ||= { style: {}, textContent: '', innerHTML: '', classList: { toggle() {} } }; } });
    const audio = { playCalls: 0, load() {}, pause() {}, removeAttribute() {}, play() { this.playCalls++; return play(); } };
    const NR = {
        els,
        state: { ttsAudioElement: audio, originalParagraphs: paragraphs, allRenderedPages: [{ querySelectorAll: () => paragraphs }] },
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
        NR, audio, paragraphs, blobs, revoked,
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
