// Legado-compatible book source parser and network pipeline.
(function(root, factory) {
    var api = factory(root || {});
    if (root) {
        root.NovelReader = root.NovelReader || {};
        root.NovelReader.BookSourceEngine = api.BookSourceEngine;
        root.NovelReader.BookSourceImporter = api.BookSourceImporter;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function(root) {
    'use strict';

    var DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36';
    var RULE_FIELDS = {
        search: ['bookList', 'name', 'author', 'intro', 'kind', 'lastChapter', 'updateTime', 'bookUrl', 'coverUrl', 'wordCount'],
        explore: ['bookList', 'name', 'author', 'intro', 'kind', 'lastChapter', 'updateTime', 'bookUrl', 'coverUrl', 'wordCount'],
        bookInfo: ['init', 'name', 'author', 'intro', 'kind', 'lastChapter', 'updateTime', 'coverUrl', 'tocUrl', 'wordCount', 'downloadUrls'],
        toc: ['chapterList', 'chapterName', 'chapterUrl', 'isVolume', 'isVip', 'isPay', 'updateTime', 'nextTocUrl'],
        content: ['content', 'subContent', 'title', 'nextContentUrl', 'replaceRegex']
    };

    function asString(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (value && typeof value.textContent === 'string') return value.textContent;
        try { return JSON.stringify(value); } catch (e) { return String(value); }
    }

    function parseLooseJson(text) {
        if (typeof text !== 'string') return text;
        var clean = text.replace(/^\uFEFF/, '').trim();
        if (!clean) throw new Error('内容为空');
        try { return JSON.parse(clean); } catch (firstError) {
            var withoutComments = clean
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/^\s*\/\/.*$/gm, '')
                .replace(/,\s*([}\]])/g, '$1');
            try { return JSON.parse(withoutComments); } catch (secondError) {
                try {
                    return Function('"use strict";return (' + withoutComments + ');')();
                } catch (thirdError) {
                    throw firstError;
                }
            }
        }
    }

    function decodeBase64(value) {
        var binary;
        if (typeof atob === 'function') binary = atob(value);
        else if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8');
        else throw new Error('当前环境不支持 Base64');
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    }

    function decodeInlineDataUrl(value) {
        var url = asString(value).trim();
        if (/^data:;base64,/i.test(url)) {
            var payload = url.slice(url.indexOf(',') + 1).split(',')[0].trim();
            try { return decodeBase64(payload); } catch (e) { return ''; }
        }
        var dataMatch = url.match(/^data:(?:application\/json|text\/plain)(?:;charset=[^,;]+)?,([\s\S]*)$/i);
        if (dataMatch) {
            var payload = dataMatch[1];
            // URL options follow the encoded payload (for example,
            // `,{"type":"qingtian"}`). A raw JSON payload starts with `{`
            // and must not be mistaken for that option suffix.
            var isStrictJsonPayload = false;
            try {
                if (/^\s*[\[{]/.test(payload)) {
                    JSON.parse(payload);
                    isStrictJsonPayload = true;
                }
            } catch (e) { /* a payload with options is not one JSON document */ }
            if (!isStrictJsonPayload) {
                for (var optionIndex = payload.lastIndexOf(',{'); optionIndex >= 0; optionIndex = payload.lastIndexOf(',{', optionIndex - 1)) {
                    try {
                        var optionValue = parseLooseJson(payload.slice(optionIndex + 1).trim());
                        if (optionValue && typeof optionValue === 'object' && !Array.isArray(optionValue)) {
                            payload = payload.slice(0, optionIndex);
                            break;
                        }
                    } catch (e) { /* keep looking for an option suffix */ }
                }
            }
            try { return decodeURIComponent(payload); } catch (e) { return payload; }
        }
        return null;
    }

    function normalizeInlineBookUrl(value) {
        var url = asString(value).trim();
        if (!url || /^data:|^blob:|^javascript:/i.test(url)) return url;
        var parsed = splitUrlOption(url);
        var option = parsed.option || {};
        var decoded = parsed.url;
        var decodedSuccessfully = false;
        for (var pass = 0; pass < 3; pass++) {
            try {
                var next = decodeURIComponent(decoded);
                decodedSuccessfully = true;
                if (next === decoded) break;
                decoded = next;
            } catch (e) {
                decodedSuccessfully = false;
                break;
            }
        }
        var validJson = false;
        try {
            if (/^[\[{]/.test(decoded.trim())) {
                // Use strict JSON here so a JavaScript comma expression such
                // as `{"book":1},{"type":"..."}` is recognized as a
                // payload-plus-options URL instead of one document.
                JSON.parse(decoded);
                validJson = true;
            }
        } catch (e) { /* try the fully encoded URL form below */ }
        // Some sources encode the complete `bookUrl`, including its option
        // suffix. Decode and split that form as a second attempt.
        if (!decodedSuccessfully || !validJson) {
            try {
                var wholeDecoded = decodeURIComponent(url);
                var wholeParsed = splitUrlOption(wholeDecoded);
                if (Object.keys(wholeParsed.option || {}).length) option = wholeParsed.option;
                decoded = wholeParsed.url;
                for (var wholePass = 0; wholePass < 2; wholePass++) {
                    var decodedWholePart = decodeURIComponent(decoded);
                    if (decodedWholePart === decoded) break;
                    decoded = decodedWholePart;
                }
            } catch (e) { return url; }
        }
        if (!/^[\[{]/.test(decoded.trim())) return url;
        try {
            parseLooseJson(decoded);
            var suffix = Object.keys(option).length ? ',' + JSON.stringify(option) : '';
            return 'data:application/json,' + encodeURIComponent(decoded) + suffix;
        } catch (e) {
            return url;
        }
    }

    function parseRuleObject(value) {
        if (!value) return {};
        if (typeof value === 'object') return value;
        try { return parseLooseJson(value); } catch (e) { return {}; }
    }

    function legacyRules(source, prefix, fields) {
        var out = {};
        fields.forEach(function(field) {
            var cap = field.charAt(0).toUpperCase() + field.slice(1);
            var candidates = [
                'rule' + prefix + cap,
                'rule' + prefix + field,
                prefix.charAt(0).toLowerCase() + prefix.slice(1) + cap
            ];
            for (var i = 0; i < candidates.length; i++) {
                if (source[candidates[i]] !== undefined && source[candidates[i]] !== null) {
                    out[field] = source[candidates[i]];
                    break;
                }
            }
        });
        return out;
    }

    function normalizeSource(input) {
        var source = Object.assign({}, input || {});
        source.bookSourceUrl = asString(source.bookSourceUrl || source.sourceUrl || source.bookSourceId).trim();
        source.bookSourceName = asString(source.bookSourceName || source.sourceName || source.bookSourceUrl || '未命名书源').trim();
        if (!source.bookSourceUrl) throw new Error('缺少 bookSourceUrl，不是有效书源');
        source.bookSourceGroup = asString(source.bookSourceGroup || source.sourceGroup).trim();
        source.bookSourceType = Number(source.bookSourceType || 0);
        source.enabled = source.enabled !== false;
        source.enabledExplore = source.enabledExplore !== false;
        source.searchUrl = source.searchUrl || source.ruleSearchUrl || '';
        source.exploreUrl = source.exploreUrl || source.ruleFindUrl || source.ruleExploreUrl || '';
        source.header = source.header || source.httpUserAgent && JSON.stringify({ 'User-Agent': source.httpUserAgent }) || '';
        source.ruleSearch = Object.assign({}, legacyRules(source, 'Search', RULE_FIELDS.search), parseRuleObject(source.ruleSearch));
        source.ruleExplore = Object.assign({}, legacyRules(source, 'Explore', RULE_FIELDS.explore), legacyRules(source, 'Find', RULE_FIELDS.explore), parseRuleObject(source.ruleExplore));
        source.ruleBookInfo = Object.assign({}, legacyRules(source, 'BookInfo', RULE_FIELDS.bookInfo), parseRuleObject(source.ruleBookInfo));
        source.ruleToc = Object.assign({}, legacyRules(source, 'Chapter', RULE_FIELDS.toc), parseRuleObject(source.ruleToc));
        source.ruleContent = Object.assign({}, legacyRules(source, 'BookContent', RULE_FIELDS.content), parseRuleObject(source.ruleContent));
        source.ruleSearch.bookList = source.ruleSearch.bookList || source.ruleSearchList || '';
        source.ruleSearch.bookUrl = source.ruleSearch.bookUrl || source.ruleSearchNoteUrl || '';
        source.ruleExplore.bookList = source.ruleExplore.bookList || source.ruleFindList || source.ruleExploreList || '';
        source.ruleExplore.bookUrl = source.ruleExplore.bookUrl || source.ruleFindNoteUrl || source.ruleExploreNoteUrl || '';
        source.ruleBookInfo.tocUrl = source.ruleBookInfo.tocUrl || source.ruleChapterUrl || '';
        source.ruleToc.chapterList = source.ruleToc.chapterList || source.ruleChapterList || '';
        source.ruleToc.chapterName = source.ruleToc.chapterName || source.ruleChapterName || '';
        source.ruleToc.chapterUrl = source.ruleToc.chapterUrl || source.ruleContentUrl || '';
        source.ruleContent.content = source.ruleContent.content || source.ruleBookContent || '';
        source.ruleContent.nextContentUrl = source.ruleContent.nextContentUrl || source.ruleContentUrlNext || '';
        source.lastUpdateTime = Number(source.lastUpdateTime || Date.now());
        return source;
    }

    function uniqueSources(sources) {
        var map = new Map();
        (sources || []).forEach(function(source) { map.set(source.bookSourceUrl, source); });
        return Array.from(map.values());
    }

    function extractShareTarget(text) {
        var value = asString(text).trim();
        var match = value.match(/^(?:legado|yuedu):\/\/import\/bookSource\?(?:src|url)=([\s\S]+)$/i);
        if (match) return decodeURIComponent(match[1]);
        match = value.match(/^bookSource:\/\/import\?url=([\s\S]+)$/i);
        if (match) return decodeURIComponent(match[1]);
        return value;
    }

    function parseJsSource(script) {
        if (!/\b(?:var|let|const)\s+(?:config|source)\s*=/.test(script) || !/\bfunction\s+(?:search|getChapters|getContent)\b|\b(?:search|getChapters|getContent)\s*=\s*(?:async\s*)?function/.test(script)) return null;
        var noop = function() { return ''; };
        var dummy = new Proxy(noop, {
            get: function() { return dummy; },
            apply: function() { return ''; }
        });
        try {
            var config = Function('java', 'sourceApi', 'cache', 'cookie', script + '\n;return typeof config!=="undefined"?config:(typeof source!=="undefined"?source:null);')(dummy, dummy, dummy, dummy);
            if (!config || typeof config !== 'object') throw new Error('JS 书源缺少 config 配置');
            var normalized = normalizeSource(config);
            normalized.mainJs = script;
            return normalized;
        } catch (e) {
            throw new Error('JS 书源解析失败：' + e.message);
        }
    }

    function BookSourceImporter(fetchText) {
        this.fetchText = fetchText;
        this.visited = new Set();
    }

    BookSourceImporter.prototype.parse = async function(input) {
        var value = extractShareTarget(input);
        if (!value) throw new Error('没有可导入的内容');
        if (/^https?:\/\//i.test(value)) return this.fromUrl(value);

        var parsed;
        try { parsed = parseLooseJson(value); } catch (jsonError) {
            var jsSource = parseJsSource(value);
            if (jsSource) return [jsSource];
            var compact = value.replace(/\s+/g, '');
            if (/^[A-Za-z0-9+/]+=*$/.test(compact) && compact.length > 40) {
                try { return this.parse(decodeBase64(compact)); } catch (decodeError) { /* use URL-list fallback */ }
            }
            var urls = value.split(/\r?\n/).map(function(line) { return line.trim(); }).filter(function(line) { return /^https?:\/\//i.test(line); });
            if (urls.length) {
                var nested = await Promise.all(urls.map(this.fromUrl.bind(this)));
                return uniqueSources([].concat.apply([], nested));
            }
            throw new Error('无法识别书源内容：' + jsonError.message);
        }

        if (Array.isArray(parsed)) return uniqueSources(parsed.map(normalizeSource));
        if (parsed && Array.isArray(parsed.bookSources)) return uniqueSources(parsed.bookSources.map(normalizeSource));
        if (parsed && Array.isArray(parsed.sourceUrls)) {
            var lists = await Promise.all(parsed.sourceUrls.map(this.fromUrl.bind(this)));
            return uniqueSources([].concat.apply([], lists));
        }
        return [normalizeSource(parsed)];
    };

    BookSourceImporter.prototype.fromUrl = async function(url) {
        var target = extractShareTarget(url);
        if (this.visited.has(target)) return [];
        this.visited.add(target);
        if (!this.fetchText) throw new Error('未配置网络导入器');
        var text = await this.fetchText(target);
        return this.parse(text);
    };

    function splitUrlOption(ruleUrl) {
        var text = asString(ruleUrl).trim();
        for (var index = text.lastIndexOf(',{'); index >= 0; index = text.lastIndexOf(',{', index - 1)) {
            var optionText = text.slice(index + 1).trim();
            try {
                var option = parseLooseJson(optionText);
                if (option && typeof option === 'object' && !Array.isArray(option)) {
                    return { url: text.slice(0, index).trim(), option: option };
                }
            } catch (e) { /* keep scanning */ }
        }
        return { url: text, option: {} };
    }

    function resolveUrl(value, baseUrl) {
        var url = normalizeInlineBookUrl(value);
        if (!url || /^data:|^blob:|^javascript:/i.test(url)) return url;
        var parsed = splitUrlOption(url);
        try {
            var resolved = new URL(parsed.url, baseUrl || undefined).href;
            return Object.keys(parsed.option).length ? resolved + ',' + JSON.stringify(parsed.option) : resolved;
        } catch (e) { return url; }
    }

    function parseHeaders(value) {
        if (!value) return {};
        if (typeof value === 'object') return Object.assign({}, value);
        try {
            var parsed = parseLooseJson(value);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            var headers = {};
            asString(value).split(/\r?\n/).forEach(function(line) {
                var index = line.indexOf(':');
                if (index > 0) headers[line.slice(0, index).trim()] = line.slice(index + 1).trim();
            });
            return headers;
        }
    }

    function encodeFormBody(body) {
        return asString(body).split('&').map(function(field) {
            var index = field.indexOf('=');
            var key = index >= 0 ? field.slice(0, index) : field;
            var value = index >= 0 ? field.slice(index + 1) : '';
            function encode(component) {
                try { return encodeURIComponent(decodeURIComponent(component.replace(/\+/g, ' '))).replace(/%20/g, '+'); }
                catch (e) { return encodeURIComponent(component).replace(/%20/g, '+'); }
            }
            return encode(key) + (index >= 0 ? '=' + encode(value) : '');
        }).join('&');
    }

    function responseWrapper(response) {
        return {
            body: function() { return response.body || ''; },
            string: function() { return response.body || ''; },
            header: function(name) { return response.headers && (response.headers[name] || response.headers[String(name).toLowerCase()]) || null; },
            raw: function() { return this; },
            request: function() { return { url: function() { return response.url || ''; } }; },
            toString: function() { return response.body || ''; }
        };
    }

    var nativeRequestSequence = 0;

    function requestViaNativeAsync(options) {
        var bridge = root.NiuniuBookSource;
        var registry = root.NovelReader = root.NovelReader || {};
        registry.__bookSourceRequestCallbacks = registry.__bookSourceRequestCallbacks || {};
        var id = 'bookSource_' + Date.now().toString(36) + '_' + (++nativeRequestSequence);
        var timeout = Math.max(5000, Number(options.timeout || 30000) + 5000);
        return new Promise(function(resolve, reject) {
            var settled = false;
            var abort = function() {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                delete registry.__bookSourceRequestCallbacks[id];
                reject(new Error('下载已取消'));
            };
            var timer = setTimeout(function() {
                if (settled) return;
                settled = true;
                delete registry.__bookSourceRequestCallbacks[id];
                reject(new Error('请求超时'));
            }, timeout);
            registry.__bookSourceRequestCallbacks[id] = function(nativeResult) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (options.signal && options.signal.removeEventListener) options.signal.removeEventListener('abort', abort);
                try {
                    var parsed = typeof nativeResult === 'string' ? JSON.parse(nativeResult) : nativeResult;
                    if (parsed && parsed.error) reject(new Error(parsed.error));
                    else resolve(parsed || { status: 0, url: options.url, headers: {}, body: '' });
                } catch (error) {
                    reject(error);
                }
            };
            if (options.signal && options.signal.addEventListener) options.signal.addEventListener('abort', abort, { once: true });
            try {
                bridge.requestAsync(JSON.stringify(options), id);
            } catch (error) {
                clearTimeout(timer);
                delete registry.__bookSourceRequestCallbacks[id];
                if (options.signal && options.signal.removeEventListener) options.signal.removeEventListener('abort', abort);
                reject(error);
            }
            if (options.signal && options.signal.aborted) abort();
        });
    }

    function NativeTransport() {}

    NativeTransport.prototype.request = async function(options) {
        options = Object.assign({}, options || {}, { url: normalizeInlineBookUrl(options && options.url) });
        var inlineBody = decodeInlineDataUrl(options.url);
        if (inlineBody !== null) return { status: 200, url: options.url, headers: {}, body: inlineBody };
        if (root.NiuniuBookSource && typeof root.NiuniuBookSource.requestAsync === 'function') {
            return requestViaNativeAsync(options);
        }
        if (root.NiuniuBookSource && typeof root.NiuniuBookSource.request === 'function') {
            var nativeResult = root.NiuniuBookSource.request(JSON.stringify(options));
            var parsedNative = typeof nativeResult === 'string' ? JSON.parse(nativeResult) : nativeResult;
            if (parsedNative.error) throw new Error(parsedNative.error);
            return parsedNative;
        }
        var capacitorHttp = root.Capacitor && root.Capacitor.Plugins && root.Capacitor.Plugins.CapacitorHttp;
        if (capacitorHttp && typeof capacitorHttp.request === 'function') {
            var capResult = await capacitorHttp.request({
                url: options.url,
                method: options.method || 'GET',
                headers: options.headers || {},
                data: options.body,
                connectTimeout: options.timeout || 20000,
                readTimeout: options.timeout || 30000,
                responseType: 'text'
            });
            return {
                status: capResult.status,
                url: capResult.url || options.url,
                headers: capResult.headers || {},
                body: typeof capResult.data === 'string' ? capResult.data : JSON.stringify(capResult.data)
            };
        }
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = controller ? setTimeout(function() { controller.abort(); }, options.timeout || 30000) : null;
        try {
            var response = await fetch(options.url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                body: /^(GET|HEAD)$/i.test(options.method || 'GET') ? undefined : options.body,
                signal: controller && controller.signal,
                redirect: options.followRedirects === false ? 'manual' : 'follow'
            });
            var body = await response.text();
            var headers = {};
            response.headers.forEach(function(value, key) { headers[key] = value; });
            if (!response.ok) throw new Error('HTTP ' + response.status + (body ? ': ' + body.slice(0, 160) : ''));
            return { status: response.status, url: response.url || options.url, headers: headers, body: body };
        } finally {
            if (timer) clearTimeout(timer);
        }
    };

    NativeTransport.prototype.requestSync = function(options) {
        options = Object.assign({}, options || {}, { url: normalizeInlineBookUrl(options && options.url) });
        var inlineBody = decodeInlineDataUrl(options.url);
        if (inlineBody !== null) return { status: 200, url: options.url, headers: {}, body: inlineBody };
        if (!root.NiuniuBookSource || typeof root.NiuniuBookSource.request !== 'function') {
            throw new Error('此书源脚本需要 Android 原生网络环境');
        }
        var nativeResult = JSON.parse(root.NiuniuBookSource.request(JSON.stringify(options)));
        if (nativeResult.error) throw new Error(nativeResult.error);
        return nativeResult;
    };

    function tokenizeJsonPath(path) {
        var source = path.replace(/^@Json:/i, '').trim();
        if (source.charAt(0) === '$') source = source.slice(1);
        var tokens = [];
        var regex = /\.\.([\w$-]+)|\.([\w$-]+)|\[['"]([^'"]+)['"]\]|\[(\*|-?\d+)\]|\[\?\((.*?)\)\]/g;
        var match;
        while ((match = regex.exec(source))) {
            if (match[1]) tokens.push({ type: 'recursive', key: match[1] });
            else if (match[2] || match[3]) tokens.push({ type: 'prop', key: match[2] || match[3] });
            else if (match[4] === '*') tokens.push({ type: 'wildcard' });
            else if (match[4]) tokens.push({ type: 'index', index: Number(match[4]) });
            else if (match[5]) tokens.push({ type: 'filter', expression: match[5] });
        }
        if (!tokens.length && source && /^[\w$-]+$/.test(source)) tokens.push({ type: 'prop', key: source });
        return tokens;
    }

    function recursiveValues(value, key, out) {
        if (!value || typeof value !== 'object') return;
        if (Object.prototype.hasOwnProperty.call(value, key)) out.push(value[key]);
        Object.keys(value).forEach(function(childKey) { recursiveValues(value[childKey], key, out); });
    }

    function testJsonFilter(item, expression) {
        var match = expression.match(/^@\.([\w$-]+)\s*(==|!=|>=|<=|>|<|=~)\s*(.+)$/);
        if (!match) return true;
        var actual = item && item[match[1]];
        var expectedText = match[3].trim();
        if (match[2] === '=~') {
            var regexMatch = expectedText.match(/^\/(.*)\/([gimsuy]*)$/);
            return regexMatch ? new RegExp(regexMatch[1], regexMatch[2]).test(asString(actual)) : false;
        }
        var expected;
        try { expected = parseLooseJson(expectedText.replace(/^'|'$/g, '"')); } catch (e) { expected = expectedText.replace(/^['"]|['"]$/g, ''); }
        switch (match[2]) {
            case '==': return actual == expected; // Source rules intentionally use loose comparison.
            case '!=': return actual != expected;
            case '>=': return actual >= expected;
            case '<=': return actual <= expected;
            case '>': return actual > expected;
            case '<': return actual < expected;
            default: return false;
        }
    }

    function jsonPath(value, path) {
        var current = [value];
        tokenizeJsonPath(path).forEach(function(token) {
            var next = [];
            current.forEach(function(item) {
                if (token.type === 'prop' && item != null && Object.prototype.hasOwnProperty.call(Object(item), token.key)) next.push(item[token.key]);
                else if (token.type === 'index' && Array.isArray(item)) {
                    var index = token.index < 0 ? item.length + token.index : token.index;
                    if (index >= 0 && index < item.length) next.push(item[index]);
                } else if (token.type === 'wildcard' && item != null) {
                    if (Array.isArray(item)) next.push.apply(next, item);
                    else if (typeof item === 'object') next.push.apply(next, Object.keys(item).map(function(key) { return item[key]; }));
                } else if (token.type === 'recursive') recursiveValues(item, token.key, next);
                else if (token.type === 'filter' && Array.isArray(item)) next.push.apply(next, item.filter(function(child) { return testJsonFilter(child, token.expression); }));
            });
            current = next;
        });
        return current;
    }

    function toDocument(value) {
        if (value && (value.nodeType || value.querySelectorAll)) return value;
        if (!root.DOMParser) throw new Error('当前环境不支持 HTML 解析');
        return new root.DOMParser().parseFromString(asString(value), 'text/html');
    }

    function normalizeCssSelector(selector) {
        return selector
            .replace(/^@CSS:/i, '')
            .replace(/@/g, ' ')
            .replace(/(^|\s|>)(class)\.([\w-]+)/g, '$1.$3')
            .replace(/(^|\s|>)(id)\.([\w-]+)/g, '$1#$3')
            .replace(/(^|\s|>)(tag)\.([\w-]+)/g, '$1$3')
            .replace(/\.([\w-]+)\.(\d+)(?=\s|>|$)/g, function(_, className, index) { return '.' + className + ':nth-of-type(' + (Number(index) + 1) + ')'; });
    }

    function cssExtract(value, rule, listMode) {
        var attr = null;
        var attrMatch = rule.match(/@(text|textNodes|ownText|html|all|href|src|content|value|data-[\w-]+|[\w:-]+)$/i);
        if (attrMatch) {
            attr = attrMatch[1];
            rule = rule.slice(0, attrMatch.index);
        }
        var excluded = [];
        rule = rule.replace(/!(-?\d+)/g, function(_, index) { excluded.push(Number(index)); return ''; });
        var doc = toDocument(value);
        var rawSelector = rule.replace(/^@@/, '').trim();
        var selector = normalizeCssSelector(rawSelector || '*');
        var nodes;
        try { nodes = rawSelector ? Array.from(doc.querySelectorAll(selector)) : [doc]; } catch (e) {
            throw new Error('CSS 规则错误 ' + selector + ': ' + e.message);
        }
        if (excluded.length) nodes = nodes.filter(function(_, index) { return excluded.indexOf(index) < 0 && excluded.indexOf(index - nodes.length) < 0; });
        if (listMode && !attr) return nodes;
        return nodes.map(function(node) {
            if (!attr || /^(text|textNodes|ownText)$/i.test(attr)) return (node.textContent || '').trim();
            if (/^(html|all)$/i.test(attr)) return node.innerHTML || '';
            return node.getAttribute(attr) || node[attr] || '';
        });
    }

    function xpathExtract(value, rule) {
        var context = toDocument(value);
        var doc = context.nodeType === 9 ? context : context.ownerDocument;
        var expression = rule.replace(/^@XPath:/i, '').trim();
        var result = doc.evaluate(expression, context, null, root.XPathResult.ANY_TYPE, null);
        var out = [];
        if (result.resultType === root.XPathResult.STRING_TYPE) return [result.stringValue];
        if (result.resultType === root.XPathResult.NUMBER_TYPE) return [result.numberValue];
        if (result.resultType === root.XPathResult.BOOLEAN_TYPE) return [result.booleanValue];
        var node;
        while ((node = result.iterateNext())) out.push(node.nodeType === 2 || node.nodeType === 3 ? node.nodeValue : node);
        return out;
    }

    function regexExtract(value, rule) {
        var pattern = rule.replace(/^@Regex:/i, '').replace(/^:/, '');
        var flags = 'g';
        var flagMatch = pattern.match(/^\(\?([ims]+)\)/i);
        if (flagMatch) {
            flags += flagMatch[1].toLowerCase();
            pattern = pattern.slice(flagMatch[0].length);
        }
        var regex = new RegExp(pattern, Array.from(new Set(flags.split(''))).join(''));
        var text = asString(value);
        var out = [];
        var match;
        while ((match = regex.exec(text))) {
            out.push(match.length > 1 ? match[1] : match[0]);
            if (match[0] === '') regex.lastIndex++;
        }
        return out;
    }

    function splitOutside(text, delimiter) {
        var out = [];
        var start = 0;
        var quote = '';
        var depth = 0;
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (quote) {
                if (ch === quote && text[i - 1] !== '\\') quote = '';
                continue;
            }
            if (ch === '"' || ch === "'") quote = ch;
            else if (ch === '(' || ch === '[' || ch === '{') depth++;
            else if (ch === ')' || ch === ']' || ch === '}') depth--;
            else if (depth === 0 && text.slice(i, i + delimiter.length) === delimiter) {
                out.push(text.slice(start, i));
                start = i + delimiter.length;
                i += delimiter.length - 1;
            }
        }
        out.push(text.slice(start));
        return out;
    }

    function BookSourceEngine(options) {
        options = options || {};
        this.transport = options.transport || new NativeTransport();
        this.variables = new Map();
        this.libraryRunners = new Map();
        this.cookies = new Map();
        this.maxTocPages = options.maxTocPages || 30;
        this.maxContentPages = options.maxContentPages || 12;
    }

    BookSourceEngine.prototype.variableMap = function(source) {
        var key = source.bookSourceUrl;
        if (!this.variables.has(key)) this.variables.set(key, new Map());
        return this.variables.get(key);
    };

    BookSourceEngine.prototype.forkForSource = function(source) {
        var fork = new BookSourceEngine({
            transport: this.transport,
            maxTocPages: this.maxTocPages,
            maxContentPages: this.maxContentPages
        });
        var key = source && source.bookSourceUrl;
        if (key && this.variables.has(key)) fork.variables.set(key, new Map(this.variables.get(key)));
        // Native cookies already live in the shared Android bridge. Keep the
        // in-browser fallback cookie store shared for the same semantics.
        fork.cookies = this.cookies;
        return fork;
    };

    BookSourceEngine.prototype.scriptBindings = function(context) {
        var self = this;
        var sourceData = context.source || {};
        var variables = this.variableMap(sourceData);
        var asyncMode = !!context.asyncMode;
        var originalSourceVariable = variables.get('__source_variable');
        var cookie = {
            getCookie: function(url) {
                if (root.NiuniuBookSource && typeof root.NiuniuBookSource.getCookie === 'function') return root.NiuniuBookSource.getCookie(asString(url));
                return self.cookies.get(asString(url)) || '';
            },
            getKey: function(url, key) {
                var value = asString(this.getCookie(url));
                var pattern = new RegExp('(?:^|;\\s*)' + asString(key).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '=([^;]*)');
                var match = value.match(pattern);
                return match ? match[1] : '';
            },
            setCookie: function(url, value) {
                if (root.NiuniuBookSource && typeof root.NiuniuBookSource.setCookie === 'function') return root.NiuniuBookSource.setCookie(asString(url), asString(value));
                self.cookies.set(asString(url), asString(value));
                return value;
            },
            removeCookie: function(url) {
                if (root.NiuniuBookSource && typeof root.NiuniuBookSource.removeCookie === 'function') return root.NiuniuBookSource.removeCookie(asString(url));
                self.cookies.delete(asString(url));
            }
        };
        var source = Object.assign({}, sourceData, {
            get: function(key) { return variables.get(String(key)); },
            put: function(key, value) { variables.set(String(key), value); return value; },
            getVariable: function() {
                var value = variables.get('__source_variable') || '';
                // Optional paragraph/community decorations in large Legado
                // sources perform extra synchronous requests.  They are not
                // part of the chapter text and would defeat lazy loading, so
                // turn them off while an async reader request is running.
                if (asyncMode && value !== undefined && value !== null && value !== '') {
                    try {
                        var parsed = typeof value === 'string' ? parseLooseJson(value) : value;
                        if (parsed && typeof parsed === 'object') {
                            parsed = Object.assign({}, parsed, { fqcommunity: 'off', fqpara: 'off' });
                            return JSON.stringify(parsed);
                        }
                    } catch (e) { /* preserve non-JSON source variables */ }
                }
                return value;
            },
            setVariable: function(value) {
                if (asyncMode) {
                    try {
                        var next = typeof value === 'string' && value ? parseLooseJson(value) : value;
                        var previous = typeof originalSourceVariable === 'string' && originalSourceVariable ? parseLooseJson(originalSourceVariable) : originalSourceVariable;
                        if (next && typeof next === 'object' && previous && typeof previous === 'object') {
                            if (previous.fqcommunity !== undefined) next.fqcommunity = previous.fqcommunity;
                            if (previous.fqpara !== undefined) next.fqpara = previous.fqpara;
                            value = JSON.stringify(next);
                        }
                    } catch (e) { /* preserve non-JSON variables */ }
                }
                variables.set('__source_variable', value);
            },
            getLoginInfo: function() { return variables.get('__login_info') || ''; },
            putLoginInfo: function(value) { variables.set('__login_info', value); return value; },
            getLoginInfoMap: function() {
                var value = variables.get('__login_info');
                if (!value) return {};
                if (typeof value === 'object') return value;
                try { return parseLooseJson(value); } catch (e) { return {}; }
            },
            getLoginHeader: function() { return variables.get('__login_header') || ''; },
            putLoginHeader: function(value) { variables.set('__login_header', value); return value; },
            getHeaderMap: function() { return parseHeaders(sourceData.header); },
            getKey: function() { return sourceData.bookSourceUrl || ''; },
            getFromMemory: function(key) { return variables.get('__memory_' + String(key)); },
            putMemory: function(key, value) { variables.set('__memory_' + String(key), value); return value; }
        });
        function decorate(data) {
            data = data || {};
            return Object.assign({}, data, {
                getName: function() { return data.name || ''; },
                getAuthor: function() { return data.author || ''; },
                getBookUrl: function() { return data.bookUrl || ''; },
                getUrl: function() { return data.url || ''; },
                getTitle: function() { return data.title || ''; },
                getIndex: function() { return data.index || 0; },
                getVariable: function() { return data.variable || ''; },
                setUseReplaceRule: function(value) {
                    data.readConfig = data.readConfig || {};
                    data.readConfig.useReplaceRule = !!value;
                }
            });
        }
        function JavaImporter() {
            this.importClass = function() { return this; };
        }
        var java = {
            get: function(key) { return variables.get(String(key)); },
            put: function(key, value) { variables.set(String(key), value); return value; },
            ajax: function(url) { return self.transport.requestSync(self.prepareRequest(url, context)).body; },
            // Async counterparts are used by the reader/download path.  The
            // legacy methods above intentionally stay synchronous because a
            // number of imported sources rely on that contract.
            ajaxAsync: async function(url) { return (await self.transport.request(self.prepareRequest(url, context))).body; },
            connect: function(url, headers) {
                var request = self.prepareRequest(url, context);
                request.headers = Object.assign(request.headers, parseHeaders(headers));
                return responseWrapper(self.transport.requestSync(request));
            },
            connectAsync: async function(url, headers) {
                var request = self.prepareRequest(url, context);
                request.headers = Object.assign(request.headers, parseHeaders(headers));
                return responseWrapper(await self.transport.request(request));
            },
            getString: function(url, headers) {
                var request = self.prepareRequest(url, context);
                request.headers = Object.assign(request.headers, parseHeaders(headers));
                return self.transport.requestSync(request).body;
            },
            getStringAsync: async function(url, headers) {
                var request = self.prepareRequest(url, context);
                request.headers = Object.assign(request.headers, parseHeaders(headers));
                return (await self.transport.request(request)).body;
            },
            post: function(url, body, headers) {
                return responseWrapper(self.transport.requestSync({ url: resolveUrl(url, context.baseUrl || sourceData.bookSourceUrl), method: 'POST', body: asString(body), headers: parseHeaders(headers) }));
            },
            postAsync: async function(url, body, headers) {
                return responseWrapper(await self.transport.request({ url: resolveUrl(url, context.baseUrl || sourceData.bookSourceUrl), method: 'POST', body: asString(body), headers: parseHeaders(headers) }));
            },
            getCookie: function(url) { return cookie.getCookie(url); },
            getWebViewUA: function() { return DEFAULT_UA; },
            toast: function(message) { if (root.console) root.console.info('[BookSource]', asString(message)); },
            longToast: function(message) { if (root.console) root.console.info('[BookSource]', asString(message)); },
            startBrowser: function(url, title) {
                var target = asString(url);
                var label = asString(title) || '书源登录';
                if (root.NiuniuBookSource && typeof root.NiuniuBookSource.startBrowser === 'function') {
                    root.NiuniuBookSource.startBrowser(target, label);
                } else if (root.open) {
                    root.open(target, '_blank');
                }
                return '';
            },
            startBrowserDp: function(url, title) {
                return this.startBrowser(url, title);
            },
            startBrowserAwait: function(url, title) {
                var target = asString(url);
                this.startBrowser(target, title);
                // The native browser is intentionally non-blocking. Source scripts that
                // only use this call to open a login page can continue immediately.
                return responseWrapper({ status: 200, url: target, headers: {}, body: '' });
            },
            base64Encode: function(value) { return typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(asString(value)))) : Buffer.from(asString(value)).toString('base64'); },
            base64Decode: decodeBase64,
            hexDecodeToString: function(value) {
                var text = asString(value).trim();
                if (!/^(?:[0-9a-f]{2})+$/i.test(text)) return text;
                var encoded = '';
                for (var i = 0; i < text.length; i += 2) encoded += '%' + text.slice(i, i + 2);
                try { return decodeURIComponent(encoded); } catch (e) { return text; }
            },
            md5Encode: function(value) {
                if (root.NiuniuBookSource && typeof root.NiuniuBookSource.md5 === 'function') return root.NiuniuBookSource.md5(asString(value));
                throw new Error('MD5 规则需要 Android 原生环境');
            },
            encodeURI: encodeURI,
            encodeURIComponent: encodeURIComponent,
            log: function() { if (root.console) root.console.log.apply(root.console, arguments); }
        };
        return {
            result: context.result,
            src: context.src !== undefined ? context.src : context.result,
            baseUrl: context.baseUrl || '',
            redirectUrl: context.redirectUrl || context.baseUrl || '',
            key: context.key || '',
            page: context.page || 1,
            searchPage: context.page || 1,
            searchKey: context.key || '',
            java: java,
            source: source,
            sourceApi: source,
            cookie: cookie,
            cache: source,
            Packages: {},
            JavaImporter: JavaImporter,
            infoMap: context.infoMap || {},
            book: decorate(context.book),
            chapter: decorate(context.chapter)
        };
    };

    BookSourceEngine.prototype.libraryRunner = function(library, names) {
        var key = names.join('|') + '\n' + library;
        if (this.libraryRunners.has(key)) return this.libraryRunners.get(key);
        var functionNames = this.libraryFunctionNames(library);
        var expose = functionNames.map(function(name) {
            return 'try { this[' + JSON.stringify(name) + '] = ' + name + '; } catch (__exposeError) {}';
        }).join('\n');
        var body = asString(library) + '\n' + expose + '\n;return eval(__ruleCode);';
        var runner = Function.apply(null, names.concat('__ruleCode', body));
        this.libraryRunners.set(key, runner);
        return runner;
    };

    BookSourceEngine.prototype.libraryFunctionNames = function(library) {
        var names = [];
        var seen = new Set();
        var match;
        var pattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
        while ((match = pattern.exec(asString(library)))) {
            if (!seen.has(match[1])) {
                seen.add(match[1]);
                names.push(match[1]);
            }
        }
        return names;
    };

    BookSourceEngine.prototype.withRuntimeGlobals = function(bindings, action, extraNames) {
        var runtimeNames = ['java', 'source', 'sourceApi', 'cookie', 'cache', 'infoMap', 'book', 'chapter', 'baseUrl', 'redirectUrl', 'result', 'src', 'key', 'page', 'searchKey', 'searchPage'];
        var names = runtimeNames.concat(extraNames || []).filter(function(name, index, all) { return all.indexOf(name) === index; });
        var previous = {};
        var existed = {};
        names.forEach(function(name) {
            existed[name] = Object.prototype.hasOwnProperty.call(root, name);
            previous[name] = root[name];
            if (runtimeNames.indexOf(name) >= 0) root[name] = bindings[name];
        });
        try { return action(); }
        finally {
            names.forEach(function(name) {
                if (existed[name]) root[name] = previous[name];
                else {
                    try { delete root[name]; } catch (e) { root[name] = undefined; }
                }
            });
        }
    };

    // Runtime globals such as `java` are also exposed through `this` for a
    // number of Legado libraries.  Keep them installed until an async rule has
    // fully settled; the synchronous helper above restores them immediately.
    BookSourceEngine.prototype.withRuntimeGlobalsAsync = async function(bindings, action, extraNames) {
        var runtimeNames = ['java', 'source', 'sourceApi', 'cookie', 'cache', 'infoMap', 'book', 'chapter', 'baseUrl', 'redirectUrl', 'result', 'src', 'key', 'page', 'searchKey', 'searchPage'];
        var names = runtimeNames.concat(extraNames || []).filter(function(name, index, all) { return all.indexOf(name) === index; });
        var previous = {};
        var existed = {};
        names.forEach(function(name) {
            existed[name] = Object.prototype.hasOwnProperty.call(root, name);
            previous[name] = root[name];
            if (runtimeNames.indexOf(name) >= 0) root[name] = bindings[name];
        });
        try { return await action(); }
        finally {
            names.forEach(function(name) {
                if (existed[name]) root[name] = previous[name];
                else {
                    try { delete root[name]; } catch (e) { root[name] = undefined; }
                }
            });
        }
    };

    BookSourceEngine.prototype.evalJs = function(code, context) {
        var script = asString(code).trim()
            .replace(/^@js:/i, '')
            .replace(/^<js>/i, '')
            .replace(/<\/js>$/i, '');
        if (!script) return context.result;
        var b = this.scriptBindings(context);
        var names = Object.keys(b);
        var values = names.map(function(name) { return b[name]; });
        var library = context.source && context.source.jsLib || '';
        var libraryNames = this.libraryFunctionNames(library);
        var self = this;
        try {
            return this.withRuntimeGlobals(b, function() {
                return self.libraryRunner(library, names).apply(root, values.concat(script));
            }, libraryNames);
        } catch (firstError) {
            try {
                return this.withRuntimeGlobals(b, function() {
                    var expose = libraryNames.map(function(name) {
                        return 'try { this[' + JSON.stringify(name) + '] = ' + name + '; } catch (__exposeError) {}';
                    }).join('\n');
                    return Function.apply(null, names.concat(asString(library) + '\n' + expose + '\n' + script)).apply(root, values);
                }, libraryNames);
            } catch (secondError) {
                throw new Error('JS 规则执行失败: ' + secondError.message);
            }
        }
    };

    function rewriteAsyncJavaCalls(script) {
        // Imported Legado scripts normally issue these calls at top level.  A
        // direct `await` keeps their original return-value semantics while the
        // native transport runs off the WebView thread.
        return script
            .replace(/\bjava\.ajax\s*\(/g, 'await java.ajaxAsync(')
            .replace(/\bjava\.connect\s*\(/g, 'await java.connectAsync(')
            .replace(/\bjava\.getString\s*\(/g, 'await java.getStringAsync(')
            .replace(/\bjava\.post\s*\(/g, 'await java.postAsync(');
    }

    function addImplicitAsyncRuleReturn(script) {
        var text = asString(script).trim();
        if (!text || /(?:^|[;\n])\s*return\b/.test(text.slice(Math.max(0, text.length - 160)))) return text;
        // Find the last top-level statement boundary without splitting on
        // semicolons/newlines inside strings or nested expressions.
        var quote = '';
        var escaped = false;
        var round = 0;
        var square = 0;
        var curly = 0;
        var boundary = -1;
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (quote) {
                if (escaped) escaped = false;
                else if (ch === '\\') escaped = true;
                else if (ch === quote) quote = '';
                continue;
            }
            if (ch === '"' || ch === "'") { quote = ch; continue; }
            if (ch === '(') round++;
            else if (ch === ')') round = Math.max(0, round - 1);
            else if (ch === '[') square++;
            else if (ch === ']') square = Math.max(0, square - 1);
            else if (ch === '{') curly++;
            else if (ch === '}') curly = Math.max(0, curly - 1);
            else if ((ch === ';' || ch === '\n') && round === 0 && square === 0 && curly === 0) boundary = i;
        }
        var tailStart = boundary + 1;
        var tail = text.slice(tailStart).trim().replace(/;\s*$/, '').trim();
        if (!tail || /^(?:var|let|const|if|for|while|try|catch|finally|switch|function|class|return|throw|break|continue)\b/.test(tail)) return text;
        return text.slice(0, tailStart) + 'return ' + tail + ';';
    }

    BookSourceEngine.prototype.evalJsAsync = async function(code, context) {
        var script = asString(code).trim()
            .replace(/^@js:/i, '')
            .replace(/^<js>/i, '')
            .replace(/<\/js>$/i, '');
        if (!script) return context.result;
        var b = this.scriptBindings(Object.assign({}, context, { asyncMode: true }));
        var names = Object.keys(b);
        var values = names.map(function(name) { return b[name]; });
        var library = context.source && context.source.jsLib || '';
        var libraryNames = this.libraryFunctionNames(library);
        var expose = libraryNames.map(function(name) {
            // Bind library helpers to this rule's runtime object. Without the
            // bind, a bare helper call receives the shared window as `this`,
            // so overlapping downloads and searches can overwrite each
            // other's source/cookie bindings.
            return 'try { if (typeof ' + name + ' === "function") ' + name + ' = ' + name + '.bind(this); this[' + JSON.stringify(name) + '] = ' + name + '; } catch (__exposeError) {}';
        }).join('\n');
        var AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
        var transformed = addImplicitAsyncRuleReturn(rewriteAsyncJavaCalls(script));
        // Legado sources commonly leave a value in a named variable after a
        // conditional block (for example `content_url = ...`) instead of
        // writing an explicit return. Preserve that convention while keeping
        // rules with no output empty.
        var fallbackNames = ['data', 'content_url', 'bookUrl', 'tocUrl', 'chapterUrl', 'url', 'content'];
        if (/\bresult\s*=/.test(transformed) || /(?:^|[;\n])\s*result\s*;?\s*$/.test(transformed)) fallbackNames.push('result');
        var fallbackCode = '\n;var __ruleResult;';
        fallbackNames.forEach(function(name) {
            fallbackCode += '\nif (__ruleResult === undefined && typeof ' + name + ' !== "undefined" && ' + name + ' !== null && ' + name + ' !== "") __ruleResult = ' + name + ';';
        });
        fallbackCode += '\nreturn __ruleResult === undefined ? "" : __ruleResult;';
        // Legado rules frequently assign outputs such as `content_url`
        // without declaring them. Declare those names in this invocation so
        // they cannot leak onto window and be reused by a later rule.
        var localFallbackNames = fallbackNames.filter(function(name) { return name !== 'result'; });
        var declarations = localFallbackNames.length ? 'var ' + localFallbackNames.join(', ') + ';\n' : '';
        var body = declarations + '{\n' + asString(library) + '\n' + expose + '\n' + transformed +
            fallbackCode + '\n}';
        var runner;
        try {
            runner = AsyncFunction.apply(null, names.concat(body));
        } catch (error) {
            throw new Error('JS 规则执行失败: ' + error.message);
        }
        try {
            // Keep async rules isolated from the global object. The runner's
            // parameters already contain all runtime bindings; the object is
            // only needed as the receiver for source-library helpers and
            // `this.*` calls.
            var runtimeThis = Object.create(root || null);
            Object.keys(b).forEach(function(name) { runtimeThis[name] = b[name]; });
            return await runner.apply(runtimeThis, values);
        } catch (error) {
            throw new Error('JS 异步规则执行失败: ' + error.message);
        }
    };

    BookSourceEngine.prototype.callMainJs = async function(sourceData, functionName, args, context, optional) {
        context = Object.assign({ source: sourceData, baseUrl: sourceData.bookSourceUrl }, context || {});
        var bindings = this.scriptBindings(context);
        bindings.sourceApi = bindings.source;
        bindings.cache = bindings.source;
        bindings.cookie = {};
        bindings.__args = args || [];
        bindings.__functionName = functionName;
        bindings.__optionalFunction = !!optional;
        delete bindings.source;
        var names = Object.keys(bindings);
        var values = names.map(function(name) { return bindings[name]; });
        var invocation = '\n;var __target;try{__target=eval(__functionName)}catch(__missing){__target=null}if(typeof __target!=="function"){if(__optionalFunction)return null;throw new Error("JS源缺少函数 "+__functionName)}return __target.apply(null,__args);';
        var result;
        try {
            result = Function.apply(null, names.concat(sourceData.mainJs + invocation)).apply(null, values);
            if (result && typeof result.then === 'function') result = await result;
        } catch (e) {
            throw new Error('JS 书源 ' + functionName + ' 执行失败：' + e.message);
        }
        if (typeof result === 'string') {
            var trimmed = result.trim();
            if (/^[\[{]/.test(trimmed)) {
                try { return parseLooseJson(trimmed); } catch (e) { return result; }
            }
        }
        return result;
    };

    BookSourceEngine.prototype.normalizeJsBooks = function(source, value) {
        var list = Array.isArray(value) ? value : [];
        return list.map(function(item) {
            return {
                name: asString(item.name),
                author: asString(item.author),
                intro: asString(item.intro),
                kind: asString(item.kind),
                lastChapter: asString(item.latestChapterTitle || item.lastChapter),
                updateTime: asString(item.updateTime),
                wordCount: asString(item.wordCount),
                bookUrl: resolveUrl(item.bookUrl, source.bookSourceUrl),
                tocUrl: item.tocUrl ? resolveUrl(item.tocUrl, item.bookUrl || source.bookSourceUrl) : '',
                coverUrl: item.coverUrl ? resolveUrl(item.coverUrl, source.bookSourceUrl) : '',
                variable: item.variable,
                sourceUrl: source.bookSourceUrl,
                sourceName: source.bookSourceName
            };
        }).filter(function(book) { return book.name && book.bookUrl; });
    };

    BookSourceEngine.prototype.interpolate = function(value, context) {
        var self = this;
        var output = asString(value).replace(/\{\{([\s\S]*?)\}\}/g, function(_, expression) {
            var code = expression.trim();
            if (!code) return '';
            try { return asString(self.evalJs(code, context)); } catch (e) {
                var result = self.extract(context.result, code, context, false);
                return asString(result);
            }
        });
        var key = asString(context.key || '');
        var page = String(context.page || 1);
        return output
            .replace(/<key>/gi, encodeURIComponent(key))
            .replace(/\{key\}/gi, encodeURIComponent(key))
            .replace(/searchKey/g, key)
            .replace(/searchPage/g, page)
            .replace(/\{page\}/gi, page);
    };

    BookSourceEngine.prototype.prepareRequest = function(ruleUrl, context) {
        context = Object.assign({}, context || {});
        var rawRuleUrl = asString(ruleUrl).trim();
        var expanded = /^@js:|^<js>/i.test(rawRuleUrl)
            ? this.interpolate(asString(this.evalJs(rawRuleUrl, context)), context)
            : this.interpolate(rawRuleUrl, context);
        var parsed = splitUrlOption(expanded);
        var option = parsed.option || {};
        var source = context.source || {};
        var sourceHeader = source.header || '';
        if (/^@js:|^<js>/i.test(asString(sourceHeader).trim())) sourceHeader = this.evalJs(sourceHeader, context);
        else sourceHeader = this.interpolate(sourceHeader, context);
        var headers = Object.assign({ 'User-Agent': DEFAULT_UA, 'Accept': '*/*' }, parseHeaders(sourceHeader), parseHeaders(option.headers));
        var loginHeader = this.variableMap(source).get('__login_header');
        if (loginHeader) Object.assign(headers, parseHeaders(loginHeader));
        var baseUrl = context.baseUrl || source.bookSourceUrl;
        var url = resolveUrl(this.interpolate(parsed.url, context), baseUrl);
        var body = option.body;
        if (body && typeof body === 'object') body = JSON.stringify(body);
        body = body === undefined || body === null ? undefined : this.interpolate(asString(body), context);
        var method = asString(option.method || (body !== undefined ? 'POST' : 'GET')).toUpperCase();
        if (body !== undefined && !headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = /^\s*[\[{]/.test(body) ? 'application/json; charset=utf-8' : 'application/x-www-form-urlencoded; charset=utf-8';
        }
        var contentType = headers['Content-Type'] || headers['content-type'] || '';
        if (body !== undefined && /^application\/x-www-form-urlencoded/i.test(contentType)) body = encodeFormBody(body);
        return {
            url: url,
            method: method,
            headers: headers,
            body: body,
            charset: option.charset || 'utf-8',
            timeout: Number(option.timeout || 30000),
            followRedirects: option.followRedirects !== false
        };
    };

    BookSourceEngine.prototype.fetch = async function(ruleUrl, context) {
        var request = this.prepareRequest(ruleUrl, context);
        if (context && context.signal) request.signal = context.signal;
        var response = await this.transport.request(request);
        if (response.status && (response.status < 200 || response.status >= 400)) throw new Error('HTTP ' + response.status);
        if (splitUrlOption(this.interpolate(ruleUrl, context)).option.bodyJs) {
            response.body = asString(this.evalJs(splitUrlOption(this.interpolate(ruleUrl, context)).option.bodyJs, Object.assign({}, context, { result: response.body, src: response.body })));
        }
        return response;
    };

    BookSourceEngine.prototype.parseBody = function(body) {
        if (body && typeof body === 'object') return body;
        var text = asString(body).trim();
        if (/^[\[{]/.test(text)) {
            try { return parseLooseJson(text); } catch (e) { /* treat as HTML */ }
        }
        return body;
    };

    BookSourceEngine.prototype.extractBasic = function(value, rule, listMode) {
        var text = asString(rule).trim();
        if (!text) return listMode ? (Array.isArray(value) ? value : [value]) : value;
        if (/^@Json:|^\$/i.test(text)) {
            var jsonValues = jsonPath(typeof value === 'string' ? this.parseBody(value) : value, text);
            return listMode && jsonValues.length === 1 && Array.isArray(jsonValues[0]) ? jsonValues[0] : jsonValues;
        }
        if (/^@XPath:|^\/\//i.test(text)) return xpathExtract(value, text);
        if (/^@Regex:|^:/i.test(text)) return regexExtract(value, text);
        if (value && typeof value === 'object' && !value.nodeType && !value.querySelectorAll && Object.prototype.hasOwnProperty.call(value, text)) return [value[text]];
        return cssExtract(value, text, listMode);
    };

    BookSourceEngine.prototype.extract = function(value, rule, context, listMode) {
        context = Object.assign({}, context || {});
        var text = asString(rule).trim();
        if (!text) return listMode ? (Array.isArray(value) ? value : [value]) : value;

        var getMatch = text.match(/^@get:\{([^}]+)\}$/i);
        if (getMatch) return this.variableMap(context.source || {}).get(getMatch[1]) || '';

        var chainedJs = text.match(/^<js>([\s\S]*?)<\/js>([\s\S]*)$/i);
        if (chainedJs) {
            var jsValue = this.evalJs('<js>' + chainedJs[1] + '</js>', Object.assign({}, context, { result: value, src: value }));
            var trailingRule = chainedJs[2].trim();
            return trailingRule
                ? this.extract(jsValue, trailingRule, Object.assign({}, context, { result: jsValue, src: jsValue }), listMode)
                : jsValue;
        }
        if (/^@js:/i.test(text)) return this.evalJs(text, Object.assign({}, context, { result: value, src: value }));

        if (!listMode && /\{\{[\s\S]*?\}\}/.test(text)) {
            return this.interpolate(text, Object.assign({}, context, { result: value, src: value }));
        }

        var alternatives = splitOutside(text, '||');
        if (alternatives.length > 1) {
            for (var a = 0; a < alternatives.length; a++) {
                try {
                    var alternative = this.extract(value, alternatives[a], context, listMode);
                    if (Array.isArray(alternative) ? alternative.length : asString(alternative).trim()) return alternative;
                } catch (e) { /* try next rule */ }
            }
            return listMode ? [] : '';
        }

        var joins = splitOutside(text, '&&');
        if (joins.length > 1 && !listMode) {
            return joins.map(function(part) { return asString(this.extract(value, part, context, false)); }, this).join('');
        }
        if (joins.length > 1 && listMode) {
            return joins.reduce(function(all, part) {
                var parsed = this.extract(value, part, context, true);
                return all.concat(Array.isArray(parsed) ? parsed : [parsed]);
            }.bind(this), []);
        }

        var jsIndex = text.search(/@js:|<js>/i);
        var mainRule = jsIndex >= 0 ? text.slice(0, jsIndex) : text;
        var jsRule = jsIndex >= 0 ? text.slice(jsIndex) : '';
        var replaceParts = splitOutside(mainRule, '##');
        mainRule = replaceParts.shift();
        var extracted = this.extractBasic(value, mainRule, listMode);
        if (!listMode && Array.isArray(extracted)) extracted = extracted.length <= 1 ? extracted[0] : extracted.map(asString).join('\n');
        if (replaceParts.length) {
            var replaceValue = replaceParts.length > 1 ? replaceParts[1] : '';
            try { extracted = asString(extracted).replace(new RegExp(replaceParts[0], 'g'), replaceValue); } catch (e) { /* invalid replacement is ignored */ }
        }
        var putMatch = text.match(/@put:\{([^}]+)\}/i);
        if (putMatch) this.variableMap(context.source || {}).set(putMatch[1], extracted);
        if (jsRule) extracted = this.evalJs(jsRule, Object.assign({}, context, { result: extracted, src: value }));
        return extracted;
    };

    // Async equivalent used for chapter rules.  It mirrors the declarative
    // extractor but awaits JS snippets so `java.ajax` can use requestAsync.
    BookSourceEngine.prototype.extractAsync = async function(value, rule, context, listMode) {
        context = Object.assign({}, context || {});
        var text = asString(rule).trim();
        if (!text) return listMode ? (Array.isArray(value) ? value : [value]) : value;

        var getMatch = text.match(/^@get:\{([^}]+)\}$/i);
        if (getMatch) return this.variableMap(context.source || {}).get(getMatch[1]) || '';

        var chainedJs = text.match(/^<js>([\s\S]*?)<\/js>([\s\S]*)$/i);
        if (chainedJs) {
            var jsValue = await this.evalJsAsync('<js>' + chainedJs[1] + '</js>', Object.assign({}, context, { result: value, src: value }));
            var trailingRule = chainedJs[2].trim();
            return trailingRule
                ? this.extractAsync(jsValue, trailingRule, Object.assign({}, context, { result: jsValue, src: jsValue }), listMode)
                : jsValue;
        }
        if (/^@js:/i.test(text)) return this.evalJsAsync(text, Object.assign({}, context, { result: value, src: value }));

        if (!listMode && /\{\{[\s\S]*?\}\}/.test(text)) {
            return this.interpolate(text, Object.assign({}, context, { result: value, src: value }));
        }

        var alternatives = splitOutside(text, '||');
        if (alternatives.length > 1) {
            for (var a = 0; a < alternatives.length; a++) {
                try {
                    var alternative = await this.extractAsync(value, alternatives[a], context, listMode);
                    if (Array.isArray(alternative) ? alternative.length : asString(alternative).trim()) return alternative;
                } catch (e) { /* try next rule */ }
            }
            return listMode ? [] : '';
        }

        var joins = splitOutside(text, '&&');
        if (joins.length > 1 && !listMode) {
            var joined = [];
            for (var j = 0; j < joins.length; j++) joined.push(asString(await this.extractAsync(value, joins[j], context, false)));
            return joined.join('');
        }
        if (joins.length > 1 && listMode) {
            var all = [];
            for (var k = 0; k < joins.length; k++) {
                var parsedJoin = await this.extractAsync(value, joins[k], context, true);
                all = all.concat(Array.isArray(parsedJoin) ? parsedJoin : [parsedJoin]);
            }
            return all;
        }

        var jsIndex = text.search(/@js:|<js>/i);
        var mainRule = jsIndex >= 0 ? text.slice(0, jsIndex) : text;
        var jsRule = jsIndex >= 0 ? text.slice(jsIndex) : '';
        var replaceParts = splitOutside(mainRule, '##');
        mainRule = replaceParts.shift();
        var extracted = this.extractBasic(value, mainRule, listMode);
        if (!listMode && Array.isArray(extracted)) extracted = extracted.length <= 1 ? extracted[0] : extracted.map(asString).join('\n');
        if (replaceParts.length) {
            var replaceValue = replaceParts.length > 1 ? replaceParts[1] : '';
            try { extracted = asString(extracted).replace(new RegExp(replaceParts[0], 'g'), replaceValue); } catch (e) { /* invalid replacement is ignored */ }
        }
        var putMatch = text.match(/@put:\{([^}]+)\}/i);
        if (putMatch) this.variableMap(context.source || {}).set(putMatch[1], extracted);
        if (jsRule) extracted = await this.evalJsAsync(jsRule, Object.assign({}, context, { result: extracted, src: value }));
        return extracted;
    };

    BookSourceEngine.prototype.extractString = function(value, rule, context, isUrl) {
        if (rule === null || rule === undefined || asString(rule).trim() === '') return '';
        var output = this.extract(value, rule, context, false);
        if (Array.isArray(output)) output = output.map(asString).join('\n');
        output = asString(output).trim();
        return isUrl ? resolveUrl(output, context.baseUrl || context.redirectUrl || context.source.bookSourceUrl) : output;
    };

    BookSourceEngine.prototype.extractStringAsync = async function(value, rule, context, isUrl) {
        if (rule === null || rule === undefined || asString(rule).trim() === '') return '';
        var output = await this.extractAsync(value, rule, context, false);
        if (Array.isArray(output)) output = output.map(asString).join('\n');
        output = asString(output).trim();
        return isUrl ? resolveUrl(output, context.baseUrl || context.redirectUrl || context.source.bookSourceUrl) : output;
    };

    BookSourceEngine.prototype.parseBookList = function(source, response, rule, context) {
        var body = this.parseBody(response.body);
        var baseContext = Object.assign({}, context, { source: source, baseUrl: response.url, redirectUrl: response.url, result: body, src: body });
        var items = this.extract(body, rule.bookList || '', baseContext, true);
        if (!Array.isArray(items)) items = [items];
        var self = this;
        return items.map(function(item) {
            var itemContext = Object.assign({}, baseContext, { result: item, src: item });
            return {
                name: self.extractString(item, rule.name, itemContext, false),
                author: self.extractString(item, rule.author, itemContext, false),
                intro: self.extractString(item, rule.intro, itemContext, false),
                kind: self.extractString(item, rule.kind, itemContext, false),
                lastChapter: self.extractString(item, rule.lastChapter, itemContext, false),
                updateTime: self.extractString(item, rule.updateTime, itemContext, false),
                wordCount: self.extractString(item, rule.wordCount, itemContext, false),
                bookUrl: self.extractString(item, rule.bookUrl, itemContext, true),
                coverUrl: self.extractString(item, rule.coverUrl, itemContext, true),
                sourceUrl: source.bookSourceUrl,
                sourceName: source.bookSourceName
            };
        }).filter(function(book) { return book.name || book.bookUrl; });
    };

    BookSourceEngine.prototype.search = async function(source, key, page) {
        if (!source.enabled) return [];
        if (source.mainJs) return this.normalizeJsBooks(source, await this.callMainJs(source, 'search', [key, page || 1], { key: key, page: page || 1 }));
        if (!source.searchUrl) return [];
        var context = { source: source, key: key, page: page || 1, baseUrl: source.bookSourceUrl };
        var response = await this.fetch(source.searchUrl, context);
        return this.parseBookList(source, response, source.ruleSearch || {}, context);
    };

    BookSourceEngine.prototype.parseExploreKinds = function(source) {
        var text = asString(source.exploreUrl).trim();
        if (!text) return [];
        if (/^@js:|^<js>/i.test(text)) text = asString(this.evalJs(text, { source: source, page: 1, result: '' }));
        if (/^\s*\[/.test(text)) {
            try {
                return parseLooseJson(text).filter(function(kind) { return kind && (kind.title || kind.name); }).map(function(kind) {
                    return Object.assign({ type: 'url' }, kind, { title: kind.title || kind.name });
                });
            } catch (e) { /* parse line format */ }
        }
        return text.split(/(?:&&|\r?\n)+/).map(function(line) {
            var parts = line.split('::');
            return { title: parts[0].trim(), url: (parts[1] || '').trim(), type: 'url' };
        }).filter(function(kind) { return kind.title; });
    };

    BookSourceEngine.prototype.explore = async function(source, exploreUrl, page) {
        if (source.mainJs) return this.normalizeJsBooks(source, await this.callMainJs(source, 'explore', [exploreUrl, page || 1], { page: page || 1 }));
        var context = { source: source, page: page || 1, baseUrl: source.bookSourceUrl };
        var response = await this.fetch(exploreUrl, context);
        return this.parseBookList(source, response, source.ruleExplore || {}, context);
    };

    BookSourceEngine.prototype.bookInfo = async function(source, book) {
        if (source.mainJs) {
            var parsedInfo = await this.callMainJs(source, 'getBookInfo', [book], { book: book }, true);
            if (!parsedInfo || typeof parsedInfo !== 'object' || Array.isArray(parsedInfo)) return Object.assign({}, book, { tocUrl: book.tocUrl || book.bookUrl });
            var jsInfo = Object.assign({}, book, parsedInfo);
            jsInfo.bookUrl = resolveUrl(jsInfo.bookUrl || book.bookUrl, source.bookSourceUrl);
            jsInfo.tocUrl = resolveUrl(jsInfo.tocUrl || jsInfo.bookUrl, jsInfo.bookUrl);
            jsInfo.coverUrl = resolveUrl(jsInfo.coverUrl || '', jsInfo.bookUrl);
            return jsInfo;
        }
        var rule = source.ruleBookInfo || {};
        var hasInfoRule = Object.keys(rule).some(function(key) { return key !== 'init' && asString(rule[key]).trim(); });
        if (!hasInfoRule) return Object.assign({}, book, { tocUrl: book.tocUrl || book.bookUrl });
        var context = { source: source, book: book, baseUrl: book.bookUrl };
        var response = await this.fetch(book.bookUrl, context);
        var body = this.parseBody(response.body);
        if (rule.init) body = await this.extractAsync(body, rule.init, Object.assign({}, context, { baseUrl: response.url }), false);
        var infoContext = Object.assign({}, context, { result: body, src: body, baseUrl: response.url, redirectUrl: response.url });
        var output = Object.assign({}, book);
        var infoFields = ['name', 'author', 'intro', 'kind', 'lastChapter', 'updateTime', 'wordCount'];
        for (var fieldIndex = 0; fieldIndex < infoFields.length; fieldIndex++) {
            var fieldName = infoFields[fieldIndex];
            var parsed = await this.extractStringAsync(body, rule[fieldName], infoContext, false);
            if (parsed) output[fieldName] = parsed;
        }
        var cover = await this.extractStringAsync(body, rule.coverUrl, infoContext, true);
        var toc = await this.extractStringAsync(body, rule.tocUrl, infoContext, true);
        if (cover) output.coverUrl = cover;
        output.tocUrl = toc || output.tocUrl || response.url || book.bookUrl;
        output.bookUrl = book.bookUrl;
        return output;
    };

    BookSourceEngine.prototype.toc = async function(source, book, onProgress) {
        if (source.mainJs) {
            var jsChapters = await this.callMainJs(source, 'getChapters', [book], { book: book });
            if (!Array.isArray(jsChapters)) throw new Error('JS 源 getChapters 返回值不是数组');
            return jsChapters.filter(function(chapter) { return chapter && chapter.title && chapter.url; }).map(function(chapter, index) {
                return Object.assign({}, chapter, { index: index, url: resolveUrl(chapter.url, book.tocUrl || book.bookUrl), isVolume: !!chapter.isVolume });
            });
        }
        var rule = source.ruleToc || {};
        var nextUrl = book.tocUrl || book.bookUrl;
        var visited = new Set();
        var chapters = [];
        var page = 1;
        while (nextUrl && !visited.has(nextUrl) && page <= this.maxTocPages) {
            visited.add(nextUrl);
            var context = { source: source, book: book, page: page, baseUrl: nextUrl };
            var response = await this.fetch(nextUrl, context);
            var body = this.parseBody(response.body);
            var listContext = Object.assign({}, context, { baseUrl: response.url, redirectUrl: response.url, result: body, src: body });
            var listRule = asString(rule.chapterList || '');
            var reverseList = listRule.charAt(0) === '-';
            if (listRule.charAt(0) === '-' || listRule.charAt(0) === '+') listRule = listRule.slice(1);
            var items = await this.extractAsync(body, listRule, listContext, true);
            if (!Array.isArray(items)) items = [items];
            if (reverseList) items.reverse();
            for (var i = 0; i < items.length; i++) {
                var itemContext = Object.assign({}, listContext, { result: items[i], src: items[i], chapter: { index: chapters.length } });
                var title = await this.extractStringAsync(items[i], rule.chapterName, itemContext, false);
                var url = await this.extractStringAsync(items[i], rule.chapterUrl, itemContext, true) || response.url;
                var volumeValue = await this.extractStringAsync(items[i], rule.isVolume, itemContext, false);
                if (title) chapters.push({ title: title, url: url, index: chapters.length, isVolume: /^(true|1|yes)$/i.test(volumeValue) });
            }
            if (onProgress) onProgress(chapters.length, page);
            var parsedNext = rule.nextTocUrl ? await this.extractAsync(body, rule.nextTocUrl, listContext, true) : '';
            if (Array.isArray(parsedNext)) parsedNext = parsedNext[0];
            nextUrl = resolveUrl(asString(parsedNext), response.url);
            page++;
        }
        var seen = new Set();
        return chapters.filter(function(chapter) {
            var key = chapter.title + '\n' + chapter.url;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map(function(chapter, index) { chapter.index = index; return chapter; });
    };

    function htmlToText(value) {
        var text = asString(value);
        if (!/[<>]/.test(text) || !root.DOMParser) return text;
        var doc = new root.DOMParser().parseFromString(text, 'text/html');
        Array.from(doc.querySelectorAll('br')).forEach(function(node) { node.replaceWith('\n'); });
        Array.from(doc.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6')).forEach(function(node) { node.append('\n'); });
        return (doc.body.textContent || '').replace(/\u00a0/g, ' ');
    }

    function applyReplaceRule(content, rule) {
        var output = content;
        asString(rule).split(/\r?\n/).filter(Boolean).forEach(function(line) {
            var parts = splitOutside(line, '##');
            try { output = output.replace(new RegExp(parts[0], 'g'), parts[1] || ''); } catch (e) { /* ignore invalid pattern */ }
        });
        return output;
    }

    BookSourceEngine.prototype.chapterContent = async function(source, book, chapter, options) {
        options = options || {};
        if (source.mainJs) {
            var jsContent = await this.callMainJs(source, 'getContent', [chapter, book, null], { book: book, chapter: chapter });
            return htmlToText(asString(jsContent)).trim();
        }
        var rule = source.ruleContent || {};
        var nextUrl = chapter.url;
        var visited = new Set();
        var parts = [];
        var page = 1;
        while (nextUrl && !visited.has(nextUrl) && page <= this.maxContentPages) {
            visited.add(nextUrl);
            var context = { source: source, book: book, chapter: chapter, page: page, baseUrl: nextUrl, signal: options.signal };
            var response = await this.fetch(nextUrl, context);
            var body = this.parseBody(response.body);
            var contentContext = Object.assign({}, context, { baseUrl: response.url, redirectUrl: response.url, result: body, src: body });
            var contentValue = rule.content ? await this.extractAsync(body, rule.content, contentContext, false) : '';
            var subContentValue = rule.subContent ? await this.extractAsync(body, rule.subContent, contentContext, false) : '';
            var content = Array.isArray(contentValue) ? contentValue.map(asString).join('\n') : asString(contentValue).trim();
            var subContent = Array.isArray(subContentValue) ? subContentValue.map(asString).join('\n') : asString(subContentValue).trim();
            content = htmlToText(content);
            if (subContent) content += '\n' + htmlToText(subContent);
            if (rule.replaceRegex) content = applyReplaceRule(content, rule.replaceRegex);
            if (content.trim()) parts.push(content.trim());
            var parsedNext = rule.nextContentUrl ? await this.extractAsync(body, rule.nextContentUrl, contentContext, true) : '';
            if (Array.isArray(parsedNext)) parsedNext = parsedNext[0];
            nextUrl = resolveUrl(asString(parsedNext), response.url);
            page++;
        }
        return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    BookSourceEngine.prototype.downloadBook = async function(source, book, chapters, options) {
        options = options || {};
        var self = this;
        var results = new Array(chapters.length);
        var cursor = 0;
        var completed = 0;
        var concurrency = Math.max(1, Math.min(Number(options.concurrency || 3), 6));
        async function worker() {
            while (cursor < chapters.length) {
                if (options.signal && options.signal.aborted) throw new Error('下载已取消');
                var index = cursor++;
                var chapter = chapters[index];
                try {
                    if (chapter.isVolume) {
                        results[index] = chapter.title;
                    } else {
                        var content = await self.chapterContent(source, book, chapter, { signal: options.signal });
                        results[index] = chapter.title + '\n\n' + (content || '[本章暂无可用正文]');
                    }
                } catch (error) {
                    if (!options.continueOnError) throw error;
                    results[index] = chapter.title + '\n\n[本章加载失败：' + (error.message || error) + ']';
                }
                completed++;
                if (options.onChapter) options.onChapter(index, results[index], chapter, completed, chapters.length);
                if (options.onProgress) options.onProgress(completed, chapters.length, chapter.title);
                // Legado sources may execute synchronous java.ajax calls. Yield
                // to the browser between chapters so progress updates paint
                // and the cancel button remains responsive during full-book
                // downloads.
                if (options.yieldToUi !== false) {
                    await new Promise(function(resolve) { setTimeout(resolve, 0); });
                }
            }
        }
        await Promise.all(Array.from({ length: Math.min(concurrency, chapters.length || 1) }, worker));
        return results.join('\n\n').trim();
    };

    BookSourceEngine.normalizeSource = normalizeSource;
    BookSourceEngine.parseLooseJson = parseLooseJson;
    BookSourceEngine.normalizeInlineBookUrl = normalizeInlineBookUrl;
    BookSourceEngine.decodeInlineDataUrl = decodeInlineDataUrl;
    BookSourceEngine.jsonPath = jsonPath;
    BookSourceEngine.resolveUrl = resolveUrl;
    BookSourceEngine.splitUrlOption = splitUrlOption;

    return {
        BookSourceEngine: BookSourceEngine,
        BookSourceImporter: BookSourceImporter,
        normalizeSource: normalizeSource,
        parseLooseJson: parseLooseJson,
        normalizeInlineBookUrl: normalizeInlineBookUrl,
        decodeInlineDataUrl: decodeInlineDataUrl,
        jsonPath: jsonPath,
        resolveUrl: resolveUrl,
        splitUrlOption: splitUrlOption
    };
});
