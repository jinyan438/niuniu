/**
 * 小手机音乐模块 - 一起听功能
 * 移植自 phone/index2.js 的 ListenTogether 组件
 */
(function() {
    var NR = window.NovelReader;
    if (!NR) {
        console.error('NovelReader not found');
        return;
    }

    // ========== 音乐状态初始化 ==========
    
    NR.initMusicState = function() {
        if (!NR.state.phoneChatState.musicState) {
            NR.state.phoneChatState.musicState = {
                songs: [],           // 歌曲列表
                currentIndex: 0,     // 当前播放索引
                isPlaying: false,    // 是否正在播放
                currentTime: 0,      // 当前播放时间（秒）
                duration: 0,         // 歌曲总时长（秒）
                volume: 0.8,         // 音量 0-1
                playMode: 'sequence', // 播放模式: sequence/random
                showPlaylist: false, // 是否显示播放列表
                showSearch: false,   // 是否显示搜索面板
                chatExpanded: false, // 是否展开聊天
                chatMessages: [],    // 聊天消息
                listenDuration: 0,   // 一起听时长（秒）
                completedCount: 0,   // 已听完歌曲数
                searchQuery: '',     // 搜索关键词
                searchResults: []    // 搜索结果
            };
        }
        
        // 从持久化数据加载
        if (NR.state.currentBookData.musicData) {
            var saved = NR.state.currentBookData.musicData;
            NR.state.phoneChatState.musicState.songs = saved.songs || [];
            NR.state.phoneChatState.musicState.chatMessages = saved.chatMessages || [];
            NR.state.phoneChatState.musicState.listenDuration = saved.listenDuration || 0;
            NR.state.phoneChatState.musicState.completedCount = saved.completedCount || 0;
        }
    };

    // 保存音乐数据
    NR.saveMusicData = function() {
        var state = NR.state.phoneChatState.musicState;
        NR.state.currentBookData.musicData = {
            songs: state.songs,
            chatMessages: state.chatMessages,
            listenDuration: state.listenDuration,
            completedCount: state.completedCount
        };
        NR.saveBookData();
    };

    // ========== 渲染音乐界面 ==========
    
    NR.renderPhoneMusicScreen = function() {
        NR.initMusicState();
        var state = NR.state.phoneChatState.musicState;
        var currentSong = state.songs[state.currentIndex] || null;
        
        // 获取一起听的伙伴信息
        var partner = NR.getMusicPartner();
        var userData = NR.getMusicUserData();
        
        var html = '<div class="phone-app-container phone-music-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar music-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">一起听</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-music-search" title="搜索"><i class="fas fa-search"></i></button>';
        html += '<button class="phone-nav-btn" id="btn-music-playlist" title="播放列表"><i class="fas fa-bars"></i></button>';
        html += '</div>';
        html += '</div>';
        
        // 主内容区
        html += '<div class="phone-app-content music-content">';
        
        // 双头像区域
        html += '<div class="music-avatars-section">';
        html += NR.renderMusicAvatar(userData, state.isPlaying, true);
        html += NR.renderMusicAvatar(partner, state.isPlaying, false);
        html += '</div>';
        
        // 计时器区域
        html += '<div class="music-timer-section">';
        html += '<span class="music-timer-text">' + NR.formatMusicTimeHms(state.listenDuration) + '</span>';
        html += '<span class="music-timer-divider">·</span>';
        html += '<span class="music-timer-text">已听完 ' + state.completedCount + ' 首</span>';
        html += '</div>';
        
        // 播放器核心区域
        html += '<div class="music-player-core">';
        
        // 歌曲信息
        html += '<div class="music-song-section">';
        html += '<div class="music-song-title">' + NR.escapeHtml(currentSong ? currentSong.title : '暂无歌曲') + '</div>';
        html += '<div class="music-song-artist">' + NR.escapeHtml(currentSong ? currentSong.artist : '请添加歌曲') + '</div>';
        html += '</div>';
        
        // 进度条
        var progressPercent = state.duration > 0 ? (state.currentTime / state.duration * 100) : 0;
        html += '<div class="music-progress-section">';
        html += '<div class="music-progress-bar" id="music-progress-bar">';
        html += '<div class="music-progress-fill" style="width: ' + progressPercent + '%">';
        html += '<div class="music-progress-dot"></div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="music-progress-time">';
        html += '<span>' + NR.formatMusicTime(state.currentTime) + '</span>';
        html += '<span>' + NR.formatMusicTime(state.duration) + '</span>';
        html += '</div>';
        html += '</div>';
        
        // 控制按钮
        html += '<div class="music-controls-section">';
        html += '<button class="music-ctrl-btn" id="btn-music-volume" title="音量"><i class="fas ' + NR.getMusicVolumeIcon(state.volume) + '"></i></button>';
        html += '<button class="music-ctrl-btn" id="btn-music-prev" title="上一首"><i class="fas fa-step-backward"></i></button>';
        html += '<button class="music-ctrl-btn music-play-btn" id="btn-music-play" title="' + (state.isPlaying ? '暂停' : '播放') + '">';
        html += '<i class="fas ' + (state.isPlaying ? 'fa-pause' : 'fa-play') + '"></i>';
        html += '</button>';
        html += '<button class="music-ctrl-btn" id="btn-music-next" title="下一首"><i class="fas fa-step-forward"></i></button>';
        html += '<button class="music-ctrl-btn" id="btn-music-mode" title="播放模式">';
        html += '<i class="fas ' + (state.playMode === 'sequence' ? 'fa-sync-alt' : 'fa-random') + '"></i>';
        html += '</button>';
        html += '</div>';
        
        html += '</div>'; // end music-player-core
        
        // 聊天区域
        html += NR.renderMusicChatSection(state);
        
        html += '</div>'; // end music-content
        
        // 播放列表面板
        if (state.showPlaylist) {
            html += NR.renderMusicPlaylistPanel(state);
        }
        
        // 搜索面板
        if (state.showSearch) {
            html += NR.renderMusicSearchPanel(state);
        }
        
        html += '</div>'; // end phone-music-container
        
        return html;
    };


    // 渲染头像
    NR.renderMusicAvatar = function(user, isPlaying, isLeft) {
        var html = '<div class="music-avatar-item">';
        html += '<div class="music-avatar-wrapper">';
        
        // 波纹效果
        html += '<div class="music-ripple-ring' + (isPlaying ? ' active' : '') + '"></div>';
        html += '<div class="music-ripple-ring delay1' + (isPlaying ? ' active' : '') + '"></div>';
        
        // 音符效果
        html += '<div class="music-note-field music-note-field--' + (isLeft ? 'left' : 'right') + (isPlaying ? ' active' : '') + '">';
        html += '<span class="music-note music-note-1">♪</span>';
        html += '<span class="music-note music-note-2">♫</span>';
        html += '<span class="music-note music-note-3">♬</span>';
        html += '</div>';
        
        // 头像
        html += '<div class="music-avatar-ring' + (isPlaying ? ' active' : '') + '">';
        if (user.avatar) {
            html += '<img src="' + user.avatar + '" class="music-user-avatar" alt="' + NR.escapeHtml(user.name) + '">';
        } else {
            var color = NR.getCharacterColor(user.name, false);
            html += '<div class="music-user-avatar music-avatar-placeholder" style="background: ' + color.bg + '; color: ' + color.text + ';">';
            html += NR.escapeHtml((user.name || '?')[0]);
            html += '</div>';
        }
        html += '</div>';
        
        html += '</div>'; // end avatar-wrapper
        html += '<div class="music-avatar-name">' + NR.escapeHtml(user.name) + '</div>';
        html += '</div>';
        
        return html;
    };

    // 渲染聊天区域
    NR.renderMusicChatSection = function(state) {
        var html = '<div class="music-chat-section' + (state.chatExpanded ? ' expanded' : '') + '">';
        
        // 折叠切换栏
        html += '<div class="music-chat-toggle" id="music-chat-toggle">';
        html += '<div class="music-toggle-bar"></div>';
        html += '<span class="music-toggle-text">' + (state.chatExpanded ? '收起聊天' : '展开聊天') + '</span>';
        html += '</div>';
        
        // 聊天内容（展开时显示）
        if (state.chatExpanded) {
            html += '<div class="music-chat-content">';
            
            // 消息列表
            html += '<div class="music-chat-messages" id="music-chat-messages">';
            var partner = NR.getMusicPartner();
            var userData = NR.getMusicUserData();
            
            state.chatMessages.forEach(function(msg, idx) {
                if (msg.type === 'song-change') {
                    // 切歌系统消息
                    html += '<div class="music-chat-system-msg">';
                    html += '<span class="music-system-text">' + (msg.isMe ? '你' : NR.escapeHtml(partner.name)) + ' 切换了歌曲</span>';
                    if (msg.song) {
                        html += '<span class="music-system-song">「' + NR.escapeHtml(msg.song) + '」</span>';
                    }
                    html += '</div>';
                } else {
                    // 普通消息
                    html += '<div class="music-chat-msg' + (msg.isMe ? ' mine' : '') + '">';
                    if (!msg.isMe) {
                        if (partner.avatar) {
                            html += '<img src="' + partner.avatar + '" class="music-msg-avatar">';
                        } else {
                            var color = NR.getCharacterColor(partner.name, false);
                            html += '<div class="music-msg-avatar music-avatar-placeholder" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((partner.name || '?')[0]) + '</div>';
                        }
                    }
                    
                    html += '<div class="music-msg-bubble">';
                    html += '<div class="music-msg-content">' + NR.escapeHtml(msg.content || '') + '</div>';
                    if (msg.time) {
                        html += '<div class="music-msg-time">' + NR.escapeHtml(msg.time) + '</div>';
                    }
                    html += '</div>';
                    
                    if (msg.isMe) {
                        if (userData.avatar) {
                            html += '<img src="' + userData.avatar + '" class="music-msg-avatar">';
                        } else {
                            var color = NR.getCharacterColor(userData.name, false);
                            html += '<div class="music-msg-avatar music-avatar-placeholder" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((userData.name || '?')[0]) + '</div>';
                        }
                    }
                    html += '</div>';
                }
            });
            
            html += '</div>'; // end chat-messages
            
            // 输入区域
            html += '<div class="music-chat-input-area">';
            html += '<input type="text" id="music-chat-input" class="music-chat-input" placeholder="说点什么...">';
            html += '<button class="music-send-btn" id="btn-music-send"><i class="fas fa-paper-plane"></i></button>';
            html += '<button class="music-refresh-btn" id="btn-music-refresh" title="AI回复"><i class="fas fa-sync-alt"></i></button>';
            html += '</div>';
            
            html += '</div>'; // end chat-content
        }
        
        html += '</div>'; // end chat-section
        
        return html;
    };

    // 渲染播放列表面板
    NR.renderMusicPlaylistPanel = function(state) {
        var html = '<div class="music-playlist-panel">';
        
        html += '<div class="music-playlist-header">';
        html += '<div class="music-playlist-title">播放列表</div>';
        html += '<button class="music-close-btn" id="btn-close-playlist"><i class="fas fa-times"></i></button>';
        html += '</div>';
        
        html += '<div class="music-playlist-items">';
        
        if (state.songs.length === 0) {
            html += '<div class="music-playlist-empty">';
            html += '<p>暂无歌曲</p>';
            html += '<p class="empty-hint">点击搜索添加歌曲</p>';
            html += '</div>';
        } else {
            state.songs.forEach(function(song, index) {
                var isActive = index === state.currentIndex;
                html += '<div class="music-playlist-item' + (isActive ? ' active' : '') + '" data-index="' + index + '">';
                html += '<div class="music-playlist-item-number">' + (index + 1) + '</div>';
                html += '<div class="music-playlist-item-info">';
                html += '<div class="music-playlist-item-title">' + NR.escapeHtml(song.title) + '</div>';
                html += '<div class="music-playlist-item-artist">' + NR.escapeHtml(song.artist) + '</div>';
                html += '</div>';
                html += '<button class="music-playlist-item-delete" data-index="' + index + '" title="删除"><i class="fas fa-trash"></i></button>';
                html += '</div>';
            });
        }
        
        html += '</div>'; // end playlist-items
        
        // 添加歌曲按钮
        html += '<div class="music-playlist-footer">';
        html += '<button class="music-add-song-btn" id="btn-add-song"><i class="fas fa-plus"></i> 手动添加歌曲</button>';
        html += '</div>';
        
        html += '</div>'; // end playlist-panel
        
        return html;
    };

    // 渲染搜索面板
    NR.renderMusicSearchPanel = function(state) {
        var html = '<div class="music-search-panel">';
        
        html += '<div class="music-search-header">';
        html += '<div class="music-search-input-container">';
        html += '<i class="fas fa-search music-search-icon"></i>';
        html += '<input type="text" id="music-search-input" class="music-search-input" placeholder="搜索歌曲或歌手" value="' + NR.escapeHtml(state.searchQuery) + '">';
        if (state.searchQuery) {
            html += '<button class="music-clear-search" id="btn-clear-search"><i class="fas fa-times"></i></button>';
        }
        html += '</div>';
        html += '<button class="music-close-search" id="btn-close-search">取消</button>';
        html += '</div>';
        
        html += '<div class="music-search-content">';
        
        if (state.searchResults.length === 0 && state.searchQuery) {
            html += '<div class="music-search-status">';
            html += '<i class="fas fa-music"></i>';
            html += '<span>未找到相关歌曲</span>';
            html += '<p class="search-hint">试试手动添加歌曲</p>';
            html += '</div>';
        } else if (state.searchResults.length > 0) {
            html += '<div class="music-search-results">';
            state.searchResults.forEach(function(result, index) {
                html += '<div class="music-search-result-item" data-index="' + index + '">';
                html += '<div class="music-result-cover">';
                if (result.cover) {
                    html += '<img src="' + result.cover + '" alt="cover">';
                } else {
                    html += '<i class="fas fa-music"></i>';
                }
                html += '</div>';
                html += '<div class="music-result-info">';
                html += '<div class="music-result-title">' + NR.escapeHtml(result.title) + '</div>';
                html += '<div class="music-result-artist">' + NR.escapeHtml(result.artist) + '</div>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<div class="music-search-status">';
            html += '<i class="fas fa-search"></i>';
            html += '<span>输入关键词搜索歌曲</span>';
            html += '</div>';
        }
        
        html += '</div>'; // end search-content
        
        html += '</div>'; // end search-panel
        
        return html;
    };


    // ========== 辅助函数 ==========
    
    // 获取音乐伙伴信息
    NR.getMusicPartner = function() {
        // 优先使用选中的角色
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length > 0) {
            var partner = profiles[0];
            return {
                name: partner.name || '伙伴',
                avatar: partner.cover || ''
            };
        }
        return {
            name: '伙伴',
            avatar: ''
        };
    };

    // 获取用户信息
    NR.getMusicUserData = function() {
        var userRole = NR.state.currentBookData.phoneUserRole || {};
        return {
            name: userRole.displayName || '我',
            avatar: userRole.avatar || ''
        };
    };

    // 格式化时间 (秒 -> mm:ss)
    NR.formatMusicTime = function(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    };

    // 格式化时间 (秒 -> hh:mm:ss)
    NR.formatMusicTimeHms = function(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00:00';
        var hours = Math.floor(seconds / 3600);
        var mins = Math.floor((seconds % 3600) / 60);
        var secs = Math.floor(seconds % 60);
        return (hours < 10 ? '0' : '') + hours + ':' + 
               (mins < 10 ? '0' : '') + mins + ':' + 
               (secs < 10 ? '0' : '') + secs;
    };

    // 获取音量图标
    NR.getMusicVolumeIcon = function(volume) {
        if (volume === 0) return 'fa-volume-mute';
        if (volume < 0.5) return 'fa-volume-down';
        return 'fa-volume-up';
    };

    // ========== 播放控制函数 ==========
    
    // 切换播放/暂停
    NR.musicTogglePlay = function() {
        var state = NR.state.phoneChatState.musicState;
        if (state.songs.length === 0) {
            alert('请先添加歌曲');
            return;
        }
        state.isPlaying = !state.isPlaying;
        
        if (state.isPlaying) {
            NR.startMusicTimer();
        } else {
            NR.stopMusicTimer();
        }
        
        NR.refreshPhoneModal();
    };

    // 上一首
    NR.musicPrev = function() {
        var state = NR.state.phoneChatState.musicState;
        if (state.songs.length === 0) return;
        
        state.currentIndex = (state.currentIndex - 1 + state.songs.length) % state.songs.length;
        state.currentTime = 0;
        NR.addMusicSongChangeMessage(state.songs[state.currentIndex], true);
        NR.refreshPhoneModal();
    };

    // 下一首
    NR.musicNext = function() {
        var state = NR.state.phoneChatState.musicState;
        if (state.songs.length === 0) return;
        
        if (state.playMode === 'random') {
            state.currentIndex = Math.floor(Math.random() * state.songs.length);
        } else {
            state.currentIndex = (state.currentIndex + 1) % state.songs.length;
        }
        state.currentTime = 0;
        NR.addMusicSongChangeMessage(state.songs[state.currentIndex], true);
        NR.refreshPhoneModal();
    };

    // 播放指定歌曲
    NR.musicPlaySong = function(index) {
        var state = NR.state.phoneChatState.musicState;
        if (index < 0 || index >= state.songs.length) return;
        
        state.currentIndex = index;
        state.currentTime = 0;
        state.isPlaying = true;
        NR.addMusicSongChangeMessage(state.songs[index], true);
        NR.startMusicTimer();
        NR.refreshPhoneModal();
    };

    // 切换播放模式
    NR.musicToggleMode = function() {
        var state = NR.state.phoneChatState.musicState;
        state.playMode = state.playMode === 'sequence' ? 'random' : 'sequence';
        alert(state.playMode === 'sequence' ? '顺序播放' : '随机播放');
        NR.refreshPhoneModal();
    };

    // 添加歌曲
    NR.musicAddSong = function(song) {
        var state = NR.state.phoneChatState.musicState;
        state.songs.push(song);
        NR.saveMusicData();
        alert('已添加: ' + song.title);
        NR.refreshPhoneModal();
    };

    // 删除歌曲
    NR.musicDeleteSong = function(index) {
        var state = NR.state.phoneChatState.musicState;
        if (index < 0 || index >= state.songs.length) return;
        
        var song = state.songs[index];
        state.songs.splice(index, 1);
        
        // 调整当前索引
        if (state.currentIndex >= state.songs.length) {
            state.currentIndex = Math.max(0, state.songs.length - 1);
        } else if (index < state.currentIndex) {
            state.currentIndex--;
        }
        
        NR.saveMusicData();
        alert('已删除: ' + song.title);
        NR.refreshPhoneModal();
    };

    // 添加切歌消息
    NR.addMusicSongChangeMessage = function(song, isMe) {
        var state = NR.state.phoneChatState.musicState;
        state.chatMessages.push({
            type: 'song-change',
            song: song.title,
            artist: song.artist,
            isMe: isMe
        });
        NR.saveMusicData();
    };

    // ========== 计时器 ==========
    
    var musicTimerInterval = null;
    
    NR.startMusicTimer = function() {
        if (musicTimerInterval) return;
        
        musicTimerInterval = setInterval(function() {
            var state = NR.state.phoneChatState.musicState;
            if (!state.isPlaying) return;
            
            // 更新播放时间
            state.currentTime++;
            state.listenDuration++;
            
            // 模拟歌曲时长（如果没有设置，默认3分钟）
            if (state.duration === 0) {
                var currentSong = state.songs[state.currentIndex];
                state.duration = currentSong && currentSong.duration ? currentSong.duration : 180;
            }
            
            // 歌曲播放完毕
            if (state.currentTime >= state.duration) {
                state.completedCount++;
                NR.musicNext();
            }
            
            // 每10秒保存一次
            if (state.listenDuration % 10 === 0) {
                NR.saveMusicData();
            }
            
            // 更新进度条显示（不刷新整个界面）
            NR.updateMusicProgress();
        }, 1000);
    };

    NR.stopMusicTimer = function() {
        if (musicTimerInterval) {
            clearInterval(musicTimerInterval);
            musicTimerInterval = null;
        }
    };

    // 更新进度条（不刷新整个界面）
    NR.updateMusicProgress = function() {
        var state = NR.state.phoneChatState.musicState;
        var progressFill = document.querySelector('.music-progress-fill');
        var timeSpans = document.querySelectorAll('.music-progress-time span');
        var timerText = document.querySelector('.music-timer-text');
        
        if (progressFill && state.duration > 0) {
            var percent = (state.currentTime / state.duration * 100);
            progressFill.style.width = percent + '%';
        }
        
        if (timeSpans.length >= 2) {
            timeSpans[0].textContent = NR.formatMusicTime(state.currentTime);
            timeSpans[1].textContent = NR.formatMusicTime(state.duration);
        }
        
        if (timerText) {
            timerText.textContent = NR.formatMusicTimeHms(state.listenDuration);
        }
    };


    // ========== 聊天功能 ==========
    
    // 发送聊天消息
    NR.sendMusicChatMessage = function(content) {
        if (!content || !content.trim()) return;
        
        var state = NR.state.phoneChatState.musicState;
        state.chatMessages.push({
            type: 'text',
            content: content.trim(),
            isMe: true,
            time: NR.formatPhoneTime()
        });
        NR.saveMusicData();
        
        // 清空输入框
        var chatInput = document.getElementById('music-chat-input');
        if (chatInput) {
            chatInput.value = '';
        }
        
        NR.refreshPhoneModal();
        
        // 滚动到底部
        setTimeout(function() {
            var messagesContainer = document.getElementById('music-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    };

    // AI生成回复
    NR.generateMusicChatReply = function() {
        var state = NR.state.phoneChatState.musicState;
        var partner = NR.getMusicPartner();
        var currentSong = state.songs[state.currentIndex];
        
        // 检查AI配置
        if (!NR.state.aiSettings || !NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先配置AI设置');
            return;
        }
        
        // 获取角色详细信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var partnerProfile = profiles.length > 0 ? profiles[0] : null;
        var partnerInfo = '';
        if (partnerProfile) {
            partnerInfo = '\n角色信息：' + (partnerProfile.name || '') + 
                (partnerProfile.identity ? '，' + partnerProfile.identity : '') +
                (partnerProfile.personality ? '，性格：' + partnerProfile.personality : '');
        }
        
        // 构建提示词
        var songInfo = currentSong ? '当前正在播放: ' + currentSong.title + ' - ' + currentSong.artist : '暂无播放歌曲';
        var listenTime = '已一起听了 ' + NR.formatMusicTimeHms(state.listenDuration);
        
        var systemPrompt = '你正在扮演' + partner.name + '，和用户一起听音乐。' + partnerInfo + '\n' +
            songInfo + '\n' + listenTime + '\n' +
            '请根据当前情境，用简短的一两句话回复用户，可以评论歌曲、分享感受、或者闲聊。\n' +
            '回复要自然、亲切，符合角色性格。只输出回复内容，不要加任何前缀。';
        
        // 构建消息历史
        var messages = [{ role: 'system', content: systemPrompt }];
        var recentMessages = state.chatMessages.slice(-10);
        recentMessages.forEach(function(msg) {
            if (msg.type === 'text') {
                messages.push({
                    role: msg.isMe ? 'user' : 'assistant',
                    content: msg.content
                });
            }
        });
        
        // 如果没有用户消息，添加一个默认的
        if (!recentMessages.some(function(m) { return m.isMe && m.type === 'text'; })) {
            messages.push({ role: 'user', content: '（用户正在听歌）' });
        }
        
        // 添加加载提示消息
        var loadingMsgIndex = state.chatMessages.length;
        state.chatMessages.push({
            type: 'text',
            content: '正在思考...',
            isMe: false,
            isLoading: true,
            time: NR.formatPhoneTime()
        });
        NR.refreshPhoneModal();
        
        // 滚动到底部
        setTimeout(function() {
            var messagesContainer = document.getElementById('music-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
        
        console.log('[Music] 正在生成回复...');
        
        var apiUrl = NR.state.aiSettings.apiUrl.replace(/\/+$/, '');
        if (!apiUrl.endsWith('/chat/completions')) {
            apiUrl += '/chat/completions';
        }
        
        console.log('[Music] 发送AI请求:', apiUrl);
        console.log('[Music] 消息:', messages);
        
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + NR.state.aiSettings.apiKey
            },
            body: JSON.stringify({
                model: NR.state.aiSettings.modelName,
                messages: messages,
                stream: false
            })
        }).then(function(res) {
            console.log('[Music] API响应状态:', res.status);
            if (!res.ok) {
                return res.text().then(function(errText) {
                    throw new Error('API请求失败: ' + res.status + ' ' + errText);
                });
            }
            return res.json();
        }).then(function(data) {
            console.log('[Music] API响应数据:', data);
            var reply = (data.choices && data.choices[0] && data.choices[0].message) 
                ? data.choices[0].message.content.trim() : null;
            
            // 移除加载提示消息
            state.chatMessages = state.chatMessages.filter(function(m) { return !m.isLoading; });
            
            if (reply) {
                state.chatMessages.push({
                    type: 'text',
                    content: reply,
                    isMe: false,
                    time: NR.formatPhoneTime()
                });
                NR.saveMusicData();
                NR.refreshPhoneModal();
                
                setTimeout(function() {
                    var messagesContainer = document.getElementById('music-chat-messages');
                    if (messagesContainer) {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }, 100);
                
                console.log('[Music] 回复已生成');
            } else {
                NR.refreshPhoneModal();
                alert('AI未返回有效回复');
            }
        }).catch(function(err) {
            console.error('[Music] 生成回复失败:', err);
            // 移除加载提示消息
            state.chatMessages = state.chatMessages.filter(function(m) { return !m.isLoading; });
            NR.refreshPhoneModal();
            alert('生成回复失败: ' + err.message);
        });
    };

    // ========== 事件绑定 ==========
    
    NR.bindMusicEvents = function(modal) {
        if (!modal) return;
        
        // 搜索按钮
        var searchBtn = document.getElementById('btn-music-search');
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                var state = NR.state.phoneChatState.musicState;
                state.showSearch = !state.showSearch;
                state.showPlaylist = false;
                NR.refreshPhoneModal();
            });
        }
        
        // 播放列表按钮
        var playlistBtn = document.getElementById('btn-music-playlist');
        if (playlistBtn) {
            playlistBtn.addEventListener('click', function() {
                var state = NR.state.phoneChatState.musicState;
                state.showPlaylist = !state.showPlaylist;
                state.showSearch = false;
                NR.refreshPhoneModal();
            });
        }
        
        // 播放/暂停按钮
        var playBtn = document.getElementById('btn-music-play');
        if (playBtn) {
            playBtn.addEventListener('click', function() {
                NR.musicTogglePlay();
            });
        }
        
        // 上一首
        var prevBtn = document.getElementById('btn-music-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                NR.musicPrev();
            });
        }
        
        // 下一首
        var nextBtn = document.getElementById('btn-music-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                NR.musicNext();
            });
        }
        
        // 播放模式
        var modeBtn = document.getElementById('btn-music-mode');
        if (modeBtn) {
            modeBtn.addEventListener('click', function() {
                NR.musicToggleMode();
            });
        }
        
        // 聊天折叠切换
        var chatToggle = document.getElementById('music-chat-toggle');
        if (chatToggle) {
            chatToggle.addEventListener('click', function() {
                var state = NR.state.phoneChatState.musicState;
                state.chatExpanded = !state.chatExpanded;
                NR.refreshPhoneModal();
            });
        }
        
        // 发送聊天消息
        var sendBtn = document.getElementById('btn-music-send');
        var chatInput = document.getElementById('music-chat-input');
        if (sendBtn && chatInput) {
            sendBtn.addEventListener('click', function() {
                NR.sendMusicChatMessage(chatInput.value);
            });
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    NR.sendMusicChatMessage(chatInput.value);
                }
            });
        }
        
        // AI回复按钮
        var refreshBtn = document.getElementById('btn-music-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                NR.generateMusicChatReply();
            });
        }
        
        // 关闭播放列表
        var closePlaylistBtn = document.getElementById('btn-close-playlist');
        if (closePlaylistBtn) {
            closePlaylistBtn.addEventListener('click', function() {
                NR.state.phoneChatState.musicState.showPlaylist = false;
                NR.refreshPhoneModal();
            });
        }
        
        // 播放列表项点击
        modal.querySelectorAll('.music-playlist-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.music-playlist-item-delete')) return;
                var index = parseInt(this.dataset.index);
                NR.musicPlaySong(index);
            });
        });
        
        // 删除歌曲
        modal.querySelectorAll('.music-playlist-item-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var index = parseInt(this.dataset.index);
                if (confirm('确定要删除这首歌吗？')) {
                    NR.musicDeleteSong(index);
                }
            });
        });
        
        // 手动添加歌曲
        var addSongBtn = document.getElementById('btn-add-song');
        if (addSongBtn) {
            addSongBtn.addEventListener('click', function() {
                NR.showAddSongModal();
            });
        }
        
        // 关闭搜索
        var closeSearchBtn = document.getElementById('btn-close-search');
        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', function() {
                NR.state.phoneChatState.musicState.showSearch = false;
                NR.refreshPhoneModal();
            });
        }
        
        // 清空搜索
        var clearSearchBtn = document.getElementById('btn-clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', function() {
                NR.state.phoneChatState.musicState.searchQuery = '';
                NR.state.phoneChatState.musicState.searchResults = [];
                NR.refreshPhoneModal();
            });
        }
        
        // 搜索输入
        var searchInput = document.getElementById('music-search-input');
        if (searchInput) {
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    NR.state.phoneChatState.musicState.searchQuery = this.value;
                    // 这里可以添加实际的搜索逻辑
                    alert('搜索功能需要配置音乐API');
                }
            });
        }
        
        // 进度条点击
        var progressBar = document.getElementById('music-progress-bar');
        if (progressBar) {
            progressBar.addEventListener('click', function(e) {
                var state = NR.state.phoneChatState.musicState;
                if (state.duration === 0) return;
                
                var rect = this.getBoundingClientRect();
                var percent = (e.clientX - rect.left) / rect.width;
                state.currentTime = Math.floor(percent * state.duration);
                NR.updateMusicProgress();
            });
        }
    };

    // 显示添加歌曲弹窗
    NR.showAddSongModal = function() {
        var existingModal = document.getElementById('add-song-modal');
        if (existingModal) existingModal.remove();
        
        var html = '<div id="add-song-modal" class="modal" style="display: flex; z-index: 10002;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>🎵 添加歌曲</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="modal-body" style="padding: 20px;">';
        html += '<div class="form-group">';
        html += '<label>歌曲名称</label>';
        html += '<input type="text" id="add-song-title" class="form-control" placeholder="输入歌曲名称">';
        html += '</div>';
        html += '<div class="form-group">';
        html += '<label>歌手</label>';
        html += '<input type="text" id="add-song-artist" class="form-control" placeholder="输入歌手名称">';
        html += '</div>';
        html += '<div class="form-group">';
        html += '<label>时长（秒）</label>';
        html += '<input type="number" id="add-song-duration" class="form-control" placeholder="如：180" value="180">';
        html += '</div>';
        html += '</div>';
        html += '<div class="modal-footer">';
        html += '<button class="btn btn-secondary" id="btn-cancel-add-song">取消</button>';
        html += '<button class="btn btn-primary" id="btn-confirm-add-song">添加</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('add-song-modal');
        
        // 关闭按钮
        modal.querySelector('.close-button').addEventListener('click', function() {
            modal.remove();
        });
        
        // 取消按钮
        document.getElementById('btn-cancel-add-song').addEventListener('click', function() {
            modal.remove();
        });
        
        // 确认添加
        document.getElementById('btn-confirm-add-song').addEventListener('click', function() {
            var title = document.getElementById('add-song-title').value.trim();
            var artist = document.getElementById('add-song-artist').value.trim();
            var duration = parseInt(document.getElementById('add-song-duration').value) || 180;
            
            if (!title) {
                alert('请输入歌曲名称');
                return;
            }
            
            NR.musicAddSong({
                title: title,
                artist: artist || '未知歌手',
                duration: duration
            });
            
            modal.remove();
        });
        
        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    };

})();
