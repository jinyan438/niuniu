// 番茄风格段评功能
(function() {
    var NR = window.NovelReader;
    var initialized = false;

    function getFullApiUrl() {
        var url = NR.state.aiSettings.apiUrl || '';
        url = url.replace(/\/+$/, '');
        if (!url.endsWith('/chat/completions')) {
            url += '/chat/completions';
        }
        return url;
    }

    function getNodeElement(node) {
        return node && node.nodeType === 1 ? node : (node ? node.parentElement : null);
    }

    function closestParagraph(node) {
        var el = getNodeElement(node);
        while (el && el !== document.body) {
            if (el.matches && el.matches('p[data-original-index]')) return el;
            el = el.parentElement;
        }
        return null;
    }

    function getOriginalParagraphText(pIndex) {
        var paragraph = NR.state.originalParagraphs && NR.state.originalParagraphs[pIndex];
        if (!paragraph) return '';
        return (paragraph.textContent || '').replace(/\u00a0/g, ' ').trim();
    }

    function findChapterForParagraph(pIndex) {
        var chapters = NR.state.chapters || [];
        for (var i = chapters.length - 1; i >= 0; i--) {
            if (chapters[i].p_index <= pIndex) return chapters[i];
        }
        return { title: '正文', p_index: 0, chap_num: 1 };
    }

    function getChapterTextUntilParagraph(chapter, paragraphIndex) {
        var parts = [];
        var startIndex = Math.max(0, chapter.p_index || 0);
        for (var i = startIndex; i <= paragraphIndex; i++) {
            var text = getOriginalParagraphText(i);
            if (text) parts.push(text);
        }
        return parts.filter(function(part) { return part && part !== '\u00a0'; }).join('\n');
    }

    function simpleHash(text) {
        var hash = 0;
        text = text || '';
        for (var i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36);
    }

    function getParagraphInfoFromElement(paragraphEl) {
        if (!paragraphEl) return null;
        var pIndex = parseInt(paragraphEl.dataset.originalIndex, 10);
        if (isNaN(pIndex)) return null;

        var paragraphText = getOriginalParagraphText(pIndex);
        if (!paragraphText) return null;

        var chapter = findChapterForParagraph(pIndex);
        var chapterNumber = chapter.chap_num || 1;
        var threadId = [
            chapterNumber,
            pIndex,
            simpleHash(paragraphText)
        ].join('-');

        return {
            text: paragraphText,
            startIndex: pIndex,
            endIndex: pIndex,
            paragraphIndex: pIndex,
            chapterNumber: chapterNumber,
            chapterTitle: chapter.title || ('第' + chapterNumber + '章'),
            rangeDesc: (chapter.title || ('第' + chapterNumber + '章')) + ' · 第 ' + pIndex + ' 段',
            chapterTextBeforeSelection: getChapterTextUntilParagraph(chapter, pIndex),
            threadId: threadId,
            rect: paragraphEl.getBoundingClientRect(),
            paragraphElement: paragraphEl
        };
    }

    function clearNativeSelection() {
        try {
            var selection = window.getSelection();
            if (selection) selection.removeAllRanges();
        } catch (e) {
            console.warn('清理系统选区失败:', e);
        }
    }

    function chineseNumberToInt(value) {
        if (!value) return NaN;
        value = String(value).replace(/\s+/g, '').replace(/两/g, '二');
        if (/^\d+$/.test(value)) return parseInt(value, 10);

        var digits = { '零': 0, '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
        var units = { '十': 10, '百': 100, '千': 1000, '万': 10000 };
        var total = 0;
        var section = 0;
        var number = 0;

        for (var i = 0; i < value.length; i++) {
            var ch = value.charAt(i);
            if (digits.hasOwnProperty(ch)) {
                number = digits[ch];
            } else if (units[ch]) {
                var unit = units[ch];
                if (unit === 10000) {
                    section = (section + number) * unit;
                    total += section;
                    section = 0;
                } else {
                    section += (number || 1) * unit;
                }
                number = 0;
            }
        }
        return total + section + number;
    }

    function parseChapterBounds(text) {
        text = String(text || '').replace(/\s+/g, '');
        var match = text.match(/第([零〇一二三四五六七八九十百千万两\d]+)(?:[-~至到]([零〇一二三四五六七八九十百千万两\d]+))?章/);
        if (!match) return null;
        var start = chineseNumberToInt(match[1]);
        var end = match[2] ? chineseNumberToInt(match[2]) : start;
        if (isNaN(start)) return null;
        if (isNaN(end)) end = start;
        return { start: Math.min(start, end), end: Math.max(start, end) };
    }

    function getPreviousChapterSummaries(currentChapter) {
        var summaries = NR.state.currentBookData.summaries || [];
        return summaries.map(function(summary, index) {
            var bounds = parseChapterBounds(summary.range || '');
            if (!bounds) return null;
            return { summary: summary, bounds: bounds, index: index };
        }).filter(function(item) {
            return item && item.bounds.end < currentChapter;
        }).sort(function(a, b) {
            if (a.bounds.start !== b.bounds.start) return a.bounds.start - b.bounds.start;
            if (a.bounds.end !== b.bounds.end) return a.bounds.end - b.bounds.end;
            return (a.summary.timestamp || 0) - (b.summary.timestamp || 0);
        });
    }

    function getEntryRangeText(entry) {
        return (entry && (entry.lastUpdated || entry.range || entry.sourceRange)) || '';
    }

    function pickEntryForPreviousChapter(entries, previousChapter) {
        entries = (entries || []).filter(Boolean);
        if (!entries.length) return null;

        var ranged = [];
        var unranged = [];
        entries.forEach(function(entry) {
            var bounds = parseChapterBounds(getEntryRangeText(entry));
            if (bounds) {
                ranged.push({ entry: entry, bounds: bounds });
            } else {
                unranged.push(entry);
            }
        });

        var exact = ranged.filter(function(item) {
            return item.bounds.start <= previousChapter && item.bounds.end >= previousChapter;
        });
        if (exact.length > 0) {
            exact.sort(function(a, b) { return (b.entry.timestamp || 0) - (a.entry.timestamp || 0); });
            return exact[0].entry;
        }

        var before = ranged.filter(function(item) {
            return item.bounds.end <= previousChapter;
        });
        if (before.length > 0) {
            before.sort(function(a, b) {
                if (a.bounds.end !== b.bounds.end) return b.bounds.end - a.bounds.end;
                return (b.entry.timestamp || 0) - (a.entry.timestamp || 0);
            });
            return before[0].entry;
        }

        if (unranged.length > 0) {
            unranged.sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
            return unranged[0];
        }
        return null;
    }

    function unwrapData(record) {
        if (!record) return null;
        return record.data && typeof record.data === 'object' ? record.data : record;
    }

    function pickSingleData(key, historyKey, previousChapter) {
        var bookData = NR.state.currentBookData || {};
        var historyEntry = pickEntryForPreviousChapter(bookData[historyKey] || [], previousChapter);
        if (historyEntry) return historyEntry;

        var current = bookData[key];
        if (!current) return null;
        var bounds = parseChapterBounds(getEntryRangeText(current));
        if (!bounds || bounds.end <= previousChapter) return current;
        return null;
    }

    function pickListData(key, historyKey, previousChapter) {
        var bookData = NR.state.currentBookData || {};
        var historyEntry = pickEntryForPreviousChapter(bookData[historyKey] || [], previousChapter);
        if (historyEntry && Array.isArray(historyEntry.data)) {
            return historyEntry.data;
        }

        var currentList = bookData[key] || [];
        return currentList.filter(function(record) {
            var bounds = parseChapterBounds(getEntryRangeText(record));
            return !bounds || bounds.end <= previousChapter;
        });
    }

    function stringifyFieldValue(value) {
        if (value === null || value === undefined || value === '' || value === '-') return '';
        if (Array.isArray(value)) return value.join('、');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    function formatRecord(label, fields, record) {
        var data = unwrapData(record);
        if (!data) return '';
        var lines = [];
        (fields || []).forEach(function(field) {
            var value = stringifyFieldValue(data[field.key]);
            if (value) lines.push(field.label + '：' + value);
        });

        if (lines.length === 0) {
            Object.keys(data).forEach(function(key) {
                var value = stringifyFieldValue(data[key]);
                if (value) lines.push(key + '：' + value);
            });
        }
        if (lines.length === 0) return '';
        return '【' + label + '】\n' + lines.join('\n');
    }

    function formatList(label, fields, list) {
        list = list || [];
        if (!list.length) return '';
        var chunks = [];
        list.forEach(function(record, index) {
            var formatted = formatRecord(label + (index + 1), fields, record);
            if (formatted) chunks.push(formatted);
        });
        return chunks.join('\n\n');
    }

    function parseKeyValueText(text) {
        if (!text || text === '-') return [];
        return String(text).split(/[;；\n]+/).map(function(part) {
            var pieces = part.split(/[:：]/);
            if (pieces.length < 2) return null;
            return { key: pieces.shift().trim(), value: pieces.join('：').trim() };
        }).filter(function(item) { return item && item.key && item.value; });
    }

    function formatRelationships(protagonistRecord, npcRecords) {
        var lines = [];
        var protagonist = unwrapData(protagonistRecord);
        if (protagonist && protagonist.relationships) {
            parseKeyValueText(protagonist.relationships).forEach(function(rel) {
                lines.push((protagonist.name || '主角') + ' -> ' + rel.key + '：' + rel.value);
            });
        }

        (npcRecords || []).forEach(function(record) {
            var npc = unwrapData(record);
            if (!npc) return;
            if (npc.relationWithProtagonist && npc.relationWithProtagonist !== '-') {
                lines.push((npc.name || '重要人物') + ' -> 主角：' + npc.relationWithProtagonist);
            }
            if (npc.relationships) {
                parseKeyValueText(npc.relationships).forEach(function(rel) {
                    lines.push((npc.name || '重要人物') + ' -> ' + rel.key + '：' + rel.value);
                });
            }
        });

        return lines.length ? '【人物关系】\n' + lines.join('\n') : '';
    }

    function formatTimelineForPrompt(timeline) {
        if (NR.formatTimelineForDisplay) return NR.formatTimelineForDisplay(timeline);
        return JSON.stringify(timeline, null, 2);
    }

    function pickTimelineData(previousChapter) {
        var timelines = NR.state.currentBookData.timelines || [];
        var exact = [];
        var before = [];
        var unranged = [];

        timelines.forEach(function(item) {
            var bounds = parseChapterBounds(item.range || item.lastUpdated || '');
            if (!bounds) {
                unranged.push(item);
            } else if (bounds.start <= previousChapter && bounds.end >= previousChapter) {
                exact.push(item);
            } else if (bounds.end <= previousChapter) {
                before.push({ item: item, bounds: bounds });
            }
        });

        if (exact.length > 0) return exact.sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
        if (before.length > 0) {
            before.sort(function(a, b) {
                if (a.bounds.end !== b.bounds.end) return b.bounds.end - a.bounds.end;
                return (b.item.timestamp || 0) - (a.item.timestamp || 0);
            });
            return [before[0].item];
        }
        return unranged.slice(0, 1);
    }

    function buildPreviousChapterAiData(chapterNumber) {
        var previousChapter = chapterNumber - 1;
        if (previousChapter < 1) return '当前选区位于第1章，无上一章AI数据库数据。';

        NR.initCharacterFormData && NR.initCharacterFormData();

        var globalData = pickSingleData('globalData', 'globalDataHistory', previousChapter);
        var protagonist = pickSingleData('protagonistInfo', 'protagonistHistory', previousChapter);
        var npcs = pickListData('importantNPCs', 'npcHistory', previousChapter);
        var skills = pickListData('skills', 'skillsHistory', previousChapter);
        var items = pickListData('items', 'itemsHistory', previousChapter);
        var quests = pickListData('quests', 'questsHistory', previousChapter);
        var locations = pickListData('locations', 'locationsHistory', previousChapter);
        var equipments = pickListData('equipments', 'equipmentsHistory', previousChapter);
        var factions = pickListData('factions', 'factionsHistory', previousChapter);
        var intels = pickListData('intels', 'intelsHistory', previousChapter);
        var timelines = pickTimelineData(previousChapter);

        var parts = [];
        var globalText = formatRecord('全局数据', NR.GLOBAL_DATA_FIELDS, globalData);
        var protagonistText = formatRecord('主角信息', NR.PROTAGONIST_FIELDS, protagonist);
        var npcText = formatList('重要人物', NR.NPC_FIELDS, npcs);
        var skillText = formatList('技能', NR.SKILL_FIELDS, skills);
        var itemText = formatList('背包物品', NR.ITEM_FIELDS, items);
        var questText = formatList('任务事件', NR.QUEST_FIELDS, quests);
        var locationText = formatList('世界地点', NR.LOCATION_FIELDS, locations);
        var equipmentText = formatList('装备', NR.EQUIPMENT_FIELDS, equipments);
        var factionText = formatList('势力组织', NR.FACTION_FIELDS, factions);
        var intelText = formatList('重要情报', NR.INTEL_FIELDS, intels);
        var relationshipText = formatRelationships(protagonist, npcs);

        [globalText, protagonistText, npcText, skillText, itemText, questText, locationText, equipmentText, factionText, intelText, relationshipText].forEach(function(text) {
            if (text) parts.push(text);
        });

        if (timelines.length > 0) {
            parts.push('【剧情时间线】\n' + timelines.map(formatTimelineForPrompt).join('\n\n---\n\n'));
        }

        return parts.length ? parts.join('\n\n') : ('未找到第 ' + previousChapter + ' 章可用的AI数据库数据。');
    }

    function parseReaderPersonas(value) {
        if (Array.isArray(value)) {
            return value.map(function(item, index) {
                item = item || {};
                return {
                    name: String(item.name || ('读者' + (index + 1))).trim(),
                    prompt: String(item.prompt || '').trim()
                };
            }).filter(function(item) { return item.name || item.prompt; });
        }

        var text = String(value || NR.DEFAULT_READER_PERSONAS_TEXT || '').trim();
        if (!text) return [];
        return text.split(/\n+/).map(function(line, index) {
            line = line.trim();
            if (!line) return null;
            var parts = line.split(/[:：]/);
            var name;
            var prompt;
            if (parts.length > 1) {
                name = parts.shift().trim();
                prompt = parts.join('：').trim();
            } else {
                name = '读者' + (index + 1);
                prompt = line;
            }
            return { name: name || ('读者' + (index + 1)), prompt: prompt || line };
        }).filter(Boolean);
    }

    function getReaderPersonas() {
        return parseReaderPersonas(NR.state.aiSettings.readerPersonas || NR.DEFAULT_READER_PERSONAS_TEXT);
    }

    function buildPrompt(selectionInfo, personas) {
        var commentPrompt = NR.state.aiSettings.commentPrompt || NR.DEFAULT_AI_PROMPTS.COMMENT;
        var previousSummaries = getPreviousChapterSummaries(selectionInfo.chapterNumber);
        var summaryText = previousSummaries.length ? previousSummaries.map(function(item) {
            return '【' + (item.summary.range || ('第' + item.bounds.start + '章')) + '】\n' + (item.summary.text || '');
        }).join('\n\n') : '暂无选中片段前面章节的总结。';

        var personaText = personas.map(function(persona, index) {
            return (index + 1) + '. ' + persona.name + '：' + persona.prompt;
        }).join('\n');

        return [
            '【评论AI提示词】\n' + commentPrompt,
            '【不同读者人格提示词】\n' + personaText,
            '【选中小说片段】\n' + selectionInfo.text,
            '【选中片段前面所有章节总结（不含本章，按章节顺序）】\n' + summaryText,
            '【本章开头到选中片段为止的文本】\n' + selectionInfo.chapterTextBeforeSelection,
            '【选中片段前一章AI数据库数据】\n' + buildPreviousChapterAiData(selectionInfo.chapterNumber),
            '【最终输出要求】\n请为上面每个读者人格各生成1条评论，像番茄小说段评区一样自然。只输出JSON数组，不要Markdown代码块，不要解释。'
        ].join('\n\n---\n\n');
    }

    function normalizeCommentItem(item, personas, index) {
        var persona = item && (item.persona || item.name || item.reader);
        var comment = item && (item.comment || item.content || item.text);
        if (!comment && typeof item === 'string') comment = item;
        if (!persona && personas[index]) persona = personas[index].name;
        return {
            persona: persona || ('读者' + (index + 1)),
            text: String(comment || '').trim(),
            likes: Math.floor(18 + Math.random() * 860),
            replies: Math.floor(Math.random() * 36),
            timestamp: Date.now()
        };
    }

    function parseCommentResponse(rawText, personas) {
        var text = String(rawText || '').trim();
        text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
        var parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            var jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try { parsed = JSON.parse(jsonMatch[0]); } catch (ignored) {}
            }
        }

        if (parsed && parsed.comments && Array.isArray(parsed.comments)) parsed = parsed.comments;
        if (Array.isArray(parsed)) {
            return parsed.map(function(item, index) {
                return normalizeCommentItem(item, personas, index);
            }).filter(function(item) { return item.text; });
        }

        return text.split(/\n+/).map(function(line, index) {
            line = line.replace(/^\s*[-*\d.、]+/, '').trim();
            line = line.replace(/^["“]|["”]$/g, '').trim();
            return normalizeCommentItem(line, personas, index);
        }).filter(function(item) { return item.text; });
    }

    function ensureCommentsArray() {
        if (!NR.state.currentBookData.comments) NR.state.currentBookData.comments = [];
        return NR.state.currentBookData.comments;
    }

    function makeThread(selectionInfo) {
        return {
            id: selectionInfo.threadId,
            selectedText: selectionInfo.text,
            chapterNumber: selectionInfo.chapterNumber,
            chapterTitle: selectionInfo.chapterTitle,
            startIndex: selectionInfo.startIndex,
            endIndex: selectionInfo.endIndex,
            paragraphIndex: selectionInfo.paragraphIndex,
            rangeDesc: selectionInfo.rangeDesc,
            comments: [],
            timestamp: Date.now(),
            updatedAt: Date.now()
        };
    }

    function getThreadForSelection(selectionInfo) {
        var comments = ensureCommentsArray();
        for (var i = 0; i < comments.length; i++) {
            if (comments[i].id === selectionInfo.threadId) return comments[i];
        }
        for (var j = 0; j < comments.length; j++) {
            if (getThreadParagraphIndex(comments[j]) === selectionInfo.paragraphIndex) {
                return comments[j];
            }
        }
        return makeThread(selectionInfo);
    }

    function getThreadById(threadId) {
        var comments = ensureCommentsArray();
        for (var i = 0; i < comments.length; i++) {
            if (comments[i].id === threadId) return comments[i];
        }
        return null;
    }

    function saveThread(thread) {
        var comments = ensureCommentsArray();
        var index = comments.findIndex(function(item) { return item.id === thread.id; });
        thread.updatedAt = Date.now();
        if (index === -1) comments.push(thread);
        else comments[index] = thread;
        if (NR.refreshCommentMarkers) NR.refreshCommentMarkers();
        NR.saveBookData();
    }

    function renderComments(thread, statusText, isError) {
        var list = document.getElementById('reader-comment-list');
        if (!list) return;
        if (statusText) {
            list.innerHTML = '<div class="' + (isError ? 'reader-comment-error' : 'reader-comment-loading') + '">' + NR.escapeHtml(statusText) + '</div>';
            return;
        }

        if (!thread.comments || thread.comments.length === 0) {
            list.innerHTML = '<div class="reader-comment-empty">选中一个段落后点击生成，就会在这里出现番茄风格段评。</div>';
            return;
        }

        list.innerHTML = '';
        thread.comments.forEach(function(comment, index) {
            var item = document.createElement('div');
            item.className = 'reader-comment-item';
            var avatarText = (comment.persona || '读者').trim().charAt(0) || '读';
            var hot = index < 2 ? '<span class="reader-comment-hot">热评</span>' : '';
            item.innerHTML =
                '<div class="reader-comment-avatar">' + NR.escapeHtml(avatarText) + '</div>' +
                '<div class="reader-comment-main">' +
                    '<div class="reader-comment-meta">' +
                        '<span class="reader-comment-name">' + NR.escapeHtml(comment.persona || '读者') + '</span>' +
                        hot +
                        '<span class="reader-comment-time">刚刚</span>' +
                    '</div>' +
                    '<div class="reader-comment-text">' + NR.escapeHtml(comment.text || '') + '</div>' +
                    '<div class="reader-comment-actions">' +
                        '<span>♡ ' + (comment.likes || 0) + '</span>' +
                        '<span>回复 ' + (comment.replies || 0) + '</span>' +
                    '</div>' +
                '</div>';
            list.appendChild(item);
        });
    }

    function updateCommentSheet(thread, selectionInfo) {
        var quote = document.getElementById('comment-selected-text');
        var personaCount = document.getElementById('reader-comment-persona-count');
        var contextNote = document.getElementById('reader-comment-context-note');
        var personas = getReaderPersonas();
        if (quote) quote.textContent = '“' + selectionInfo.text + '”';
        if (personaCount) personaCount.textContent = personas.length + ' 位读者人格';
        if (contextNote) {
            contextNote.textContent = '上下文：前文总结 + 本章已读文本 + 上一章AI数据库';
        }
        renderComments(thread);
    }

    function showCommentSheet(autoGenerate) {
        var selectionInfo = NR.state.commentSelectionInfo;
        if (!selectionInfo) {
            alert('请先长按小说中的一个段落。');
            return;
        }
        NR.state.commentSelectionInfo = selectionInfo;
        NR.state.activeCommentThread = getThreadForSelection(selectionInfo);
        hideSelectionPopover();

        var modal = document.getElementById('reader-comment-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        updateCommentSheet(NR.state.activeCommentThread, selectionInfo);
        if (autoGenerate) generateReaderComments();
    }

    function generateReaderComments() {
        var selectionInfo = NR.state.commentSelectionInfo;
        var thread = NR.state.activeCommentThread;
        if (!selectionInfo || !thread) return;

        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('AI 功能需要配置后才能使用，请点击【设置】按钮进行配置。');
            return;
        }

        var button = document.getElementById('btn-generate-reader-comments');
        var personas = getReaderPersonas();
        var prompt = buildPrompt(selectionInfo, personas);
        thread.comments = [];
        thread.selectedText = selectionInfo.text;
        thread.paragraphIndex = selectionInfo.paragraphIndex;
        saveThread(thread);
        if (button) button.disabled = true;
        renderComments(thread, '正在生成番茄风格段评...');

        return NR.handleAddToShelf().then(function() {
            return fetch(getFullApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + NR.state.aiSettings.apiKey
                },
                body: JSON.stringify({
                    model: NR.state.aiSettings.modelName,
                    messages: [{ role: 'user', content: prompt }],
                    stream: false
                })
            });
        }).then(function(res) {
            if (!res.ok) {
                return res.text().then(function(errText) {
                    throw new Error('API 请求失败: ' + res.status + ' ' + res.statusText + '\n' + errText);
                });
            }
            return res.json();
        }).then(function(data) {
            var content = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
            var generated = parseCommentResponse(content, personas);
            if (!generated.length) throw new Error('AI 未返回有效评论。');
            thread.comments = generated;
            thread.selectedText = selectionInfo.text;
            thread.paragraphIndex = selectionInfo.paragraphIndex;
            thread.promptPreview = prompt.substring(0, 2000);
            saveThread(thread);
            renderComments(thread);
        }).catch(function(err) {
            console.error('生成段评失败:', err);
            renderComments(thread, '生成段评时出错：' + err.message, true);
        }).finally(function() {
            if (button) button.disabled = false;
        });
    }

    function hideSelectionPopover() {
        var popover = document.getElementById('comment-selection-popover');
        if (popover) popover.style.display = 'none';
        document.querySelectorAll('.comment-target-paragraph').forEach(function(p) {
            p.classList.remove('comment-target-paragraph');
        });
    }

    function positionSelectionPopover(info) {
        var popover = document.getElementById('comment-selection-popover');
        if (!popover || !info || !info.rect || !info.rect.width) return;
        popover.style.display = 'flex';

        var top = Math.max(8, info.rect.top - popover.offsetHeight - 10);
        var left = info.rect.left + info.rect.width / 2 - popover.offsetWidth / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - popover.offsetWidth - 8));
        popover.style.top = top + 'px';
        popover.style.left = left + 'px';
    }

    function setActiveParagraphInfo(paragraphEl) {
        var info = getParagraphInfoFromElement(paragraphEl);
        if (!info) return null;
        NR.state.commentSelectionInfo = info;
        clearNativeSelection();
        document.querySelectorAll('.comment-target-paragraph').forEach(function(p) {
            p.classList.remove('comment-target-paragraph');
        });
        paragraphEl.classList.add('comment-target-paragraph');
        positionSelectionPopover(info);
        return info;
    }

    function hasThreadComments(thread) {
        return thread && thread.comments && thread.comments.length > 0;
    }

    function getThreadParagraphIndex(thread) {
        if (!thread) return NaN;
        var index = thread.paragraphIndex;
        if (index === undefined || index === null) index = thread.startIndex;
        index = parseInt(index, 10);
        return isNaN(index) ? NaN : index;
    }

    function openThreadFromMarker(threadId, paragraphEl) {
        var thread = getThreadById(threadId);
        if (!thread) return;
        var selectionInfo = getParagraphInfoFromElement(paragraphEl);
        if (!selectionInfo) {
            selectionInfo = {
                text: thread.selectedText || '',
                startIndex: thread.startIndex,
                endIndex: thread.endIndex,
                paragraphIndex: getThreadParagraphIndex(thread),
                chapterNumber: thread.chapterNumber,
                chapterTitle: thread.chapterTitle || '',
                rangeDesc: thread.rangeDesc || '段评',
                chapterTextBeforeSelection: thread.selectedText || '',
                threadId: thread.id
            };
        }
        selectionInfo.threadId = thread.id;
        NR.state.commentSelectionInfo = selectionInfo;
        NR.state.activeCommentThread = thread;
        hideSelectionPopover();
        var modal = document.getElementById('reader-comment-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        updateCommentSheet(thread, selectionInfo);
    }

    NR.refreshCommentMarkers = function() {
        var pages = NR.state.allRenderedPages || [];
        pages.forEach(function(page) {
            page.querySelectorAll('.paragraph-comment-button').forEach(function(btn) {
                btn.remove();
            });
        });

        var threads = ensureCommentsArray().filter(hasThreadComments);
        if (!threads.length) return;

        pages.forEach(function(page) {
            page.querySelectorAll('p[data-original-index]:not(.blank-line)').forEach(function(paragraphEl) {
                var pIndex = parseInt(paragraphEl.dataset.originalIndex, 10);
                if (isNaN(pIndex)) return;
                var matchedThread = null;
                for (var i = 0; i < threads.length; i++) {
                    if (getThreadParagraphIndex(threads[i]) === pIndex) {
                        matchedThread = threads[i];
                        break;
                    }
                }
                if (!matchedThread) return;

                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'paragraph-comment-button';
                button.dataset.threadId = matchedThread.id;
                button.dataset.count = String((matchedThread.comments || []).length);
                button.setAttribute('aria-label', '查看段评');
                button.title = '查看段评';
                bindPressAction(button, function(e) {
                    var target = e.currentTarget || button;
                    openThreadFromMarker(target.dataset.threadId, target.closest('p[data-original-index]'));
                });
                paragraphEl.appendChild(button);
            });
        });
    };

    function closeCommentSheet() {
        var modal = document.getElementById('reader-comment-modal');
        if (modal) modal.style.display = 'none';
    }

    function bindPressAction(el, handler) {
        if (!el) return;
        var lastTouchAt = 0;
        el.addEventListener('touchend', function(e) {
            lastTouchAt = Date.now();
            e.preventDefault();
            e.stopPropagation();
            handler(e);
        }, { passive: false });
        el.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() - lastTouchAt < 450) return;
            handler(e);
        });
    }

    function getPoint(event) {
        var src = event.touches && event.touches.length ? event.touches[0] :
            (event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : event);
        return { x: src.clientX || 0, y: src.clientY || 0 };
    }

    function cancelParagraphPressTimer() {
        if (NR.state.commentLongPressTimer) {
            clearTimeout(NR.state.commentLongPressTimer);
            NR.state.commentLongPressTimer = null;
        }
    }

    function startParagraphPress(event) {
        if (NR.state.activeSubView !== 'original') return;
        if (event.target.closest && event.target.closest('.paragraph-comment-button, .comment-selection-popover, .modal')) return;
        var paragraphEl = event.target.closest && event.target.closest('p[data-original-index]:not(.blank-line)');
        if (!paragraphEl) return;

        cancelParagraphPressTimer();
        var startPoint = getPoint(event);
        NR.state.commentLongPressStart = startPoint;
        NR.state.commentLongPressParagraph = paragraphEl;
        NR.state.commentLongPressFired = false;

        NR.state.commentLongPressTimer = setTimeout(function() {
            NR.state.commentLongPressTimer = null;
            NR.state.commentLongPressFired = true;
            NR.state.ignoreNextClick = true;
            setActiveParagraphInfo(paragraphEl);
        }, 420);
    }

    function moveParagraphPress(event) {
        if (!NR.state.commentLongPressTimer || !NR.state.commentLongPressStart) return;
        var point = getPoint(event);
        var dx = Math.abs(point.x - NR.state.commentLongPressStart.x);
        var dy = Math.abs(point.y - NR.state.commentLongPressStart.y);
        if (dx > 12 || dy > 12) {
            cancelParagraphPressTimer();
        }
    }

    function endParagraphPress(event) {
        cancelParagraphPressTimer();
        if (NR.state.commentLongPressFired) {
            if (event.cancelable) event.preventDefault();
            event.stopPropagation();
            NR.state.commentLongPressFired = false;
        }
    }

    function handleSelectionPopoverOutsidePress(event) {
        var popover = document.getElementById('comment-selection-popover');
        if (!popover || popover.style.display === 'none') return;
        var target = event.target;
        if (target.closest && target.closest('.comment-selection-popover, .reader-comment-modal, .paragraph-comment-button')) return;
        var paragraphEl = target.closest && target.closest('p[data-original-index]:not(.blank-line)');
        if (!paragraphEl) hideSelectionPopover();
    }

    NR.initCommentFeature = function() {
        if (initialized) return;
        initialized = true;

        var popover = document.getElementById('comment-selection-popover');
        var openBtn = document.getElementById('btn-open-reader-comments');
        var generateBtn = document.getElementById('btn-generate-reader-comments');
        var closeBtn = document.getElementById('btn-close-reader-comments');
        var modal = document.getElementById('reader-comment-modal');

        if (popover) {
            ['touchstart', 'touchmove', 'mousedown', 'mousemove', 'click'].forEach(function(evt) {
                popover.addEventListener(evt, function(e) { e.stopPropagation(); }, { passive: evt !== 'touchstart' && evt !== 'touchmove' });
            });
        }
        bindPressAction(openBtn, function() { showCommentSheet(false); });
        bindPressAction(generateBtn, generateReaderComments);
        bindPressAction(closeBtn, closeCommentSheet);
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeCommentSheet();
            });
        }

        if (NR.els && NR.els['content-wrapper']) {
            NR.els['content-wrapper'].addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var paragraphEl = e.target.closest && e.target.closest('p[data-original-index]:not(.blank-line)');
                if (paragraphEl) {
                    NR.state.ignoreNextClick = true;
                    setActiveParagraphInfo(paragraphEl);
                }
                return false;
            }, true);
            NR.els['content-wrapper'].addEventListener('touchstart', startParagraphPress, { passive: true, capture: true });
            NR.els['content-wrapper'].addEventListener('mousedown', startParagraphPress, true);
            NR.els['content-wrapper'].addEventListener('touchmove', moveParagraphPress, { passive: true, capture: true });
            NR.els['content-wrapper'].addEventListener('mousemove', moveParagraphPress, true);
            NR.els['content-wrapper'].addEventListener('touchend', endParagraphPress, { passive: false, capture: true });
            NR.els['content-wrapper'].addEventListener('touchcancel', endParagraphPress, { passive: false, capture: true });
            NR.els['content-wrapper'].addEventListener('mouseup', endParagraphPress, true);
        }
        document.addEventListener('mousedown', handleSelectionPopoverOutsidePress);
        document.addEventListener('touchstart', handleSelectionPopoverOutsidePress, { passive: true });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideSelectionPopover();
                closeCommentSheet();
            }
        });
    };
})();
