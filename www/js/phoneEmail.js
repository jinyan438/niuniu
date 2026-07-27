// 小手机邮箱功能模块
(function() {
    var NR = window.NovelReader;

    // 初始化邮箱数据状态
    NR.initEmailData = function() {
        if (!NR.state.phoneChatState.emailState) {
            NR.state.phoneChatState.emailState = {
                selectedEmail: null,
                isGenerating: false,
                selectedContexts: [],
                showCompose: false,
                searchKeyword: ''
            };
        }
        if (!NR.state.currentBookData.emails) {
            NR.state.currentBookData.emails = [];
        }
    };

    // 获取邮件列表（按时间倒序）
    NR.getEmails = function() {
        var emails = NR.state.currentBookData.emails || [];
        return emails.slice().sort(function(a, b) {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
    };

    // 渲染邮箱主界面（邮件列表）
    NR.renderPhoneEmailScreen = function() {
        NR.initEmailData();
        var emails = NR.getEmails();
        var emailState = NR.state.phoneChatState.emailState;
        
        var html = '<div class="phone-app-container phone-email-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar phone-email-header">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">邮箱</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-email-context" title="选择上下文">📝</button>';
        html += '<button class="phone-nav-btn" id="btn-email-generate" title="生成邮件">✨</button>';
        html += '</div>';
        html += '</div>';
        
        // 显示已选上下文数量
        var selectedContexts = emailState.selectedContexts || [];
        if (selectedContexts.length > 0) {
            html += '<div class="email-context-badge">';
            html += '<span>📝 已选择 ' + selectedContexts.length + ' 个上下文</span>';
            html += '</div>';
        }
        
        // 内容区域
        html += '<div class="phone-app-content phone-email-content">';
        
        // 生成中提示
        if (emailState.isGenerating) {
            html += '<div class="email-generating">';
            html += '<div class="email-generating-icon">✨</div>';
            html += '<p>正在生成邮件...</p>';
            html += '</div>';
        }
        
        if (emails.length === 0 && !emailState.isGenerating) {
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">📭</div>';
            html += '<p>收件箱为空</p>';
            html += '<p class="empty-hint">点击右上角 ✨ 生成邮件</p>';
            html += '</div>';
        } else if (emails.length > 0) {
            html += '<div class="email-list">';
            
            emails.forEach(function(email, index) {
                html += NR.renderEmailItem(email, index);
            });
            
            html += '</div>';
        }
        
        html += '</div>'; // end phone-app-content
        
        // 写邮件按钮
        html += '<div class="email-compose-button" id="btn-email-compose">';
        html += '<i class="fas fa-pen"></i>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染单个邮件项
    NR.renderEmailItem = function(email, index) {
        var sender = email.sender || {};
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === sender.name; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#ff6b6b', text: '#fff' };
        
        var html = '<div class="email-item" data-index="' + index + '">';
        
        // 发件人
        html += '<div class="email-sender">';
        html += NR.escapeHtml(sender.name || '未知发件人');
        if (email.hasAttachment) {
            html += '<span class="attachment-icon"><i class="fas fa-paperclip"></i></span>';
        }
        html += '</div>';
        
        // 发件人邮箱
        if (sender.email) {
            html += '<div class="email-address">' + NR.escapeHtml(sender.email) + '</div>';
        }
        
        // 主题
        html += '<div class="email-subject">' + NR.escapeHtml(email.title || email.subject || '无主题') + '</div>';
        
        // 预览
        var preview = (email.content || '').replace(/<[^>]+>/g, '').substring(0, 80);
        html += '<div class="email-preview">' + NR.escapeHtml(preview) + '</div>';
        
        // 时间
        html += '<div class="email-time">' + NR.escapeHtml(email.time || '') + '</div>';
        
        html += '</div>';
        
        return html;
    };


    // 渲染邮件详情界面
    NR.renderPhoneEmailDetailScreen = function() {
        var emailState = NR.state.phoneChatState.emailState;
        var email = emailState.selectedEmail;
        
        if (!email) {
            return NR.renderPhoneEmailScreen();
        }
        
        var sender = email.sender || {};
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === sender.name; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#ff6b6b', text: '#fff' };
        
        var html = '<div class="phone-app-container phone-email-detail-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar phone-email-header">';
        html += '<button class="phone-nav-back" id="btn-email-back">←</button>';
        html += '<span class="phone-nav-title">邮件详情</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-email-delete" title="删除">🗑️</button>';
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content email-detail-content">';
        
        // 发件人信息卡片
        html += '<div class="detail-card">';
        html += '<div class="detail-sender">';
        
        // 头像
        if (profile && profile.cover) {
            html += '<div class="sender-avatar" style="background-image: url(' + profile.cover + ');"></div>';
        } else {
            html += '<div class="sender-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((sender.name || '?')[0]) + '</div>';
        }
        
        html += '<div class="sender-info">';
        html += '<div class="sender-name">' + NR.escapeHtml(sender.name || '未知发件人') + '</div>';
        if (sender.email) {
            html += '<div class="sender-email">' + NR.escapeHtml(sender.email) + '</div>';
        }
        html += '</div>';
        
        // 收藏按钮
        html += '<span class="star-icon' + (email.starred ? ' starred' : '') + '" id="btn-email-star"><i class="fas fa-star"></i></span>';
        
        html += '</div>'; // end detail-sender
        
        // 主题和时间
        html += '<div class="detail-subject">' + NR.escapeHtml(email.title || email.subject || '无主题') + '</div>';
        html += '<div class="detail-time">' + NR.escapeHtml(email.time || '') + '</div>';
        
        html += '</div>'; // end detail-card
        
        // 邮件正文
        html += '<div class="detail-content-card">';
        html += '<div class="detail-text">' + NR.formatEmailContent(email.content || '') + '</div>';
        html += '</div>';
        
        // 附件（如果有）
        if (email.attachment) {
            html += '<div class="attachment-card">';
            html += '<div class="attachment-icon"><i class="fas fa-file"></i></div>';
            html += '<div class="attachment-info">';
            html += '<div class="attachment-name">' + NR.escapeHtml(email.attachment.name || '附件') + '</div>';
            if (email.attachment.size) {
                html += '<div class="attachment-size">' + NR.escapeHtml(email.attachment.size) + '</div>';
            }
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>'; // end phone-app-content
        
        // 底部操作栏
        html += '<div class="email-detail-actions">';
        html += '<button class="email-action-btn" id="btn-email-reply"><i class="fas fa-reply"></i> 回复</button>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 格式化邮件内容（处理换行等）
    NR.formatEmailContent = function(content) {
        if (!content) return '';
        // 转义HTML但保留换行
        var escaped = NR.escapeHtml(content);
        // 将换行符转换为<br>
        return escaped.replace(/\n/g, '<br>');
    };

    // 渲染写邮件界面
    NR.renderPhoneEmailComposeScreen = function() {
        var html = '<div class="phone-app-container phone-email-compose-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar phone-email-header">';
        html += '<button class="phone-nav-back" id="btn-email-compose-back">取消</button>';
        html += '<span class="phone-nav-title">写邮件</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn email-send-btn" id="btn-email-send">发送</button>';
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content email-compose-content">';
        
        html += '<div class="email-compose-form">';
        
        // 收件人
        html += '<div class="compose-form-group">';
        html += '<label>收件人</label>';
        html += '<input type="text" id="email-compose-to" class="compose-form-control" placeholder="输入收件人姓名">';
        html += '</div>';
        
        // 主题
        html += '<div class="compose-form-group">';
        html += '<label>主题</label>';
        html += '<input type="text" id="email-compose-subject" class="compose-form-control" placeholder="输入邮件主题">';
        html += '</div>';
        
        // 正文
        html += '<div class="compose-form-group">';
        html += '<label>正文</label>';
        html += '<textarea id="email-compose-content" class="compose-form-control compose-form-textarea" placeholder="输入邮件内容..."></textarea>';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div class="email-compose-tips">';
        html += '<p>💡 发送后会自动生成收件人的回复邮件</p>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 显示邮箱上下文选择弹窗
    NR.showEmailContextModal = function() {
        var existingModal = document.getElementById('email-context-modal');
        if (existingModal) existingModal.remove();
        
        var summaries = NR.state.currentBookData.summaries || [];
        var emailState = NR.state.phoneChatState.emailState;
        var selectedContexts = emailState.selectedContexts || [];
        
        var html = '<div id="email-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="email-context-body">';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，请先使用总结功能生成一些内容摘要</p>';
        } else {
            html += '<p class="hint" style="margin-bottom: 10px;">选择的总结将作为邮件生成的背景信息</p>';
            html += '<div class="email-context-list">';
            summaries.slice().sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(s, idx) {
                var isChecked = selectedContexts.indexOf(idx) !== -1;
                html += '<label class="email-context-item">';
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
        html += '<button class="control-button" id="btn-confirm-email-context">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('email-context-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        document.getElementById('btn-confirm-email-context').addEventListener('click', function() {
            var checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            emailState.selectedContexts = [];
            checkboxes.forEach(function(cb) {
                if (cb.checked) {
                    emailState.selectedContexts.push(parseInt(cb.dataset.index));
                }
            });
            modal.remove();
            NR.refreshPhoneModal();
        });
    };


    // 生成邮件（调用AI）
    NR.generateEmails = function() {
        NR.initEmailData();
        var emailState = NR.state.phoneChatState.emailState;
        
        if (emailState.isGenerating) {
            return;
        }
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        emailState.isGenerating = true;
        NR.refreshPhoneModal();
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length === 0) {
            emailState.isGenerating = false;
            alert('请先添加人物卡');
            NR.refreshPhoneModal();
            return;
        }
        
        // 构建角色列表
        var charList = profiles.map(function(p) {
            var identity = p.data ? (p.data['身份'] || p.data['职业/身份'] || '') : '';
            return '- ' + p.name + (p.isProtagonist ? '（主角）' : '') + (identity ? '，' + identity : '');
        }).join('\n');
        
        // 获取选中的上下文
        var selectedContexts = emailState.selectedContexts || [];
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
        
        // 获取用户角色名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '用户';
        
        // 获取当前时间
        var now = new Date();
        var timeStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + 
            (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + 
            (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        // 构建提示词
        var prompt = '你是一个角色扮演助手，请为以下角色生成发送给' + userName + '的邮件内容。\n\n';
        prompt += '【可用角色】\n' + charList + '\n';
        prompt += contextText;
        prompt += '\n【生成要求】\n';
        prompt += '请生成3-5封邮件，每封邮件包含：\n';
        prompt += '1. 发件人信息（姓名和邮箱地址）\n';
        prompt += '2. 邮件主题\n';
        prompt += '3. 邮件正文（符合角色身份和性格，100-300字）\n';
        prompt += '4. 发送时间\n\n';
        prompt += '邮件内容应该符合角色的身份和与' + userName + '的关系。\n\n';
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'emails:\n';
        prompt += '  - sender:\n';
        prompt += '      name: "发件人姓名"\n';
        prompt += '      email: "xxx@example.com"\n';
        prompt += '    title: "邮件主题"\n';
        prompt += '    content: "邮件正文内容..."\n';
        prompt += '    time: "' + timeStr + '"\n';
        prompt += '```\n';
        
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
            
            // 解析YAML格式的邮件
            var emails = NR.parseEmailYaml(content);
            
            if (emails && emails.length > 0) {
                // 添加时间戳和ID
                emails.forEach(function(email) {
                    email.timestamp = Date.now() + Math.random() * 1000;
                    email.id = 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                });
                
                // 保存邮件
                if (!NR.state.currentBookData.emails) {
                    NR.state.currentBookData.emails = [];
                }
                NR.state.currentBookData.emails = NR.state.currentBookData.emails.concat(emails);
                NR.saveBookData();
                
                console.info('[Email] 邮件生成成功:', emails);
            } else {
                throw new Error('无法解析邮件内容');
            }
            
            emailState.isGenerating = false;
            NR.refreshPhoneModal();
            
        }).catch(function(err) {
            console.error('[Email] 生成邮件失败:', err);
            emailState.isGenerating = false;
            alert('生成邮件失败: ' + err.message);
            NR.refreshPhoneModal();
        });
    };

    // 解析YAML格式的邮件
    NR.parseEmailYaml = function(content) {
        try {
            // 提取yaml代码块
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var emails = [];
            
            // 简单解析emails数组
            var emailMatches = yamlContent.split(/\n\s*-\s*sender:/);
            
            for (var i = 1; i < emailMatches.length; i++) {
                var emailStr = 'sender:' + emailMatches[i];
                var email = {
                    sender: { name: '', email: '' },
                    title: '',
                    content: '',
                    time: ''
                };
                
                // 解析sender.name
                var senderNameMatch = emailStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                if (senderNameMatch) email.sender.name = senderNameMatch[1].trim();
                
                // 解析sender.email
                var senderEmailMatch = emailStr.match(/email:\s*["']?([^"'\n]+)["']?/);
                if (senderEmailMatch) email.sender.email = senderEmailMatch[1].trim();
                
                // 解析title
                var titleMatch = emailStr.match(/title:\s*["']?([^"'\n]+)["']?/);
                if (titleMatch) email.title = titleMatch[1].trim();
                
                // 解析content（可能是多行）
                var contentMatch = emailStr.match(/content:\s*["']?([\s\S]*?)(?=\n\s*time:|$)/);
                if (contentMatch) {
                    var contentText = contentMatch[1].trim();
                    // 移除可能的引号
                    contentText = contentText.replace(/^["']|["']$/g, '');
                    email.content = contentText;
                }
                
                // 解析time
                var timeMatch = emailStr.match(/time:\s*["']?([^"'\n]+)["']?/);
                if (timeMatch) email.time = timeMatch[1].trim();
                
                if (email.sender.name && email.title) {
                    emails.push(email);
                }
            }
            
            return emails;
        } catch (e) {
            console.error('[Email] 解析YAML失败:', e);
            return [];
        }
    };


    // 发送用户邮件
    NR.sendUserEmail = function(to, subject, content) {
        if (!to || !to.trim()) {
            alert('请输入收件人');
            return;
        }
        if (!subject || !subject.trim()) {
            alert('请输入邮件主题');
            return;
        }
        if (!content || !content.trim()) {
            alert('请输入邮件内容');
            return;
        }
        
        NR.initEmailData();
        var emailState = NR.state.phoneChatState.emailState;
        
        // 获取用户角色名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '我';
        
        // 获取当前时间
        var now = new Date();
        var timeStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + 
            (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + 
            (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        // 创建已发送邮件记录
        var sentEmail = {
            id: 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            sender: {
                name: userName,
                email: userName.toLowerCase().replace(/\s/g, '') + '@user.com'
            },
            title: subject.trim(),
            content: content.trim(),
            time: timeStr,
            isSent: true,
            timestamp: Date.now()
        };
        
        // 保存已发送邮件
        if (!NR.state.currentBookData.emails) {
            NR.state.currentBookData.emails = [];
        }
        NR.state.currentBookData.emails.push(sentEmail);
        NR.saveBookData();
        
        // 返回邮件列表
        NR.state.phoneChatState.currentScreen = 'email';
        NR.refreshPhoneModal();
        
        // 自动生成回复邮件
        NR.generateEmailReply(to.trim(), subject.trim(), content.trim());
    };

    // 生成邮件回复
    NR.generateEmailReply = function(recipient, subject, originalContent) {
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            return;
        }
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var recipientProfile = profiles.find(function(p) { return p.name === recipient; });
        
        if (!recipientProfile) {
            console.warn('[Email] 未找到收件人角色:', recipient);
            return;
        }
        
        // 获取用户角色名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '用户';
        
        // 获取角色信息
        var charInfo = NR.getCharacterTagsInfo ? NR.getCharacterTagsInfo(recipientProfile) : '';
        
        // 获取当前时间（稍后一点）
        var now = new Date();
        now.setMinutes(now.getMinutes() + Math.floor(Math.random() * 30) + 5);
        var timeStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + 
            (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + 
            (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        // 构建提示词
        var prompt = '你是一个角色扮演助手。' + userName + '给' + recipient + '发送了一封邮件，请以' + recipient + '的身份写一封回复邮件。\n\n';
        
        if (charInfo) {
            prompt += '【' + recipient + '的角色信息】\n' + charInfo + '\n\n';
        }
        
        prompt += '【原邮件】\n';
        prompt += '发件人: ' + userName + '\n';
        prompt += '主题: ' + subject + '\n';
        prompt += '内容:\n' + originalContent + '\n\n';
        
        prompt += '【要求】\n';
        prompt += '1. 以' + recipient + '的身份和语气回复\n';
        prompt += '2. 回复内容要符合角色性格和与' + userName + '的关系\n';
        prompt += '3. 回复长度100-300字\n\n';
        
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'reply:\n';
        prompt += '  title: "Re: ' + subject + '"\n';
        prompt += '  content: "回复内容..."\n';
        prompt += '```\n';
        
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
            if (!res.ok) throw new Error('API请求失败');
            return res.json();
        }).then(function(data) {
            var content = (data.choices && data.choices[0] && data.choices[0].message) 
                ? data.choices[0].message.content : null;
            
            if (!content) return;
            
            // 解析回复
            var reply = NR.parseEmailReplyYaml(content);
            
            if (reply) {
                // 创建回复邮件
                var replyEmail = {
                    id: 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    sender: {
                        name: recipient,
                        email: recipient.toLowerCase().replace(/\s/g, '') + '@example.com'
                    },
                    title: reply.title || 'Re: ' + subject,
                    content: reply.content,
                    time: timeStr,
                    timestamp: Date.now()
                };
                
                // 保存回复邮件
                NR.state.currentBookData.emails.push(replyEmail);
                NR.saveBookData();
                NR.refreshPhoneModal();
                
                console.info('[Email] 回复邮件生成成功:', replyEmail);
            }
        }).catch(function(err) {
            console.error('[Email] 生成回复失败:', err);
        });
    };

    // 解析回复邮件YAML
    NR.parseEmailReplyYaml = function(content) {
        try {
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var reply = { title: '', content: '' };
            
            var titleMatch = yamlContent.match(/title:\s*["']?([^"'\n]+)["']?/);
            if (titleMatch) reply.title = titleMatch[1].trim();
            
            var contentMatch = yamlContent.match(/content:\s*["']?([\s\S]*?)(?=\n\s*\w+:|$)/);
            if (contentMatch) {
                var contentText = contentMatch[1].trim();
                contentText = contentText.replace(/^["']|["']$/g, '');
                reply.content = contentText;
            }
            
            return reply.content ? reply : null;
        } catch (e) {
            console.error('[Email] 解析回复失败:', e);
            return null;
        }
    };

    // 删除邮件
    NR.deleteEmail = function(emailId) {
        var emails = NR.state.currentBookData.emails || [];
        var index = emails.findIndex(function(e) { return e.id === emailId; });
        
        if (index !== -1) {
            emails.splice(index, 1);
            NR.saveBookData();
        }
    };

    // 绑定邮箱事件
    NR.bindEmailEvents = function(modal) {
        if (!modal) return;
        
        var currentScreen = NR.state.phoneChatState.currentScreen;
        
        // 邮件列表界面事件
        if (currentScreen === 'email') {
            // 生成邮件按钮
            var generateBtn = document.getElementById('btn-email-generate');
            if (generateBtn) {
                generateBtn.addEventListener('click', function() {
                    NR.generateEmails();
                });
            }
            
            // 上下文选择按钮
            var contextBtn = document.getElementById('btn-email-context');
            if (contextBtn) {
                contextBtn.addEventListener('click', function() {
                    NR.showEmailContextModal();
                });
            }
            
            // 写邮件按钮
            var composeBtn = document.getElementById('btn-email-compose');
            if (composeBtn) {
                composeBtn.addEventListener('click', function() {
                    NR.state.phoneChatState.currentScreen = 'email-compose';
                    NR.refreshPhoneModal();
                });
            }
            
            // 邮件项点击
            modal.querySelectorAll('.email-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    var index = parseInt(this.dataset.index);
                    var emails = NR.getEmails();
                    if (emails[index]) {
                        NR.state.phoneChatState.emailState.selectedEmail = emails[index];
                        NR.state.phoneChatState.currentScreen = 'email-detail';
                        NR.refreshPhoneModal();
                    }
                });
            });
        }
        
        // 邮件详情界面事件
        if (currentScreen === 'email-detail') {
            // 返回按钮
            var backBtn = document.getElementById('btn-email-back');
            if (backBtn) {
                backBtn.addEventListener('click', function() {
                    NR.state.phoneChatState.emailState.selectedEmail = null;
                    NR.state.phoneChatState.currentScreen = 'email';
                    NR.refreshPhoneModal();
                });
            }
            
            // 删除按钮
            var deleteBtn = document.getElementById('btn-email-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    var email = NR.state.phoneChatState.emailState.selectedEmail;
                    if (email && confirm('确定要删除这封邮件吗？')) {
                        NR.deleteEmail(email.id);
                        NR.state.phoneChatState.emailState.selectedEmail = null;
                        NR.state.phoneChatState.currentScreen = 'email';
                        NR.refreshPhoneModal();
                    }
                });
            }
            
            // 回复按钮
            var replyBtn = document.getElementById('btn-email-reply');
            if (replyBtn) {
                replyBtn.addEventListener('click', function() {
                    var email = NR.state.phoneChatState.emailState.selectedEmail;
                    if (email) {
                        NR.state.phoneChatState.emailState.replyTo = email;
                        NR.state.phoneChatState.currentScreen = 'email-compose';
                        NR.refreshPhoneModal();
                    }
                });
            }
            
            // 收藏按钮
            var starBtn = document.getElementById('btn-email-star');
            if (starBtn) {
                starBtn.addEventListener('click', function() {
                    var email = NR.state.phoneChatState.emailState.selectedEmail;
                    if (email) {
                        email.starred = !email.starred;
                        NR.saveBookData();
                        this.classList.toggle('starred', email.starred);
                    }
                });
            }
        }
        
        // 写邮件界面事件
        if (currentScreen === 'email-compose') {
            // 取消按钮
            var cancelBtn = document.getElementById('btn-email-compose-back');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    NR.state.phoneChatState.emailState.replyTo = null;
                    NR.state.phoneChatState.currentScreen = 'email';
                    NR.refreshPhoneModal();
                });
            }
            
            // 发送按钮
            var sendBtn = document.getElementById('btn-email-send');
            if (sendBtn) {
                sendBtn.addEventListener('click', function() {
                    var to = document.getElementById('email-compose-to').value;
                    var subject = document.getElementById('email-compose-subject').value;
                    var content = document.getElementById('email-compose-content').value;
                    NR.sendUserEmail(to, subject, content);
                });
            }
            
            // 如果是回复，预填充收件人和主题
            var replyTo = NR.state.phoneChatState.emailState.replyTo;
            if (replyTo) {
                var toInput = document.getElementById('email-compose-to');
                var subjectInput = document.getElementById('email-compose-subject');
                if (toInput && replyTo.sender) {
                    toInput.value = replyTo.sender.name || '';
                }
                if (subjectInput && replyTo.title) {
                    subjectInput.value = 'Re: ' + replyTo.title;
                }
            }
        }
    };

})();
