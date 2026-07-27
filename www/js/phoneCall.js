// 小手机电话功能模块
(function() {
    var NR = window.NovelReader;

    // 初始化电话数据状态
    NR.initCallData = function() {
        if (!NR.state.phoneChatState.callState) {
            NR.state.phoneChatState.callState = {
                selectedContact: null,
                isGenerating: false,
                isCalling: false,
                callHistory: [],
                currentCallContent: null,
                selectedContexts: []
            };
        }
        if (!NR.state.currentBookData.calls) {
            NR.state.currentBookData.calls = [];
        }
    };

    // 获取通话记录列表（按时间倒序）
    NR.getCallHistory = function() {
        var calls = NR.state.currentBookData.calls || [];
        return calls.slice().sort(function(a, b) {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
    };

    // 渲染电话主界面（联系人列表）
    NR.renderPhoneCallScreen = function() {
        NR.initCallData();
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var protagonists = profiles.filter(function(p) { return p.isProtagonist; });
        var importantNPCs = profiles.filter(function(p) { return p.isImportant && !p.isProtagonist; });
        var availableContacts = protagonists.concat(importantNPCs);
        var callHistory = NR.getCallHistory();
        
        var html = '<div class="phone-app-container phone-call-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">电话</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-call-context" title="选择上下文">📝</button>';
        html += '</div>';
        html += '</div>';
        
        // 显示已选上下文数量
        var callState = NR.state.phoneChatState.callState;
        var selectedContexts = callState.selectedContexts || [];
        if (selectedContexts.length > 0) {
            html += '<div class="call-context-badge">';
            html += '<span>📝 已选择 ' + selectedContexts.length + ' 个上下文</span>';
            html += '</div>';
        }
        
        // 内容区域
        html += '<div class="phone-app-content phone-call-content">';
        
        // 标签页切换
        html += '<div class="call-tabs">';
        html += '<button class="call-tab active" data-tab="contacts">联系人</button>';
        html += '<button class="call-tab" data-tab="history">通话记录</button>';
        html += '</div>';
        
        // 联系人列表
        html += '<div class="call-tab-content" id="call-contacts-tab">';
        if (availableContacts.length === 0) {
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">📞</div>';
            html += '<p>暂无联系人</p>';
            html += '<p class="empty-hint">请先添加人物卡片</p>';
            html += '</div>';
        } else {
            html += '<div class="call-contact-list">';
            availableContacts.forEach(function(profile) {
                var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                var identity = profile.data ? (profile.data['身份'] || profile.data['职业/身份'] || '') : '';
                
                html += '<div class="call-contact-item" data-name="' + NR.escapeHtml(profile.name) + '">';
                if (profile.cover) {
                    html += '<div class="call-contact-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    html += '<div class="call-contact-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
                }
                html += '<div class="call-contact-info">';
                html += '<div class="call-contact-name">' + NR.escapeHtml(profile.name) + '</div>';
                if (identity) {
                    html += '<div class="call-contact-identity">' + NR.escapeHtml(identity) + '</div>';
                }
                html += '</div>';
                html += '<button class="call-btn" data-name="' + NR.escapeHtml(profile.name) + '"><i class="fas fa-phone-alt"></i></button>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        // 通话记录列表
        html += '<div class="call-tab-content" id="call-history-tab" style="display: none;">';
        if (callHistory.length === 0) {
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">📋</div>';
            html += '<p>暂无通话记录</p>';
            html += '</div>';
        } else {
            html += '<div class="call-history-list">';
            callHistory.forEach(function(call, index) {
                var profiles = NR.state.currentBookData.characterProfiles || [];
                var profile = profiles.find(function(p) { return p.name === call.name; });
                var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#8FB8ED', text: '#fff' };
                
                html += '<div class="call-history-item" data-index="' + index + '">';
                if (profile && profile.cover) {
                    html += '<div class="call-history-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    html += '<div class="call-history-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((call.name || '?')[0]) + '</div>';
                }
                html += '<div class="call-history-info">';
                html += '<div class="call-history-name">' + NR.escapeHtml(call.name || '未知') + '</div>';
                html += '<div class="call-history-time">' + NR.escapeHtml(call.time || '') + '</div>';
                html += '</div>';
                html += '<div class="call-history-actions">';
                html += '<button class="call-history-btn call-back-btn" data-name="' + NR.escapeHtml(call.name) + '" title="回拨"><i class="fas fa-phone-alt"></i></button>';
                html += '<button class="call-history-btn call-delete-btn" data-index="' + index + '" title="删除"><i class="fas fa-trash"></i></button>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };


    // 渲染通话中界面
    NR.renderPhoneCallActiveScreen = function() {
        var callState = NR.state.phoneChatState.callState;
        var contact = callState.selectedContact;
        var callContent = callState.currentCallContent;
        
        if (!contact) {
            return NR.renderPhoneCallScreen();
        }
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === contact; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#8FB8ED', text: '#fff' };
        
        var html = '<div class="phone-app-container phone-call-active-container">';
        
        // 通话界面背景
        html += '<div class="call-active-bg"></div>';
        
        // 通话内容区域
        html += '<div class="call-active-content">';
        
        // 联系人信息
        html += '<div class="call-active-header">';
        if (profile && profile.cover) {
            html += '<div class="call-active-avatar" style="background-image: url(' + profile.cover + ');"></div>';
        } else {
            html += '<div class="call-active-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((contact || '?')[0]) + '</div>';
        }
        html += '<div class="call-active-name">' + NR.escapeHtml(contact) + '</div>';
        
        if (callState.isGenerating) {
            html += '<div class="call-active-status">正在接通...</div>';
        } else if (callContent) {
            html += '<div class="call-active-status">通话中</div>';
        } else {
            html += '<div class="call-active-status">呼叫中...</div>';
        }
        html += '</div>';
        
        // 通话内容显示
        if (callContent && !callState.isGenerating) {
            html += '<div class="call-dialogue-container">';
            
            // 对方的内心想法（气泡显示）
            if (callContent.thought) {
                html += '<div class="call-thought-bubble">';
                html += '<div class="call-thought-label">💭 内心想法</div>';
                html += '<div class="call-thought-text">' + NR.escapeHtml(callContent.thought) + '</div>';
                html += '</div>';
            }
            
            // 对方说的话
            html += '<div class="call-speech-bubble">';
            html += '<div class="call-speech-label">' + NR.escapeHtml(contact) + ' 说：</div>';
            html += '<div class="call-speech-text">' + NR.escapeHtml(callContent.content || '') + '</div>';
            html += '</div>';
            
            html += '</div>';
        }
        
        // 生成中动画
        if (callState.isGenerating) {
            html += '<div class="call-generating">';
            html += '<div class="call-generating-dots">';
            html += '<span></span><span></span><span></span>';
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>'; // end call-active-content
        
        // 底部操作栏
        html += '<div class="call-active-actions">';
        
        if (callContent && !callState.isGenerating) {
            // 通话中的操作
            html += '<div class="call-input-area">';
            html += '<input type="text" id="call-reply-input" class="call-reply-input" placeholder="输入你想说的话...">';
            html += '<button class="call-reply-btn" id="btn-call-reply"><i class="fas fa-paper-plane"></i></button>';
            html += '</div>';
        }
        
        html += '<div class="call-control-buttons">';
        if (callContent && !callState.isGenerating) {
            html += '<button class="call-control-btn call-regenerate-btn" id="btn-call-regenerate" title="重新生成"><i class="fas fa-redo"></i></button>';
        }
        html += '<button class="call-control-btn call-hangup-btn" id="btn-call-hangup" title="挂断"><i class="fas fa-phone-slash"></i></button>';
        html += '</div>';
        
        html += '</div>'; // end call-active-actions
        
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 发起通话
    NR.startVoiceCall = function(contactName, userMessage) {
        NR.initCallData();
        var callState = NR.state.phoneChatState.callState;
        
        if (callState.isGenerating) {
            return;
        }
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        callState.selectedContact = contactName;
        callState.isGenerating = true;
        callState.isCalling = true;
        callState.currentCallContent = null;
        
        // 切换到通话界面
        NR.state.phoneChatState.currentScreen = 'call-active';
        NR.refreshPhoneModal();
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === contactName; });
        
        if (!profile) {
            callState.isGenerating = false;
            alert('未找到联系人信息');
            NR.refreshPhoneModal();
            return;
        }
        
        // 获取完整人物卡信息
        var charInfo = NR.getCharacterTagsInfo ? NR.getCharacterTagsInfo(profile) : '';
        
        // 获取用户角色信息
        var userInfo = NR.getUserRoleInfo ? NR.getUserRoleInfo() : '普通用户';
        var userName = NR.getUserRoleDisplayName ? NR.getUserRoleDisplayName() : '用户';
        
        // 获取选中的上下文
        var selectedContexts = callState.selectedContexts || [];
        var summaries = NR.state.currentBookData.summaries || [];
        var contextText = '';
        if (selectedContexts.length > 0) {
            contextText = '\n\n【剧情背景/上下文】\n';
            selectedContexts.forEach(function(idx) {
                var summary = summaries[idx];
                if (summary) {
                    contextText += '--- ' + (summary.range || '总结') + ' ---\n';
                    contextText += (summary.text || '') + '\n\n';
                }
            });
        }
        
        // 构建提示词
        var prompt = '你是一个角色扮演助手。' + userName + '正在与' + contactName + '进行语音通话。\n\n';
        prompt += '【' + contactName + '的角色信息】\n' + charInfo + '\n';
        prompt += '\n【' + userName + '的信息】\n' + userInfo + '\n';
        prompt += contextText;
        
        if (userMessage) {
            prompt += '\n【' + userName + '说】\n' + userMessage + '\n';
            prompt += '\n请以' + contactName + '的身份回复这通电话。';
        } else {
            prompt += '\n【场景】\n' + userName + '向' + contactName + '发起了语音通话，' + contactName + '接听了电话。';
            prompt += '\n请以' + contactName + '的身份开始这通电话对话。';
        }
        
        prompt += '\n\n【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'name: "' + contactName + '"\n';
        prompt += 'thought: "角色此刻的内心想法（不会说出口的）"\n';
        prompt += 'content: "角色在电话中说的话"\n';
        prompt += '```\n';
        prompt += '\n【要求】\n';
        prompt += '1. 回复要符合角色性格和与' + userName + '的关系\n';
        prompt += '2. thought是内心独白，content是实际说出的话\n';
        prompt += '3. 语气要自然，像真实的电话对话\n';
        
        // 获取API URL
        var apiUrl = NR.state.aiSettings.apiUrl || '';
        apiUrl = apiUrl.replace(/\/+$/, '');
        if (!apiUrl.endsWith('/chat/completions')) {
            apiUrl += '/chat/completions';
        }
        
        fetch(apiUrl, {
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
            var content = (data.choices && data.choices[0] && data.choices[0].message) 
                ? data.choices[0].message.content : null;
            
            if (!content) {
                throw new Error('AI 返回内容为空');
            }
            
            // 解析YAML格式的通话内容
            var callData = NR.parseCallYaml(content, contactName);
            
            if (callData) {
                callState.currentCallContent = callData;
                
                // 保存通话记录
                var now = new Date();
                var timeStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + 
                    (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + 
                    (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
                
                var callRecord = {
                    id: 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    name: contactName,
                    time: timeStr,
                    thought: callData.thought,
                    content: callData.content,
                    userMessage: userMessage || '',
                    timestamp: Date.now()
                };
                
                if (!NR.state.currentBookData.calls) {
                    NR.state.currentBookData.calls = [];
                }
                NR.state.currentBookData.calls.push(callRecord);
                NR.saveBookData();
                
                console.info('[Call] 通话生成成功:', callData);
            } else {
                throw new Error('无法解析通话内容');
            }
            
            callState.isGenerating = false;
            NR.refreshPhoneModal();
            
        }).catch(function(err) {
            console.error('[Call] 通话生成失败:', err);
            callState.isGenerating = false;
            callState.isCalling = false;
            alert('通话失败: ' + err.message);
            NR.state.phoneChatState.currentScreen = 'phone-call';
            NR.refreshPhoneModal();
        });
    };


    // 解析YAML格式的通话内容
    NR.parseCallYaml = function(content, defaultName) {
        try {
            // 提取yaml代码块
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var callData = {
                name: defaultName,
                thought: '',
                content: ''
            };
            
            // 解析name
            var nameMatch = yamlContent.match(/name:\s*["']?([^"'\n]+)["']?/);
            if (nameMatch) callData.name = nameMatch[1].trim();
            
            // 解析thought
            var thoughtMatch = yamlContent.match(/thought:\s*["']?([^"'\n]+)["']?/);
            if (thoughtMatch) callData.thought = thoughtMatch[1].trim();
            
            // 解析content
            var contentMatch = yamlContent.match(/content:\s*["']?([^"'\n]+)["']?/);
            if (contentMatch) callData.content = contentMatch[1].trim();
            
            return callData.content ? callData : null;
        } catch (e) {
            console.error('[Call] 解析通话YAML失败:', e);
            return null;
        }
    };

    // 挂断电话
    NR.hangupCall = function() {
        var callState = NR.state.phoneChatState.callState;
        callState.isCalling = false;
        callState.isGenerating = false;
        callState.selectedContact = null;
        callState.currentCallContent = null;
        
        NR.state.phoneChatState.currentScreen = 'phone-call';
        NR.refreshPhoneModal();
    };

    // 删除通话记录
    NR.deleteCallRecord = function(index) {
        var calls = NR.state.currentBookData.calls || [];
        var sortedCalls = calls.slice().sort(function(a, b) {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
        
        if (sortedCalls[index]) {
            var targetId = sortedCalls[index].id;
            var originalIndex = calls.findIndex(function(c) { return c.id === targetId; });
            if (originalIndex !== -1) {
                calls.splice(originalIndex, 1);
                NR.saveBookData();
            }
        }
    };

    // 显示通话上下文选择弹窗
    NR.showCallContextModal = function() {
        var existingModal = document.getElementById('call-context-modal');
        if (existingModal) existingModal.remove();
        
        var summaries = NR.state.currentBookData.summaries || [];
        var callState = NR.state.phoneChatState.callState;
        var selectedContexts = callState.selectedContexts || [];
        
        var html = '<div id="call-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="call-context-body">';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，请先使用总结功能生成一些内容摘要</p>';
        } else {
            html += '<p class="hint" style="margin-bottom: 10px;">选择的总结将作为通话背景信息</p>';
            html += '<div class="call-context-list">';
            summaries.slice().sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(s, idx) {
                var isChecked = selectedContexts.indexOf(idx) !== -1;
                html += '<label class="call-context-item">';
                html += '<input type="checkbox" data-index="' + idx + '"' + (isChecked ? ' checked' : '') + '>';
                html += '<div class="context-item-info">';
                html += '<strong>' + NR.escapeHtml(s.range || '总结 ' + (idx + 1)) + '</strong>';
                html += '<span class="context-preview">' + NR.escapeHtml((s.text || '').substring(0, 60)) + '...</span>';
                html += '</div>';
                html += '</label>';
            });
            html += '</div>';
        }
        
        html += '</div>';
        html += '<div class="modal-footer">';
        html += '<button class="control-button" id="btn-confirm-call-context">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('call-context-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        document.getElementById('btn-confirm-call-context').addEventListener('click', function() {
            var checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            callState.selectedContexts = [];
            checkboxes.forEach(function(cb) {
                if (cb.checked) {
                    callState.selectedContexts.push(parseInt(cb.dataset.index));
                }
            });
            modal.remove();
            NR.refreshPhoneModal();
        });
    };

    // 绑定电话相关事件
    NR.bindCallEvents = function(modal) {
        if (!modal) return;
        
        NR.initCallData();
        var callState = NR.state.phoneChatState.callState;
        var currentScreen = NR.state.phoneChatState.currentScreen;
        
        // 标签页切换
        modal.querySelectorAll('.call-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                var tabId = this.dataset.tab;
                modal.querySelectorAll('.call-tab').forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');
                
                modal.querySelectorAll('.call-tab-content').forEach(function(content) {
                    content.style.display = 'none';
                });
                var targetContent = document.getElementById('call-' + tabId + '-tab');
                if (targetContent) targetContent.style.display = 'block';
            });
        });
        
        // 上下文选择按钮
        var contextBtn = document.getElementById('btn-call-context');
        if (contextBtn) {
            contextBtn.addEventListener('click', function() {
                NR.showCallContextModal();
            });
        }
        
        // 联系人列表中的拨打按钮
        modal.querySelectorAll('.call-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var name = this.dataset.name;
                NR.startVoiceCall(name);
            });
        });
        
        // 联系人项点击也可以拨打
        modal.querySelectorAll('.call-contact-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var name = this.dataset.name;
                NR.startVoiceCall(name);
            });
        });
        
        // 通话记录中的回拨按钮
        modal.querySelectorAll('.call-back-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var name = this.dataset.name;
                NR.startVoiceCall(name);
            });
        });
        
        // 通话记录中的删除按钮
        modal.querySelectorAll('.call-delete-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var index = parseInt(this.dataset.index);
                if (confirm('确定要删除这条通话记录吗？')) {
                    NR.deleteCallRecord(index);
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 挂断按钮
        var hangupBtn = document.getElementById('btn-call-hangup');
        if (hangupBtn) {
            hangupBtn.addEventListener('click', function() {
                NR.hangupCall();
            });
        }
        
        // 重新生成按钮
        var regenerateBtn = document.getElementById('btn-call-regenerate');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', function() {
                var contact = callState.selectedContact;
                if (contact) {
                    callState.currentCallContent = null;
                    NR.startVoiceCall(contact);
                }
            });
        }
        
        // 回复输入
        var replyInput = document.getElementById('call-reply-input');
        var replyBtn = document.getElementById('btn-call-reply');
        if (replyInput && replyBtn) {
            var sendReply = function() {
                var msg = replyInput.value.trim();
                if (msg && callState.selectedContact) {
                    replyInput.value = '';
                    NR.startVoiceCall(callState.selectedContact, msg);
                }
            };
            
            replyBtn.addEventListener('click', sendReply);
            replyInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                }
            });
        }
    };

})();
