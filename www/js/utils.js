// 工具函数
(function() {
    var NR = window.NovelReader;

    NR.escapeHtml = function(s) {
        if (typeof s !== 'string') return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    NR.escapeRegExp = function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    NR.extractAuthor = function(textContent) {
        if (!textContent) return '未知';
        var authorRegex = /(?:作者|Author)\s*[:：]\s*([^\n\r]+)/;
        var match = textContent.substring(0, 2000).match(authorRegex);
        if (match && match[1]) {
            return match[1].trim();
        }
        return '未知';
    };

    NR.countChapters = function(textContent) {
        if (!textContent) return 0;
        var chapterRegex = /^(第\s*[一二三四五六七八九十百千\d\s]+[章回节卷])|^(Chapter\s+\d+)|(^\d{1,3}\s+)/;
        var lines = textContent.split(/\r?\n/);
        var count = 0;
        for (var i = 0; i < lines.length; i++) {
            var trimmedLine = lines[i].trim();
            if (trimmedLine.length > 0 && trimmedLine.length < 50 && chapterRegex.test(trimmedLine)) {
                count++;
            }
        }
        return count;
    };

    NR.fetchWithTimeout = function(url, options, timeoutMs) {
        options = options || {};
        timeoutMs = timeoutMs || 10000;
        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, timeoutMs);
        return fetch(url, Object.assign({}, options, { signal: controller.signal }))
            .finally(function() { clearTimeout(timer); });
    };

    NR.rgbToHex = function(rgb) {
        try {
            var match = rgb.match(/\d+/g);
            var r = Number(match[0]);
            var g = Number(match[1]);
            var b = Number(match[2]);
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0');
        } catch (e) {
            return '#000000';
        }
    };

    NR.inferMimeByPath = function(path) {
        var ext = (path.split('.').pop() || '').toLowerCase();
        switch (ext) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'gif':
                return 'image/gif';
            case 'webp':
                return 'image/webp';
            case 'svg':
                return 'image/svg+xml';
            default:
                return 'application/octet-stream';
        }
    };

    NR.resolvePath = function(baseDir, relativePath) {
        var url = new URL(relativePath, 'http://local/' + (baseDir ? baseDir.replace(/\/?$/, '/') : ''));
        return url.pathname.replace(/^\//, '');
    };

    NR.preloadImages = function(urls, timeoutMs) {
        timeoutMs = timeoutMs || 2000;
        return new Promise(function(resolve) {
            if (!urls || urls.length === 0) return resolve();
            var loaded = 0, done = false;
            var finish = function() {
                if (!done) {
                    done = true;
                    resolve();
                }
            };
            var timer = setTimeout(finish, timeoutMs);
            urls.forEach(function(u) {
                var img = new Image();
                img.onload = img.onerror = function() {
                    if (++loaded >= urls.length) {
                        clearTimeout(timer);
                        finish();
                    }
                };
                img.src = u;
            });
        });
    };
})();
