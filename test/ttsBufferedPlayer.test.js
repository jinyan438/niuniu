const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
    const nodes = [], ended = [];
    class AudioContext {
        constructor() { this.currentTime = 10; this.state = 'running'; }
        resume() { return Promise.resolve(); }
        close() { this.state = 'closed'; return Promise.resolve(); }
        decodeAudioData() { return Promise.resolve({ duration: 2 }); }
        createBufferSource() {
            const node = { connect() {}, disconnect() {}, stop() { this.stopped = true; }, start(time, offset) { this.time = time; this.offset = offset; } };
            nodes.push(node);
            return node;
        }
    }
    const window = { NovelReader: {}, AudioContext };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../www/js/ttsBufferedPlayer.js'), 'utf8'), { window, Map, Error });
    const player = new window.NovelReader.BufferedTtsPlayer(seq => ended.push(seq));
    return { player, nodes, ended };
}

test('ready segments share an exact audio-clock boundary without an ended-event round trip', async () => {
    const { player, nodes, ended } = setup();
    player.queue(0, { duration: 3 });
    player.queue(1, { duration: 5 });
    await player.start(0);
    assert.equal(nodes.length, 2);
    assert.equal(nodes[1].time, nodes[0].time + 3);
    nodes[0].onended();
    await player.start(1);
    assert.deepEqual(ended, [0]);
    assert.equal(nodes.length, 2, 'starting the next UI paragraph must not reschedule its audio');
    await player.close();
});

test('prefetched audio is appended in sequence and a missing segment is never skipped', async () => {
    const { player, nodes } = setup();
    player.queue(0, { duration: 3 });
    await player.start(0);
    player.queue(2, { duration: 4 });
    assert.equal(nodes.length, 1);
    player.queue(1, { duration: 2 });
    assert.equal(nodes.length, 3);
    assert.equal(nodes[1].time, nodes[0].time + 3);
    assert.equal(nodes[2].time, nodes[1].time + 2);
    await player.close();
});

test('pause cancels future sources and resumes at the same sample offset', async () => {
    const { player, nodes, ended } = setup();
    player.queue(0, { duration: 5 });
    player.queue(1, { duration: 2 });
    await player.start(0);
    player.context.currentTime = nodes[0].time + 1.25;
    player.pause();
    assert.ok(nodes.slice(0, 2).every(node => node.stopped && node.onended === null));
    await player.start(0);
    assert.equal(nodes[2].offset, 1.25);
    assert.equal(nodes[3].time, nodes[2].time + 3.75);
    assert.deepEqual(ended, []);
    await player.close();
    assert.ok(nodes.slice(2).every(node => node.stopped && node.onended === null));
    assert.equal(player.buffers.size, 0);
});

test('network starvation resumes at the current clock instead of scheduling in the past', async () => {
    const { player, nodes } = setup();
    player.queue(0, { duration: 1 });
    await player.start(0);
    nodes[0].onended();
    player.context.currentTime = 20;
    player.queue(1, { duration: 2 });
    assert.ok(nodes[1].time > 20);
    await player.close();
});

test('playback position uses the audio clock even before source ended callbacks arrive', async () => {
    const { player, nodes } = setup();
    player.queue(0, { duration: 1 }); player.queue(1, { duration: 2 });
    await player.start(0);
    assert.equal(player.getPosition(), null, 'the initial scheduling lead-in is not audible yet');
    player.context.currentTime = nodes[1].time + 0.75;
    assert.equal(player.getPosition().sequence, 1);
    assert.equal(player.getPosition().offset, 0.75);
    player.pause();
    assert.equal(player.currentSequence, 1);
    await player.start(1);
    assert.equal(nodes[2].offset, 0.75);
    await player.close();
});

test('natural pauses are scheduled on the audio clock between ready segments', async () => {
    const { player, nodes } = setup();
    const pauses = [0, 440, 700, 3000, 1400];
    pauses.forEach((ms, seq) => player.queue(seq, { duration: 2 }, ms));
    await player.start(0);
    for (let seq = 1; seq < nodes.length; seq++) {
        assert.ok(Math.abs(nodes[seq].time - nodes[seq - 1].time - 2 - pauses[seq] / 1000) < 1e-9);
    }
    player.context.currentTime = nodes[2].time + 2.1;
    assert.equal(player.getPosition().ended, true, 'silence is not reported as audible next-chapter speech');
    assert.equal(player.getPosition().sequence, 3);
    await player.close();
});

test('pause during a chapter gap preserves the remaining gap when playback resumes', async () => {
    const { player, nodes } = setup();
    player.queue(0, { duration: 2 });
    player.queue(1, { duration: 3 }, 3000);
    await player.start(0);
    player.context.currentTime = nodes[0].time + 2.5;
    player.pause();
    assert.equal(player.currentSequence, 1);
    player.context.currentTime = 30;
    await player.start(1);
    assert.ok(Math.abs(nodes[2].time - 32.5) < 1e-9);
    assert.equal(nodes[2].offset, 0);
    player.context.currentTime = nodes[2].time + 0.75;
    player.pause();
    await player.start(1);
    assert.ok(Math.abs(nodes[3].offset - 0.75) < 1e-9);
    assert.ok(Math.abs(nodes[3].time - player.context.currentTime - 0.025) < 1e-9, 'resuming speech does not repeat the chapter gap');
    await player.close();
});

test('API starvation consumes the intended gap rather than adding it again', async () => {
    const { player, nodes } = setup();
    player.queue(0, { duration: 1 });
    await player.start(0);
    player.context.currentTime = 20;
    player.queue(1, { duration: 2 }, 3000);
    assert.ok(Math.abs(nodes[1].time - 20.025) < 1e-9);
    await player.close();
});
