// 小手机动态功能模块
(function() {
    var NR = window.NovelReader;

    // 初始化动态数据状态
    NR.initDynamicData = function() {
        if (!NR.state.phoneChatState.dynamicState) {
            NR.state.phoneChatState.dynamicState = {
                selectedPost: null,
                isGenerating: false,
                selectedContexts: []
            };
        }
        if (!NR.state.currentBookData.dynamics) {
            NR.state.currentBookData.dynamics = [];
        }
    };

    // 获取动态列表（按时间倒序）
    NR.getDynamicPosts = function() {
        var dynamics = NR.state.currentBookData.dynamics || [];
        return dynamics.slice().sort(function(a, b) {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
    };

    // 渲染动态主界面
    NR.renderPhoneDynamicScreen = function() {
        NR.initDynamicData();
        var posts = NR.getDynamicPosts();
        var dynamicState = NR.state.phoneChatState.dynamicState;
        
        var html = '<div class="phone-app-container phone-dynamic-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">动态</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-dynamic-context" title="选择上下文">📝</button>';
        html += '<button class="phone-nav-btn" id="btn-dynamic-generate" title="生成动态">✨</button>';
        html += '<button class="phone-nav-btn" id="btn-dynamic-post" title="发布动态">✏️</button>';
        html += '</div>';
        html += '</div>';
        
        // 显示已选上下文数量
        var selectedContexts = dynamicState.selectedContexts || [];
        if (selectedContexts.length > 0) {
            html += '<div class="dynamic-context-badge">';
            html += '<span>📝 已选择 ' + selectedContexts.length + ' 个上下文</span>';
            html += '</div>';
        }
        
        // 内容区域
        html += '<div class="phone-app-content phone-dynamic-content">';
        
        // 生成中提示
        if (dynamicState.isGenerating) {
            html += '<div class="dynamic-generating">';
            html += '<div class="dynamic-generating-icon">✨</div>';
            html += '<p>正在生成动态...</p>';
            html += '</div>';
        }
        
        if (posts.length === 0 && !dynamicState.isGenerating) {
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">📱</div>';
            html += '<p>暂无动态</p>';
            html += '<p class="empty-hint">点击右上角 ✨ 生成动态</p>';
            html += '</div>';
        } else if (posts.length > 0) {
            html += '<div class="dynamic-list">';
            
            posts.forEach(function(post, index) {
                html += NR.renderDynamicPostCard(post, index);
            });
            
            html += '</div>';
        }
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染单个动态卡片
    NR.renderDynamicPostCard = function(post, index) {
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === post.author; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#8FB8ED', text: '#fff' };
        
        var html = '<div class="dynamic-post-card" data-index="' + index + '">';
        
        // 头部：头像和作者信息
        html += '<div class="dynamic-post-header">';
        if (profile && profile.cover) {
            html += '<div class="dynamic-avatar" style="background-image: url(' + profile.cover + ');"></div>';
        } else {
            html += '<div class="dynamic-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((post.author || '?')[0]) + '</div>';
        }
        html += '<div class="dynamic-author-info">';
        html += '<div class="dynamic-author-name">' + NR.escapeHtml(post.author || '匿名') + '</div>';
        html += '<div class="dynamic-post-time">' + NR.escapeHtml(post.time || '') + '</div>';
        html += '</div>';
        if (post.isMyPost) {
            html += '<span class="dynamic-my-tag">我的</span>';
        }
        html += '</div>';
        
        // 内容
        html += '<div class="dynamic-post-content">' + NR.escapeHtml(post.content || '') + '</div>';
        
        // 图片（如果有）
        if (post.images && post.images.length > 0) {
            html += '<div class="dynamic-post-images">';
            post.images.forEach(function(img) {
                html += '<img src="' + img + '" class="dynamic-post-image" alt="动态图片">';
            });
            html += '</div>';
        }
        
        // 底部：点赞和评论数
        html += '<div class="dynamic-post-footer">';
        html += '<span class="dynamic-stat"><i class="fas fa-heart"></i> ' + (post.likes || 0) + '</span>';
        html += '<span class="dynamic-stat"><i class="fas fa-comment"></i> ' + ((post.comments || []).length) + '</span>';
        html += '<span class="dynamic-view-detail">查看详情 →</span>';
        html += '</div>';
        
        html += '</div>';
        
        return html;
    };


    // 渲染动态详情界面
    NR.renderPhoneDynamicDetailScreen = function() {
        var dynamicState = NR.state.phoneChatState.dynamicState;
        var post = dynamicState.selectedPost;
        
        if (!post) {
            return NR.renderPhoneDynamicScreen();
        }
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === post.author; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#8FB8ED', text: '#fff' };
        
        var html = '<div class="phone-app-container phone-dynamic-detail-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-dynamic-back">←</button>';
        html += '<span class="phone-nav-title">动态详情</span>';
        html += '<div class="phone-nav-right">';
        if (post.isMyPost) {
            html += '<button class="phone-nav-btn" id="btn-dynamic-delete" title="删除">🗑️</button>';
        }
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content dynamic-detail-content">';
        
        // 动态主体
        html += '<div class="dynamic-detail-main">';
        
        // 头部
        html += '<div class="dynamic-post-header">';
        if (profile && profile.cover) {
            html += '<div class="dynamic-avatar" style="background-image: url(' + profile.cover + ');"></div>';
        } else {
            html += '<div class="dynamic-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((post.author || '?')[0]) + '</div>';
        }
        html += '<div class="dynamic-author-info">';
        html += '<div class="dynamic-author-name">' + NR.escapeHtml(post.author || '匿名') + '</div>';
        html += '<div class="dynamic-post-time">' + NR.escapeHtml(post.time || '') + '</div>';
        html += '</div>';
        html += '</div>';
        
        // 内容
        html += '<div class="dynamic-detail-text">' + NR.escapeHtml(post.content || '') + '</div>';
        
        // 图片
        if (post.images && post.images.length > 0) {
            html += '<div class="dynamic-detail-images">';
            post.images.forEach(function(img) {
                html += '<img src="' + img + '" class="dynamic-detail-image" alt="动态图片">';
            });
            html += '</div>';
        }
        
        // 互动栏
        html += '<div class="dynamic-detail-actions">';
        html += '<button class="dynamic-action-btn" id="btn-dynamic-like"><i class="fas fa-heart"></i> ' + (post.likes || 0) + '</button>';
        html += '<button class="dynamic-action-btn" id="btn-dynamic-comment-focus"><i class="fas fa-comment"></i> 评论</button>';
        html += '</div>';
        
        html += '</div>'; // end dynamic-detail-main
        
        // 评论区
        html += '<div class="dynamic-comments-section">';
        html += '<div class="dynamic-comments-header">评论 (' + ((post.comments || []).length) + ')</div>';
        
        var comments = post.comments || [];
        if (comments.length === 0) {
            html += '<div class="dynamic-no-comments">暂无评论</div>';
        } else {
            html += '<div class="dynamic-comments-list">';
            comments.forEach(function(comment, idx) {
                html += NR.renderDynamicComment(comment, idx);
            });
            html += '</div>';
        }
        
        html += '</div>'; // end dynamic-comments-section
        
        // 评论输入框
        html += '<div class="dynamic-comment-input-area">';
        html += '<input type="text" id="dynamic-comment-input" class="dynamic-comment-input" placeholder="写评论...">';
        html += '<button class="dynamic-comment-send" id="btn-dynamic-send-comment">发送</button>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染单条评论
    NR.renderDynamicComment = function(comment, index) {
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === comment.name; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#94a3b8', text: '#fff' };
        
        var html = '<div class="dynamic-comment-item" data-index="' + index + '">';
        
        // 头像
        if (profile && profile.cover) {
            html += '<div class="dynamic-comment-avatar" style="background-image: url(' + profile.cover + ');"></div>';
        } else {
            html += '<div class="dynamic-comment-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((comment.name || '?')[0]) + '</div>';
        }
        
        // 评论内容
        html += '<div class="dynamic-comment-body">';
        html += '<div class="dynamic-comment-name">' + NR.escapeHtml(comment.name || '匿名') + '</div>';
        html += '<div class="dynamic-comment-text">' + NR.escapeHtml(comment.c || comment.content || '') + '</div>';
        html += '</div>';
        
        html += '</div>';
        
        return html;
    };


    // 渲染发布动态界面
    NR.renderPhoneDynamicPostScreen = function() {
        var html = '<div class="phone-app-container phone-dynamic-post-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-dynamic-post-back">取消</button>';
        html += '<span class="phone-nav-title">发布动态</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn dynamic-publish-btn" id="btn-dynamic-publish">发布</button>';
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content dynamic-post-content">';
        
        html += '<div class="dynamic-post-form">';
        html += '<textarea id="dynamic-post-textarea" class="dynamic-post-textarea" placeholder="分享你的想法..."></textarea>';
        html += '</div>';
        
        html += '<div class="dynamic-post-tips">';
        html += '<p>💡 发布后会自动生成角色的评论回复</p>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 显示动态上下文选择弹窗
    NR.showDynamicContextModal = function() {
        var existingModal = document.getElementById('dynamic-context-modal');
        if (existingModal) existingModal.remove();
        
        var summaries = NR.state.currentBookData.summaries || [];
        var dynamicState = NR.state.phoneChatState.dynamicState;
        var selectedContexts = dynamicState.selectedContexts || [];
        
        var html = '<div id="dynamic-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="dynamic-context-body">';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，请先使用总结功能生成一些内容摘要</p>';
        } else {
            html += '<p class="hint" style="margin-bottom: 10px;">选择的总结将作为动态生成的背景信息</p>';
            html += '<div class="dynamic-context-list">';
            summaries.slice().sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(s, idx) {
                var isChecked = selectedContexts.indexOf(idx) !== -1;
                html += '<label class="dynamic-context-item">';
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
        html += '<button class="control-button" id="btn-confirm-dynamic-context">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('dynamic-context-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        document.getElementById('btn-confirm-dynamic-context').addEventListener('click', function() {
            var checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            dynamicState.selectedContexts = [];
            checkboxes.forEach(function(cb) {
                if (cb.checked) {
                    dynamicState.selectedContexts.push(parseInt(cb.dataset.index));
                }
            });
            modal.remove();
            NR.refreshPhoneModal();
        });
    };


    // 生成动态（调用AI）
    NR.generateDynamic = function() {
        NR.initDynamicData();
        var dynamicState = NR.state.phoneChatState.dynamicState;
        
        if (dynamicState.isGenerating) {
            return;
        }
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        dynamicState.isGenerating = true;
        NR.refreshPhoneModal();
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length === 0) {
            dynamicState.isGenerating = false;
            alert('请先添加人物卡');
            NR.refreshPhoneModal();
            return;
        }
        
        // 构建角色列表
        var charList = profiles.map(function(p) {
            return '- ' + p.name + (p.isProtagonist ? '（主角）' : '') + (p.isImportant ? '（重要角色）' : '');
        }).join('\n');
        
        // 获取选中的上下文
        var selectedContexts = dynamicState.selectedContexts || [];
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
        var prompt = '你是一个角色扮演助手，请为以下角色生成社交动态内容。\n\n';
        prompt += '【可用角色】\n' + charList + '\n';
        prompt += contextText;
        prompt += '\n【生成要求】\n';
        prompt += '请生成3-5条动态帖子，每条动态包含：\n';
        prompt += '1. 发布者（从角色列表中选择）\n';
        prompt += '2. 动态内容（符合角色性格，50-150字）\n';
        prompt += '3. 1-3条评论回复\n\n';
        prompt += '禁止生成用户（' + userName + '）的动态。\n\n';
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'posts:\n';
        prompt += '  - author: "角色名"\n';
        prompt += '    content: "动态内容..."\n';
        prompt += '    time: "' + timeStr + '"\n';
        prompt += '    likes: 数字\n';
        prompt += '    comments:\n';
        prompt += '      - name: "评论者名"\n';
        prompt += '        c: "评论内容"\n';
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
            
            // 解析YAML格式的动态
            var posts = NR.parseDynamicYaml(content);
            
            if (posts && posts.length > 0) {
                // 添加时间戳和ID
                posts.forEach(function(post) {
                    post.timestamp = Date.now() + Math.random() * 1000;
                    post.id = 'dynamic_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                });
                
                // 保存动态
                if (!NR.state.currentBookData.dynamics) {
                    NR.state.currentBookData.dynamics = [];
                }
                NR.state.currentBookData.dynamics = NR.state.currentBookData.dynamics.concat(posts);
                NR.saveBookData();
                
                console.info('[Dynamic] 动态生成成功:', posts);
            } else {
                throw new Error('无法解析动态内容');
            }
            
            dynamicState.isGenerating = false;
            NR.refreshPhoneModal();
            
        }).catch(function(err) {
            console.error('[Dynamic] 生成动态失败:', err);
            dynamicState.isGenerating = false;
            alert('生成动态失败: ' + err.message);
            NR.refreshPhoneModal();
        });
    };


    // 解析YAML格式的动态
    NR.parseDynamicYaml = function(content) {
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
                    content: '',
                    time: '',
                    likes: 0,
                    comments: []
                };
                
                // 解析author
                var authorMatch = postStr.match(/author:\s*["']?([^"'\n]+)["']?/);
                if (authorMatch) post.author = authorMatch[1].trim();
                
                // 解析content
                var contentMatch = postStr.match(/content:\s*["']?([^"'\n]+)["']?/);
                if (contentMatch) post.content = contentMatch[1].trim();
                
                // 解析time
                var timeMatch = postStr.match(/time:\s*["']?([^"'\n]+)["']?/);
                if (timeMatch) post.time = timeMatch[1].trim();
                
                // 解析likes
                var likesMatch = postStr.match(/likes:\s*(\d+)/);
                if (likesMatch) post.likes = parseInt(likesMatch[1]);
                
                // 解析comments
                var commentsSection = postStr.match(/comments:\s*\n([\s\S]*?)(?=\n\s*-\s*author:|$)/);
                if (commentsSection) {
                    var commentMatches = commentsSection[1].split(/\n\s*-\s*name:/);
                    for (var j = 1; j < commentMatches.length; j++) {
                        var commentStr = 'name:' + commentMatches[j];
                        var comment = { name: '', c: '' };
                        
                        var nameMatch = commentStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                        if (nameMatch) comment.name = nameMatch[1].trim();
                        
                        var cMatch = commentStr.match(/c:\s*["']?([^"'\n]+)["']?/);
                        if (cMatch) comment.c = cMatch[1].trim();
                        
                        if (comment.name && comment.c) {
                            post.comments.push(comment);
                        }
                    }
                }
                
                if (post.author && post.content) {
                    posts.push(post);
                }
            }
            
            return posts;
        } catch (e) {
            console.error('[Dynamic] 解析YAML失败:', e);
            return [];
        }
    };

    // 发布用户动态
    NR.publishUserDynamic = function(content) {
        if (!content || !content.trim()) {
            alert('请输入动态内容');
            return;
        }
        
        NR.initDynamicData();
        var dynamicState = NR.state.phoneChatState.dynamicState;
        
        // 获取用户角色名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '我';
        
        // 获取当前时间
        var now = new Date();
        var timeStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + 
            (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + 
            (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        // 创建动态
        var post = {
            id: 'dynamic_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            author: userName,
            content: content.trim(),
            time: timeStr,
            likes: 0,
            comments: [],
            isMyPost: true,
            timestamp: Date.now()
        };
        
        // 保存动态
        if (!NR.state.currentBookData.dynamics) {
            NR.state.currentBookData.dynamics = [];
        }
        NR.state.currentBookData.dynamics.push(post);
        NR.saveBookData();
        
        // 返回动态列表
        NR.state.phoneChatState.currentScreen = 'dynamic';
        NR.refreshPhoneModal();
        
        // 自动生成评论回复
        NR.generateDynamicReplies(post);
    };


    // 生成动态评论回复
    NR.generateDynamicReplies = function(post) {
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
        var prompt = '你是一个角色扮演助手。用户发布了一条动态，请为以下角色生成评论回复。\n\n';
        prompt += '【动态内容】\n' + post.content + '\n\n';
        prompt += '【可用角色】\n' + charList + '\n\n';
        prompt += '【要求】\n';
        prompt += '1. 生成3-5条评论，每条来自不同角色\n';
        prompt += '2. 评论要符合角色性格，自然真实\n';
        prompt += '3. 禁止生成用户自己的评论\n\n';
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'comments:\n';
        prompt += '  - name: "角色名"\n';
        prompt += '    c: "评论内容"\n';
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
            var comments = NR.parseDynamicComments(content);
            
            if (comments && comments.length > 0) {
                // 找到对应的动态并添加评论
                var dynamics = NR.state.currentBookData.dynamics || [];
                var targetPost = dynamics.find(function(p) { return p.id === post.id; });
                
                if (targetPost) {
                    targetPost.comments = (targetPost.comments || []).concat(comments);
                    NR.saveBookData();
                    NR.refreshPhoneModal();
                }
            }
        }).catch(function(err) {
            console.error('[Dynamic] 生成评论失败:', err);
        });
    };

    // 解析评论YAML
    NR.parseDynamicComments = function(content) {
        try {
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var comments = [];
            var commentMatches = yamlContent.split(/\n\s*-\s*name:/);
            
            for (var i = 1; i < commentMatches.length; i++) {
                var commentStr = 'name:' + commentMatches[i];
                var comment = { name: '', c: '' };
                
                var nameMatch = commentStr.match(/name:\s*["']?([^"'\n]+)["']?/);
                if (nameMatch) comment.name = nameMatch[1].trim();
                
                var cMatch = commentStr.match(/c:\s*["']?([^"'\n]+)["']?/);
                if (cMatch) comment.c = cMatch[1].trim();
                
                if (comment.name && comment.c) {
                    comments.push(comment);
                }
            }
            
            return comments;
        } catch (e) {
            console.error('[Dynamic] 解析评论失败:', e);
            return [];
        }
    };

    // 删除动态
    NR.deleteDynamic = function(postId) {
        var dynamics = NR.state.currentBookData.dynamics || [];
        var index = dynamics.findIndex(function(p) { return p.id === postId; });
        
        if (index !== -1) {
            dynamics.splice(index, 1);
            NR.saveBookData();
        }
    };

    // 添加用户评论
    NR.addDynamicComment = function(postId, commentText) {
        if (!commentText || !commentText.trim()) return;
        
        var dynamics = NR.state.currentBookData.dynamics || [];
        var post = dynamics.find(function(p) { return p.id === postId; });
        
        if (!post) return;
        
        // 获取用户角色名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '我';
        
        var comment = {
            name: userName,
            c: commentText.trim(),
            isMyComment: true
        };
        
        if (!post.comments) post.comments = [];
        post.comments.push(comment);
        NR.saveBookData();
        NR.refreshPhoneModal();
        
        // 生成回复
        NR.generateCommentReply(post, comment);
    };


    // 生成评论回复
    NR.generateCommentReply = function(post, userComment) {
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            return;
        }
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length === 0) return;
        
        // 获取用户名
        var userRole = NR.state.phoneChatState.userRole || {};
        var userName = userRole.customName || '我';
        
        // 构建已有评论列表
        var existingComments = (post.comments || []).map(function(c, i) {
            return (i + 1) + '. ' + c.name + ': ' + c.c;
        }).join('\n');
        
        // 构建角色列表
        var charList = profiles.slice(0, 6).map(function(p) { return p.name; }).join('、');
        
        var prompt = '你是一个角色扮演助手。\n\n';
        prompt += '【动态发布者】' + post.author + '\n';
        prompt += '【动态内容】' + post.content + '\n\n';
        prompt += '【已有评论】\n' + (existingComments || '暂无') + '\n\n';
        prompt += '【用户刚发表的评论】' + userName + ': ' + userComment.c + '\n\n';
        prompt += '【可用角色】' + charList + '\n\n';
        prompt += '【任务】生成1-2条来自其他角色的后续评论回复，禁止代替用户发言。\n\n';
        prompt += '【输出格式】\n```yaml\ncomments:\n  - name: "角色名"\n    c: "评论内容"\n```\n';
        
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
            
            var comments = NR.parseDynamicComments(content);
            
            if (comments && comments.length > 0) {
                // 过滤掉用户自己的评论
                comments = comments.filter(function(c) {
                    return c.name !== userName;
                });
                
                if (comments.length > 0) {
                    var dynamics = NR.state.currentBookData.dynamics || [];
                    var targetPost = dynamics.find(function(p) { return p.id === post.id; });
                    
                    if (targetPost) {
                        targetPost.comments = (targetPost.comments || []).concat(comments);
                        NR.saveBookData();
                        NR.refreshPhoneModal();
                    }
                }
            }
        }).catch(function(err) {
            console.error('[Dynamic] 生成回复失败:', err);
        });
    };

    // 绑定动态相关事件
    NR.bindDynamicEvents = function(modal) {
        NR.initDynamicData();
        var dynamicState = NR.state.phoneChatState.dynamicState;
        var currentScreen = NR.state.phoneChatState.currentScreen;
        
        // 动态卡片点击（查看详情）
        modal.querySelectorAll('.dynamic-post-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                var posts = NR.getDynamicPosts();
                
                if (posts[index]) {
                    dynamicState.selectedPost = posts[index];
                    NR.state.phoneChatState.currentScreen = 'dynamic-detail';
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 返回动态列表
        var backBtn = document.getElementById('btn-dynamic-back');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                dynamicState.selectedPost = null;
                NR.state.phoneChatState.currentScreen = 'dynamic';
                NR.refreshPhoneModal();
            });
        }
        
        // 生成动态按钮
        var generateBtn = document.getElementById('btn-dynamic-generate');
        if (generateBtn) {
            generateBtn.addEventListener('click', function() {
                NR.generateDynamic();
            });
        }
        
        // 选择上下文按钮
        var contextBtn = document.getElementById('btn-dynamic-context');
        if (contextBtn) {
            contextBtn.addEventListener('click', function() {
                NR.showDynamicContextModal();
            });
        }
        
        // 发布动态按钮（进入发布页面）
        var postBtn = document.getElementById('btn-dynamic-post');
        if (postBtn) {
            postBtn.addEventListener('click', function() {
                NR.state.phoneChatState.currentScreen = 'dynamic-post';
                NR.refreshPhoneModal();
            });
        }
        
        // 发布页面返回
        var postBackBtn = document.getElementById('btn-dynamic-post-back');
        if (postBackBtn) {
            postBackBtn.addEventListener('click', function() {
                NR.state.phoneChatState.currentScreen = 'dynamic';
                NR.refreshPhoneModal();
            });
        }
        
        // 发布动态
        var publishBtn = document.getElementById('btn-dynamic-publish');
        if (publishBtn) {
            publishBtn.addEventListener('click', function() {
                var textarea = document.getElementById('dynamic-post-textarea');
                if (textarea) {
                    NR.publishUserDynamic(textarea.value);
                }
            });
        }
        
        // 删除动态
        var deleteBtn = document.getElementById('btn-dynamic-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (dynamicState.selectedPost && confirm('确定要删除这条动态吗？')) {
                    NR.deleteDynamic(dynamicState.selectedPost.id);
                    dynamicState.selectedPost = null;
                    NR.state.phoneChatState.currentScreen = 'dynamic';
                    NR.refreshPhoneModal();
                }
            });
        }
        
        // 发送评论
        var sendCommentBtn = document.getElementById('btn-dynamic-send-comment');
        var commentInput = document.getElementById('dynamic-comment-input');
        if (sendCommentBtn && commentInput) {
            sendCommentBtn.addEventListener('click', function() {
                if (dynamicState.selectedPost) {
                    NR.addDynamicComment(dynamicState.selectedPost.id, commentInput.value);
                    commentInput.value = '';
                }
            });
            
            commentInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && dynamicState.selectedPost) {
                    NR.addDynamicComment(dynamicState.selectedPost.id, commentInput.value);
                    commentInput.value = '';
                }
            });
        }
        
        // 点赞按钮
        var likeBtn = document.getElementById('btn-dynamic-like');
        if (likeBtn) {
            likeBtn.addEventListener('click', function() {
                if (dynamicState.selectedPost) {
                    dynamicState.selectedPost.likes = (dynamicState.selectedPost.likes || 0) + 1;
                    NR.saveBookData();
                    NR.refreshPhoneModal();
                }
            });
        }
    };

})();
