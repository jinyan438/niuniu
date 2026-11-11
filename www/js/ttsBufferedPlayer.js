// Schedule decoded segments on one audio clock so ready segments join without
// waiting for an HTMLAudioElement ended event and another load/play round trip.
(function() {
    var NR = window.NovelReader;
    NR.BufferedTtsPlayer = function(onEnded) {
        var Context = window.AudioContext || window.webkitAudioContext;
        this.context = new Context();
        this.onEnded = onEnded;
        this.buffers = new Map();
        this.sources = new Map();
        this.currentSequence = 0;
        this.nextSequence = 0;
        this.tailTime = 0;
        this.offset = 0;
        this.playing = false;
        this.closed = false;
        this.completedSequence = -1;
        this.pauses = new Map();
        this.resumeDelay = 0;
        // This constructor runs in the paragraph's click handler on mobile.
        this.context.resume().catch(function() {});
    };
    var Player = NR.BufferedTtsPlayer.prototype;
    Player.decode = function(blob) {
        var self = this;
        return blob.arrayBuffer().then(function(data) {
            if (self.closed) return null;
            return self.context.decodeAudioData(data);
        });
    };
    Player.queue = function(sequence, buffer, pauseBeforeMs) {
        if (this.closed || !buffer) return;
        this.buffers.set(sequence, buffer);
        this.pauses.set(sequence, Math.max(0, Number(pauseBeforeMs) || 0) / 1000);
        if (this.playing) this.schedule();
    };
    Player.start = function(sequence) {
        var self = this;
        return this.context.resume().then(function() {
            if (self.closed) return;
            if (self.context.state !== 'running') {
                var error = new Error('请点击播放按钮启用音频。');
                error.name = 'NotAllowedError';
                throw error;
            }
            if (!self.playing) {
                self.currentSequence = sequence;
                self.nextSequence = sequence;
                self.tailTime = 0;
                self.playing = true;
            }
            self.schedule();
        });
    };
    Player.schedule = function() {
        var self = this;
        while (this.playing && this.buffers.has(this.nextSequence)) {
            var sequence = this.nextSequence++;
            var buffer = this.buffers.get(sequence);
            var source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            var offset = sequence === this.currentSequence ? this.offset : 0;
            // A network stall may already cover the intended pause. Do not
            // add the same pause a second time after waiting for the server.
            var start = this.tailTime === 0
                ? this.context.currentTime + Math.max(0.025, this.resumeDelay)
                : Math.max(this.tailTime + (this.pauses.get(sequence) || 0), this.context.currentTime + 0.025);
            this.resumeDelay = 0;
            this.tailTime = start + buffer.duration - offset;
            this.sources.set(sequence, { source: source, start: start, end: this.tailTime, offset: offset });
            (function(seq, node) {
                node.onended = function() {
                    var entry = self.sources.get(seq);
                    if (self.closed || !self.playing || !entry || entry.source !== node) return;
                    self.sources.delete(seq);
                    self.buffers.delete(seq);
                    self.pauses.delete(seq);
                    node.disconnect();
                    self.currentSequence = Math.max(self.currentSequence, seq + 1);
                    self.completedSequence = Math.max(self.completedSequence, seq);
                    self.offset = 0;
                    self.onEnded(seq);
                };
            })(sequence, source);
            source.start(start, offset);
        }
    };
    Player.getPosition = function() {
        if (this.closed || !this.playing) return null;
        var now = this.context.currentTime;
        var current = null;
        var completed = this.completedSequence;
        this.sources.forEach(function(entry, sequence) {
            if (now >= entry.end) completed = Math.max(completed, sequence);
            else if (now >= entry.start) current = { sequence: sequence, offset: entry.offset + now - entry.start };
        });
        return current || (completed >= 0 ? { sequence: completed + 1, ended: true } : null);
    };
    Player.pause = function() {
        var position = this.getPosition();
        if (position) {
            if (position.sequence !== this.currentSequence) this.offset = 0;
            this.currentSequence = position.sequence;
        }
        var entry = this.sources.get(this.currentSequence);
        this.resumeDelay = entry ? Math.max(0, entry.start - this.context.currentTime) : 0;
        if (entry) this.offset = Math.min(this.buffers.get(this.currentSequence).duration,
            entry.offset + Math.max(0, this.context.currentTime - entry.start));
        this.playing = false;
        this.sources.forEach(function(item) {
            item.source.onended = null;
            item.source.stop();
            item.source.disconnect();
        });
        this.sources.clear();
    };
    Player.close = function() {
        this.pause();
        this.closed = true;
        this.buffers.clear();
        this.pauses.clear();
        return this.context.close().catch(function() {});
    };
})();
