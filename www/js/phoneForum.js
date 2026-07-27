// 小手机论坛功能模块
(function() {
    var NR = window.NovelReader;

    // 初始化论坛数据状态
    NR.initForumData = function() {
        if (!NR.state.phoneChatState.forumState) {
            NR.state.phoneChatState.forumState = {
                selectedPost: null,
                isGenerating: false,
                isGeneratingReply: false,
                selectedContexts: []
            };
        }
        if (!NR.state.currentBookData.forumPosts) {
            NR.state.currentBookData.forumPosts = [];
        }
    };

    // 获取论坛帖子列表（按时间倒序）
    NR.getForumPosts = function() {
        var posts = NR.state.currentBookData.forumPosts || [];
        return posts.slice().sort(function(a, b) {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
    };

    // 渲染论坛主界面
    NR.renderPhoneForumScreen = function() {
        NR.initForumData();
        var posts = NR.getForumPosts();
        var forumState = NR.state.phoneChatState.forumState;
        
        var html = '<div class="phone-app-container phone-forum-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">论坛</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-forum-context" title="选择上下文">📝</button>';
        html += '<button class="phone-nav-btn" id="btn-forum-generate" title="生成帖子">✨</button>';
        html += '<button class="phone-nav-btn" id="btn-forum-post" title="发布帖子">✏️</button>';
        html += '</div>';
        html += '</div>';
        
        // 显示已选上下文数量
        var selectedContexts = forumState.selectedContexts || [];
        if (selectedContexts.length > 0) {
            html += '<div class="forum-context-badge">';
            html += '<span>📝 已选择 ' + selectedContexts.length + ' 个上下文</span>';
            html += '</div>';
        }
        
        // 内容区域
        html += '<div class="phone-app-content phone-forum-content">';
        
        // 生成中提示
        if (forumState.isGenerating) {
            html += '<div class="forum-generating">';
            html += '<div class="forum-generating-icon">✨</div>';
            html += '<p>正在生成帖子...</p>';
            html += '</div>';
        }

        if (posts.length === 0 && !forumState.isGenerating) {
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">📋</div>';
            html += '<p>暂无帖子</p>';
            html += '<p class="empty-hint">点击右上角 ✨ 生成帖子</p>';
            html += '</div>';
        } else if (posts.length > 0) {
            html += '<div class="forum-post-list">';
            
            posts.forEach(function(post, index) {
                html += NR.renderForumPostCard(post, index);
            });
            
            html += '</div>';
        }
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染单个帖子卡片
    NR.renderForumPostCard = function(post, index) {
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === post.author; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#8FB8ED', text: '#fff' };
        
        var html = '<div class="forum-post-card" data-index="' + index + '">';
        
        // 头部：头像和作者信息
        html += '<div class="forum-post-header">';
        if (profile && profile.cover) {
            html += '<div class="forum-avatar" style="background-image: url(' + profile.cover + ');"></div>';
        } else {
            html += '<div class="forum-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((post.author || '?')[0]) + '</div>';
        }
        html += '<div class="forum-author-info">';
        html += '<div class="forum-author-name">' + NR.escapeHtml(post.author || '匿名') + '</div>';
        html += '<div class="forum-post-time">' + NR.escapeHtml(post.time || '') + '</div>';
        html += '</div>';
        if (post.isMyPost) {
            html += '<span class="forum-my-tag">我的</span>';
        }
        html += '</div>';
        
        // 标题
        html += '<div class="forum-post-title">' + NR.escapeHtml(post.title || '无标题') + '</div>';
        
        // 内容预览
        var contentPreview = (post.content || '').substring(0, 100);
        if ((post.content || '').length > 100) contentPreview += '...';
        html += '<div class="forum-post-preview">' + NR.escapeHtml(contentPreview) + '</div>';
        
        // 底部：点赞、评论数和查看
        html += '<div class="forum-post-footer">';
        html += '<span class="forum-stat"><i class="fas fa-eye"></i> ' + (post.views || 0) + '</span>';
        html += '<span class="forum-stat"><i class="fas fa-heart"></i> ' + (post.likes || 0) + '</span>';
        html += '<span class="forum-stat"><i class="fas fa-comment"></i> ' + ((post.comments || []).length) + '</span>';
        html += '<span class="forum-view-detail">查看详情 →</span>';
        html += '</div>';
        
        html += '</div>';
        
        return html;
    };

    // 渲染帖子详情界面
    NR.renderPhoneForumPostScreen = function() {
        var forumState = NR.state.phoneChatState.forumState;
        var post = forumState.selectedPost;
        
        if (!post) {
            return NR.renderPhoneForumScreen();
        }
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === post.author; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#8FB8ED', text: '#fff' };
        
        var html = '<div class="phone-app-container phone-forum-detail-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-forum-back">←</button>';
        html += '<span class="phone-nav-title">帖子详情</span>';
        html += '<div class="phone-nav-right">';
        if (post.isMyPost) {
            html += '<button class="phone-nav-btn" id="btn-forum-delete" title="删除">🗑️</button>';
        }
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content forum-detail-content">';
        
        // 帖子主体
        html += '<div class="forum-detail-main">';
        
        // 标题
        html += '<div class="forum-detail-title">' + NR.escapeHtml(post.title || '无标题') + '</div>';
        
        // 头部
        html += '<div class="forum-post-header">';
        if (profile && profile.cover) {
            html += '<div class="forum-avatar" style="background-image: url(' + profile.cover + ');"></div>';
        } else {
            html += '<div class="forum-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((post.author || '?')[0]) + '</div>';
        }
        html += '<div class="forum-author-info">';
        html += '<div class="forum-author-name">' + NR.escapeHtml(post.author || '匿名') + '</div>';
        html += '<div class="forum-post-time">' + NR.escapeHtml(post.time || '') + '</div>';
        html += '</div>';
        html += '</div>';
        
        // 内容
        html += '<div class="forum-detail-text">' + NR.escapeHtml(post.content || '').replace(/\n/g, '<br>') + '</div>';
        
        // 互动栏
        html += '<div class="forum-detail-actions">';
        html += '<button class="forum-action-btn" id="btn-forum-like"><i class="fas fa-heart"></i> ' + (post.likes || 0) + '</button>';
        html += '<button class="forum-action-btn" id="btn-forum-comment-focus"><i class="fas fa-comment"></i> 评论</button>';
        html += '</div>';
        
        html += '</div>'; // end forum-detail-main
        
        // 评论区
        html += '<div class="forum-comments-section">';
        html += '<div class="forum-comments-header">评论 (' + ((post.comments || []).length) + ')</div>';
        
        var comments = post.comments || [];
        if (comments.length === 0 && !forumState.isGeneratingReply) {
            html += '<div class="forum-no-comments">暂无评论</div>';
        } else {
            html += '<div class="forum-comments-list">';
            comments.forEach(function(comment, idx) {
                html += NR.renderForumComment(comment, idx);
            });
            html += '</div>';
        }
        
        // 显示正在生成回复的提示
        if (forumState.isGeneratingReply) {
            html += '<div class="forum-generating-reply">';
            html += '<span class="generating-dot">●</span>';
            html += '<span>正在生成回复...</span>';
            html += '</div>';
        }
        
        html += '</div>'; // end forum-comments-section
        
        // 评论输入框
        html += '<div class="forum-comment-input-area">';
        html += '<input type="text" id="forum-comment-input" class="forum-comment-input" placeholder="写评论...">';
        html += '<button class="forum-comment-send" id="btn-forum-send-comment">发送</button>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染单条评论
    NR.renderForumComment = function(comment, index) {
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === comment.name; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#94a3b8', text: '#fff' };
        
        var html = '<div class="forum-comment-item" data-index="' + index + '">';
        
        // 头像
        if (profile && profile.cover) {
            html += '<div class="forum-comment-avatar" style="background-image: url(' + profile.cover + ');"></div>';
        } else {
            html += '<div class="forum-comment-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((comment.name || '?')[0]) + '</div>';
        }
        
        // 评论内容
        html += '<div class="forum-comment-body">';
        html += '<div class="forum-comment-header">';
        html += '<span class="forum-comment-name">' + NR.escapeHtml(comment.name || '匿名') + '</span>';
        if (comment.time) {
            html += '<span class="forum-comment-time">' + NR.escapeHtml(comment.time) + '</span>';
        }
        html += '</div>';
        
        // 回复引用
        if (comment.reply && comment.reply.name) {
            html += '<div class="forum-comment-reply-ref">回复 @' + NR.escapeHtml(comment.reply.name) + '</div>';
        }
        
        html += '<div class="forum-comment-text">' + NR.escapeHtml(comment.c || comment.content || '') + '</div>';
        html += '</div>';
        
        html += '</div>';
        
        return html;
    };


    // 渲染发布帖子界面
    NR.renderPhoneForumNewPostScreen = function() {
        var html = '<div class="phone-app-container phone-forum-newpost-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-forum-newpost-back">取消</button>';
        html += '<span class="phone-nav-title">发布帖子</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn forum-publish-btn" id="btn-forum-publish">发布</button>';
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content forum-newpost-content">';
        
        html += '<div class="forum-newpost-form">';
        html += '<input type="text" id="forum-post-title-input" class="forum-post-title-input" placeholder="输入帖子标题...">';
        html += '<textarea id="forum-post-content-input" class="forum-post-content-input" placeholder="分享你的想法..."></textarea>';
        html += '</div>';
        
        html += '<div class="forum-newpost-tips">';
        html += '<p>💡 发布后会自动生成角色的评论回复</p>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 显示论坛上下文选择弹窗
    NR.showForumContextModal = function() {
        var existingModal = document.getElementById('forum-context-modal');
        if (existingModal) existingModal.remove();
        
        var summaries = NR.state.currentBookData.summaries || [];
        var forumState = NR.state.phoneChatState.forumState;
        var selectedContexts = forumState.selectedContexts || [];
        
        var html = '<div id="forum-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="forum-context-body">';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，请先使用总结功能生成一些内容摘要</p>';
        } else {
            html += '<p class="hint" style="margin-bottom: 10px;">选择的总结将作为帖子生成的背景信息</p>';
            html += '<div class="forum-context-list">';
            summaries.slice().sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(s, idx) {
                var isChecked = selectedContexts.indexOf(idx) !== -1;
                html += '<label class="forum-context-item">';
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
        html += '<button class="control-button" id="btn-confirm-forum-context">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('forum-context-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        document.getElementById('btn-confirm-forum-context').addEventListener('click', function() {
            var checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            forumState.selectedContexts = [];
            checkboxes.forEach(function(cb) {
                if (cb.checked) {
                    forumState.selectedContexts.push(parseInt(cb.dataset.index));
                }
            });
            modal.remove();
            NR.refreshPhoneModal();
        });
    };

    // 生成论坛帖子（调用AI）
    NR.generateForum = function() {
        NR.initForumData();
        var forumState = NR.state.phoneChatState.forumState;
        
        if (forumState.isGenerating) {
            return;
        }
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        forumState.isGenerating = true;
        NR.refreshPhoneModal();
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length === 0) {
            forumState.isGenerating = false;
            alert('请先添加人物卡');
            NR.refreshPhoneModal();
            return;
        }
        
        // 构建角色列表
        var charList = profiles.map(function(p) {
            return '- ' + p.name + (p.isProtagonist ? '（主角）' : '') + (p.isImportant ? '（重要角色）' : '');
        }).join('\n');
        
        // 获取选中的上下文
        var selectedContexts = forumState.selectedContexts || [];
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
        var prompt = '你是一个角色扮演助手，请为以下角色生成论坛帖子内容。\n\n';
        prompt += '【可用角色】\n' + charList + '\n';
        prompt += contextText;
        prompt += '\n【生成要求】\n';
        prompt += '请生成2-4个论坛帖子，每个帖子包含：\n';
        prompt += '1. 发帖者（从角色列表中选择）\n';
        prompt += '2. 帖子标题（简洁有吸引力，10-30字）\n';
        prompt += '3. 帖子内容（符合角色性格，100-300字）\n';
        prompt += '4. 1-3条评论回复\n\n';
        prompt += '禁止生成用户（' + userName + '）的帖子。\n\n';
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'posts:\n';
        prompt += '  - author: "角色名"\n';
        prompt += '    title: "帖子标题"\n';
        prompt += '    content: "帖子内容..."\n';
        prompt += '    time: "' + timeStr + '"\n';
        prompt += '    views: 数字\n';
        prompt += '    likes: 数字\n';
        prompt += '    comments:\n';
        prompt += '      - name: "评论者名"\n';
        prompt += '        c: "评论内容"\n';
        prompt += '        time: "HH:MM"\n';
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
            
            // 解析YAML格式的帖子
            var posts = NR.parseForumYaml(content);
            
            if (posts && posts.length > 0) {
                // 添加时间戳和ID
                posts.forEach(function(post) {
                    post.timestamp = Date.now() + Math.random() * 1000;
                    post.id = 'forum_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                });
                
                // 保存帖子
                if (!NR.state.currentBookData.forumPosts) {
                    NR.state.currentBookData.forumPosts = [];
                }
                NR.state.currentBookData.forumPosts = NR.state.currentBookData.forumPosts.concat(posts);
                NR.saveBookData();
                
                console.info('[Forum] 帖子生成成功:', posts);
            } else {
                throw new Error('无法解析帖子内容');
            }
            
            forumState.isGenerating = false;
            NR.refreshPhoneModal();
            
        }).catch(function(err) {
            console.error('[Forum] 生成帖子失败:', err);
            forumState.isGenerating = false;
            alert('生成帖子失败: ' + err.message);
            NR.refreshPhoneModal();
        });
    };


    // 解析YAML格式的论坛帖子
    NR.parseForumYaml = function(content) {
        try {
            // 提取yaml代码块
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var posts = [];
            
            // 简单解析posts数组
            var postMatches = yamlContent.split(/\n\s*-\s*author:/);
            
            for (var i = 1; i < postMatches.length; i++) {
                var postStr = 'author:' + postMatches[i];
                var post = {
                    author: '',
                    title: '',
                    content: '',
                    time: '',
                    views: 0,
                    likes: 0,
                    comments: []
                };
                
                // 解析author
                var authorMatch = postStr.match(/author:\s*["']?([^"'\n]+)["']?/);
                if (authorMatch) post.author = authorMatch[1].trim();
                
                // 解析title
                var titleMatch = postStr.match(/title:\s*["']?([^"'\n]+)["']?/);
                if (titleMatch) post.title = titleMatch[1].trim();
                
                // 解析content
                var contentMatch = postStr.match(/content:\s*["']?([^"'\n]+)["']?/);
                if (contentMatch) post.content = contentMatch[1].trim();
                
                // 解析time
                var timeMatch = postStr.match(/time:\s*["']?([^"'\n]+)["']?/);
                if (timeMatch) post.time = timeMatch[1].trim();
                
                // 解析views
                var viewsMatch = postStr.match(/views:\s*(\d+)/);
                if (viewsMatch) post.views = parseInt(viewsMatch[1]);
                
                // 解析likes
                var likesMatch = postStr.match(/likes:\s*(\d+)/);
                if (likesMatch) post.likes = parseInt(likesMatch[1]);
                
                // 解析comments
                var commentsSection = postStr.match(/comments:\s*\n([\s\S]*?)(?=\n\s*-\s*author:|$)/);
                if (commentsSection) {
                    var commentMatches = commentsSection[1].split(/\n\s*-\s*name:/);
                    for (var j = 1; j < commentMatches.length; j++) {
                        var commentStr = 'name:' + commentMatches[j];
                        var comment = { name: '', c: '', time: '' };
                        
                        var nameMatch = commentStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                        if (nameMatch) comment.name = nameMatch[1].trim();
                        
                        var cMatch = commentStr.match(/c:\s*["']?([^"'\n]+)["']?/);
                        if (cMatch) comment.c = cMatch[1].trim();
                        
                        var commentTimeMatch = commentStr.match(/time:\s*["']?([^"'\n]+)["']?/);
                        if (commentTimeMatch) comment.time = commentTimeMatch[1].trim();
                        
                        if (comment.name && comment.c) {
                            post.comments.push(comment);
                        }
                    }
                }
                
                if (post.author && post.title && post.content) {
                    posts.push(post);
                }
            }
            
            return posts;
        } catch (e) {
            console.error('[Forum] 解析YAML失败:', e);
            return [];
        }
    };

    // 发布用户帖子
    NR.publishUserForumPost = function(title, content) {
        if (!title || !title.trim()) {
            alert('请输入帖子标题');
            return;
        }
        if (!content || !content.trim()) {
            alert('请输入帖子内容');
            return;
        }
        
        NR.initForumData();
        
        // 获取用户角色名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '我';
        
        // 获取当前时间
        var now = new Date();
        var timeStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + 
            (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + 
            (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        // 创建帖子
        var post = {
            id: 'forum_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            author: userName,
            title: title.trim(),
            content: content.trim(),
            time: timeStr,
            views: 1,
            likes: 0,
            comments: [],
            isMyPost: true,
            timestamp: Date.now()
        };
        
        // 保存帖子
        if (!NR.state.currentBookData.forumPosts) {
            NR.state.currentBookData.forumPosts = [];
        }
        NR.state.currentBookData.forumPosts.push(post);
        NR.saveBookData();
        
        // 返回论坛列表
        NR.state.phoneChatState.currentScreen = 'forum';
        NR.refreshPhoneModal();
        
        // 自动生成评论回复
        NR.generateForumCommentReplies(post);
    };

    // 生成论坛评论回复
    NR.generateForumCommentReplies = function(post) {
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            return;
        }
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length === 0) {
            return;
        }
        
        // 构建角色列表
        var charList = profiles.slice(0, 8).map(function(p) {
            return '- ' + p.name + (p.isProtagonist ? '（主角）' : '');
        }).join('\n');
        
        // 构建提示词
        var prompt = '你是一个角色扮演助手。用户发布了一个论坛帖子，请为以下角色生成评论回复。\n\n';
        prompt += '【帖子标题】\n' + post.title + '\n\n';
        prompt += '【帖子内容】\n' + post.content + '\n\n';
        prompt += '【可用角色】\n' + charList + '\n\n';
        prompt += '【要求】\n';
        prompt += '1. 生成2-4条评论，每条来自不同角色\n';
        prompt += '2. 评论要符合角色性格，自然真实\n';
        prompt += '3. 禁止生成用户自己的评论\n';
        prompt += '4. 每条评论包含 time 字段（格式 HH:MM）\n\n';
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'comments:\n';
        prompt += '  - name: "角色名"\n';
        prompt += '    c: "评论内容"\n';
        prompt += '    time: "HH:MM"\n';
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
            
            // 解析评论
            var comments = NR.parseForumComments(content);
            
            if (comments && comments.length > 0) {
                // 找到对应的帖子并添加评论
                var forumPosts = NR.state.currentBookData.forumPosts || [];
                var targetPost = forumPosts.find(function(p) { return p.id === post.id; });
                
                if (targetPost) {
                    targetPost.comments = (targetPost.comments || []).concat(comments);
                    NR.saveBookData();
                    NR.refreshPhoneModal();
                }
            }
        }).catch(function(err) {
            console.error('[Forum] 生成评论失败:', err);
        });
    };

    // 解析评论YAML
    NR.parseForumComments = function(content) {
        try {
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var comments = [];
            var commentMatches = yamlContent.split(/\n\s*-\s*name:/);
            
            for (var i = 1; i < commentMatches.length; i++) {
                var commentStr = 'name:' + commentMatches[i];
                var comment = { name: '', c: '', time: '' };
                
                var nameMatch = commentStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                if (nameMatch) comment.name = nameMatch[1].trim();
                
                var cMatch = commentStr.match(/c:\s*["']?([^"'\n]+)["']?/);
                if (cMatch) comment.c = cMatch[1].trim();
                
                var timeMatch = commentStr.match(/time:\s*["']?([^"'\n]+)["']?/);
                if (timeMatch) comment.time = timeMatch[1].trim();
                
                if (comment.name && comment.c) {
                    comments.push(comment);
                }
            }
            
            return comments;
        } catch (e) {
            console.error('[Forum] 解析评论失败:', e);
            return [];
        }
    };

    // 删除帖子
    NR.deleteForumPost = function(postId) {
        var forumPosts = NR.state.currentBookData.forumPosts || [];
        var index = forumPosts.findIndex(function(p) { return p.id === postId; });
        
        if (index !== -1) {
            forumPosts.splice(index, 1);
            NR.saveBookData();
        }
    };

    // 添加用户评论
    NR.addForumComment = function(postId, commentText) {
        if (!commentText || !commentText.trim()) return;
        
        var forumPosts = NR.state.currentBookData.forumPosts || [];
        var post = forumPosts.find(function(p) { return p.id === postId; });
        
        if (!post) return;
        
        // 获取用户角色名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '我';
        
        // 获取当前时间
        var now = new Date();
        var timeStr = (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + 
            (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        var comment = {
            name: userName,
            c: commentText.trim(),
            time: timeStr,
            isMyComment: true
        };
        
        if (!post.comments) post.comments = [];
        post.comments.push(comment);
        NR.saveBookData();
        
        // 设置生成状态并刷新
        var forumState = NR.state.phoneChatState.forumState;
        forumState.isGeneratingReply = true;
        NR.refreshPhoneModal();
        
        // 生成AI回复
        NR.generateForumCommentReply(post, comment);
    };

    // 生成评论回复
    NR.generateForumCommentReply = function(post, userComment) {
        var forumState = NR.state.phoneChatState.forumState;
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            forumState.isGeneratingReply = false;
            NR.refreshPhoneModal();
            return;
        }
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length === 0) {
            forumState.isGeneratingReply = false;
            NR.refreshPhoneModal();
            return;
        }
        
        // 获取用户名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '我';
        
        // 构建已有评论列表
        var existingComments = (post.comments || []).map(function(c, i) {
            var timeStr = c.time ? '（' + c.time + '）' : '';
            return (i + 1) + '. ' + c.name + timeStr + ': ' + c.c;
        }).join('\n');
        
        // 构建角色列表
        var charList = profiles.slice(0, 6).map(function(p) { return p.name; }).join('、');
        
        var prompt = '你是一个角色扮演助手。\n\n';
        prompt += '【帖子标题】' + post.title + '\n';
        prompt += '【帖子作者】' + post.author + '\n';
        prompt += '【帖子内容】' + post.content + '\n\n';
        prompt += '【已有评论】\n' + (existingComments || '暂无') + '\n\n';
        prompt += '【用户刚发表的评论】' + userName + ': ' + userComment.c + '\n\n';
        prompt += '【可用角色】' + charList + '\n\n';
        prompt += '【任务】生成1-2条来自其他角色的后续评论回复，禁止代替用户发言。\n';
        prompt += '如需回复某条评论，使用 reply 字段指定被回复者。\n\n';
        prompt += '【输出格式】\n```yaml\ncomments:\n  - name: "角色名"\n    c: "评论内容"\n    time: "HH:MM"\n    reply:\n      name: "被回复者名"\n```\n';
        
        var apiUrl = NR.state.aiSettings.apiUrl.replace(/\/+$/, '');
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
            
            var comments = NR.parseForumCommentsWithReply(content);
            
            if (comments && comments.length > 0) {
                // 过滤掉用户自己的评论
                comments = comments.filter(function(c) {
                    return c.name !== userName;
                });
                
                if (comments.length > 0) {
                    var forumPosts = NR.state.currentBookData.forumPosts || [];
                    var targetPost = forumPosts.find(function(p) { return p.id === post.id; });
                    
                    if (targetPost) {
                        targetPost.comments = (targetPost.comments || []).concat(comments);
                        NR.saveBookData();
                    }
                }
            }
            // 生成完成，清除状态
            forumState.isGeneratingReply = false;
            NR.refreshPhoneModal();
        }).catch(function(err) {
            console.error('[Forum] 生成回复失败:', err);
            forumState.isGeneratingReply = false;
            NR.refreshPhoneModal();
        });
    };

    // 解析带回复的评论YAML
    NR.parseForumCommentsWithReply = function(content) {
        try {
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var comments = [];
            var commentMatches = yamlContent.split(/\n\s*-\s*name:/);
            
            for (var i = 1; i < commentMatches.length; i++) {
                var commentStr = 'name:' + commentMatches[i];
                var comment = { name: '', c: '', time: '', reply: null };
                
                var nameMatch = commentStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                if (nameMatch) comment.name = nameMatch[1].trim();
                
                var cMatch = commentStr.match(/c:\s*["']?([^"'\n]+)["']?/);
                if (cMatch) comment.c = cMatch[1].trim();
                
                var timeMatch = commentStr.match(/time:\s*["']?([^"'\n]+)["']?/);
                if (timeMatch) comment.time = timeMatch[1].trim();
                
                // 解析reply
                var replySection = commentStr.match(/reply:\s*\n\s*name:\s*["']?([^"'\n]+)["']?/);
                if (replySection) {
                    comment.reply = { name: replySection[1].trim() };
                }
                
                if (comment.name && comment.c) {
                    comments.push(comment);
                }
            }
            
            return comments;
        } catch (e) {
            console.error('[Forum] 解析评论失败:', e);
            return [];
        }
    };


    // 绑定论坛相关事件
    NR.bindForumEvents = function(modal) {
        NR.initForumData();
        var forumState = NR.state.phoneChatState.forumState;
        var currentScreen = NR.state.phoneChatState.currentScreen;
        
        // 帖子卡片点击（查看详情）
        modal.querySelectorAll('.forum-post-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                var posts = NR.getForumPosts();
                
                if (posts[index]) {
                    forumState.selectedPost = posts[index];
                    // 增加浏览量
                    forumState.selectedPost.views = (forumState.selectedPost.views || 0) + 1;
                    NR.saveBookData();
                    NR.state.phoneChatState.currentScreen = 'forum-detail';
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 返回论坛列表
        var backBtn = document.getElementById('btn-forum-back');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                forumState.selectedPost = null;
                NR.state.phoneChatState.currentScreen = 'forum';
                NR.refreshPhoneModal();
            });
        }
        
        // 生成帖子按钮
        var generateBtn = document.getElementById('btn-forum-generate');
        if (generateBtn) {
            generateBtn.addEventListener('click', function() {
                NR.generateForum();
            });
        }
        
        // 选择上下文按钮
        var contextBtn = document.getElementById('btn-forum-context');
        if (contextBtn) {
            contextBtn.addEventListener('click', function() {
                NR.showForumContextModal();
            });
        }
        
        // 发布帖子按钮（进入发布页面）
        var postBtn = document.getElementById('btn-forum-post');
        if (postBtn) {
            postBtn.addEventListener('click', function() {
                NR.state.phoneChatState.currentScreen = 'forum-newpost';
                NR.refreshPhoneModal();
            });
        }
        
        // 发布页面返回
        var newpostBackBtn = document.getElementById('btn-forum-newpost-back');
        if (newpostBackBtn) {
            newpostBackBtn.addEventListener('click', function() {
                NR.state.phoneChatState.currentScreen = 'forum';
                NR.refreshPhoneModal();
            });
        }
        
        // 发布帖子
        var publishBtn = document.getElementById('btn-forum-publish');
        if (publishBtn) {
            publishBtn.addEventListener('click', function() {
                var titleInput = document.getElementById('forum-post-title-input');
                var contentInput = document.getElementById('forum-post-content-input');
                if (titleInput && contentInput) {
                    NR.publishUserForumPost(titleInput.value, contentInput.value);
                }
            });
        }
        
        // 删除帖子
        var deleteBtn = document.getElementById('btn-forum-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (forumState.selectedPost && confirm('确定要删除这个帖子吗？')) {
                    NR.deleteForumPost(forumState.selectedPost.id);
                    forumState.selectedPost = null;
                    NR.state.phoneChatState.currentScreen = 'forum';
                    NR.refreshPhoneModal();
                }
            });
        }
        
        // 发送评论
        var sendCommentBtn = document.getElementById('btn-forum-send-comment');
        var commentInput = document.getElementById('forum-comment-input');
        if (sendCommentBtn && commentInput) {
            sendCommentBtn.addEventListener('click', function() {
                if (forumState.selectedPost) {
                    NR.addForumComment(forumState.selectedPost.id, commentInput.value);
                    commentInput.value = '';
                }
            });
            
            commentInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && forumState.selectedPost) {
                    NR.addForumComment(forumState.selectedPost.id, commentInput.value);
                    commentInput.value = '';
                }
            });
        }
        
        // 点赞按钮
        var likeBtn = document.getElementById('btn-forum-like');
        if (likeBtn) {
            likeBtn.addEventListener('click', function() {
                if (forumState.selectedPost) {
                    forumState.selectedPost.likes = (forumState.selectedPost.likes || 0) + 1;
                    NR.saveBookData();
                    NR.refreshPhoneModal();
                }
            });
        }
    };

})();
