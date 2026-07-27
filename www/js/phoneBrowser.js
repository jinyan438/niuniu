// 小手机浏览器功能模块
(function() {
    var NR = window.NovelReader;

    // 初始化浏览器数据状态
    NR.initBrowserData = function() {
        if (!NR.state.phoneChatState.browserState) {
            NR.state.phoneChatState.browserState = {
                searchQuery: '',
                searchResults: [],
                selectedResult: null,
                isLoading: false,
                error: null,
                selectedContexts: []
            };
        }
        if (!NR.state.currentBookData.browserHistory) {
            NR.state.currentBookData.browserHistory = [];
        }
    };

    // 渲染浏览器主界面（搜索首页）
    NR.renderPhoneBrowserScreen = function() {
        NR.initBrowserData();
        var browserState = NR.state.phoneChatState.browserState;
        
        var html = '<div class="phone-app-container phone-browser-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar browser-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<div class="browser-url-bar">';
        html += '<i class="fas fa-globe browser-url-icon"></i>';
        html += '<span class="browser-url-text">搜索或输入网址</span>';
        html += '</div>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-browser-context" title="选择上下文">📝</button>';
        html += '</div>';
        html += '</div>';
        
        // 显示已选上下文数量
        var selectedContexts = browserState.selectedContexts || [];
        if (selectedContexts.length > 0) {
            html += '<div class="browser-context-badge">';
            html += '<span>📝 已选择 ' + selectedContexts.length + ' 个上下文</span>';
            html += '</div>';
        }
        
        // 内容区域
        html += '<div class="phone-app-content browser-content">';
        
        if (browserState.isLoading) {
            // 加载中状态
            html += '<div class="browser-loading-container">';
            html += '<div class="browser-loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
            html += '<p class="browser-loading-text">正在搜索...</p>';
            html += '<p class="browser-loading-hint">AI正在生成搜索结果</p>';
            html += '<button class="browser-abort-btn" id="btn-browser-abort">';
            html += '<i class="fas fa-times"></i><span>取消</span>';
            html += '</button>';
            html += '</div>';
        } else if (browserState.error) {
            // 错误状态
            html += '<div class="browser-error-container">';
            html += '<div class="browser-error-icon"><i class="fas fa-exclamation-circle"></i></div>';
            html += '<p class="browser-error-text">' + NR.escapeHtml(browserState.error) + '</p>';
            html += '<button class="browser-retry-btn" id="btn-browser-retry">';
            html += '<i class="fas fa-redo"></i> 重试';
            html += '</button>';
            html += '</div>';
        } else if (browserState.selectedResult) {
            // 显示详情页
            html += NR.renderBrowserDetailView(browserState.selectedResult);
        } else if (browserState.searchResults && browserState.searchResults.length > 0) {
            // 显示搜索结果
            html += NR.renderBrowserSearchResults(browserState);
        } else {
            // 显示搜索首页
            html += NR.renderBrowserHomePage();
        }
        
        html += '</div>'; // end browser-content
        html += '</div>'; // end phone-browser-container
        
        return html;
    };

    // 渲染浏览器首页
    NR.renderBrowserHomePage = function() {
        var html = '<div class="browser-home-search-container">';
        
        // Logo
        html += '<div class="browser-abstract-logo">';
        var letters = ['S', 'e', 'a', 'r', 'c', 'h'];
        letters.forEach(function(letter, idx) {
            html += '<span class="browser-abstract-letter" style="animation-delay: ' + (idx * 0.1) + 's;">' + letter + '</span>';
        });
        html += '</div>';
        
        // 搜索框
        html += '<form class="browser-search-form" id="browser-search-form">';
        html += '<div class="browser-search-input-container">';
        html += '<input type="text" class="browser-search-input" id="browser-search-input" placeholder="搜索任何内容...">';
        html += '<button type="submit" class="browser-search-btn" id="btn-browser-search">';
        html += '<i class="fas fa-search"></i>';
        html += '</button>';
        html += '</div>';
        html += '</form>';
        
        // 搜索历史
        var history = NR.state.currentBookData.browserHistory || [];
        if (history.length > 0) {
            html += '<div class="browser-history-section">';
            html += '<div class="browser-history-header">最近搜索</div>';
            html += '<div class="browser-history-list">';
            history.slice(0, 5).forEach(function(item) {
                html += '<div class="browser-history-item" data-query="' + NR.escapeHtml(item.query) + '">';
                html += '<i class="fas fa-history"></i>';
                html += '<span>' + NR.escapeHtml(item.query) + '</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    };


    // 渲染搜索结果列表
    NR.renderBrowserSearchResults = function(browserState) {
        var html = '<div class="browser-search-results">';
        
        // 搜索头部
        html += '<div class="browser-search-header">';
        html += '<div class="browser-search-query-display">';
        html += '<i class="fas fa-search"></i>';
        html += '<span>' + NR.escapeHtml(browserState.searchQuery) + '</span>';
        html += '</div>';
        html += '<div class="browser-results-count">找到 ' + browserState.searchResults.length + ' 个结果</div>';
        html += '</div>';
        
        // 结果列表
        browserState.searchResults.forEach(function(result, index) {
            html += '<div class="browser-result-card" data-index="' + index + '" style="animation-delay: ' + (index * 0.1) + 's;">';
            html += '<div class="browser-result-url">' + NR.escapeHtml(result.url || 'www.example.com') + '</div>';
            html += '<div class="browser-result-title">' + NR.escapeHtml(result.title || '无标题') + '</div>';
            html += '<div class="browser-result-preview">' + NR.escapeHtml(result.preview || result.description || '') + '</div>';
            html += '</div>';
        });
        
        // 新搜索按钮
        html += '<div class="browser-new-search">';
        html += '<button class="browser-new-search-btn" id="btn-browser-new-search">';
        html += '<i class="fas fa-search"></i> 新搜索';
        html += '</button>';
        html += '</div>';
        
        html += '</div>';
        return html;
    };

    // 渲染详情页
    NR.renderBrowserDetailView = function(result) {
        var html = '<div class="browser-detail-view">';
        
        // 返回按钮
        html += '<div class="browser-detail-header" id="btn-browser-back-to-results">';
        html += '<i class="fas fa-arrow-left"></i>';
        html += '<span>返回搜索结果</span>';
        html += '</div>';
        
        // 详情内容
        html += '<div class="browser-detail-content">';
        html += '<h1 class="browser-detail-title">' + NR.escapeHtml(result.title || '无标题') + '</h1>';
        html += '<div class="browser-detail-url">' + NR.escapeHtml(result.url || '') + '</div>';
        html += '<div class="browser-detail-body">' + (result.content || result.preview || '暂无内容') + '</div>';
        html += '</div>';
        
        // 分享按钮
        html += '<button class="browser-share-float-btn" id="btn-browser-share" title="分享到聊天">';
        html += '<i class="fas fa-share-alt"></i>';
        html += '</button>';
        
        html += '</div>';
        return html;
    };

    // 显示浏览器上下文选择弹窗
    NR.showBrowserContextModal = function() {
        var existingModal = document.getElementById('browser-context-modal');
        if (existingModal) existingModal.remove();
        
        var summaries = NR.state.currentBookData.summaries || [];
        var browserState = NR.state.phoneChatState.browserState;
        var selectedContexts = browserState.selectedContexts || [];
        
        var html = '<div id="browser-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="browser-context-body">';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，请先使用总结功能生成一些内容摘要</p>';
        } else {
            html += '<p class="hint" style="margin-bottom: 10px;">选择的总结将作为搜索的背景信息</p>';
            html += '<div class="browser-context-list">';
            summaries.slice().sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(s, idx) {
                var isChecked = selectedContexts.indexOf(idx) !== -1;
                html += '<label class="browser-context-item">';
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
        html += '<button class="control-button" id="btn-confirm-browser-context">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('browser-context-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        document.getElementById('btn-confirm-browser-context').addEventListener('click', function() {
            var checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            browserState.selectedContexts = [];
            checkboxes.forEach(function(cb) {
                if (cb.checked) {
                    browserState.selectedContexts.push(parseInt(cb.dataset.index));
                }
            });
            modal.remove();
            NR.refreshPhoneModal();
        });
    };

    // 执行浏览器搜索
    NR.performBrowserSearch = function(query) {
        NR.initBrowserData();
        var browserState = NR.state.phoneChatState.browserState;
        
        if (!query || !query.trim()) {
            return;
        }
        
        query = query.trim();
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        browserState.searchQuery = query;
        browserState.isLoading = true;
        browserState.error = null;
        browserState.searchResults = [];
        browserState.selectedResult = null;
        NR.refreshPhoneModal();
        
        // 保存搜索历史
        var history = NR.state.currentBookData.browserHistory || [];
        // 移除重复项
        history = history.filter(function(item) { return item.query !== query; });
        // 添加到开头
        history.unshift({ query: query, timestamp: Date.now() });
        // 只保留最近10条
        NR.state.currentBookData.browserHistory = history.slice(0, 10);
        NR.saveBookData();
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var charList = profiles.slice(0, 10).map(function(p) {
            return '- ' + p.name + (p.isProtagonist ? '（主角）' : '') + (p.isImportant ? '（重要角色）' : '');
        }).join('\n');
        
        // 获取选中的上下文
        var selectedContexts = browserState.selectedContexts || [];
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
        var prompt = '你是一个虚拟世界的搜索引擎，请根据用户的搜索词生成符合故事世界观的搜索结果。\n\n';
        prompt += '【搜索词】' + query + '\n\n';
        if (charList) {
            prompt += '【故事中的角色】\n' + charList + '\n';
        }
        prompt += contextText;
        prompt += '\n【生成要求】\n';
        prompt += '请生成3-5条搜索结果，每条结果包含：\n';
        prompt += '1. title: 网页标题\n';
        prompt += '2. url: 虚构的网址（如 www.xxx.com/xxx）\n';
        prompt += '3. preview: 搜索结果预览（50-100字）\n';
        prompt += '4. content: 网页详细内容（200-500字，可包含HTML标签如<h2>、<p>、<ul>等）\n\n';
        prompt += '搜索结果应该符合故事的世界观和设定，可以是新闻、百科、论坛帖子等形式。\n\n';
        prompt += '【输出格式】请严格按照以下YAML格式输出：\n\n';
        prompt += '```yaml\n';
        prompt += 'results:\n';
        prompt += '  - title: "网页标题"\n';
        prompt += '    url: "www.example.com/page"\n';
        prompt += '    preview: "搜索结果预览..."\n';
        prompt += '    content: "<p>详细内容...</p>"\n';
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
            
            // 解析YAML格式的搜索结果
            var results = NR.parseBrowserYaml(content);
            
            if (results && results.length > 0) {
                browserState.searchResults = results;
                browserState.isLoading = false;
                browserState.error = null;
                console.info('[Browser] 搜索成功:', results);
            } else {
                throw new Error('无法解析搜索结果');
            }
            
            NR.refreshPhoneModal();
            
        }).catch(function(err) {
            console.error('[Browser] 搜索失败:', err);
            browserState.isLoading = false;
            browserState.error = err.message;
            NR.refreshPhoneModal();
        });
    };


    // 解析YAML格式的搜索结果
    NR.parseBrowserYaml = function(content) {
        try {
            // 提取yaml代码块
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            var results = [];
            
            // 简单解析results数组
            var resultMatches = yamlContent.split(/\n\s*-\s*title:/);
            
            for (var i = 1; i < resultMatches.length; i++) {
                var resultStr = 'title:' + resultMatches[i];
                var result = {
                    title: '',
                    url: '',
                    preview: '',
                    content: ''
                };
                
                // 解析title
                var titleMatch = resultStr.match(/title:\s*["']?([^"'\n]+)["']?/);
                if (titleMatch) result.title = titleMatch[1].trim();
                
                // 解析url
                var urlMatch = resultStr.match(/url:\s*["']?([^"'\n]+)["']?/);
                if (urlMatch) result.url = urlMatch[1].trim();
                
                // 解析preview
                var previewMatch = resultStr.match(/preview:\s*["']?([^"'\n]+)["']?/);
                if (previewMatch) result.preview = previewMatch[1].trim();
                
                // 解析content（可能是多行）
                var contentMatch = resultStr.match(/content:\s*["']?([\s\S]*?)(?=\n\s*-\s*title:|$)/);
                if (contentMatch) {
                    var contentStr = contentMatch[1].trim();
                    // 移除开头和结尾的引号
                    contentStr = contentStr.replace(/^["']|["']$/g, '');
                    // 处理多行内容
                    contentStr = contentStr.replace(/\n\s{4,}/g, '\n');
                    result.content = contentStr;
                }
                
                if (result.title) {
                    results.push(result);
                }
            }
            
            return results;
        } catch (e) {
            console.error('[Browser] 解析YAML失败:', e);
            return [];
        }
    };

    // 绑定浏览器相关事件
    NR.bindBrowserEvents = function(modal) {
        NR.initBrowserData();
        var browserState = NR.state.phoneChatState.browserState;
        
        // 搜索表单提交
        var searchForm = document.getElementById('browser-search-form');
        var searchInput = document.getElementById('browser-search-input');
        if (searchForm && searchInput) {
            searchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var query = searchInput.value.trim();
                if (query) {
                    NR.performBrowserSearch(query);
                }
            });
        }
        
        // 搜索按钮
        var searchBtn = document.getElementById('btn-browser-search');
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', function(e) {
                e.preventDefault();
                var query = searchInput.value.trim();
                if (query) {
                    NR.performBrowserSearch(query);
                }
            });
        }
        
        // 搜索历史点击
        modal.querySelectorAll('.browser-history-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var query = this.dataset.query;
                if (query) {
                    NR.performBrowserSearch(query);
                }
            });
        });
        
        // 搜索结果点击
        modal.querySelectorAll('.browser-result-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                if (browserState.searchResults && browserState.searchResults[index]) {
                    browserState.selectedResult = browserState.searchResults[index];
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 返回搜索结果
        var backBtn = document.getElementById('btn-browser-back-to-results');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                browserState.selectedResult = null;
                NR.refreshPhoneModal();
            });
        }
        
        // 新搜索按钮
        var newSearchBtn = document.getElementById('btn-browser-new-search');
        if (newSearchBtn) {
            newSearchBtn.addEventListener('click', function() {
                browserState.searchQuery = '';
                browserState.searchResults = [];
                browserState.selectedResult = null;
                browserState.error = null;
                NR.refreshPhoneModal();
            });
        }
        
        // 重试按钮
        var retryBtn = document.getElementById('btn-browser-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', function() {
                if (browserState.searchQuery) {
                    NR.performBrowserSearch(browserState.searchQuery);
                }
            });
        }
        
        // 取消按钮（暂时只是重置状态）
        var abortBtn = document.getElementById('btn-browser-abort');
        if (abortBtn) {
            abortBtn.addEventListener('click', function() {
                browserState.isLoading = false;
                browserState.error = '搜索已取消';
                NR.refreshPhoneModal();
            });
        }
        
        // 上下文选择按钮
        var contextBtn = document.getElementById('btn-browser-context');
        if (contextBtn) {
            contextBtn.addEventListener('click', function() {
                NR.showBrowserContextModal();
            });
        }
        
        // 分享按钮
        var shareBtn = document.getElementById('btn-browser-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                NR.showBrowserShareModal();
            });
        }
    };

    // 显示分享弹窗
    NR.showBrowserShareModal = function() {
        var browserState = NR.state.phoneChatState.browserState;
        var result = browserState.selectedResult;
        if (!result) return;
        
        var existingModal = document.getElementById('browser-share-modal');
        if (existingModal) existingModal.remove();
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var protagonists = profiles.filter(function(p) { return p.isProtagonist; });
        var importantNPCs = profiles.filter(function(p) { return p.isImportant && !p.isProtagonist; });
        var availableCharacters = protagonists.concat(importantNPCs);
        
        var html = '<div id="browser-share-modal" class="modal" style="display: flex; z-index: 10002;">';
        html += '<div class="modal-content" style="max-width: 350px;">';
        html += '<div class="modal-header">';
        html += '<h2>📤 分享到聊天</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="browser-share-body">';
        
        // 预览卡片
        html += '<div class="browser-share-preview">';
        html += '<div class="share-preview-title">' + NR.escapeHtml(result.title) + '</div>';
        html += '<div class="share-preview-url">' + NR.escapeHtml(result.url) + '</div>';
        html += '</div>';
        
        // 选择聊天对象
        html += '<div class="browser-share-targets">';
        html += '<p class="hint">选择要分享给的角色：</p>';
        if (availableCharacters.length === 0) {
            html += '<p class="no-data-hint">暂无可分享的角色</p>';
        } else {
            html += '<div class="browser-share-char-list">';
            availableCharacters.forEach(function(profile) {
                var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                html += '<div class="browser-share-char-item" data-name="' + NR.escapeHtml(profile.name) + '">';
                if (profile.cover) {
                    html += '<div class="browser-share-char-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    html += '<div class="browser-share-char-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
                }
                html += '<span class="browser-share-char-name">' + NR.escapeHtml(profile.name) + '</span>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('browser-share-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        // 角色点击事件
        modal.querySelectorAll('.browser-share-char-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var name = this.dataset.name;
                NR.shareBrowserResultToChat(name, result);
                modal.remove();
            });
        });
    };

    // 分享搜索结果到聊天
    NR.shareBrowserResultToChat = function(characterName, result) {
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === characterName; });
        
        if (!profile) {
            alert('找不到该角色');
            return;
        }
        
        // 构建分享消息
        var shareMessage = '【分享链接】\n' + result.title + '\n' + result.url;
        
        // 添加到聊天记录
        if (!NR.state.currentBookData.phoneChatHistory) {
            NR.state.currentBookData.phoneChatHistory = {};
        }
        if (!NR.state.currentBookData.phoneChatHistory[characterName]) {
            NR.state.currentBookData.phoneChatHistory[characterName] = [];
        }
        
        NR.state.currentBookData.phoneChatHistory[characterName].push({
            role: 'user',
            content: shareMessage
        });
        
        NR.saveBookData();
        
        // 提示用户
        alert('已分享到与 ' + characterName + ' 的聊天');
        
        // 切换到聊天界面
        NR.state.phoneChatState.selectedCharacter = profile;
        NR.state.phoneChatState.currentScreen = 'chat';
        NR.state.phoneChatState.chatHistory = NR.state.currentBookData.phoneChatHistory[characterName] || [];
        NR.refreshPhoneModal();
    };

})();
