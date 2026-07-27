// 群聊功能模块
(function() {
    var NR = window.NovelReader;

    // ========== 群聊功能 ==========
    
    // 初始化群聊数据结构
    NR.initGroupChatData = function() {
        if (!NR.state.currentBookData.groupChats) {
            NR.state.currentBookData.groupChats = [];
        }
        if (!NR.state.currentBookData.groupChatHistory) {
            NR.state.currentBookData.groupChatHistory = {};
        }
        if (!NR.state.phoneChatState.groupChatState) {
            NR.state.phoneChatState.groupChatState = {
                selectedGroup: null,
                isGenerating: false,
                selectedContexts: []
            };
        }
    };

    // 获取群聊中用户的显示名称（优先使用群聊专属身份）
    NR.getGroupUserRoleDisplayName = function(group) {
        if (!group) {
            return NR.getUserRoleDisplayName();
        }
        
        var groupUserRole = group.userRole;
        if (groupUserRole && groupUserRole.type === 'custom' && groupUserRole.customName) {
            return groupUserRole.customName;
        }
        
        // 使用全局身份
        return NR.getUserRoleDisplayName();
    };

    // 获取群聊中用户的完整身份信息（用于AI提示词）
    NR.getGroupUserRoleInfo = function(group) {
        if (!group) {
            return NR.getUserRoleInfo();
        }
        
        var groupUserRole = group.userRole;
        if (groupUserRole && groupUserRole.type === 'custom') {
            var info = [];
            if (groupUserRole.customName) {
                info.push('名字: ' + groupUserRole.customName);
            }
            if (groupUserRole.customIntro) {
                info.push('身份介绍: ' + groupUserRole.customIntro);
            }
            if (info.length > 0) {
                return info.join('\n');
            }
        }
        
        // 使用全局身份
        return NR.getUserRoleInfo();
    };

    // 获取群聊列表
    NR.getGroupChats = function() {
        NR.initGroupChatData();
        return NR.state.currentBookData.groupChats || [];
    };

    // 获取群聊的聊天记录
    NR.getGroupChatHistory = function(groupName) {
        NR.initGroupChatData();
        return NR.state.currentBookData.groupChatHistory[groupName] || [];
    };

    // 保存群聊的聊天记录
    NR.saveGroupChatHistory = function(groupName, messages) {
        NR.initGroupChatData();
        NR.state.currentBookData.groupChatHistory[groupName] = messages;
        NR.saveBookData();
    };

    // 渲染角色数据界面（消息按钮点击后的界面）
    NR.renderPhoneCharacterDataScreen = function() {
        NR.initGroupChatData();
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var groupChats = NR.getGroupChats();
        var protagonists = profiles.filter(function(p) { return p.isProtagonist; });
        var importantNPCs = profiles.filter(function(p) { return p.isImportant && !p.isProtagonist; });
        var availableCharacters = protagonists.concat(importantNPCs);
        
        var html = '<div class="phone-app-container phone-character-data-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">角色数据</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-add-group-chat" title="添加群聊">+</button>';
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content phone-character-data-content">';
        
        // 角色列表区域
        html += '<div class="character-data-section">';
        html += '<div class="section-header"><i class="fas fa-user"></i> 角色 (' + availableCharacters.length + ')</div>';
        
        if (availableCharacters.length === 0) {
            html += '<div class="section-empty">暂无角色，请先添加人物卡</div>';
        } else {
            html += '<div class="character-list">';
            availableCharacters.forEach(function(profile) {
                var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                html += '<div class="character-item" data-name="' + NR.escapeHtml(profile.name) + '" data-type="private">';
                if (profile.cover) {
                    html += '<div class="character-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    html += '<div class="character-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
                }
                html += '<div class="character-info">';
                html += '<div class="character-name">' + NR.escapeHtml(profile.name) + '</div>';
                html += '<div class="character-id">@' + NR.escapeHtml(profile.name) + '</div>';
                html += '</div>';
                html += '<i class="fas fa-chevron-right character-arrow"></i>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        // 群聊列表区域
        html += '<div class="character-data-section">';
        html += '<div class="section-header"><i class="fas fa-users"></i> 群聊 (' + groupChats.length + ')</div>';
        
        if (groupChats.length === 0) {
            html += '<div class="section-empty">暂无群聊，点击右上角 + 创建</div>';
        } else {
            html += '<div class="group-chat-list">';
            groupChats.forEach(function(group) {
                var memberCount = (group.mainMembers || []).length;
                html += '<div class="group-chat-item" data-name="' + NR.escapeHtml(group.name) + '">';
                if (group.avatar) {
                    html += '<div class="group-avatar" style="background-image: url(' + group.avatar + ');"></div>';
                } else {
                    html += '<div class="group-avatar group-avatar-default"><i class="fas fa-users"></i></div>';
                }
                html += '<div class="group-info">';
                html += '<div class="group-name">' + NR.escapeHtml(group.name) + '</div>';
                html += '<div class="group-members">' + memberCount + ' 位重要成员</div>';
                html += '</div>';
                html += '<i class="fas fa-chevron-right group-arrow"></i>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染群聊详情界面
    NR.renderPhoneGroupChatDetailScreen = function() {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        
        if (!group) {
            return NR.renderPhoneCharacterDataScreen();
        }
        
        var messages = NR.getGroupChatHistory(group.name);
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        var isUserInGroup = NR.isUserInGroupChat(group);
        
        var html = '<div class="phone-app-container phone-group-chat-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-group-chat-back">←</button>';
        html += '<span class="phone-nav-title">' + NR.escapeHtml(group.name) + '</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-group-chat-info" title="群聊详情"><i class="fas fa-users"></i></button>';
        html += '<button class="phone-nav-btn" id="btn-group-chat-context" title="选择上下文">📝</button>';
        html += '<button class="phone-nav-btn" id="btn-group-chat-clear" title="清空聊天记录">🗑️</button>';
        html += '<button class="phone-nav-btn" id="btn-group-chat-delete" title="删除群聊" style="color: #ff4757;">❌</button>';
        html += '</div>';
        html += '</div>';
        
        // 用户身份提示条（显示群聊专属身份或全局身份）
        var showBadge = (group.userRole && group.userRole.type === 'custom' && group.userRole.customName) ||
                        (NR.state.phoneChatState.userRole && NR.state.phoneChatState.userRole.type !== 'default');
        if (showBadge) {
            html += '<div class="phone-user-badge-new">';
            html += '<span>我的身份: ' + NR.escapeHtml(userRoleDisplay) + '</span>';
            html += '</div>';
        }
        
        // 聊天消息区域
        html += '<div class="phone-chat-messages-new group-chat-messages" id="group-chat-messages">';
        
        if (messages.length === 0) {
            html += '<div class="phone-welcome-new">';
            html += '<p>开始群聊吧~</p>';
            html += '</div>';
        } else {
            messages.forEach(function(msg) {
                html += NR.renderGroupChatMessage(msg, group);
            });
        }
        
        // 生成中提示
        if (groupChatState.isGenerating) {
            html += '<div class="group-chat-generating">';
            html += '<div class="typing-indicator">';
            html += '<span class="typing-dot"></span>';
            html += '<span class="typing-dot"></span>';
            html += '<span class="typing-dot"></span>';
            html += '</div>';
            html += '<span class="generating-text">生成中...</span>';
            html += '</div>';
        }
        
        html += '</div>';
        
        // 输入区域
        html += '<div class="phone-chat-input-area">';
        
        // 功能栏（语音、图片、文件、转账、位置）
        html += '<div class="phone-function-bar" id="group-function-bar" style="display: none;">';
        html += '<div class="function-item" data-func="voice"><i class="fas fa-microphone"></i><span>语音</span></div>';
        html += '<div class="function-item" data-func="image"><i class="fas fa-image"></i><span>图片</span></div>';
        html += '<div class="function-item" data-func="file"><i class="fas fa-file-alt"></i><span>文件</span></div>';
        html += '<div class="function-item" data-func="transfer"><i class="fas fa-money-bill-wave"></i><span>转账</span></div>';
        html += '<div class="function-item" data-func="location"><i class="fas fa-map-marker-alt"></i><span>位置</span></div>';
        html += '</div>';
        
        // 语音输入面板
        html += '<div class="phone-extend-panel" id="group-voice-panel" style="display: none;">';
        html += '<div class="extend-panel-header"><i class="fas fa-microphone"></i> 发送语音消息</div>';
        html += '<div class="extend-panel-body">';
        html += '<div class="extend-field"><label>语音内容（转文字）</label>';
        html += '<textarea id="group-voice-text" class="extend-textarea" placeholder="输入语音转文字的内容..."></textarea></div>';
        html += '<div class="extend-field"><label>语音时长</label>';
        html += '<input type="text" id="group-voice-duration" class="extend-input" placeholder="如：0:15"></div>';
        html += '</div>';
        html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-group-send-voice">发送语音</button></div>';
        html += '</div>';
        
        // 图片输入面板
        html += '<div class="phone-extend-panel" id="group-image-panel" style="display: none;">';
        html += '<div class="extend-panel-header"><i class="fas fa-image"></i> 发送图片消息</div>';
        html += '<div class="extend-panel-body">';
        html += '<div class="extend-field"><label>图片描述</label>';
        html += '<textarea id="group-image-desc" class="extend-textarea" placeholder="描述图片内容..."></textarea></div>';
        html += '</div>';
        html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-group-send-image">发送图片</button></div>';
        html += '</div>';
        
        // 文件输入面板
        html += '<div class="phone-extend-panel" id="group-file-panel" style="display: none;">';
        html += '<div class="extend-panel-header"><i class="fas fa-file-alt"></i> 发送文件消息</div>';
        html += '<div class="extend-panel-body">';
        html += '<div class="extend-field"><label>文件名</label>';
        html += '<input type="text" id="group-file-name" class="extend-input" placeholder="如：报告.pdf"></div>';
        html += '<div class="extend-field"><label>文件大小</label>';
        html += '<input type="text" id="group-file-size" class="extend-input" placeholder="如：2.5MB"></div>';
        html += '<div class="extend-field"><label>文件描述（可选）</label>';
        html += '<input type="text" id="group-file-desc" class="extend-input" placeholder="简单描述文件内容"></div>';
        html += '</div>';
        html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-group-send-file">发送文件</button></div>';
        html += '</div>';
        
        // 转账输入面板
        html += '<div class="phone-extend-panel" id="group-transfer-panel" style="display: none;">';
        html += '<div class="extend-panel-header"><i class="fas fa-money-bill-wave"></i> 发送转账</div>';
        html += '<div class="extend-panel-body">';
        html += '<div class="extend-field"><label>转账金额</label>';
        html += '<input type="text" id="group-transfer-amount" class="extend-input" placeholder="如：100.00"></div>';
        html += '<div class="extend-field"><label>转账备注（可选）</label>';
        html += '<input type="text" id="group-transfer-note" class="extend-input" placeholder="如：生日快乐"></div>';
        html += '</div>';
        html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-group-send-transfer">发送转账</button></div>';
        html += '</div>';
        
        // 位置输入面板
        html += '<div class="phone-extend-panel" id="group-location-panel" style="display: none;">';
        html += '<div class="extend-panel-header"><i class="fas fa-map-marker-alt"></i> 发送位置</div>';
        html += '<div class="extend-panel-body">';
        html += '<div class="extend-field"><label>位置名称</label>';
        html += '<input type="text" id="group-location-name" class="extend-input" placeholder="如：星巴克咖啡（中关村店）"></div>';
        html += '<div class="extend-field"><label>距离（可选）</label>';
        html += '<input type="text" id="group-location-distance" class="extend-input" placeholder="如：距你500米"></div>';
        html += '</div>';
        html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-group-send-location">发送位置</button></div>';
        html += '</div>';
        
        // 输入行
        html += '<div class="phone-input-row">';
        if (isUserInGroup) {
            html += '<button class="phone-more-btn" id="btn-group-more" title="更多功能"><i class="fas fa-plus"></i></button>';
            html += '<input type="text" class="phone-chat-input" id="group-chat-input" placeholder="发送消息...">';
            html += '<button class="phone-input-btn-new" id="btn-group-input" title="添加到聊天（不发送AI）">输入</button>';
            html += '<button class="phone-send-btn-new" id="btn-group-send" title="发送给AI">发送</button>';
        } else {
            html += '<input type="text" class="phone-chat-input" disabled placeholder="你不在该群聊中，只能刷新查看">';
            html += '<button class="phone-send-btn-new" id="btn-group-refresh" title="刷新">🔄</button>';
        }
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        
        return html;
    };

    // 渲染单条群聊消息（支持表情包拆分成多个气泡）
    NR.renderGroupChatMessage = function(msg, group) {
        var isMe = msg.isMe || msg.me;
        var msgClass = isMe ? 'phone-msg-user' : 'phone-msg-char';
        var senderName = msg.name || msg.sender || '';
        var content = msg.content || msg.c || '';
        var time = msg.time || '';
        var msgType = msg.type || msg.t || 'text';
        
        var html = '';
        
        // 特殊消息类型（图片、引用、文件、语音、图片描述、转账、位置）不拆分
        if (msgType === 'image' || msgType === 'imgdesc' || msgType === 'text-image' || msgType === 'quote' || msgType === 'file' || msgType === 'voice' || msgType === 'transfer' || msgType === 'transfer-accepted' || msgType === 'transfer-rejected' || msgType === 'location') {
            html += '<div class="phone-message group-message ' + msgClass + '">';
            
            // 非我方消息显示头像
            if (!isMe) {
                var profile = NR.findCharacterProfile(senderName);
                if (profile && profile.cover) {
                    html += '<div class="phone-msg-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    var color = NR.getCharacterColor(senderName, false);
                    html += '<div class="phone-msg-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((senderName || '?')[0]) + '</div>';
                }
            }
            
            html += '<div class="group-msg-wrapper">';
            
            // 显示发送者名字（非我方消息）
            if (!isMe && senderName) {
                html += '<div class="group-msg-sender">' + NR.escapeHtml(senderName) + '</div>';
            }
            
            html += '<div class="phone-msg-bubble">';
            
            if (msgType === 'image') {
                // 图片消息：如果是URL则显示图片，否则显示描述
                var imgContent = content || '';
                var imgDesc = msg.desc || msg.description || '';
                if (imgContent.startsWith('http://') || imgContent.startsWith('https://') || imgContent.startsWith('data:image/')) {
                    html += '<div class="msg-image-container">';
                    html += '<img class="msg-image" src="' + NR.escapeHtml(imgContent) + '" alt="图片" onclick="NR.showImagePreview && NR.showImagePreview(this.src)">';
                    if (imgDesc) {
                        html += '<div class="msg-image-caption">' + NR.escapeHtml(imgDesc) + '</div>';
                    }
                    html += '</div>';
                } else {
                    html += '<div class="msg-image-desc"><i class="fas fa-image"></i> ' + NR.escapeHtml(imgContent || imgDesc || '图片') + '</div>';
                }
            } else if (msgType === 'imgdesc' || msgType === 'text-image') {
                // 图片描述消息
                html += '<div class="msg-image-desc"><i class="fas fa-image"></i> ' + NR.escapeHtml(content) + '</div>';
            } else if (msgType === 'voice') {
                // 语音消息
                var voiceDuration = msg.duration || msg.d || '';
                var voiceText = msg.text || msg.transcript || content || '';
                html += '<div class="msg-voice">';
                html += '<div class="msg-voice-bar">';
                html += '<i class="fas fa-microphone"></i>';
                html += '<div class="msg-voice-waves">';
                html += '<span class="wave"></span><span class="wave"></span><span class="wave"></span><span class="wave"></span>';
                html += '</div>';
                if (voiceDuration) {
                    html += '<span class="msg-voice-duration">' + NR.escapeHtml(voiceDuration) + '</span>';
                }
                html += '</div>';
                if (voiceText) {
                    html += '<div class="msg-voice-text">' + NR.escapeHtml(voiceText) + '</div>';
                }
                html += '</div>';
            } else if (msgType === 'quote') {
                var quote = msg.quote || {};
                html += '<div class="msg-quote-preview">';
                html += '<span class="quote-name">' + NR.escapeHtml(quote.name || '') + '</span>';
                html += '<span class="quote-content">' + NR.escapeHtml(quote.c || quote.content || '') + '</span>';
                html += '</div>';
                html += '<div class="msg-quote-reply">' + NR.escapeHtml(content) + '</div>';
            } else if (msgType === 'file') {
                // 文件消息
                var fileName = msg.name || msg.filename || '文件';
                var fileSize = msg.size || msg.filesize || '';
                var fileDesc = msg.desc || msg.description || '';
                html += '<div class="msg-file">';
                html += '<div class="msg-file-icon"><i class="fas fa-file-alt"></i></div>';
                html += '<div class="msg-file-info">';
                html += '<div class="msg-file-name">' + NR.escapeHtml(fileName) + '</div>';
                if (fileSize) {
                    html += '<div class="msg-file-size">' + NR.escapeHtml(fileSize) + '</div>';
                }
                if (fileDesc) {
                    html += '<div class="msg-file-desc">' + NR.escapeHtml(fileDesc) + '</div>';
                }
                html += '</div>';
                html += '</div>';
            } else if (msgType === 'transfer') {
                // 转账消息
                var amount = msg.amount || msg.amt || '0';
                var note = msg.note || '';
                html += '<div class="msg-transfer">';
                html += '<div class="msg-transfer-header">';
                html += '<i class="fas fa-red-envelope"></i>';
                html += '<span>微信转账</span>';
                html += '</div>';
                html += '<div class="msg-transfer-amount">￥' + NR.escapeHtml(amount) + '</div>';
                if (note) {
                    html += '<div class="msg-transfer-note">' + NR.escapeHtml(note) + '</div>';
                }
                html += '<div class="msg-transfer-footer">请确认收款</div>';
                html += '</div>';
            } else if (msgType === 'transfer-accepted') {
                // 已领取转账
                var amount = msg.amount || msg.amt || '0';
                html += '<div class="msg-transfer msg-transfer-done">';
                html += '<div class="msg-transfer-header">';
                html += '<i class="fas fa-check-circle"></i>';
                html += '<span>已收款</span>';
                html += '</div>';
                html += '<div class="msg-transfer-amount">￥' + NR.escapeHtml(amount) + '</div>';
                html += '</div>';
            } else if (msgType === 'transfer-rejected') {
                // 已拒绝转账
                var amount = msg.amount || msg.amt || '0';
                html += '<div class="msg-transfer msg-transfer-rejected">';
                html += '<div class="msg-transfer-header">';
                html += '<i class="fas fa-times-circle"></i>';
                html += '<span>已退还</span>';
                html += '</div>';
                html += '<div class="msg-transfer-amount">￥' + NR.escapeHtml(amount) + '</div>';
                html += '</div>';
            } else if (msgType === 'location') {
                // 位置消息
                var locationName = msg.partnerLoc || msg.location || content || '位置';
                var distance = msg.dist || msg.distance || '';
                html += '<div class="msg-location">';
                html += '<div class="msg-location-icon"><i class="fas fa-map-marker-alt"></i></div>';
                html += '<div class="msg-location-info">';
                html += '<div class="msg-location-name">' + NR.escapeHtml(locationName) + '</div>';
                if (distance) {
                    html += '<div class="msg-location-distance">' + NR.escapeHtml(distance) + '</div>';
                }
                html += '</div>';
                html += '</div>';
            }
            
            html += '</div>';
            
            if (time) {
                html += '<div class="group-msg-time">' + NR.escapeHtml(time) + '</div>';
            }
            
            html += '</div>';
            html += '</div>';
            
            return html;
        }
        
        // sticker类型直接渲染为表情包
        if (msgType === 'sticker') {
            html += '<div class="phone-message group-message ' + msgClass + ' sticker-only">';
            
            if (!isMe) {
                var profile = NR.findCharacterProfile(senderName);
                if (profile && profile.cover) {
                    html += '<div class="phone-msg-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    var color = NR.getCharacterColor(senderName, false);
                    html += '<div class="phone-msg-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((senderName || '?')[0]) + '</div>';
                }
            }
            
            html += '<div class="group-msg-wrapper">';
            
            if (!isMe && senderName) {
                html += '<div class="group-msg-sender">' + NR.escapeHtml(senderName) + '</div>';
            }
            
            html += '<div class="phone-msg-bubble">';
            var stickerHtml = NR.renderStickerImage ? NR.renderStickerImage(content) : NR.escapeHtml('[' + content + ']');
            html += stickerHtml;
            html += '</div>';
            
            if (time) {
                html += '<div class="group-msg-time">' + NR.escapeHtml(time) + '</div>';
            }
            
            html += '</div>';
            html += '</div>';
            
            return html;
        }
        
        // 用户自己发送的消息不拆分，直接渲染
        if (isMe) {
            html += '<div class="phone-message group-message ' + msgClass + '">';
            html += '<div class="group-msg-wrapper">';
            html += '<div class="phone-msg-bubble">';
            var renderedContent = NR.replaceStickersInText ? NR.replaceStickersInText(NR.escapeHtml(content)) : NR.escapeHtml(content);
            html += renderedContent;
            html += '</div>';
            if (time) {
                html += '<div class="group-msg-time">' + NR.escapeHtml(time) + '</div>';
            }
            html += '</div>';
            html += '</div>';
            return html;
        }
        
        // AI生成的消息：使用与单独聊天相同的逻辑，将表情包和文字分开成多个气泡
        var bubbles = NR.splitMessageIntoBubbles ? NR.splitMessageIntoBubbles(content) : [{ text: content, isSticker: false }];
        var isFirstBubble = true;
        
        bubbles.forEach(function(bubble, index) {
            var isStickerOnly = bubble.isSticker;
            var isLastBubble = index === bubbles.length - 1;
            
            html += '<div class="phone-message group-message ' + msgClass + (isStickerOnly ? ' sticker-only' : '') + '">';
            
            // 非我方消息显示头像
            if (!isMe) {
                var profile = NR.findCharacterProfile(senderName);
                if (profile && profile.cover) {
                    html += '<div class="phone-msg-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    var color = NR.getCharacterColor(senderName, false);
                    html += '<div class="phone-msg-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((senderName || '?')[0]) + '</div>';
                }
            }
            
            html += '<div class="group-msg-wrapper">';
            
            // 只在第一个气泡显示发送者名字
            if (!isMe && senderName && isFirstBubble) {
                html += '<div class="group-msg-sender">' + NR.escapeHtml(senderName) + '</div>';
            }
            
            html += '<div class="phone-msg-bubble">';
            
            if (isStickerOnly) {
                var stickerHtml = NR.renderStickerImage ? NR.renderStickerImage(bubble.text) : NR.escapeHtml('[' + bubble.text + ']');
                html += stickerHtml;
            } else {
                var renderedContent = NR.replaceStickersInText ? NR.replaceStickersInText(NR.escapeHtml(bubble.text)) : NR.escapeHtml(bubble.text);
                html += renderedContent;
            }
            
            html += '</div>';
            
            // 只在最后一个气泡显示时间
            if (time && isLastBubble) {
                html += '<div class="group-msg-time">' + NR.escapeHtml(time) + '</div>';
            }
            
            html += '</div>';
            html += '</div>';
            
            isFirstBubble = false;
        });
        
        return html;
    };

    // 查找角色资料
    NR.findCharacterProfile = function(name) {
        var profiles = NR.state.currentBookData.characterProfiles || [];
        return profiles.find(function(p) { return p.name === name; });
    };

    // 检查用户是否在群聊中
    NR.isUserInGroupChat = function(group) {
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        var mainMembers = group.mainMembers || [];
        return mainMembers.includes(userRoleDisplay);
    };

    // 渲染群聊详情/编辑界面
    NR.renderPhoneGroupChatInfoScreen = function() {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        var isNew = !group;
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var protagonists = profiles.filter(function(p) { return p.isProtagonist; });
        var importantNPCs = profiles.filter(function(p) { return p.isImportant && !p.isProtagonist; });
        var availableCharacters = protagonists.concat(importantNPCs);
        
        var groupName = group ? group.name : '';
        var groupAvatar = group ? (group.avatar || '') : '';
        var mainMembers = group ? (group.mainMembers || []) : [];
        var otherMembers = group ? (group.otherMembers || '') : '';
        var description = group ? (group.description || '') : '';
        
        var html = '<div class="phone-app-container phone-group-info-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-group-info-back">←</button>';
        if (!isNew) {
            html += '<button class="phone-nav-btn group-save-btn" id="btn-group-save" title="保存"><i class="fas fa-save"></i></button>';
        }
        html += '<span class="phone-nav-title">群聊详情</span>';
        html += '<div class="phone-nav-right">';
        if (!isNew) {
            html += '<button class="phone-nav-btn group-delete-btn" id="btn-group-delete" title="删除群聊"><i class="fas fa-trash"></i></button>';
        }
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content phone-group-info-content">';
        
        // 群头像
        html += '<div class="group-info-avatar-section">';
        if (groupAvatar) {
            html += '<div class="group-info-avatar" style="background-image: url(' + groupAvatar + ');">';
        } else {
            html += '<div class="group-info-avatar group-avatar-default">';
            html += '<i class="fas fa-users"></i>';
        }
        html += '<label class="avatar-upload-btn" title="上传头像">';
        html += '<i class="fas fa-camera"></i>';
        html += '<input type="file" id="group-avatar-input" accept="image/*" style="display: none;">';
        html += '</label>';
        html += '</div>';
        html += '</div>';
        
        // 群名称
        html += '<div class="group-info-field">';
        html += '<label class="field-label">群聊名称</label>';
        html += '<input type="text" class="field-input" id="group-name-input" placeholder="群聊名称" value="' + NR.escapeHtml(groupName) + '">';
        html += '</div>';
        
        // 我的身份选择
        var userRole = NR.state.phoneChatState.userRole || { type: 'default' };
        var currentUserName = NR.getUserRoleDisplayName();
        var groupUserRole = group ? (group.userRole || null) : null;
        
        html += '<div class="group-info-section">';
        html += '<div class="section-header"><i class="fas fa-user-circle"></i> 我的身份</div>';
        html += '<div class="group-user-role-selector">';
        
        // 使用全局身份选项
        var useGlobalSelected = !groupUserRole || groupUserRole.type === 'global';
        html += '<div class="group-role-option' + (useGlobalSelected ? ' selected' : '') + '" data-role-type="global">';
        html += '<div class="role-option-radio">' + (useGlobalSelected ? '●' : '○') + '</div>';
        html += '<div class="role-option-info">';
        html += '<div class="role-option-title">使用全局身份</div>';
        html += '<div class="role-option-desc">当前: ' + NR.escapeHtml(currentUserName) + '</div>';
        html += '</div>';
        html += '</div>';
        
        // 自定义身份选项
        var useCustomSelected = groupUserRole && groupUserRole.type === 'custom';
        var customName = (groupUserRole && groupUserRole.customName) || '';
        var customIntro = (groupUserRole && groupUserRole.customIntro) || '';
        html += '<div class="group-role-option' + (useCustomSelected ? ' selected' : '') + '" data-role-type="custom">';
        html += '<div class="role-option-radio">' + (useCustomSelected ? '●' : '○') + '</div>';
        html += '<div class="role-option-info">';
        html += '<div class="role-option-title">自定义身份</div>';
        html += '<div class="role-option-desc">为此群聊设置专属身份</div>';
        html += '</div>';
        html += '</div>';
        
        // 自定义身份表单（仅在选中时显示）
        html += '<div class="group-custom-role-form" id="group-custom-role-form" style="display:' + (useCustomSelected ? 'block' : 'none') + ';">';
        html += '<div class="group-info-field" style="margin-bottom: 8px;">';
        html += '<label class="field-label">名字</label>';
        html += '<input type="text" class="field-input" id="group-custom-name" placeholder="输入你在群里的名字" value="' + NR.escapeHtml(customName) + '">';
        html += '</div>';
        html += '<div class="group-info-field" style="margin-bottom: 0;">';
        html += '<label class="field-label">身份介绍</label>';
        html += '<textarea class="field-textarea" id="group-custom-intro" placeholder="描述你的身份、与群成员的关系等...">' + NR.escapeHtml(customIntro) + '</textarea>';
        html += '</div>';
        html += '</div>';
        
        html += '</div>'; // end group-user-role-selector
        html += '</div>'; // end group-info-section
        
        // 重要人物选择
        html += '<div class="group-info-section">';
        html += '<div class="section-header"><i class="fas fa-star"></i> 重要人物 <span class="member-count">' + mainMembers.length + '人</span></div>';
        
        html += '<div class="member-select-list">';
        
        // 添加"我"选项（根据身份设置动态获取名字）
        var myDisplayName = currentUserName; // 使用全局身份名字作为默认
        if (useCustomSelected && customName) {
            myDisplayName = customName; // 如果选择了自定义身份且有名字，使用自定义名字
        }
        var isMeSelected = mainMembers.includes(myDisplayName) || mainMembers.includes(currentUserName) || (useCustomSelected && customName && mainMembers.includes(customName));
        html += '<div class="member-select-item member-select-me' + (isMeSelected ? ' selected' : '') + '" data-name="__ME__" data-is-me="true">';
        html += '<div class="member-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff;"><i class="fas fa-user"></i></div>';
        html += '<span class="member-name">我 (' + NR.escapeHtml(myDisplayName) + ')</span>';
        if (isMeSelected) {
            html += '<i class="fas fa-check member-check"></i>';
        }
        html += '</div>';
        
        // 添加角色列表
        if (availableCharacters.length > 0) {
            availableCharacters.forEach(function(profile) {
                var isSelected = mainMembers.includes(profile.name);
                var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                html += '<div class="member-select-item' + (isSelected ? ' selected' : '') + '" data-name="' + NR.escapeHtml(profile.name) + '">';
                if (profile.cover) {
                    html += '<div class="member-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    html += '<div class="member-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
                }
                html += '<span class="member-name">' + NR.escapeHtml(profile.name) + '</span>';
                if (isSelected) {
                    html += '<i class="fas fa-check member-check"></i>';
                }
                html += '</div>';
            });
        }
        html += '</div>'; // end member-select-list
        html += '</div>'; // end group-info-section
        
        // 其他成员
        html += '<div class="group-info-field">';
        html += '<label class="field-label">其他成员</label>';
        html += '<input type="text" class="field-input" id="group-other-members-input" placeholder="如：3班的其他学生和老师" value="' + NR.escapeHtml(otherMembers) + '">';
        html += '</div>';
        
        // 群聊简介
        html += '<div class="group-info-field">';
        html += '<label class="field-label">群聊简介</label>';
        html += '<textarea class="field-textarea" id="group-description-input" placeholder="描述群聊的背景、目的等...">' + NR.escapeHtml(description) + '</textarea>';
        html += '</div>';
        
        // 保存按钮（新建时显示）
        if (isNew) {
            html += '<div class="group-info-footer">';
            html += '<button class="group-create-btn" id="btn-group-create">创建群聊</button>';
            html += '</div>';
        }
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 保存群聊信息
    NR.saveGroupChat = function(groupData) {
        NR.initGroupChatData();
        var groupChats = NR.state.currentBookData.groupChats;
        var existingIndex = groupChats.findIndex(function(g) { return g.id === groupData.id; });
        
        if (existingIndex > -1) {
            groupChats[existingIndex] = groupData;
        } else {
            groupData.id = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            groupChats.push(groupData);
        }
        
        NR.saveBookData();
        return groupData;
    };

    // 删除群聊
    NR.deleteGroupChat = function(groupId) {
        NR.initGroupChatData();
        var groupChats = NR.state.currentBookData.groupChats;
        var index = groupChats.findIndex(function(g) { return g.id === groupId; });
        
        if (index > -1) {
            var groupName = groupChats[index].name;
            groupChats.splice(index, 1);
            // 同时删除聊天记录
            delete NR.state.currentBookData.groupChatHistory[groupName];
            NR.saveBookData();
        }
    };

    // 获取群成员的单聊记忆（用于群聊时注入）
    NR.getMembersPrivateChatMemory = function(memberNames) {
        var phoneChatHistory = NR.state.currentBookData.phoneChatHistory || {};
        var memories = [];
        
        memberNames.forEach(function(memberName) {
            var history = phoneChatHistory[memberName];
            if (history && history.length > 0) {
                // 获取最近10条消息
                var recentMessages = history.slice(-10);
                var userRoleDisplay = NR.getUserRoleDisplayName();
                var memoryMessages = recentMessages.map(function(m) {
                    var sender = m.role === 'user' ? userRoleDisplay : memberName;
                    return sender + ': ' + (m.content || '');
                });
                memories.push({
                    characterName: memberName,
                    messages: memoryMessages
                });
            }
        });
        
        return memories;
    };


    // 发送群聊消息（调用AI）
    NR.sendGroupChatMessage = function(userMessage) {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        
        if (!group) return;
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        if (groupChatState.isGenerating) return;
        
        var messages = NR.getGroupChatHistory(group.name);
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        var isUserInGroup = NR.isUserInGroupChat(group);
        
        // 如果用户在群里且有输入，添加用户消息
        if (isUserInGroup && userMessage && userMessage.trim()) {
            var userMsg = {
                id: 'msg_' + Date.now(),
                name: userRoleDisplay,
                content: userMessage.trim(),
                time: NR.formatPhoneTime(),
                type: 'text',
                isMe: true
            };
            messages.push(userMsg);
            NR.saveGroupChatHistory(group.name, messages);
        }
        
        groupChatState.isGenerating = true;
        NR.refreshPhoneModal();
        
        // 构建群聊信息
        var groupInfo = NR.buildGroupChatInfo(group);
        
        // 收集用户最近发送的消息
        var recentUserMessages = messages.filter(function(m) { return m.isMe; }).slice(-5);
        var userMessagesText = recentUserMessages.map(function(m) {
            return '[' + (m.type || 'text') + '] ' + (m.content || m.c || '');
        });
        
        // 获取选中的上下文
        var selectedContexts = groupChatState.selectedContexts || [];
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
        
        // 获取用户身份信息（用于AI提示词）
        var userRoleInfo = NR.getGroupUserRoleInfo(group);
        
        // 构建提示词
        var prompt = '';
        if (isUserInGroup) {
            if (userMessagesText.length === 0) {
                prompt = '群聊"' + group.name + '"中\n我方没有发言，让群成员继续聊天，请按照格式要求生成群聊消息';
            } else {
                prompt = '群聊"' + group.name + '"中\n' + userRoleDisplay + '（我方）发送：\n' + userMessagesText.join('\n') + '\n请按照格式要求生成群聊消息';
            }
        } else {
            prompt = '这个群聊中的人认为用户看不到群聊中的内容。\n群聊"' + group.name + '"中\n用户不在群聊里，让群成员继续聊天，请按照格式要求生成群聊消息';
        }
        
        // 构建完整的系统提示
        var systemPrompt = '你是一个角色扮演助手，请为群聊生成消息。\n\n';
        systemPrompt += groupInfo;
        
        // 添加用户身份信息
        if (userRoleInfo && isUserInGroup) {
            systemPrompt += '\n\n【我方（' + userRoleDisplay + '）的身份信息】\n';
            systemPrompt += userRoleInfo;
        }
        
        systemPrompt += contextText;
        systemPrompt += '\n\n【重要人物信息】\n';
        
        // 添加重要人物的详细信息
        var mainMembers = group.mainMembers || [];
        mainMembers.forEach(function(memberName) {
            var profile = NR.findCharacterProfile(memberName);
            if (profile) {
                systemPrompt += '\n--- ' + memberName + ' ---\n';
                systemPrompt += NR.getCharacterTagsInfo(profile);
            }
        });
        
        // 添加群成员的单聊记忆
        var privateChatMemories = NR.getMembersPrivateChatMemory(mainMembers);
        if (privateChatMemories.length > 0) {
            systemPrompt += '\n\n【私聊记忆】\n以下是群成员与用户的私聊记录，可以在群聊中参考：\n';
            privateChatMemories.forEach(function(memory) {
                systemPrompt += '\n--- 与 ' + memory.characterName + ' 的私聊 ---\n';
                systemPrompt += memory.messages.join('\n') + '\n';
            });
        }
        
        // 添加最近的聊天记录作为参考
        var recentMessages = messages.slice(-20);
        if (recentMessages.length > 0) {
            systemPrompt += '\n\n【最近的聊天记录】\n';
            recentMessages.forEach(function(m) {
                var sender = m.isMe ? userRoleDisplay : (m.name || '未知');
                systemPrompt += sender + ': ' + (m.content || m.c || '') + '\n';
            });
        }
        
        systemPrompt += '\n\n【输出格式要求】\n';
        systemPrompt += '请严格按照以下YAML格式输出群聊消息：\n\n';
        systemPrompt += '```yaml\n';
        systemPrompt += 'group_message:\n';
        systemPrompt += '  date: "' + NR.getPhoneDateString() + '"\n';
        systemPrompt += '  time: "' + NR.formatPhoneTime() + '"\n';
        systemPrompt += '  messages:\n';
        systemPrompt += '    - name: "发送者名字"\n';
        systemPrompt += '      t: text  # 消息类型: text/image/sticker/quote/file/voice/imgdesc\n';
        systemPrompt += '      c: "消息内容"\n';
        systemPrompt += '      time: "HH:MM"\n';
        systemPrompt += '    - name: "另一个发送者"\n';
        systemPrompt += '      t: voice  # 语音消息示例\n';
        systemPrompt += '      c: "语音转文字内容"\n';
        systemPrompt += '      d: "0:15"  # 语音时长\n';
        systemPrompt += '      time: "HH:MM"\n';
        systemPrompt += '    - name: "发送者"\n';
        systemPrompt += '      t: file  # 文件消息示例\n';
        systemPrompt += '      name: "文件名.pdf"\n';
        systemPrompt += '      size: "2.5MB"\n';
        systemPrompt += '      desc: "文件描述（可选）"\n';
        systemPrompt += '      time: "HH:MM"\n';
        systemPrompt += '    - name: "发送者"\n';
        systemPrompt += '      t: imgdesc  # 图片描述消息\n';
        systemPrompt += '      c: "图片内容描述"\n';
        systemPrompt += '      time: "HH:MM"\n';
        systemPrompt += '    - name: "发送者"\n';
        systemPrompt += '      t: transfer  # 转账消息\n';
        systemPrompt += '      amt: "520.00"  # 金额\n';
        systemPrompt += '      note: "转账备注（可选）"\n';
        systemPrompt += '      time: "HH:MM"\n';
        systemPrompt += '    - name: "发送者"\n';
        systemPrompt += '      t: location  # 位置消息\n';
        systemPrompt += '      partnerLoc: "位置名称，如：星巴克咖啡（中关村店）"\n';
        systemPrompt += '      dist: "距离（可选），如：距你500m"\n';
        systemPrompt += '      time: "HH:MM"\n';
        systemPrompt += '```\n\n';
        
        systemPrompt += '【消息类型说明】\n';
        systemPrompt += '- text: 普通文字消息\n';
        systemPrompt += '- sticker: 表情包消息，c为表情包名称\n';
        systemPrompt += '- image: 图片消息，c为图片URL或描述\n';
        systemPrompt += '- imgdesc: 图片描述消息，c为图片内容描述（用于描述发送的图片内容）\n';
        systemPrompt += '- voice: 语音消息，c为语音转文字内容，d为时长如"0:15"\n';
        systemPrompt += '- file: 文件消息，需要name(文件名)、size(大小)、desc(描述，可选)\n';
        systemPrompt += '- quote: 引用消息，需要quote对象包含name和c\n';
        systemPrompt += '- transfer: 转账消息，需要amt(金额)、note(备注，可选)\n';
        systemPrompt += '- location: 位置消息，需要partnerLoc(位置名称)、dist(距离，可选)\n\n';
        
        // 添加表情包使用说明
        var stickerList = NR.WECHAT_STICKERS ? Object.keys(NR.WECHAT_STICKERS).join('、') : '';
        if (stickerList) {
            systemPrompt += '【表情包使用】\n';
            systemPrompt += '你可以在回复中使用表情包来表达情绪，格式为 [表情包名称]。\n';
            systemPrompt += '可用的表情包：' + stickerList + '\n';
            systemPrompt += '使用示例：\n';
            systemPrompt += '- "好的呀 [开心]"\n';
            systemPrompt += '- "[害羞] 你说什么呢..."\n';
            systemPrompt += '- "哼！[生气]"\n';
            systemPrompt += '注意：表情包名称必须完全匹配，每条消息最多使用1-2个表情包，不要过度使用。\n\n';
        }
        
        systemPrompt += '【内容要求】\n';
        systemPrompt += '1. 生成3-8条消息，每条消息来自不同或相同的群成员\n';
        systemPrompt += '2. 消息内容要符合角色性格和群聊氛围\n';
        systemPrompt += '3. 不要代替用户（' + userRoleDisplay + '）发言，me字段不要设为true\n';
        systemPrompt += '4. 时间格式为 HH:MM，应该比上一条消息稍晚\n';
        systemPrompt += '5. 可以使用表情包，在文字消息中用 [表情包名称] 格式嵌入\n';
        
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
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
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
            
            // 解析YAML格式的群聊消息
            var parsedMessages = NR.parseGroupChatYaml(content);
            
            if (parsedMessages && parsedMessages.length > 0) {
                // 添加新消息到历史记录
                parsedMessages.forEach(function(msg) {
                    msg.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    msg.isMe = false;
                    messages.push(msg);
                });
                
                NR.saveGroupChatHistory(group.name, messages);
                console.info('[GroupChat] 群聊消息生成成功:', parsedMessages.length, '条');
            } else {
                throw new Error('无法解析群聊消息');
            }
            
            groupChatState.isGenerating = false;
            NR.refreshPhoneModal();
            
            // 滚动到底部
            setTimeout(function() {
                var messagesContainer = document.getElementById('group-chat-messages');
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }, 100);
            
        }).catch(function(err) {
            console.error('[GroupChat] 生成群聊消息失败:', err);
            groupChatState.isGenerating = false;
            alert('生成群聊消息失败: ' + err.message);
            NR.refreshPhoneModal();
        });
    };

    // 构建群聊信息
    NR.buildGroupChatInfo = function(group) {
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        var mainMembers = group.mainMembers || [];
        var isUserInGroup = mainMembers.includes(userRoleDisplay);
        
        var info = [];
        info.push('【群聊基本信息】');
        info.push('群聊名称: ' + group.name);
        info.push('群聊成员包含我方(' + userRoleDisplay + '): ' + (isUserInGroup ? '是' : '否'));
        info.push('重要人物: ' + (mainMembers.length > 0 ? mainMembers.join('、') : '无'));
        info.push('重要人物是否包含我方: ' + (isUserInGroup ? '是' : '否'));
        
        if (group.otherMembers) {
            info.push('其他成员: ' + group.otherMembers);
        }
        if (group.description) {
            info.push('群聊简介: ' + group.description);
        }
        
        return info.join('\n');
    };

    // 解析YAML格式的群聊消息
    NR.parseGroupChatYaml = function(content) {
        try {
            // 提取yaml代码块
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            // 尝试提取 group_message 标签内容
            var tagMatch = yamlContent.match(/<group_message[^>]*>([\s\S]*?)<\/group_message>/i);
            if (tagMatch) {
                yamlContent = tagMatch[1].trim();
            }
            
            // 简单解析messages数组
            var messages = [];
            var messageBlocks = yamlContent.split(/\n\s*-\s+name:/);
            
            for (var i = 1; i < messageBlocks.length; i++) {
                var block = 'name:' + messageBlocks[i];
                var msg = {};
                
                // 解析name
                var nameMatch = block.match(/name:\s*["']?([^"'\n]+)["']?/);
                if (nameMatch) msg.name = nameMatch[1].trim();
                
                // 解析t (type)
                var typeMatch = block.match(/t:\s*["']?([^"'\n]+)["']?/);
                msg.type = typeMatch ? typeMatch[1].trim() : 'text';
                
                // 解析c (content)
                var contentMatch = block.match(/c:\s*["']?([^"'\n]+)["']?/);
                if (contentMatch) msg.content = contentMatch[1].trim();
                
                // 解析time
                var timeMatch = block.match(/time:\s*["']?([^"'\n]+)["']?/);
                if (timeMatch) msg.time = timeMatch[1].trim();
                
                // 解析me
                var meMatch = block.match(/me:\s*(true|false)/i);
                msg.isMe = meMatch ? meMatch[1].toLowerCase() === 'true' : false;
                
                // 解析voice消息的duration (d)
                var durationMatch = block.match(/d:\s*["']?([^"'\n]+)["']?/);
                if (durationMatch) msg.duration = durationMatch[1].trim();
                
                // 解析file消息的字段
                // 文件名 (name字段，但要区分发送者name)
                var fileNameMatch = block.match(/\n\s+name:\s*["']?([^"'\n]+)["']?/);
                if (fileNameMatch && msg.type === 'file') {
                    msg.filename = fileNameMatch[1].trim();
                }
                
                // 文件大小 (size)
                var sizeMatch = block.match(/size:\s*["']?([^"'\n]+)["']?/);
                if (sizeMatch) msg.size = sizeMatch[1].trim();
                
                // 描述 (desc)
                var descMatch = block.match(/desc:\s*["']?([^"'\n]+)["']?/);
                if (descMatch) msg.desc = descMatch[1].trim();
                
                // 解析quote消息
                if (msg.type === 'quote') {
                    var quoteNameMatch = block.match(/quote:\s*\n\s+name:\s*["']?([^"'\n]+)["']?/);
                    var quoteCMatch = block.match(/quote:\s*\n[^]*?c:\s*["']?([^"'\n]+)["']?/);
                    if (quoteNameMatch || quoteCMatch) {
                        msg.quote = {
                            name: quoteNameMatch ? quoteNameMatch[1].trim() : '',
                            c: quoteCMatch ? quoteCMatch[1].trim() : ''
                        };
                    }
                }
                
                // 解析transfer消息的字段
                if (msg.type === 'transfer' || msg.type === 'transfer-accepted' || msg.type === 'transfer-rejected') {
                    var amtMatch = block.match(/amt:\s*["']?([^"'\n]+)["']?/);
                    if (amtMatch) msg.amount = amtMatch[1].trim();
                    var noteMatch = block.match(/note:\s*["']?([^"'\n]+)["']?/);
                    if (noteMatch) msg.note = noteMatch[1].trim();
                }
                
                // 解析location消息的字段
                if (msg.type === 'location') {
                    var partnerLocMatch = block.match(/partnerLoc:\s*["']?([^"'\n]+)["']?/);
                    if (partnerLocMatch) msg.partnerLoc = partnerLocMatch[1].trim();
                    var distMatch = block.match(/dist:\s*["']?([^"'\n]+)["']?/);
                    if (distMatch) msg.dist = distMatch[1].trim();
                }
                
                if (msg.name && (msg.content || msg.filename || msg.amount || msg.partnerLoc)) {
                    messages.push(msg);
                }
            }
            
            return messages;
        } catch (e) {
            console.error('[GroupChat] 解析群聊YAML失败:', e);
            return null;
        }
    };

    // 添加用户消息到群聊（不调用AI）
    NR.addGroupChatMessageLocal = function(userMessage) {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        
        if (!group || !userMessage || !userMessage.trim()) return;
        
        var messages = NR.getGroupChatHistory(group.name);
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        
        var userMsg = {
            id: 'msg_' + Date.now(),
            name: userRoleDisplay,
            content: userMessage.trim(),
            time: NR.formatPhoneTime(),
            type: 'text',
            isMe: true
        };
        
        messages.push(userMsg);
        NR.saveGroupChatHistory(group.name, messages);
        NR.refreshPhoneModal();
        
        // 滚动到底部
        setTimeout(function() {
            var messagesContainer = document.getElementById('group-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    };

    // 添加语音消息到群聊
    NR.addGroupChatVoiceMessage = function(voiceText, duration) {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        
        if (!group || !voiceText) return;
        
        var messages = NR.getGroupChatHistory(group.name);
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        
        var voiceMsg = {
            id: 'msg_' + Date.now(),
            name: userRoleDisplay,
            content: voiceText,
            text: voiceText,
            duration: duration || '0:10',
            time: NR.formatPhoneTime(),
            type: 'voice',
            isMe: true
        };
        
        messages.push(voiceMsg);
        NR.saveGroupChatHistory(group.name, messages);
        NR.refreshPhoneModal();
        
        setTimeout(function() {
            var messagesContainer = document.getElementById('group-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    };

    // 添加图片消息到群聊
    NR.addGroupChatImageMessage = function(imageDesc) {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        
        if (!group || !imageDesc) return;
        
        var messages = NR.getGroupChatHistory(group.name);
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        
        var imageMsg = {
            id: 'msg_' + Date.now(),
            name: userRoleDisplay,
            content: imageDesc,
            time: NR.formatPhoneTime(),
            type: 'imgdesc',
            isMe: true
        };
        
        messages.push(imageMsg);
        NR.saveGroupChatHistory(group.name, messages);
        NR.refreshPhoneModal();
        
        setTimeout(function() {
            var messagesContainer = document.getElementById('group-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    };

    // 添加文件消息到群聊
    NR.addGroupChatFileMessage = function(fileName, fileSize, fileDesc) {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        
        if (!group || !fileName) return;
        
        var messages = NR.getGroupChatHistory(group.name);
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        
        var fileMsg = {
            id: 'msg_' + Date.now(),
            name: userRoleDisplay,
            filename: fileName,
            size: fileSize || '',
            desc: fileDesc || '',
            time: NR.formatPhoneTime(),
            type: 'file',
            isMe: true
        };
        
        messages.push(fileMsg);
        NR.saveGroupChatHistory(group.name, messages);
        NR.refreshPhoneModal();
        
        setTimeout(function() {
            var messagesContainer = document.getElementById('group-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    };

    // 添加转账消息到群聊
    NR.addGroupChatTransferMessage = function(amount, note) {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        
        if (!group || !amount) return;
        
        var messages = NR.getGroupChatHistory(group.name);
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        
        var transferMsg = {
            id: 'msg_' + Date.now(),
            name: userRoleDisplay,
            amt: amount,
            note: note || '',
            time: NR.formatPhoneTime(),
            type: 'transfer',
            isMe: true
        };
        
        messages.push(transferMsg);
        NR.saveGroupChatHistory(group.name, messages);
        NR.refreshPhoneModal();
        
        setTimeout(function() {
            var messagesContainer = document.getElementById('group-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    };

    // 添加位置消息到群聊
    NR.addGroupChatLocationMessage = function(locationName, distance) {
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var group = groupChatState.selectedGroup;
        
        if (!group || !locationName) return;
        
        var messages = NR.getGroupChatHistory(group.name);
        var userRoleDisplay = NR.getGroupUserRoleDisplayName(group);
        
        var locationMsg = {
            id: 'msg_' + Date.now(),
            name: userRoleDisplay,
            partnerLoc: locationName,
            dist: distance || '',
            time: NR.formatPhoneTime(),
            type: 'location',
            isMe: true
        };
        
        messages.push(locationMsg);
        NR.saveGroupChatHistory(group.name, messages);
        NR.refreshPhoneModal();
        
        setTimeout(function() {
            var messagesContainer = document.getElementById('group-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    };

    // 显示群聊上下文选择弹窗
    NR.showGroupChatContextModal = function() {
        var existingModal = document.getElementById('group-context-modal');
        if (existingModal) existingModal.remove();
        
        var groupChatState = NR.state.phoneChatState.groupChatState;
        var summaries = NR.state.currentBookData.summaries || [];
        var selectedContexts = groupChatState.selectedContexts || [];
        
        var html = '<div id="group-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="phone-context-body">';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，请先使用总结功能生成一些内容摘要</p>';
        } else {
            html += '<p class="hint" style="margin-bottom: 10px;">选择的总结将作为群聊生成的背景信息发送给AI</p>';
            html += '<div class="phone-context-list">';
            summaries.slice().sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(s, idx) {
                var isChecked = selectedContexts.indexOf(idx) !== -1;
                html += '<label class="phone-context-item">';
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
        html += '<button class="control-button" id="btn-confirm-group-context">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('group-context-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        // 绑定确定按钮
        document.getElementById('btn-confirm-group-context').addEventListener('click', function() {
            var checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            groupChatState.selectedContexts = [];
            checkboxes.forEach(function(cb) {
                if (cb.checked) {
                    groupChatState.selectedContexts.push(parseInt(cb.dataset.index));
                }
            });
            modal.remove();
            NR.refreshPhoneModal();
        });
    };

    // 绑定群聊相关事件
    NR.bindGroupChatEvents = function(modal) {
        // 添加群聊按钮
        var addGroupBtn = document.getElementById('btn-add-group-chat');
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', function() {
                NR.state.phoneChatState.groupChatState.selectedGroup = null;
                NR.state.phoneChatState.currentScreen = 'group-chat-info';
                NR.refreshPhoneModal();
            });
        }
        
        // 角色列表点击（进入私聊）
        modal.querySelectorAll('.character-item[data-type="private"]').forEach(function(item) {
            item.addEventListener('click', function() {
                var name = this.dataset.name;
                var profiles = NR.state.currentBookData.characterProfiles || [];
                var profile = profiles.find(function(p) { return p.name === name; });
                
                if (profile) {
                    NR.state.phoneChatState.selectedCharacter = profile;
                    NR.state.phoneChatState.currentScreen = 'chat';
                    var phoneChatHistory = NR.state.currentBookData.phoneChatHistory || {};
                    NR.state.phoneChatState.chatHistory = phoneChatHistory[profile.name] || [];
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 群聊列表点击
        modal.querySelectorAll('.group-chat-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var groupName = this.dataset.name;
                var groupChats = NR.getGroupChats();
                var group = groupChats.find(function(g) { return g.name === groupName; });
                
                if (group) {
                    NR.state.phoneChatState.groupChatState.selectedGroup = group;
                    NR.state.phoneChatState.currentScreen = 'group-chat-detail';
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 群聊详情返回按钮
        var groupBackBtn = document.getElementById('btn-group-chat-back');
        if (groupBackBtn) {
            groupBackBtn.addEventListener('click', function() {
                NR.state.phoneChatState.groupChatState.selectedGroup = null;
                NR.state.phoneChatState.currentScreen = 'character-data';
                NR.refreshPhoneModal();
            });
        }
        
        // 群聊详情按钮
        var groupInfoBtn = document.getElementById('btn-group-chat-info');
        if (groupInfoBtn) {
            groupInfoBtn.addEventListener('click', function() {
                NR.state.phoneChatState.currentScreen = 'group-chat-info';
                NR.refreshPhoneModal();
            });
        }
        
        // 群聊上下文按钮
        var groupContextBtn = document.getElementById('btn-group-chat-context');
        if (groupContextBtn) {
            groupContextBtn.addEventListener('click', function() {
                NR.showGroupChatContextModal();
            });
        }
        
        // 清空群聊记录
        var groupClearBtn = document.getElementById('btn-group-chat-clear');
        if (groupClearBtn) {
            groupClearBtn.addEventListener('click', function() {
                var group = NR.state.phoneChatState.groupChatState.selectedGroup;
                if (group && confirm('确定要清空群聊记录吗？')) {
                    NR.saveGroupChatHistory(group.name, []);
                    NR.refreshPhoneModal();
                }
            });
        }
        
        // 删除群聊（包括聊天记录）
        var groupDeleteBtn = document.getElementById('btn-group-chat-delete');
        if (groupDeleteBtn) {
            groupDeleteBtn.addEventListener('click', function() {
                var group = NR.state.phoneChatState.groupChatState.selectedGroup;
                if (group && confirm('确定要删除群聊"' + group.name + '"吗？\n该操作将同时删除所有聊天记录，且无法恢复！')) {
                    NR.deleteGroupChat(group.id);
                    NR.state.phoneChatState.groupChatState.selectedGroup = null;
                    NR.state.phoneChatState.currentScreen = 'character-data';
                    NR.refreshPhoneModal();
                }
            });
        }
        
        // 群聊发送消息
        var groupSendBtn = document.getElementById('btn-group-send');
        var groupInput = document.getElementById('group-chat-input');
        if (groupSendBtn && groupInput) {
            var sendGroupMessage = function() {
                var msg = groupInput.value.trim();
                groupInput.value = '';
                NR.sendGroupChatMessage(msg);
            };
            
            groupSendBtn.addEventListener('click', sendGroupMessage);
            groupInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendGroupMessage();
                }
            });
        }
        
        // 群聊输入按钮（不调用AI）
        var groupInputBtn = document.getElementById('btn-group-input');
        if (groupInputBtn && groupInput) {
            groupInputBtn.addEventListener('click', function() {
                var msg = groupInput.value.trim();
                if (msg) {
                    groupInput.value = '';
                    NR.addGroupChatMessageLocal(msg);
                }
            });
        }
        
        // 刷新按钮（用户不在群里时）
        var groupRefreshBtn = document.getElementById('btn-group-refresh');
        if (groupRefreshBtn) {
            groupRefreshBtn.addEventListener('click', function() {
                NR.sendGroupChatMessage('');
            });
        }
        
        // ========== 功能栏事件绑定 ==========
        
        // 更多按钮点击切换功能栏
        var groupMoreBtn = document.getElementById('btn-group-more');
        var groupFunctionBar = document.getElementById('group-function-bar');
        if (groupMoreBtn && groupFunctionBar) {
            groupMoreBtn.addEventListener('click', function() {
                var isVisible = groupFunctionBar.style.display !== 'none';
                // 隐藏所有面板
                var panels = ['group-voice-panel', 'group-image-panel', 'group-file-panel', 'group-transfer-panel', 'group-location-panel'];
                panels.forEach(function(id) {
                    var panel = document.getElementById(id);
                    if (panel) panel.style.display = 'none';
                });
                // 切换功能栏显示
                groupFunctionBar.style.display = isVisible ? 'none' : 'flex';
            });
        }
        
        // 功能项点击切换面板
        modal.querySelectorAll('#group-function-bar .function-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var func = this.dataset.func;
                var panelId = 'group-' + func + '-panel';
                var panel = document.getElementById(panelId);
                
                // 隐藏所有面板
                var panels = ['group-voice-panel', 'group-image-panel', 'group-file-panel', 'group-transfer-panel', 'group-location-panel'];
                panels.forEach(function(id) {
                    var p = document.getElementById(id);
                    if (p && id !== panelId) p.style.display = 'none';
                });
                
                // 切换当前面板
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            });
        });
        
        // 发送语音消息
        var btnGroupSendVoice = document.getElementById('btn-group-send-voice');
        if (btnGroupSendVoice) {
            btnGroupSendVoice.addEventListener('click', function() {
                var voiceText = document.getElementById('group-voice-text');
                var voiceDuration = document.getElementById('group-voice-duration');
                var text = voiceText ? voiceText.value.trim() : '';
                var duration = voiceDuration ? voiceDuration.value.trim() : '0:10';
                
                if (!text) {
                    alert('请输入语音内容');
                    return;
                }
                
                NR.addGroupChatVoiceMessage(text, duration);
                
                // 清空输入
                if (voiceText) voiceText.value = '';
                if (voiceDuration) voiceDuration.value = '';
                // 隐藏面板
                var panel = document.getElementById('group-voice-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 发送图片消息
        var btnGroupSendImage = document.getElementById('btn-group-send-image');
        if (btnGroupSendImage) {
            btnGroupSendImage.addEventListener('click', function() {
                var imageDesc = document.getElementById('group-image-desc');
                var desc = imageDesc ? imageDesc.value.trim() : '';
                
                if (!desc) {
                    alert('请输入图片描述');
                    return;
                }
                
                NR.addGroupChatImageMessage(desc);
                
                // 清空输入
                if (imageDesc) imageDesc.value = '';
                // 隐藏面板
                var panel = document.getElementById('group-image-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 发送文件消息
        var btnGroupSendFile = document.getElementById('btn-group-send-file');
        if (btnGroupSendFile) {
            btnGroupSendFile.addEventListener('click', function() {
                var fileName = document.getElementById('group-file-name');
                var fileSize = document.getElementById('group-file-size');
                var fileDesc = document.getElementById('group-file-desc');
                var name = fileName ? fileName.value.trim() : '';
                var size = fileSize ? fileSize.value.trim() : '';
                var desc = fileDesc ? fileDesc.value.trim() : '';
                
                if (!name) {
                    alert('请输入文件名');
                    return;
                }
                
                NR.addGroupChatFileMessage(name, size, desc);
                
                // 清空输入
                if (fileName) fileName.value = '';
                if (fileSize) fileSize.value = '';
                if (fileDesc) fileDesc.value = '';
                // 隐藏面板
                var panel = document.getElementById('group-file-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 发送转账消息
        var btnGroupSendTransfer = document.getElementById('btn-group-send-transfer');
        if (btnGroupSendTransfer) {
            btnGroupSendTransfer.addEventListener('click', function() {
                var amountInput = document.getElementById('group-transfer-amount');
                var noteInput = document.getElementById('group-transfer-note');
                var amount = amountInput ? amountInput.value.trim() : '';
                var note = noteInput ? noteInput.value.trim() : '';
                
                if (!amount) {
                    alert('请输入转账金额');
                    return;
                }
                
                NR.addGroupChatTransferMessage(amount, note);
                
                // 清空输入
                if (amountInput) amountInput.value = '';
                if (noteInput) noteInput.value = '';
                // 隐藏面板
                var panel = document.getElementById('group-transfer-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 发送位置消息
        var btnGroupSendLocation = document.getElementById('btn-group-send-location');
        if (btnGroupSendLocation) {
            btnGroupSendLocation.addEventListener('click', function() {
                var nameInput = document.getElementById('group-location-name');
                var distInput = document.getElementById('group-location-distance');
                var locationName = nameInput ? nameInput.value.trim() : '';
                var distance = distInput ? distInput.value.trim() : '';
                
                if (!locationName) {
                    alert('请输入位置名称');
                    return;
                }
                
                NR.addGroupChatLocationMessage(locationName, distance);
                
                // 清空输入
                if (nameInput) nameInput.value = '';
                if (distInput) distInput.value = '';
                // 隐藏面板
                var panel = document.getElementById('group-location-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 群聊详情页返回按钮
        var groupInfoBackBtn = document.getElementById('btn-group-info-back');
        if (groupInfoBackBtn) {
            groupInfoBackBtn.addEventListener('click', function() {
                var group = NR.state.phoneChatState.groupChatState.selectedGroup;
                if (group) {
                    NR.state.phoneChatState.currentScreen = 'group-chat-detail';
                } else {
                    NR.state.phoneChatState.currentScreen = 'character-data';
                }
                NR.refreshPhoneModal();
            });
        }
        
        // 更新"我"选项的显示名
        var updateMeOptionName = function() {
            var meItem = modal.querySelector('.member-select-me');
            if (!meItem) return;
            
            var selectedRoleOption = modal.querySelector('.group-role-option.selected');
            var roleType = selectedRoleOption ? selectedRoleOption.dataset.roleType : 'global';
            var displayName = NR.getUserRoleDisplayName();
            
            if (roleType === 'custom') {
                var customNameInput = document.getElementById('group-custom-name');
                var customName = customNameInput ? customNameInput.value.trim() : '';
                if (customName) {
                    displayName = customName;
                }
            }
            
            var nameSpan = meItem.querySelector('.member-name');
            if (nameSpan) {
                nameSpan.textContent = '我 (' + displayName + ')';
            }
        };
        
        // 用户身份选择
        modal.querySelectorAll('.group-role-option').forEach(function(option) {
            option.addEventListener('click', function() {
                // 取消其他选项的选中状态
                modal.querySelectorAll('.group-role-option').forEach(function(opt) {
                    opt.classList.remove('selected');
                    opt.querySelector('.role-option-radio').textContent = '○';
                });
                // 选中当前选项
                this.classList.add('selected');
                this.querySelector('.role-option-radio').textContent = '●';
                
                // 显示/隐藏自定义表单
                var roleType = this.dataset.roleType;
                var customForm = document.getElementById('group-custom-role-form');
                if (customForm) {
                    customForm.style.display = roleType === 'custom' ? 'block' : 'none';
                }
                
                // 更新"我"选项的显示名
                updateMeOptionName();
            });
        });
        
        // 自定义名字输入时更新"我"选项
        var customNameInput = document.getElementById('group-custom-name');
        if (customNameInput) {
            customNameInput.addEventListener('input', updateMeOptionName);
        }
        
        // 成员选择
        modal.querySelectorAll('.member-select-item').forEach(function(item) {
            item.addEventListener('click', function() {
                this.classList.toggle('selected');
                // 更新成员计数
                var count = modal.querySelectorAll('.member-select-item.selected').length;
                var countEl = modal.querySelector('.member-count');
                if (countEl) countEl.textContent = count + '人';
            });
        });
        
        // 群头像上传
        var avatarInput = document.getElementById('group-avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', function(e) {
                var file = e.target.files[0];
                if (file) {
                    var reader = new FileReader();
                    reader.onload = function(event) {
                        var avatarEl = modal.querySelector('.group-info-avatar');
                        if (avatarEl) {
                            avatarEl.style.backgroundImage = 'url(' + event.target.result + ')';
                            avatarEl.classList.remove('group-avatar-default');
                            avatarEl.dataset.avatarUrl = event.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // 创建群聊按钮
        var createGroupBtn = document.getElementById('btn-group-create');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', function() {
                NR.handleSaveGroupChat(modal, true);
            });
        }
        
        // 保存群聊按钮
        var saveGroupBtn = document.getElementById('btn-group-save');
        if (saveGroupBtn) {
            saveGroupBtn.addEventListener('click', function() {
                NR.handleSaveGroupChat(modal, false);
            });
        }
        
        // 删除群聊按钮
        var deleteGroupBtn = document.getElementById('btn-group-delete');
        if (deleteGroupBtn) {
            deleteGroupBtn.addEventListener('click', function() {
                var group = NR.state.phoneChatState.groupChatState.selectedGroup;
                if (group && confirm('确定要删除群聊"' + group.name + '"吗？')) {
                    NR.deleteGroupChat(group.id);
                    NR.state.phoneChatState.groupChatState.selectedGroup = null;
                    NR.state.phoneChatState.currentScreen = 'character-data';
                    NR.refreshPhoneModal();
                }
            });
        }
    };

    // 处理保存群聊
    NR.handleSaveGroupChat = function(modal, isNew) {
        var nameInput = document.getElementById('group-name-input');
        var otherMembersInput = document.getElementById('group-other-members-input');
        var descriptionInput = document.getElementById('group-description-input');
        var avatarEl = modal.querySelector('.group-info-avatar');
        
        var groupName = nameInput ? nameInput.value.trim() : '';
        if (!groupName) {
            alert('请输入群聊名称');
            return;
        }
        
        // 收集用户身份设置（先收集，因为成员列表需要用到）
        var selectedRoleOption = modal.querySelector('.group-role-option.selected');
        var roleType = selectedRoleOption ? selectedRoleOption.dataset.roleType : 'global';
        var userRole = null;
        var userDisplayName = NR.getUserRoleDisplayName(); // 默认使用全局身份
        
        if (roleType === 'custom') {
            var customNameInput = document.getElementById('group-custom-name');
            var customIntroInput = document.getElementById('group-custom-intro');
            var customName = customNameInput ? customNameInput.value.trim() : '';
            userRole = {
                type: 'custom',
                customName: customName,
                customIntro: customIntroInput ? customIntroInput.value.trim() : ''
            };
            // 如果有自定义名字，使用自定义名字
            if (customName) {
                userDisplayName = customName;
            }
        } else {
            userRole = { type: 'global' };
        }
        
        // 收集选中的成员，将 __ME__ 替换为实际的用户身份名字
        var selectedMembers = [];
        modal.querySelectorAll('.member-select-item.selected').forEach(function(item) {
            var name = item.dataset.name;
            if (name === '__ME__') {
                selectedMembers.push(userDisplayName);
            } else {
                selectedMembers.push(name);
            }
        });
        
        var groupData = {
            name: groupName,
            avatar: avatarEl ? (avatarEl.dataset.avatarUrl || '') : '',
            mainMembers: selectedMembers,
            otherMembers: otherMembersInput ? otherMembersInput.value.trim() : '',
            description: descriptionInput ? descriptionInput.value.trim() : '',
            userRole: userRole
        };
        
        if (!isNew) {
            var existingGroup = NR.state.phoneChatState.groupChatState.selectedGroup;
            if (existingGroup) {
                groupData.id = existingGroup.id;
            }
        }
        
        var savedGroup = NR.saveGroupChat(groupData);
        NR.state.phoneChatState.groupChatState.selectedGroup = savedGroup;
        NR.state.phoneChatState.currentScreen = 'group-chat-detail';
        NR.refreshPhoneModal();
    };

})();
