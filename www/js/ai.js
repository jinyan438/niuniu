// AI 功能
(function() {
    var NR = window.NovelReader;

    // 获取完整的 API URL，自动补全 /chat/completions
    function getFullApiUrl() {
        var url = NR.state.aiSettings.apiUrl || '';
        url = url.replace(/\/+$/, ''); // 移除末尾斜杠
        if (!url.endsWith('/chat/completions')) {
            url += '/chat/completions';
        }
        return url;
    }

    NR.getSummary = function(text, rangeDesc, context) {
        context = context || '';
        return NR.handleAddToShelf().then(function() {
            var targetText = text.trim() ? text : context.trim();
            if (!targetText) {
                alert("没有内容可以总结。");
                return;
            }
            NR.els['summary-choice-modal'].style.display = "none";
            NR.els['summary-display-modal'].style.display = "flex";
            NR.els['summary-content'].textContent = "正在生成总结...";
            NR.els['btn-save-summary'].style.display = 'none';

            var len = NR.state.aiSettings.summaryLength || 150;
            var summaryInstruction = (NR.state.aiSettings.summaryPrompt || NR.DEFAULT_AI_PROMPTS.SUMMARY).replace('{len}', len);

            var prompt = text.trim() ?
                context + summaryInstruction + '\n\n---\n\n' + text :
                summaryInstruction + '\n\n---\n\n' + context;

            return fetch(getFullApiUrl(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: 'Bearer ' + NR.state.aiSettings.apiKey
                },
                body: JSON.stringify({
                    model: NR.state.aiSettings.modelName,
                    messages: [{ role: "user", content: prompt }],
                    stream: false
                })
            }).then(function(res) {
                if (!res.ok) {
                    return res.text().then(function(errText) {
                        throw new Error('API 请求失败: ' + res.status + ' ' + res.statusText + '\n' + errText);
                    });
                }
                return res.json();
            }).then(function(data) {
                var summary = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : null;
                if (summary) {
                    NR.els['summary-content'].textContent = summary.trim();
                    NR.state.tempSummaryHolder = { text: summary.trim(), range: rangeDesc };
                    NR.els['btn-save-summary'].style.display = 'block';
                } else {
                    throw new Error("API 返回数据格式不正确或内容为空。");
                }
            }).catch(function(err) {
                console.error("总结失败:", err);
                NR.els['summary-content'].textContent = '生成总结时出错: ' + err.message;
            });
        });
    };

    NR.saveCurrentSummary = function() {
        if (!NR.state.tempSummaryHolder.text) return;
        if (NR.state.currentBookData.summaries.some(function(s) { return s.text === NR.state.tempSummaryHolder.text; })) {
            alert("该总结已存在。");
            return;
        }
        NR.state.currentBookData.summaries.push({ text: NR.state.tempSummaryHolder.text, range: NR.state.tempSummaryHolder.range, timestamp: Date.now() });
        NR.saveBookData();
        alert("总结已保存。");
        NR.els['btn-save-summary'].style.display = 'none';
        NR.state.tempSummaryHolder = {};
    };

    NR.getTranslation = function(text, rangeDesc, context) {
        context = context || '';
        return NR.handleAddToShelf().then(function() {
            if (!text || text.trim().length === 0) {
                alert("没有内容可以翻译。");
                return;
            }
            NR.els['translation-choice-modal'].style.display = "none";
            NR.els['app-loader'].classList.remove("hidden");
            NR.els['app-loader'].querySelector("span").textContent = "正在翻译，请稍候...";

            var translationInstruction = NR.state.aiSettings.translationPrompt || NR.DEFAULT_AI_PROMPTS.TRANSLATION;
            var prompt = context + translationInstruction + '\n\n---\n\n' + text;

            return fetch(getFullApiUrl(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: 'Bearer ' + NR.state.aiSettings.apiKey
                },
                body: JSON.stringify({
                    model: NR.state.aiSettings.modelName,
                    messages: [{ role: "user", content: prompt }],
                    stream: false
                })
            }).then(function(res) {
                if (!res.ok) {
                    return res.text().then(function(errText) {
                        throw new Error('API 请求失败: ' + res.status + ' ' + res.statusText + '\n' + errText);
                    });
                }
                return res.json();
            }).then(function(data) {
                var translatedContent = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : null;
                if (translatedContent) {
                    NR.state.currentBookData.translations.push({
                        content: translatedContent.trim(),
                        sourceRange: rangeDesc,
                        timestamp: Date.now()
                    });
                    NR.saveBookData();
                    NR.state.originalContentForSubView = { name: NR.state.currentFileName, content: NR.state.currentFileContent };
                    NR.state.activeSubView = 'translation';
                    return NR.loadBook('【译】' + NR.state.originalContentForSubView.name, translatedContent.trim());
                } else {
                    throw new Error("API 返回数据格式不正确或内容为空。");
                }
            }).catch(function(e) {
                console.error("翻译失败:", e);
                alert('生成译文时出错: ' + e.message);
            }).finally(function() {
                NR.els['app-loader'].classList.add("hidden");
                NR.els['app-loader'].querySelector("span").textContent = "正在加载...";
            });
        });
    };

    NR.getSequel = function(text, rangeDesc) {
        return NR.handleAddToShelf().then(function() {
            var selectedContexts = Array.from(NR.els['sequel-summary-context-list'].querySelectorAll('input[type="checkbox"]:checked'));
            var context = '';
            if (selectedContexts.length > 0) {
                // 按勾选顺序排序
                var sortedContexts = selectedContexts.slice().sort(function(a, b) {
                    var keyA = a.dataset.contextType + '_' + a.dataset.contextIndex;
                    var keyB = b.dataset.contextType + '_' + b.dataset.contextIndex;
                    var orderA = NR.state.contextCheckOrder.indexOf(keyA);
                    var orderB = NR.state.contextCheckOrder.indexOf(keyB);
                    if (orderA === -1) orderA = Infinity;
                    if (orderB === -1) orderB = Infinity;
                    return orderA - orderB;
                });
                
                var summaries = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Summary'; }).map(function(cb) { return cb.value; });
                var sequels = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Sequel'; }).map(function(cb) { return cb.value; });
                var translations = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Translation'; }).map(function(cb) { return cb.value; });

                var contextParts = [];
                if (summaries.length > 0) contextParts.push('请参考以下故事背景/摘要：\n' + summaries.join('\n---\n'));
                if (sequels.length > 0) contextParts.push('请参考以下已有续写内容：\n' + sequels.join('\n---\n'));
                if (translations.length > 0) contextParts.push('请参考以下相关译文：\n' + translations.join('\n---\n'));
                context = contextParts.join('\n\n') + '\n\n---\n\n';
            }

            if ((!text || text.trim().length === 0) && selectedContexts.length === 0) {
                if (!confirm("您没有选择任何原文或参考上下文，确定要让 AI 从零开始自由创作吗？")) {
                    return;
                }
            }

            NR.els['sequel-choice-modal'].style.display = "none";
            NR.els['app-loader'].classList.remove('hidden');
            NR.els['app-loader'].querySelector('span').textContent = "AI 正在创作续写...";

            var sequelInstruction = NR.state.aiSettings.sequelPrompt || NR.DEFAULT_AI_PROMPTS.SEQUEL;
            var finalInstruction;
            if (text && text.trim()) {
                finalInstruction = '请接着以下内容写：\n\n' + text.trim();
            } else if (context) {
                finalInstruction = '请基于以上参考信息进行创作。';
            } else {
                finalInstruction = '请直接创作一个全新的故事。';
            }
            var prompt = sequelInstruction + '\n\n' + context + finalInstruction;

            return fetch(getFullApiUrl(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: 'Bearer ' + NR.state.aiSettings.apiKey
                },
                body: JSON.stringify({
                    model: NR.state.aiSettings.modelName,
                    messages: [{ role: "user", content: prompt }],
                    stream: false
                })
            }).then(function(res) {
                if (!res.ok) {
                    return res.text().then(function(errText) {
                        throw new Error('API 请求失败: ' + res.status + ' ' + res.statusText + '\n' + errText);
                    });
                }
                return res.json();
            }).then(function(data) {
                var sequelContent = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : null;
                if (sequelContent) {
                    NR.state.currentBookData.sequels.push({
                        content: sequelContent.trim(),
                        sourceRange: rangeDesc,
                        timestamp: Date.now()
                    });
                    NR.saveBookData();
                    NR.state.originalContentForSubView = { name: NR.state.currentFileName, content: NR.state.currentFileContent };
                    NR.state.activeSubView = 'sequel';
                    return NR.loadBook('【续】' + NR.state.originalContentForSubView.name, sequelContent.trim());
                } else {
                    throw new Error("API 返回数据格式不正确或内容为空。");
                }
            }).catch(function(err) {
                console.error("续写失败:", err);
                alert('生成续写时出错: ' + err.message);
            }).finally(function() {
                NR.els['app-loader'].classList.add("hidden");
                NR.els['app-loader'].querySelector("span").textContent = "正在加载...";
            });
        });
    };

    // 带上下文参数的续写函数（用于AI数据库标签页）
    NR.getSequelWithContext = function(text, rangeDesc, context) {
        context = context || '';
        return NR.handleAddToShelf().then(function() {
            NR.els['app-loader'].classList.remove('hidden');
            NR.els['app-loader'].querySelector('span').textContent = "AI 正在创作续写...";

            var sequelInstruction = NR.state.aiSettings.sequelPrompt || NR.DEFAULT_AI_PROMPTS.SEQUEL;
            var finalInstruction;
            if (text && text.trim()) {
                finalInstruction = '请接着以下内容写：\n\n' + text.trim();
            } else if (context) {
                finalInstruction = '请基于以上参考信息进行创作。';
            } else {
                finalInstruction = '请直接创作一个全新的故事。';
            }
            var prompt = sequelInstruction + '\n\n' + context + finalInstruction;

            return fetch(getFullApiUrl(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: 'Bearer ' + NR.state.aiSettings.apiKey
                },
                body: JSON.stringify({
                    model: NR.state.aiSettings.modelName,
                    messages: [{ role: "user", content: prompt }],
                    stream: false
                })
            }).then(function(res) {
                if (!res.ok) {
                    return res.text().then(function(errText) {
                        throw new Error('API 请求失败: ' + res.status + ' ' + res.statusText + '\n' + errText);
                    });
                }
                return res.json();
            }).then(function(data) {
                var sequelContent = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : null;
                if (sequelContent) {
                    NR.state.currentBookData.sequels.push({
                        content: sequelContent.trim(),
                        sourceRange: rangeDesc,
                        timestamp: Date.now()
                    });
                    NR.saveBookData();
                    NR.state.originalContentForSubView = { name: NR.state.currentFileName, content: NR.state.currentFileContent };
                    NR.state.activeSubView = 'sequel';
                    return NR.loadBook('【续】' + NR.state.originalContentForSubView.name, sequelContent.trim());
                } else {
                    throw new Error("API 返回数据格式不正确或内容为空。");
                }
            }).catch(function(err) {
                console.error("续写失败:", err);
                alert('生成续写时出错: ' + err.message);
            }).finally(function() {
                NR.els['app-loader'].classList.add("hidden");
                NR.els['app-loader'].querySelector("span").textContent = "正在加载...";
            });
        });
    };

    // 生成行动选项
    NR.generateActionOptions = function(context) {
        context = context || '';
        return NR.handleAddToShelf().then(function() {
            NR.els['app-loader'].classList.remove('hidden');
            NR.els['app-loader'].querySelector('span').textContent = "正在生成行动选项...";

            var actionPrompt = NR.DEFAULT_AI_PROMPTS.ACTION_OPTIONS;
            var prompt = actionPrompt + '\n\n【当前故事背景】\n' + context;

            return fetch(getFullApiUrl(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: 'Bearer ' + NR.state.aiSettings.apiKey
                },
                body: JSON.stringify({
                    model: NR.state.aiSettings.modelName,
                    messages: [{ role: "user", content: prompt }],
                    stream: false
                })
            }).then(function(res) {
                if (!res.ok) {
                    return res.text().then(function(errText) {
                        throw new Error('API 请求失败: ' + res.status + ' ' + res.statusText + '\n' + errText);
                    });
                }
                return res.json();
            }).then(function(data) {
                var content = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : null;
                if (content) {
                    // 解析行动选项
                    var options = NR.parseActionOptions(content.trim());
                    return options;
                } else {
                    throw new Error("API 返回数据格式不正确或内容为空。");
                }
            }).catch(function(err) {
                console.error("生成行动选项失败:", err);
                alert('生成行动选项时出错: ' + err.message);
                return [];
            }).finally(function() {
                NR.els['app-loader'].classList.add("hidden");
                NR.els['app-loader'].querySelector("span").textContent = "正在加载...";
            });
        });
    };

    // 解析行动选项文本
    NR.parseActionOptions = function(text) {
        var options = [];
        var lines = text.split('\n').filter(function(line) { return line.trim(); });
        lines.forEach(function(line) {
            // 匹配 "1. xxx" 或 "选项1：xxx" 等格式
            var match = line.match(/^(?:\d+[\.\、\:]|选项\d+[\:\：])\s*(.+)$/);
            if (match) {
                options.push(match[1].trim());
            } else if (line.trim() && !line.match(/^[\[\【]/)) {
                // 如果没有匹配到格式但有内容，也加入
                options.push(line.trim());
            }
        });
        return options.slice(0, 4); // 最多4个选项
    };

    // 根据行动选项生成续写
    NR.executeActionOption = function(action, context) {
        context = context || '';
        return NR.handleAddToShelf().then(function() {
            NR.els['app-loader'].classList.remove('hidden');
            NR.els['app-loader'].querySelector('span').textContent = "AI 正在创作续写...";

            var sequelInstruction = NR.state.aiSettings.sequelPrompt || NR.DEFAULT_AI_PROMPTS.SEQUEL;
            var prompt = sequelInstruction + '\n\n' + context + '\n\n【主角的行动】\n' + action + '\n\n请根据主角的这个行动，继续写下去：';

            return fetch(getFullApiUrl(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: 'Bearer ' + NR.state.aiSettings.apiKey
                },
                body: JSON.stringify({
                    model: NR.state.aiSettings.modelName,
                    messages: [{ role: "user", content: prompt }],
                    stream: false
                })
            }).then(function(res) {
                if (!res.ok) {
                    return res.text().then(function(errText) {
                        throw new Error('API 请求失败: ' + res.status + ' ' + res.statusText + '\n' + errText);
                    });
                }
                return res.json();
            }).then(function(data) {
                var sequelContent = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : null;
                if (sequelContent) {
                    NR.state.currentBookData.sequels.push({
                        content: sequelContent.trim(),
                        sourceRange: '行动: ' + action.substring(0, 20) + '...',
                        timestamp: Date.now()
                    });
                    NR.saveBookData();
                    NR.state.originalContentForSubView = { name: NR.state.currentFileName, content: NR.state.currentFileContent };
                    NR.state.activeSubView = 'sequel';
                    return NR.loadBook('【续】' + NR.state.originalContentForSubView.name, sequelContent.trim());
                } else {
                    throw new Error("API 返回数据格式不正确或内容为空。");
                }
            }).catch(function(err) {
                console.error("续写失败:", err);
                alert('生成续写时出错: ' + err.message);
            }).finally(function() {
                NR.els['app-loader'].classList.add("hidden");
                NR.els['app-loader'].querySelector("span").textContent = "正在加载...";
            });
        });
    };

    // 生成人物图片提示词
    NR.generateCharacterImagePrompt = function(characterName) {
        var profile = NR.state.currentBookData.characterProfiles.find(function(p) { return p.name === characterName; });
        if (!profile) {
            alert('未找到该人物信息');
            return Promise.reject('未找到人物');
        }

        // 检查生图服务配置
        var provider = NR.state.aiSettings.imageProvider || 'comfyui';
        if (provider === 'comfyui') {
            var comfyuiUrl = NR.state.aiSettings.comfyuiApiUrl;
            if (!comfyuiUrl) {
                alert('请先在AI设置中配置ComfyUI API地址');
                return Promise.reject('未配置ComfyUI');
            }
        } else if (provider === 'nanobananapro') {
            var nanoBananaProApiKey = NR.state.aiSettings.nanoBananaProApiKey;
            if (!nanoBananaProApiKey) {
                alert('请先在AI设置中配置Nano Banana Pro API Key');
                return Promise.reject('未配置Nano Banana Pro');
            }
        }

        var promptTemplate = NR.DEFAULT_AI_PROMPTS.CHARACTER_IMAGE_PROMPT;
        // 根据生图服务选择不同的提示词模板
        if (provider === 'nanobananapro') {
            // Nano Banana Pro/Gemini 使用中文自然语言提示词
            promptTemplate = NR.DEFAULT_AI_PROMPTS.CHARACTER_IMAGE_PROMPT_GEMINI;
        }
        var prompt = promptTemplate
            .replace('{identity}', profile.data['身份'] || '-')
            .replace('{gender}', profile.data['性别'] || '-')
            .replace('{race}', profile.data['种族'] || '-')
            .replace('{age}', profile.data['年龄'] || '-')
            .replace('{appearance}', profile.data['外貌'] || '-')
            .replace('{clothing}', profile.data['衣着'] || '-')
            .replace('{location}', profile.data['地点'] || '-')
            .replace('{ability}', profile.data['能力'] || '-');

        // 显示加载状态
        NR.els['app-loader'].classList.remove('hidden');
        NR.els['app-loader'].querySelector('span').textContent = '正在生成提示词...';

        return fetch(getFullApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + NR.state.aiSettings.apiKey
            },
            body: JSON.stringify({
                model: NR.state.aiSettings.modelName,
                messages: [{ role: 'user', content: prompt }],
                stream: false
            })
        }).then(function(res) {
            if (!res.ok) {
                return res.text().then(function(errText) {
                    throw new Error('API 请求失败: ' + res.status + ' ' + errText);
                });
            }
            return res.json();
        }).then(function(data) {
            var imagePrompt = (data.choices && data.choices[0] && data.choices[0].message) 
                ? data.choices[0].message.content.trim() : null;
            if (!imagePrompt) {
                throw new Error('AI未返回有效的提示词');
            }
            return imagePrompt;
        });
    };

    // 调用ComfyUI生成图片 - 第一步：生成提示词并显示确认弹窗
    NR.generateCharacterImage = function(characterName) {
        NR.generateCharacterImagePrompt(characterName).then(function(imagePrompt) {
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
            
            // 显示提示词确认弹窗
            NR.showImagePromptConfirmModal(characterName, imagePrompt);
        }).catch(function(err) {
            console.error('生成提示词失败:', err);
            alert('生成提示词失败: ' + err.message);
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
        });
    };

    // 显示提示词确认弹窗
    NR.showImagePromptConfirmModal = function(characterName, imagePrompt) {
        // 移除已存在的弹窗
        var existingModal = document.getElementById('image-prompt-confirm-modal');
        if (existingModal) existingModal.remove();

        var modalHtml = 
            '<div id="image-prompt-confirm-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>确认生图提示词</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div style="padding: 10px 0;">' +
                        '<p style="margin-bottom: 10px; opacity: 0.8;">以下是AI生成的绘画提示词，你可以编辑后再发送：</p>' +
                        '<textarea id="image-prompt-textarea" style="width: 100%; height: 150px; resize: vertical; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--highlight-bg); color: var(--text-color); font-size: 14px;">' + NR.escapeHtml(imagePrompt) + '</textarea>' +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-cancel-image-gen" class="control-button">取消</button>' +
                        '<button id="btn-confirm-image-gen" class="control-button" style="background: var(--accent-color);">发送生成</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('image-prompt-confirm-modal');
        var closeBtn = modal.querySelector('.close-button');
        var cancelBtn = document.getElementById('btn-cancel-image-gen');
        var confirmBtn = document.getElementById('btn-confirm-image-gen');
        var textarea = document.getElementById('image-prompt-textarea');

        var closeModal = function() {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });

        confirmBtn.addEventListener('click', function() {
            var finalPrompt = textarea.value.trim();
            if (!finalPrompt) {
                alert('提示词不能为空');
                return;
            }
            closeModal();
            // 根据选择的生图服务调用不同的API
            if (NR.state.aiSettings.imageProvider === 'nanobananapro') {
                NR.sendCharacterImageToNanoBananaPro(characterName, finalPrompt);
            } else {
                NR.sendToComfyUI(characterName, finalPrompt);
            }
        });
    };

    // 合并人物卡片
    NR.mergeCharacterProfiles = function(characterNames) {
        if (!characterNames || characterNames.length < 2) {
            alert('请至少选择2个人物进行合并');
            return Promise.reject('选择人物数量不足');
        }

        // 获取选中的人物信息
        var profilesToMerge = characterNames.map(function(name) {
            return NR.state.currentBookData.characterProfiles.find(function(p) { return p.name === name; });
        }).filter(function(p) { return p; });

        if (profilesToMerge.length < 2) {
            alert('未找到足够的人物信息');
            return Promise.reject('人物信息不足');
        }

        // 构建合并提示词 - 动态使用当前定义的字段
        var profilesText = profilesToMerge.map(function(p, idx) {
            return '人物' + (idx + 1) + ' - ' + p.name + ':\n' + JSON.stringify(p.data, null, 2);
        }).join('\n\n');

        // 动态获取当前字段列表
        var fields = NR.CHARACTER_FIELDS || {};
        var baseFields = (fields.baseFieldsWithName || ["姓名"]).join('", "');
        var extendedFields = (fields.extendedFields || []).join('", "');
        var keyValueFields = (fields.keyValueFields || []).join('、');
        
        // 动态生成提示词
        var prompt = '你是一个细致的文学分析师。用户认为以下多个人物卡片实际上是同一个人物（可能是同一人物的不同称呼、昵称、别名等）。请将这些人物卡片的信息合并为一个完整的人物信息表。\n\n' +
            '合并规则：\n' +
            '1. 选择最完整、最正式的名字作为主要姓名\n' +
            '2. 对于每个字段，优先保留有实际内容的信息（非"-"的内容）\n' +
            '3. 如果多个卡片对同一字段有不同的有效信息，请智能合并（如外貌描述可以组合，人际关系可以合并）\n' +
            (keyValueFields ? '4. "' + keyValueFields + '"字段使用"键:值"格式，多个用分号分隔，如"力量:50;敏捷:60"\n' : '') +
            '5. 输出一个JSON对象，必须包含以下所有字段:\n' +
            '   基础字段: "' + baseFields + '"\n' +
            (extendedFields ? '   扩展字段: "' + extendedFields + '"\n' : '') +
            '6. 如果原卡片中没有某个字段的信息，该字段填"-"\n' +
            '7. 直接输出JSON对象，不要包含任何额外文字\n\n' +
            '以下是需要合并的人物卡片：\n---\n' + profilesText + '\n---\n';

        NR.els['app-loader'].classList.remove('hidden');
        NR.els['app-loader'].querySelector('span').textContent = '正在合并人物信息...';

        return fetch(getFullApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + NR.state.aiSettings.apiKey
            },
            body: JSON.stringify({
                model: NR.state.aiSettings.modelName,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                response_format: { type: 'json_object' }
            })
        }).then(function(res) {
            if (!res.ok) {
                return res.text().then(function(errText) {
                    throw new Error('API 请求失败: ' + res.status + ' ' + errText);
                });
            }
            return res.json();
        }).then(function(data) {
            var aiResponseContent = data.choices[0].message.content;
            var mergedProfile;
            try {
                mergedProfile = JSON.parse(aiResponseContent);
            } catch (e) {
                var jsonMatch = aiResponseContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    mergedProfile = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('AI未能返回有效的JSON格式');
                }
            }

            if (!mergedProfile || !mergedProfile.姓名) {
                throw new Error('合并结果缺少姓名字段');
            }

            // 收集所有别名（除了主要姓名外的其他名字，以及原有人物的别名）
            var primaryName = mergedProfile.姓名;
            var aliases = [];
            
            // 添加被合并人物的名字（除了主要姓名）
            characterNames.forEach(function(name) {
                if (name !== primaryName && aliases.indexOf(name) === -1) {
                    aliases.push(name);
                }
            });
            
            // 添加原有人物的别名
            profilesToMerge.forEach(function(p) {
                if (p.aliases && p.aliases.length > 0) {
                    p.aliases.forEach(function(alias) {
                        if (alias !== primaryName && aliases.indexOf(alias) === -1) {
                            aliases.push(alias);
                        }
                    });
                }
            });

            // 保留原有人物的一些属性
            var isProtagonist = profilesToMerge.some(function(p) { return p.isProtagonist; });
            var isImportant = profilesToMerge.some(function(p) { return p.isImportant; });
            // 保留第一个有封面图片的人物的封面
            var coverProfile = profilesToMerge.find(function(p) { return p.cover; });

            // 创建合并后的人物对象
            var newProfile = {
                name: primaryName,
                data: mergedProfile,
                aliases: aliases,
                isProtagonist: isProtagonist,
                isImportant: isImportant,
                cover: coverProfile ? coverProfile.cover : null,
                lastUpdated: '合并自: ' + characterNames.join(', ')
            };

            // 删除原有的人物卡片
            NR.state.currentBookData.characterProfiles = NR.state.currentBookData.characterProfiles.filter(function(p) {
                return characterNames.indexOf(p.name) === -1;
            });

            // 添加合并后的人物
            NR.state.currentBookData.characterProfiles.push(newProfile);
            NR.saveBookData();

            return newProfile;
        }).finally(function() {
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
        });
    };

    // 获取人物的所有名称（包括别名）
    NR.getCharacterAllNames = function(characterName) {
        var profile = NR.state.currentBookData.characterProfiles.find(function(p) { 
            return p.name === characterName || (p.aliases && p.aliases.indexOf(characterName) !== -1);
        });
        if (!profile) return [characterName];
        var names = [profile.name];
        if (profile.aliases && profile.aliases.length > 0) {
            names = names.concat(profile.aliases);
        }
        return names;
    };

    // 根据名称查找人物（支持别名查找）
    NR.findCharacterByName = function(name) {
        return NR.state.currentBookData.characterProfiles.find(function(p) {
            return p.name === name || (p.aliases && p.aliases.indexOf(name) !== -1);
        });
    };

    // 发送提示词到ComfyUI生成图片（带重试）
    NR.sendToComfyUI = function(characterName, imagePrompt, retryCount) {
        retryCount = retryCount || 0;
        var maxRetries = 2;
        
        NR.els['app-loader'].classList.remove('hidden');
        var statusText = retryCount > 0 ? '正在重试 (' + retryCount + '/' + maxRetries + ')...' : '正在生成图片...';
        NR.els['app-loader'].querySelector('span').textContent = statusText;

        var comfyuiUrl = NR.state.aiSettings.comfyuiApiUrl.replace(/\/+$/, '');
        var apiUrl = comfyuiUrl + '/api/generate';

        var requestBody = {
            prompt: imagePrompt,
            negative_prompt: 'lowres, worst quality, bad quality, bad anatomy, sketch, jpeg artifacts, signature, watermark, censored',
            width: 512,
            height: 768,
            quality: 75,
            max_size: 400
        };

        // 设置超时
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 180000); // 3分钟超时

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        }).then(function(res) {
            clearTimeout(timeoutId);
            if (!res.ok) {
                return res.text().then(function(errText) {
                    throw new Error('服务器返回错误: ' + res.status);
                });
            }
            return res.json();
        }).then(function(data) {
            if (data.status === 'success' && data.image) {
                var profile = NR.state.currentBookData.characterProfiles.find(function(p) { return p.name === characterName; });
                if (profile) {
                    profile.cover = data.image;
                    profile.originalCover = data.image; // 保存原图用于后续裁剪
                    NR.saveBookData();
                    NR.renderCharacterHistory();
                    var detailModal = document.getElementById('character-detail-modal');
                    if (detailModal) {
                        var avatar = detailModal.querySelector('.character-detail-avatar');
                        if (avatar) {
                            avatar.style.backgroundImage = 'url(' + data.image + ')';
                            avatar.style.backgroundSize = 'cover';
                            avatar.textContent = '';
                        }
                    }
                    alert('人物封面生成成功！');
                }
                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
            } else {
                throw new Error(data.message || '图片生成失败');
            }
        }).catch(function(err) {
            clearTimeout(timeoutId);
            console.error('ComfyUI请求错误:', err);
            
            // 判断是否需要重试
            var isNetworkError = err.name === 'AbortError' || err.message === 'Failed to fetch' || err.message.indexOf('network') !== -1;
            
            if (isNetworkError && retryCount < maxRetries) {
                // 网络错误，自动重试
                setTimeout(function() {
                    NR.sendToComfyUI(characterName, imagePrompt, retryCount + 1);
                }, 2000); // 2秒后重试
            } else {
                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
                
                var errorMsg = '生成失败: ';
                if (err.name === 'AbortError') {
                    errorMsg += '请求超时，请检查网络连接';
                } else if (err.message === 'Failed to fetch') {
                    errorMsg += '无法连接服务器\n\n请检查：\n1. 中转服务器是否运行\n2. 网络穿透是否正常\n3. 地址是否正确: ' + comfyuiUrl;
                } else {
                    errorMsg += err.message;
                }
                alert(errorMsg);
            }
        });
    };

    // Gemini官方API基础URL
    var GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com';

    // 从Gemini响应中提取base64图片
    function extractBase64ImageFromGemini(payload) {
        var parts = payload && payload.candidates && payload.candidates[0] && payload.candidates[0].content && payload.candidates[0].content.parts;
        if (!Array.isArray(parts)) return null;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            var inlineData = part.inline_data || part.inlineData;
            if (inlineData && inlineData.data) {
                return {
                    base64: inlineData.data,
                    mimeType: inlineData.mime_type || inlineData.mimeType || 'image/png'
                };
            }
        }
        return null;
    }

    // 内部函数：发送Gemini生图请求（支持回退）
    function sendGeminiImageRequest(url, requestBody, onSuccess, onError) {
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 300000); // 5分钟超时

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        }).then(function(res) {
            clearTimeout(timeoutId);
            if (!res.ok) {
                return res.json().then(function(errData) {
                    throw new Error(errData.error && errData.error.message || '请求失败: ' + res.status);
                });
            }
            return res.json();
        }).then(function(data) {
            console.log('Gemini API 响应:', JSON.stringify(data).substring(0, 500));
            var extracted = extractBase64ImageFromGemini(data);
            if (!extracted) {
                // 如果有 imageConfig，尝试移除后重试
                if (requestBody.generationConfig && requestBody.generationConfig.imageConfig) {
                    console.log('未解析到图片，尝试移除 imageConfig 重试...');
                    var fallbackBody = JSON.parse(JSON.stringify(requestBody));
                    delete fallbackBody.generationConfig.imageConfig;
                    
                    var controller2 = new AbortController();
                    var timeoutId2 = setTimeout(function() { controller2.abort(); }, 300000);
                    
                    fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(fallbackBody),
                        signal: controller2.signal
                    }).then(function(res2) {
                        clearTimeout(timeoutId2);
                        if (!res2.ok) {
                            return res2.json().then(function(errData2) {
                                throw new Error(errData2.error && errData2.error.message || '请求失败: ' + res2.status);
                            });
                        }
                        return res2.json();
                    }).then(function(data2) {
                        console.log('Gemini API 回退响应:', JSON.stringify(data2).substring(0, 500));
                        var extracted2 = extractBase64ImageFromGemini(data2);
                        if (!extracted2) {
                            throw new Error('未从响应中解析到图片数据（回退请求也失败）');
                        }
                        onSuccess(extracted2);
                    }).catch(function(err2) {
                        clearTimeout(timeoutId2);
                        onError(err2);
                    });
                    return;
                }
                throw new Error('未从响应中解析到图片数据');
            }
            onSuccess(extracted);
        }).catch(function(err) {
            clearTimeout(timeoutId);
            onError(err);
        });
    }

    // 发送人物封面到 Nano Banana Pro (使用Gemini官方API)
    NR.sendCharacterImageToNanoBananaPro = function(characterName, imagePrompt) {
        NR.els['app-loader'].classList.remove('hidden');
        NR.els['app-loader'].querySelector('span').textContent = '正在生成图片...';

        var apiKey = NR.state.aiSettings.nanoBananaProApiKey;
        if (!apiKey) {
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
            alert('请先在AI设置中配置Nano Banana Pro API Key');
            return;
        }

        var model = NR.state.aiSettings.nanoBananaProModel || 'gemini-2.0-flash-preview-image-generation';
        var url = GEMINI_API_BASE_URL + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);

        var requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: imagePrompt }]
                }
            ],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: '3:4',  // 人物肖像使用竖向比例
                    imageSize: '2K'
                }
            }
        };

        sendGeminiImageRequest(url, requestBody, function(extracted) {
            // 成功回调
            var imageDataUrl = 'data:' + extracted.mimeType + ';base64,' + extracted.base64;

            // 保存到人物卡片
            var profile = NR.state.currentBookData.characterProfiles.find(function(p) { return p.name === characterName; });
            if (profile) {
                profile.cover = imageDataUrl;
                profile.originalCover = imageDataUrl; // 保存原图用于后续裁剪
                NR.saveBookData();
                NR.renderCharacterHistory();
                var detailModal = document.getElementById('character-detail-modal');
                if (detailModal) {
                    var avatar = detailModal.querySelector('.character-detail-avatar');
                    if (avatar) {
                        avatar.style.backgroundImage = 'url(' + imageDataUrl + ')';
                        avatar.style.backgroundSize = 'cover';
                        avatar.textContent = '';
                    }
                }
                alert('人物封面生成成功！');
            }

            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
        }, function(err) {
            // 错误回调
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
            console.error('Nano Banana Pro 请求错误:', err);
            var errorMsg = err.message || String(err);
            if (err.name === 'AbortError') {
                errorMsg = '请求超时（5分钟），请检查网络连接';
            } else if (errorMsg === 'Failed to fetch') {
                errorMsg = '网络请求失败，请检查：\n1. 网络连接是否正常\n2. API Key是否正确\n3. 是否需要科学上网';
            }
            alert('生成失败: ' + errorMsg);
        });
    };

    // 场景生图 - 生成提示词
    NR.generateSceneImagePrompt = function(text, rangeDesc) {
        return NR.handleAddToShelf().then(function() {
            if (!text || !text.trim()) {
                alert('选定范围内无内容可供分析。');
                return Promise.reject('无内容');
            }

            // 检查生图服务配置
            var provider = NR.state.aiSettings.imageProvider || 'comfyui';
            if (provider === 'comfyui') {
                var comfyuiUrl = NR.state.aiSettings.comfyuiApiUrl;
                if (!comfyuiUrl) {
                    alert('请先在AI设置中配置ComfyUI API地址');
                    return Promise.reject('未配置ComfyUI');
                }
            } else if (provider === 'nanobananapro') {
                var nanoBananaProApiKey = NR.state.aiSettings.nanoBananaProApiKey;
                if (!nanoBananaProApiKey) {
                    alert('请先在AI设置中配置Nano Banana Pro API Key');
                    return Promise.reject('未配置Nano Banana Pro');
                }
            }

            NR.els['scene-image-choice-modal'].style.display = 'none';
            NR.els['app-loader'].classList.remove('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在生成场景提示词...';

            // 根据生图服务选择不同的提示词模板
            var promptTemplate;
            if (provider === 'nanobananapro') {
                // Nano Banana Pro/Gemini 使用中文自然语言多镜头漫画提示词
                promptTemplate = NR.DEFAULT_AI_PROMPTS.SCENE_IMAGE_PROMPT_GEMINI;
            } else {
                // ComfyUI/SD 使用英文tag提示词
                promptTemplate = NR.DEFAULT_AI_PROMPTS.SCENE_IMAGE_PROMPT;
            }
            var prompt = promptTemplate.replace('{text}', text);

            return fetch(getFullApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + NR.state.aiSettings.apiKey
                },
                body: JSON.stringify({
                    model: NR.state.aiSettings.modelName,
                    messages: [{ role: 'user', content: prompt }],
                    stream: false
                })
            }).then(function(res) {
                if (!res.ok) {
                    return res.text().then(function(errText) {
                        throw new Error('API 请求失败: ' + res.status + ' ' + errText);
                    });
                }
                return res.json();
            }).then(function(data) {
                var imagePrompt = (data.choices && data.choices[0] && data.choices[0].message)
                    ? data.choices[0].message.content.trim() : null;
                if (!imagePrompt) {
                    throw new Error('AI未返回有效的提示词');
                }
                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
                return { prompt: imagePrompt, rangeDesc: rangeDesc, originalText: text.substring(0, 200) };
            });
        });
    };

    // 显示场景生图提示词确认弹窗
    NR.showSceneImagePromptModal = function(promptData, imageSize) {
        var existingModal = document.getElementById('scene-image-prompt-modal');
        if (existingModal) existingModal.remove();

        var modalHtml =
            '<div id="scene-image-prompt-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>确认场景生图提示词</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div style="padding: 10px 0;">' +
                        '<p style="margin-bottom: 5px; opacity: 0.7; font-size: 0.9em;">范围: ' + NR.escapeHtml(promptData.rangeDesc) + '</p>' +
                        '<p style="margin-bottom: 10px; opacity: 0.8;">以下是AI生成的场景绘画提示词，你可以编辑后再发送：</p>' +
                        '<textarea id="scene-image-prompt-textarea" style="width: 100%; height: 150px; resize: vertical; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--highlight-bg); color: var(--text-color); font-size: 14px;">' + NR.escapeHtml(promptData.prompt) + '</textarea>' +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-cancel-scene-image" class="control-button">取消</button>' +
                        '<button id="btn-confirm-scene-image" class="control-button" style="background: var(--accent-color);">发送生成</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('scene-image-prompt-modal');
        var closeBtn = modal.querySelector('.close-button');
        var cancelBtn = document.getElementById('btn-cancel-scene-image');
        var confirmBtn = document.getElementById('btn-confirm-scene-image');
        var textarea = document.getElementById('scene-image-prompt-textarea');

        var closeModal = function() { modal.remove(); };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

        confirmBtn.addEventListener('click', function() {
            var finalPrompt = textarea.value.trim();
            if (!finalPrompt) {
                alert('提示词不能为空');
                return;
            }
            closeModal();
            // 根据选择的生图服务调用不同的API
            if (NR.state.aiSettings.imageProvider === 'nanobananapro') {
                NR.sendSceneImageToNanoBananaPro(finalPrompt, promptData.rangeDesc, promptData.originalText, imageSize);
            } else {
                NR.sendSceneImageToComfyUI(finalPrompt, promptData.rangeDesc, promptData.originalText, imageSize);
            }
        });
    };

    // 发送场景图到ComfyUI
    NR.sendSceneImageToComfyUI = function(imagePrompt, rangeDesc, originalText, imageSize, retryCount) {
        retryCount = retryCount || 0;
        var maxRetries = 2;

        NR.els['app-loader'].classList.remove('hidden');
        var statusText = retryCount > 0 ? '正在重试 (' + retryCount + '/' + maxRetries + ')...' : '正在生成场景图...';
        NR.els['app-loader'].querySelector('span').textContent = statusText;

        var comfyuiUrl = NR.state.aiSettings.comfyuiApiUrl.replace(/\/+$/, '');
        var apiUrl = comfyuiUrl + '/api/generate';

        // 根据尺寸设置宽高 (SDXL尺寸)
        var width = 1152, height = 896; // 默认 4:3 横向
        if (imageSize === 'square') { width = 1024; height = 1024; }
        else if (imageSize === 'portrait_3_4') { width = 896; height = 1152; }
        else if (imageSize === 'portrait_9_16') { width = 768; height = 1344; }
        else if (imageSize === 'landscape_4_3') { width = 1152; height = 896; }
        else if (imageSize === 'landscape_16_9') { width = 1344; height = 768; }

        var requestBody = {
            prompt: imagePrompt,
            negative_prompt: 'lowres, worst quality, bad quality, bad anatomy, sketch, jpeg artifacts, signature, watermark, censored, text, ui',
            width: width,
            height: height,
            quality: 75,
            max_size: 600
        };

        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 180000);

        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        }).then(function(res) {
            clearTimeout(timeoutId);
            if (!res.ok) {
                return res.text().then(function() {
                    throw new Error('服务器返回错误: ' + res.status);
                });
            }
            return res.json();
        }).then(function(data) {
            if (data.status === 'success' && data.image) {
                // 保存到生图历史
                var sceneImage = {
                    image: data.image,
                    prompt: imagePrompt,
                    rangeDesc: rangeDesc,
                    originalText: originalText,
                    timestamp: Date.now()
                };
                NR.state.currentBookData.sceneImages.push(sceneImage);
                NR.saveBookData();

                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';

                // 显示生成的图片
                NR.showGeneratedSceneImage(sceneImage);
            } else {
                throw new Error(data.message || '图片生成失败');
            }
        }).catch(function(err) {
            clearTimeout(timeoutId);
            console.error('场景生图请求错误:', err);

            var isNetworkError = err.name === 'AbortError' || err.message === 'Failed to fetch' || err.message.indexOf('network') !== -1;

            if (isNetworkError && retryCount < maxRetries) {
                setTimeout(function() {
                    NR.sendSceneImageToComfyUI(imagePrompt, rangeDesc, originalText, imageSize, retryCount + 1);
                }, 2000);
            } else {
                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';

                var errorMsg = '生成失败: ';
                if (err.name === 'AbortError') {
                    errorMsg += '请求超时，请检查网络连接';
                } else if (err.message === 'Failed to fetch') {
                    errorMsg += '无法连接服务器';
                } else {
                    errorMsg += err.message;
                }
                alert(errorMsg);
            }
        });
    };

    // 发送场景图到 Nano Banana Pro (使用Gemini官方API)
    NR.sendSceneImageToNanoBananaPro = function(imagePrompt, rangeDesc, originalText, imageSize) {
        NR.els['app-loader'].classList.remove('hidden');
        NR.els['app-loader'].querySelector('span').textContent = '正在生成图片...';

        var apiKey = NR.state.aiSettings.nanoBananaProApiKey;
        if (!apiKey) {
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
            alert('请先在AI设置中配置Nano Banana Pro API Key');
            return;
        }

        var model = NR.state.aiSettings.nanoBananaProModel || 'gemini-2.0-flash-preview-image-generation';
        var url = GEMINI_API_BASE_URL + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);

        // 根据尺寸设置宽高比
        var aspectRatio = '4:3'; // 默认横向
        if (imageSize === 'square') { aspectRatio = '1:1'; }
        else if (imageSize === 'portrait_3_4') { aspectRatio = '3:4'; }
        else if (imageSize === 'portrait_9_16') { aspectRatio = '9:16'; }
        else if (imageSize === 'landscape_4_3') { aspectRatio = '4:3'; }
        else if (imageSize === 'landscape_16_9') { aspectRatio = '16:9'; }

        var requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: imagePrompt }]
                }
            ],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: '2K'
                }
            }
        };

        sendGeminiImageRequest(url, requestBody, function(extracted) {
            // 成功回调
            var imageDataUrl = 'data:' + extracted.mimeType + ';base64,' + extracted.base64;

            // 生成唯一的图片ID
            var imageId = 'scene_image_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            // 将图片保存到IndexedDB
            NR.storageDB.saveAsset({
                id: imageId,
                data: imageDataUrl,
                type: 'scene_image'
            }).then(function() {
                // 保存到生图历史（只保存图片ID，不保存完整数据）
                var sceneImage = {
                    imageId: imageId,
                    image: imageDataUrl, // 临时保留用于立即显示
                    prompt: imagePrompt,
                    rangeDesc: rangeDesc,
                    originalText: originalText,
                    timestamp: Date.now(),
                    provider: 'nanobananapro'
                };
                
                // 保存时移除大的image字段，只保留imageId
                var sceneImageForSave = {
                    imageId: imageId,
                    prompt: imagePrompt,
                    rangeDesc: rangeDesc,
                    originalText: originalText,
                    timestamp: Date.now(),
                    provider: 'nanobananapro'
                };
                NR.state.currentBookData.sceneImages.push(sceneImageForSave);
                NR.saveBookData();

                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';

                // 显示生成的图片（使用完整数据）
                NR.showGeneratedSceneImage(sceneImage);
            }).catch(function(err) {
                console.error('保存图片到IndexedDB失败:', err);
                // 即使保存失败也显示图片
                var sceneImage = {
                    image: imageDataUrl,
                    prompt: imagePrompt,
                    rangeDesc: rangeDesc,
                    originalText: originalText,
                    timestamp: Date.now(),
                    provider: 'nanobananapro'
                };
                NR.state.currentBookData.sceneImages.push(sceneImage);
                NR.saveBookData();
                
                NR.els['app-loader'].classList.add('hidden');
                NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
                NR.showGeneratedSceneImage(sceneImage);
            });
        }, function(err) {
            // 错误回调
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
            console.error('Nano Banana Pro 请求错误:', err);
            var errorMsg = err.message || String(err);
            if (err.name === 'AbortError') {
                errorMsg = '请求超时（5分钟），请检查网络连接';
            } else if (errorMsg === 'Failed to fetch') {
                errorMsg = '网络请求失败，请检查：\n1. 网络连接是否正常\n2. API Key是否正确\n3. 是否需要科学上网';
            }
            alert('生成失败: ' + errorMsg);
        });
    };

    // 显示生成的场景图
    NR.showGeneratedSceneImage = function(sceneImage) {
        var existingModal = document.getElementById('scene-image-result-modal');
        if (existingModal) existingModal.remove();

        var modalHtml =
            '<div id="scene-image-result-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>场景图生成成功</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="scene-image-result">' +
                        '<img src="' + sceneImage.image + '" alt="场景图" style="max-width: 100%; max-height: 50vh; border-radius: 8px;">' +
                        '<p style="margin-top: 10px; opacity: 0.7; font-size: 0.9em;">范围: ' + NR.escapeHtml(sceneImage.rangeDesc) + '</p>' +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-close-scene-result" class="control-button">关闭</button>' +
                        '<button id="btn-view-scene-history" class="control-button">查看历史</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('scene-image-result-modal');
        var closeBtn = modal.querySelector('.close-button');
        var closeResultBtn = document.getElementById('btn-close-scene-result');
        var viewHistoryBtn = document.getElementById('btn-view-scene-history');

        var closeModal = function() { modal.remove(); };

        closeBtn.addEventListener('click', closeModal);
        closeResultBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

        viewHistoryBtn.addEventListener('click', function() {
            closeModal();
            NR.renderSceneImageHistory();
            NR.els['scene-image-history-modal'].style.display = 'flex';
        });
    };

    // 从IndexedDB加载场景图图片
    NR.loadSceneImageData = function(item) {
        return new Promise(function(resolve) {
            // 如果已经有image数据，直接返回
            if (item.image) {
                resolve(item.image);
                return;
            }
            // 如果有imageId，从IndexedDB加载
            if (item.imageId) {
                NR.storageDB.loadAsset(item.imageId).then(function(asset) {
                    if (asset && asset.data) {
                        resolve(asset.data);
                    } else {
                        resolve(null);
                    }
                }).catch(function() {
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        });
    };

    // 渲染生图历史
    NR.renderSceneImageHistory = function() {
        var container = NR.els['scene-image-history-list'];
        container.innerHTML = '';

        if (!NR.state.currentBookData.sceneImages || NR.state.currentBookData.sceneImages.length === 0) {
            container.innerHTML = '<div class="scene-image-empty"><p>📷 没有已保存的场景图</p><p style="font-size: 0.9em;">使用"生成场景图"功能来创建插画</p></div>';
            return;
        }

        // 按时间倒序排列
        var sortedImages = NR.state.currentBookData.sceneImages.slice().sort(function(a, b) {
            return b.timestamp - a.timestamp;
        });

        sortedImages.forEach(function(item, index) {
            var card = document.createElement('div');
            card.className = 'scene-image-card';

            var date = new Date(item.timestamp);
            var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString().substring(0, 5);

            // 先显示占位符
            card.innerHTML =
                '<div class="scene-image-card-img" data-image-id="' + (item.imageId || '') + '" style="background-color: var(--highlight-bg);"></div>' +
                '<div class="scene-image-card-info">' +
                    '<span class="scene-image-card-range">' + NR.escapeHtml(item.rangeDesc) + '</span>' +
                    '<span class="scene-image-card-date">' + dateStr + '</span>' +
                '</div>' +
                '<button class="scene-image-card-delete" data-index="' + index + '" title="删除">&times;</button>';

            // 异步加载图片
            NR.loadSceneImageData(item).then(function(imageData) {
                if (imageData) {
                    var imgDiv = card.querySelector('.scene-image-card-img');
                    if (imgDiv) {
                        imgDiv.style.backgroundImage = 'url(' + imageData + ')';
                    }
                }
            });

            card.addEventListener('click', function(e) {
                if (!e.target.classList.contains('scene-image-card-delete')) {
                    NR.showSceneImageDetail(item);
                }
            });

            container.appendChild(card);
        });

        // 绑定删除事件
        container.querySelectorAll('.scene-image-card-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(btn.dataset.index, 10);
                if (confirm('确定要删除这张场景图吗？')) {
                    // 找到原始数组中的索引
                    var sortedItem = sortedImages[idx];
                    var originalIdx = NR.state.currentBookData.sceneImages.indexOf(sortedItem);
                    if (originalIdx > -1) {
                        // 如果有imageId，也删除IndexedDB中的图片
                        if (sortedItem.imageId) {
                            NR.storageDB.deleteAsset(sortedItem.imageId).catch(function(err) {
                                console.error('删除图片资源失败:', err);
                            });
                        }
                        NR.state.currentBookData.sceneImages.splice(originalIdx, 1);
                        NR.saveBookData();
                        NR.renderSceneImageHistory();
                    }
                }
            });
        });
    };

    // 显示场景图详情
    NR.showSceneImageDetail = function(item) {
        var existingModal = document.getElementById('scene-image-detail-modal');
        if (existingModal) existingModal.remove();

        var date = new Date(item.timestamp);
        var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        // 先创建带占位符的弹窗
        var modalHtml =
            '<div id="scene-image-detail-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>场景图详情</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="scene-image-detail">' +
                        '<div id="scene-image-detail-img-container" style="text-align: center; padding: 20px;">加载中...</div>' +
                        '<div class="scene-image-detail-info">' +
                            '<p><strong>范围:</strong> ' + NR.escapeHtml(item.rangeDesc) + '</p>' +
                            '<p><strong>时间:</strong> ' + dateStr + '</p>' +
                            '<p><strong>提示词:</strong></p>' +
                            '<p style="font-size: 0.9em; opacity: 0.8; white-space: pre-wrap;">' + NR.escapeHtml(item.prompt) + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-close-scene-detail" class="control-button">关闭</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('scene-image-detail-modal');
        var closeBtn = modal.querySelector('.close-button');
        var closeDetailBtn = document.getElementById('btn-close-scene-detail');
        var imgContainer = document.getElementById('scene-image-detail-img-container');

        var closeModal = function() { modal.remove(); };
        closeBtn.addEventListener('click', closeModal);
        closeDetailBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

        // 异步加载图片
        NR.loadSceneImageData(item).then(function(imageData) {
            if (imageData) {
                imgContainer.innerHTML = '<img src="' + imageData + '" alt="场景图" style="max-width: 100%; max-height: 50vh; border-radius: 8px; cursor: pointer;" onclick="NR.showImageViewer(this.src, \'' + NR.escapeHtml(item.rangeDesc).replace(/'/g, "\\'") + '\')">';
            } else {
                imgContainer.innerHTML = '<p style="color: #999;">图片加载失败</p>';
            }
        });
    };
})();
