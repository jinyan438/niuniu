// 小手机直播功能模块
(function() {
    var NR = window.NovelReader;

    // 初始化直播数据状态
    NR.initLiveData = function() {
        if (!NR.state.phoneChatState.liveState) {
            NR.state.phoneChatState.liveState = {
                selectedRoom: null,
                isLoading: false,
                isGenerating: false,
                selectedContexts: [],
                currentContentIndex: 0,
                isThoughtBlurred: true,
                isFollowing: false,
                isLiked: false,
                messageInput: ''
            };
        }
        if (!NR.state.currentBookData.liveRooms) {
            NR.state.currentBookData.liveRooms = [];
        }
        if (!NR.state.currentBookData.liveHistory) {
            NR.state.currentBookData.liveHistory = {};
        }
    };

    // 获取直播列表
    NR.getLiveRooms = function() {
        return NR.state.currentBookData.liveRooms || [];
    };

    // 格式化数字（如 10000 -> 1w）
    NR.formatLiveNumber = function(num) {
        if (!num) return '0';
        if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    // 渲染直播列表界面
    NR.renderPhoneLiveListScreen = function() {
        NR.initLiveData();
        var rooms = NR.getLiveRooms();
        var liveState = NR.state.phoneChatState.liveState;
        
        var html = '<div class="phone-app-container phone-live-list-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar live-header">';
        html += '<button class="phone-nav-back live-back-btn" id="btn-phone-home"><i class="fas fa-chevron-left"></i></button>';
        html += '<span class="phone-nav-title live-header-title">直播</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn live-refresh-btn" id="btn-live-refresh" title="刷新"><i class="fas fa-sync-alt"></i></button>';
        html += '<button class="phone-nav-btn" id="btn-live-context" title="选择上下文">📝</button>';
        html += '<button class="phone-nav-btn" id="btn-live-generate" title="生成直播">✨</button>';
        html += '</div>';
        html += '</div>';
        
        // 显示已选上下文数量
        var selectedContexts = liveState.selectedContexts || [];
        if (selectedContexts.length > 0) {
            html += '<div class="live-context-badge">';
            html += '<span>📝 已选择 ' + selectedContexts.length + ' 个上下文</span>';
            html += '</div>';
        }
        
        // 分类标签
        html += '<div class="live-category-tabs">';
        html += '<div class="live-tab-item active">推荐</div>';
        html += '<div class="live-tab-item">直播中</div>';
        html += '<div class="live-tab-item">游戏</div>';
        html += '<div class="live-tab-item">音乐</div>';
        html += '<div class="live-tab-item">聊天</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content live-list">';
        
        // 加载中提示
        if (liveState.isLoading || liveState.isGenerating) {
            html += '<div class="live-loading-overlay">';
            html += '<div class="live-loading-spinner">';
            html += '<i class="fas fa-spinner fa-spin"></i>';
            html += '<span>正在加载直播列表...</span>';
            html += '</div>';
            html += '</div>';
        }
        
        if (rooms.length === 0 && !liveState.isLoading && !liveState.isGenerating) {
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">📺</div>';
            html += '<p>暂无直播</p>';
            html += '<p class="empty-hint">点击右上角 ✨ 生成直播列表</p>';
            html += '</div>';
        } else if (rooms.length > 0) {
            rooms.forEach(function(room, index) {
                html += NR.renderLiveRoomCard(room, index);
            });
        }
        
        html += '</div>'; // end live-list
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染单个直播卡片
    NR.renderLiveRoomCard = function(room, index) {
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === room.name; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#ff6b6b', text: '#fff' };
        
        var html = '<div class="live-card" data-index="' + index + '">';
        
        // 封面图
        html += '<div class="live-card-cover">';
        if (room.image) {
            html += '<img src="' + room.image + '" alt="直播封面">';
        } else {
            html += '<div class="live-card-cover-placeholder" style="background: linear-gradient(135deg, ' + color.bg + ', #16213e);">';
            html += '<i class="fas fa-video"></i>';
            html += '</div>';
        }
        
        // 直播状态徽章
        var isLive = room.status === '直播中';
        html += '<div class="live-badge' + (isLive ? '' : ' ended') + '">';
        if (isLive) {
            html += '<i class="fas fa-circle live-dot"></i>';
        }
        html += (room.status || '直播中');
        html += '</div>';
        
        // 观看人数
        html += '<div class="live-viewer-count">';
        html += '<i class="fas fa-eye"></i> ';
        html += NR.formatLiveNumber(room.viewers || 0);
        html += '</div>';
        
        html += '</div>'; // end live-card-cover
        
        // 信息区
        html += '<div class="live-card-info">';
        html += '<div class="live-info-top">';
        
        // 主播头像
        if (profile && profile.cover) {
            html += '<img src="' + profile.cover + '" class="live-streamer-avatar" alt="头像">';
        } else {
            html += '<div class="live-streamer-avatar" style="background: ' + color.bg + '; color: ' + color.text + '; display: flex; align-items: center; justify-content: center;">' + NR.escapeHtml((room.name || '?')[0]) + '</div>';
        }
        
        html += '<div class="live-info-text">';
        html += '<div class="live-room-title">' + NR.escapeHtml(room.title || '直播间') + '</div>';
        html += '<div class="live-streamer-name">' + NR.escapeHtml(room.name || '主播') + '</div>';
        html += '</div>';
        html += '</div>'; // end live-info-top
        
        // 统计信息
        html += '<div class="live-info-stats">';
        html += '<span class="live-stat-item"><i class="fas fa-heart"></i> ' + NR.formatLiveNumber(room.likes || 0) + '</span>';
        html += '<span class="live-stat-item"><i class="fas fa-user-plus"></i> ' + NR.formatLiveNumber(room.followers || 0) + '</span>';
        html += '</div>';
        
        html += '</div>'; // end live-card-info
        html += '</div>'; // end live-card
        
        return html;
    };

    // 渲染直播详情界面
    NR.renderPhoneLiveRoomScreen = function() {
        var liveState = NR.state.phoneChatState.liveState;
        var room = liveState.selectedRoom;
        
        if (!room) {
            return NR.renderPhoneLiveListScreen();
        }
        
        // 获取直播历史数据
        var liveHistory = NR.state.currentBookData.liveHistory || {};
        var roomKey = room.name + '::' + room.title;
        var liveData = liveHistory[roomKey] || room;
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === room.name; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#ff6b6b', text: '#fff' };
        
        var html = '<div class="phone-app-container phone-live-room-container">';
        
        // 加载中遮罩
        if (liveState.isLoading || liveState.isGenerating) {
            html += '<div class="live-loading-overlay">';
            html += '<div class="live-loading-spinner">';
            html += '<i class="fas fa-spinner fa-spin"></i>';
            html += '<span>正在加载直播内容...</span>';
            html += '<button class="live-abort-btn" id="btn-live-abort">';
            html += '<i class="fas fa-stop"></i>';
            html += '<span>终止生成</span>';
            html += '</button>';
            html += '</div>';
            html += '</div>';
        }
        
        // 顶部导航栏
        html += '<div class="live-top-bar">';
        html += '<button class="live-back-btn" id="btn-live-back"><i class="fas fa-chevron-left"></i></button>';
        html += '<div class="live-streamer-info">';
        if (profile && profile.cover) {
            html += '<img src="' + profile.cover + '" class="live-streamer-avatar" alt="头像">';
        } else {
            html += '<div class="live-streamer-avatar" style="background: ' + color.bg + '; color: ' + color.text + '; display: flex; align-items: center; justify-content: center;">' + NR.escapeHtml((room.name || '?')[0]) + '</div>';
        }
        html += '<div class="live-streamer-detail">';
        html += '<span class="live-streamer-name">' + NR.escapeHtml(liveData.streamer || room.name || '主播') + '</span>';
        html += '<span class="live-follower-count">' + NR.formatLiveNumber(liveData.followers || room.followers || 0) + ' 粉丝</span>';
        html += '</div>';
        html += '</div>';
        html += '<button class="live-follow-btn' + (liveState.isFollowing ? ' following' : '') + '" id="btn-live-follow">';
        html += liveState.isFollowing ? '已关注' : '+ 关注';
        html += '</button>';
        html += '</div>';
        
        // 可滚动内容区域开始
        html += '<div class="live-room-scroll-content">';
        
        // 直播视频区域
        html += '<div class="live-video-area">';
        if (liveData.image || room.image) {
            html += '<img src="' + (liveData.image || room.image) + '" class="live-video-cover" alt="直播画面">';
        } else {
            html += '<div class="live-video-placeholder" style="background: linear-gradient(135deg, ' + color.bg + ', #16213e);">';
            html += '<i class="fas fa-video" style="font-size: 48px; color: rgba(255,255,255,0.5);"></i>';
            html += '</div>';
        }
        
        // 直播状态指示器
        html += '<div class="live-indicator">';
        html += '<i class="fas fa-circle"></i> 直播中';
        html += '</div>';
        
        // 观看人数
        html += '<div class="live-viewer-badge">';
        html += '<i class="fas fa-eye"></i> ' + NR.formatLiveNumber(liveData.viewers || room.viewers || 0);
        html += '</div>';
        
        // 弹幕区域
        html += NR.renderLiveBarrage(liveData);
        
        html += '</div>'; // end live-video-area
        
        // 直播间信息
        html += '<div class="live-room-info">';
        html += '<div class="live-room-title-text">' + NR.escapeHtml(liveData.roomTitle || room.title || '直播间') + '</div>';
        if (liveData.roomDesc) {
            html += '<div class="live-room-desc">' + NR.escapeHtml(liveData.roomDesc) + '</div>';
        }
        html += '<div class="live-room-stats">';
        html += '<span class="live-stat"><i class="fas fa-eye"></i> ' + NR.formatLiveNumber(liveData.viewers || room.viewers || 0) + ' 观看</span>';
        html += '<span class="live-stat"><i class="fas fa-heart"></i> ' + NR.formatLiveNumber(liveData.likes || room.likes || 0) + ' 喜欢</span>';
        html += '</div>';
        html += '</div>';
        
        // 直播内容区域
        var contents = liveData.contents || [];
        if (contents.length > 0) {
            var currentIndex = liveState.currentContentIndex || 0;
            if (currentIndex >= contents.length) currentIndex = 0;
            var currentContent = contents[currentIndex] || {};
            
            html += '<div class="live-content-section" id="live-content-section">';
            html += '<div class="live-section-title">';
            html += '<i class="fas fa-video"></i> 直播内容';
            html += '<span class="live-content-indicator">' + (currentIndex + 1) + '/' + contents.length + '</span>';
            html += '</div>';
            html += '<div class="live-content-box">';
            html += '<div class="live-content-dialogue">「' + NR.escapeHtml(currentContent.dialogue || '') + '」</div>';
            if (currentContent.state) {
                html += '<div class="live-content-state">' + NR.escapeHtml(currentContent.state) + '</div>';
            }
            html += '</div>';
            html += '<div class="live-content-hint">点击切换下一条</div>';
            html += '</div>';
        }
        
        // 想法区域
        if (liveData.thought) {
            html += '<div class="live-thought-section" id="live-thought-section">';
            html += '<div class="live-section-title">';
            html += '<i class="fas fa-heart"></i> 内心想法';
            html += '<span class="live-thought-hint">' + (liveState.isThoughtBlurred ? '点击查看' : '点击隐藏') + '</span>';
            html += '</div>';
            html += '<div class="live-thought-box' + (liveState.isThoughtBlurred ? ' blurred' : '') + '">';
            html += '<i class="fas fa-quote-left"></i> ';
            html += NR.escapeHtml(liveData.thought);
            html += ' <i class="fas fa-quote-right"></i>';
            html += '</div>';
            html += '</div>';
        }
        
        // 醒目留言
        var superchat = liveData.superchat || [];
        if (superchat.length > 0) {
            html += '<div class="live-superchat-section">';
            html += '<div class="live-section-title"><i class="fas fa-gift"></i> 醒目留言</div>';
            html += '<div class="live-superchat-list">';
            superchat.forEach(function(sc) {
                var scProfile = profiles.find(function(p) { return p.name === sc.name; });
                var scColor = scProfile ? NR.getCharacterColor(scProfile.name, scProfile.isProtagonist) : { bg: '#ff6b6b', text: '#fff' };
                
                html += '<div class="live-superchat-item">';
                if (scProfile && scProfile.cover) {
                    html += '<img src="' + scProfile.cover + '" class="live-sc-avatar" alt="头像">';
                } else {
                    html += '<div class="live-sc-avatar" style="background: ' + scColor.bg + '; color: ' + scColor.text + ';">' + NR.escapeHtml((sc.name || '?')[0]) + '</div>';
                }
                html += '<div class="live-sc-content">';
                html += '<div class="live-sc-header">';
                html += '<span class="live-sc-name">' + NR.escapeHtml(sc.name || '匿名') + '</span>';
                html += '<span class="live-sc-amount">¥' + (sc.amount || 0) + '</span>';
                html += '</div>';
                html += '<div class="live-sc-text">' + NR.escapeHtml(sc.c || sc.content || '') + '</div>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        }
        
        // 贡献榜
        var ranking = liveData.ranking || [];
        if (ranking.length > 0) {
            html += '<div class="live-ranking-section">';
            html += '<div class="live-section-title"><i class="fas fa-trophy"></i> 贡献榜</div>';
            html += '<div class="live-ranking-list">';
            ranking.forEach(function(user, idx) {
                var rankProfile = profiles.find(function(p) { return p.name === user.name; });
                var rankColor = rankProfile ? NR.getCharacterColor(rankProfile.name, rankProfile.isProtagonist) : { bg: '#94a3b8', text: '#fff' };
                
                html += '<div class="live-ranking-item">';
                html += '<span class="live-rank-number' + (idx < 3 ? ' top' : '') + '">' + (idx + 1) + '</span>';
                if (rankProfile && rankProfile.cover) {
                    html += '<img src="' + rankProfile.cover + '" class="live-rank-avatar" alt="头像">';
                } else {
                    html += '<div class="live-rank-avatar" style="background: ' + rankColor.bg + '; color: ' + rankColor.text + ';">' + NR.escapeHtml((user.name || '?')[0]) + '</div>';
                }
                html += '<span class="live-rank-name">' + NR.escapeHtml(user.name || '匿名') + '</span>';
                html += '<span class="live-rank-score">' + NR.formatLiveNumber(user.score || 0) + '</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        }
        
        // 弹幕列表
        var barrage = liveData.barrage || [];
        if (barrage.length > 0) {
            html += '<div class="live-chat-section">';
            html += '<div class="live-section-title"><i class="fas fa-comments"></i> 弹幕</div>';
            html += '<div class="live-chat-list">';
            barrage.slice(0, 8).forEach(function(msg) {
                html += '<div class="live-chat-item">';
                html += '<span class="live-chat-name">' + NR.escapeHtml(msg.name || '匿名') + ':</span>';
                html += '<span class="live-chat-text">' + NR.escapeHtml(msg.c || msg.content || '') + '</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>'; // end live-room-scroll-content
        
        // 底部互动栏
        html += '<div class="live-bottom-bar">';
        html += '<div class="live-input-area">';
        html += '<input type="text" id="live-message-input" placeholder="发送弹幕..." value="' + NR.escapeHtml(liveState.messageInput || '') + '">';
        html += '<button class="live-send-btn" id="btn-live-send"><i class="fas fa-paper-plane"></i></button>';
        html += '</div>';
        html += '<div class="live-action-buttons">';
        html += '<button class="live-action-btn" id="btn-live-like"><i class="fas fa-heart' + (liveState.isLiked ? ' liked' : '') + '"></i></button>';
        html += '<button class="live-action-btn live-gift-btn" id="btn-live-gift"><i class="fas fa-gift"></i></button>';
        html += '<button class="live-action-btn" id="btn-live-refresh-content" title="刷新内容"><i class="fas fa-sync-alt"></i></button>';
        html += '</div>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染弹幕区域
    NR.renderLiveBarrage = function(liveData) {
        var barrage = liveData.barrage || [];
        var superchat = liveData.superchat || [];
        
        if (barrage.length === 0 && superchat.length === 0) {
            return '';
        }
        
        var html = '<div class="live-barrage-overlay">';
        
        // 普通弹幕
        barrage.slice(0, 4).forEach(function(item, index) {
            html += '<div class="live-barrage-item" style="top: ' + (index * 2 * 28 + 10) + 'px; animation-delay: ' + (index * 2.5) + 's;">';
            html += '<span class="live-barrage-name">' + NR.escapeHtml(item.name || '') + '</span>';
            html += '<span class="live-barrage-text">' + NR.escapeHtml(item.c || item.content || '') + '</span>';
            html += '</div>';
        });
        
        // 醒目留言弹幕
        superchat.slice(0, 2).forEach(function(sc, index) {
            var bgColor = sc.amount >= 100 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 
                          sc.amount >= 50 ? 'linear-gradient(135deg, #ec4899, #f472b6)' : 
                          'linear-gradient(135deg, #3b82f6, #60a5fa)';
            html += '<div class="live-barrage-item live-superchat-barrage" style="top: ' + ((index * 2 + 1) * 28 + 10) + 'px; background: ' + bgColor + '; animation-delay: ' + (index * 4 + 1) + 's;">';
            html += '<span class="live-barrage-name">' + NR.escapeHtml(sc.name || '') + '</span>';
            html += '<span class="live-sc-badge">¥' + (sc.amount || 0) + '</span>';
            html += '<span class="live-barrage-text">' + NR.escapeHtml(sc.c || sc.content || '') + '</span>';
            html += '</div>';
        });
        
        html += '</div>';
        
        return html;
    };


    // 显示直播上下文选择弹窗
    NR.showLiveContextModal = function() {
        var existingModal = document.getElementById('live-context-modal');
        if (existingModal) existingModal.remove();
        
        var summaries = NR.state.currentBookData.summaries || [];
        var liveState = NR.state.phoneChatState.liveState;
        var selectedContexts = liveState.selectedContexts || [];
        
        var html = '<div id="live-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="modal-body" style="max-height: 400px; overflow-y: auto;">';
        
        if (summaries.length === 0) {
            html += '<p style="text-align: center; color: #888;">暂无可用的上下文</p>';
        } else {
            html += '<div class="context-list">';
            summaries.forEach(function(summary, index) {
                var isSelected = selectedContexts.includes(index);
                var preview = (summary.content || '').substring(0, 50) + '...';
                html += '<div class="context-item' + (isSelected ? ' selected' : '') + '" data-index="' + index + '">';
                html += '<div class="context-checkbox">' + (isSelected ? '✓' : '') + '</div>';
                html += '<div class="context-info">';
                html += '<div class="context-title">' + NR.escapeHtml(summary.title || '第' + (index + 1) + '条') + '</div>';
                html += '<div class="context-preview">' + NR.escapeHtml(preview) + '</div>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        html += '</div>';
        html += '<div class="modal-footer">';
        html += '<button class="btn btn-secondary" id="btn-live-context-clear">清除选择</button>';
        html += '<button class="btn btn-primary" id="btn-live-context-confirm">确定</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('live-context-modal');
        
        // 关闭按钮
        modal.querySelector('.close-button').addEventListener('click', function() {
            modal.remove();
        });
        
        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
        
        // 选择上下文
        modal.querySelectorAll('.context-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                var idx = selectedContexts.indexOf(index);
                if (idx > -1) {
                    selectedContexts.splice(idx, 1);
                    this.classList.remove('selected');
                    this.querySelector('.context-checkbox').textContent = '';
                } else {
                    selectedContexts.push(index);
                    this.classList.add('selected');
                    this.querySelector('.context-checkbox').textContent = '✓';
                }
            });
        });
        
        // 清除选择
        modal.querySelector('#btn-live-context-clear').addEventListener('click', function() {
            selectedContexts.length = 0;
            modal.querySelectorAll('.context-item').forEach(function(item) {
                item.classList.remove('selected');
                item.querySelector('.context-checkbox').textContent = '';
            });
        });
        
        // 确定
        modal.querySelector('#btn-live-context-confirm').addEventListener('click', function() {
            liveState.selectedContexts = selectedContexts.slice();
            modal.remove();
            NR.refreshPhoneModal();
        });
    };

    // 生成直播列表
    NR.generateLiveList = function() {
        NR.initLiveData();
        var liveState = NR.state.phoneChatState.liveState;
        
        if (liveState.isGenerating) return;
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        liveState.isGenerating = true;
        NR.refreshPhoneModal();
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length === 0) {
            liveState.isGenerating = false;
            alert('请先添加人物卡');
            NR.refreshPhoneModal();
            return;
        }
        
        // 构建角色列表
        var charList = profiles.map(function(p) {
            return '- ' + p.name + (p.isProtagonist ? '（主角）' : '');
        }).join('\n');
        
        // 获取选中的上下文
        var selectedContexts = liveState.selectedContexts || [];
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
        var prompt = '你是一个角色扮演助手，请为以下角色生成直播列表。\n\n';
        prompt += '【可用角色】\n' + charList + '\n';
        prompt += contextText;
        prompt += '\n【生成要求】\n';
        prompt += '请生成3-5个直播间，每个直播间包含：\n';
        prompt += '1. 主播名（从角色列表中选择）\n';
        prompt += '2. 直播标题（有趣吸引人）\n';
        prompt += '3. 直播状态（直播中/已结束）\n';
        prompt += '4. 观看人数、点赞数、粉丝数\n\n';
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'rooms:\n';
        prompt += '  - name: "主播名"\n';
        prompt += '    title: "直播标题"\n';
        prompt += '    status: "直播中"\n';
        prompt += '    viewers: 12345\n';
        prompt += '    likes: 5678\n';
        prompt += '    followers: 10000\n';
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
            
            // 解析YAML格式的直播列表
            var rooms = NR.parseLiveListYaml(content);
            
            if (rooms && rooms.length > 0) {
                NR.state.currentBookData.liveRooms = rooms;
                NR.saveBookData();
                console.info('[Live] 直播列表生成成功:', rooms);
            } else {
                throw new Error('无法解析直播列表');
            }
            
            liveState.isGenerating = false;
            NR.refreshPhoneModal();
            
        }).catch(function(err) {
            console.error('[Live] 生成直播列表失败:', err);
            liveState.isGenerating = false;
            alert('生成直播列表失败: ' + err.message);
            NR.refreshPhoneModal();
        });
    };

    // 解析直播列表YAML
    NR.parseLiveListYaml = function(content) {
        try {
            // 提取yaml代码块
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var rooms = [];
            
            // 简单解析rooms数组
            var roomMatches = yamlContent.split(/\n\s*-\s*name:/);
            
            for (var i = 1; i < roomMatches.length; i++) {
                var roomStr = 'name:' + roomMatches[i];
                var room = {
                    name: '',
                    title: '',
                    status: '直播中',
                    viewers: 0,
                    likes: 0,
                    followers: 0
                };
                
                // 解析name
                var nameMatch = roomStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                if (nameMatch) room.name = nameMatch[1].trim();
                
                // 解析title
                var titleMatch = roomStr.match(/title:\s*["']?([^"'\n]+)["']?/);
                if (titleMatch) room.title = titleMatch[1].trim();
                
                // 解析status
                var statusMatch = roomStr.match(/status:\s*["']?([^"'\n]+)["']?/);
                if (statusMatch) room.status = statusMatch[1].trim();
                
                // 解析viewers
                var viewersMatch = roomStr.match(/viewers:\s*(\d+)/);
                if (viewersMatch) room.viewers = parseInt(viewersMatch[1]);
                
                // 解析likes
                var likesMatch = roomStr.match(/likes:\s*(\d+)/);
                if (likesMatch) room.likes = parseInt(likesMatch[1]);
                
                // 解析followers
                var followersMatch = roomStr.match(/followers:\s*(\d+)/);
                if (followersMatch) room.followers = parseInt(followersMatch[1]);
                
                if (room.name && room.title) {
                    rooms.push(room);
                }
            }
            
            return rooms;
        } catch (e) {
            console.error('[Live] 解析直播列表YAML失败:', e);
            return [];
        }
    };

    // 生成直播详情
    NR.generateLiveDetail = function(room, userAction) {
        NR.initLiveData();
        var liveState = NR.state.phoneChatState.liveState;
        
        if (liveState.isGenerating) return;
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        liveState.isGenerating = true;
        NR.refreshPhoneModal();
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === room.name; });
        
        // 构建角色信息
        var characterInfo = '';
        if (profile) {
            characterInfo = '【主播信息】\n';
            characterInfo += '姓名: ' + profile.name + '\n';
            if (profile.personality) characterInfo += '性格: ' + profile.personality + '\n';
            if (profile.appearance) characterInfo += '外貌: ' + profile.appearance + '\n';
            if (profile.tags) characterInfo += '标签: ' + profile.tags + '\n';
        }
        
        // 获取选中的上下文
        var selectedContexts = liveState.selectedContexts || [];
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
        
        // 获取其他角色用于弹幕和评论
        var otherChars = profiles.filter(function(p) { return p.name !== room.name; })
            .map(function(p) { return p.name; }).join('、');
        
        var actionText = userAction ? ('\n\n【用户行为】\n' + userAction + '\n请根据用户行为生成直播的最新状态和主播反应。') : '';
        
        // 构建提示词
        var prompt = '你是一个角色扮演助手，请生成直播间的详细内容。\n\n';
        prompt += characterInfo;
        prompt += contextText;
        prompt += '\n【直播信息】\n';
        prompt += '主播: ' + room.name + '\n';
        prompt += '直播标题: ' + room.title + '\n';
        prompt += '其他可用角色（用于弹幕/评论）: ' + (otherChars || '无') + '\n';
        prompt += actionText;
        prompt += '\n\n【生成要求】\n';
        prompt += '请生成直播间的详细内容，包含：\n';
        prompt += '1. 直播间标题和简介\n';
        prompt += '2. 3-5条直播内容（主播说的话和动作状态）\n';
        prompt += '3. 主播的内心想法（不会被观众看到的真实想法）\n';
        prompt += '4. 5-8条弹幕\n';
        prompt += '5. 1-3条醒目留言（打赏）\n';
        prompt += '6. 贡献榜前3名\n\n';
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'streamer: "' + room.name + '"\n';
        prompt += 'roomTitle: "直播标题"\n';
        prompt += 'roomDesc: "直播简介"\n';
        prompt += 'viewers: 12345\n';
        prompt += 'likes: 5678\n';
        prompt += 'followers: 10000\n';
        prompt += 'thought: "主播内心想法..."\n';
        prompt += 'contents:\n';
        prompt += '  - dialogue: "主播说的话"\n';
        prompt += '    state: "主播的动作/状态描述"\n';
        prompt += 'barrage:\n';
        prompt += '  - name: "观众名"\n';
        prompt += '    c: "弹幕内容"\n';
        prompt += 'superchat:\n';
        prompt += '  - name: "打赏者名"\n';
        prompt += '    amount: 50\n';
        prompt += '    c: "留言内容"\n';
        prompt += 'ranking:\n';
        prompt += '  - name: "用户名"\n';
        prompt += '    score: 1000\n';
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
            
            // 解析YAML格式的直播详情
            var liveData = NR.parseLiveDetailYaml(content);
            
            if (liveData) {
                // 保存到历史
                var roomKey = room.name + '::' + room.title;
                if (!NR.state.currentBookData.liveHistory) {
                    NR.state.currentBookData.liveHistory = {};
                }
                NR.state.currentBookData.liveHistory[roomKey] = Object.assign({}, room, liveData);
                NR.saveBookData();
                console.info('[Live] 直播详情生成成功:', liveData);
            } else {
                throw new Error('无法解析直播详情');
            }
            
            liveState.isGenerating = false;
            NR.refreshPhoneModal();
            
        }).catch(function(err) {
            console.error('[Live] 生成直播详情失败:', err);
            liveState.isGenerating = false;
            alert('生成直播详情失败: ' + err.message);
            NR.refreshPhoneModal();
        });
    };

    // 解析直播详情YAML
    NR.parseLiveDetailYaml = function(content) {
        try {
            // 提取yaml代码块
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var liveData = {
                streamer: '',
                roomTitle: '',
                roomDesc: '',
                viewers: 0,
                likes: 0,
                followers: 0,
                thought: '',
                contents: [],
                barrage: [],
                superchat: [],
                ranking: []
            };
            
            // 解析基本字段
            var streamerMatch = yamlContent.match(/streamer:\s*["']?([^"'\n]+)["']?/);
            if (streamerMatch) liveData.streamer = streamerMatch[1].trim();
            
            var roomTitleMatch = yamlContent.match(/roomTitle:\s*["']?([^"'\n]+)["']?/);
            if (roomTitleMatch) liveData.roomTitle = roomTitleMatch[1].trim();
            
            var roomDescMatch = yamlContent.match(/roomDesc:\s*["']?([^"'\n]+)["']?/);
            if (roomDescMatch) liveData.roomDesc = roomDescMatch[1].trim();
            
            var viewersMatch = yamlContent.match(/viewers:\s*(\d+)/);
            if (viewersMatch) liveData.viewers = parseInt(viewersMatch[1]);
            
            var likesMatch = yamlContent.match(/likes:\s*(\d+)/);
            if (likesMatch) liveData.likes = parseInt(likesMatch[1]);
            
            var followersMatch = yamlContent.match(/followers:\s*(\d+)/);
            if (followersMatch) liveData.followers = parseInt(followersMatch[1]);
            
            var thoughtMatch = yamlContent.match(/thought:\s*["']?([^"'\n]+)["']?/);
            if (thoughtMatch) liveData.thought = thoughtMatch[1].trim();
            
            // 解析contents数组
            var contentsSection = yamlContent.match(/contents:\s*\n([\s\S]*?)(?=\nbarrage:|$)/);
            if (contentsSection) {
                var contentMatches = contentsSection[1].split(/\n\s*-\s*dialogue:/);
                for (var i = 1; i < contentMatches.length; i++) {
                    var contentStr = 'dialogue:' + contentMatches[i];
                    var contentItem = { dialogue: '', state: '' };
                    
                    var dialogueMatch = contentStr.match(/dialogue:\s*["']?([^"'\n]+)["']?/);
                    if (dialogueMatch) contentItem.dialogue = dialogueMatch[1].trim();
                    
                    var stateMatch = contentStr.match(/state:\s*["']?([^"'\n]+)["']?/);
                    if (stateMatch) contentItem.state = stateMatch[1].trim();
                    
                    if (contentItem.dialogue) {
                        liveData.contents.push(contentItem);
                    }
                }
            }
            
            // 解析barrage数组
            var barrageSection = yamlContent.match(/barrage:\s*\n([\s\S]*?)(?=\nsuperchat:|$)/);
            if (barrageSection) {
                var barrageMatches = barrageSection[1].split(/\n\s*-\s*name:/);
                for (var j = 1; j < barrageMatches.length; j++) {
                    var barrageStr = 'name:' + barrageMatches[j];
                    var barrageItem = { name: '', c: '' };
                    
                    var nameMatch = barrageStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                    if (nameMatch) barrageItem.name = nameMatch[1].trim();
                    
                    var cMatch = barrageStr.match(/c:\s*["']?([^"'\n]+)["']?/);
                    if (cMatch) barrageItem.c = cMatch[1].trim();
                    
                    if (barrageItem.name && barrageItem.c) {
                        liveData.barrage.push(barrageItem);
                    }
                }
            }
            
            // 解析superchat数组
            var superchatSection = yamlContent.match(/superchat:\s*\n([\s\S]*?)(?=\nranking:|$)/);
            if (superchatSection) {
                var scMatches = superchatSection[1].split(/\n\s*-\s*name:/);
                for (var k = 1; k < scMatches.length; k++) {
                    var scStr = 'name:' + scMatches[k];
                    var scItem = { name: '', amount: 0, c: '' };
                    
                    var scNameMatch = scStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                    if (scNameMatch) scItem.name = scNameMatch[1].trim();
                    
                    var amountMatch = scStr.match(/amount:\s*(\d+)/);
                    if (amountMatch) scItem.amount = parseInt(amountMatch[1]);
                    
                    var scCMatch = scStr.match(/c:\s*["']?([^"'\n]+)["']?/);
                    if (scCMatch) scItem.c = scCMatch[1].trim();
                    
                    if (scItem.name) {
                        liveData.superchat.push(scItem);
                    }
                }
            }
            
            // 解析ranking数组
            var rankingSection = yamlContent.match(/ranking:\s*\n([\s\S]*?)$/);
            if (rankingSection) {
                var rankMatches = rankingSection[1].split(/\n\s*-\s*name:/);
                for (var m = 1; m < rankMatches.length; m++) {
                    var rankStr = 'name:' + rankMatches[m];
                    var rankItem = { name: '', score: 0 };
                    
                    var rankNameMatch = rankStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                    if (rankNameMatch) rankItem.name = rankNameMatch[1].trim();
                    
                    var scoreMatch = rankStr.match(/score:\s*(\d+)/);
                    if (scoreMatch) rankItem.score = parseInt(scoreMatch[1]);
                    
                    if (rankItem.name) {
                        liveData.ranking.push(rankItem);
                    }
                }
            }
            
            return liveData;
        } catch (e) {
            console.error('[Live] 解析直播详情YAML失败:', e);
            return null;
        }
    };

    // 绑定直播事件
    NR.bindLiveEvents = function(modal) {
        var liveState = NR.state.phoneChatState.liveState;
        var currentScreen = NR.state.phoneChatState.currentScreen;
        
        // 直播列表界面事件
        if (currentScreen === 'live') {
            // 刷新按钮
            var refreshBtn = modal.querySelector('#btn-live-refresh');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function() {
                    NR.generateLiveList();
                });
            }
            
            // 上下文按钮
            var contextBtn = modal.querySelector('#btn-live-context');
            if (contextBtn) {
                contextBtn.addEventListener('click', function() {
                    NR.showLiveContextModal();
                });
            }
            
            // 生成按钮
            var generateBtn = modal.querySelector('#btn-live-generate');
            if (generateBtn) {
                generateBtn.addEventListener('click', function() {
                    NR.generateLiveList();
                });
            }
            
            // 直播卡片点击
            modal.querySelectorAll('.live-card').forEach(function(card) {
                card.addEventListener('click', function() {
                    var index = parseInt(this.dataset.index);
                    var rooms = NR.getLiveRooms();
                    if (rooms[index]) {
                        liveState.selectedRoom = rooms[index];
                        liveState.currentContentIndex = 0;
                        liveState.isThoughtBlurred = true;
                        NR.state.phoneChatState.currentScreen = 'live-room';
                        NR.refreshPhoneModal();
                        
                        // 如果没有详情数据，自动生成
                        var roomKey = rooms[index].name + '::' + rooms[index].title;
                        var liveHistory = NR.state.currentBookData.liveHistory || {};
                        if (!liveHistory[roomKey] || !liveHistory[roomKey].contents) {
                            NR.generateLiveDetail(rooms[index]);
                        }
                    }
                });
            });
        }
        
        // 直播详情界面事件
        if (currentScreen === 'live-room') {
            // 返回按钮
            var backBtn = modal.querySelector('#btn-live-back');
            if (backBtn) {
                backBtn.addEventListener('click', function() {
                    liveState.selectedRoom = null;
                    NR.state.phoneChatState.currentScreen = 'live';
                    NR.refreshPhoneModal();
                });
            }
            
            // 终止按钮
            var abortBtn = modal.querySelector('#btn-live-abort');
            if (abortBtn) {
                abortBtn.addEventListener('click', function() {
                    liveState.isGenerating = false;
                    liveState.isLoading = false;
                    NR.refreshPhoneModal();
                });
            }
            
            // 关注按钮
            var followBtn = modal.querySelector('#btn-live-follow');
            if (followBtn) {
                followBtn.addEventListener('click', function() {
                    liveState.isFollowing = !liveState.isFollowing;
                    NR.refreshPhoneModal();
                });
            }
            
            // 直播内容点击切换
            var contentSection = modal.querySelector('#live-content-section');
            if (contentSection) {
                contentSection.addEventListener('click', function() {
                    var room = liveState.selectedRoom;
                    if (!room) return;
                    
                    var roomKey = room.name + '::' + room.title;
                    var liveHistory = NR.state.currentBookData.liveHistory || {};
                    var liveData = liveHistory[roomKey] || room;
                    var contents = liveData.contents || [];
                    
                    if (contents.length > 0) {
                        liveState.currentContentIndex = (liveState.currentContentIndex + 1) % contents.length;
                        NR.refreshPhoneModal();
                    }
                });
            }
            
            // 想法区域点击
            var thoughtSection = modal.querySelector('#live-thought-section');
            if (thoughtSection) {
                thoughtSection.addEventListener('click', function() {
                    liveState.isThoughtBlurred = !liveState.isThoughtBlurred;
                    NR.refreshPhoneModal();
                });
            }
            
            // 点赞按钮
            var likeBtn = modal.querySelector('#btn-live-like');
            if (likeBtn) {
                likeBtn.addEventListener('click', function() {
                    liveState.isLiked = !liveState.isLiked;
                    NR.refreshPhoneModal();
                });
            }
            
            // 发送弹幕
            var sendBtn = modal.querySelector('#btn-live-send');
            var messageInput = modal.querySelector('#live-message-input');
            if (sendBtn && messageInput) {
                sendBtn.addEventListener('click', function() {
                    var message = messageInput.value.trim();
                    if (message) {
                        NR.sendLiveBarrage(message);
                        messageInput.value = '';
                        liveState.messageInput = '';
                    }
                });
                
                messageInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        sendBtn.click();
                    }
                });
                
                messageInput.addEventListener('input', function() {
                    liveState.messageInput = this.value;
                });
            }
            
            // 刷新内容按钮
            var refreshContentBtn = modal.querySelector('#btn-live-refresh-content');
            if (refreshContentBtn) {
                refreshContentBtn.addEventListener('click', function() {
                    var room = liveState.selectedRoom;
                    if (room) {
                        NR.generateLiveDetail(room);
                    }
                });
            }
            
            // 礼物按钮
            var giftBtn = modal.querySelector('#btn-live-gift');
            if (giftBtn) {
                giftBtn.addEventListener('click', function() {
                    NR.showLiveGiftPanel();
                });
            }
        }
    };

    // 发送弹幕
    NR.sendLiveBarrage = function(message) {
        var liveState = NR.state.phoneChatState.liveState;
        var room = liveState.selectedRoom;
        if (!room) return;
        
        var roomKey = room.name + '::' + room.title;
        if (!NR.state.currentBookData.liveHistory) {
            NR.state.currentBookData.liveHistory = {};
        }
        
        var liveData = NR.state.currentBookData.liveHistory[roomKey] || Object.assign({}, room);
        if (!liveData.barrage) liveData.barrage = [];
        
        // 获取用户名
        var userName = '我';
        var userRole = NR.state.currentBookData.phoneUserRole;
        if (userRole && userRole.name) {
            userName = userRole.name;
        }
        
        // 添加弹幕
        liveData.barrage.unshift({
            name: userName,
            c: message,
            isMyBarrage: true
        });
        
        NR.state.currentBookData.liveHistory[roomKey] = liveData;
        NR.saveBookData();
        
        // 生成回复
        NR.generateLiveDetail(room, '用户发送了弹幕："' + message + '"');
    };

    // 显示礼物面板
    NR.showLiveGiftPanel = function() {
        var existingPanel = document.getElementById('live-gift-panel');
        if (existingPanel) existingPanel.remove();
        
        var gifts = [
            { icon: '🌹', name: '玫瑰', price: 1 },
            { icon: '💎', name: '钻石', price: 10 },
            { icon: '🎁', name: '礼盒', price: 50 },
            { icon: '🚀', name: '火箭', price: 100 },
            { icon: '👑', name: '皇冠', price: 500 },
            { icon: '🏆', name: '奖杯', price: 1000 },
            { icon: '❤️', name: '爱心', price: 5 },
            { icon: '⭐', name: '星星', price: 20 }
        ];
        
        var html = '<div id="live-gift-panel" class="live-gift-panel">';
        html += '<div class="live-gift-content">';
        html += '<div class="live-gift-header">';
        html += '<span>送礼物</span>';
        html += '<button class="live-close-btn" id="btn-gift-close"><i class="fas fa-times"></i></button>';
        html += '</div>';
        html += '<div class="live-gift-grid">';
        
        gifts.forEach(function(gift, index) {
            html += '<div class="live-gift-item" data-index="' + index + '" data-price="' + gift.price + '" data-name="' + gift.name + '">';
            html += '<div class="live-gift-icon">' + gift.icon + '</div>';
            html += '<div class="live-gift-name">' + gift.name + '</div>';
            html += '<div class="live-gift-price">¥' + gift.price + '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var panel = document.getElementById('live-gift-panel');
        
        // 关闭按钮
        panel.querySelector('#btn-gift-close').addEventListener('click', function() {
            panel.remove();
        });
        
        // 点击背景关闭
        panel.addEventListener('click', function(e) {
            if (e.target === panel) panel.remove();
        });
        
        // 礼物点击
        panel.querySelectorAll('.live-gift-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var giftName = this.dataset.name;
                var giftPrice = this.dataset.price;
                panel.remove();
                NR.sendLiveGift(giftName, giftPrice);
            });
        });
    };

    // 发送礼物
    NR.sendLiveGift = function(giftName, giftPrice) {
        var liveState = NR.state.phoneChatState.liveState;
        var room = liveState.selectedRoom;
        if (!room) return;
        
        // 获取用户名
        var userName = '我';
        var userRole = NR.state.currentBookData.phoneUserRole;
        if (userRole && userRole.name) {
            userName = userRole.name;
        }
        
        // 生成回复
        NR.generateLiveDetail(room, '用户' + userName + '送出了礼物"' + giftName + '"（价值¥' + giftPrice + '）');
    };

})();
