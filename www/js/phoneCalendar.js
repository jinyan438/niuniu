// 小手机日历功能模块
(function() {
    var NR = window.NovelReader;

    // 初始化日历数据状态
    NR.initCalendarData = function() {
        if (!NR.state.phoneChatState.calendarState) {
            NR.state.phoneChatState.calendarState = {
                selectedDate: null,
                selectedEvent: null,
                isGenerating: false,
                selectedSummaries: [],
                currentMonth: new Date().getMonth(),
                currentYear: new Date().getFullYear()
            };
        }
        if (!NR.state.currentBookData.calendarEvents) {
            NR.state.currentBookData.calendarEvents = [];
        }
    };

    // 获取日历事件列表
    NR.getCalendarEvents = function() {
        var events = NR.state.currentBookData.calendarEvents || [];
        return events.slice().sort(function(a, b) {
            return (a.timestamp || 0) - (b.timestamp || 0);
        });
    };

    // 获取指定日期的事件
    NR.getEventsForDate = function(dateStr) {
        var events = NR.state.currentBookData.calendarEvents || [];
        return events.filter(function(event) {
            return event.date === dateStr;
        });
    };

    // 获取当前月份的日期数组
    NR.getMonthDays = function(year, month) {
        var firstDay = new Date(year, month, 1);
        var lastDay = new Date(year, month + 1, 0);
        var daysInMonth = lastDay.getDate();
        var startWeekDay = firstDay.getDay();
        
        var days = [];
        
        // 上个月的日期填充
        var prevMonthLastDay = new Date(year, month, 0).getDate();
        for (var i = startWeekDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                isPrevMonth: true
            });
        }
        
        // 当前月的日期
        for (var d = 1; d <= daysInMonth; d++) {
            days.push({
                day: d,
                isCurrentMonth: true
            });
        }
        
        // 下个月的日期填充（补齐到42天，6行）
        var remaining = 42 - days.length;
        for (var j = 1; j <= remaining; j++) {
            days.push({
                day: j,
                isCurrentMonth: false,
                isNextMonth: true
            });
        }
        
        return days;
    };

    // 格式化日期字符串
    NR.formatCalendarDate = function(year, month, day) {
        return year + '年' + (month + 1) + '月' + day + '日';
    };

    // 获取星期几
    NR.getWeekDayName = function(year, month, day) {
        var weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        var date = new Date(year, month, day);
        return weekDays[date.getDay()];
    };

    // 渲染日历主界面
    NR.renderPhoneCalendarScreen = function() {
        NR.initCalendarData();
        var calendarState = NR.state.phoneChatState.calendarState;
        var year = calendarState.currentYear;
        var month = calendarState.currentMonth;
        var days = NR.getMonthDays(year, month);
        var events = NR.getCalendarEvents();
        var today = new Date();
        var todayStr = NR.formatCalendarDate(today.getFullYear(), today.getMonth(), today.getDate());
        
        var html = '<div class="phone-app-container phone-calendar-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">日历</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-calendar-context" title="选择上下文">📝</button>';
        html += '<button class="phone-nav-btn" id="btn-calendar-generate" title="生成日历事件">✨</button>';
        html += '</div>';
        html += '</div>';
        
        // 显示已选总结数量
        var selectedSummaries = calendarState.selectedSummaries || [];
        if (selectedSummaries.length > 0) {
            html += '<div class="calendar-context-badge">';
            html += '<span>📝 已选择 ' + selectedSummaries.length + ' 个总结</span>';
            html += '</div>';
        }
        
        // 内容区域
        html += '<div class="phone-app-content phone-calendar-content">';
        
        // 生成中提示
        if (calendarState.isGenerating) {
            html += '<div class="calendar-generating">';
            html += '<div class="calendar-generating-icon">✨</div>';
            html += '<p>正在生成日历事件...</p>';
            html += '</div>';
        }
        
        // 月份导航
        html += '<div class="calendar-month-nav">';
        html += '<button class="calendar-nav-btn" id="btn-calendar-prev-month">◀</button>';
        html += '<span class="calendar-month-title">' + year + '年' + (month + 1) + '月</span>';
        html += '<button class="calendar-nav-btn" id="btn-calendar-next-month">▶</button>';
        html += '</div>';
        
        // 星期标题
        html += '<div class="calendar-weekdays">';
        var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        weekDays.forEach(function(wd) {
            html += '<div class="calendar-weekday">' + wd + '</div>';
        });
        html += '</div>';
        
        // 日期网格
        html += '<div class="calendar-days-grid">';
        days.forEach(function(dayInfo) {
            var dateStr = '';
            var dayYear = year;
            var dayMonth = month;
            
            if (dayInfo.isPrevMonth) {
                dayMonth = month - 1;
                if (dayMonth < 0) {
                    dayMonth = 11;
                    dayYear = year - 1;
                }
            } else if (dayInfo.isNextMonth) {
                dayMonth = month + 1;
                if (dayMonth > 11) {
                    dayMonth = 0;
                    dayYear = year + 1;
                }
            }
            
            dateStr = NR.formatCalendarDate(dayYear, dayMonth, dayInfo.day);
            var dayEvents = NR.getEventsForDate(dateStr);
            var hasEvents = dayEvents.length > 0;
            var isToday = dateStr === todayStr;
            var isSelected = calendarState.selectedDate === dateStr;
            
            var dayClass = 'calendar-day';
            if (!dayInfo.isCurrentMonth) dayClass += ' other-month';
            if (hasEvents) dayClass += ' has-events';
            if (isToday) dayClass += ' today';
            if (isSelected) dayClass += ' selected';
            
            html += '<div class="' + dayClass + '" data-date="' + dateStr + '">';
            html += '<span class="calendar-day-num">' + dayInfo.day + '</span>';
            if (hasEvents) {
                html += '<div class="calendar-event-dots">';
                // 最多显示3个点
                var dotCount = Math.min(dayEvents.length, 3);
                for (var i = 0; i < dotCount; i++) {
                    var eventType = dayEvents[i].type || 'default';
                    html += '<span class="calendar-event-dot ' + eventType + '"></span>';
                }
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div>';
        
        // 事件列表区域
        html += '<div class="calendar-events-section">';
        
        if (calendarState.selectedDate) {
            var selectedEvents = NR.getEventsForDate(calendarState.selectedDate);
            html += '<div class="calendar-events-header">';
            html += '<span class="calendar-events-date">' + calendarState.selectedDate + '</span>';
            html += '<span class="calendar-events-count">' + selectedEvents.length + ' 个事件</span>';
            html += '</div>';
            
            if (selectedEvents.length === 0) {
                html += '<div class="calendar-no-events">该日期暂无事件</div>';
            } else {
                html += '<div class="calendar-events-list">';
                selectedEvents.forEach(function(event, idx) {
                    html += NR.renderCalendarEventCard(event, idx);
                });
                html += '</div>';
            }
        } else {
            // 显示近期事件
            html += '<div class="calendar-events-header">';
            html += '<span class="calendar-events-date">近期事件</span>';
            html += '</div>';
            
            if (events.length === 0) {
                html += '<div class="calendar-no-events">';
                html += '<p>暂无日历事件</p>';
                html += '<p class="calendar-hint">点击右上角 ✨ 生成事件</p>';
                html += '</div>';
            } else {
                html += '<div class="calendar-events-list">';
                // 显示最近的5个事件
                events.slice(0, 5).forEach(function(event, idx) {
                    html += NR.renderCalendarEventCard(event, idx);
                });
                html += '</div>';
            }
        }
        
        html += '</div>'; // end calendar-events-section
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染单个事件卡片
    NR.renderCalendarEventCard = function(event, index) {
        var typeLabels = {
            'world': '🌍 世界事件',
            'major': '⭐ 大型事件',
            'user': '👤 用户事件',
            'character': '💬 角色事件',
            'default': '📅 事件'
        };
        var typeLabel = typeLabels[event.type] || typeLabels['default'];
        
        var html = '<div class="calendar-event-card" data-index="' + index + '" data-id="' + (event.id || '') + '">';
        
        html += '<div class="calendar-event-type ' + (event.type || 'default') + '">' + typeLabel + '</div>';
        html += '<div class="calendar-event-title">' + NR.escapeHtml(event.title || '未命名事件') + '</div>';
        
        if (event.time) {
            html += '<div class="calendar-event-time">🕐 ' + NR.escapeHtml(event.time) + '</div>';
        }
        
        if (event.location) {
            html += '<div class="calendar-event-location">📍 ' + NR.escapeHtml(event.location) + '</div>';
        }
        
        if (event.description) {
            var desc = event.description.length > 40 ? event.description.substring(0, 40) + '...' : event.description;
            html += '<div class="calendar-event-desc">' + NR.escapeHtml(desc) + '</div>';
        }
        
        if (event.participants && event.participants.length > 0) {
            var participantsStr = event.participants.join('、');
            if (participantsStr.length > 20) {
                participantsStr = participantsStr.substring(0, 20) + '...';
            }
            html += '<div class="calendar-event-participants">👥 ' + NR.escapeHtml(participantsStr) + '</div>';
        }
        
        html += '<div class="calendar-event-view">点击查看详情 →</div>';
        
        html += '</div>';
        
        return html;
    };

    // 渲染事件详情页面
    NR.renderPhoneCalendarDetailScreen = function() {
        var calendarState = NR.state.phoneChatState.calendarState;
        var event = calendarState.selectedEvent;
        
        if (!event) {
            return NR.renderPhoneCalendarScreen();
        }
        
        var typeLabels = {
            'world': '🌍 世界事件',
            'major': '⭐ 大型事件',
            'user': '👤 用户事件',
            'character': '💬 角色事件',
            'default': '📅 事件'
        };
        var typeLabel = typeLabels[event.type] || typeLabels['default'];
        
        var html = '<div class="phone-app-container phone-calendar-detail-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-calendar-back">←</button>';
        html += '<span class="phone-nav-title">事件详情</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-calendar-detail-delete" data-id="' + (event.id || '') + '" title="删除">🗑️</button>';
        html += '</div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content calendar-detail-content">';
        
        // 事件类型标签
        html += '<div class="calendar-detail-type ' + (event.type || 'default') + '">' + typeLabel + '</div>';
        
        // 事件标题
        html += '<div class="calendar-detail-title">' + NR.escapeHtml(event.title || '未命名事件') + '</div>';
        
        // 日期
        if (event.date) {
            html += '<div class="calendar-detail-item">';
            html += '<span class="calendar-detail-icon">📅</span>';
            html += '<span class="calendar-detail-label">日期</span>';
            html += '<span class="calendar-detail-value">' + NR.escapeHtml(event.date) + '</span>';
            html += '</div>';
        }
        
        // 时间
        if (event.time) {
            html += '<div class="calendar-detail-item">';
            html += '<span class="calendar-detail-icon">🕐</span>';
            html += '<span class="calendar-detail-label">时间</span>';
            html += '<span class="calendar-detail-value">' + NR.escapeHtml(event.time) + '</span>';
            html += '</div>';
        }
        
        // 地点
        if (event.location) {
            html += '<div class="calendar-detail-item">';
            html += '<span class="calendar-detail-icon">📍</span>';
            html += '<span class="calendar-detail-label">地点</span>';
            html += '<span class="calendar-detail-value">' + NR.escapeHtml(event.location) + '</span>';
            html += '</div>';
        }
        
        // 参与者
        if (event.participants && event.participants.length > 0) {
            html += '<div class="calendar-detail-item">';
            html += '<span class="calendar-detail-icon">👥</span>';
            html += '<span class="calendar-detail-label">参与者</span>';
            html += '<span class="calendar-detail-value">' + NR.escapeHtml(event.participants.join('、')) + '</span>';
            html += '</div>';
        }
        
        // 描述
        if (event.description) {
            html += '<div class="calendar-detail-section">';
            html += '<div class="calendar-detail-section-title">📝 事件描述</div>';
            html += '<div class="calendar-detail-description">' + NR.escapeHtml(event.description) + '</div>';
            html += '</div>';
        }
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 显示日历上下文选择弹窗（只选择总结）
    NR.showCalendarContextModal = function() {
        var existingModal = document.getElementById('calendar-context-modal');
        if (existingModal) existingModal.remove();
        
        var summaries = NR.state.currentBookData.summaries || [];
        var calendarState = NR.state.phoneChatState.calendarState;
        var selectedSummaries = calendarState.selectedSummaries || [];
        
        var html = '<div id="calendar-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 450px; max-height: 80vh;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择总结</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="calendar-context-body" style="max-height: 60vh; overflow-y: auto;">';
        
        html += '<p class="hint" style="margin-bottom: 10px;">人物卡、全局数据、任务事件、重要情报会自动加入上下文<br>如需额外添加总结，请在下方勾选</p>';
        
        // 总结历史
        if (summaries.length > 0) {
            html += '<div class="context-section">';
            html += '<div class="context-section-title">📝 总结历史</div>';
            html += '<div class="context-list">';
            summaries.slice().sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(s, idx) {
                var isChecked = selectedSummaries.indexOf(idx) !== -1;
                html += '<label class="context-item">';
                html += '<input type="checkbox" data-index="' + idx + '"' + (isChecked ? ' checked' : '') + '>';
                html += '<span>' + NR.escapeHtml(s.range || '总结 ' + (idx + 1)) + '</span>';
                html += '</label>';
            });
            html += '</div>';
            html += '</div>';
        } else {
            html += '<p class="no-data-hint">暂无总结历史</p>';
        }
        
        html += '</div>';
        html += '<div class="modal-footer">';
        html += '<button class="control-button" id="btn-calendar-context-confirm">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('calendar-context-modal');
        
        // 关闭按钮
        modal.querySelector('.close-button').addEventListener('click', function() {
            modal.remove();
        });
        
        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
        
        // 确定按钮
        var confirmBtn = document.getElementById('btn-calendar-context-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                var selected = [];
                modal.querySelectorAll('input[type="checkbox"]:checked').forEach(function(cb) {
                    selected.push(parseInt(cb.dataset.index, 10));
                });
                calendarState.selectedSummaries = selected;
                modal.remove();
                NR.refreshPhoneModal();
            });
        }
    };

    // 构建日历生成的上下文文本（自动包含人物卡、全局数据、任务事件、重要情报，可选总结）
    NR.buildCalendarContextText = function() {
        var calendarState = NR.state.phoneChatState.calendarState;
        var selectedSummaries = calendarState.selectedSummaries || [];
        var contextParts = [];
        
        // 自动加入人物卡
        var profiles = NR.state.currentBookData.characterProfiles || [];
        profiles.forEach(function(profile) {
            if (profile) {
                contextParts.push('【人物卡片 - ' + profile.name + '】\n' + NR.getCharacterTagsInfo(profile));
            }
        });
        
        // 自动加入全局数据
        var globalData = NR.state.currentBookData.globalData;
        if (globalData) {
            var globalText = '【全局数据】\n';
            for (var k in globalData) {
                if (globalData[k]) {
                    globalText += k + ': ' + globalData[k] + '\n';
                }
            }
            contextParts.push(globalText);
        }
        
        // 自动加入任务事件
        var quests = NR.state.currentBookData.quests || [];
        quests.forEach(function(quest) {
            if (quest) {
                var questText = '【任务事件 - ' + quest.name + '】\n';
                questText += '类型: ' + (quest.type || '-') + '\n';
                questText += '发布者: ' + (quest.issuer || '-') + '\n';
                questText += '描述: ' + (quest.description || '-') + '\n';
                questText += '进度: ' + (quest.progress || '-') + '\n';
                questText += '时限: ' + (quest.deadline || '-');
                contextParts.push(questText);
            }
        });
        
        // 自动加入重要情报
        var intels = NR.state.currentBookData.intels || [];
        intels.forEach(function(intel) {
            if (intel) {
                var intelText = '【重要情报 - ' + intel.name + '】\n';
                intelText += '类型: ' + (intel.type || '-') + '\n';
                intelText += '来源: ' + (intel.source || '-') + '\n';
                intelText += '内容: ' + (intel.content || '-') + '\n';
                intelText += '可信度: ' + (intel.reliability || '-');
                contextParts.push(intelText);
            }
        });
        
        // 加入用户选择的总结
        var summaries = NR.state.currentBookData.summaries || [];
        selectedSummaries.forEach(function(idx) {
            var summary = summaries[idx];
            if (summary) {
                contextParts.push('【总结 - ' + (summary.range || '总结') + '】\n' + summary.text);
            }
        });
        
        return contextParts.join('\n\n---\n\n');
    };


    // 生成日历事件
    NR.generateCalendarEvents = function() {
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('AI 功能需要配置后才能使用，请点击【设置】按钮进行配置。');
            return;
        }
        
        var calendarState = NR.state.phoneChatState.calendarState;
        calendarState.isGenerating = true;
        NR.refreshPhoneModal();
        
        // 构建上下文
        var contextText = NR.buildCalendarContextText();
        
        // 构建系统提示词
        var systemPrompt = '你是一个日历事件生成器。根据提供的故事背景和角色信息，生成符合剧情走向和世界观的日历事件。\n\n';
        systemPrompt += '请生成以下类型的事件：\n';
        systemPrompt += '1. world（世界事件）：影响整个世界或大范围的重大事件\n';
        systemPrompt += '2. major（大型事件）：重要的剧情事件或转折点\n';
        systemPrompt += '3. user（用户事件）：与主角/用户相关的个人事件\n';
        systemPrompt += '4. character（角色事件）：其他角色的相关事件\n\n';
        systemPrompt += '请以YAML格式输出，格式如下：\n';
        systemPrompt += '```yaml\n';
        systemPrompt += 'calendar:\n';
        systemPrompt += '  events:\n';
        systemPrompt += '    - date: "2026年1月31日"\n';
        systemPrompt += '      time: "14:00"\n';
        systemPrompt += '      type: "major"\n';
        systemPrompt += '      title: "事件标题"\n';
        systemPrompt += '      description: "事件描述"\n';
        systemPrompt += '      location: "事件地点"\n';
        systemPrompt += '      participants:\n';
        systemPrompt += '        - "参与者1"\n';
        systemPrompt += '        - "参与者2"\n';
        systemPrompt += '```\n\n';
        systemPrompt += '注意：\n';
        systemPrompt += '- 日期格式必须是"XXXX年X月X日"\n';
        systemPrompt += '- 时间格式是"HH:MM"（可选）\n';
        systemPrompt += '- type必须是world/major/user/character之一\n';
        systemPrompt += '- 生成5-10个事件，涵盖不同类型\n';
        systemPrompt += '- 事件应该符合故事的时间线和世界观';
        
        var userPrompt = '根据以下背景信息，生成日历事件：\n\n' + (contextText || '暂无背景信息，请生成一些通用的示例事件。');
        
        var messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
        
        // 调用AI API
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
                messages: messages,
                stream: false,
                max_tokens: 2000,
                temperature: 0.8
            })
        }).then(function(res) {
            if (!res.ok) {
                return res.text().then(function(errText) {
                    throw new Error('API 请求失败: ' + res.status + ' ' + errText);
                });
            }
            return res.json();
        }).then(function(data) {
            var reply = (data.choices && data.choices[0] && data.choices[0].message) 
                ? data.choices[0].message.content.trim() : null;
            
            if (!reply) {
                throw new Error('AI未返回有效回复');
            }
            
            // 解析YAML响应
            var events = NR.parseCalendarYaml(reply);
            
            if (events && events.length > 0) {
                // 添加到日历数据
                if (!NR.state.currentBookData.calendarEvents) {
                    NR.state.currentBookData.calendarEvents = [];
                }
                
                events.forEach(function(event) {
                    // 生成唯一ID
                    event.id = 'cal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    event.timestamp = Date.now();
                    NR.state.currentBookData.calendarEvents.push(event);
                });
                
                NR.saveBookData();
            }
            
            calendarState.isGenerating = false;
            NR.refreshPhoneModal();
        }).catch(function(err) {
            console.error('生成日历事件失败:', err);
            calendarState.isGenerating = false;
            NR.refreshPhoneModal();
            alert('生成失败: ' + err.message);
        });
    };

    // 解析日历YAML响应
    NR.parseCalendarYaml = function(text) {
        var events = [];
        
        try {
            // 提取YAML代码块
            var yamlMatch = text.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlText = yamlMatch ? yamlMatch[1].trim() : text;
            
            // 简单解析YAML（不依赖外部库）
            var lines = yamlText.split('\n');
            var currentEvent = null;
            var inParticipants = false;
            var inMultilineDesc = false;
            var multilineDescIndent = 0;
            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var trimmed = line.trim();
                
                // 计算当前行缩进
                var indent = line.search(/\S/);
                if (indent === -1) indent = 0;
                
                // 处理多行描述
                if (inMultilineDesc) {
                    // 如果缩进小于等于description的缩进，说明多行结束
                    if (trimmed && indent <= multilineDescIndent && (trimmed.includes(':') || trimmed.startsWith('-'))) {
                        inMultilineDesc = false;
                    } else {
                        // 继续添加到描述
                        if (currentEvent && trimmed) {
                            currentEvent.description = (currentEvent.description || '') + '\n' + trimmed;
                        }
                        continue;
                    }
                }
                
                // 检测新事件开始
                if (trimmed.startsWith('- date:') || (trimmed === '-' && line.match(/^\s+-\s*$/))) {
                    if (currentEvent && currentEvent.date && currentEvent.title) {
                        events.push(currentEvent);
                    }
                    currentEvent = {};
                    inParticipants = false;
                    inMultilineDesc = false;
                    
                    if (trimmed.startsWith('- date:')) {
                        var dateVal = NR.extractYamlValue(trimmed.substring(trimmed.indexOf('date:')));
                        if (dateVal) currentEvent.date = dateVal;
                    }
                    continue;
                }
                
                if (!currentEvent) continue;
                
                // 解析participants数组
                if (inParticipants) {
                    if (trimmed.startsWith('-') && !trimmed.startsWith('- date:')) {
                        var participant = trimmed.replace(/^-\s*/, '').replace(/^["']|["']$/g, '').trim();
                        if (participant) {
                            if (!currentEvent.participants) currentEvent.participants = [];
                            currentEvent.participants.push(participant);
                        }
                        continue;
                    } else if (trimmed.includes(':') && !trimmed.startsWith('-')) {
                        inParticipants = false;
                    }
                }
                
                // 解析其他字段
                if (trimmed.startsWith('date:')) {
                    var val = NR.extractYamlValue(trimmed);
                    if (val) currentEvent.date = val;
                } else if (trimmed.startsWith('time:')) {
                    var val = NR.extractYamlValue(trimmed);
                    if (val) currentEvent.time = val;
                } else if (trimmed.startsWith('type:')) {
                    var val = NR.extractYamlValue(trimmed);
                    if (val) currentEvent.type = val;
                } else if (trimmed.startsWith('title:')) {
                    var val = NR.extractYamlValue(trimmed);
                    if (val) currentEvent.title = val;
                } else if (trimmed.startsWith('description:')) {
                    var val = NR.extractYamlValue(trimmed);
                    if (val) {
                        currentEvent.description = val;
                    }
                    // 检查是否是多行描述（以 | 或 > 开头，或者值为空）
                    var afterColon = trimmed.substring(trimmed.indexOf(':') + 1).trim();
                    if (afterColon === '|' || afterColon === '>' || afterColon === '') {
                        inMultilineDesc = true;
                        multilineDescIndent = indent;
                        currentEvent.description = '';
                    }
                } else if (trimmed.startsWith('location:')) {
                    var val = NR.extractYamlValue(trimmed);
                    if (val) currentEvent.location = val;
                } else if (trimmed.startsWith('participants:')) {
                    inParticipants = true;
                    currentEvent.participants = [];
                }
            }
            
            // 添加最后一个事件
            if (currentEvent && currentEvent.date && currentEvent.title) {
                events.push(currentEvent);
            }
            
        } catch (e) {
            console.error('解析日历YAML失败:', e);
        }
        
        return events;
    };

    // 提取YAML值（处理引号和特殊字符）
    NR.extractYamlValue = function(line) {
        var colonIndex = line.indexOf(':');
        if (colonIndex === -1) return null;
        
        var value = line.substring(colonIndex + 1).trim();
        
        // 移除开头和结尾的引号
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
        }
        
        // 处理YAML多行标记
        if (value === '|' || value === '>') {
            return '';
        }
        
        return value || null;
    };

    // 删除日历事件
    NR.deleteCalendarEvent = function(eventId) {
        if (!eventId) return;
        
        var events = NR.state.currentBookData.calendarEvents || [];
        var index = events.findIndex(function(e) { return e.id === eventId; });
        
        if (index > -1) {
            events.splice(index, 1);
            NR.saveBookData();
            NR.refreshPhoneModal();
        }
    };

    // 绑定日历事件
    NR.bindCalendarEvents = function(modal) {
        if (!modal) return;
        
        var currentScreen = NR.state.phoneChatState.currentScreen;
        if (currentScreen !== 'calendar' && currentScreen !== 'calendar-detail') return;
        
        NR.initCalendarData();
        var calendarState = NR.state.phoneChatState.calendarState;
        
        // 日历主界面事件
        if (currentScreen === 'calendar') {
            // 上下文选择按钮
            var contextBtn = document.getElementById('btn-calendar-context');
            if (contextBtn) {
                contextBtn.addEventListener('click', function() {
                    NR.showCalendarContextModal();
                });
            }
            
            // 生成按钮
            var generateBtn = document.getElementById('btn-calendar-generate');
            if (generateBtn) {
                generateBtn.addEventListener('click', function() {
                    NR.generateCalendarEvents();
                });
            }
            
            // 上个月按钮
            var prevMonthBtn = document.getElementById('btn-calendar-prev-month');
            if (prevMonthBtn) {
                prevMonthBtn.addEventListener('click', function() {
                    calendarState.currentMonth--;
                    if (calendarState.currentMonth < 0) {
                        calendarState.currentMonth = 11;
                        calendarState.currentYear--;
                    }
                    calendarState.selectedDate = null;
                    NR.refreshPhoneModal();
                });
            }
            
            // 下个月按钮
            var nextMonthBtn = document.getElementById('btn-calendar-next-month');
            if (nextMonthBtn) {
                nextMonthBtn.addEventListener('click', function() {
                    calendarState.currentMonth++;
                    if (calendarState.currentMonth > 11) {
                        calendarState.currentMonth = 0;
                        calendarState.currentYear++;
                    }
                    calendarState.selectedDate = null;
                    NR.refreshPhoneModal();
                });
            }
            
            // 日期点击
            modal.querySelectorAll('.calendar-day').forEach(function(dayEl) {
                dayEl.addEventListener('click', function() {
                    var date = this.dataset.date;
                    if (calendarState.selectedDate === date) {
                        calendarState.selectedDate = null;
                    } else {
                        calendarState.selectedDate = date;
                    }
                    NR.refreshPhoneModal();
                });
            });
            
            // 事件卡片点击 - 跳转到详情页
            modal.querySelectorAll('.calendar-event-card').forEach(function(card) {
                card.addEventListener('click', function() {
                    var eventId = this.dataset.id;
                    var events = NR.state.currentBookData.calendarEvents || [];
                    var event = events.find(function(e) { return e.id === eventId; });
                    if (event) {
                        calendarState.selectedEvent = event;
                        NR.state.phoneChatState.currentScreen = 'calendar-detail';
                        NR.refreshPhoneModal();
                    }
                });
            });
        }
        
        // 详情页事件
        if (currentScreen === 'calendar-detail') {
            // 返回按钮
            var backBtn = document.getElementById('btn-calendar-back');
            if (backBtn) {
                backBtn.addEventListener('click', function() {
                    calendarState.selectedEvent = null;
                    NR.state.phoneChatState.currentScreen = 'calendar';
                    NR.refreshPhoneModal();
                });
            }
            
            // 删除按钮
            var deleteBtn = document.getElementById('btn-calendar-detail-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    var eventId = this.dataset.id;
                    if (confirm('确定要删除这个事件吗？')) {
                        NR.deleteCalendarEvent(eventId);
                        calendarState.selectedEvent = null;
                        NR.state.phoneChatState.currentScreen = 'calendar';
                        NR.refreshPhoneModal();
                    }
                });
            }
        }
    };

})();
