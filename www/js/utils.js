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

    NR.isChapterTitle = function(text) {
        var chapterRegex = /^(第\s*[一二三四五六七八九十百千\d\s]+[章回节卷])|^(Chapter\s+\d+)|(^\d{1,3}\s+)/;
        return text.length > 0 && text.length < 50 && chapterRegex.test(text);
    };

    NR.getReaderContentLines = function(textContent) {
        var previousNonEmptyLine = '';
        return (textContent || '').split(/\r?\n/).map(function(line) {
            var trimmedLine = line.trim();
            if (!trimmedLine) return line;
            // 部分下载文本在正文前重复章节标题。只合并中间没有正文的重复项，
            // 并保留空段落，避免改变阅读进度、书签和段评使用的原始段落索引。
            if (trimmedLine === previousNonEmptyLine && NR.isChapterTitle(trimmedLine)) return '';
            previousNonEmptyLine = trimmedLine;
            return line;
        });
    };

    NR.countChapters = function(textContent) {
        var lines = NR.getReaderContentLines(textContent);
        var count = 0;
        for (var i = 0; i < lines.length; i++) {
            if (NR.isChapterTitle(lines[i].trim())) {
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
