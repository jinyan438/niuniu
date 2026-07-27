// AI数据库模块 - 全局数据、人物、技能、背包、任务、地点、装备、势力、情报
(function() {
    var NR = window.NovelReader;

    // 全局数据表字段定义（参考数据库脚本 sheet_dCudvUnH）
    NR.GLOBAL_DATA_FIELDS = [
        { key: 'currentLocation', label: '当前所在地点', type: 'text' },
        { key: 'currentTime', label: '当前时间', type: 'text', placeholder: '如: 第三天 上午' },
        { key: 'lastSceneTime', label: '上轮场景时间', type: 'text' },
        { key: 'elapsedTime', label: '经过的时间', type: 'text', placeholder: '如: 2小时' }
    ];

    // 主角信息表字段定义（参考数据库脚本 sheet_DpKcVGqg）
    NR.PROTAGONIST_FIELDS = [
        { key: 'name', label: '人物名称', type: 'text', required: true },
        { key: 'gender', label: '性别', type: 'text' },
        { key: 'age', label: '年龄', type: 'text' },
        { key: 'race', label: '种族', type: 'text' },
        { key: 'occupation', label: '职业/身份', type: 'text' },
        { key: 'location', label: '所在地点', type: 'text' },
        { key: 'inScene', label: '在场状态', type: 'select', options: ['在场', '离场', '未知'] },
        { key: 'appearance', label: '外貌特征', type: 'textarea' },
        { key: 'clothing', label: '衣着', type: 'textarea' },
        { key: 'items', label: '持有的重要物品', type: 'text' },
        { key: 'ability', label: '能力', type: 'textarea' },
        { key: 'purpose', label: '目的', type: 'textarea' },
        { key: 'organization', label: '所属组织', type: 'text' },
        { key: 'health', label: '健康状态', type: 'text' },
        { key: 'hobby', label: '爱好', type: 'text' },
        { key: 'history', label: '过往经历', type: 'textarea' },
        { key: 'personality', label: '性格特点', type: 'textarea' },
        { key: 'baseAttributes', label: '基础属性', type: 'keyvalue', placeholder: '力量:50;敏捷:50;体质:50' },
        { key: 'specialAttributes', label: '特有属性', type: 'keyvalue', placeholder: '魅力:60;智慧:70' },
        { key: 'relationships', label: '人际关系', type: 'keyvalue', placeholder: '张三:朋友;李四:师父' }
    ];

    // 重要人物表字段定义（参考数据库脚本 sheet_NcBlYRH5）
    NR.NPC_FIELDS = [
        { key: 'name', label: '姓名', type: 'text', required: true },
        { key: 'gender', label: '性别', type: 'text' },
        { key: 'age', label: '年龄', type: 'text' },
        { key: 'race', label: '种族', type: 'text' },
        { key: 'occupation', label: '职业/身份', type: 'text' },
        { key: 'location', label: '所在地点', type: 'text' },
        { key: 'inScene', label: '是否在场', type: 'select', options: ['在场', '离场', '未知'] },
        { key: 'appearance', label: '外貌特征', type: 'textarea' },
        { key: 'clothing', label: '衣着', type: 'textarea' },
        { key: 'items', label: '持有的重要物品', type: 'text' },
        { key: 'ability', label: '能力', type: 'textarea' },
        { key: 'purpose', label: '目的', type: 'textarea' },
        { key: 'organization', label: '所属组织', type: 'text' },
        { key: 'health', label: '健康状态', type: 'text' },
        { key: 'hobby', label: '爱好', type: 'text' },
        { key: 'relationWithProtagonist', label: '与主角关系', type: 'text' },
        { key: 'history', label: '过往经历', type: 'textarea' },
        { key: 'personality', label: '性格特点', type: 'textarea' },
        { key: 'baseAttributes', label: '基础属性', type: 'keyvalue', placeholder: '力量:50;敏捷:50' },
        { key: 'specialAttributes', label: '特有属性', type: 'keyvalue', placeholder: '魅力:60' },
        { key: 'relationships', label: '人际关系', type: 'keyvalue', placeholder: '主角:敌人;王五:同伴' }
    ];

    // 主角技能表字段定义（参考数据库脚本 sheet_lEARaBa8）
    NR.SKILL_FIELDS = [
        { key: 'name', label: '技能名称', type: 'text', required: true },
        { key: 'type', label: '技能类型', type: 'select', options: ['主动', '被动', '天赋', '特殊'] },
        { key: 'level', label: '等级/阶段', type: 'text', placeholder: '如: Lv.3 或 初级' },
        { key: 'description', label: '效果描述', type: 'textarea' }
    ];

    // 背包物品表字段定义（参考数据库脚本 sheet_in05z9vz）
    NR.ITEM_FIELDS = [
        { key: 'name', label: '物品名称', type: 'text', required: true },
        { key: 'count', label: '数量', type: 'text', placeholder: '1' },
        { key: 'category', label: '类别', type: 'select', options: ['武器', '防具', '消耗品', '材料', '关键道具', '其他'] },
        { key: 'description', label: '描述/效果', type: 'textarea' }
    ];

    // 任务与事件表字段定义（参考数据库脚本 sheet_etak47Ve）
    NR.QUEST_FIELDS = [
        { key: 'name', label: '任务名称', type: 'text', required: true },
        { key: 'type', label: '任务类型', type: 'select', options: ['主线', '支线', '日常', '隐藏', '紧急'] },
        { key: 'issuer', label: '发布者', type: 'text' },
        { key: 'description', label: '详细描述', type: 'textarea' },
        { key: 'progress', label: '当前进度', type: 'text', placeholder: '如: 50% 或 2/5' },
        { key: 'deadline', label: '任务时限', type: 'text', placeholder: '如: 3天内 或 无限制' },
        { key: 'reward', label: '奖励', type: 'textarea' },
        { key: 'penalty', label: '惩罚', type: 'textarea' }
    ];

    // 世界地图点/地点表字段定义
    NR.LOCATION_FIELDS = [
        { key: 'name', label: '地点名称', type: 'text', required: true },
        { key: 'type', label: '地点类型', type: 'select', options: ['城镇', '野外', '副本', '建筑', '房间', '秘境', '其他'] },
        { key: 'region', label: '所属区域', type: 'text', placeholder: '如: 王国北部' },
        { key: 'description', label: '地点描述', type: 'textarea' },
        { key: 'features', label: '地点特征/元素', type: 'textarea', placeholder: '如: 有一座古老的喷泉' },
        { key: 'npcs', label: '常驻NPC', type: 'text', placeholder: '如: 铁匠老王, 酒馆老板' },
        { key: 'connections', label: '连接地点', type: 'text', placeholder: '如: 北门→森林, 南门→港口' },
        { key: 'status', label: '当前状态', type: 'select', options: ['可访问', '已探索', '未探索', '已封锁', '危险'] }
    ];

    // 装备表字段定义
    NR.EQUIPMENT_FIELDS = [
        { key: 'name', label: '装备名称', type: 'text', required: true },
        { key: 'type', label: '装备类型', type: 'select', options: ['武器', '头盔', '护甲', '护手', '护腿', '鞋子', '饰品', '其他'] },
        { key: 'rarity', label: '稀有度', type: 'select', options: ['普通', '优秀', '稀有', '史诗', '传说', '神话'] },
        { key: 'equipped', label: '装备状态', type: 'select', options: ['已装备', '未装备', '已损坏'] },
        { key: 'attributes', label: '属性加成', type: 'keyvalue', placeholder: '攻击:+50;防御:+30' },
        { key: 'description', label: '描述/效果', type: 'textarea' },
        { key: 'source', label: '获取来源', type: 'text', placeholder: '如: 击败BOSS获得' }
    ];

    // 势力/组织表字段定义
    NR.FACTION_FIELDS = [
        { key: 'name', label: '势力名称', type: 'text', required: true },
        { key: 'type', label: '势力类型', type: 'select', options: ['国家', '组织', '帮派', '家族', '宗门', '公会', '其他'] },
        { key: 'leader', label: '领袖/首领', type: 'text' },
        { key: 'territory', label: '势力范围', type: 'text', placeholder: '如: 王国东部三省' },
        { key: 'description', label: '势力简介', type: 'textarea' },
        { key: 'attitude', label: '对主角态度', type: 'select', options: ['友好', '中立', '敌对', '未知'] },
        { key: 'reputation', label: '主角声望', type: 'text', placeholder: '如: 崇拜/友善/中立/厌恶' },
        { key: 'members', label: '重要成员', type: 'text', placeholder: '如: 张三(长老), 李四(护法)' }
    ];

    // 重要情报表字段定义
    NR.INTEL_FIELDS = [
        { key: 'name', label: '情报标题', type: 'text', required: true },
        { key: 'type', label: '情报类型', type: 'select', options: ['线索', '秘密', '传闻', '历史', '预言', '其他'] },
        { key: 'source', label: '情报来源', type: 'text', placeholder: '如: 从酒馆老板处得知' },
        { key: 'content', label: '情报内容', type: 'textarea' },
        { key: 'reliability', label: '可信度', type: 'select', options: ['已证实', '可能真实', '存疑', '谣言'] },
        { key: 'related', label: '关联事项', type: 'text', placeholder: '如: 主线任务, 某NPC' },
        { key: 'status', label: '情报状态', type: 'select', options: ['新获得', '调查中', '已利用', '已过时'] }
    ];

    // 默认基础属性列表（参考骰子系统）
    NR.DEFAULT_BASE_ATTRIBUTES = ['力量', '敏捷', '体质', '智力', '感知', '魅力'];

    // 人物卡片颜色列表（用于人物卡片和关系图节点）
    NR.CHARACTER_COLORS = [
        { bg: '#FFD700', text: '#5D4E37' },  // 金色（主角专用）
        { bg: '#E57373', text: '#fff' },      // 红色
        { bg: '#64B5F6', text: '#fff' },      // 蓝色
        { bg: '#81C784', text: '#fff' },      // 绿色
        { bg: '#FFB74D', text: '#5D4E37' },   // 橙色
        { bg: '#BA68C8', text: '#fff' },      // 紫色
        { bg: '#4DD0E1', text: '#fff' },      // 青色
        { bg: '#F06292', text: '#fff' },      // 粉色
        { bg: '#AED581', text: '#5D4E37' },   // 浅绿
        { bg: '#90A4AE', text: '#fff' },      // 灰蓝
        { bg: '#FFCC80', text: '#5D4E37' },   // 浅橙
        { bg: '#CE93D8', text: '#fff' },      // 浅紫
        { bg: '#80DEEA', text: '#5D4E37' },   // 浅青
        { bg: '#A5D6A7', text: '#5D4E37' },   // 薄荷绿
        { bg: '#BCAAA4', text: '#fff' },      // 棕灰
        { bg: '#B39DDB', text: '#fff' }       // 淡紫
    ];

    // 根据人物名称获取颜色（基于名称哈希，保证同一人物颜色一致）
    NR.getCharacterColor = function(name, isProtagonist) {
        if (isProtagonist) {
            return NR.CHARACTER_COLORS[0]; // 主角固定金色
        }
        // 简单哈希算法
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash) + name.charCodeAt(i);
            hash = hash & hash;
        }
        // 跳过索引0（主角专用），从1开始
        var index = (Math.abs(hash) % (NR.CHARACTER_COLORS.length - 1)) + 1;
        return NR.CHARACTER_COLORS[index];
    };

    // 初始化数据库数据结构
    NR.initCharacterFormData = function() {
        if (!NR.state.currentBookData.globalData) {
            NR.state.currentBookData.globalData = null;
        }
        if (!NR.state.currentBookData.protagonistInfo) {
            NR.state.currentBookData.protagonistInfo = null;
        }
        if (!NR.state.currentBookData.importantNPCs) {
            NR.state.currentBookData.importantNPCs = [];
        }
        if (!NR.state.currentBookData.skills) {
            NR.state.currentBookData.skills = [];
        }
        if (!NR.state.currentBookData.items) {
            NR.state.currentBookData.items = [];
        }
        if (!NR.state.currentBookData.quests) {
            NR.state.currentBookData.quests = [];
        }
        if (!NR.state.currentBookData.locations) {
            NR.state.currentBookData.locations = [];
        }
        if (!NR.state.currentBookData.equipments) {
            NR.state.currentBookData.equipments = [];
        }
        if (!NR.state.currentBookData.factions) {
            NR.state.currentBookData.factions = [];
        }
        if (!NR.state.currentBookData.intels) {
            NR.state.currentBookData.intels = [];
        }
        if (!NR.state.currentBookData.timelines) {
            NR.state.currentBookData.timelines = [];
        }
        
        // 为已有数据创建初始历史版本（数据迁移）
        NR.migrateDataToHistory();
    };
    
    // 数据迁移：为已有数据创建初始历史版本
    NR.migrateDataToHistory = function() {
        var needSave = false;
        
        // 全局数据迁移
        if (NR.state.currentBookData.globalData && !NR.state.currentBookData.globalDataHistory) {
            NR.state.currentBookData.globalDataHistory = [NR.state.currentBookData.globalData];
            needSave = true;
        }
        
        // 主角数据迁移
        if (NR.state.currentBookData.protagonistInfo && !NR.state.currentBookData.protagonistHistory) {
            NR.state.currentBookData.protagonistHistory = [NR.state.currentBookData.protagonistInfo];
            needSave = true;
        }
        
        // NPC数据迁移
        if (NR.state.currentBookData.importantNPCs && NR.state.currentBookData.importantNPCs.length > 0 && !NR.state.currentBookData.npcHistory) {
            NR.state.currentBookData.npcHistory = [{
                data: JSON.parse(JSON.stringify(NR.state.currentBookData.importantNPCs)),
                lastUpdated: '历史数据迁移',
                timestamp: Date.now()
            }];
            needSave = true;
        }
        
        // 技能数据迁移
        if (NR.state.currentBookData.skills && NR.state.currentBookData.skills.length > 0 && !NR.state.currentBookData.skillsHistory) {
            NR.state.currentBookData.skillsHistory = [{
                data: JSON.parse(JSON.stringify(NR.state.currentBookData.skills)),
                lastUpdated: '历史数据迁移',
                timestamp: Date.now()
            }];
            needSave = true;
        }
        
        // 物品数据迁移
        if (NR.state.currentBookData.items && NR.state.currentBookData.items.length > 0 && !NR.state.currentBookData.itemsHistory) {
            NR.state.currentBookData.itemsHistory = [{
                data: JSON.parse(JSON.stringify(NR.state.currentBookData.items)),
                lastUpdated: '历史数据迁移',
                timestamp: Date.now()
            }];
            needSave = true;
        }
        
        // 任务数据迁移
        if (NR.state.currentBookData.quests && NR.state.currentBookData.quests.length > 0 && !NR.state.currentBookData.questsHistory) {
            NR.state.currentBookData.questsHistory = [{
                data: JSON.parse(JSON.stringify(NR.state.currentBookData.quests)),
                lastUpdated: '历史数据迁移',
                timestamp: Date.now()
            }];
            needSave = true;
        }
        
        // 地点数据迁移
        if (NR.state.currentBookData.locations && NR.state.currentBookData.locations.length > 0 && !NR.state.currentBookData.locationsHistory) {
            NR.state.currentBookData.locationsHistory = [{
                data: JSON.parse(JSON.stringify(NR.state.currentBookData.locations)),
                lastUpdated: '历史数据迁移',
                timestamp: Date.now()
            }];
            needSave = true;
        }
        
        // 装备数据迁移
        if (NR.state.currentBookData.equipments && NR.state.currentBookData.equipments.length > 0 && !NR.state.currentBookData.equipmentsHistory) {
            NR.state.currentBookData.equipmentsHistory = [{
                data: JSON.parse(JSON.stringify(NR.state.currentBookData.equipments)),
                lastUpdated: '历史数据迁移',
                timestamp: Date.now()
            }];
            needSave = true;
        }
        
        // 势力数据迁移
        if (NR.state.currentBookData.factions && NR.state.currentBookData.factions.length > 0 && !NR.state.currentBookData.factionsHistory) {
            NR.state.currentBookData.factionsHistory = [{
                data: JSON.parse(JSON.stringify(NR.state.currentBookData.factions)),
                lastUpdated: '历史数据迁移',
                timestamp: Date.now()
            }];
            needSave = true;
        }
        
        // 情报数据迁移
        if (NR.state.currentBookData.intels && NR.state.currentBookData.intels.length > 0 && !NR.state.currentBookData.intelsHistory) {
            NR.state.currentBookData.intelsHistory = [{
                data: JSON.parse(JSON.stringify(NR.state.currentBookData.intels)),
                lastUpdated: '历史数据迁移',
                timestamp: Date.now()
            }];
            needSave = true;
        }
        
        if (needSave) {
            NR.saveBookData();
        }
    };

    // ========== 统一数据浏览器（标签页形式）==========
    NR.DATA_BROWSER_TABS = [
        { id: 'global', icon: '🌍', label: '全局数据' },
        { id: 'protagonist', icon: '👤', label: '主角信息' },
        { id: 'npcs', icon: '👥', label: '重要人物' },
        { id: 'phone', icon: '📱', label: '小手机' },
        { id: 'skills', icon: '⚔️', label: '技能列表' },
        { id: 'items', icon: '🎒', label: '背包物品' },
        { id: 'quests', icon: '📜', label: '任务事件' },
        { id: 'locations', icon: '📍', label: '世界地点' },
        { id: 'equipments', icon: '🛡️', label: '装备' },
        { id: 'factions', icon: '🏰', label: '势力组织' },
        { id: 'intels', icon: '🔍', label: '重要情报' },
        { id: 'relationships', icon: '🔗', label: '人物关系' },
        { id: 'timeline', icon: '🧭', label: '剧情时间线' },
        { id: 'summary', icon: '📝', label: '总结' },
        { id: 'sequel', icon: '✍️', label: '续写' },
        { id: 'translation', icon: '🌐', label: '翻译' },
        { id: 'sceneImage', icon: '🎨', label: '生图' }
    ];

    // 初始化内嵌在AI数据库弹窗中的数据浏览器
    NR.initEmbeddedDataBrowser = function() {
        var tabsContainer = document.getElementById('ai-database-tabs');
        var bodyContainer = document.getElementById('ai-database-body');
        if (!tabsContainer || !bodyContainer) return;

        // 构建标签栏
        var tabsHtml = '';
        NR.DATA_BROWSER_TABS.forEach(function(tab) {
            var isActive = tab.id === (NR.state.currentDataBrowserTab || 'global');
            tabsHtml += '<button class="data-tab' + (isActive ? ' active' : '') + '" data-tab="' + tab.id + '">' +
                '<span class="tab-icon">' + tab.icon + '</span>' +
                '<span class="tab-label">' + tab.label + '</span>' +
            '</button>';
        });
        tabsContainer.innerHTML = tabsHtml;

        // 绑定标签切换事件
        tabsContainer.querySelectorAll('.data-tab').forEach(function(tabBtn) {
            tabBtn.addEventListener('click', function() {
                tabsContainer.querySelectorAll('.data-tab').forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');
                NR.state.currentDataBrowserTab = this.dataset.tab;
                NR.renderEmbeddedDataBrowserTab(this.dataset.tab);
            });
        });

        // 初始化统一上下文区域
        NR.initUnifiedContextSection();
        
        // 初始化统一图片尺寸下拉框
        NR.initUnifiedImageSizeDropdown();
        
        // 初始化统一版本选择器下拉框
        NR.initUnifiedVersionDropdown();
        
        // 初始化统一行动选项区域
        NR.initUnifiedActionSection();

        // 渲染初始标签页
        NR.renderEmbeddedDataBrowserTab(NR.state.currentDataBrowserTab || 'global');
    };

    // 初始化统一上下文区域
    NR.initUnifiedContextSection = function() {
        var contextHeader = document.getElementById('context-header-toggle');
        var contextBody = document.getElementById('context-body');
        
        if (contextHeader && contextBody && !contextHeader._eventBound) {
            contextHeader._eventBound = true;
            contextHeader.addEventListener('click', function(e) {
                e.stopPropagation();
                contextHeader.classList.toggle('collapsed');
                contextBody.classList.toggle('collapsed');
            });
        }
        
        // 初始化上下文勾选顺序追踪
        if (!NR.state.tabContextCheckOrder) {
            NR.state.tabContextCheckOrder = [];
        }
    };
    
    // 初始化统一图片尺寸下拉框
    NR.initUnifiedImageSizeDropdown = function() {
        var dropdown = document.getElementById('unified-image-size');
        if (!dropdown) return;
        
        var selected = dropdown.querySelector('.custom-dropdown-selected');
        var options = dropdown.querySelectorAll('.custom-dropdown-option');
        
        if (selected) {
            selected.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.custom-dropdown.open').forEach(function(d) {
                    if (d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            });
        }
        
        options.forEach(function(option) {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                var value = option.dataset.value;
                var text = option.textContent;
                dropdown.dataset.value = value;
                if (selected) selected.textContent = text;
                options.forEach(function(o) { o.classList.remove('selected'); });
                option.classList.add('selected');
                dropdown.classList.remove('open');
            });
        });
    };
    
    // 初始化统一版本选择器下拉框
    NR.initUnifiedVersionDropdown = function() {
        var dropdown = document.getElementById('unified-data-version');
        if (!dropdown) return;
        
        var selected = dropdown.querySelector('.custom-dropdown-selected');
        
        if (selected) {
            selected.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.custom-dropdown.open').forEach(function(d) {
                    if (d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            });
        }
        
        // 选项的点击事件在updateVersionSelectorOptions中绑定
    };
    
    // 初始化统一行动选项区域
    NR.initUnifiedActionSection = function() {
        var generateActionsBtn = document.getElementById('btn-unified-generate-actions');
        var customActionBtn = document.getElementById('btn-unified-custom-action');
        var customActionInput = document.getElementById('unified-custom-action-input');
        
        if (generateActionsBtn && !generateActionsBtn._eventBound) {
            generateActionsBtn._eventBound = true;
            generateActionsBtn.addEventListener('click', function() {
                if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
                    alert('AI 功能需要配置后才能使用，请点击【设置】按钮进行配置。');
                    return;
                }
                
                var versionDropdown = document.getElementById('unified-data-version');
                var versionInfo = null;
                if (versionDropdown && versionDropdown.dataset.value !== 'current') {
                    var historyVersions = NR.collectAllHistoryVersions();
                    var versionIdx = parseInt(versionDropdown.dataset.value);
                    if (historyVersions[versionIdx]) {
                        versionInfo = historyVersions[versionIdx];
                    }
                }
                
                var aiFormContext = NR.buildAIFormContextForSequel(versionInfo);
                NR.state.currentActionContext = aiFormContext;
                
                NR.generateActionOptions(aiFormContext).then(function(options) {
                    NR.renderUnifiedActionOptions(options);
                });
            });
        }
        
        if (customActionBtn && !customActionBtn._eventBound) {
            customActionBtn._eventBound = true;
            customActionBtn.addEventListener('click', function() {
                if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
                    alert('AI 功能需要配置后才能使用，请点击【设置】按钮进行配置。');
                    return;
                }
                
                var action = customActionInput ? customActionInput.value.trim() : '';
                if (!action) {
                    alert('请输入自定义行动或指令');
                    return;
                }
                
                var context = NR.state.currentActionContext || NR.buildAIFormContextForSequel();
                NR.els['character-form-choice-modal'].style.display = 'none';
                NR.executeActionOption(action, context);
            });
        }
    };
    
    // 渲染统一行动选项列表（在顶部统一区域）
    NR.renderUnifiedActionOptions = function(options) {
        var container = document.getElementById('unified-action-options-list');
        if (!container) return;
        
        if (!options || options.length === 0) {
            container.innerHTML = '<p class="no-data-hint">未能生成行动选项，请重试</p>';
            return;
        }
        
        var html = '';
        var optionLabels = ['🎯 合理行动', '🚀 新场景', '💢 情绪化', '💕 NSFW事件'];
        options.forEach(function(option, idx) {
            var label = optionLabels[idx] || '选项' + (idx + 1);
            html += '<div class="action-option-item" data-index="' + idx + '">' +
                '<span class="action-option-label">' + label + '</span>' +
                '<span class="action-option-text">' + NR.escapeHtml(option) + '</span>' +
            '</div>';
        });
        
        container.innerHTML = html;
        
        // 绑定点击事件
        container.querySelectorAll('.action-option-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var idx = parseInt(this.dataset.index);
                var action = options[idx];
                if (action) {
                    // 高亮选中项
                    container.querySelectorAll('.action-option-item').forEach(function(i) {
                        i.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    
                    // 使用保存的上下文执行行动
                    var context = NR.state.currentActionContext || NR.buildAIFormContextForSequel();
                    NR.els['character-form-choice-modal'].style.display = 'none';
                    NR.executeActionOption(action, context);
                }
            });
        });
    };

    // 更新统一选择范围UI（根据当前标签页显示/隐藏特定选项）
    NR.updateUnifiedRangeUI = function(tabId) {
        var isAITab = ['summary', 'sequel', 'translation', 'sceneImage', 'timeline'].indexOf(tabId) !== -1;
        var contextSection = document.getElementById('ai-database-context-section');
        var imageSizeSelector = document.getElementById('unified-image-size-selector');
        var versionSelector = document.getElementById('unified-version-selector');
        var actionSection = document.getElementById('unified-action-section');
        var generateBtn = document.getElementById('btn-generate-all-characters');
        var rangeTypeDropdown = document.getElementById('character-range-type');
        
        // 显示/隐藏上下文区域
        if (contextSection) {
            contextSection.style.display = isAITab ? 'block' : 'none';
            if (isAITab) {
                NR.updateUnifiedContextList();
            }
        }
        
        // 显示/隐藏图片尺寸选择器（仅生图标签页）
        if (imageSizeSelector) {
            imageSizeSelector.style.display = tabId === 'sceneImage' ? 'flex' : 'none';
        }
        
        // 显示/隐藏版本选择器（仅续写标签页）
        if (versionSelector) {
            versionSelector.style.display = tabId === 'sequel' ? 'flex' : 'none';
            if (tabId === 'sequel') {
                NR.updateVersionSelectorOptions();
            }
        }
        
        // 显示/隐藏行动选项区域（仅续写标签页）
        if (actionSection) {
            actionSection.style.display = tabId === 'sequel' ? 'block' : 'none';
        }
        
        // 更新生成按钮文本
        if (generateBtn) {
            var btnTexts = {
                'summary': '📝 生成总结',
                'sequel': '✍️ 生成续写',
                'translation': '🌐 生成翻译',
                'sceneImage': '🎨 生成场景图',
                'timeline': '🧭 生成时间线'
            };
            generateBtn.textContent = btnTexts[tabId] || '📋 开始填表';
        }
        
        // 更新选择范围下拉框选项（翻译和生图不支持"无"和"续写历史"选项）
        if (rangeTypeDropdown) {
            var optionsContainer = rangeTypeDropdown.querySelector('.custom-dropdown-options');
            if (optionsContainer) {
                var noneOption = optionsContainer.querySelector('[data-value="none"]');
                if (noneOption) {
                    noneOption.style.display = (tabId === 'translation' || tabId === 'sceneImage' || tabId === 'timeline') ? 'none' : 'block';
                }
                var sequelOption = optionsContainer.querySelector('[data-value="sequel"]');
                if (sequelOption) {
                    sequelOption.style.display = (tabId === 'translation' || tabId === 'timeline') ? 'none' : 'block';
                }
            }
        }
    };

    // 填充续写历史选择下拉框
    NR.populateSequelSelect = function() {
        var selectEl = document.getElementById('character-sequel-select');
        if (!selectEl) return;
        var sequels = NR.state.currentBookData.sequels || [];
        var sorted = sequels.slice().sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
        var html = '<option value="">-- 选择续写 --</option>';
        sorted.forEach(function(s, idx) {
            var range = s.sourceRange || '未知范围';
            var preview = (s.content || '').substring(0, 40).replace(/\n/g, ' ');
            var time = NR.formatTimestamp ? NR.formatTimestamp(s.timestamp) : '';
            html += '<option value="' + idx + '">' + NR.escapeHtml(range) + (time ? ' (' + time + ')' : '') + ' - ' + NR.escapeHtml(preview) + '...</option>';
        });
        selectEl.innerHTML = html;
    };

    // 更新版本选择器选项
    NR.updateVersionSelectorOptions = function() {
        var versionDropdown = document.getElementById('unified-data-version');
        var optionsContainer = document.getElementById('unified-version-options');
        if (!versionDropdown || !optionsContainer) return;
        
        var historyVersions = NR.collectAllHistoryVersions();
        
        var html = '<div class="custom-dropdown-option selected" data-value="current">当前版本</div>';
        historyVersions.forEach(function(v, idx) {
            html += '<div class="custom-dropdown-option" data-value="' + idx + '">' + NR.escapeHtml(v.label) + '</div>';
        });
        
        optionsContainer.innerHTML = html;
        
        // 重新绑定选项点击事件
        optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(function(opt) {
            opt.addEventListener('click', function() {
                optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(function(o) {
                    o.classList.remove('selected');
                });
                this.classList.add('selected');
                versionDropdown.dataset.value = this.dataset.value;
                versionDropdown.querySelector('.custom-dropdown-selected').textContent = this.textContent;
            });
        });
    };

    // 更新统一上下文列表
    NR.updateUnifiedContextList = function() {
        var contextList = document.getElementById('unified-context-list');
        if (!contextList) return;
        
        var summaries = NR.state.currentBookData.summaries || [];
        var sequels = NR.state.currentBookData.sequels || [];
        var translations = NR.state.currentBookData.translations || [];
        
        var hasContext = summaries.length > 0 || sequels.length > 0 || translations.length > 0;
        var html = '';
        
        if (!hasContext) {
            html = '<li class="no-context-hint">无可用上下文 (总结/续写/翻译)</li>';
        } else {
            // 总结历史
            if (summaries.length > 0) {
                html += '<li class="context-group-header"><strong>参考已有总结:</strong></li>';
                var sortedSummaries = summaries.slice().sort(function(a, b) {
                    return NR.parseRangeStartNumber(a.range) - NR.parseRangeStartNumber(b.range);
                });
                sortedSummaries.forEach(function(s, idx) {
                    html += NR.buildContextListItem('Summary', s.range, s.text, s.text, idx);
                });
            }
            
            // 续写历史
            if (sequels.length > 0) {
                html += '<li class="context-group-header"><strong>参考续写:</strong></li>';
                var sortedSequels = sequels.slice().sort(function(a, b) {
                    return (a.timestamp || 0) - (b.timestamp || 0);
                });
                sortedSequels.forEach(function(s, idx) {
                    html += NR.buildContextListItem('Sequel', s.sourceRange, s.content, s.content, idx);
                });
            }
            
            // 翻译历史
            if (translations.length > 0) {
                html += '<li class="context-group-header"><strong>参考译文:</strong></li>';
                var sortedTranslations = translations.slice().sort(function(a, b) {
                    return NR.parseRangeStartNumber(a.sourceRange) - NR.parseRangeStartNumber(b.sourceRange);
                });
                sortedTranslations.forEach(function(t, idx) {
                    html += NR.buildContextListItem('Translation', t.sourceRange, t.content, t.content, idx);
                });
            }
        }
        
        contextList.innerHTML = html;
        
        // 绑定上下文勾选监听
        NR.bindUnifiedContextCheckListener();
    };

    // 绑定统一上下文勾选监听
    NR.bindUnifiedContextCheckListener = function() {
        var contextList = document.getElementById('unified-context-list');
        if (!contextList) return;
        
        contextList.addEventListener('change', function(e) {
            if (e.target.type !== 'checkbox') return;
            var key = e.target.dataset.contextType + '_' + e.target.dataset.contextIndex;
            if (e.target.checked) {
                if (NR.state.tabContextCheckOrder.indexOf(key) === -1) {
                    NR.state.tabContextCheckOrder.push(key);
                }
            } else {
                NR.state.tabContextCheckOrder = NR.state.tabContextCheckOrder.filter(function(k) { return k !== key; });
            }
            NR.updateContextOrderBadges();
        });
    };

    // 更新上下文勾选顺序徽章
    NR.updateContextOrderBadges = function() {
        var contextList = document.getElementById('unified-context-list');
        if (!contextList) return;
        
        var checkboxes = contextList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function(cb) {
            var key = cb.dataset.contextType + '_' + cb.dataset.contextIndex;
            var badge = cb.parentElement.querySelector('.context-order-badge');
            if (!badge) return;
            var order = NR.state.tabContextCheckOrder.indexOf(key);
            if (order !== -1) {
                badge.textContent = order + 1;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
    };

    // 渲染内嵌数据浏览器的指定标签页内容
    NR.renderEmbeddedDataBrowserTab = function(tabId) {
        var body = document.getElementById('ai-database-body');
        if (!body) return;

        NR.state.currentDataBrowserTab = tabId;
        var html = '';
        switch (tabId) {
            case 'summary':
                html = NR.renderSummaryTab();
                break;
            case 'sequel':
                html = NR.renderSequelTab();
                break;
            case 'translation':
                html = NR.renderTranslationTab();
                break;
            case 'sceneImage':
                html = NR.renderSceneImageTab();
                break;
            case 'global':
                html = NR.renderGlobalDataTab();
                break;
            case 'protagonist':
                html = NR.renderProtagonistTab();
                break;
            case 'npcs':
                html = NR.renderNPCsTab();
                break;
            case 'skills':
                html = NR.renderListTab('skill', NR.state.currentBookData.skills || [], NR.SKILL_FIELDS, '技能');
                break;
            case 'items':
                html = NR.renderListTab('item', NR.state.currentBookData.items || [], NR.ITEM_FIELDS, '物品');
                break;
            case 'quests':
                html = NR.renderListTab('quest', NR.state.currentBookData.quests || [], NR.QUEST_FIELDS, '任务');
                break;
            case 'locations':
                html = NR.renderListTab('location', NR.state.currentBookData.locations || [], NR.LOCATION_FIELDS, '地点');
                break;
            case 'equipments':
                html = NR.renderListTab('equipment', NR.state.currentBookData.equipments || [], NR.EQUIPMENT_FIELDS, '装备');
                break;
            case 'factions':
                html = NR.renderListTab('faction', NR.state.currentBookData.factions || [], NR.FACTION_FIELDS, '势力');
                break;
            case 'intels':
                html = NR.renderListTab('intel', NR.state.currentBookData.intels || [], NR.INTEL_FIELDS, '情报');
                break;
            case 'relationships':
                html = NR.renderRelationshipsTab();
                break;
            case 'timeline':
                html = NR.renderTimelineTab();
                break;
            case 'phone':
                html = NR.renderPhoneChatTab();
                break;
            default:
                html = '<p class="no-data-hint">未知标签页</p>';
        }

        body.innerHTML = html;
        
        // 更新统一选择范围UI
        NR.updateUnifiedRangeUI(tabId);
        
        NR.bindEmbeddedDataBrowserEvents(tabId);
    };

    // 绑定内嵌数据浏览器内的事件
    NR.bindEmbeddedDataBrowserEvents = function(tabId) {
        var body = document.getElementById('ai-database-body');
        if (!body) return;

        // AI功能标签页事件绑定
        if (tabId === 'summary' || tabId === 'sequel' || tabId === 'translation' || tabId === 'sceneImage' || tabId === 'timeline' || tabId === 'phone') {
            NR.bindAITabEvents(tabId);
            return;
        }

        // 查看人物卡片
        body.querySelectorAll('.btn-view-card').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var name = this.dataset.name;
                NR.showCharacterDetail(name);
            });
        });

        // 删除NPC
        body.querySelectorAll('.btn-delete-npc').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var name = this.dataset.name;
                if (confirm('确定要删除"' + name + '"吗？')) {
                    var profiles = NR.state.currentBookData.characterProfiles || [];
                    var idx = profiles.findIndex(function(p) { return p.name === name; });
                    if (idx > -1) profiles.splice(idx, 1);
                    NR.saveBookData();
                    NR.renderEmbeddedDataBrowserTab('npcs');
                }
            });
        });

        // NPC合并模式事件绑定
        if (tabId === 'npcs') {
            // 切换合并模式按钮
            var toggleMergeBtn = document.getElementById('btn-npc-toggle-merge');
            if (toggleMergeBtn) {
                toggleMergeBtn.addEventListener('click', function() {
                    NR.toggleNPCMergeMode();
                });
            }
            
            // 确认合并按钮
            var confirmMergeBtn = document.getElementById('btn-npc-confirm-merge');
            if (confirmMergeBtn) {
                confirmMergeBtn.addEventListener('click', function() {
                    NR.confirmNPCMerge();
                });
                // 更新按钮状态
                var count = (NR.state.selectedNPCsForMerge || []).length;
                confirmMergeBtn.textContent = '合并选中 (' + count + ')';
                confirmMergeBtn.disabled = count < 2;
            }
            
            // 星星切换事件（切换主角/重要人物状态）
            body.querySelectorAll('.npc-star').forEach(function(star) {
                star.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var name = this.dataset.name;
                    NR.toggleNPCImportance(name);
                });
            });
            
            // NPC卡片点击事件（合并模式下切换选中）
            body.querySelectorAll('.npc-card').forEach(function(card) {
                card.addEventListener('click', function(e) {
                    // 如果点击的是按钮或星星，不处理
                    if (e.target.closest('.npc-actions') || e.target.closest('.npc-star')) return;
                    
                    var name = this.dataset.name;
                    if (NR.state.npcMergeMode) {
                        NR.toggleNPCSelection(name);
                    } else {
                        // 非合并模式下点击查看详情
                        NR.showCharacterDetail(name);
                    }
                });
            });
        }
        
        // 主角标签页事件绑定
        if (tabId === 'protagonist') {
            // 切换合并模式按钮
            var toggleMergeBtn = document.getElementById('btn-protagonist-toggle-merge');
            if (toggleMergeBtn) {
                toggleMergeBtn.addEventListener('click', function() {
                    NR.toggleProtagonistMergeMode();
                });
            }
            
            // 确认合并按钮
            var confirmMergeBtn = document.getElementById('btn-protagonist-confirm-merge');
            if (confirmMergeBtn) {
                confirmMergeBtn.addEventListener('click', function() {
                    NR.confirmProtagonistMerge();
                });
                // 更新按钮状态
                var count = (NR.state.selectedProtagonistForMerge || []).length;
                confirmMergeBtn.textContent = '合并选中 (' + count + ')';
                confirmMergeBtn.disabled = count < 2;
            }
            
            // 星星切换事件（取消主角状态）
            body.querySelectorAll('.npc-star').forEach(function(star) {
                star.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var name = this.dataset.name;
                    if (confirm('确定要取消"' + name + '"的主角身份吗？')) {
                        NR.toggleNPCImportance(name);
                    }
                });
            });
            
            // 主角卡片点击事件（合并模式下切换选中）
            body.querySelectorAll('.npc-card').forEach(function(card) {
                card.addEventListener('click', function(e) {
                    // 如果点击的是按钮或星星，不处理
                    if (e.target.closest('.npc-actions') || e.target.closest('.npc-star')) return;
                    
                    var name = this.dataset.name;
                    if (NR.state.protagonistMergeMode) {
                        NR.toggleProtagonistSelection(name);
                    } else {
                        // 非合并模式下点击查看详情
                        NR.showCharacterDetail(name);
                    }
                });
            });
        }

        // 查看列表项详情
        body.querySelectorAll('.btn-view-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                var index = parseInt(this.dataset.index);
                NR.showDataItemDetail(type, index);
            });
        });

        // 删除列表项
        body.querySelectorAll('.btn-delete-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                var index = parseInt(this.dataset.index);
                NR.deleteEmbeddedDataItem(type, index);
            });
        });

        // 编辑全局数据
        body.querySelectorAll('.btn-edit-data').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                if (type === 'global') {
                    NR.showGlobalDataEditModal();
                }
            });
        });
        
        // 版本切换事件
        body.querySelectorAll('.version-select').forEach(function(select) {
            select.addEventListener('change', function() {
                var dataType = this.dataset.type;
                var versionIdx = parseInt(this.value);
                NR.state['viewing' + dataType + 'Version'] = versionIdx;
                NR.renderEmbeddedDataBrowserTab(NR.state.currentDataBrowserTab);
            });
        });

        // 人物关系图
        if (tabId === 'relationships') {
            setTimeout(function() {
                NR.renderRelationshipGraphInContainer('relationships-container');
            }, 100);
        }
    };

    // 绑定AI功能标签页事件
    NR.bindAITabEvents = function(tabId) {
        var body = document.getElementById('ai-database-body');
        if (!body) return;

        // 检查AI配置
        var checkAiConfig = function() {
            if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
                alert('AI 功能需要配置后才能使用，请点击【设置】按钮进行配置。');
                return false;
            }
            return true;
        };

        // 获取统一选择范围的值
        var getUnifiedRangeValues = function() {
            var rangeTypeDropdown = document.getElementById('character-range-type');
            var type = rangeTypeDropdown ? rangeTypeDropdown.dataset.value : 'chapter';
            var pageRangeInput = document.getElementById('character-page-range');
            var chapterRangeInput = document.getElementById('character-chapter-range');
            
            return {
                type: type,
                pageRange: pageRangeInput ? pageRangeInput.value : '',
                chapterRange: chapterRangeInput ? chapterRangeInput.value : ''
            };
        };

        // 根据统一选择范围获取文本和范围描述
        var getTextAndRangeFromUnified = function() {
            var rangeValues = getUnifiedRangeValues();
            var type = rangeValues.type;
            var text, rangeDesc;

            if (type === 'none') {
                return { text: '', rangeDesc: '自由创作', type: 'none' };
            } else if (type === 'sequel') {
                var selectEl = document.getElementById('character-sequel-select');
                var selectedIdx = selectEl ? selectEl.value : '';
                if (selectedIdx === '') return { error: '请选择一条续写历史' };
                var sequels = NR.state.currentBookData.sequels || [];
                var sortedSequels = sequels.slice().sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
                var sequel = sortedSequels[parseInt(selectedIdx, 10)];
                if (!sequel) return { error: '未找到该续写记录' };
                text = sequel.content || '';
                rangeDesc = '续写: ' + (sequel.sourceRange || '未知范围');
                return { text: text, rangeDesc: rangeDesc, type: 'sequel' };
            } else if (type === 'page') {
                var rangeStr = rangeValues.pageRange;
                if (!rangeStr) return { error: '请输入页码范围' };
                var parts = rangeStr.trim().split(/[-\s,]+/);
                if (parts.length !== 2) return { error: '页码格式不正确。' };
                var start = parseInt(parts[0], 10);
                var end = parseInt(parts[1], 10);
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.totalPages || start > end) {
                    return { error: '无效的页码范围。' };
                }
                text = NR.getTextForPageRange(start, end);
                rangeDesc = '第 ' + start + '-' + end + ' 页';
            } else {
                var rangeStr = rangeValues.chapterRange;
                if (!rangeStr) return { error: '请输入章节范围' };
                var parts = rangeStr.trim().split(/[-\s,]+/);
                if (parts.length > 2) return { error: '章节格式不正确。' };
                var start = parseInt(parts[0], 10);
                var end = parts.length === 2 ? parseInt(parts[1], 10) : start;
                if (isNaN(start) || isNaN(end) || start < 1 || end > NR.state.chapters.length || start > end) {
                    return { error: '无效的章节序号。' };
                }
                var texts = [];
                for (var i = start; i <= end; i++) {
                    texts.push(NR.getTextForChapter(i));
                }
                text = texts.join('\n\n');
                rangeDesc = '第 ' + start + (start === end ? '' : '-' + end) + ' 章';
            }
            return { text: text, rangeDesc: rangeDesc, type: type };
        };

        // 收集选中的上下文并构建提示词
        var collectSelectedContexts = function(forType) {
            var contextList = document.getElementById('unified-context-list');
            if (!contextList) return '';
            
            var selectedContexts = Array.from(contextList.querySelectorAll('input[type="checkbox"]:checked'));
            if (selectedContexts.length === 0) return '';

            // 按勾选顺序排序
            var sortedContexts = selectedContexts.slice().sort(function(a, b) {
                var keyA = a.dataset.contextType + '_' + a.dataset.contextIndex;
                var keyB = b.dataset.contextType + '_' + b.dataset.contextIndex;
                var orderA = NR.state.tabContextCheckOrder.indexOf(keyA);
                var orderB = NR.state.tabContextCheckOrder.indexOf(keyB);
                if (orderA === -1) orderA = Infinity;
                if (orderB === -1) orderB = Infinity;
                return orderA - orderB;
            });

            var summaries = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Summary'; }).map(function(cb) { return cb.value; });
            var sequels = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Sequel'; }).map(function(cb) { return cb.value; });
            var translations = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Translation'; }).map(function(cb) { return cb.value; });

            var contextParts = [];
            if (summaries.length > 0) contextParts.push('请参考以下已有总结：\n' + summaries.join('\n---\n'));
            if (sequels.length > 0) contextParts.push('请参考以下相关续写内容：\n' + sequels.join('\n---\n'));
            if (translations.length > 0) contextParts.push('请参考以下相关译文：\n' + translations.join('\n---\n'));

            if (forType === 'none') {
                return summaries.concat(sequels).concat(translations).join('\n\n---\n\n');
            }
            var typeLabel = forType === 'summary' ? '总结' : (forType === 'timeline' ? '生成剧情时间线' : '续写');
            return '在' + typeLabel + '前，请先浏览以下参考信息：\n\n' + contextParts.join('\n\n') + '\n\n---\n\n';
        };

        // 总结标签页事件
        if (tabId === 'summary') {
            var generateBtn = document.getElementById('btn-tab-generate-summary');

            if (generateBtn) {
                generateBtn.addEventListener('click', function() {
                    if (!checkAiConfig()) return;
                    
                    var result = getTextAndRangeFromUnified();
                    if (result.error) {
                        alert(result.error);
                        return;
                    }

                    // 收集选中的上下文
                    var contextPrompt = collectSelectedContexts(result.type === 'none' ? 'none' : 'summary');
                    var contextList = document.getElementById('unified-context-list');
                    var hasSelectedContext = contextList && contextList.querySelectorAll('input[type="checkbox"]:checked').length > 0;

                    if (result.type === 'none' && !hasSelectedContext) {
                        alert('请选择一个总结范围，或者至少选择一个参考上下文进行总结。');
                        return;
                    }

                    if (result.type === 'none') {
                        result.rangeDesc = '基于上下文总结';
                    }

                    NR.els['character-form-choice-modal'].style.display = 'none';
                    NR.getSummary(result.text, result.rangeDesc, contextPrompt);
                });
            }
        }

        // 剧情时间线标签页事件
        if (tabId === 'timeline') {
            var timelineGenerateBtn = document.getElementById('btn-tab-generate-timeline');

            if (timelineGenerateBtn) {
                timelineGenerateBtn.addEventListener('click', function() {
                    if (!checkAiConfig()) return;
                    
                    var result = getTextAndRangeFromUnified();
                    if (result.error) {
                        alert(result.error);
                        return;
                    }

                    if (result.type === 'none') {
                        alert('剧情时间线需要选择页码或章节范围。');
                        return;
                    }

                    var contextPrompt = collectSelectedContexts('timeline');
                    NR.els['character-form-choice-modal'].style.display = 'none';
                    NR.generateTimeline(result.text, result.rangeDesc, contextPrompt);
                });
            }
        }

        // 续写标签页事件
        if (tabId === 'sequel') {
            var generateBtn = document.getElementById('btn-tab-generate-sequel');

            if (generateBtn) {
                generateBtn.addEventListener('click', function() {
                    if (!checkAiConfig()) return;
                    
                    var result = getTextAndRangeFromUnified();
                    if (result.error) {
                        alert(result.error);
                        return;
                    }

                    // 获取选择的版本
                    var versionDropdown = document.getElementById('unified-data-version');
                    var versionInfo = null;
                    if (versionDropdown && versionDropdown.dataset.value !== 'current') {
                        var historyVersions = NR.collectAllHistoryVersions();
                        var versionIdx = parseInt(versionDropdown.dataset.value);
                        if (historyVersions[versionIdx]) {
                            versionInfo = historyVersions[versionIdx];
                        }
                    }
                    
                    // 自动收集AI填表数据作为上下文（包含总结）
                    var aiFormContext = NR.buildAIFormContextForSequel(versionInfo);
                    
                    // 收集用户手动选中的额外上下文（续写/翻译历史）
                    var contextList = document.getElementById('unified-context-list');
                    var selectedContexts = contextList ? Array.from(contextList.querySelectorAll('input[type="checkbox"]:checked')) : [];
                    var manualContext = '';
                    if (selectedContexts.length > 0) {
                        var sortedContexts = selectedContexts.slice().sort(function(a, b) {
                            var keyA = a.dataset.contextType + '_' + a.dataset.contextIndex;
                            var keyB = b.dataset.contextType + '_' + b.dataset.contextIndex;
                            var orderA = NR.state.tabContextCheckOrder.indexOf(keyA);
                            var orderB = NR.state.tabContextCheckOrder.indexOf(keyB);
                            if (orderA === -1) orderA = Infinity;
                            if (orderB === -1) orderB = Infinity;
                            return orderA - orderB;
                        });
                        
                        var sequels = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Sequel'; }).map(function(cb) { return cb.value; });
                        var translations = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Translation'; }).map(function(cb) { return cb.value; });
                        
                        var manualParts = [];
                        if (sequels.length > 0) manualParts.push('请参考以下已有续写内容：\n' + sequels.join('\n---\n'));
                        if (translations.length > 0) manualParts.push('请参考以下相关译文：\n' + translations.join('\n---\n'));
                        if (manualParts.length > 0) {
                            manualContext = manualParts.join('\n\n') + '\n\n---\n\n';
                        }
                    }
                    
                    var contextPrompt = aiFormContext + manualContext;

                    if (result.type === 'none' && !aiFormContext && !manualContext) {
                        if (!confirm('您没有选择任何原文或参考上下文，确定要让 AI 从零开始自由创作吗？')) {
                            return;
                        }
                    }
                    
                    if (NR.state.activeSubView !== 'original' && NR.state.originalContentForSubView.content) {
                        var originalName = NR.state.originalContentForSubView.name;
                        var originalContent = NR.state.originalContentForSubView.content;
                        NR.state.activeSubView = 'original';
                        NR.loadBook(originalName, originalContent).then(function() {
                            NR.els['character-form-choice-modal'].style.display = 'none';
                            NR.getSequelWithContext(result.text, result.rangeDesc, contextPrompt);
                        });
                    } else {
                        NR.els['character-form-choice-modal'].style.display = 'none';
                        NR.getSequelWithContext(result.text, result.rangeDesc, contextPrompt);
                    }
                });
            }

            // 生成行动选项按钮
            var generateActionsBtn = document.getElementById('btn-tab-generate-actions');
            if (generateActionsBtn) {
                generateActionsBtn.addEventListener('click', function() {
                    if (!checkAiConfig()) return;
                    
                    var versionDropdown = document.getElementById('unified-data-version');
                    var versionInfo = null;
                    if (versionDropdown && versionDropdown.dataset.value !== 'current') {
                        var historyVersions = NR.collectAllHistoryVersions();
                        var versionIdx = parseInt(versionDropdown.dataset.value);
                        if (historyVersions[versionIdx]) {
                            versionInfo = historyVersions[versionIdx];
                        }
                    }
                    
                    var aiFormContext = NR.buildAIFormContextForSequel(versionInfo);
                    var contextList = document.getElementById('unified-context-list');
                    var selectedContexts = contextList ? Array.from(contextList.querySelectorAll('input[type="checkbox"]:checked')) : [];
                    var manualContext = '';
                    if (selectedContexts.length > 0) {
                        var sortedContexts = selectedContexts.slice().sort(function(a, b) {
                            var keyA = a.dataset.contextType + '_' + a.dataset.contextIndex;
                            var keyB = b.dataset.contextType + '_' + b.dataset.contextIndex;
                            var orderA = NR.state.tabContextCheckOrder.indexOf(keyA);
                            var orderB = NR.state.tabContextCheckOrder.indexOf(keyB);
                            if (orderA === -1) orderA = Infinity;
                            if (orderB === -1) orderB = Infinity;
                            return orderA - orderB;
                        });
                        
                        var sequels = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Sequel'; }).map(function(cb) { return cb.value; });
                        var translations = sortedContexts.filter(function(cb) { return cb.dataset.contextType === 'Translation'; }).map(function(cb) { return cb.value; });
                        
                        var manualParts = [];
                        if (sequels.length > 0) manualParts.push('已有续写内容：\n' + sequels.join('\n---\n'));
                        if (translations.length > 0) manualParts.push('相关译文：\n' + translations.join('\n---\n'));
                        if (manualParts.length > 0) {
                            manualContext = manualParts.join('\n\n') + '\n\n';
                        }
                    }
                    
                    var fullContext = aiFormContext + manualContext;
                    NR.state.currentActionContext = fullContext;
                    
                    NR.generateActionOptions(fullContext).then(function(options) {
                        NR.renderActionOptions(options);
                    });
                });
            }

            // 自定义行动按钮
            var customActionBtn = document.getElementById('btn-custom-action');
            if (customActionBtn) {
                customActionBtn.addEventListener('click', function() {
                    if (!checkAiConfig()) return;
                    var customInput = document.getElementById('custom-action-input');
                    var action = customInput ? customInput.value.trim() : '';
                    if (!action) {
                        alert('请输入自定义行动或指令');
                        return;
                    }
                    
                    var context = NR.state.currentActionContext || NR.buildAIFormContextForSequel();
                    NR.els['character-form-choice-modal'].style.display = 'none';
                    NR.executeActionOption(action, context);
                });
            }
        }

        // 翻译标签页事件
        if (tabId === 'translation') {
            var generateBtn = document.getElementById('btn-tab-generate-translation');

            if (generateBtn) {
                generateBtn.addEventListener('click', function() {
                    if (!checkAiConfig()) return;
                    
                    var result = getTextAndRangeFromUnified();
                    if (result.error) {
                        alert(result.error);
                        return;
                    }

                    if (result.type === 'none') {
                        alert('翻译功能需要选择页码或章节范围');
                        return;
                    }

                    NR.els['character-form-choice-modal'].style.display = 'none';
                    NR.getTranslation(result.text, result.rangeDesc, '');
                });
            }
        }

        // 生图标签页事件
        if (tabId === 'sceneImage') {
            var generateBtn = document.getElementById('btn-tab-generate-scene-image');

            if (generateBtn) {
                generateBtn.addEventListener('click', function() {
                    if (!checkAiConfig()) return;
                    var provider = NR.state.aiSettings.imageProvider || 'comfyui';
                    if (provider === 'comfyui') {
                        if (!NR.state.aiSettings.comfyuiApiUrl) {
                            alert('请先在设置中配置 ComfyUI API 地址');
                            return;
                        }
                    } else if (provider === 'nanobananapro') {
                        if (!NR.state.aiSettings.nanoBananaProApiKey) {
                            alert('请先在设置中配置 Nano Banana Pro API Key');
                            return;
                        }
                    }
                    
                    var result = getTextAndRangeFromUnified();
                    if (result.error) {
                        alert(result.error);
                        return;
                    }

                    if (result.type === 'none') {
                        alert('生图功能需要选择页码或章节范围');
                        return;
                    }

                    var sizeDropdown = document.getElementById('unified-image-size');
                    var sizeValue = sizeDropdown ? sizeDropdown.dataset.value : 'landscape_4_3';
                    
                    NR.els['character-form-choice-modal'].style.display = 'none';
                    NR.generateSceneImagePrompt(result.text, result.rangeDesc).then(function(promptData) {
                        NR.showSceneImagePromptModal(promptData, sizeValue);
                    }).catch(function(err) {
                        if (err !== '无内容' && err !== '未配置ComfyUI' && err !== '未配置Nano Banana Pro') {
                            console.error('生成场景提示词失败:', err);
                            alert('生成失败: ' + (err.message || err));
                        }
                        NR.els['app-loader'].classList.add('hidden');
                        NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
                    });
                });
            }

            // 查看生图历史
            body.querySelectorAll('.btn-view-scene-image').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var index = parseInt(this.dataset.index);
                    var sceneImages = NR.state.currentBookData.sceneImages || [];
                    var item = sceneImages.sort(function(a, b) { return b.timestamp - a.timestamp; })[index];
                    if (item) {
                        NR.showSceneImageDetail(item);
                    }
                });
            });

            // 删除生图历史
            body.querySelectorAll('.btn-delete-scene-image').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var index = parseInt(this.dataset.index);
                    var sceneImages = NR.state.currentBookData.sceneImages || [];
                    var sortedImages = sceneImages.slice().sort(function(a, b) { return b.timestamp - a.timestamp; });
                    var item = sortedImages[index];
                    if (item && confirm('确定要删除这张图片吗？')) {
                        var realIndex = sceneImages.findIndex(function(img) { return img.timestamp === item.timestamp; });
                        if (realIndex > -1) {
                            if (item.imageId) {
                                NR.storageDB.deleteAsset(item.imageId).catch(function(err) {
                                    console.error('删除图片资源失败:', err);
                                });
                            }
                            sceneImages.splice(realIndex, 1);
                            NR.saveBookData();
                            NR.renderEmbeddedDataBrowserTab('sceneImage');
                        }
                    }
                });
            });
        }

        // 小手机聊天标签页事件
        if (tabId === 'phone') {
            NR.bindPhoneChatEvents();
        }

        // 通用历史记录事件
        body.querySelectorAll('.timeline-event-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var moduleIndex = parseInt(this.dataset.timelineIndex, 10);
                var eventIndex = parseInt(this.dataset.eventIndex, 10);
                NR.showTimelineEventDetailByIndex(moduleIndex, eventIndex);
            });
        });

        body.querySelectorAll('.btn-view-history').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                var timestamp = parseInt(this.dataset.timestamp);
                NR.viewHistoryItem(type, timestamp);
            });
        });

        body.querySelectorAll('.btn-delete-history').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                if (type === 'timeline' && this.dataset.timelineIndex !== undefined) {
                    NR.deleteTimelineModuleByIndex(parseInt(this.dataset.timelineIndex, 10));
                    return;
                }
                var timestamp = parseInt(this.dataset.timestamp);
                NR.deleteHistoryItem(type, timestamp);
            });
        });
    };

    // 查看历史记录项
    NR.viewHistoryItem = function(type, timestamp) {
        var dataArray, content, title, sourceRange;
        if (type === 'summary') {
            dataArray = NR.state.currentBookData.summaries || [];
            var item = dataArray.find(function(s) { return s.timestamp === timestamp; });
            if (item) {
                content = item.text;
                title = '总结 - ' + item.range;
            }
        } else if (type === 'sequel') {
            dataArray = NR.state.currentBookData.sequels || [];
            // 按时间排序，拼接所有续写内容
            var sortedSequels = dataArray.slice().sort(function(a, b) {
                return (a.timestamp || 0) - (b.timestamp || 0);
            });
            if (sortedSequels.length > 0) {
                var contentParts = sortedSequels.map(function(s, idx) {
                    return '【续写 ' + (idx + 1) + '】' + (s.sourceRange || '') + '\n\n' + s.content;
                });
                content = contentParts.join('\n\n' + '─'.repeat(20) + '\n\n');
            }
        } else if (type === 'translation') {
            dataArray = NR.state.currentBookData.translations || [];
            // 按范围排序，拼接所有翻译内容
            var sortedTranslations = dataArray.slice().sort(function(a, b) {
                return NR.parseRangeStartNumber(a.sourceRange) - NR.parseRangeStartNumber(b.sourceRange);
            });
            if (sortedTranslations.length > 0) {
                var contentParts = sortedTranslations.map(function(t, idx) {
                    return '【翻译 ' + (idx + 1) + '】' + (t.sourceRange || '') + '\n\n' + t.content;
                });
                content = contentParts.join('\n\n' + '─'.repeat(20) + '\n\n');
            }
        } else if (type === 'timeline') {
            dataArray = NR.state.currentBookData.timelines || [];
            var timeline = dataArray.find(function(t) { return t.timestamp === timestamp; });
            if (timeline) {
                content = NR.formatTimelineForDisplay(timeline);
                title = '剧情时间线 - ' + (timeline.range || '未知范围');
            }
        }

        if (!content) return;

        // 续写和翻译直接显示为阅读页面
        if (type === 'sequel' || type === 'translation') {
            // 关闭AI数据库弹窗
            NR.els['character-form-choice-modal'].style.display = 'none';
            
            // 保存原文信息（如果还没保存）
            if (NR.state.activeSubView === 'original') {
                NR.state.originalContentForSubView = {
                    name: NR.state.currentFileName,
                    content: NR.state.currentFileContent
                };
            }
            
            // 设置子视图状态并加载内容
            NR.state.activeSubView = type;
            var prefix = type === 'sequel' ? '【续】' : '【译】';
            NR.loadBook(prefix + NR.state.originalContentForSubView.name, content);
            return;
        }

        // 总结仍然使用弹窗显示
        var existingModal = document.getElementById('history-view-modal');
        if (existingModal) existingModal.remove();

        var modalHtml = 
            '<div id="history-view-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>' + NR.escapeHtml(title) + '</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="page" style="height: auto; max-height: 60vh; overflow-y: auto; padding: 15px;">' +
                        NR.escapeHtml(content).replace(/\n/g, '<br>') +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        var modal = document.getElementById('history-view-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
    };

    // 删除历史记录项
    NR.deleteHistoryItem = function(type, timestamp) {
        var dataArray, tabId;
        if (type === 'summary') {
            dataArray = NR.state.currentBookData.summaries || [];
            tabId = 'summary';
        } else if (type === 'sequel') {
            dataArray = NR.state.currentBookData.sequels || [];
            tabId = 'sequel';
        } else if (type === 'translation') {
            dataArray = NR.state.currentBookData.translations || [];
            tabId = 'translation';
        } else if (type === 'timeline') {
            dataArray = NR.state.currentBookData.timelines || [];
            tabId = 'timeline';
        }

        if (!dataArray) return;

        var index = dataArray.findIndex(function(s) { return s.timestamp === timestamp; });
        if (index > -1 && confirm('确定要删除这条记录吗？')) {
            dataArray.splice(index, 1);
            NR.saveBookData();
            NR.renderEmbeddedDataBrowserTab(tabId);
        }
    };

    // 格式化剧情时间线详情
    NR.formatTimelineForDisplay = function(timeline) {
        var lines = [];
        lines.push('时间节点：' + (timeline.timeNode || timeline.range || '未知时间'));
        lines.push('范围：' + (timeline.range || '未知范围'));
        if (timeline.summary) {
            lines.push('总览：' + timeline.summary);
        }
        lines.push('');

        var events = timeline.events || [];
        if (events.length === 0) {
            lines.push('暂无结构化事件。');
            return lines.join('\n');
        }

        events.forEach(function(event, index) {
            lines.push('【事件 ' + (index + 1) + '】' + (event.title || '剧情事件'));
            if (event.summary) lines.push('概述：' + event.summary);
            if (event.detail && event.detail !== event.summary) lines.push('详情：' + event.detail);
            if (event.sourceTime) lines.push('来源时间：' + event.sourceTime);
            if (event.sourceRange) lines.push('来源范围：' + event.sourceRange);
            if (event.characters && event.characters.length) lines.push('人物：' + event.characters.join('、'));
            if (event.locations && event.locations.length) lines.push('地点：' + event.locations.join('、'));
            if (event.factions && event.factions.length) lines.push('势力：' + event.factions.join('、'));
            if (event.items && event.items.length) lines.push('物品/线索：' + event.items.join('、'));
            if (event.impact) lines.push('影响：' + event.impact);
            if (event.foreshadowing && event.foreshadowing.length) lines.push('伏笔：' + event.foreshadowing.join('；'));
            lines.push('');
        });

        return lines.join('\n');
    };

    NR.buildTimelineEventDetailHtml = function(module, event) {
        module = module || {};
        event = event || {};
        var html = '';
        var addField = function(label, value) {
            if (!value || (Array.isArray(value) && value.length === 0)) return;
            html += '<div class="timeline-detail-field">' +
                '<label>' + NR.escapeHtml(label) + '</label>' +
                '<div>' + NR.escapeHtml(Array.isArray(value) ? value.join('、') : value) + '</div>' +
            '</div>';
        };

        html += '<div class="timeline-event-detail">';
        addField('时间节点', module.timeNode || module.range || '未知时间');
        addField('来源范围', event.sourceRange || module.range);
        addField('来源时间', event.sourceTime);
        addField('概述', event.summary);
        addField('详情', event.detail && event.detail !== event.summary ? event.detail : '');
        addField('相关人物', event.characters);
        addField('相关地点', event.locations);
        addField('相关势力', event.factions);
        addField('物品/技能/线索', event.items);
        addField('影响', event.impact);
        addField('伏笔/未解决问题', event.foreshadowing);
        html += '</div>';
        return html;
    };

    NR.showTimelineEventDetailFromData = function(module, event) {
        if (!module || !event) return;
        var existingModal = document.getElementById('timeline-event-detail-modal');
        if (existingModal) existingModal.remove();

        var modalHtml =
            '<div id="timeline-event-detail-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content timeline-event-modal">' +
                    '<div class="modal-header">' +
                        '<h2>🧭 ' + NR.escapeHtml(event.title || '剧情事件') + '</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    NR.buildTimelineEventDetailHtml(module, event) +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        var modal = document.getElementById('timeline-event-detail-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
    };

    NR.showTimelineEventDetail = function(timelineTimestamp, eventIndex) {
        var timelines = NR.state.currentBookData.timelines || [];
        var module = timelines.find(function(item) { return item.timestamp === timelineTimestamp; });
        if (!module || !module.events || !module.events[eventIndex]) return;
        NR.showTimelineEventDetailFromData(module, module.events[eventIndex]);
    };

    NR.getTimelineModuleBySortedIndex = function(moduleIndex) {
        var timelines = NR.sortTimelineModules ? NR.sortTimelineModules(NR.state.currentBookData.timelines || []) : (NR.state.currentBookData.timelines || []);
        return timelines[moduleIndex] || null;
    };

    NR.showTimelineEventDetailByIndex = function(moduleIndex, eventIndex) {
        var module = NR.getTimelineModuleBySortedIndex(moduleIndex);
        if (!module || !module.events || !module.events[eventIndex]) return;
        NR.showTimelineEventDetailFromData(module, module.events[eventIndex]);
    };

    NR.deleteTimelineModuleByIndex = function(moduleIndex) {
        var module = NR.getTimelineModuleBySortedIndex(moduleIndex);
        if (!module) return;
        if (!confirm('确定要删除这个时间节点模块吗？')) return;

        var timelines = NR.state.currentBookData.timelines || [];
        var realIndex = timelines.indexOf(module);
        if (realIndex < 0) {
            realIndex = timelines.findIndex(function(item) {
                return item.timestamp === module.timestamp &&
                    item.timeNode === module.timeNode &&
                    item.range === module.range;
            });
        }
        if (realIndex < 0) return;

        timelines.splice(realIndex, 1);
        NR.saveBookData();
        if (document.getElementById('ai-database-body')) {
            NR.renderEmbeddedDataBrowserTab('timeline');
        } else if (document.getElementById('data-browser-body')) {
            NR.renderDataBrowserTab('timeline');
        }
    };

    // 显示场景图详情
    NR.showSceneImageDetail = function(item) {
        var existingModal = document.getElementById('scene-image-detail-modal');
        if (existingModal) existingModal.remove();

        var rangeDesc = item.rangeDesc || item.sourceRange || '';
        
        var modalHtml = 
            '<div id="scene-image-detail-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 90vw; max-height: 90vh;">' +
                    '<div class="modal-header">' +
                        '<h2>🎨 场景图 - ' + NR.escapeHtml(rangeDesc) + '</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div id="scene-image-detail-content" style="text-align: center; padding: 15px; overflow: auto;">' +
                        '<p>加载中...</p>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        var modal = document.getElementById('scene-image-detail-modal');
        var contentDiv = document.getElementById('scene-image-detail-content');
        
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        // 异步加载图片
        NR.loadSceneImageData(item).then(function(imageData) {
            var imgSrc = imageData || item.imageUrl || item.image;
            if (imgSrc) {
                contentDiv.innerHTML = 
                    '<img src="' + imgSrc + '" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">' +
                    (item.prompt ? '<p style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">提示词: ' + NR.escapeHtml(item.prompt.substring(0, 200)) + '...</p>' : '');
            } else {
                contentDiv.innerHTML = '<p style="color: #999;">图片加载失败</p>';
            }
        });
    };

    // 删除内嵌数据浏览器中的数据项
    NR.deleteEmbeddedDataItem = function(type, index) {
        var dataArrayMap = {
            'skill': 'skills',
            'item': 'items',
            'quest': 'quests',
            'location': 'locations',
            'equipment': 'equipments',
            'faction': 'factions',
            'intel': 'intels'
        };

        var key = dataArrayMap[type];
        if (!key) return;

        var dataArray = NR.state.currentBookData[key] || [];
        var record = dataArray[index];
        if (!record) return;

        var name = record.data ? record.data.name : '此项';
        if (!confirm('确定要删除"' + name + '"吗？')) return;

        dataArray.splice(index, 1);
        NR.saveBookData();
        NR.renderEmbeddedDataBrowserTab(NR.state.currentDataBrowserTab || type + 's');
    };

    // 打开数据浏览器（独立弹窗版本，保留兼容）
    NR.showDataBrowser = function(initialTab) {
        NR.initCharacterFormData();
        
        var existingModal = document.getElementById('data-browser-modal');
        if (existingModal) existingModal.remove();

        // 构建标签栏
        var tabsHtml = '<div class="data-browser-tabs">';
        NR.DATA_BROWSER_TABS.forEach(function(tab) {
            var isActive = tab.id === (initialTab || 'global');
            tabsHtml += '<button class="data-tab' + (isActive ? ' active' : '') + '" data-tab="' + tab.id + '">' +
                '<span class="tab-icon">' + tab.icon + '</span>' +
                '<span class="tab-label">' + tab.label + '</span>' +
            '</button>';
        });
        tabsHtml += '</div>';

        var modalHtml = 
            '<div id="data-browser-modal" class="modal data-browser-modal" style="display: flex;">' +
                '<div class="modal-content data-browser-content">' +
                    '<div class="modal-header">' +
                        '<h2>📊 数据浏览器</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    tabsHtml +
                    '<div class="data-browser-body" id="data-browser-body"></div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('data-browser-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        // 绑定标签切换事件
        modal.querySelectorAll('.data-tab').forEach(function(tabBtn) {
            tabBtn.addEventListener('click', function() {
                modal.querySelectorAll('.data-tab').forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');
                NR.renderDataBrowserTab(this.dataset.tab);
            });
        });

        // 渲染初始标签页
        NR.renderDataBrowserTab(initialTab || 'global');
    };

    // 渲染数据浏览器的指定标签页内容
    NR.renderDataBrowserTab = function(tabId) {
        var body = document.getElementById('data-browser-body');
        if (!body) return;

        var html = '';
        switch (tabId) {
            case 'global':
                html = NR.renderGlobalDataTab();
                break;
            case 'protagonist':
                html = NR.renderProtagonistTab();
                break;
            case 'npcs':
                html = NR.renderNPCsTab();
                break;
            case 'skills':
                html = NR.renderListTab('skill', NR.state.currentBookData.skills || [], NR.SKILL_FIELDS, '技能');
                break;
            case 'items':
                html = NR.renderListTab('item', NR.state.currentBookData.items || [], NR.ITEM_FIELDS, '物品');
                break;
            case 'quests':
                html = NR.renderListTab('quest', NR.state.currentBookData.quests || [], NR.QUEST_FIELDS, '任务');
                break;
            case 'locations':
                html = NR.renderListTab('location', NR.state.currentBookData.locations || [], NR.LOCATION_FIELDS, '地点');
                break;
            case 'equipments':
                html = NR.renderListTab('equipment', NR.state.currentBookData.equipments || [], NR.EQUIPMENT_FIELDS, '装备');
                break;
            case 'factions':
                html = NR.renderListTab('faction', NR.state.currentBookData.factions || [], NR.FACTION_FIELDS, '势力');
                break;
            case 'intels':
                html = NR.renderListTab('intel', NR.state.currentBookData.intels || [], NR.INTEL_FIELDS, '情报');
                break;
            case 'relationships':
                html = NR.renderRelationshipsTab();
                break;
            case 'timeline':
                html = NR.renderTimelineTab();
                break;
            case 'phone':
                html = NR.renderPhoneChatTab();
                break;
            default:
                html = '<p class="no-data-hint">未知标签页</p>';
        }

        body.innerHTML = html;
        NR.bindDataBrowserEvents(tabId);
    };

    // 渲染版本切换器组件
    NR.renderVersionSwitcher = function(historyArray, currentData, dataType) {
        // 如果没有历史记录，不显示切换器
        if (!historyArray || historyArray.length === 0) {
            return '';
        }
        
        var currentIdx = NR.state['viewing' + dataType + 'Version'];
        if (currentIdx === undefined || currentIdx === null) {
            currentIdx = historyArray.length - 1; // 默认显示最新版本
        }
        
        var html = '<div class="version-switcher">';
        html += '<span class="version-label">📜 历史版本:</span>';
        html += '<select class="version-select" data-type="' + dataType + '">';
        
        historyArray.forEach(function(item, idx) {
            var label = item.lastUpdated || ('版本 ' + (idx + 1));
            var time = item.timestamp ? NR.formatTimestamp(item.timestamp) : '';
            var selected = idx === currentIdx ? ' selected' : '';
            var isCurrent = idx === historyArray.length - 1 ? ' [当前]' : '';
            html += '<option value="' + idx + '"' + selected + '>' + NR.escapeHtml(label) + isCurrent + '</option>';
        });
        
        html += '</select>';
        html += '<span class="version-count">共 ' + historyArray.length + ' 个版本</span>';
        html += '</div>';
        
        return html;
    };
    
    // 获取当前查看的版本数据
    NR.getViewingVersionData = function(dataType) {
        var historyKey = dataType + 'History';
        var currentKey = dataType === 'globalData' ? 'globalData' : 
                         dataType === 'protagonist' ? 'protagonistInfo' : dataType;
        
        var history = NR.state.currentBookData[historyKey] || [];
        var viewingIdx = NR.state['viewing' + dataType + 'Version'];
        
        if (history.length === 0) {
            return NR.state.currentBookData[currentKey];
        }
        
        if (viewingIdx === undefined || viewingIdx === null || viewingIdx >= history.length) {
            viewingIdx = history.length - 1;
        }
        
        return history[viewingIdx];
    };

    // 渲染全局数据标签页
    NR.renderGlobalDataTab = function() {
        var history = NR.state.currentBookData.globalDataHistory || [];
        var info = history.length > 0 ? NR.getViewingVersionData('globalData') : NR.state.currentBookData.globalData;
        
        if (!info) {
            return '<div class="tab-empty"><p>暂无全局数据</p><p class="hint">使用"开始填表"功能让AI提取数据</p></div>';
        }
        
        var data = info.data || {};
        var html = '<div class="data-detail-view">';
        
        // 版本切换器（有历史记录时显示）
        if (history.length > 0) {
            html += NR.renderVersionSwitcher(history, info, 'globalData');
        }
        
        html += '<div class="detail-header"><span class="detail-updated">最后更新: ' + NR.escapeHtml(info.lastUpdated || '未知') + '</span>';
        html += '<button class="control-button btn-edit-data" data-type="global">✏️ 编辑</button></div>';
        html += '<div class="detail-fields-grid">';
        NR.GLOBAL_DATA_FIELDS.forEach(function(field) {
            var value = data[field.key] || '-';
            html += '<div class="detail-field"><label>' + field.label + '</label><div class="detail-value">' + NR.escapeHtml(value) + '</div></div>';
        });
        html += '</div></div>';
        return html;
    };

    // 渲染主角信息标签页（支持合并功能，合并模式下显示所有人物）
    NR.renderProtagonistTab = function() {
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        var protagonist = characterProfiles.find(function(p) { return p.isProtagonist; });
        var mergeMode = NR.state.protagonistMergeMode || false;
        var history = NR.state.currentBookData.protagonistHistory || [];
        
        var html = '<div class="npc-tab-content">';
        
        // 版本切换器（非合并模式下显示，有历史记录时显示）
        if (!mergeMode && history.length > 0) {
            html += NR.renderVersionSwitcher(history, null, 'protagonist');
        }
        
        // 合并模式工具栏
        html += '<div class="character-merge-toolbar">' +
            '<button id="btn-protagonist-toggle-merge" class="control-button' + (mergeMode ? ' active' : '') + '">' + 
                (mergeMode ? '退出合并' : '🔗 合并人物') + 
            '</button>' +
            (mergeMode ? 
                '<span class="merge-hint">选择2个或更多人物卡片进行合并</span>' +
                '<button id="btn-protagonist-confirm-merge" class="control-button merge-confirm-btn" disabled>合并选中 (0)</button>' 
                : '') +
        '</div>';
        
        // 如果在查看历史版本
        var viewingIdx = NR.state['viewingprotagonistVersion'];
        if (!mergeMode && history.length > 0 && viewingIdx !== undefined && viewingIdx < history.length - 1) {
            var historyData = history[viewingIdx];
            if (historyData && historyData.data) {
                html += '<div class="history-version-notice" style="padding: 10px; background: rgba(255,193,7,0.2); border-radius: 8px; margin-bottom: 10px;">';
                html += '<strong>📜 查看历史版本:</strong> ' + NR.escapeHtml(historyData.lastUpdated || '未知');
                html += '</div>';
                
                // 显示历史版本的主角数据（使用卡片样式）
                var pd = historyData.data;
                var name = pd.name || '未命名';
                var color = NR.getCharacterColor(name, true);
                var inScene = pd.inScene || '未知';
                var inSceneClass = inScene === '在场' ? 'in-scene' : (inScene === '离场' ? 'off-scene' : '');
                
                html += '<div class="npc-grid">';
                html += '<div class="npc-card protagonist-card ' + inSceneClass + '" data-name="' + NR.escapeHtml(name) + '">';
                html += '<div class="npc-star protagonist" title="主角">★</div>';
                html += '<div class="npc-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((name || '?')[0]) + '</div>';
                html += '<div class="npc-info">';
                html += '<h4>' + NR.escapeHtml(name) + ' <span class="protagonist-badge">主角</span></h4>';
                html += '<p>' + NR.escapeHtml(pd.occupation || pd.gender || '-') + '</p>';
                html += '<span class="scene-badge ' + inSceneClass + '">' + NR.escapeHtml(inScene) + '</span>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
                return html;
            }
        }
        
        if (!protagonist && !mergeMode) {
            html += '<div class="tab-empty"><p>暂无主角信息</p><p class="hint">使用"开始填表"功能让AI提取，或在人物列表中点击星星设置主角</p></div>';
            html += '</div>';
            return html;
        }
        
        // 合并模式下显示所有人物，非合并模式只显示主角
        var displayProfiles = mergeMode ? characterProfiles : (protagonist ? [protagonist] : []);
        
        if (displayProfiles.length === 0) {
            html += '<div class="tab-empty"><p>暂无人物数据</p></div>';
            html += '</div>';
            return html;
        }
        
        // 排序：主角排第一
        displayProfiles.sort(function(a, b) {
            if (a.isProtagonist && !b.isProtagonist) return -1;
            if (!a.isProtagonist && b.isProtagonist) return 1;
            if (a.isImportant && !b.isImportant) return -1;
            if (!a.isImportant && b.isImportant) return 1;
            return 0;
        });

        html += '<div class="npc-grid">';
        
        displayProfiles.forEach(function(profile) {
            var isProtag = profile.isProtagonist;
            var color = NR.getCharacterColor(profile.name, isProtag);
            var data = profile.data || {};
            var inScene = data['在场状态'] || '未知';
            var inSceneClass = inScene === '在场' ? 'in-scene' : (inScene === '离场' ? 'off-scene' : '');
            
            // 合并模式下检查是否被选中
            var selectedList = NR.state.selectedProtagonistForMerge || [];
            var isSelected = mergeMode && selectedList.indexOf(profile.name) !== -1;
            var selectedClass = isSelected ? ' merge-selected' : '';
            var protagonistClass = isProtag ? ' protagonist-card' : '';
            
            html += '<div class="npc-card' + protagonistClass + ' ' + inSceneClass + selectedClass + '" data-name="' + NR.escapeHtml(profile.name) + '">';
            
            // 合并模式下显示选择指示器
            if (mergeMode) {
                html += '<div class="npc-select-indicator">' + (isSelected ? '✓' : '') + '</div>';
            }
            
            // 星星状态
            var starClass = isProtag ? 'protagonist' : (profile.isImportant ? 'important' : 'normal');
            var starTitle = isProtag ? '主角 (点击取消主角)' : (profile.isImportant ? '重要人物' : '普通人物');
            html += '<div class="npc-star ' + starClass + '" data-name="' + NR.escapeHtml(profile.name) + '" title="' + starTitle + '">★</div>';
            
            // 检查是否有封面图片
            var hasCover = !!profile.cover;
            if (hasCover) {
                html += '<div class="npc-avatar" style="background-image: url(' + profile.cover + '); background-size: cover; background-position: center;"></div>';
            } else {
                html += '<div class="npc-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
            }
            
            html += '<div class="npc-info">';
            html += '<h4>' + NR.escapeHtml(profile.name);
            if (isProtag) {
                html += ' <span class="protagonist-badge">主角</span>';
            }
            html += '</h4>';
            
            // 显示别名
            if (profile.aliases && profile.aliases.length > 0) {
                html += '<p class="npc-aliases">别名: ' + NR.escapeHtml(profile.aliases.join(', ')) + '</p>';
            }
            
            html += '<p>' + NR.escapeHtml(data['身份'] || data['性别'] || '-') + '</p>';
            html += '<span class="scene-badge ' + inSceneClass + '">' + NR.escapeHtml(inScene) + '</span>';
            html += '</div>';
            html += '<div class="npc-actions">';
            html += '<button class="btn-view-card" data-name="' + NR.escapeHtml(profile.name) + '">查看</button>';
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        html += '</div>';
        return html;
    };
    
    // 主角合并模式相关函数
    NR.toggleProtagonistMergeMode = function() {
        NR.state.protagonistMergeMode = !NR.state.protagonistMergeMode;
        NR.state.selectedProtagonistForMerge = [];
        NR.renderEmbeddedDataBrowserTab('protagonist');
    };
    
    NR.toggleProtagonistSelection = function(characterName) {
        if (!NR.state.selectedProtagonistForMerge) {
            NR.state.selectedProtagonistForMerge = [];
        }
        var idx = NR.state.selectedProtagonistForMerge.indexOf(characterName);
        if (idx === -1) {
            NR.state.selectedProtagonistForMerge.push(characterName);
        } else {
            NR.state.selectedProtagonistForMerge.splice(idx, 1);
        }
        NR.renderEmbeddedDataBrowserTab('protagonist');
    };
    
    NR.confirmProtagonistMerge = function() {
        var names = NR.state.selectedProtagonistForMerge || [];
        if (names.length < 2) {
            alert('请至少选择2个人物进行合并');
            return;
        }
        
        if (!confirm('确定要将以下人物合并为一个吗？\n\n' + names.join('\n') + '\n\n合并后将由AI智能整合信息，原人物卡片将被删除。')) {
            return;
        }
        
        NR.mergeCharacterProfiles(names).then(function(newProfile) {
            alert('合并成功！\n\n主要名称: ' + newProfile.name + '\n别名: ' + (newProfile.aliases.length > 0 ? newProfile.aliases.join(', ') : '无'));
            NR.state.protagonistMergeMode = false;
            NR.state.selectedProtagonistForMerge = [];
            NR.renderEmbeddedDataBrowserTab('protagonist');
        }).catch(function(err) {
            console.error('合并失败:', err);
            alert('合并失败: ' + (err.message || err));
        });
    };

    // 渲染重要人物标签页
    NR.renderNPCsTab = function() {
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        var npcs = characterProfiles.filter(function(p) { return !p.isProtagonist; }); // 显示所有非主角人物
        var history = NR.state.currentBookData.npcHistory || [];
        var mergeMode = NR.state.npcMergeMode || false;
        
        var html = '<div class="npc-tab-content">';
        
        // 版本切换器（非合并模式下显示，有历史记录时显示）
        if (!mergeMode && history.length > 0) {
            html += NR.renderVersionSwitcher(history, null, 'npc');
        }
        
        // 合并模式工具栏
        html += '<div class="character-merge-toolbar">' +
            '<button id="btn-npc-toggle-merge" class="control-button' + (mergeMode ? ' active' : '') + '">' + 
                (mergeMode ? '退出合并' : '🔗 合并人物') + 
            '</button>' +
            (mergeMode ? 
                '<span class="merge-hint">选择2个或更多人物卡片进行合并</span>' +
                '<button id="btn-npc-confirm-merge" class="control-button merge-confirm-btn" disabled>合并选中 (0)</button>' 
                : '') +
        '</div>';
        
        // 检查是否在查看历史版本
        var viewingIdx = NR.state['viewingnpcVersion'];
        var isViewingHistory = false;
        
        if (!mergeMode && history.length > 0 && viewingIdx !== undefined && viewingIdx < history.length - 1) {
            var historyData = history[viewingIdx];
            if (historyData && historyData.data) {
                isViewingHistory = true;
                html += '<div class="history-version-notice" style="padding: 10px; background: rgba(255,193,7,0.2); border-radius: 8px; margin-bottom: 10px;">';
                html += '<strong>📜 查看历史版本:</strong> ' + NR.escapeHtml(historyData.lastUpdated || '未知');
                html += '</div>';
                
                // 显示历史版本的NPC数据（使用与当前版本相同的卡片样式）
                var historyNPCs = historyData.data || [];
                if (historyNPCs.length === 0) {
                    html += '<div class="tab-empty"><p>该版本暂无人物数据</p></div>';
                } else {
                    html += '<div class="npc-grid">';
                    historyNPCs.forEach(function(npcRecord) {
                        var data = npcRecord.data || {};
                        var name = data.name || '未命名';
                        var color = NR.getCharacterColor(name, false);
                        var inScene = data.inScene || '未知';
                        var inSceneClass = inScene === '在场' ? 'in-scene' : (inScene === '离场' ? 'off-scene' : '');
                        
                        html += '<div class="npc-card ' + inSceneClass + '" data-name="' + NR.escapeHtml(name) + '">';
                        html += '<div class="npc-star important" title="重要人物">★</div>';
                        html += '<div class="npc-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((name || '?')[0]) + '</div>';
                        html += '<div class="npc-info">';
                        html += '<h4>' + NR.escapeHtml(name) + '</h4>';
                        html += '<p>' + NR.escapeHtml(data.occupation || data.gender || '-') + '</p>';
                        html += '<span class="scene-badge ' + inSceneClass + '">' + NR.escapeHtml(inScene) + '</span>';
                        html += '</div>';
                        html += '</div>';
                    });
                    html += '</div>';
                }
                html += '</div>';
                return html;
            }
        }
        
        if (npcs.length === 0) {
            html += '<div class="tab-empty"><p>暂无人物数据</p><p class="hint">使用"开始填表"功能让AI提取</p></div>';
            html += '</div>';
            return html;
        }

        html += '<div class="npc-grid">';
        npcs.forEach(function(profile) {
            var color = NR.getCharacterColor(profile.name, false);
            var data = profile.data || {};
            var inScene = data['在场状态'] || '未知';
            var inSceneClass = inScene === '在场' ? 'in-scene' : (inScene === '离场' ? 'off-scene' : '');
            
            // 合并模式下检查是否被选中
            var selectedList = NR.state.selectedNPCsForMerge || [];
            var isSelected = mergeMode && selectedList.indexOf(profile.name) !== -1;
            var selectedClass = isSelected ? ' merge-selected' : '';
            
            // 星星状态：重要人物=绿色实心，普通=空心
            var starClass = profile.isImportant ? 'important' : 'normal';
            var starTitle = profile.isImportant ? '重要人物 (点击切换)' : '普通人物 (点击切换为重要/主角)';
            
            html += '<div class="npc-card ' + inSceneClass + selectedClass + '" data-name="' + NR.escapeHtml(profile.name) + '">';
            
            // 合并模式下显示选择指示器
            if (mergeMode) {
                html += '<div class="npc-select-indicator">' + (isSelected ? '✓' : '') + '</div>';
            }
            
            // 星星状态切换按钮
            html += '<div class="npc-star ' + starClass + '" data-name="' + NR.escapeHtml(profile.name) + '" title="' + starTitle + '">★</div>';
            
            // 检查是否有封面图片
            var hasCover = !!profile.cover;
            if (hasCover) {
                html += '<div class="npc-avatar" style="background-image: url(' + profile.cover + '); background-size: cover; background-position: center;"></div>';
            } else {
                html += '<div class="npc-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
            }
            
            html += '<div class="npc-info">';
            html += '<h4>' + NR.escapeHtml(profile.name) + '</h4>';
            
            // 显示别名
            if (profile.aliases && profile.aliases.length > 0) {
                html += '<p class="npc-aliases">别名: ' + NR.escapeHtml(profile.aliases.join(', ')) + '</p>';
            }
            
            html += '<p>' + NR.escapeHtml(data['身份'] || data['性别'] || '-') + '</p>';
            html += '<span class="scene-badge ' + inSceneClass + '">' + NR.escapeHtml(inScene) + '</span>';
            html += '</div>';
            html += '<div class="npc-actions">';
            html += '<button class="btn-view-card" data-name="' + NR.escapeHtml(profile.name) + '">查看</button>';
            html += '<button class="btn-delete-npc" data-name="' + NR.escapeHtml(profile.name) + '">×</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';
        return html;
    };
    
    // 切换人物重要性状态（用于AI数据库标签页）
    // 循环：普通 → 重要 → 主角(如果没有主角) → 普通
    NR.toggleNPCImportance = function(characterName) {
        var profile = NR.state.currentBookData.characterProfiles.find(function(p) { return p.name === characterName; });
        if (!profile) return;
        
        // 检查是否已有主角（排除当前人物）
        var hasOtherProtagonist = NR.state.currentBookData.characterProfiles.some(function(p) { 
            return p.isProtagonist && p.name !== characterName; 
        });
        
        var targetTab = 'npcs'; // 默认跳转到重要人物标签页
        
        if (profile.isProtagonist) {
            // 主角 → 普通
            profile.isProtagonist = false;
            profile.isImportant = false;
            targetTab = 'npcs';
        } else if (profile.isImportant) {
            // 重要 → 主角（仅当没有其他主角时）或 → 普通（已有主角时）
            if (hasOtherProtagonist) {
                // 已有其他主角，跳过主角状态，直接变普通
                profile.isImportant = false;
                targetTab = 'npcs';
            } else {
                // 没有主角，可以设为主角
                profile.isProtagonist = true;
                profile.isImportant = false;
                targetTab = 'protagonist';
            }
        } else {
            // 普通 → 重要
            profile.isImportant = true;
            targetTab = 'npcs';
        }
        
        NR.saveBookData();
        
        // 切换到对应标签页
        NR.state.currentDataBrowserTab = targetTab;
        NR.renderEmbeddedDataBrowserTab(targetTab);
        
        // 更新标签页激活状态
        var tabsContainer = document.getElementById('ai-database-tabs');
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.data-tab').forEach(function(t) { t.classList.remove('active'); });
            var targetTabBtn = tabsContainer.querySelector('[data-tab="' + targetTab + '"]');
            if (targetTabBtn) targetTabBtn.classList.add('active');
        }
    };
    
    // NPC合并模式相关函数
    NR.toggleNPCMergeMode = function() {
        NR.state.npcMergeMode = !NR.state.npcMergeMode;
        NR.state.selectedNPCsForMerge = [];
        NR.renderEmbeddedDataBrowserTab('npcs');
    };
    
    NR.toggleNPCSelection = function(characterName) {
        if (!NR.state.selectedNPCsForMerge) {
            NR.state.selectedNPCsForMerge = [];
        }
        var idx = NR.state.selectedNPCsForMerge.indexOf(characterName);
        if (idx === -1) {
            NR.state.selectedNPCsForMerge.push(characterName);
        } else {
            NR.state.selectedNPCsForMerge.splice(idx, 1);
        }
        NR.renderEmbeddedDataBrowserTab('npcs');
    };
    
    NR.confirmNPCMerge = function() {
        var names = NR.state.selectedNPCsForMerge || [];
        if (names.length < 2) {
            alert('请至少选择2个人物进行合并');
            return;
        }
        
        if (!confirm('确定要将以下人物合并为一个吗？\n\n' + names.join('\n') + '\n\n合并后将由AI智能整合信息，原人物卡片将被删除。')) {
            return;
        }
        
        NR.mergeCharacterProfiles(names).then(function(newProfile) {
            alert('合并成功！\n\n主要名称: ' + newProfile.name + '\n别名: ' + (newProfile.aliases.length > 0 ? newProfile.aliases.join(', ') : '无'));
            NR.state.npcMergeMode = false;
            NR.state.selectedNPCsForMerge = [];
            NR.renderEmbeddedDataBrowserTab('npcs');
        }).catch(function(err) {
            console.error('合并失败:', err);
            alert('合并失败: ' + (err.message || err));
        });
    };

    // 渲染通用列表标签页（支持版本切换）
    NR.renderListTab = function(type, dataArray, fields, typeName) {
        var historyKey = type + 'sHistory';
        var history = NR.state.currentBookData[historyKey] || [];
        
        var html = '<div class="list-tab-container">';
        
        // 版本切换器（有历史记录时显示）
        if (history.length > 0) {
            html += NR.renderVersionSwitcher(history, null, type + 's');
        }
        
        // 检查是否在查看历史版本
        var viewingIdx = NR.state['viewing' + type + 'sVersion'];
        var displayData = dataArray;
        var isViewingHistory = false;
        
        if (history.length > 0 && viewingIdx !== undefined && viewingIdx < history.length - 1) {
            var historyData = history[viewingIdx];
            if (historyData && historyData.data) {
                displayData = historyData.data;
                isViewingHistory = true;
                html += '<div class="history-version-notice" style="padding: 10px; background: rgba(255,193,7,0.2); border-radius: 8px; margin-bottom: 10px;">';
                html += '<strong>📜 查看历史版本:</strong> ' + NR.escapeHtml(historyData.lastUpdated || '未知');
                html += '</div>';
            }
        }
        
        if (!displayData || displayData.length === 0) {
            html += '<div class="tab-empty"><p>暂无' + typeName + '数据</p><p class="hint">使用"开始填表"功能让AI提取</p></div>';
            html += '</div>';
            return html;
        }

        html += '<div class="data-list">';
        displayData.forEach(function(record, index) {
            var data = record.data || {};
            var name = data.name || data[fields[0].key] || '未命名';
            var subInfo = '';
            if (fields.length > 1) {
                var secondField = fields[1];
                subInfo = data[secondField.key] || '';
            }
            
            html += '<div class="data-list-item" data-type="' + type + '" data-index="' + index + '">';
            html += '<div class="item-main">';
            html += '<span class="item-name">' + NR.escapeHtml(name) + '</span>';
            if (subInfo) html += '<span class="item-sub">' + NR.escapeHtml(subInfo) + '</span>';
            html += '</div>';
            // 历史版本不显示删除按钮
            html += '<div class="item-actions">';
            html += '<button class="btn-view-item" data-type="' + type + '" data-index="' + index + '">查看</button>';
            if (!isViewingHistory) {
                html += '<button class="btn-delete-item" data-type="' + type + '" data-index="' + index + '">×</button>';
            }
            html += '</div>';
            html += '</div>';
        });
        html += '</div></div>';
        return html;
    };

    // 渲染人物关系图标签页
    NR.renderRelationshipsTab = function() {
        return '<div class="relationships-tab-container" id="relationships-container"></div>';
    };

    // 在指定容器中渲染人物关系图（完整版，嵌入到容器中）
    NR.renderRelationshipGraphInContainer = function(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        NR.initCharacterFormData();
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        
        if (characterProfiles.length === 0) {
            container.innerHTML = '<div class="tab-empty"><p>暂无人物数据</p><p class="hint">请先添加人物卡片</p></div>';
            return;
        }

        // 收集所有人物数据
        var nodes = [];
        var edges = [];
        var nodeMap = new Map();
        
        // 遍历所有人物卡片
        characterProfiles.forEach(function(profile) {
            if (!profile || !profile.name || profile.name === '-') return;
            
            var charName = profile.name;
            var data = profile.data || {};
            var inSceneValue = data['在场状态'] || data['健康'] || '未知';
            var isInScene = inSceneValue === '在场' || (inSceneValue !== '离场' && inSceneValue !== '未知');
            
            if (!nodeMap.has(charName)) {
                nodes.push({
                    name: charName,
                    isPlayer: profile.isProtagonist || false,
                    isInScene: isInScene,
                    x: 0, y: 0,
                    radius: profile.isProtagonist ? 40 : 32
                });
                nodeMap.set(charName, nodes[nodes.length - 1]);
            }
            
            // 解析人际关系
            var relationshipsStr = data['人际关系'] || '';
            var relations = NR.parseKeyValue(relationshipsStr);
            
            relations.forEach(function(rel) {
                if (!rel.name || rel.name === '-') return;
                
                var existingEdge = edges.find(function(e) {
                    return (e.source === charName && e.target === rel.name) ||
                           (e.source === rel.name && e.target === charName);
                });
                
                if (existingEdge) {
                    if (existingEdge.source === charName) {
                        if (existingEdge.labelsFromSource.indexOf(rel.value) === -1) {
                            existingEdge.labelsFromSource.push(rel.value);
                        }
                    } else {
                        if (existingEdge.labelsFromTarget.indexOf(rel.value) === -1) {
                            existingEdge.labelsFromTarget.push(rel.value);
                        }
                    }
                } else {
                    edges.push({
                        source: charName,
                        target: rel.name,
                        labelsFromSource: [rel.value],
                        labelsFromTarget: []
                    });
                }
                
                // 确保目标节点存在
                if (!nodeMap.has(rel.name)) {
                    var targetProfile = characterProfiles.find(function(p) {
                        return p.name === rel.name || (p.aliases && p.aliases.indexOf(rel.name) !== -1);
                    });
                    
                    if (targetProfile) {
                        var targetData = targetProfile.data || {};
                        var targetInScene = targetData['在场状态'] || '未知';
                        var targetIsInScene = targetInScene === '在场';
                        
                        nodes.push({
                            name: targetProfile.name,
                            isPlayer: targetProfile.isProtagonist || false,
                            isInScene: targetIsInScene,
                            x: 0, y: 0,
                            radius: targetProfile.isProtagonist ? 40 : 32
                        });
                        nodeMap.set(targetProfile.name, nodes[nodes.length - 1]);
                    } else {
                        nodes.push({
                            name: rel.name,
                            isPlayer: false,
                            isInScene: false,
                            x: 0, y: 0,
                            radius: 28,
                            isExternal: true
                        });
                        nodeMap.set(rel.name, nodes[nodes.length - 1]);
                    }
                }
            });
        });

        if (nodes.length === 0) {
            container.innerHTML = '<div class="tab-empty"><p>暂无人物数据</p></div>';
            return;
        }

        // 计算布局
        var width = 700;
        var height = 400;
        var centerX = width / 2;
        var centerY = height / 2;
        
        // 初始化位置 - 更大的初始半径
        nodes.forEach(function(node, index) {
            if (node.isPlayer) {
                node.x = centerX;
                node.y = centerY;
            } else {
                var angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
                var radius = 150 + Math.random() * 50;
                node.x = centerX + Math.cos(angle) * radius;
                node.y = centerY + Math.sin(angle) * radius;
            }
            node.vx = 0;
            node.vy = 0;
        });
        
        // 力导向迭代
        for (var iter = 0; iter < 200; iter++) {
            // 斥力 - 增大斥力常数
            for (var i = 0; i < nodes.length; i++) {
                for (var j = i + 1; j < nodes.length; j++) {
                    var dx = nodes[j].x - nodes[i].x;
                    var dy = nodes[j].y - nodes[i].y;
                    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    var force = 15000 / (dist * dist);  // 增大斥力
                    var fx = (dx / dist) * force;
                    var fy = (dy / dist) * force;
                    nodes[i].vx -= fx;
                    nodes[i].vy -= fy;
                    nodes[j].vx += fx;
                    nodes[j].vy += fy;
                }
            }
            
            // 引力（边）- 增大理想距离
            edges.forEach(function(edge) {
                var source = nodeMap.get(edge.source);
                var target = nodeMap.get(edge.target);
                if (!source || !target) return;
                var dx = target.x - source.x;
                var dy = target.y - source.y;
                var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                var idealDist = 150;  // 增大理想距离
                var force = (dist - idealDist) * 0.02;
                var fx = (dx / dist) * force;
                var fy = (dy / dist) * force;
                source.vx += fx;
                source.vy += fy;
                target.vx -= fx;
                target.vy -= fy;
            });
            
            // 向心力 - 减小向心力
            nodes.forEach(function(node) {
                if (!node.isPlayer) {
                    var dx = centerX - node.x;
                    var dy = centerY - node.y;
                    node.vx += dx * 0.002;  // 减小向心力
                    node.vy += dy * 0.002;
                }
            });
            
            // 应用速度
            nodes.forEach(function(node) {
                if (node.isPlayer) {
                    node.x = centerX;
                    node.y = centerY;
                } else {
                    node.vx *= 0.85;
                    node.vy *= 0.85;
                    node.x += node.vx;
                    node.y += node.vy;
                    node.x = Math.max(60, Math.min(width - 60, node.x));
                    node.y = Math.max(60, Math.min(height - 60, node.y));
                }
            });
        }

        // 构建SVG
        var edgesHtml = '';
        edges.forEach(function(edge) {
            var source = nodeMap.get(edge.source);
            var target = nodeMap.get(edge.target);
            if (!source || !target) return;
            
            var dx = target.x - source.x;
            var dy = target.y - source.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            var ux = dx / dist;
            var uy = dy / dist;
            
            var startX = source.x + ux * source.radius;
            var startY = source.y + uy * source.radius;
            var endX = target.x - ux * target.radius;
            var endY = target.y - uy * target.radius;
            
            var hasFromSource = edge.labelsFromSource && edge.labelsFromSource.length > 0;
            var hasFromTarget = edge.labelsFromTarget && edge.labelsFromTarget.length > 0;
            var markerEnd = hasFromSource ? 'url(#arrow-end)' : '';
            var markerStart = hasFromTarget ? 'url(#arrow-start)' : '';
            
            edgesHtml += '<line class="graph-edge" x1="' + startX + '" y1="' + startY + '" x2="' + endX + '" y2="' + endY + '"' +
                (markerEnd ? ' marker-end="' + markerEnd + '"' : '') +
                (markerStart ? ' marker-start="' + markerStart + '"' : '') + ' />';
            
            // 关系标签
            var midX = (startX + endX) / 2;
            var midY = (startY + endY) / 2;
            var perpX = -uy;
            var perpY = ux;
            
            var allLabels = (edge.labelsFromSource || []).concat(edge.labelsFromTarget || []).filter(function(l) { return l; });
            var uniqueLabels = [];
            allLabels.forEach(function(l) { if (uniqueLabels.indexOf(l) === -1) uniqueLabels.push(l); });
            
            uniqueLabels.slice(0, 2).forEach(function(label, i) {
                var offset = (i === 0 ? 1 : -1) * 12;
                var lx = midX + perpX * offset;
                var ly = midY + perpY * offset;
                edgesHtml += '<text class="graph-edge-label" x="' + lx + '" y="' + ly + '">' + NR.escapeHtml(label) + '</text>';
            });
        });
        
        var nodesHtml = '';
        nodes.forEach(function(node) {
            var firstChar = node.name.charAt(0);
            var color = node.isExternal ? { bg: '#9E9E9E', text: '#fff' } : NR.getCharacterColor(node.name, node.isPlayer);
            var inSceneIndicator = (node.isInScene && !node.isPlayer) ? 
                '<circle class="node-inscene-indicator" cx="' + (node.radius * 0.6) + '" cy="' + (-node.radius * 0.6) + '" r="5" />' : '';
            
            nodesHtml += '<g class="graph-node' + (node.isPlayer ? ' is-player' : '') + '" data-name="' + NR.escapeHtml(node.name) + '" transform="translate(' + node.x + ', ' + node.y + ')" style="cursor:pointer;">' +
                '<circle class="node-circle" r="' + node.radius + '" fill="' + color.bg + '" stroke="' + (node.isPlayer ? '#B8860B' : '#fff') + '" stroke-width="' + (node.isPlayer ? '3' : '2') + '" />' +
                inSceneIndicator +
                '<text class="node-char" y="5" text-anchor="middle" fill="' + color.text + '" font-size="' + (node.isPlayer ? '20' : '16') + '" font-weight="bold">' + NR.escapeHtml(firstChar) + '</text>' +
                '<text class="node-label" y="' + (node.radius + 14) + '" text-anchor="middle" fill="#666" font-size="11">' + NR.escapeHtml(node.name) + '</text>' +
                '</g>';
        });

        container.innerHTML = 
            '<div class="embedded-graph-container" id="embedded-graph-wrapper">' +
                '<div class="embedded-graph-controls">' +
                    '<button class="graph-ctrl-btn" id="graph-zoom-in" title="放大">+</button>' +
                    '<button class="graph-ctrl-btn" id="graph-zoom-out" title="缩小">−</button>' +
                    '<button class="graph-ctrl-btn" id="graph-reset-view" title="重置">↺</button>' +
                '</div>' +
                '<svg class="embedded-graph-svg" id="embedded-graph-svg" viewBox="0 0 ' + width + ' ' + height + '">' +
                    '<defs>' +
                        '<marker id="arrow-end" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">' +
                            '<polygon points="0 0, 8 3, 0 6" fill="#a89880" />' +
                        '</marker>' +
                        '<marker id="arrow-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto">' +
                            '<polygon points="8 0, 0 3, 8 6" fill="#a89880" />' +
                        '</marker>' +
                    '</defs>' +
                    '<g class="graph-transform" id="graph-transform-group">' +
                        '<g class="graph-edges">' + edgesHtml + '</g>' +
                        '<g class="graph-nodes">' + nodesHtml + '</g>' +
                    '</g>' +
                '</svg>' +
            '</div>';

        // 缩放和拖拽功能
        var svg = document.getElementById('embedded-graph-svg');
        var transformGroup = document.getElementById('graph-transform-group');
        var graphWrapper = document.getElementById('embedded-graph-wrapper');
        
        var viewScale = 1;
        var panX = 0;
        var panY = 0;
        var isPanning = false;
        var startX = 0;
        var startY = 0;
        
        var updateTransform = function() {
            transformGroup.setAttribute('transform', 'translate(' + panX + ', ' + panY + ') scale(' + viewScale + ')');
        };
        
        // 鼠标滚轮缩放
        graphWrapper.addEventListener('wheel', function(e) {
            e.preventDefault();
            var delta = e.deltaY > 0 ? -0.1 : 0.1;
            var newScale = Math.max(0.3, Math.min(3, viewScale + delta));
            
            // 以鼠标位置为中心缩放
            var rect = svg.getBoundingClientRect();
            var mouseX = e.clientX - rect.left;
            var mouseY = e.clientY - rect.top;
            var svgX = (mouseX / rect.width) * width;
            var svgY = (mouseY / rect.height) * height;
            
            var scaleFactor = newScale / viewScale;
            panX = svgX - (svgX - panX) * scaleFactor;
            panY = svgY - (svgY - panY) * scaleFactor;
            
            viewScale = newScale;
            updateTransform();
        });
        
        // 拖拽移动
        graphWrapper.addEventListener('mousedown', function(e) {
            if (e.target.closest('.graph-node')) return; // 不拦截节点点击
            isPanning = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
            graphWrapper.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isPanning) return;
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateTransform();
        });
        
        document.addEventListener('mouseup', function() {
            isPanning = false;
            if (graphWrapper) graphWrapper.style.cursor = 'grab';
        });
        
        // 触摸支持
        var lastTouchDist = 0;
        graphWrapper.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                isPanning = true;
                startX = e.touches[0].clientX - panX;
                startY = e.touches[0].clientY - panY;
            } else if (e.touches.length === 2) {
                lastTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        });
        
        graphWrapper.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (e.touches.length === 1 && isPanning) {
                panX = e.touches[0].clientX - startX;
                panY = e.touches[0].clientY - startY;
                updateTransform();
            } else if (e.touches.length === 2) {
                var dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                var delta = (dist - lastTouchDist) * 0.01;
                viewScale = Math.max(0.3, Math.min(3, viewScale + delta));
                lastTouchDist = dist;
                updateTransform();
            }
        });
        
        graphWrapper.addEventListener('touchend', function() {
            isPanning = false;
        });
        
        // 控制按钮
        document.getElementById('graph-zoom-in').addEventListener('click', function() {
            viewScale = Math.min(3, viewScale + 0.2);
            updateTransform();
        });
        
        document.getElementById('graph-zoom-out').addEventListener('click', function() {
            viewScale = Math.max(0.3, viewScale - 0.2);
            updateTransform();
        });
        
        document.getElementById('graph-reset-view').addEventListener('click', function() {
            viewScale = 1;
            panX = 0;
            panY = 0;
            updateTransform();
        });

        // 绑定节点点击事件
        container.querySelectorAll('.graph-node').forEach(function(nodeEl) {
            nodeEl.addEventListener('click', function(e) {
                e.stopPropagation();
                var name = this.dataset.name;
                NR.showCharacterDetail(name);
            });
        });
    };

    // 绑定数据浏览器内的事件
    NR.bindDataBrowserEvents = function(tabId) {
        var body = document.getElementById('data-browser-body');
        if (!body) return;

        // 查看人物卡片
        body.querySelectorAll('.btn-view-card').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var name = this.dataset.name;
                NR.showCharacterDetail(name);
            });
        });

        // 删除NPC
        body.querySelectorAll('.btn-delete-npc').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var name = this.dataset.name;
                if (confirm('确定要删除"' + name + '"吗？')) {
                    var profiles = NR.state.currentBookData.characterProfiles || [];
                    var idx = profiles.findIndex(function(p) { return p.name === name; });
                    if (idx > -1) profiles.splice(idx, 1);
                    NR.saveBookData();
                    NR.renderDataBrowserTab('npcs');
                }
            });
        });

        // 查看列表项详情
        body.querySelectorAll('.btn-view-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                var index = parseInt(this.dataset.index);
                NR.showDataItemDetail(type, index);
            });
        });

        // 删除列表项
        body.querySelectorAll('.btn-delete-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                var index = parseInt(this.dataset.index);
                NR.deleteDataItem(type, index);
            });
        });

        body.querySelectorAll('.timeline-event-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var moduleIndex = parseInt(this.dataset.timelineIndex, 10);
                var eventIndex = parseInt(this.dataset.eventIndex, 10);
                NR.showTimelineEventDetailByIndex(moduleIndex, eventIndex);
            });
        });

        // 编辑全局数据
        body.querySelectorAll('.btn-edit-data').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                if (type === 'global') {
                    NR.showGlobalDataEditModal();
                }
            });
        });

        // 人物关系图
        if (tabId === 'relationships') {
            setTimeout(function() {
                NR.renderRelationshipGraphInContainer('relationships-container');
            }, 100);
        }
        
        // 小手机聊天
        if (tabId === 'phone') {
            NR.bindPhoneChatEvents();
        }
    };

    // 显示数据项详情
    NR.showDataItemDetail = function(type, index) {
        var dataArrayMap = {
            'skill': NR.state.currentBookData.skills,
            'item': NR.state.currentBookData.items,
            'quest': NR.state.currentBookData.quests,
            'location': NR.state.currentBookData.locations,
            'equipment': NR.state.currentBookData.equipments,
            'faction': NR.state.currentBookData.factions,
            'intel': NR.state.currentBookData.intels
        };
        var fieldsMap = {
            'skill': NR.SKILL_FIELDS,
            'item': NR.ITEM_FIELDS,
            'quest': NR.QUEST_FIELDS,
            'location': NR.LOCATION_FIELDS,
            'equipment': NR.EQUIPMENT_FIELDS,
            'faction': NR.FACTION_FIELDS,
            'intel': NR.INTEL_FIELDS
        };
        var titleMap = {
            'skill': '⚔️ 技能详情',
            'item': '🎒 物品详情',
            'quest': '📜 任务详情',
            'location': '📍 地点详情',
            'equipment': '🛡️ 装备详情',
            'faction': '🏰 势力详情',
            'intel': '🔍 情报详情'
        };

        var dataArray = dataArrayMap[type] || [];
        var fields = fieldsMap[type] || [];
        var record = dataArray[index];
        if (!record) return;

        var data = record.data || {};
        var detailHtml = NR.buildDetailView(fields, data);

        var existingModal = document.getElementById('data-item-detail-modal');
        if (existingModal) existingModal.remove();

        var modalHtml = 
            '<div id="data-item-detail-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 500px;">' +
                    '<div class="modal-header">' +
                        '<h2>' + (titleMap[type] || '详情') + '</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="data-item-detail-body">' + detailHtml + '</div>' +
                    '<div class="modal-footer">' +
                        '<button class="control-button btn-back-list">返回</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('data-item-detail-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.querySelector('.btn-back-list').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
    };

    // 删除数据项
    NR.deleteDataItem = function(type, index) {
        var dataArrayMap = {
            'skill': 'skills',
            'item': 'items',
            'quest': 'quests',
            'location': 'locations',
            'equipment': 'equipments',
            'faction': 'factions',
            'intel': 'intels'
        };
        var tabMap = {
            'skill': 'skills',
            'item': 'items',
            'quest': 'quests',
            'location': 'locations',
            'equipment': 'equipments',
            'faction': 'factions',
            'intel': 'intels'
        };

        var key = dataArrayMap[type];
        if (!key) return;

        var dataArray = NR.state.currentBookData[key] || [];
        var record = dataArray[index];
        if (!record) return;

        var name = record.data ? record.data.name : '此项';
        if (!confirm('确定要删除"' + name + '"吗？')) return;

        dataArray.splice(index, 1);
        NR.saveBookData();
        NR.renderDataBrowserTab(tabMap[type]);
    };

    // 清空所有AI数据库数据
    NR.clearAllCharacterFormData = function() {
        var bookData = NR.state.currentBookData || {};
        var emptyData = NR.createEmptyBookData ? NR.createEmptyBookData() : {};
        var counts = [];
        var hasAnyData = false;

        Object.keys(emptyData).forEach(function(key) {
            var value = bookData[key];
            var count = 0;
            if (Array.isArray(value)) {
                count = value.length;
            } else if (value && typeof value === 'object') {
                count = Object.keys(value).length;
            } else if (value !== null && value !== undefined && value !== '') {
                count = 1;
            }
            if (count > 0) {
                counts.push(key + ': ' + count + (Array.isArray(value) ? '条' : '项'));
                hasAnyData = true;
            }
        });
        
        if (!hasAnyData) {
            alert('当前没有任何AI数据库数据。');
            return;
        }
        
        var confirmMsg = '确定要清空当前书籍的所有AI数据库数据吗？\n\n当前数据：\n' + counts.join('\n') + '\n\n这会清除总结、续写、翻译、人物/物品/任务、剧情时间线、小手机、日记、动态、地图、日历、邮件、通话、直播等所有模块数据。此操作无法撤销！';
        
        if (!confirm(confirmMsg)) return;

        var cleanup = NR.storageDB && NR.storageDB.deleteBookResources && NR.state.currentFileName
            ? NR.storageDB.deleteBookResources(NR.state.currentFileName, bookData)
            : Promise.resolve();

        cleanup.catch(function(err) {
            console.warn('清理AI数据库资源失败，将继续清空数据:', err);
        }).then(function() {
            NR.state.currentBookData = NR.createEmptyBookData ? NR.createEmptyBookData() : {};
            NR.state.pendingFillFormSummary = null;
            NR.state.pendingFillFormTimeline = null;
            Object.keys(NR.state).forEach(function(key) {
                if (key.indexOf('viewing') === 0 && key.indexOf('Version') > -1) {
                    NR.state[key] = undefined;
                }
            });

            NR.saveBookData();
            if (NR.state.currentDataBrowserTab) {
                NR.renderEmbeddedDataBrowserTab(NR.state.currentDataBrowserTab);
            }
            alert('已清空当前书籍的所有AI数据库数据！');
        });
    };

    // 解析键值对字符串为数组
    NR.parseKeyValue = function(str) {
        var result = [];
        if (!str || str === '-') return result;
        var pairs = str.split(';');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split(':');
            if (pair.length === 2 && pair[0].trim() && pair[1].trim()) {
                result.push({ name: pair[0].trim(), value: pair[1].trim() });
            }
        }
        return result;
    };

    // 将数组转换为键值对字符串
    NR.stringifyKeyValue = function(arr) {
        if (!arr || arr.length === 0) return '';
        return arr.map(function(item) {
            return item.name + ':' + item.value;
        }).join(';');
    };

    // 显示人物填表选择弹窗
    NR.showCharacterFormChoice = function(text, rangeDesc) {
        NR.initCharacterFormData();
        NR.state.tempFormText = text;
        NR.state.tempFormRange = rangeDesc;
        
        var modal = NR.els['character-form-choice-modal'];
        if (modal) {
            modal.style.display = 'flex';
        }
    };

    // 生成主角信息表单
    NR.generateProtagonistForm = function() {
        var text = NR.state.tempFormText;
        var rangeDesc = NR.state.tempFormRange;
        
        if (!text || !text.trim()) {
            alert('选定范围内无内容可供分析。');
            return;
        }

        NR.els['character-form-choice-modal'].style.display = 'none';
        NR.els['app-loader'].classList.remove('hidden');
        NR.els['app-loader'].querySelector('span').textContent = '正在分析主角信息...';

        var prompt = NR.buildProtagonistPrompt(text);

        return NR.callAIForForm(prompt).then(function(data) {
            NR.showProtagonistFormModal(data, rangeDesc);
        }).catch(function(err) {
            console.error('生成主角信息失败:', err);
            alert('生成主角信息时出错: ' + err.message);
        }).finally(function() {
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
        });
    };

    // 生成重要人物表单
    NR.generateNPCForm = function() {
        var text = NR.state.tempFormText;
        var rangeDesc = NR.state.tempFormRange;
        
        if (!text || !text.trim()) {
            alert('选定范围内无内容可供分析。');
            return;
        }

        NR.els['character-form-choice-modal'].style.display = 'none';
        NR.els['app-loader'].classList.remove('hidden');
        NR.els['app-loader'].querySelector('span').textContent = '正在分析重要人物...';

        var prompt = NR.buildNPCPrompt(text);

        return NR.callAIForForm(prompt).then(function(data) {
            NR.showNPCFormModal(data, rangeDesc);
        }).catch(function(err) {
            console.error('生成重要人物信息失败:', err);
            alert('生成重要人物信息时出错: ' + err.message);
        }).finally(function() {
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
        });
    };

    // 一键生成所有人物表单（主角+重要人物）
    NR.generateAllCharacterForms = function(text, rangeDesc) {
        console.log('[AI数据库] 开始生成，文本长度:', text ? text.length : 0);
        
        if (!text || !text.trim()) {
            alert('选定范围内无内容可供分析。');
            return;
        }

        NR.els['character-form-choice-modal'].style.display = 'none';
        NR.els['app-loader'].classList.remove('hidden');
        NR.els['app-loader'].querySelector('span').textContent = '正在分析数据...';

        console.log('[AI数据库] 构建提示词...');
        var prompt = NR.buildAllDataPrompt(text);
        console.log('[AI数据库] 提示词长度:', prompt.length);

        // 同时生成总结和剧情时间线
        var summaryPromise = NR.generateSummaryForFillForm(text, rangeDesc);
        var timelinePromise = NR.generateTimelineForFillForm(text, rangeDesc);

        console.log('[AI数据库] 调用AI接口...');
        return Promise.all([NR.callAIForForm(prompt), summaryPromise, timelinePromise]).then(function(results) {
            var data = results[0];
            var summaryText = results[1];
            var timelineModules = results[2] || [];
            console.log('[AI数据库] AI返回数据:', data);
            console.log('[AI数据库] 总结生成完成:', summaryText ? '成功' : '失败');
            console.log('[AI数据库] 时间线生成完成:', timelineModules.length ? ('成功 ' + timelineModules.length + ' 个模块') : '无数据');
            NR.showAllDataFormModal(data, rangeDesc, summaryText, timelineModules);
        }).catch(function(err) {
            console.error('[AI数据库] 生成数据失败:', err);
            alert('生成数据时出错: ' + err.message);
        }).finally(function() {
            console.log('[AI数据库] 生成完成');
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
        });
    };

    // 为填表功能生成总结（静默生成，不显示弹窗）
    NR.generateSummaryForFillForm = function(text, rangeDesc) {
        if (!text || !text.trim()) {
            return Promise.resolve(null);
        }

        var len = NR.state.aiSettings.summaryLength || 150;
        var summaryInstruction = (NR.state.aiSettings.summaryPrompt || NR.DEFAULT_AI_PROMPTS.SUMMARY).replace('{len}', len);
        var prompt = summaryInstruction + '\n\n---\n\n' + text;

        // 获取完整的 API URL
        var apiUrl = NR.state.aiSettings.apiUrl || '';
        apiUrl = apiUrl.replace(/\/+$/, '');
        if (!apiUrl.endsWith('/chat/completions')) {
            apiUrl += '/chat/completions';
        }

        return fetch(apiUrl, {
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
                console.warn('[AI数据库] 总结生成失败:', res.status);
                return null;
            }
            return res.json();
        }).then(function(data) {
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content.trim();
            }
            return null;
        }).catch(function(err) {
            console.warn('[AI数据库] 总结生成出错:', err);
            return null;
        });
    };

    // 为填表功能生成剧情时间线（静默生成，失败不影响填表）
    NR.generateTimelineForFillForm = function(text, rangeDesc) {
        if (!text || !text.trim()) {
            return Promise.resolve([]);
        }

        var context = NR.buildTimelineUpdateContext(rangeDesc, '');
        var prompt = NR.buildTimelinePrompt(text, rangeDesc, context);
        return NR.callAIForForm(prompt).then(function(data) {
            return NR.normalizeTimelineModules(data, rangeDesc);
        }).catch(function(err) {
            console.warn('[AI数据库] 剧情时间线生成出错:', err);
            return [];
        });
    };

    // 收集所有历史版本信息（用于续写时选择）
    // 改进：每个版本包含该时间点所有数据类型的最新索引
    NR.collectAllHistoryVersions = function() {
        var versions = [];
        var bookData = NR.state.currentBookData;
        
        // 收集所有唯一的版本标签和时间戳
        var allHistoryTypes = [
            { key: 'globalDataHistory', idxKey: 'globalDataIdx' },
            { key: 'protagonistHistory', idxKey: 'protagonistIdx' },
            { key: 'npcHistory', idxKey: 'npcIdx' },
            { key: 'skillsHistory', idxKey: 'skillsIdx' },
            { key: 'itemsHistory', idxKey: 'itemsIdx' },
            { key: 'questsHistory', idxKey: 'questsIdx' },
            { key: 'locationsHistory', idxKey: 'locationsIdx' },
            { key: 'equipmentsHistory', idxKey: 'equipmentsIdx' },
            { key: 'factionsHistory', idxKey: 'factionsIdx' },
            { key: 'intelsHistory', idxKey: 'intelsIdx' }
        ];
        
        // 第一步：收集所有唯一的版本标签
        var versionLabels = new Set();
        allHistoryTypes.forEach(function(ht) {
            var history = bookData[ht.key] || [];
            history.forEach(function(item, idx) {
                if (idx < history.length - 1) { // 排除当前版本
                    var label = item.lastUpdated || ('版本 ' + (idx + 1));
                    versionLabels.add(label);
                }
            });
        });
        
        // 第二步：为每个版本标签创建完整的版本信息
        versionLabels.forEach(function(label) {
            var version = {
                label: label,
                timestamp: 0,
                globalDataIdx: -1,
                protagonistIdx: -1,
                npcIdx: -1,
                skillsIdx: -1,
                itemsIdx: -1,
                questsIdx: -1,
                locationsIdx: -1,
                equipmentsIdx: -1,
                factionsIdx: -1,
                intelsIdx: -1
            };
            
            // 为每个数据类型查找匹配该标签的索引
            allHistoryTypes.forEach(function(ht) {
                var history = bookData[ht.key] || [];
                for (var i = 0; i < history.length - 1; i++) { // 排除当前版本
                    var itemLabel = history[i].lastUpdated || ('版本 ' + (i + 1));
                    if (itemLabel === label) {
                        version[ht.idxKey] = i;
                        if (history[i].timestamp > version.timestamp) {
                            version.timestamp = history[i].timestamp;
                        }
                        break;
                    }
                }
            });
            
            versions.push(version);
        });
        
        // 按时间戳排序
        versions.sort(function(a, b) { return a.timestamp - b.timestamp; });
        
        return versions;
    };

    // 构建续写用的AI填表上下文（包含所有已有数据和总结）
    // versionInfo: 可选，指定使用哪个历史版本的数据
    // 当选择历史版本时，只使用该版本存在的数据，不回退到当前版本
    NR.buildAIFormContextForSequel = function(versionInfo) {
        var contextParts = [];
        var bookData = NR.state.currentBookData;
        
        // 获取数据源（当前版本或历史版本）
        var globalData, protagonistData, npcs, skills, items, quests, locations, equipments, factions, intels;
        
        if (versionInfo) {
            // 使用历史版本数据 - 只使用该版本存在的数据
            var gh = bookData.globalDataHistory || [];
            var ph = bookData.protagonistHistory || [];
            var nh = bookData.npcHistory || [];
            var skh = bookData.skillsHistory || [];
            var ith = bookData.itemsHistory || [];
            var qh = bookData.questsHistory || [];
            var lh = bookData.locationsHistory || [];
            var eh = bookData.equipmentsHistory || [];
            var fh = bookData.factionsHistory || [];
            var inh = bookData.intelsHistory || [];
            
            // 只使用历史版本中存在的数据，不回退到当前版本
            globalData = versionInfo.globalDataIdx >= 0 && gh[versionInfo.globalDataIdx] ? gh[versionInfo.globalDataIdx] : null;
            protagonistData = versionInfo.protagonistIdx >= 0 && ph[versionInfo.protagonistIdx] ? ph[versionInfo.protagonistIdx] : null;
            npcs = versionInfo.npcIdx >= 0 && nh[versionInfo.npcIdx] ? nh[versionInfo.npcIdx].data : [];
            skills = versionInfo.skillsIdx >= 0 && skh[versionInfo.skillsIdx] ? skh[versionInfo.skillsIdx].data : [];
            items = versionInfo.itemsIdx >= 0 && ith[versionInfo.itemsIdx] ? ith[versionInfo.itemsIdx].data : [];
            quests = versionInfo.questsIdx >= 0 && qh[versionInfo.questsIdx] ? qh[versionInfo.questsIdx].data : [];
            locations = versionInfo.locationsIdx >= 0 && lh[versionInfo.locationsIdx] ? lh[versionInfo.locationsIdx].data : [];
            equipments = versionInfo.equipmentsIdx >= 0 && eh[versionInfo.equipmentsIdx] ? eh[versionInfo.equipmentsIdx].data : [];
            factions = versionInfo.factionsIdx >= 0 && fh[versionInfo.factionsIdx] ? fh[versionInfo.factionsIdx].data : [];
            intels = versionInfo.intelsIdx >= 0 && inh[versionInfo.intelsIdx] ? inh[versionInfo.intelsIdx].data : [];
        } else {
            // 使用当前版本数据
            globalData = bookData.globalData;
            protagonistData = bookData.protagonistInfo;
            npcs = bookData.importantNPCs || [];
            skills = bookData.skills || [];
            items = bookData.items || [];
            quests = bookData.quests || [];
            locations = bookData.locations || [];
            equipments = bookData.equipments || [];
            factions = bookData.factions || [];
            intels = bookData.intels || [];
        }
        
        // 1. 全局数据
        if (globalData && globalData.data) {
            var globalText = '【全局数据】\n';
            var gd = globalData.data;
            if (gd.currentLocation) globalText += '当前地点: ' + gd.currentLocation + '\n';
            if (gd.currentTime) globalText += '当前时间: ' + gd.currentTime + '\n';
            if (gd.lastSceneTime) globalText += '上轮场景时间: ' + gd.lastSceneTime + '\n';
            if (gd.elapsedTime) globalText += '经过时间: ' + gd.elapsedTime + '\n';
            if (globalText !== '【全局数据】\n') {
                contextParts.push(globalText.trim());
            }
        }
        
        // 2. 主角信息
        if (protagonistData && protagonistData.data) {
            var pd = protagonistData.data;
            var protagText = '【主角信息】\n';
            NR.PROTAGONIST_FIELDS.forEach(function(field) {
                var val = pd[field.key];
                if (val && val !== '-') {
                    protagText += field.label + ': ' + val + '\n';
                }
            });
            if (protagText !== '【主角信息】\n') {
                contextParts.push(protagText.trim());
            }
        }
        
        // 3. 重要人物
        npcs = npcs || [];
        if (npcs.length > 0) {
            var npcsText = '【重要人物】\n';
            npcs.forEach(function(npc, idx) {
                if (npc.data) {
                    npcsText += '\n人物' + (idx + 1) + ':\n';
                    NR.NPC_FIELDS.forEach(function(field) {
                        var val = npc.data[field.key];
                        if (val && val !== '-') {
                            npcsText += '  ' + field.label + ': ' + val + '\n';
                        }
                    });
                }
            });
            if (npcsText !== '【重要人物】\n') {
                contextParts.push(npcsText.trim());
            }
        }
        
        // 4. 技能
        skills = skills || [];
        if (skills.length > 0) {
            var skillsText = '【技能列表】\n';
            skills.forEach(function(s) {
                if (s.data && s.data.name) {
                    skillsText += '- ' + s.data.name;
                    if (s.data.type) skillsText += ' (' + s.data.type + ')';
                    if (s.data.level) skillsText += ' Lv.' + s.data.level;
                    if (s.data.description) skillsText += ': ' + s.data.description;
                    skillsText += '\n';
                }
            });
            contextParts.push(skillsText.trim());
        }
        
        // 5. 背包物品
        items = items || [];
        if (items.length > 0) {
            var itemsText = '【背包物品】\n';
            items.forEach(function(i) {
                if (i.data && i.data.name) {
                    itemsText += '- ' + i.data.name;
                    if (i.data.count) itemsText += ' x' + i.data.count;
                    if (i.data.category) itemsText += ' [' + i.data.category + ']';
                    if (i.data.description) itemsText += ': ' + i.data.description;
                    itemsText += '\n';
                }
            });
            contextParts.push(itemsText.trim());
        }
        
        // 6. 任务
        quests = quests || [];
        if (quests.length > 0) {
            var questsText = '【任务事件】\n';
            quests.forEach(function(q) {
                if (q.data && q.data.name) {
                    questsText += '- ' + q.data.name;
                    if (q.data.type) questsText += ' [' + q.data.type + ']';
                    if (q.data.progress) questsText += ' 进度:' + q.data.progress;
                    if (q.data.description) questsText += '\n  ' + q.data.description;
                    questsText += '\n';
                }
            });
            contextParts.push(questsText.trim());
        }
        
        // 7. 地点
        locations = locations || [];
        if (locations.length > 0) {
            var locsText = '【世界地点】\n';
            locations.forEach(function(l) {
                if (l.data && l.data.name) {
                    locsText += '- ' + l.data.name;
                    if (l.data.type) locsText += ' [' + l.data.type + ']';
                    if (l.data.status) locsText += ' (' + l.data.status + ')';
                    if (l.data.description) locsText += ': ' + l.data.description;
                    locsText += '\n';
                }
            });
            contextParts.push(locsText.trim());
        }
        
        // 8. 装备
        equipments = equipments || [];
        if (equipments.length > 0) {
            var equipText = '【装备】\n';
            equipments.forEach(function(e) {
                if (e.data && e.data.name) {
                    equipText += '- ' + e.data.name;
                    if (e.data.type) equipText += ' [' + e.data.type + ']';
                    if (e.data.rarity) equipText += ' ' + e.data.rarity;
                    if (e.data.equipped) equipText += ' (' + e.data.equipped + ')';
                    if (e.data.attributes) equipText += ' ' + e.data.attributes;
                    equipText += '\n';
                }
            });
            contextParts.push(equipText.trim());
        }
        
        // 9. 势力
        factions = factions || [];
        if (factions.length > 0) {
            var factionsText = '【势力组织】\n';
            factions.forEach(function(f) {
                if (f.data && f.data.name) {
                    factionsText += '- ' + f.data.name;
                    if (f.data.type) factionsText += ' [' + f.data.type + ']';
                    if (f.data.attitude) factionsText += ' 态度:' + f.data.attitude;
                    if (f.data.description) factionsText += '\n  ' + f.data.description;
                    factionsText += '\n';
                }
            });
            contextParts.push(factionsText.trim());
        }
        
        // 10. 情报
        intels = intels || [];
        if (intels.length > 0) {
            var intelsText = '【重要情报】\n';
            intels.forEach(function(i) {
                if (i.data && i.data.name) {
                    intelsText += '- ' + i.data.name;
                    if (i.data.type) intelsText += ' [' + i.data.type + ']';
                    if (i.data.reliability) intelsText += ' (' + i.data.reliability + ')';
                    if (i.data.content) intelsText += '\n  ' + i.data.content;
                    intelsText += '\n';
                }
            });
            contextParts.push(intelsText.trim());
        }
        
        // 11. 总结历史（总结不受版本选择影响，始终使用全部）
        var summaries = bookData.summaries || [];
        if (summaries.length > 0) {
            var summariesText = '【故事总结】\n';
            // 按范围排序
            var sortedSummaries = summaries.slice().sort(function(a, b) {
                return NR.parseRangeStartNumber(a.range) - NR.parseRangeStartNumber(b.range);
            });
            sortedSummaries.forEach(function(s) {
                summariesText += '[' + (s.range || '未知范围') + ']\n' + s.text + '\n\n';
            });
            contextParts.push(summariesText.trim());
        }
        
        if (contextParts.length === 0) {
            return '';
        }
        
        return '请参考以下故事背景信息进行续写：\n\n' + contextParts.join('\n\n---\n\n') + '\n\n---\n\n';
    };

    // 构建一键生成提示词（全局数据+人物+技能+背包+任务+地点+装备+势力+情报）
    NR.buildAllDataPrompt = function(text) {
        var existingGlobal = NR.state.currentBookData.globalData;
        var existingProtag = NR.state.currentBookData.protagonistInfo;
        var existingNPCs = NR.state.currentBookData.importantNPCs || [];
        var existingSkills = NR.state.currentBookData.skills || [];
        var existingItems = NR.state.currentBookData.items || [];
        var existingQuests = NR.state.currentBookData.quests || [];
        var existingLocations = NR.state.currentBookData.locations || [];
        var existingEquipments = NR.state.currentBookData.equipments || [];
        var existingFactions = NR.state.currentBookData.factions || [];
        var existingIntels = NR.state.currentBookData.intels || [];
        var existingContext = '';
        
        if (existingGlobal) {
            existingContext += '\n\n已有的全局数据：\n' + JSON.stringify(existingGlobal.data, null, 2);
        }
        if (existingProtag) {
            existingContext += '\n\n已有的主角信息：\n' + JSON.stringify(existingProtag.data, null, 2);
        }
        if (existingNPCs.length > 0) {
            existingContext += '\n\n已有的重要人物：\n' + JSON.stringify(existingNPCs.map(function(npc) { return npc.data; }), null, 2);
        }
        if (existingSkills.length > 0) {
            existingContext += '\n\n已有的技能：\n' + JSON.stringify(existingSkills.map(function(s) { return s.data; }), null, 2);
        }
        if (existingItems.length > 0) {
            existingContext += '\n\n已有的物品：\n' + JSON.stringify(existingItems.map(function(i) { return i.data; }), null, 2);
        }
        if (existingQuests.length > 0) {
            existingContext += '\n\n已有的任务：\n' + JSON.stringify(existingQuests.map(function(q) { return q.data; }), null, 2);
        }
        if (existingLocations.length > 0) {
            existingContext += '\n\n已有的地点：\n' + JSON.stringify(existingLocations.map(function(l) { return l.data; }), null, 2);
        }
        if (existingEquipments.length > 0) {
            existingContext += '\n\n已有的装备：\n' + JSON.stringify(existingEquipments.map(function(e) { return e.data; }), null, 2);
        }
        if (existingFactions.length > 0) {
            existingContext += '\n\n已有的势力：\n' + JSON.stringify(existingFactions.map(function(f) { return f.data; }), null, 2);
        }
        if (existingIntels.length > 0) {
            existingContext += '\n\n已有的情报：\n' + JSON.stringify(existingIntels.map(function(i) { return i.data; }), null, 2);
        }

        return '请从以下文本中提取游戏/小说数据，以JSON格式返回。返回格式为一个对象，包含以下字段：' +
            '\n\n0. globalData（全局数据对象，用于追踪场景状态）：' +
            '\n- currentLocation: 主角当前所在地点' +
            '\n- currentTime: 当前时间（如"第三天 上午"或"深夜"）' +
            '\n- lastSceneTime: 上轮场景的时间' +
            '\n- elapsedTime: 经过的时间（如"2小时"）' +
            '\n\n1. protagonist（主角信息对象，如无则为null）：' +
            '\n- name: 人物名称' +
            '\n- gender: 性别（如"男"/"女"/"未知"）' +
            '\n- age: 年龄（如"25岁"/"青年"/"未知"）' +
            '\n- race: 种族（如"人类"/"精灵"/"兽人"等）' +
            '\n- occupation: 职业/身份（如"学生"/"剑客"/"商人"）' +
            '\n- location: 所在地点' +
            '\n- inScene: 在场状态（"在场"/"离场"/"未知"）' +
            '\n- appearance: 外貌特征（【仅填写固有外貌】：脸型、五官、肤色、身材、发型发色、疤痕胎记等。【不要填写】临时状态如脸红、苍白、出汗、湿漉漉、光着等）' +
            '\n- clothing: 衣着/服装（当前穿着的衣物，包括临时状态如裹着浴巾、光着上身等）' +
            '\n- items: 持有的重要物品' +
            '\n- ability: 能力/技能特长' +
            '\n- purpose: 目的/动机' +
            '\n- organization: 所属组织/势力' +
            '\n- health: 健康状态' +
            '\n- hobby: 爱好/兴趣' +
            '\n- history: 过往经历' +
            '\n- personality: 性格特点' +
            '\n- baseAttributes: 基础属性（格式：属性名:数值;属性名:数值，数值0-100）' +
            '\n- specialAttributes: 特有属性（格式同上）' +
            '\n- relationships: 人际关系（格式：角色名:关系;角色名:关系）' +
            '\n\n2. npcs（重要人物数组，每个人物包含以下字段）：' +
            '\n- name: 姓名' +
            '\n- gender: 性别' +
            '\n- age: 年龄' +
            '\n- race: 种族' +
            '\n- occupation: 职业/身份' +
            '\n- location: 所在地点' +
            '\n- inScene: 是否在场（"在场"/"离场"/"未知"）' +
            '\n- appearance: 外貌特征（【仅填写固有外貌】，不要填写临时状态）' +
            '\n- clothing: 衣着/服装（当前穿着，包括临时状态）' +
            '\n- items: 持有的重要物品' +
            '\n- ability: 能力/技能特长' +
            '\n- purpose: 目的/动机' +
            '\n- organization: 所属组织/势力' +
            '\n- health: 健康状态' +
            '\n- hobby: 爱好/兴趣' +
            '\n- history: 过往经历' +
            '\n- personality: 性格特点' +
            '\n- relationWithProtagonist: 与主角关系' +
            '\n- baseAttributes, specialAttributes, relationships: 格式同主角' +
            '\n\n3. skills（主角技能数组）：' +
            '\n- name: 技能名称' +
            '\n- type: 技能类型（"主动"/"被动"/"天赋"/"特殊"）' +
            '\n- level: 等级/阶段' +
            '\n- description: 效果描述' +
            '\n\n4. items（背包物品数组）：' +
            '\n- name: 物品名称' +
            '\n- count: 数量' +
            '\n- category: 类别（"武器"/"防具"/"消耗品"/"材料"/"关键道具"/"其他"）' +
            '\n- description: 描述/效果' +
            '\n\n5. quests（任务与事件数组）：' +
            '\n- name: 任务名称' +
            '\n- type: 任务类型（"主线"/"支线"/"日常"/"隐藏"/"紧急"）' +
            '\n- issuer: 发布者' +
            '\n- description: 详细描述' +
            '\n- progress: 当前进度（如"50%"或"2/5"）' +
            '\n- deadline: 任务时限' +
            '\n- reward: 奖励' +
            '\n- penalty: 惩罚' +
            '\n\n6. locations（世界地图点/地点数组）：' +
            '\n- name: 地点名称' +
            '\n- type: 地点类型（"城镇"/"野外"/"副本"/"建筑"/"房间"/"秘境"/"其他"）' +
            '\n- region: 所属区域' +
            '\n- description: 地点描述' +
            '\n- features: 地点特征/元素' +
            '\n- npcs: 常驻NPC' +
            '\n- connections: 连接地点' +
            '\n- status: 当前状态（"可访问"/"已探索"/"未探索"/"已封锁"/"危险"）' +
            '\n\n7. equipments（装备数组）：' +
            '\n- name: 装备名称' +
            '\n- type: 装备类型（"武器"/"头盔"/"护甲"/"护手"/"护腿"/"鞋子"/"饰品"/"其他"）' +
            '\n- rarity: 稀有度（"普通"/"优秀"/"稀有"/"史诗"/"传说"/"神话"）' +
            '\n- equipped: 装备状态（"已装备"/"未装备"/"已损坏"）' +
            '\n- attributes: 属性加成（格式：属性名:+数值;属性名:+数值）' +
            '\n- description: 描述/效果' +
            '\n- source: 获取来源' +
            '\n\n8. factions（势力/组织数组）：' +
            '\n- name: 势力名称' +
            '\n- type: 势力类型（"国家"/"组织"/"帮派"/"家族"/"宗门"/"公会"/"其他"）' +
            '\n- leader: 领袖/首领' +
            '\n- territory: 势力范围' +
            '\n- description: 势力简介' +
            '\n- attitude: 对主角态度（"友好"/"中立"/"敌对"/"未知"）' +
            '\n- reputation: 主角声望' +
            '\n- members: 重要成员' +
            '\n\n9. intels（重要情报数组）：' +
            '\n- name: 情报标题' +
            '\n- type: 情报类型（"线索"/"秘密"/"传闻"/"历史"/"预言"/"其他"）' +
            '\n- source: 情报来源' +
            '\n- content: 情报内容' +
            '\n- reliability: 可信度（"已证实"/"可能真实"/"存疑"/"谣言"）' +
            '\n- related: 关联事项' +
            '\n- status: 情报状态（"新获得"/"调查中"/"已利用"/"已过时"）' +
            '\n\n规则：' +
            '\n1. 如果某个字段在文本中没有明确信息，填写"-"' +
            '\n2. 如果某类数据完全没有，返回空数组[]或null' +
            '\n3. 请在已有数据基础上补充或更新，同名数据合并信息' +
            existingContext +
            '\n\n---\n\n' + text +
            '\n\n请只返回JSON对象：{"globalData": {...}, "protagonist": {...}, "npcs": [...], "skills": [...], "items": [...], "quests": [...], "locations": [...], "equipments": [...], "factions": [...], "intels": [...]}';
    };

    // 旧的提示词函数保留兼容
    NR.buildAllCharactersPrompt = NR.buildAllDataPrompt;

    // 显示一键生成的表单弹窗（包含所有数据类型）
    NR.showAllDataFormModal = function(data, rangeDesc, summaryText, timelineModules) {
        console.log('[AI数据库] showAllDataFormModal 开始执行');
        
        // 保存总结和剧情时间线供后续统一保存
        NR.state.pendingFillFormSummary = summaryText || null;
        NR.state.pendingFillFormTimeline = Array.isArray(timelineModules) ? timelineModules : [];
        
        try {
            console.log('[AI数据库] 收到的数据类型:', typeof data);
            if (data) {
                console.log('[AI数据库] 数据预览:', JSON.stringify(data).substring(0, 500));
            } else {
                console.error('[AI数据库] 数据为空!');
                alert('AI返回的数据为空');
                return;
            }
        } catch (e) {
            console.error('[AI数据库] 数据序列化失败:', e);
        }
        
        var existingModal = document.getElementById('all-characters-form-modal');
        if (existingModal) existingModal.remove();

        var globalData = data.globalData || null;
        var protagonist = data.protagonist || null;
        var npcs = Array.isArray(data.npcs) ? data.npcs : [];
        var skills = Array.isArray(data.skills) ? data.skills : [];
        var items = Array.isArray(data.items) ? data.items : [];
        var quests = Array.isArray(data.quests) ? data.quests : [];
        var locations = Array.isArray(data.locations) ? data.locations : [];
        var equipments = Array.isArray(data.equipments) ? data.equipments : [];
        var factions = Array.isArray(data.factions) ? data.factions : [];
        var intels = Array.isArray(data.intels) ? data.intels : [];
        var pendingTimeline = NR.state.pendingFillFormTimeline || [];
        
        console.log('[AI数据库] 数据解析完成: 全局=' + (globalData ? '有' : '无') +
            ', 主角=' + (protagonist ? protagonist.name : '无') + 
            ', NPCs=' + npcs.length + ', 技能=' + skills.length + 
            ', 物品=' + items.length + ', 任务=' + quests.length +
            ', 地点=' + locations.length + ', 装备=' + equipments.length +
            ', 势力=' + factions.length + ', 情报=' + intels.length);
        
        console.log('[AI数据库] 开始合并已有数据...');
        
        // 预先合并已有数据
        try {
            var existingGlobal = NR.state.currentBookData.globalData;
            if (globalData && existingGlobal && existingGlobal.data) {
                globalData = NR.mergeFormData(existingGlobal.data, globalData);
            }

            var existingProtag = NR.state.currentBookData.protagonistInfo;
            if (protagonist && protagonist.name && protagonist.name !== '-' && existingProtag && existingProtag.data) {
                protagonist = NR.mergeFormData(existingProtag.data, protagonist);
            }
            
            var existingNPCs = NR.state.currentBookData.importantNPCs || [];
            npcs = npcs.map(function(npc) {
                if (!npc || !npc.name || npc.name === '-') return npc;
                var existingNPC = existingNPCs.find(function(e) { return e.data && e.data.name === npc.name; });
                if (existingNPC && existingNPC.data) {
                    return NR.mergeFormData(existingNPC.data, npc);
                }
                return npc;
            });

            var existingSkills = NR.state.currentBookData.skills || [];
            skills = skills.map(function(skill) {
                if (!skill || !skill.name || skill.name === '-') return skill;
                var existing = existingSkills.find(function(e) { return e.data && e.data.name === skill.name; });
                if (existing && existing.data) return NR.mergeFormData(existing.data, skill);
                return skill;
            });

            var existingItems = NR.state.currentBookData.items || [];
            items = items.map(function(item) {
                if (!item || !item.name || item.name === '-') return item;
                var existing = existingItems.find(function(e) { return e.data && e.data.name === item.name; });
                if (existing && existing.data) return NR.mergeFormData(existing.data, item);
                return item;
            });
            
            console.log('[AI数据库] 数据合并完成');
        } catch (mergeErr) {
            console.error('[AI数据库] 数据合并出错:', mergeErr);
        }

        try {
            var existingQuests = NR.state.currentBookData.quests || [];
            quests = quests.map(function(quest) {
                if (!quest || !quest.name || quest.name === '-') return quest;
                var existing = existingQuests.find(function(e) { return e.data && e.data.name === quest.name; });
                if (existing && existing.data) return NR.mergeFormData(existing.data, quest);
                return quest;
            });

            var existingLocations = NR.state.currentBookData.locations || [];
            locations = locations.map(function(loc) {
                if (!loc || !loc.name || loc.name === '-') return loc;
                var existing = existingLocations.find(function(e) { return e.data && e.data.name === loc.name; });
                if (existing && existing.data) return NR.mergeFormData(existing.data, loc);
                return loc;
            });

            var existingEquipments = NR.state.currentBookData.equipments || [];
            equipments = equipments.map(function(eq) {
                if (!eq || !eq.name || eq.name === '-') return eq;
                var existing = existingEquipments.find(function(e) { return e.data && e.data.name === eq.name; });
                if (existing && existing.data) return NR.mergeFormData(existing.data, eq);
                return eq;
            });

            var existingFactions = NR.state.currentBookData.factions || [];
            factions = factions.map(function(fac) {
                if (!fac || !fac.name || fac.name === '-') return fac;
                var existing = existingFactions.find(function(e) { return e.data && e.data.name === fac.name; });
                if (existing && existing.data) return NR.mergeFormData(existing.data, fac);
                return fac;
            });

            var existingIntels = NR.state.currentBookData.intels || [];
            intels = intels.map(function(intel) {
                if (!intel || !intel.name || intel.name === '-') return intel;
                var existing = existingIntels.find(function(e) { return e.data && e.data.name === intel.name; });
                if (existing && existing.data) return NR.mergeFormData(existing.data, intel);
                return intel;
            });
            
            console.log('[AI数据库] 所有数据合并完成');
        } catch (mergeErr2) {
            console.error('[AI数据库] 第二阶段数据合并出错:', mergeErr2);
        }
        
        console.log('[AI数据库] 开始构建HTML...');
        var contentHtml = '';
        
        // 全局数据部分
        if (globalData && (globalData.currentLocation || globalData.currentTime)) {
            var globalFormHtml = NR.buildFormFields(NR.GLOBAL_DATA_FIELDS, globalData, 'global');
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>🌍 全局数据</h3>' +
                        '<button class="btn-save-section control-button" data-section="globalData">保存</button>' +
                    '</div>' +
                    '<div class="section-content">' + globalFormHtml + '</div>' +
                '</div>';
        }
        
        // 主角部分
        if (protagonist && protagonist.name && protagonist.name !== '-') {
            var protagFormHtml = NR.buildFormFields(NR.PROTAGONIST_FIELDS, protagonist, 'protag');
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>👤 主角信息</h3>' +
                        '<button class="btn-save-section control-button" data-section="protagonist">保存</button>' +
                    '</div>' +
                    '<div class="section-content">' + protagFormHtml + '</div>' +
                '</div>';
        }
        
        // 重要人物部分
        var validNpcs = npcs.filter(function(n) { return n && n.name && n.name !== '-'; });
        if (validNpcs.length > 0) {
            var npcsHtml = '';
            validNpcs.forEach(function(npc, index) {
                var npcFormHtml = NR.buildFormFields(NR.NPC_FIELDS, npc, 'npc-' + index);
                npcsHtml += 
                    '<div class="npc-form-card" data-index="' + index + '" data-type="npc">' +
                        '<div class="npc-form-header">' +
                            '<h4>' + NR.escapeHtml(npc.name) + '</h4>' +
                            '<button class="btn-save-single control-button" data-type="npc" data-index="' + index + '">保存</button>' +
                        '</div>' +
                        npcFormHtml +
                    '</div>';
            });
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>👥 重要人物 (' + validNpcs.length + ')</h3>' +
                        '<button class="btn-save-section control-button" data-section="npcs">全部保存</button>' +
                    '</div>' +
                    '<div class="section-content npcs-grid">' + npcsHtml + '</div>' +
                '</div>';
        }

        // 技能部分
        var validSkills = skills.filter(function(s) { return s && s.name && s.name !== '-'; });
        if (validSkills.length > 0) {
            var skillsHtml = '';
            validSkills.forEach(function(skill, index) {
                var skillFormHtml = NR.buildFormFields(NR.SKILL_FIELDS, skill, 'skill-' + index);
                skillsHtml += 
                    '<div class="npc-form-card" data-index="' + index + '" data-type="skill">' +
                        '<div class="npc-form-header">' +
                            '<h4>⚔️ ' + NR.escapeHtml(skill.name) + '</h4>' +
                            '<button class="btn-save-single control-button" data-type="skill" data-index="' + index + '">保存</button>' +
                        '</div>' +
                        skillFormHtml +
                    '</div>';
            });
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>⚔️ 主角技能 (' + validSkills.length + ')</h3>' +
                        '<button class="btn-save-section control-button" data-section="skills">全部保存</button>' +
                    '</div>' +
                    '<div class="section-content npcs-grid">' + skillsHtml + '</div>' +
                '</div>';
        }

        // 背包物品部分
        var validItems = items.filter(function(i) { return i && i.name && i.name !== '-'; });
        if (validItems.length > 0) {
            var itemsHtml = '';
            validItems.forEach(function(item, index) {
                var itemFormHtml = NR.buildFormFields(NR.ITEM_FIELDS, item, 'item-' + index);
                itemsHtml += 
                    '<div class="npc-form-card" data-index="' + index + '" data-type="item">' +
                        '<div class="npc-form-header">' +
                            '<h4>🎒 ' + NR.escapeHtml(item.name) + '</h4>' +
                            '<button class="btn-save-single control-button" data-type="item" data-index="' + index + '">保存</button>' +
                        '</div>' +
                        itemFormHtml +
                    '</div>';
            });
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>🎒 背包物品 (' + validItems.length + ')</h3>' +
                        '<button class="btn-save-section control-button" data-section="items">全部保存</button>' +
                    '</div>' +
                    '<div class="section-content npcs-grid">' + itemsHtml + '</div>' +
                '</div>';
        }

        // 任务部分
        var validQuests = quests.filter(function(q) { return q && q.name && q.name !== '-'; });
        if (validQuests.length > 0) {
            var questsHtml = '';
            validQuests.forEach(function(quest, index) {
                var questFormHtml = NR.buildFormFields(NR.QUEST_FIELDS, quest, 'quest-' + index);
                questsHtml += 
                    '<div class="npc-form-card" data-index="' + index + '" data-type="quest">' +
                        '<div class="npc-form-header">' +
                            '<h4>📜 ' + NR.escapeHtml(quest.name) + '</h4>' +
                            '<button class="btn-save-single control-button" data-type="quest" data-index="' + index + '">保存</button>' +
                        '</div>' +
                        questFormHtml +
                    '</div>';
            });
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>📜 任务与事件 (' + validQuests.length + ')</h3>' +
                        '<button class="btn-save-section control-button" data-section="quests">全部保存</button>' +
                    '</div>' +
                    '<div class="section-content npcs-grid">' + questsHtml + '</div>' +
                '</div>';
        }

        // 地点部分
        var validLocations = locations.filter(function(l) { return l && l.name && l.name !== '-'; });
        if (validLocations.length > 0) {
            var locationsHtml = '';
            validLocations.forEach(function(loc, index) {
                var locFormHtml = NR.buildFormFields(NR.LOCATION_FIELDS, loc, 'location-' + index);
                locationsHtml += 
                    '<div class="npc-form-card" data-index="' + index + '" data-type="location">' +
                        '<div class="npc-form-header">' +
                            '<h4>📍 ' + NR.escapeHtml(loc.name) + '</h4>' +
                            '<button class="btn-save-single control-button" data-type="location" data-index="' + index + '">保存</button>' +
                        '</div>' +
                        locFormHtml +
                    '</div>';
            });
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>📍 世界地点 (' + validLocations.length + ')</h3>' +
                        '<button class="btn-save-section control-button" data-section="locations">全部保存</button>' +
                    '</div>' +
                    '<div class="section-content npcs-grid">' + locationsHtml + '</div>' +
                '</div>';
        }

        // 装备部分
        var validEquipments = equipments.filter(function(e) { return e && e.name && e.name !== '-'; });
        if (validEquipments.length > 0) {
            var equipmentsHtml = '';
            validEquipments.forEach(function(eq, index) {
                var eqFormHtml = NR.buildFormFields(NR.EQUIPMENT_FIELDS, eq, 'equipment-' + index);
                equipmentsHtml += 
                    '<div class="npc-form-card" data-index="' + index + '" data-type="equipment">' +
                        '<div class="npc-form-header">' +
                            '<h4>🛡️ ' + NR.escapeHtml(eq.name) + '</h4>' +
                            '<button class="btn-save-single control-button" data-type="equipment" data-index="' + index + '">保存</button>' +
                        '</div>' +
                        eqFormHtml +
                    '</div>';
            });
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>🛡️ 装备 (' + validEquipments.length + ')</h3>' +
                        '<button class="btn-save-section control-button" data-section="equipments">全部保存</button>' +
                    '</div>' +
                    '<div class="section-content npcs-grid">' + equipmentsHtml + '</div>' +
                '</div>';
        }

        // 势力部分
        var validFactions = factions.filter(function(f) { return f && f.name && f.name !== '-'; });
        if (validFactions.length > 0) {
            var factionsHtml = '';
            validFactions.forEach(function(fac, index) {
                var facFormHtml = NR.buildFormFields(NR.FACTION_FIELDS, fac, 'faction-' + index);
                factionsHtml += 
                    '<div class="npc-form-card" data-index="' + index + '" data-type="faction">' +
                        '<div class="npc-form-header">' +
                            '<h4>🏰 ' + NR.escapeHtml(fac.name) + '</h4>' +
                            '<button class="btn-save-single control-button" data-type="faction" data-index="' + index + '">保存</button>' +
                        '</div>' +
                        facFormHtml +
                    '</div>';
            });
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>🏰 势力/组织 (' + validFactions.length + ')</h3>' +
                        '<button class="btn-save-section control-button" data-section="factions">全部保存</button>' +
                    '</div>' +
                    '<div class="section-content npcs-grid">' + factionsHtml + '</div>' +
                '</div>';
        }

        // 情报部分
        var validIntels = intels.filter(function(i) { return i && i.name && i.name !== '-'; });
        if (validIntels.length > 0) {
            var intelsHtml = '';
            validIntels.forEach(function(intel, index) {
                var intelFormHtml = NR.buildFormFields(NR.INTEL_FIELDS, intel, 'intel-' + index);
                intelsHtml += 
                    '<div class="npc-form-card" data-index="' + index + '" data-type="intel">' +
                        '<div class="npc-form-header">' +
                            '<h4>🔍 ' + NR.escapeHtml(intel.name) + '</h4>' +
                            '<button class="btn-save-single control-button" data-type="intel" data-index="' + index + '">保存</button>' +
                        '</div>' +
                        intelFormHtml +
                    '</div>';
            });
            contentHtml += 
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>🔍 重要情报 (' + validIntels.length + ')</h3>' +
                        '<button class="btn-save-section control-button" data-section="intels">全部保存</button>' +
                    '</div>' +
                    '<div class="section-content npcs-grid">' + intelsHtml + '</div>' +
                '</div>';
        }

        if (pendingTimeline.length > 0) {
            var timelinePreviewHtml = '';
            pendingTimeline.forEach(function(module, moduleIndex) {
                var events = module.events || [];
                timelinePreviewHtml +=
                    '<div class="timeline-form-module">' +
                        '<div class="timeline-form-module-header">' +
                            '<strong>' + NR.escapeHtml(module.timeNode || module.range || '时间节点') + '</strong>' +
                            '<span>' + NR.escapeHtml(module.range || rangeDesc) + ' · ' + events.length + ' 个事件</span>' +
                        '</div>' +
                        (module.summary ? '<p class="timeline-form-summary">' + NR.escapeHtml(module.summary) + '</p>' : '') +
                        '<div class="timeline-form-events">';
                events.forEach(function(event, eventIndex) {
                    timelinePreviewHtml +=
                        '<button type="button" class="timeline-form-event pending-timeline-event" data-module-index="' + moduleIndex + '" data-event-index="' + eventIndex + '">' +
                            '<span>' + NR.escapeHtml(event.title || '剧情事件') + '</span>' +
                            (event.summary ? '<small>' + NR.escapeHtml(event.summary) + '</small>' : '') +
                        '</button>';
                });
                timelinePreviewHtml += '</div></div>';
            });
            contentHtml +=
                '<div class="character-section">' +
                    '<div class="section-header">' +
                        '<h3>🧭 剧情时间线 (' + pendingTimeline.length + ' 个时间节点)</h3>' +
                    '</div>' +
                    '<div class="section-content">' + timelinePreviewHtml + '</div>' +
                '</div>';
        }

        if (!contentHtml) {
            contentHtml = '<div class="character-section"><p class="no-data-hint">未识别到任何数据</p></div>';
        }

        console.log('[AI数据库] HTML构建完成，长度:', contentHtml.length);
        console.log('[AI数据库] 创建弹窗...');

        var modalHtml = 
            '<div id="all-characters-form-modal" class="modal character-form-modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 900px;">' +
                    '<div class="modal-header">' +
                        '<h2>📋 AI数据库</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="all-characters-container">' +
                        '<p class="form-hint">来源: ' + NR.escapeHtml(rangeDesc) + '</p>' +
                        contentHtml +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-save-all-characters" class="control-button">全部保存</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        console.log('[AI数据库] 弹窗已插入DOM');

        var modal = document.getElementById('all-characters-form-modal');
        var closeBtn = modal.querySelector('.close-button');

        closeBtn.addEventListener('click', function() { 
            NR.state.pendingFillFormSummary = null;
            NR.state.pendingFillFormTimeline = null;
            modal.remove(); 
        });
        modal.addEventListener('click', function(e) { 
            if (e.target === modal) {
                NR.state.pendingFillFormSummary = null;
                NR.state.pendingFillFormTimeline = null;
                modal.remove(); 
            }
        });

        modal.querySelectorAll('.pending-timeline-event').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var moduleIndex = parseInt(this.dataset.moduleIndex, 10);
                var eventIndex = parseInt(this.dataset.eventIndex, 10);
                var modules = NR.state.pendingFillFormTimeline || [];
                if (modules[moduleIndex] && modules[moduleIndex].events && modules[moduleIndex].events[eventIndex]) {
                    NR.showTimelineEventDetailFromData(modules[moduleIndex], modules[moduleIndex].events[eventIndex]);
                }
            });
        });

        console.log('[AI数据库] 绑定事件...');

        // 保存全局数据
        var saveGlobalBtn = modal.querySelector('.btn-save-section[data-section="globalData"]');
        if (saveGlobalBtn) {
            saveGlobalBtn.addEventListener('click', function() {
                var formData = NR.collectFormData(modal, NR.GLOBAL_DATA_FIELDS, 'global');
                NR.saveGlobalData(formData, rangeDesc);
                this.textContent = '已保存 ✓';
                this.disabled = true;
            });
        }

        // 保存主角
        var saveProtagBtn = modal.querySelector('.btn-save-section[data-section="protagonist"]');
        if (saveProtagBtn) {
            saveProtagBtn.addEventListener('click', function() {
                var formData = NR.collectFormData(modal, NR.PROTAGONIST_FIELDS, 'protag');
                if (!formData.name || formData.name === '-') {
                    alert('人物名称不能为空');
                    return;
                }
                NR.saveProtagonistData(formData, rangeDesc);
                this.textContent = '已保存 ✓';
                this.disabled = true;
            });
        }

        // 保存单个项目（NPC/技能/物品/任务/地点/装备/势力/情报）
        modal.querySelectorAll('.btn-save-single').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = this.dataset.type;
                var index = parseInt(this.dataset.index);
                var card = modal.querySelector('.npc-form-card[data-type="' + type + '"][data-index="' + index + '"]');
                var fields, saveFunc;
                
                if (type === 'npc') {
                    fields = NR.NPC_FIELDS;
                    saveFunc = function(data) { NR.saveNPCData(data, rangeDesc); };
                } else if (type === 'skill') {
                    fields = NR.SKILL_FIELDS;
                    saveFunc = function(data) { NR.saveSkillData(data, rangeDesc); };
                } else if (type === 'item') {
                    fields = NR.ITEM_FIELDS;
                    saveFunc = function(data) { NR.saveItemData(data, rangeDesc); };
                } else if (type === 'quest') {
                    fields = NR.QUEST_FIELDS;
                    saveFunc = function(data) { NR.saveQuestData(data, rangeDesc); };
                } else if (type === 'location') {
                    fields = NR.LOCATION_FIELDS;
                    saveFunc = function(data) { NR.saveLocationData(data, rangeDesc); };
                } else if (type === 'equipment') {
                    fields = NR.EQUIPMENT_FIELDS;
                    saveFunc = function(data) { NR.saveEquipmentData(data, rangeDesc); };
                } else if (type === 'faction') {
                    fields = NR.FACTION_FIELDS;
                    saveFunc = function(data) { NR.saveFactionData(data, rangeDesc); };
                } else if (type === 'intel') {
                    fields = NR.INTEL_FIELDS;
                    saveFunc = function(data) { NR.saveIntelData(data, rangeDesc); };
                }
                
                var formData = NR.collectFormData(card, fields, type + '-' + index);
                if (!formData.name || formData.name === '-') {
                    alert('名称不能为空');
                    return;
                }
                saveFunc(formData);
                this.textContent = '已保存 ✓';
                this.disabled = true;
            });
        });

        // 批量保存各类数据
        modal.querySelectorAll('.btn-save-section').forEach(function(btn) {
            var section = btn.dataset.section;
            if (section === 'protagonist') return; // 已单独处理
            
            btn.addEventListener('click', function() {
                var type, fields, saveFunc;
                if (section === 'npcs') {
                    type = 'npc'; fields = NR.NPC_FIELDS;
                    saveFunc = function(data) { NR.saveNPCData(data, rangeDesc); };
                } else if (section === 'skills') {
                    type = 'skill'; fields = NR.SKILL_FIELDS;
                    saveFunc = function(data) { NR.saveSkillData(data, rangeDesc); };
                } else if (section === 'items') {
                    type = 'item'; fields = NR.ITEM_FIELDS;
                    saveFunc = function(data) { NR.saveItemData(data, rangeDesc); };
                } else if (section === 'quests') {
                    type = 'quest'; fields = NR.QUEST_FIELDS;
                    saveFunc = function(data) { NR.saveQuestData(data, rangeDesc); };
                } else if (section === 'locations') {
                    type = 'location'; fields = NR.LOCATION_FIELDS;
                    saveFunc = function(data) { NR.saveLocationData(data, rangeDesc); };
                } else if (section === 'equipments') {
                    type = 'equipment'; fields = NR.EQUIPMENT_FIELDS;
                    saveFunc = function(data) { NR.saveEquipmentData(data, rangeDesc); };
                } else if (section === 'factions') {
                    type = 'faction'; fields = NR.FACTION_FIELDS;
                    saveFunc = function(data) { NR.saveFactionData(data, rangeDesc); };
                } else if (section === 'intels') {
                    type = 'intel'; fields = NR.INTEL_FIELDS;
                    saveFunc = function(data) { NR.saveIntelData(data, rangeDesc); };
                }
                
                var savedCount = 0;
                modal.querySelectorAll('.npc-form-card[data-type="' + type + '"]').forEach(function(card) {
                    var index = parseInt(card.dataset.index);
                    var formData = NR.collectFormData(card, fields, type + '-' + index);
                    if (formData.name && formData.name !== '-') {
                        saveFunc(formData);
                        savedCount++;
                    }
                });
                this.textContent = '已保存 ' + savedCount + ' 个 ✓';
                this.disabled = true;
            });
        });

        // 全部保存
        document.getElementById('btn-save-all-characters').addEventListener('click', function() {
            var msg = [];
            
            // 保存全局数据（跳过单独的历史保存，最后统一保存）
            var globalFormData = NR.collectFormData(modal, NR.GLOBAL_DATA_FIELDS, 'global');
            if (globalFormData.currentLocation || globalFormData.currentTime) {
                NR.saveGlobalData(globalFormData, rangeDesc, true);
                msg.push('全局数据');
            }

            // 保存主角（跳过单独的历史保存）
            var protagFormData = NR.collectFormData(modal, NR.PROTAGONIST_FIELDS, 'protag');
            if (protagFormData.name && protagFormData.name !== '-') {
                NR.saveProtagonistData(protagFormData, rangeDesc, true);
                msg.push('主角');
            }
            
            // 保存NPC
            var npcCount = 0;
            modal.querySelectorAll('.npc-form-card[data-type="npc"]').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.NPC_FIELDS, 'npc-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveNPCData(formData, rangeDesc);
                    npcCount++;
                }
            });
            if (npcCount > 0) msg.push(npcCount + '个人物');

            // 保存技能
            var skillCount = 0;
            modal.querySelectorAll('.npc-form-card[data-type="skill"]').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.SKILL_FIELDS, 'skill-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveSkillData(formData, rangeDesc);
                    skillCount++;
                }
            });
            if (skillCount > 0) msg.push(skillCount + '个技能');

            // 保存物品
            var itemCount = 0;
            modal.querySelectorAll('.npc-form-card[data-type="item"]').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.ITEM_FIELDS, 'item-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveItemData(formData, rangeDesc);
                    itemCount++;
                }
            });
            if (itemCount > 0) msg.push(itemCount + '个物品');

            // 保存任务
            var questCount = 0;
            modal.querySelectorAll('.npc-form-card[data-type="quest"]').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.QUEST_FIELDS, 'quest-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveQuestData(formData, rangeDesc);
                    questCount++;
                }
            });
            if (questCount > 0) msg.push(questCount + '个任务');

            // 保存地点
            var locationCount = 0;
            modal.querySelectorAll('.npc-form-card[data-type="location"]').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.LOCATION_FIELDS, 'location-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveLocationData(formData, rangeDesc);
                    locationCount++;
                }
            });
            if (locationCount > 0) msg.push(locationCount + '个地点');

            // 保存装备
            var equipmentCount = 0;
            modal.querySelectorAll('.npc-form-card[data-type="equipment"]').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.EQUIPMENT_FIELDS, 'equipment-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveEquipmentData(formData, rangeDesc);
                    equipmentCount++;
                }
            });
            if (equipmentCount > 0) msg.push(equipmentCount + '个装备');

            // 保存势力
            var factionCount = 0;
            modal.querySelectorAll('.npc-form-card[data-type="faction"]').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.FACTION_FIELDS, 'faction-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveFactionData(formData, rangeDesc);
                    factionCount++;
                }
            });
            if (factionCount > 0) msg.push(factionCount + '个势力');

            // 保存情报
            var intelCount = 0;
            modal.querySelectorAll('.npc-form-card[data-type="intel"]').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.INTEL_FIELDS, 'intel-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveIntelData(formData, rangeDesc);
                    intelCount++;
                }
            });
            if (intelCount > 0) msg.push(intelCount + '个情报');
            
            // 自动保存填表时生成的总结
            if (NR.state.pendingFillFormSummary) {
                var summaryExists = NR.state.currentBookData.summaries.some(function(s) { 
                    return s.text === NR.state.pendingFillFormSummary; 
                });
                if (!summaryExists) {
                    NR.state.currentBookData.summaries.push({ 
                        text: NR.state.pendingFillFormSummary, 
                        range: rangeDesc, 
                        timestamp: Date.now() 
                    });
                    msg.push('总结');
                }
                NR.state.pendingFillFormSummary = null;
            }

            // 自动保存填表时生成的剧情时间线
            if (NR.state.pendingFillFormTimeline && NR.state.pendingFillFormTimeline.length) {
                var timelineCount = NR.saveTimelineModules(NR.state.pendingFillFormTimeline, rangeDesc, true);
                if (timelineCount > 0) msg.push(timelineCount + '个时间线事件');
                NR.state.pendingFillFormTimeline = null;
            }
            
            // 保存所有数据的历史快照
            NR.saveAllDataSnapshot(rangeDesc);
            
            NR.saveBookData();
            alert((msg.length > 0 ? msg.join(' + ') : '无有效数据') + ' 已保存！');
            modal.remove();
        });

        // 初始化键值对编辑器
        NR.initKeyValueEditors(modal);
        
        console.log('[AI数据库] showAllDataFormModal 执行完成');
    };

    // 保留旧函数名兼容
    NR.showAllCharactersFormModal = NR.showAllDataFormModal;

    // 保存全局数据（不自动保存历史，由saveAllDataSnapshot统一处理）
    NR.saveGlobalData = function(formData, rangeDesc, skipHistory) {
        var finalData = formData;
        var existingData = NR.state.currentBookData.globalData;
        
        if (existingData && existingData.data) {
            finalData = NR.mergeFormData(existingData.data, formData);
        }
        
        var newEntry = {
            data: finalData,
            lastUpdated: rangeDesc,
            timestamp: Date.now()
        };
        
        // 只有不跳过历史时才保存到历史（单独保存时保存，一键保存时跳过）
        if (!skipHistory) {
            if (!NR.state.currentBookData.globalDataHistory) {
                NR.state.currentBookData.globalDataHistory = [];
            }
            NR.state.currentBookData.globalDataHistory.push(newEntry);
        }
        
        // 更新当前数据
        NR.state.currentBookData.globalData = newEntry;
        NR.saveBookData();
    };

    // 保存地点数据
    NR.saveLocationData = function(formData, rangeDesc) {
        if (!NR.state.currentBookData.locations) {
            NR.state.currentBookData.locations = [];
        }
        var existingIndex = NR.state.currentBookData.locations.findIndex(function(l) {
            return l.data.name === formData.name;
        });
        var finalData = formData;
        if (existingIndex > -1) {
            finalData = NR.mergeFormData(NR.state.currentBookData.locations[existingIndex].data, formData);
            NR.state.currentBookData.locations[existingIndex] = { data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() };
        } else {
            NR.state.currentBookData.locations.push({ data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() });
        }
        NR.saveBookData();
    };

    // 保存装备数据
    NR.saveEquipmentData = function(formData, rangeDesc) {
        if (!NR.state.currentBookData.equipments) {
            NR.state.currentBookData.equipments = [];
        }
        var existingIndex = NR.state.currentBookData.equipments.findIndex(function(e) {
            return e.data.name === formData.name;
        });
        var finalData = formData;
        if (existingIndex > -1) {
            finalData = NR.mergeFormData(NR.state.currentBookData.equipments[existingIndex].data, formData);
            NR.state.currentBookData.equipments[existingIndex] = { data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() };
        } else {
            NR.state.currentBookData.equipments.push({ data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() });
        }
        NR.saveBookData();
    };

    // 保存势力数据
    NR.saveFactionData = function(formData, rangeDesc) {
        if (!NR.state.currentBookData.factions) {
            NR.state.currentBookData.factions = [];
        }
        var existingIndex = NR.state.currentBookData.factions.findIndex(function(f) {
            return f.data.name === formData.name;
        });
        var finalData = formData;
        if (existingIndex > -1) {
            finalData = NR.mergeFormData(NR.state.currentBookData.factions[existingIndex].data, formData);
            NR.state.currentBookData.factions[existingIndex] = { data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() };
        } else {
            NR.state.currentBookData.factions.push({ data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() });
        }
        NR.saveBookData();
    };

    // 保存情报数据
    NR.saveIntelData = function(formData, rangeDesc) {
        if (!NR.state.currentBookData.intels) {
            NR.state.currentBookData.intels = [];
        }
        var existingIndex = NR.state.currentBookData.intels.findIndex(function(i) {
            return i.data.name === formData.name;
        });
        var finalData = formData;
        if (existingIndex > -1) {
            finalData = NR.mergeFormData(NR.state.currentBookData.intels[existingIndex].data, formData);
            NR.state.currentBookData.intels[existingIndex] = { data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() };
        } else {
            NR.state.currentBookData.intels.push({ data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() });
        }
        NR.saveBookData();
    };

    // 保存技能数据
    NR.saveSkillData = function(formData, rangeDesc) {
        if (!NR.state.currentBookData.skills) {
            NR.state.currentBookData.skills = [];
        }
        var existingIndex = NR.state.currentBookData.skills.findIndex(function(s) {
            return s.data.name === formData.name;
        });
        var finalData = formData;
        if (existingIndex > -1) {
            finalData = NR.mergeFormData(NR.state.currentBookData.skills[existingIndex].data, formData);
            NR.state.currentBookData.skills[existingIndex] = { data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() };
        } else {
            NR.state.currentBookData.skills.push({ data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() });
        }
        NR.saveBookData();
    };

    // 保存物品数据
    NR.saveItemData = function(formData, rangeDesc) {
        if (!NR.state.currentBookData.items) {
            NR.state.currentBookData.items = [];
        }
        var existingIndex = NR.state.currentBookData.items.findIndex(function(i) {
            return i.data.name === formData.name;
        });
        var finalData = formData;
        if (existingIndex > -1) {
            finalData = NR.mergeFormData(NR.state.currentBookData.items[existingIndex].data, formData);
            NR.state.currentBookData.items[existingIndex] = { data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() };
        } else {
            NR.state.currentBookData.items.push({ data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() });
        }
        NR.saveBookData();
    };

    // 保存任务数据
    NR.saveQuestData = function(formData, rangeDesc) {
        if (!NR.state.currentBookData.quests) {
            NR.state.currentBookData.quests = [];
        }
        var existingIndex = NR.state.currentBookData.quests.findIndex(function(q) {
            return q.data.name === formData.name;
        });
        var finalData = formData;
        if (existingIndex > -1) {
            finalData = NR.mergeFormData(NR.state.currentBookData.quests[existingIndex].data, formData);
            NR.state.currentBookData.quests[existingIndex] = { data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() };
        } else {
            NR.state.currentBookData.quests.push({ data: finalData, lastUpdated: rangeDesc, timestamp: Date.now() });
        }
        NR.saveBookData();
    };
    
    // 保存列表类数据的快照到历史（技能、物品、任务、地点、装备、势力、情报）
    NR.saveListDataSnapshot = function(dataType, rangeDesc) {
        var historyKey = dataType + 'History';
        var dataKey = dataType;
        
        if (!NR.state.currentBookData[historyKey]) {
            NR.state.currentBookData[historyKey] = [];
        }
        
        var currentData = NR.state.currentBookData[dataKey] || [];
        if (currentData.length === 0) return;
        
        var snapshot = {
            data: JSON.parse(JSON.stringify(currentData)),
            lastUpdated: rangeDesc,
            timestamp: Date.now()
        };
        NR.state.currentBookData[historyKey].push(snapshot);
    };
    
    // 一键保存所有数据时保存快照
    NR.saveAllDataSnapshot = function(rangeDesc) {
        // 保存全局数据快照
        if (NR.state.currentBookData.globalData) {
            if (!NR.state.currentBookData.globalDataHistory) {
                NR.state.currentBookData.globalDataHistory = [];
            }
            NR.state.currentBookData.globalDataHistory.push(NR.state.currentBookData.globalData);
        }
        
        // 保存主角数据快照
        if (NR.state.currentBookData.protagonistInfo) {
            if (!NR.state.currentBookData.protagonistHistory) {
                NR.state.currentBookData.protagonistHistory = [];
            }
            NR.state.currentBookData.protagonistHistory.push(NR.state.currentBookData.protagonistInfo);
        }
        
        // 保存各类列表数据的快照
        NR.saveListDataSnapshot('skills', rangeDesc);
        NR.saveListDataSnapshot('items', rangeDesc);
        NR.saveListDataSnapshot('quests', rangeDesc);
        NR.saveListDataSnapshot('locations', rangeDesc);
        NR.saveListDataSnapshot('equipments', rangeDesc);
        NR.saveListDataSnapshot('factions', rangeDesc);
        NR.saveListDataSnapshot('intels', rangeDesc);
        // 保存NPC快照
        NR.saveNPCSnapshot(rangeDesc);
    };

    // 显示一键生成的表单弹窗（旧版兼容，重定向到新函数）
    // NR.showAllCharactersFormModal 已在上面定义为 NR.showAllDataFormModal 的别名


    // 构建主角信息提示词
    NR.buildProtagonistPrompt = function(text) {
        var existingInfo = NR.state.currentBookData.protagonistInfo;
        var existingContext = '';
        if (existingInfo) {
            existingContext = '\n\n已有的主角信息（请在此基础上补充或更新）：\n' + JSON.stringify(existingInfo, null, 2);
        }

        return '请从以下文本中提取主角（第一人称视角的角色或故事主要角色）的信息，以JSON格式返回。' +
            '\n\n需要提取的字段：' +
            '\n- name: 人物名称' +
            '\n- genderAge: 性别/年龄（如"男/25岁"）' +
            '\n- occupation: 职业/身份' +
            '\n- location: 所在地点' +
            '\n- inScene: 在场状态（"在场"/"离场"/"未知"）' +
            '\n- appearance: 外貌特征' +
            '\n- items: 持有的重要物品' +
            '\n- history: 过往经历' +
            '\n- personality: 性格特点' +
            '\n- baseAttributes: 基础属性（格式：属性名:数值;属性名:数值，数值范围0-100，如"力量:60;敏捷:70;体质:50;智力:80;感知:65;魅力:55"）' +
            '\n- specialAttributes: 特有属性（角色独特的能力或特质，格式同上）' +
            '\n- relationships: 人际关系（格式：角色名:关系;角色名:关系，如"张三:朋友;李四:师父"）' +
            '\n\n如果某个字段在文本中没有明确信息，请填写"-"。' +
            '\n基础属性请根据文本描述合理推断数值，没有明确描述的属性默认50。' +
            existingContext +
            '\n\n---\n\n' + text +
            '\n\n请只返回JSON对象，不要包含其他文字。';
    };

    // 构建重要人物提示词
    NR.buildNPCPrompt = function(text) {
        var existingNPCs = NR.state.currentBookData.importantNPCs || [];
        var existingContext = '';
        if (existingNPCs.length > 0) {
            existingContext = '\n\n已有的重要人物信息（请在此基础上补充新人物或更新已有人物）：\n' + 
                JSON.stringify(existingNPCs.map(function(npc) { return npc.data; }), null, 2);
        }

        return '请从以下文本中提取所有重要人物（非主角）的信息，以JSON数组格式返回。' +
            '\n\n每个人物需要提取的字段：' +
            '\n- name: 姓名' +
            '\n- genderAge: 性别/年龄（如"女/20岁"）' +
            '\n- occupation: 职业/身份' +
            '\n- location: 所在地点' +
            '\n- inScene: 是否在场（"在场"/"离场"/"未知"）' +
            '\n- appearance: 外貌特征' +
            '\n- items: 持有的重要物品' +
            '\n- history: 过往经历' +
            '\n- personality: 性格特点' +
            '\n- baseAttributes: 基础属性（格式：属性名:数值;属性名:数值，数值范围0-100）' +
            '\n- specialAttributes: 特有属性（角色独特的能力或特质，格式同上）' +
            '\n- relationships: 人际关系（格式：角色名:关系;角色名:关系，如"主角:敌人;王五:同伴"）' +
            '\n\n如果某个字段在文本中没有明确信息，请填写"-"。' +
            '\n基础属性请根据文本描述合理推断数值，没有明确描述的属性默认50。' +
            existingContext +
            '\n\n---\n\n' + text +
            '\n\n请只返回JSON数组，不要包含其他文字。';
    };

    // 获取范围起点；无法解析时返回 Infinity，避免把后文误判为前文
    NR.getRangeStartForTimeline = function(rangeDesc) {
        var start = NR.parseRangeStartNumber ? NR.parseRangeStartNumber(rangeDesc) : Infinity;
        return isFinite(start) ? start : Infinity;
    };

    NR.sortTimelineModules = function(modules) {
        return (modules || []).slice().sort(function(a, b) {
            var rangeA = NR.getRangeStartForTimeline(a.range);
            var rangeB = NR.getRangeStartForTimeline(b.range);
            if (rangeA !== rangeB) return rangeA - rangeB;
            var orderA = typeof a.timeOrder === 'number' ? a.timeOrder : Infinity;
            var orderB = typeof b.timeOrder === 'number' ? b.timeOrder : Infinity;
            if (orderA !== orderB) return orderA - orderB;
            return (a.timestamp || 0) - (b.timestamp || 0);
        });
    };

    NR.normalizeTimelineEvent = function(event, rangeDesc, sourceTime) {
        event = event || {};
        return {
            id: event.id || ('tl_evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
            title: event.title || '剧情事件',
            summary: event.summary || '',
            detail: event.detail || event.details || event.summary || '',
            characters: Array.isArray(event.characters) ? event.characters : [],
            locations: Array.isArray(event.locations) ? event.locations : [],
            factions: Array.isArray(event.factions) ? event.factions : [],
            items: Array.isArray(event.items) ? event.items : [],
            impact: event.impact || '',
            foreshadowing: Array.isArray(event.foreshadowing) ? event.foreshadowing : [],
            sourceRange: event.sourceRange || rangeDesc,
            sourceTime: event.sourceTime || sourceTime || '',
            timestamp: event.timestamp || Date.now()
        };
    };

    NR.normalizeTimelineModules = function(data, rangeDesc) {
        data = data || {};
        var bookData = NR.state.currentBookData || {};
        var gd = bookData.globalData && bookData.globalData.data ? bookData.globalData.data : {};
        var sourceTime = gd.currentTime || gd.lastSceneTime || '';
        var rawModules = [];

        if (Array.isArray(data.modules)) {
            rawModules = data.modules;
        } else {
            rawModules = [{
                timeNode: data.timeNode || data.time || (rangeDesc + ' · 阶段1'),
                timeOrder: data.timeOrder,
                summary: data.summary || '',
                events: Array.isArray(data.events) ? data.events : []
            }];
        }

        return rawModules.map(function(module, moduleIndex) {
            module = module || {};
            var events = Array.isArray(module.events) ? module.events : [];
            return {
                range: module.range || rangeDesc,
                timeNode: module.timeNode || module.time || (rangeDesc + ' · 阶段' + (moduleIndex + 1)),
                timeOrder: typeof module.timeOrder === 'number' ? module.timeOrder : moduleIndex + 1,
                summary: module.summary || '',
                events: events.map(function(event) {
                    return NR.normalizeTimelineEvent(event, module.range || rangeDesc, module.sourceTime || sourceTime);
                }),
                timestamp: module.timestamp || Date.now()
            };
        }).filter(function(module) {
            return module.summary || module.events.length > 0;
        });
    };

    // 旧函数名兼容：返回第一个模块
    NR.normalizeTimelineData = function(data, rangeDesc) {
        return NR.normalizeTimelineModules(data, rangeDesc)[0] || {
            range: rangeDesc,
            timeNode: rangeDesc + ' · 阶段1',
            timeOrder: 1,
            summary: '',
            events: [],
            timestamp: Date.now()
        };
    };

    NR.isTimelineEventDuplicate = function(a, b) {
        if (!a || !b) return false;
        var titleA = (a.title || '').trim();
        var titleB = (b.title || '').trim();
        var summaryA = (a.summary || '').trim();
        var summaryB = (b.summary || '').trim();
        return titleA && titleA === titleB && summaryA === summaryB;
    };

    NR.saveTimelineModules = function(modules, rangeDesc, skipSave) {
        modules = modules || [];
        if (!modules.length) return 0;
        NR.state.currentBookData.timelines = NR.state.currentBookData.timelines || [];
        var savedCount = 0;

        modules.forEach(function(module) {
            module = NR.normalizeTimelineModules(module.modules ? module : { modules: [module] }, rangeDesc || module.range)[0];
            if (!module) return;
            var existing = NR.state.currentBookData.timelines.find(function(item) {
                var sameNode = item.timeNode && module.timeNode && item.timeNode === module.timeNode;
                var sameRange = item.range && module.range && item.range === module.range;
                return sameNode || (!item.timeNode && sameRange);
            });

            if (existing) {
                existing.timeNode = existing.timeNode || module.timeNode;
                existing.timeOrder = typeof existing.timeOrder === 'number' ? existing.timeOrder : module.timeOrder;
                existing.range = existing.range || module.range;
                if (module.summary) existing.summary = module.summary;
                existing.events = existing.events || [];
                module.events.forEach(function(event) {
                    var duplicate = existing.events.some(function(oldEvent) {
                        return NR.isTimelineEventDuplicate(oldEvent, event);
                    });
                    if (!duplicate) {
                        existing.events.push(event);
                        savedCount++;
                    }
                });
                existing.timestamp = Date.now();
            } else {
                NR.state.currentBookData.timelines.push(module);
                savedCount += module.events.length || 1;
            }
        });

        NR.state.currentBookData.timelines = NR.sortTimelineModules(NR.state.currentBookData.timelines);
        if (!skipSave) NR.saveBookData();
        return savedCount;
    };

    NR.formatTimelineModuleForPrompt = function(module, index) {
        var lines = [];
        var events = module.events || [];
        lines.push('【时间节点 ' + (index + 1) + '】' + (module.timeNode || module.range || '未知时间'));
        lines.push('范围：' + (module.range || '未知范围'));
        if (module.summary) lines.push('总览：' + module.summary);
        events.forEach(function(event, eventIndex) {
            lines.push((eventIndex + 1) + '. ' + (event.title || '剧情事件') + (event.summary ? '：' + event.summary : ''));
            if (event.impact) lines.push('   影响：' + event.impact);
            if (event.foreshadowing && event.foreshadowing.length) lines.push('   伏笔：' + event.foreshadowing.join('；'));
        });
        return lines.join('\n');
    };

    NR.formatCurrentDataForTimelineContext = function() {
        var parts = [];
        var bookData = NR.state.currentBookData || {};
        var globalData = bookData.globalData && bookData.globalData.data ? bookData.globalData.data : null;
        var protagonist = bookData.protagonistInfo && bookData.protagonistInfo.data ? bookData.protagonistInfo.data : null;

        if (globalData) {
            var globalLines = ['【当前全局数据】'];
            ['currentLocation', 'currentTime', 'lastSceneTime', 'elapsedTime'].forEach(function(key) {
                var field = (NR.GLOBAL_DATA_FIELDS || []).find(function(f) { return f.key === key; });
                if (globalData[key]) globalLines.push((field ? field.label : key) + '：' + globalData[key]);
            });
            if (globalLines.length > 1) parts.push(globalLines.join('\n'));
        }

        if (protagonist) {
            var protagonistLines = ['【当前主角信息】'];
            (NR.PROTAGONIST_FIELDS || []).forEach(function(field) {
                var val = protagonist[field.key];
                if (val && val !== '-') protagonistLines.push(field.label + '：' + val);
            });
            if (protagonistLines.length > 1) parts.push(protagonistLines.join('\n'));
        }

        var compactLists = [
            { title: '重要人物', data: bookData.importantNPCs || [], keys: ['name', 'occupation', 'location', 'inScene', 'relationship'] },
            { title: '任务事件', data: bookData.quests || [], keys: ['name', 'type', 'progress', 'description'] },
            { title: '世界地点', data: bookData.locations || [], keys: ['name', 'type', 'status', 'description'] },
            { title: '势力组织', data: bookData.factions || [], keys: ['name', 'type', 'attitude', 'description'] },
            { title: '重要情报', data: bookData.intels || [], keys: ['name', 'type', 'content', 'status'] }
        ];

        compactLists.forEach(function(group) {
            if (!group.data.length) return;
            var lines = ['【当前' + group.title + '】'];
            group.data.slice(0, 20).forEach(function(item) {
                var data = item && item.data ? item.data : item;
                if (!data || !data.name) return;
                var chunks = group.keys.map(function(key) { return data[key]; }).filter(Boolean);
                if (chunks.length) lines.push('- ' + chunks.join(' / '));
            });
            if (lines.length > 1) parts.push(lines.join('\n'));
        });

        return parts.join('\n\n');
    };

    NR.getPreviousRecordsByRange = function(records, rangeDesc, rangeKey) {
        var currentStart = NR.getRangeStartForTimeline(rangeDesc);
        records = records || [];
        if (!isFinite(currentStart)) {
            return records.slice().sort(function(a, b) {
                return (a.timestamp || 0) - (b.timestamp || 0);
            });
        }
        return records.filter(function(item) {
            var itemStart = NR.getRangeStartForTimeline(item[rangeKey] || item.range || item.sourceRange);
            return isFinite(itemStart) && itemStart < currentStart;
        }).sort(function(a, b) {
            return NR.getRangeStartForTimeline(a[rangeKey] || a.range || a.sourceRange) - NR.getRangeStartForTimeline(b[rangeKey] || b.range || b.sourceRange);
        });
    };

    NR.buildTimelineUpdateContext = function(rangeDesc, manualContext) {
        var parts = [];
        var bookData = NR.state.currentBookData || {};
        var currentDataText = NR.formatCurrentDataForTimelineContext();
        if (currentDataText) parts.push(currentDataText);

        var previousTimelines = NR.getPreviousRecordsByRange(bookData.timelines || [], rangeDesc, 'range');
        if (previousTimelines.length) {
            parts.push('【之前剧情时间线】\n' + previousTimelines.map(NR.formatTimelineModuleForPrompt).join('\n\n---\n\n'));
        }

        var previousSummaries = NR.getPreviousRecordsByRange(bookData.summaries || [], rangeDesc, 'range');
        if (previousSummaries.length) {
            parts.push('【之前总结】\n' + previousSummaries.map(function(summary) {
                return '[' + (summary.range || '未知范围') + ']\n' + (summary.text || '');
            }).join('\n\n---\n\n'));
        }

        if (manualContext) {
            parts.push('【用户额外选择的上下文】\n' + manualContext);
        }

        return parts.join('\n\n==========\n\n');
    };

    // 构建剧情时间线提示词
    NR.buildTimelinePrompt = function(text, rangeDesc, context) {
        context = context || '';
        return '你是一个小说剧情时间线整理助手。请把用户给出的小说片段整理成自上往下的连续时间模块，用于长篇阅读回顾和防剧透查询。\n\n' +
            '输出要求：\n' +
            '1. 只基于给定原文和参考上下文，不要补充后文信息。\n' +
            '2. 参考全局数据里的当前时间、上轮场景时间、经过时间，判断本次剧情属于哪个时间节点。\n' +
            '3. 参考之前剧情时间线和之前总结，承接已有事件、人物关系、任务进展和伏笔，但不要重复旧事件。\n' +
            '4. timeNode 必须是连续时间坐标，不是事件标题，也不是单纯场景标题。推荐格式："第N章 · 阶段M · 时间描述（场景/状态）"，例如 "第1章 · 阶段1 · 黄昏至暴雨（异梦）"、"第1章 · 阶段2 · 公测前数日早晨（宿舍醒来）"。\n' +
            '5. 不要一个事件拆一个模块。同一连续时间段、同一场景阶段、同一段行动链中的多个事件必须放在同一个 module.events 里。\n' +
            '6. 只有出现明确断点时才拆新 module：跨天/跨时段、梦境与现实切换、长时间跳跃、主要地点切换、叙事阶段切换。\n' +
            '7. 单章通常输出 1-3 个 modules；多章按真实时间阶段输出，不按每个事件机械拆分。每个 module 尽量包含 2-5 个关键事件；如果某阶段确实只有一个关键事件，可以只有 1 个。\n' +
            '8. 事件按剧情发生顺序排列，重点保留主线推进、人物行动、地点变化、关系变化、伏笔和未解决问题。\n' +
            '9. 直接返回 JSON 对象，不要包含 Markdown 或解释文字。\n\n' +
            'JSON 格式：\n' +
            '{\n' +
            '  "modules": [\n' +
            '    {\n' +
            '      "timeNode": "连续时间坐标，例如 第1章 · 阶段1 · 黄昏至暴雨（异梦）",\n' +
            '      "timeOrder": 1,\n' +
            '      "summary": "该时间节点总览，80字以内",\n' +
            '      "events": [\n' +
            '        {\n' +
            '          "title": "事件标题",\n' +
            '          "summary": "事件概述",\n' +
            '          "detail": "事件详情，写清起因、经过、结果",\n' +
            '          "characters": ["相关人物"],\n' +
            '          "locations": ["相关地点"],\n' +
            '          "factions": ["相关势力"],\n' +
            '          "items": ["相关物品/技能/线索"],\n' +
            '          "impact": "对后续剧情、任务或人物关系的影响",\n' +
            '          "foreshadowing": ["伏笔或未解决问题"]\n' +
            '        }\n' +
            '      ]\n' +
            '    }\n' +
            '  ]\n' +
            '}\n\n' +
            (context ? '【参考上下文】\n' + context + '\n\n' : '') +
            '【本次范围】\n' + rangeDesc + '\n\n' +
            '【本次原文】\n' + text + '\n\n' +
            '请只返回 JSON 对象。';
    };

    // 生成剧情时间线
    NR.generateTimeline = function(text, rangeDesc, context) {
        if (!text || !text.trim()) {
            alert('选定范围内无内容可供生成时间线。');
            return;
        }

        NR.els['app-loader'].classList.remove('hidden');
        NR.els['app-loader'].querySelector('span').textContent = '正在生成剧情时间线...';

        var timelineContext = NR.buildTimelineUpdateContext(rangeDesc, context);
        var prompt = NR.buildTimelinePrompt(text, rangeDesc, timelineContext);
        return NR.callAIForForm(prompt).then(function(data) {
            var modules = NR.normalizeTimelineModules(data, rangeDesc);
            var savedCount = NR.saveTimelineModules(modules, rangeDesc);
            NR.renderEmbeddedDataBrowserTab('timeline');
            alert('剧情时间线已生成，更新 ' + savedCount + ' 个事件。');
        }).catch(function(err) {
            console.error('生成剧情时间线失败:', err);
            alert('生成剧情时间线时出错: ' + err.message);
        }).finally(function() {
            NR.els['app-loader'].classList.add('hidden');
            NR.els['app-loader'].querySelector('span').textContent = '正在加载...';
        });
    };

    // 调用AI接口
    NR.callAIForForm = function(prompt) {
        var apiUrl = NR.state.aiSettings.apiUrl || '';
        apiUrl = apiUrl.replace(/\/+$/, '');
        if (!apiUrl.endsWith('/chat/completions')) {
            apiUrl += '/chat/completions';
        }

        console.log('[AI数据库] 请求URL:', apiUrl);
        console.log('[AI数据库] 使用模型:', NR.state.aiSettings.modelName);

        return fetch(apiUrl, {
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
            console.log('[AI数据库] 收到响应，状态:', res.status);
            if (!res.ok) {
                return res.text().then(function(errText) {
                    throw new Error('API 请求失败: ' + res.status + ' ' + errText);
                });
            }
            return res.json();
        }).then(function(data) {
            console.log('[AI数据库] 解析响应成功');
            var content = data.choices[0].message.content;
            console.log('[AI数据库] AI返回内容长度:', content.length);
            try {
                var parsed = JSON.parse(content);
                console.log('[AI数据库] JSON解析成功');
                return parsed;
            } catch (e) {
                console.log('[AI数据库] JSON解析失败，尝试提取...');
                // 尝试提取JSON
                var jsonMatch = content.match(/[\[\{][\s\S]*[\]\}]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw new Error('AI未返回有效的JSON格式');
            }
        });
    };

    // 显示主角信息表单弹窗
    NR.showProtagonistFormModal = function(data, rangeDesc) {
        var existingModal = document.getElementById('protagonist-form-modal');
        if (existingModal) existingModal.remove();

        var formHtml = NR.buildFormFields(NR.PROTAGONIST_FIELDS, data);
        
        var modalHtml = 
            '<div id="protagonist-form-modal" class="modal character-form-modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>📋 主角信息表</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="character-form-container">' +
                        '<p class="form-hint">来源: ' + NR.escapeHtml(rangeDesc) + '</p>' +
                        formHtml +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-save-protagonist" class="control-button">保存主角信息</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('protagonist-form-modal');
        var closeBtn = modal.querySelector('.close-button');
        var saveBtn = document.getElementById('btn-save-protagonist');

        closeBtn.addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        saveBtn.addEventListener('click', function() {
            var formData = NR.collectFormData(modal, NR.PROTAGONIST_FIELDS);
            if (!formData.name || formData.name === '-') {
                alert('人物名称不能为空');
                return;
            }
            NR.saveProtagonistData(formData, rangeDesc);
            alert('主角信息已保存！');
            modal.remove();
        });

        // 初始化键值对编辑器
        NR.initKeyValueEditors(modal);
    };


    // 显示重要人物表单弹窗
    NR.showNPCFormModal = function(data, rangeDesc) {
        var existingModal = document.getElementById('npc-form-modal');
        if (existingModal) existingModal.remove();

        // 确保data是数组
        var npcs = Array.isArray(data) ? data : [data];
        
        var cardsHtml = '';
        npcs.forEach(function(npc, index) {
            if (!npc || !npc.name || npc.name === '-') return;
            var formHtml = NR.buildFormFields(NR.NPC_FIELDS, npc, 'npc-' + index);
            cardsHtml += 
                '<div class="npc-form-card" data-index="' + index + '">' +
                    '<div class="npc-form-header">' +
                        '<h3>' + NR.escapeHtml(npc.name) + '</h3>' +
                        '<button class="btn-save-single-npc control-button" data-index="' + index + '">保存此人物</button>' +
                    '</div>' +
                    formHtml +
                '</div>';
        });

        if (!cardsHtml) {
            cardsHtml = '<p class="no-npc-hint">在选定范围内未识别到重要人物信息。</p>';
        }

        var modalHtml = 
            '<div id="npc-form-modal" class="modal character-form-modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 900px;">' +
                    '<div class="modal-header">' +
                        '<h2>👥 重要人物表</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="npc-form-container">' +
                        '<p class="form-hint">来源: ' + NR.escapeHtml(rangeDesc) + '</p>' +
                        cardsHtml +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-save-all-npcs" class="control-button">保存全部人物</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('npc-form-modal');
        var closeBtn = modal.querySelector('.close-button');
        var saveAllBtn = document.getElementById('btn-save-all-npcs');

        closeBtn.addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        // 保存单个NPC
        modal.querySelectorAll('.btn-save-single-npc').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                var card = modal.querySelector('.npc-form-card[data-index="' + index + '"]');
                var formData = NR.collectFormData(card, NR.NPC_FIELDS, 'npc-' + index);
                if (!formData.name || formData.name === '-') {
                    alert('姓名不能为空');
                    return;
                }
                NR.saveNPCData(formData, rangeDesc);
                this.textContent = '已保存 ✓';
                this.disabled = true;
            });
        });

        // 保存全部NPC
        saveAllBtn.addEventListener('click', function() {
            var savedCount = 0;
            modal.querySelectorAll('.npc-form-card').forEach(function(card) {
                var index = parseInt(card.dataset.index);
                var formData = NR.collectFormData(card, NR.NPC_FIELDS, 'npc-' + index);
                if (formData.name && formData.name !== '-') {
                    NR.saveNPCData(formData, rangeDesc);
                    savedCount++;
                }
            });
            alert('已保存 ' + savedCount + ' 个人物！');
            modal.remove();
        });

        // 初始化键值对编辑器
        NR.initKeyValueEditors(modal);
    };

    // 合并表单数据（新数据覆盖旧数据，但"-"不覆盖有效值）
    NR.mergeFormData = function(oldData, newData) {
        var merged = {};
        // 先复制旧数据
        for (var key in oldData) {
            merged[key] = oldData[key];
        }
        // 用新数据覆盖，但"-"不覆盖有效值
        for (var key in newData) {
            var newVal = newData[key];
            var oldVal = merged[key];
            // 只有当新值不是"-"或空时才覆盖，或者旧值本身就是"-"或空
            if (newVal && newVal !== '-') {
                merged[key] = newVal;
            } else if (!oldVal || oldVal === '-') {
                merged[key] = newVal;
            }
        }
        return merged;
    };

    // 保存主角数据（合并模式，不自动保存历史，由saveAllDataSnapshot统一处理）
    NR.saveProtagonistData = function(formData, rangeDesc, skipHistory) {
        var finalData = formData;
        var existingInfo = NR.state.currentBookData.protagonistInfo;
        
        if (existingInfo && existingInfo.data) {
            // 合并新旧数据
            finalData = NR.mergeFormData(existingInfo.data, formData);
        }
        
        var newEntry = {
            data: finalData,
            lastUpdated: rangeDesc,
            timestamp: Date.now()
        };
        
        // 只有不跳过历史时才保存到历史
        if (!skipHistory) {
            if (!NR.state.currentBookData.protagonistHistory) {
                NR.state.currentBookData.protagonistHistory = [];
            }
            NR.state.currentBookData.protagonistHistory.push(newEntry);
        }
        
        // 更新当前数据
        NR.state.currentBookData.protagonistInfo = newEntry;
        NR.syncProtagonistToCharacterProfiles(finalData, rangeDesc);
        NR.saveBookData();
    };

    // 保存NPC数据（保留历史版本）
    NR.saveNPCData = function(formData, rangeDesc) {
        if (!NR.state.currentBookData.importantNPCs) {
            NR.state.currentBookData.importantNPCs = [];
        }

        // 查找是否已存在
        var existingIndex = NR.state.currentBookData.importantNPCs.findIndex(function(npc) {
            return npc.data.name === formData.name;
        });

        var finalData = formData;
        if (existingIndex > -1) {
            // 合并新旧数据
            var oldData = NR.state.currentBookData.importantNPCs[existingIndex].data;
            finalData = NR.mergeFormData(oldData, formData);
        }

        var npcRecord = {
            data: finalData,
            lastUpdated: rangeDesc,
            timestamp: Date.now()
        };

        if (existingIndex > -1) {
            // 更新已有记录
            NR.state.currentBookData.importantNPCs[existingIndex] = npcRecord;
        } else {
            // 添加新记录
            NR.state.currentBookData.importantNPCs.push(npcRecord);
        }

        // 同步到人物卡片系统
        NR.syncNPCToCharacterProfiles(finalData, rangeDesc);
        NR.saveBookData();
    };
    
    // 保存NPC列表快照到历史
    NR.saveNPCSnapshot = function(rangeDesc) {
        if (!NR.state.currentBookData.npcHistory) {
            NR.state.currentBookData.npcHistory = [];
        }
        // 深拷贝当前NPC列表
        var snapshot = {
            data: JSON.parse(JSON.stringify(NR.state.currentBookData.importantNPCs)),
            lastUpdated: rangeDesc,
            timestamp: Date.now()
        };
        NR.state.currentBookData.npcHistory.push(snapshot);
    };

    // 将主角信息同步到人物卡片系统
    NR.syncProtagonistToCharacterProfiles = function(formData, rangeDesc) {
        var profileData = NR.convertFormToProfile(formData);
        
        // 查找是否已存在（支持别名匹配）
        var existingIndex = NR.state.currentBookData.characterProfiles.findIndex(function(p) {
            if (p.name === formData.name) return true;
            if (p.aliases && p.aliases.indexOf(formData.name) !== -1) return true;
            return false;
        });

        if (existingIndex > -1) {
            // 更新已有人物，保留原有的aliases等
            var oldProfile = NR.state.currentBookData.characterProfiles[existingIndex];
            NR.state.currentBookData.characterProfiles[existingIndex] = {
                name: oldProfile.name,
                data: profileData,
                aliases: oldProfile.aliases || [],
                isProtagonist: true,
                isImportant: true,
                cover: oldProfile.cover,
                lastUpdated: rangeDesc
            };
        } else {
            // 新增人物，设为主角
            NR.state.currentBookData.characterProfiles.push({
                name: formData.name,
                data: profileData,
                aliases: [],
                isProtagonist: true,
                isImportant: true,
                cover: null,
                lastUpdated: rangeDesc
            });
        }
    };

    // 将NPC信息同步到人物卡片系统
    NR.syncNPCToCharacterProfiles = function(formData, rangeDesc) {
        var profileData = NR.convertFormToProfile(formData);
        
        // 查找是否已存在（支持别名匹配）
        var existingIndex = NR.state.currentBookData.characterProfiles.findIndex(function(p) {
            if (p.name === formData.name) return true;
            if (p.aliases && p.aliases.indexOf(formData.name) !== -1) return true;
            return false;
        });

        if (existingIndex > -1) {
            // 更新已有人物
            var oldProfile = NR.state.currentBookData.characterProfiles[existingIndex];
            NR.state.currentBookData.characterProfiles[existingIndex] = {
                name: oldProfile.name,
                data: profileData,
                aliases: oldProfile.aliases || [],
                isProtagonist: oldProfile.isProtagonist || false,
                isImportant: true,
                cover: oldProfile.cover,
                lastUpdated: rangeDesc
            };
        } else {
            // 新增人物
            NR.state.currentBookData.characterProfiles.push({
                name: formData.name,
                data: profileData,
                aliases: [],
                isProtagonist: false,
                isImportant: true,
                cover: null,
                lastUpdated: rangeDesc
            });
        }
    };

    // 将表单数据转换为人物卡片格式
    NR.convertFormToProfile = function(formData) {
        // 解析属性和关系
        var baseAttrs = NR.parseKeyValue(formData.baseAttributes);
        var specialAttrs = NR.parseKeyValue(formData.specialAttributes);
        var relationships = NR.parseKeyValue(formData.relationships);
        
        // 构建外貌描述
        var appearance = formData.appearance || '-';
        
        // 构建与主角关系描述
        var relationWithProtag = formData.relationWithProtagonist || '-';
        if (relationWithProtag === '-' && relationships.length > 0) {
            var protagRel = relationships.find(function(r) {
                return r.name === '主角' || r.name.indexOf('主角') !== -1;
            });
            if (protagRel) {
                relationWithProtag = protagRel.value;
            }
        }

        // 构建能力描述
        var ability = formData.ability || '-';
        if (ability === '-' && specialAttrs.length > 0) {
            ability = specialAttrs.map(function(a) { return a.name + '(' + a.value + ')'; }).join(', ');
        }

        return {
            '姓名': formData.name || '-',
            '性别': formData.gender || '-',
            '年龄': formData.age || '-',
            '种族': formData.race || '-',
            '身份': formData.occupation || '-',
            '地点': formData.location || '-',
            '在场状态': formData.inScene || '未知',
            '外貌': appearance,
            '衣着': formData.clothing || '-',
            '物品': formData.items || '-',
            '能力': ability,
            '目的': formData.purpose || '-',
            '组织': formData.organization || '-',
            '健康': formData.health || '-',
            '爱好': formData.hobby || '-',
            '与主角关系': relationWithProtag,
            '性格特点': formData.personality || '-',
            '过往经历': formData.history || '-',
            '基础属性': formData.baseAttributes || '-',
            '特有属性': formData.specialAttributes || '-',
            '人际关系': formData.relationships || '-'
        };
    };

    // 构建表单字段HTML
    NR.buildFormFields = function(fields, data, prefix) {
        prefix = prefix || '';
        var html = '<div class="form-fields-grid">';
        
        fields.forEach(function(field) {
            var value = data[field.key] || '-';
            var inputId = prefix ? prefix + '-' + field.key : field.key;
            var inputHtml = '';

            if (field.type === 'textarea') {
                inputHtml = '<textarea id="form-' + inputId + '" class="form-textarea">' + NR.escapeHtml(value) + '</textarea>';
            } else if (field.type === 'select') {
                inputHtml = '<select id="form-' + inputId + '" class="form-select">';
                field.options.forEach(function(opt) {
                    var selected = value === opt ? ' selected' : '';
                    inputHtml += '<option value="' + opt + '"' + selected + '>' + opt + '</option>';
                });
                inputHtml += '</select>';
            } else if (field.type === 'keyvalue') {
                inputHtml = NR.buildKeyValueEditor(inputId, value, field.placeholder);
            } else {
                inputHtml = '<input type="text" id="form-' + inputId + '" class="form-input" value="' + NR.escapeHtml(value) + '">';
            }

            var fieldClass = 'form-field';
            if (field.type === 'textarea' || field.type === 'keyvalue') {
                fieldClass += ' full-width';
            }

            html += '<div class="' + fieldClass + '">' +
                '<label for="form-' + inputId + '">' + field.label + (field.required ? ' *' : '') + '</label>' +
                inputHtml +
            '</div>';
        });

        html += '</div>';
        return html;
    };

    // 构建键值对编辑器
    NR.buildKeyValueEditor = function(inputId, value, placeholder) {
        var pairs = NR.parseKeyValue(value);
        var pairsHtml = '';
        
        if (pairs.length > 0) {
            pairs.forEach(function(pair, idx) {
                pairsHtml += NR.buildKeyValuePairRow(inputId, idx, pair.name, pair.value);
            });
        } else {
            pairsHtml = NR.buildKeyValuePairRow(inputId, 0, '', '');
        }

        return '<div class="keyvalue-editor" id="kv-editor-' + inputId + '" data-field="' + inputId + '">' +
            '<div class="keyvalue-pairs">' + pairsHtml + '</div>' +
            '<button type="button" class="btn-add-pair control-button">+ 添加</button>' +
            '<input type="hidden" id="form-' + inputId + '" value="' + NR.escapeHtml(value) + '">' +
            '<p class="keyvalue-hint">' + (placeholder || '格式: 名称:值;名称:值') + '</p>' +
        '</div>';
    };

    // 构建单个键值对行
    NR.buildKeyValuePairRow = function(inputId, idx, name, value) {
        return '<div class="keyvalue-pair" data-idx="' + idx + '">' +
            '<input type="text" class="kv-name" placeholder="名称" value="' + NR.escapeHtml(name) + '">' +
            '<span class="kv-separator">:</span>' +
            '<input type="text" class="kv-value" placeholder="值" value="' + NR.escapeHtml(value) + '">' +
            '<button type="button" class="btn-remove-pair">&times;</button>' +
        '</div>';
    };


    // 初始化键值对编辑器事件
    NR.initKeyValueEditors = function(container) {
        container.querySelectorAll('.keyvalue-editor').forEach(function(editor) {
            var fieldId = editor.dataset.field;
            var pairsContainer = editor.querySelector('.keyvalue-pairs');
            var addBtn = editor.querySelector('.btn-add-pair');
            var hiddenInput = editor.querySelector('input[type="hidden"]');

            // 添加新行
            addBtn.addEventListener('click', function() {
                var idx = pairsContainer.querySelectorAll('.keyvalue-pair').length;
                pairsContainer.insertAdjacentHTML('beforeend', NR.buildKeyValuePairRow(fieldId, idx, '', ''));
                NR.updateKeyValueHidden(editor);
            });

            // 删除行和输入变化
            editor.addEventListener('click', function(e) {
                if (e.target.classList.contains('btn-remove-pair')) {
                    var pair = e.target.closest('.keyvalue-pair');
                    if (pairsContainer.querySelectorAll('.keyvalue-pair').length > 1) {
                        pair.remove();
                    } else {
                        pair.querySelector('.kv-name').value = '';
                        pair.querySelector('.kv-value').value = '';
                    }
                    NR.updateKeyValueHidden(editor);
                }
            });

            editor.addEventListener('input', function(e) {
                if (e.target.classList.contains('kv-name') || e.target.classList.contains('kv-value')) {
                    NR.updateKeyValueHidden(editor);
                }
            });
        });
    };

    // 更新键值对隐藏字段
    NR.updateKeyValueHidden = function(editor) {
        var pairs = [];
        editor.querySelectorAll('.keyvalue-pair').forEach(function(pair) {
            var name = pair.querySelector('.kv-name').value.trim();
            var value = pair.querySelector('.kv-value').value.trim();
            if (name && value) {
                pairs.push({ name: name, value: value });
            }
        });
        var hiddenInput = editor.querySelector('input[type="hidden"]');
        hiddenInput.value = NR.stringifyKeyValue(pairs);
    };

    // 收集表单数据
    NR.collectFormData = function(container, fields, prefix) {
        prefix = prefix || '';
        var data = {};
        
        fields.forEach(function(field) {
            var inputId = prefix ? prefix + '-' + field.key : field.key;
            var input = container.querySelector('#form-' + inputId);
            if (input) {
                data[field.key] = input.value.trim() || '-';
            }
        });

        return data;
    };

    // 显示主角信息详情 - 直接调用人物卡片详情界面
    NR.showProtagonistDetail = function() {
        NR.initCharacterFormData();
        
        // 从人物卡片中查找主角
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        var protagonist = characterProfiles.find(function(p) { return p.isProtagonist; });
        
        if (!protagonist) {
            alert('暂无主角信息，请先使用"人物填表"功能生成，或在人物卡片中设置主角。');
            return;
        }

        // 直接调用人物卡片详情界面
        NR.showCharacterDetail(protagonist.name);
    };

    // 将人物卡片数据转换为表单数据格式
    NR.convertProfileToFormData = function(profile) {
        var data = profile.data || {};
        return {
            name: profile.name || data['姓名'] || '-',
            genderAge: (data['性别'] && data['年龄']) ? (data['性别'] + '/' + data['年龄']) : (data['性别'] || data['年龄'] || '-'),
            occupation: data['身份'] || '-',
            location: data['地点'] || '-',
            inScene: data['在场状态'] || (data['健康'] === '离场' ? '离场' : '未知'),
            appearance: data['外貌'] || '-',
            items: data['物品'] || '-',
            history: data['过往经历'] || '-',
            personality: data['性格特点'] || '-',
            baseAttributes: data['基础属性'] || '-',
            specialAttributes: data['特有属性'] || '-',
            relationships: data['人际关系'] || '-'
        };
    };

    // 显示重要人物列表
    NR.showNPCList = function() {
        NR.initCharacterFormData();
        
        // 从人物卡片中查找重要人物（非主角）
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        var npcs = characterProfiles.filter(function(p) { 
            return p.isImportant && !p.isProtagonist; 
        });

        var existingModal = document.getElementById('npc-list-modal');
        if (existingModal) existingModal.remove();

        var listHtml = '';
        if (npcs.length === 0) {
            listHtml = '<p class="no-npc-hint">暂无重要人物信息，请先使用"人物填表"功能生成。</p>';
        } else {
            npcs.forEach(function(profile, index) {
                var data = NR.convertProfileToFormData(profile);
                var inSceneValue = data.inScene || '未知';
                var inSceneClass = inSceneValue === '在场' ? 'in-scene' : (inSceneValue === '离场' ? 'off-scene' : '');
                var color = NR.getCharacterColor(profile.name || '?', false);
                listHtml += 
                    '<div class="npc-list-card ' + inSceneClass + '" data-name="' + NR.escapeHtml(profile.name) + '">' +
                        '<div class="npc-card-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>' +
                        '<div class="npc-card-info">' +
                            '<h4>' + NR.escapeHtml(profile.name || '未知') + '</h4>' +
                            '<p>' + NR.escapeHtml(data.genderAge || '-') + '</p>' +
                            '<span class="npc-scene-badge">' + NR.escapeHtml(inSceneValue) + '</span>' +
                        '</div>' +
                        '<div class="npc-card-actions">' +
                            '<button class="btn-view-npc control-button" data-name="' + NR.escapeHtml(profile.name) + '">查看</button>' +
                            '<button class="btn-delete-npc control-button" data-name="' + NR.escapeHtml(profile.name) + '" style="background: var(--danger-color);">&times;</button>' +
                        '</div>' +
                    '</div>';
            });
        }

        var modalHtml = 
            '<div id="npc-list-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 700px;">' +
                    '<div class="modal-header">' +
                        '<h2>👥 重要人物列表</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="npc-list-container">' + listHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('npc-list-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        // 查看详情 - 直接调用统一的人物卡片详情界面
        modal.querySelectorAll('.btn-view-npc').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var name = this.dataset.name;
                modal.remove();
                NR.showCharacterDetail(name);
            });
        });

        // 删除
        modal.querySelectorAll('.btn-delete-npc').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var name = this.dataset.name;
                if (confirm('确定要删除"' + name + '"吗？')) {
                    // 从人物卡片中移除
                    var idx = characterProfiles.findIndex(function(p) { return p.name === name; });
                    if (idx > -1) {
                        characterProfiles.splice(idx, 1);
                    }
                    // 同时从旧的importantNPCs中移除
                    var oldNpcs = NR.state.currentBookData.importantNPCs || [];
                    var oldIdx = oldNpcs.findIndex(function(n) { return n.data && n.data.name === name; });
                    if (oldIdx > -1) {
                        oldNpcs.splice(oldIdx, 1);
                    }
                    NR.saveBookData();
                    modal.remove();
                    NR.showNPCList();
                }
            });
        });
    };


    // 显示NPC详情（通过名称）- 直接调用人物卡片详情界面
    NR.showNPCDetailByName = function(name) {
        // 直接调用统一的人物卡片详情界面
        NR.showCharacterDetail(name);
    };

    // 显示单个NPC编辑弹窗（通过名称）
    NR.showSingleNPCEditModalByName = function(name) {
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        var profile = characterProfiles.find(function(p) { return p.name === name; });
        if (!profile) return;

        var existingModal = document.getElementById('npc-edit-modal');
        if (existingModal) existingModal.remove();

        var data = NR.convertProfileToFormData(profile);
        var formHtml = NR.buildFormFields(NR.NPC_FIELDS, data, 'edit-npc');

        var modalHtml = 
            '<div id="npc-edit-modal" class="modal character-form-modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>✏️ 编辑人物</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="character-form-container">' + formHtml + '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-cancel-edit-npc" class="control-button">取消</button>' +
                        '<button id="btn-save-edit-npc" class="control-button" data-name="' + NR.escapeHtml(name) + '">保存</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('npc-edit-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        NR.initKeyValueEditors(modal);

        document.getElementById('btn-cancel-edit-npc').addEventListener('click', function() {
            modal.remove();
            NR.showNPCDetailByName(name);
        });

        document.getElementById('btn-save-edit-npc').addEventListener('click', function() {
            var charName = this.dataset.name;
            var formData = NR.collectFormData(modal, NR.NPC_FIELDS, 'edit-npc');
            if (!formData.name || formData.name === '-') {
                alert('姓名不能为空');
                return;
            }
            // 保存到characterProfiles
            NR.saveNPCData(formData, '手动编辑');
            alert('人物信息已更新！');
            modal.remove();
            NR.showNPCDetailByName(formData.name);
        });
    };

    // 构建详情视图
    NR.buildDetailView = function(fields, data) {
        var html = '<div class="detail-fields-grid">';
        
        fields.forEach(function(field) {
            if (field.key === 'name') return; // 名称已在头部显示
            
            var value = data[field.key] || '-';
            var displayValue = '';

            if (field.type === 'keyvalue' && value !== '-') {
                var pairs = NR.parseKeyValue(value);
                if (pairs.length > 0) {
                    displayValue = '<div class="keyvalue-display">';
                    pairs.forEach(function(pair) {
                        var isNumeric = !isNaN(pair.value);
                        if (isNumeric) {
                            var numVal = parseInt(pair.value);
                            var barWidth = Math.min(100, Math.max(0, numVal));
                            var barColor = numVal >= 70 ? '#4CAF50' : (numVal >= 40 ? '#FF9800' : '#f44336');
                            displayValue += '<div class="kv-item">' +
                                '<span class="kv-label">' + NR.escapeHtml(pair.name) + '</span>' +
                                '<div class="kv-bar-container">' +
                                    '<div class="kv-bar" style="width: ' + barWidth + '%; background: ' + barColor + ';"></div>' +
                                '</div>' +
                                '<span class="kv-num">' + NR.escapeHtml(pair.value) + '</span>' +
                            '</div>';
                        } else {
                            displayValue += '<span class="kv-tag">' + NR.escapeHtml(pair.name) + ': ' + NR.escapeHtml(pair.value) + '</span>';
                        }
                    });
                    displayValue += '</div>';
                } else {
                    displayValue = NR.escapeHtml(value);
                }
            } else {
                displayValue = NR.escapeHtml(value);
            }

            var fieldClass = 'detail-field';
            if (field.type === 'textarea' || field.type === 'keyvalue') {
                fieldClass += ' full-width';
            }

            html += '<div class="' + fieldClass + '">' +
                '<label>' + field.label + '</label>' +
                '<div class="detail-value">' + displayValue + '</div>' +
            '</div>';
        });

        html += '</div>';
        return html;
    };

    // 显示技能列表
    NR.showSkillList = function() {
        NR.initCharacterFormData();
        var skills = NR.state.currentBookData.skills || [];

        var existingModal = document.getElementById('skill-list-modal');
        if (existingModal) existingModal.remove();

        var listHtml = '';
        if (skills.length === 0) {
            listHtml = '<p class="no-data-hint">暂无技能数据，请先使用"开始填表"功能生成。</p>';
        } else {
            skills.forEach(function(skill, index) {
                var data = skill.data;
                listHtml += 
                    '<div class="data-list-card" data-index="' + index + '">' +
                        '<div class="data-card-icon">⚔️</div>' +
                        '<div class="data-card-info">' +
                            '<h4>' + NR.escapeHtml(data.name || '未知') + '</h4>' +
                            '<p>' + NR.escapeHtml(data.type || '-') + ' · ' + NR.escapeHtml(data.level || '-') + '</p>' +
                        '</div>' +
                        '<div class="data-card-actions">' +
                            '<button class="btn-view-data control-button" data-type="skill" data-index="' + index + '">查看</button>' +
                            '<button class="btn-delete-data control-button danger" data-type="skill" data-index="' + index + '">&times;</button>' +
                        '</div>' +
                    '</div>';
            });
        }

        var modalHtml = 
            '<div id="skill-list-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 600px;">' +
                    '<div class="modal-header">' +
                        '<h2>⚔️ 技能列表 (' + skills.length + ')</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="data-list-container">' + listHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        NR.bindDataListEvents(document.getElementById('skill-list-modal'), 'skill', skills);
    };

    // 显示背包物品列表
    NR.showItemList = function() {
        NR.initCharacterFormData();
        var items = NR.state.currentBookData.items || [];

        var existingModal = document.getElementById('item-list-modal');
        if (existingModal) existingModal.remove();

        var listHtml = '';
        if (items.length === 0) {
            listHtml = '<p class="no-data-hint">暂无物品数据，请先使用"开始填表"功能生成。</p>';
        } else {
            items.forEach(function(item, index) {
                var data = item.data;
                listHtml += 
                    '<div class="data-list-card" data-index="' + index + '">' +
                        '<div class="data-card-icon">🎒</div>' +
                        '<div class="data-card-info">' +
                            '<h4>' + NR.escapeHtml(data.name || '未知') + ' x' + NR.escapeHtml(data.count || '1') + '</h4>' +
                            '<p>' + NR.escapeHtml(data.category || '-') + '</p>' +
                        '</div>' +
                        '<div class="data-card-actions">' +
                            '<button class="btn-view-data control-button" data-type="item" data-index="' + index + '">查看</button>' +
                            '<button class="btn-delete-data control-button danger" data-type="item" data-index="' + index + '">&times;</button>' +
                        '</div>' +
                    '</div>';
            });
        }

        var modalHtml = 
            '<div id="item-list-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 600px;">' +
                    '<div class="modal-header">' +
                        '<h2>🎒 背包物品 (' + items.length + ')</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="data-list-container">' + listHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        NR.bindDataListEvents(document.getElementById('item-list-modal'), 'item', items);
    };

    // 显示任务列表
    NR.showQuestList = function() {
        NR.initCharacterFormData();
        var quests = NR.state.currentBookData.quests || [];

        var existingModal = document.getElementById('quest-list-modal');
        if (existingModal) existingModal.remove();

        var listHtml = '';
        if (quests.length === 0) {
            listHtml = '<p class="no-data-hint">暂无任务数据，请先使用"开始填表"功能生成。</p>';
        } else {
            quests.forEach(function(quest, index) {
                var data = quest.data;
                var typeIcon = data.type === '主线' ? '🔴' : (data.type === '支线' ? '🟡' : '⚪');
                listHtml += 
                    '<div class="data-list-card" data-index="' + index + '">' +
                        '<div class="data-card-icon">' + typeIcon + '</div>' +
                        '<div class="data-card-info">' +
                            '<h4>' + NR.escapeHtml(data.name || '未知') + '</h4>' +
                            '<p>' + NR.escapeHtml(data.type || '-') + ' · 进度: ' + NR.escapeHtml(data.progress || '-') + '</p>' +
                            '<p style="font-size: 0.85em; opacity: 0.7;">' + NR.escapeHtml((data.description || '-').substring(0, 50)) + (data.description && data.description.length > 50 ? '...' : '') + '</p>' +
                        '</div>' +
                        '<div class="data-card-actions">' +
                            '<button class="btn-view-data control-button" data-type="quest" data-index="' + index + '">查看</button>' +
                            '<button class="btn-delete-data control-button danger" data-type="quest" data-index="' + index + '">&times;</button>' +
                        '</div>' +
                    '</div>';
            });
        }

        var modalHtml = 
            '<div id="quest-list-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 700px;">' +
                    '<div class="modal-header">' +
                        '<h2>📜 任务与事件 (' + quests.length + ')</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="data-list-container">' + listHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        NR.bindDataListEvents(document.getElementById('quest-list-modal'), 'quest', quests);
    };

    // 绑定数据列表事件（通用）
    NR.bindDataListEvents = function(modal, type, dataArray) {
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        // 查看按钮
        modal.querySelectorAll('.btn-view-data[data-type="' + type + '"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                modal.remove();
                NR.showDataDetail(type, index);
            });
        });

        // 删除按钮
        modal.querySelectorAll('.btn-delete-data[data-type="' + type + '"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                var item = dataArray[index];
                if (confirm('确定要删除"' + item.data.name + '"吗？')) {
                    if (type === 'skill') {
                        NR.state.currentBookData.skills.splice(index, 1);
                    } else if (type === 'item') {
                        NR.state.currentBookData.items.splice(index, 1);
                    } else if (type === 'quest') {
                        NR.state.currentBookData.quests.splice(index, 1);
                    } else if (type === 'location') {
                        NR.state.currentBookData.locations.splice(index, 1);
                    } else if (type === 'equipment') {
                        NR.state.currentBookData.equipments.splice(index, 1);
                    } else if (type === 'faction') {
                        NR.state.currentBookData.factions.splice(index, 1);
                    } else if (type === 'intel') {
                        NR.state.currentBookData.intels.splice(index, 1);
                    }
                    NR.saveBookData();
                    modal.remove();
                    // 重新打开列表
                    if (type === 'skill') NR.showSkillList();
                    else if (type === 'item') NR.showItemList();
                    else if (type === 'quest') NR.showQuestList();
                    else if (type === 'location') NR.showLocationList();
                    else if (type === 'equipment') NR.showEquipmentList();
                    else if (type === 'faction') NR.showFactionList();
                    else if (type === 'intel') NR.showIntelList();
                }
            });
        });
    };

    // 显示数据详情（技能/物品/任务/地点/装备/势力/情报）
    NR.showDataDetail = function(type, index) {
        var dataArray, fields, title, icon, backFunc;
        
        if (type === 'skill') {
            dataArray = NR.state.currentBookData.skills || [];
            fields = NR.SKILL_FIELDS;
            title = '技能详情';
            icon = '⚔️';
            backFunc = NR.showSkillList;
        } else if (type === 'item') {
            dataArray = NR.state.currentBookData.items || [];
            fields = NR.ITEM_FIELDS;
            title = '物品详情';
            icon = '🎒';
            backFunc = NR.showItemList;
        } else if (type === 'quest') {
            dataArray = NR.state.currentBookData.quests || [];
            fields = NR.QUEST_FIELDS;
            title = '任务详情';
            icon = '📜';
            backFunc = NR.showQuestList;
        } else if (type === 'location') {
            dataArray = NR.state.currentBookData.locations || [];
            fields = NR.LOCATION_FIELDS;
            title = '地点详情';
            icon = '📍';
            backFunc = NR.showLocationList;
        } else if (type === 'equipment') {
            dataArray = NR.state.currentBookData.equipments || [];
            fields = NR.EQUIPMENT_FIELDS;
            title = '装备详情';
            icon = '🛡️';
            backFunc = NR.showEquipmentList;
        } else if (type === 'faction') {
            dataArray = NR.state.currentBookData.factions || [];
            fields = NR.FACTION_FIELDS;
            title = '势力详情';
            icon = '🏰';
            backFunc = NR.showFactionList;
        } else if (type === 'intel') {
            dataArray = NR.state.currentBookData.intels || [];
            fields = NR.INTEL_FIELDS;
            title = '情报详情';
            icon = '🔍';
            backFunc = NR.showIntelList;
        }

        var record = dataArray[index];
        if (!record) return;

        var existingModal = document.getElementById('data-detail-modal');
        if (existingModal) existingModal.remove();

        var data = record.data;
        var detailHtml = NR.buildDetailView(fields, data);

        var modalHtml = 
            '<div id="data-detail-modal" class="modal character-detail-modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>' + icon + ' ' + title + '</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="character-detail-body">' +
                        '<div class="detail-header-info">' +
                            '<div class="detail-avatar" style="font-size: 1.5em;">' + icon + '</div>' +
                            '<div class="detail-title">' +
                                '<h3>' + NR.escapeHtml(data.name || '未知') + '</h3>' +
                                '<p class="detail-updated">最后更新: ' + NR.escapeHtml(record.lastUpdated || '未知') + '</p>' +
                            '</div>' +
                        '</div>' +
                        detailHtml +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-back-to-list" class="control-button">返回列表</button>' +
                        '<button id="btn-delete-detail" class="control-button" style="background: var(--danger-color); color: white;">删除</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('data-detail-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        document.getElementById('btn-back-to-list').addEventListener('click', function() {
            modal.remove();
            backFunc();
        });

        document.getElementById('btn-delete-detail').addEventListener('click', function() {
            if (confirm('确定要删除"' + data.name + '"吗？')) {
                dataArray.splice(index, 1);
                NR.saveBookData();
                modal.remove();
                backFunc();
            }
        });
    };

    // 显示全局数据详情
    NR.showGlobalDataDetail = function() {
        NR.initCharacterFormData();
        var info = NR.state.currentBookData.globalData;
        
        var existingModal = document.getElementById('global-data-detail-modal');
        if (existingModal) existingModal.remove();

        var data = info ? info.data : { currentLocation: '-', currentTime: '-', lastSceneTime: '-', elapsedTime: '-' };
        var detailHtml = NR.buildDetailView(NR.GLOBAL_DATA_FIELDS, data);

        var modalHtml = 
            '<div id="global-data-detail-modal" class="modal character-detail-modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>🌍 全局数据</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="character-detail-body">' +
                        '<div class="detail-header-info">' +
                            '<div class="detail-avatar" style="font-size: 1.5em;">🌍</div>' +
                            '<div class="detail-title">' +
                                '<h3>场景状态</h3>' +
                                '<p class="detail-updated">最后更新: ' + NR.escapeHtml(info ? info.lastUpdated : '未设置') + '</p>' +
                            '</div>' +
                        '</div>' +
                        detailHtml +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-edit-global" class="control-button">编辑</button>' +
                        (info ? '<button id="btn-delete-global" class="control-button" style="background: var(--danger-color); color: white;">清空</button>' : '') +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('global-data-detail-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        document.getElementById('btn-edit-global').addEventListener('click', function() {
            modal.remove();
            NR.showGlobalDataEditModal();
        });

        var deleteBtn = document.getElementById('btn-delete-global');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (confirm('确定要清空全局数据吗？')) {
                    NR.state.currentBookData.globalData = null;
                    NR.saveBookData();
                    modal.remove();
                    alert('全局数据已清空');
                }
            });
        }
    };

    // 显示全局数据编辑弹窗
    NR.showGlobalDataEditModal = function() {
        NR.initCharacterFormData();
        var info = NR.state.currentBookData.globalData;
        var data = info ? info.data : { currentLocation: '', currentTime: '', lastSceneTime: '', elapsedTime: '' };

        var existingModal = document.getElementById('global-data-edit-modal');
        if (existingModal) existingModal.remove();

        var formHtml = NR.buildFormFields(NR.GLOBAL_DATA_FIELDS, data, 'edit-global');

        var modalHtml = 
            '<div id="global-data-edit-modal" class="modal character-form-modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>✏️ 编辑全局数据</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="character-form-container">' + formHtml + '</div>' +
                    '<div class="modal-footer">' +
                        '<button id="btn-cancel-edit-global" class="control-button">取消</button>' +
                        '<button id="btn-save-edit-global" class="control-button">保存</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var modal = document.getElementById('global-data-edit-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        document.getElementById('btn-cancel-edit-global').addEventListener('click', function() {
            modal.remove();
            // 刷新内嵌数据浏览器的全局数据标签页
            NR.renderEmbeddedDataBrowserTab('global');
        });

        document.getElementById('btn-save-edit-global').addEventListener('click', function() {
            var formData = NR.collectFormData(modal, NR.GLOBAL_DATA_FIELDS, 'edit-global');
            NR.saveGlobalData(formData, '手动编辑');
            alert('全局数据已更新！');
            modal.remove();
            // 刷新内嵌数据浏览器的全局数据标签页
            NR.renderEmbeddedDataBrowserTab('global');
        });
    };

    // 显示地点列表
    NR.showLocationList = function() {
        NR.initCharacterFormData();
        var locations = NR.state.currentBookData.locations || [];

        var existingModal = document.getElementById('location-list-modal');
        if (existingModal) existingModal.remove();

        var listHtml = '';
        if (locations.length === 0) {
            listHtml = '<p class="no-data-hint">暂无地点数据，请先使用"开始填表"功能生成。</p>';
        } else {
            locations.forEach(function(loc, index) {
                var data = loc.data;
                var statusIcon = data.status === '可访问' ? '🟢' : (data.status === '已探索' ? '🔵' : (data.status === '已封锁' ? '🔴' : '⚪'));
                listHtml += 
                    '<div class="data-list-card" data-index="' + index + '">' +
                        '<div class="data-card-icon">📍</div>' +
                        '<div class="data-card-info">' +
                            '<h4>' + NR.escapeHtml(data.name || '未知') + ' ' + statusIcon + '</h4>' +
                            '<p>' + NR.escapeHtml(data.type || '-') + ' · ' + NR.escapeHtml(data.region || '-') + '</p>' +
                        '</div>' +
                        '<div class="data-card-actions">' +
                            '<button class="btn-view-data control-button" data-type="location" data-index="' + index + '">查看</button>' +
                            '<button class="btn-delete-data control-button danger" data-type="location" data-index="' + index + '">&times;</button>' +
                        '</div>' +
                    '</div>';
            });
        }

        var modalHtml = 
            '<div id="location-list-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 600px;">' +
                    '<div class="modal-header">' +
                        '<h2>📍 世界地点 (' + locations.length + ')</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="data-list-container">' + listHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        NR.bindDataListEvents(document.getElementById('location-list-modal'), 'location', locations);
    };

    // 显示装备列表
    NR.showEquipmentList = function() {
        NR.initCharacterFormData();
        var equipments = NR.state.currentBookData.equipments || [];

        var existingModal = document.getElementById('equipment-list-modal');
        if (existingModal) existingModal.remove();

        var listHtml = '';
        if (equipments.length === 0) {
            listHtml = '<p class="no-data-hint">暂无装备数据，请先使用"开始填表"功能生成。</p>';
        } else {
            equipments.forEach(function(eq, index) {
                var data = eq.data;
                var rarityColor = { '普通': '⚪', '优秀': '🟢', '稀有': '🔵', '史诗': '🟣', '传说': '🟠', '神话': '🔴' }[data.rarity] || '⚪';
                var equippedIcon = data.equipped === '已装备' ? '✅' : '';
                listHtml += 
                    '<div class="data-list-card" data-index="' + index + '">' +
                        '<div class="data-card-icon">🛡️</div>' +
                        '<div class="data-card-info">' +
                            '<h4>' + rarityColor + ' ' + NR.escapeHtml(data.name || '未知') + ' ' + equippedIcon + '</h4>' +
                            '<p>' + NR.escapeHtml(data.type || '-') + ' · ' + NR.escapeHtml(data.rarity || '-') + '</p>' +
                        '</div>' +
                        '<div class="data-card-actions">' +
                            '<button class="btn-view-data control-button" data-type="equipment" data-index="' + index + '">查看</button>' +
                            '<button class="btn-delete-data control-button danger" data-type="equipment" data-index="' + index + '">&times;</button>' +
                        '</div>' +
                    '</div>';
            });
        }

        var modalHtml = 
            '<div id="equipment-list-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 600px;">' +
                    '<div class="modal-header">' +
                        '<h2>🛡️ 装备 (' + equipments.length + ')</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="data-list-container">' + listHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        NR.bindDataListEvents(document.getElementById('equipment-list-modal'), 'equipment', equipments);
    };

    // 显示势力列表
    NR.showFactionList = function() {
        NR.initCharacterFormData();
        var factions = NR.state.currentBookData.factions || [];

        var existingModal = document.getElementById('faction-list-modal');
        if (existingModal) existingModal.remove();

        var listHtml = '';
        if (factions.length === 0) {
            listHtml = '<p class="no-data-hint">暂无势力数据，请先使用"开始填表"功能生成。</p>';
        } else {
            factions.forEach(function(fac, index) {
                var data = fac.data;
                var attitudeIcon = { '友好': '💚', '中立': '💛', '敌对': '❤️', '未知': '🤍' }[data.attitude] || '🤍';
                listHtml += 
                    '<div class="data-list-card" data-index="' + index + '">' +
                        '<div class="data-card-icon">🏰</div>' +
                        '<div class="data-card-info">' +
                            '<h4>' + NR.escapeHtml(data.name || '未知') + ' ' + attitudeIcon + '</h4>' +
                            '<p>' + NR.escapeHtml(data.type || '-') + ' · 领袖: ' + NR.escapeHtml(data.leader || '-') + '</p>' +
                        '</div>' +
                        '<div class="data-card-actions">' +
                            '<button class="btn-view-data control-button" data-type="faction" data-index="' + index + '">查看</button>' +
                            '<button class="btn-delete-data control-button danger" data-type="faction" data-index="' + index + '">&times;</button>' +
                        '</div>' +
                    '</div>';
            });
        }

        var modalHtml = 
            '<div id="faction-list-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 600px;">' +
                    '<div class="modal-header">' +
                        '<h2>🏰 势力/组织 (' + factions.length + ')</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="data-list-container">' + listHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        NR.bindDataListEvents(document.getElementById('faction-list-modal'), 'faction', factions);
    };

    // 显示情报列表
    NR.showIntelList = function() {
        NR.initCharacterFormData();
        var intels = NR.state.currentBookData.intels || [];

        var existingModal = document.getElementById('intel-list-modal');
        if (existingModal) existingModal.remove();

        var listHtml = '';
        if (intels.length === 0) {
            listHtml = '<p class="no-data-hint">暂无情报数据，请先使用"开始填表"功能生成。</p>';
        } else {
            intels.forEach(function(intel, index) {
                var data = intel.data;
                var reliabilityIcon = { '已证实': '✅', '可能真实': '🟡', '存疑': '🟠', '谣言': '❓' }[data.reliability] || '❓';
                var statusIcon = { '新获得': '🆕', '调查中': '🔍', '已利用': '✔️', '已过时': '⏰' }[data.status] || '';
                listHtml += 
                    '<div class="data-list-card" data-index="' + index + '">' +
                        '<div class="data-card-icon">🔍</div>' +
                        '<div class="data-card-info">' +
                            '<h4>' + NR.escapeHtml(data.name || '未知') + ' ' + reliabilityIcon + ' ' + statusIcon + '</h4>' +
                            '<p>' + NR.escapeHtml(data.type || '-') + ' · 来源: ' + NR.escapeHtml(data.source || '-') + '</p>' +
                            '<p style="font-size: 0.85em; opacity: 0.7;">' + NR.escapeHtml((data.content || '-').substring(0, 50)) + (data.content && data.content.length > 50 ? '...' : '') + '</p>' +
                        '</div>' +
                        '<div class="data-card-actions">' +
                            '<button class="btn-view-data control-button" data-type="intel" data-index="' + index + '">查看</button>' +
                            '<button class="btn-delete-data control-button danger" data-type="intel" data-index="' + index + '">&times;</button>' +
                        '</div>' +
                    '</div>';
            });
        }

        var modalHtml = 
            '<div id="intel-list-modal" class="modal" style="display: flex;">' +
                '<div class="modal-content" style="max-width: 700px;">' +
                    '<div class="modal-header">' +
                        '<h2>🔍 重要情报 (' + intels.length + ')</h2>' +
                        '<button class="close-button">&times;</button>' +
                    '</div>' +
                    '<div class="data-list-container">' + listHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        NR.bindDataListEvents(document.getElementById('intel-list-modal'), 'intel', intels);
    };

    // ========== 人物关系图功能 ==========
    
    // 显示人物关系图
    NR.showRelationshipGraph = function() {
        NR.initCharacterFormData();
        
        // 从人物卡片系统读取数据（统一数据源）
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        
        if (characterProfiles.length === 0) {
            alert('暂无人物数据，请先使用"人物填表"功能生成人物信息，或在人物卡片中添加人物。');
            return;
        }
        
        // 收集所有人物数据
        var nodes = [];
        var edges = [];
        var nodeMap = new Map();
        
        // 遍历所有人物卡片
        characterProfiles.forEach(function(profile) {
            if (!profile || !profile.name || profile.name === '-') return;
            
            var charName = profile.name;
            var data = profile.data || {};
            
            // 判断在场状态
            var inSceneValue = data['在场状态'] || data['健康'] || '未知';
            var isInScene = inSceneValue === '在场' || (inSceneValue !== '离场' && inSceneValue !== '未知');
            
            // 添加节点
            if (!nodeMap.has(charName)) {
                nodes.push({
                    name: charName,
                    isPlayer: profile.isProtagonist || false,
                    isInScene: isInScene,
                    x: 0,
                    y: 0,
                    radius: profile.isProtagonist ? 45 : 38
                });
                nodeMap.set(charName, nodes[nodes.length - 1]);
            }
            
            // 解析人际关系
            var relationshipsStr = data['人际关系'] || '';
            var relations = NR.parseKeyValue(relationshipsStr);
            
            relations.forEach(function(rel) {
                if (!rel.name || rel.name === '-') return;
                
                // 检查是否已有这条边
                var existingEdge = edges.find(function(e) {
                    return (e.source === charName && e.target === rel.name) ||
                           (e.source === rel.name && e.target === charName);
                });
                
                if (existingEdge) {
                    if (existingEdge.source === charName) {
                        if (existingEdge.labelsFromSource.indexOf(rel.value) === -1) {
                            existingEdge.labelsFromSource.push(rel.value);
                        }
                    } else {
                        if (existingEdge.labelsFromTarget.indexOf(rel.value) === -1) {
                            existingEdge.labelsFromTarget.push(rel.value);
                        }
                    }
                } else {
                    edges.push({
                        source: charName,
                        target: rel.name,
                        labelsFromSource: [rel.value],
                        labelsFromTarget: []
                    });
                }
                
                // 确保目标节点存在（如果关系指向的人物不在卡片中，也创建节点）
                if (!nodeMap.has(rel.name)) {
                    // 检查是否有对应的人物卡片
                    var targetProfile = characterProfiles.find(function(p) {
                        return p.name === rel.name || (p.aliases && p.aliases.indexOf(rel.name) !== -1);
                    });
                    
                    if (targetProfile) {
                        // 使用卡片中的数据
                        var targetData = targetProfile.data || {};
                        var targetInScene = targetData['在场状态'] || targetData['健康'] || '未知';
                        var targetIsInScene = targetInScene === '在场' || (targetInScene !== '离场' && targetInScene !== '未知');
                        
                        nodes.push({
                            name: targetProfile.name,
                            isPlayer: targetProfile.isProtagonist || false,
                            isInScene: targetIsInScene,
                            x: 0,
                            y: 0,
                            radius: targetProfile.isProtagonist ? 45 : 38
                        });
                        nodeMap.set(targetProfile.name, nodes[nodes.length - 1]);
                        // 同时映射别名
                        if (rel.name !== targetProfile.name) {
                            nodeMap.set(rel.name, nodes[nodes.length - 1]);
                        }
                    } else {
                        // 关系指向的人物不在卡片中，创建一个灰色节点
                        nodes.push({
                            name: rel.name,
                            isPlayer: false,
                            isInScene: false,
                            x: 0,
                            y: 0,
                            radius: 32,
                            isExternal: true  // 标记为外部人物（不在卡片中）
                        });
                        nodeMap.set(rel.name, nodes[nodes.length - 1]);
                    }
                }
            });
        });
        
        if (nodes.length === 0) {
            alert('暂无人物数据，请先使用"人物填表"功能生成人物信息。');
            return;
        }
        
        // 计算布局
        NR.calculateGraphLayout(nodes, edges, nodeMap);
        
        // 渲染关系图
        NR.renderRelationshipGraph(nodes, edges);
    };
    
    // 计算图布局（力导向算法简化版）
    NR.calculateGraphLayout = function(nodes, edges, nodeMap) {
        var width = 800;
        var height = 600;
        var centerX = width / 2;
        var centerY = height / 2;
        
        // 初始化位置
        nodes.forEach(function(node, index) {
            if (node.isPlayer) {
                node.x = centerX;
                node.y = centerY;
            } else {
                var angle = (2 * Math.PI * index) / nodes.length;
                var radius = 150 + Math.random() * 100;
                node.x = centerX + Math.cos(angle) * radius;
                node.y = centerY + Math.sin(angle) * radius;
            }
            node.vx = 0;
            node.vy = 0;
        });
        
        // 力导向迭代
        for (var iter = 0; iter < 200; iter++) {
            // 斥力（节点之间）
            for (var i = 0; i < nodes.length; i++) {
                for (var j = i + 1; j < nodes.length; j++) {
                    var dx = nodes[j].x - nodes[i].x;
                    var dy = nodes[j].y - nodes[i].y;
                    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    var force = 15000 / (dist * dist);
                    var fx = (dx / dist) * force;
                    var fy = (dy / dist) * force;
                    
                    if (!nodes[i].isPlayer) {
                        nodes[i].vx -= fx;
                        nodes[i].vy -= fy;
                    }
                    if (!nodes[j].isPlayer) {
                        nodes[j].vx += fx;
                        nodes[j].vy += fy;
                    }
                }
            }
            
            // 引力（边连接的节点）
            edges.forEach(function(edge) {
                var source = nodeMap.get(edge.source);
                var target = nodeMap.get(edge.target);
                if (!source || !target) return;
                
                var dx = target.x - source.x;
                var dy = target.y - source.y;
                var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                var force = (dist - 200) * 0.02;
                var fx = (dx / dist) * force;
                var fy = (dy / dist) * force;
                
                if (!source.isPlayer) {
                    source.vx += fx;
                    source.vy += fy;
                }
                if (!target.isPlayer) {
                    target.vx -= fx;
                    target.vy -= fy;
                }
            });
            
            // 向心力
            nodes.forEach(function(node) {
                if (node.isPlayer) return;
                var dx = centerX - node.x;
                var dy = centerY - node.y;
                node.vx += dx * 0.005;
                node.vy += dy * 0.005;
            });
            
            // 应用速度
            var damping = 0.8;
            nodes.forEach(function(node) {
                if (node.isPlayer) return;
                node.vx *= damping;
                node.vy *= damping;
                node.x += node.vx * 0.5;
                node.y += node.vy * 0.5;
                
                // 边界约束
                node.x = Math.max(60, Math.min(width - 60, node.x));
                node.y = Math.max(60, Math.min(height - 60, node.y));
            });
        }
    };
    
    // 渲染人物关系图
    NR.renderRelationshipGraph = function(nodes, edges) {
        var existingOverlay = document.querySelector('.relation-graph-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        var nodeScale = 1;
        var viewScale = 1;
        var panX = 0;
        var panY = 0;
        
        // 构建SVG内容
        var edgesHtml = '';
        var nodeMap = new Map();
        nodes.forEach(function(n) { nodeMap.set(n.name, n); });
        
        edges.forEach(function(edge, idx) {
            var source = nodeMap.get(edge.source);
            var target = nodeMap.get(edge.target);
            if (!source || !target) return;
            
            var dx = target.x - source.x;
            var dy = target.y - source.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            var ux = dx / dist;
            var uy = dy / dist;
            
            // 计算起点和终点（考虑节点半径）
            var x1 = source.x + ux * (source.radius + 8);
            var y1 = source.y + uy * (source.radius + 8);
            var x2 = target.x - ux * (target.radius + 8);
            var y2 = target.y - uy * (target.radius + 8);
            
            var hasSourceLabel = edge.labelsFromSource && edge.labelsFromSource.length > 0 && edge.labelsFromSource[0];
            var hasTargetLabel = edge.labelsFromTarget && edge.labelsFromTarget.length > 0 && edge.labelsFromTarget[0];
            
            var markerEnd = hasSourceLabel ? 'url(#arrowhead-end)' : '';
            var markerStart = hasTargetLabel ? 'url(#arrowhead-start)' : '';
            
            edgesHtml += '<line class="graph-edge" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
                (markerEnd ? ' marker-end="' + markerEnd + '"' : '') +
                (markerStart ? ' marker-start="' + markerStart + '"' : '') +
                ' data-edge-idx="' + idx + '" />';
            
            // 边标签
            var midX = (source.x + target.x) / 2;
            var midY = (source.y + target.y) / 2;
            var perpX = -uy;
            var perpY = ux;
            
            // 显示关系标签
            var allLabels = (edge.labelsFromSource || []).concat(edge.labelsFromTarget || []).filter(function(l) { return l; });
            var uniqueLabels = [];
            allLabels.forEach(function(l) {
                if (uniqueLabels.indexOf(l) === -1) uniqueLabels.push(l);
            });
            
            uniqueLabels.slice(0, 2).forEach(function(label, i) {
                var offset = (i === 0 ? 1 : -1) * 10;
                var lx = midX + perpX * offset;
                var ly = midY + perpY * offset;
                var displayLabel = label.length > 6 ? label.substring(0, 5) + '..' : label;
                edgesHtml += '<text class="graph-edge-label" x="' + lx + '" y="' + ly + '">' + NR.escapeHtml(displayLabel) + '</text>';
            });
        });
        
        var nodesHtml = '';
        nodes.forEach(function(node) {
            var firstChar = node.name.charAt(0);
            // 获取人物颜色（外部人物使用灰色）
            var color;
            if (node.isExternal) {
                color = { bg: '#9E9E9E', text: '#fff' };  // 灰色表示不在人物卡片中
            } else {
                color = NR.getCharacterColor(node.name, node.isPlayer);
            }
            // 只有明确标记为在场的NPC才显示在场指示器，主角不显示
            var inSceneIndicator = (node.isInScene === true && !node.isPlayer) ? 
                '<circle class="node-inscene-indicator" cx="' + (node.radius * 0.55) + '" cy="' + (-node.radius * 0.55) + '" r="6" />' : '';
            
            var nodeClass = 'graph-node';
            if (node.isPlayer) nodeClass += ' is-player';
            if (node.isExternal) nodeClass += ' is-external';
            
            nodesHtml += '<g class="' + nodeClass + '" data-name="' + NR.escapeHtml(node.name) + '" data-color="' + color.bg + '" transform="translate(' + node.x + ', ' + node.y + ')">' +
                '<circle class="node-circle" r="' + node.radius + '" style="fill: ' + color.bg + ';" />' +
                inSceneIndicator +
                '<text class="node-char" y="0" style="fill: ' + color.text + ';">' + NR.escapeHtml(firstChar) + '</text>' +
                '<text class="node-label" y="' + (node.radius + 14) + '">' + NR.escapeHtml(node.name) + '</text>' +
                '</g>';
        });
        
        var overlayHtml = 
            '<div class="relation-graph-overlay">' +
                '<div class="relation-graph-container">' +
                    '<div class="relation-graph-header">' +
                        '<div class="relation-graph-title">' +
                            '<span>🔗 人物关系图</span>' +
                            '<button class="graph-btn" id="graph-filter-inscene" title="只显示在场人物">📍</button>' +
                        '</div>' +
                        '<div class="relation-graph-actions">' +
                            '<button class="graph-btn" id="graph-refresh" title="刷新布局">🔄</button>' +
                            '<button class="graph-btn" id="graph-close" title="关闭">✕</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="relation-graph-canvas">' +
                        '<svg class="relation-graph-svg" viewBox="0 0 800 600">' +
                            '<defs>' +
                                '<marker id="arrowhead-end" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">' +
                                    '<polygon points="0 0, 8 3, 0 6" fill="#a89880" />' +
                                '</marker>' +
                                '<marker id="arrowhead-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto" markerUnits="strokeWidth">' +
                                    '<polygon points="8 0, 0 3, 8 6" fill="#a89880" />' +
                                '</marker>' +
                            '</defs>' +
                            '<g class="graph-transform">' +
                                '<g class="graph-edges">' + edgesHtml + '</g>' +
                                '<g class="graph-nodes">' + nodesHtml + '</g>' +
                            '</g>' +
                        '</svg>' +
                    '</div>' +
                    '<div class="relation-graph-footer">' +
                        '<button class="graph-btn" id="graph-reset" title="重置视图">🔄 重置</button>' +
                        '<div class="graph-control-group">' +
                            '<span>节点:</span>' +
                            '<div class="graph-stepper">' +
                                '<button id="node-size-dec">−</button>' +
                                '<span class="stepper-value" id="node-size-value">100%</span>' +
                                '<button id="node-size-inc">+</button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="graph-control-group">' +
                            '<span>视图:</span>' +
                            '<span id="view-scale-value">100%</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
        
        var overlay = document.querySelector('.relation-graph-overlay');
        var svg = overlay.querySelector('.relation-graph-svg');
        var transformGroup = overlay.querySelector('.graph-transform');
        var canvas = overlay.querySelector('.relation-graph-canvas');
        
        // 更新变换
        var updateTransform = function() {
            transformGroup.setAttribute('transform', 'translate(' + panX + ', ' + panY + ') scale(' + viewScale + ')');
            document.getElementById('view-scale-value').textContent = Math.round(viewScale * 100) + '%';
        };
        
        // 更新节点大小
        var updateNodeSize = function() {
            overlay.querySelectorAll('.graph-node').forEach(function(nodeEl) {
                var name = nodeEl.dataset.name;
                var node = nodeMap.get(name);
                if (!node) return;
                var newRadius = node.radius * nodeScale;
                nodeEl.querySelector('.node-circle').setAttribute('r', newRadius);
                nodeEl.querySelector('.node-label').setAttribute('y', newRadius + 14);
            });
            document.getElementById('node-size-value').textContent = Math.round(nodeScale * 100) + '%';
        };
        
        // 关闭按钮
        document.getElementById('graph-close').addEventListener('click', function() {
            overlay.remove();
        });
        
        // 点击遮罩关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
        });
        
        // 刷新布局
        document.getElementById('graph-refresh').addEventListener('click', function() {
            overlay.remove();
            NR.showRelationshipGraph();
        });
        
        // 重置视图
        document.getElementById('graph-reset').addEventListener('click', function() {
            viewScale = 1;
            panX = 0;
            panY = 0;
            nodeScale = 1;
            updateTransform();
            updateNodeSize();
        });
        
        // 节点大小控制
        document.getElementById('node-size-dec').addEventListener('click', function() {
            nodeScale = Math.max(0.5, nodeScale - 0.1);
            updateNodeSize();
        });
        
        document.getElementById('node-size-inc').addEventListener('click', function() {
            nodeScale = Math.min(2, nodeScale + 0.1);
            updateNodeSize();
        });
        
        // 鼠标滚轮缩放
        canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            var delta = e.deltaY > 0 ? 0.9 : 1.1;
            viewScale = Math.max(0.3, Math.min(3, viewScale * delta));
            updateTransform();
        });
        
        // 拖拽平移
        var isDragging = false;
        var lastX = 0;
        var lastY = 0;
        
        canvas.addEventListener('mousedown', function(e) {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            var dx = e.clientX - lastX;
            var dy = e.clientY - lastY;
            panX += dx;
            panY += dy;
            lastX = e.clientX;
            lastY = e.clientY;
            updateTransform();
        });
        
        document.addEventListener('mouseup', function() {
            isDragging = false;
        });
        
        // 触摸支持
        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
            }
        });
        
        canvas.addEventListener('touchmove', function(e) {
            if (!isDragging || e.touches.length !== 1) return;
            e.preventDefault();
            var dx = e.touches[0].clientX - lastX;
            var dy = e.touches[0].clientY - lastY;
            panX += dx;
            panY += dy;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            updateTransform();
        });
        
        canvas.addEventListener('touchend', function() {
            isDragging = false;
        });
        
        // 节点高亮
        overlay.querySelectorAll('.graph-node').forEach(function(nodeEl) {
            nodeEl.addEventListener('mouseenter', function() {
                var name = this.dataset.name;
                this.classList.add('highlighted');
                
                // 高亮相关边
                edges.forEach(function(edge, idx) {
                    if (edge.source === name || edge.target === name) {
                        var edgeEl = overlay.querySelector('.graph-edge[data-edge-idx="' + idx + '"]');
                        if (edgeEl) edgeEl.classList.add('highlighted');
                    }
                });
            });
            
            nodeEl.addEventListener('mouseleave', function() {
                this.classList.remove('highlighted');
                overlay.querySelectorAll('.graph-edge').forEach(function(el) {
                    el.classList.remove('highlighted');
                });
            });
            
            // 点击节点查看人物卡片
            nodeEl.addEventListener('click', function(e) {
                e.stopPropagation();
                var name = this.dataset.name;
                var node = nodeMap.get(name);
                
                // 检查是否在人物卡片中
                var characterProfiles = NR.state.currentBookData.characterProfiles || [];
                var profile = characterProfiles.find(function(p) { 
                    return p.name === name || (p.aliases && p.aliases.indexOf(name) !== -1);
                });
                
                if (profile) {
                    // 关闭关系图，打开人物卡片详情
                    overlay.remove();
                    NR.showCharacterDetail(profile.name);
                } else if (node && node.isExternal) {
                    // 外部人物，提示添加
                    if (confirm('人物"' + name + '"不在人物卡片中。\n是否要创建该人物的卡片？')) {
                        overlay.remove();
                        // 创建一个新的空白人物卡片
                        NR.createNewCharacterCard(name);
                    }
                }
            });
            
            // 添加点击样式
            nodeEl.style.cursor = 'pointer';
        });
        
        // 在场过滤
        var filterInScene = false;
        document.getElementById('graph-filter-inscene').addEventListener('click', function() {
            filterInScene = !filterInScene;
            this.classList.toggle('active', filterInScene);
            
            overlay.querySelectorAll('.graph-node').forEach(function(nodeEl) {
                var name = nodeEl.dataset.name;
                var node = nodeMap.get(name);
                if (!node) return;
                
                if (filterInScene && !node.isInScene && !node.isPlayer) {
                    nodeEl.style.opacity = '0.2';
                } else {
                    nodeEl.style.opacity = '1';
                }
            });
            
            overlay.querySelectorAll('.graph-edge').forEach(function(edgeEl) {
                var idx = parseInt(edgeEl.dataset.edgeIdx);
                var edge = edges[idx];
                if (!edge) return;
                
                var sourceNode = nodeMap.get(edge.source);
                var targetNode = nodeMap.get(edge.target);
                
                if (filterInScene) {
                    var sourceVisible = sourceNode && (sourceNode.isInScene || sourceNode.isPlayer);
                    var targetVisible = targetNode && (targetNode.isInScene || targetNode.isPlayer);
                    edgeEl.style.opacity = (sourceVisible && targetVisible) ? '0.6' : '0.1';
                } else {
                    edgeEl.style.opacity = '0.6';
                }
            });
        });
    };

    // 创建新的人物卡片
    NR.createNewCharacterCard = function(name) {
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        
        // 检查是否已存在
        var existing = characterProfiles.find(function(p) { return p.name === name; });
        if (existing) {
            NR.showCharacterDetail(name);
            return;
        }
        
        // 创建空白人物卡片
        var newProfile = {
            name: name,
            data: {
                '姓名': name,
                '身份': '-',
                '性别': '-',
                '种族': '-',
                '年龄': '-',
                '外貌': '-',
                '衣着': '-',
                '地点': '-',
                '物品': '-',
                '能力': '-',
                '目的': '-',
                '组织': '-',
                '健康': '正常',
                '爱好': '-',
                '与主角关系': '-',
                '性格特点': '-',
                '过往经历': '-',
                '基础属性': '-',
                '特有属性': '-',
                '人际关系': '-',
                '在场状态': '未知'
            },
            aliases: [],
            isProtagonist: false,
            isImportant: true,
            cover: null,
            lastUpdated: '手动创建'
        };
        
        characterProfiles.push(newProfile);
        NR.saveBookData();
        
        // 打开编辑界面
        NR.showCharacterDetail(name);
    };

    // ========== AI功能标签页渲染函数 ==========

    // 解析范围字符串中的起始数字用于排序
    NR.parseRangeStartNumber = function(rangeStr) {
        if (!rangeStr) return Infinity;
        var match = rangeStr.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : Infinity;
    };

    // 构建上下文列表项HTML
    NR.buildContextListItem = function(type, range, content, text, index) {
        return '<li class="context-list-item">' +
            '<label>' +
                '<span class="context-order-badge" style="display:none;"></span>' +
                '<input type="checkbox" class="context-checkbox" data-context-type="' + type + '" data-context-index="' + index + '" value="' + NR.escapeHtml(content) + '">' +
                '<div class="context-item-content">' +
                    '<strong>' + NR.escapeHtml(range) + '</strong>' +
                    '<div class="context-item-preview">' + NR.escapeHtml(text.substring(0, 80)) + '...</div>' +
                '</div>' +
            '</label>' +
        '</li>';
    };

    // 渲染剧情时间线标签页
    NR.renderTimelineTab = function() {
        var timelines = NR.sortTimelineModules(NR.state.currentBookData.timelines || []);
        
        var html = '<div class="ai-tab-content">';
        html += '<button id="btn-tab-generate-timeline" style="display:none;"></button>';
        html += '<div class="ai-tab-section">' +
            '<h4>🧭 剧情时间线 (' + timelines.length + ' 个时间节点)</h4>';
        
        if (timelines.length === 0) {
            html += '<p class="no-data-hint">暂无剧情时间线，使用顶部的选择范围生成结构化剧情节点</p>';
        } else {
            html += '<div class="timeline-linear-list">';
            timelines.forEach(function(item, idx) {
                var events = item.events || [];
                html += '<div class="timeline-module" data-type="timeline" data-index="' + idx + '">' +
                    '<div class="timeline-module-marker">' + (idx + 1) + '</div>' +
                    '<div class="timeline-module-body">' +
                        '<div class="timeline-module-header">' +
                            '<div>' +
                                '<h5>' + NR.escapeHtml(item.timeNode || item.range || '未知时间节点') + '</h5>' +
                                '<span>' + NR.escapeHtml(item.range || '未知范围') + ' · ' + events.length + ' 个事件</span>' +
                            '</div>' +
                            '<span class="history-item-time">' + NR.formatTimestamp(item.timestamp) + '</span>' +
                        '</div>' +
                        (item.summary ? '<div class="timeline-module-summary">' + NR.escapeHtml(item.summary) + '</div>' : '') +
                        '<div class="timeline-event-list">';
                if (events.length === 0) {
                    html += '<p class="no-data-hint">该时间节点暂无结构化事件</p>';
                } else {
                    events.forEach(function(event, eventIndex) {
                        html += '<button type="button" class="timeline-event-item" data-timeline-index="' + idx + '" data-event-index="' + eventIndex + '">' +
                            '<span class="timeline-event-index">' + (eventIndex + 1) + '</span>' +
                            '<span class="timeline-event-content">' +
                                '<strong>' + NR.escapeHtml(event.title || '剧情事件') + '</strong>' +
                                (event.summary ? '<small>' + NR.escapeHtml(event.summary) + '</small>' : '') +
                            '</span>' +
                        '</button>';
                    });
                }
                html += '</div>' +
                    '<div class="history-item-actions timeline-module-actions">' +
                        '<button class="action-btn btn-delete-history danger" data-type="timeline" data-timeline-index="' + idx + '">删除模块</button>' +
                    '</div>' +
                    '</div>' +
                '</div>';
            });
            html += '</div>';
        }
        
        html += '</div></div>';
        return html;
    };

    // 渲染总结标签页
    NR.renderSummaryTab = function() {
        var summaries = NR.state.currentBookData.summaries || [];
        
        var html = '<div class="ai-tab-content">';
        html += '<button id="btn-tab-generate-summary" style="display:none;"></button>';
        
        // 历史记录区域
        html += '<div class="ai-tab-section">' +
            '<h4>📚 总结历史 (' + summaries.length + ')</h4>';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，使用顶部的选择范围生成总结</p>';
        } else {
            html += '<div class="ai-history-list">';
            summaries.sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(item, idx) {
                var preview = (item.text || '').substring(0, 80);
                html += '<div class="ai-history-item" data-type="summary" data-index="' + idx + '">' +
                    '<div class="history-item-header">' +
                        '<span class="history-item-range">' + NR.escapeHtml(item.range || '未知范围') + '</span>' +
                        '<span class="history-item-time">' + NR.formatTimestamp(item.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="history-item-preview">' + NR.escapeHtml(preview) + '...</div>' +
                    '<div class="history-item-actions">' +
                        '<button class="action-btn btn-view-history" data-type="summary" data-timestamp="' + item.timestamp + '">查看</button>' +
                        '<button class="action-btn btn-delete-history danger" data-type="summary" data-timestamp="' + item.timestamp + '">删除</button>' +
                    '</div>' +
                '</div>';
            });
            html += '</div>';
        }
        
        html += '</div></div>';
        return html;
    };

    // 渲染行动选项列表
    NR.renderActionOptions = function(options) {
        var container = document.getElementById('action-options-list');
        if (!container) return;
        
        if (!options || options.length === 0) {
            container.innerHTML = '<p class="no-data-hint">未能生成行动选项，请重试</p>';
            return;
        }
        
        var html = '';
        var optionLabels = ['🎯 合理行动', '🚀 新场景', '💢 情绪化', '💕 NSFW事件'];
        options.forEach(function(option, idx) {
            var label = optionLabels[idx] || '选项' + (idx + 1);
            html += '<div class="action-option-item" data-index="' + idx + '">' +
                '<span class="action-option-label">' + label + '</span>' +
                '<span class="action-option-text">' + NR.escapeHtml(option) + '</span>' +
            '</div>';
        });
        
        container.innerHTML = html;
        
        // 绑定点击事件
        container.querySelectorAll('.action-option-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var idx = parseInt(this.dataset.index);
                var action = options[idx];
                if (action) {
                    // 高亮选中项
                    container.querySelectorAll('.action-option-item').forEach(function(i) {
                        i.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    
                    // 使用保存的上下文执行行动
                    var context = NR.state.currentActionContext || NR.buildAIFormContextForSequel();
                    NR.els['character-form-choice-modal'].style.display = 'none';
                    NR.executeActionOption(action, context);
                }
            });
        });
    };

    // 渲染续写标签页
    NR.renderSequelTab = function() {
        var sequels = NR.state.currentBookData.sequels || [];
        
        var html = '<div class="ai-tab-content">';
        html += '<button id="btn-tab-generate-sequel" style="display:none;"></button>';
        html += '<button id="btn-tab-generate-actions" style="display:none;"></button>';
        
        // 历史记录区域
        html += '<div class="ai-tab-section">' +
            '<h4>📚 续写历史 (' + sequels.length + ')</h4>';
        
        if (sequels.length === 0) {
            html += '<p class="no-data-hint">暂无续写历史，使用顶部选择范围生成续写</p>';
        } else {
            html += '<div class="ai-history-list">';
            sequels.sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(item, idx) {
                var preview = (item.content || '').substring(0, 80);
                html += '<div class="ai-history-item" data-type="sequel" data-index="' + idx + '">' +
                    '<div class="history-item-header">' +
                        '<span class="history-item-range">' + NR.escapeHtml(item.sourceRange || '未知范围') + '</span>' +
                        '<span class="history-item-time">' + NR.formatTimestamp(item.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="history-item-preview">' + NR.escapeHtml(preview) + '...</div>' +
                    '<div class="history-item-actions">' +
                        '<button class="action-btn btn-view-history" data-type="sequel" data-timestamp="' + item.timestamp + '">查看</button>' +
                        '<button class="action-btn btn-delete-history danger" data-type="sequel" data-timestamp="' + item.timestamp + '">删除</button>' +
                    '</div>' +
                '</div>';
            });
            html += '</div>';
        }
        
        html += '</div></div>';
        return html;
    };
    
    // 渲染翻译标签页
    NR.renderTranslationTab = function() {
        var translations = NR.state.currentBookData.translations || [];
        
        var html = '<div class="ai-tab-content">';
        html += '<button id="btn-tab-generate-translation" style="display:none;"></button>';
        
        // 历史记录区域
        html += '<div class="ai-tab-section">' +
            '<h4>📚 翻译历史 (' + translations.length + ')</h4>';
        
        if (translations.length === 0) {
            html += '<p class="no-data-hint">暂无翻译历史，使用顶部选择范围生成翻译</p>';
        } else {
            html += '<div class="ai-history-list">';
            translations.sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(item, idx) {
                var preview = (item.content || '').substring(0, 80);
                html += '<div class="ai-history-item" data-type="translation" data-index="' + idx + '">' +
                    '<div class="history-item-header">' +
                        '<span class="history-item-range">' + NR.escapeHtml(item.sourceRange || '未知范围') + '</span>' +
                        '<span class="history-item-time">' + NR.formatTimestamp(item.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="history-item-preview">' + NR.escapeHtml(preview) + '...</div>' +
                    '<div class="history-item-actions">' +
                        '<button class="action-btn btn-view-history" data-type="translation" data-timestamp="' + item.timestamp + '">查看</button>' +
                        '<button class="action-btn btn-delete-history danger" data-type="translation" data-timestamp="' + item.timestamp + '">删除</button>' +
                    '</div>' +
                '</div>';
            });
            html += '</div>';
        }
        
        html += '</div></div>';
        return html;
    };

    // 渲染生图标签页
    NR.renderSceneImageTab = function() {
        var sceneImages = NR.state.currentBookData.sceneImages || [];
        
        var html = '<div class="ai-tab-content">';
        html += '<button id="btn-tab-generate-scene-image" style="display:none;"></button>';
        
        // 历史记录区域
        html += '<div class="ai-tab-section">' +
            '<h4>📷 生图历史 (' + sceneImages.length + ')</h4>';
        
        if (sceneImages.length === 0) {
            html += '<p class="no-data-hint">暂无生图历史，使用顶部的选择范围生成场景图</p>';
        } else {
            html += '<div class="scene-image-gallery-mini">';
            sceneImages.sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(item, idx) {
                var rangeDesc = item.rangeDesc || item.sourceRange || '';
                // 使用data属性存储imageId，稍后异步加载
                html += '<div class="scene-image-thumb" data-index="' + idx + '" data-image-id="' + (item.imageId || '') + '">' +
                    '<img src="" alt="场景图" loading="lazy" style="background: var(--highlight-bg);">' +
                    '<div class="scene-image-thumb-overlay">' +
                        '<span>' + NR.escapeHtml(rangeDesc) + '</span>' +
                        '<div class="thumb-actions">' +
                            '<button class="action-btn btn-view-scene-image" data-index="' + idx + '">查看</button>' +
                            '<button class="action-btn btn-delete-scene-image danger" data-index="' + idx + '">删除</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            });
            html += '</div>';
        }
        
        html += '</div></div>';
        
        // 异步加载图片（在DOM渲染后执行）
        setTimeout(function() {
            var sortedImages = sceneImages.slice().sort(function(a, b) { return b.timestamp - a.timestamp; });
            sortedImages.forEach(function(item, idx) {
                NR.loadSceneImageData(item).then(function(imageData) {
                    if (imageData) {
                        var thumb = document.querySelector('.scene-image-thumb[data-index="' + idx + '"] img');
                        if (thumb) {
                            thumb.src = imageData;
                        }
                    }
                });
            });
        }, 100);
        
        return html;
    };

    // 格式化时间戳
    NR.formatTimestamp = function(timestamp) {
        if (!timestamp) return '未知时间';
        var date = new Date(timestamp);
        var month = date.getMonth() + 1;
        var day = date.getDate();
        var hours = date.getHours();
        var minutes = date.getMinutes();
        return month + '/' + day + ' ' + (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
    };

    // ========== 小手机聊天模块 ==========
    
    // 打开小手机聊天弹窗
    NR.openPhoneChatModal = function() {
        // 初始化状态
        if (!NR.state.phoneChatState) {
            NR.state.phoneChatState = {
                selectedCharacter: null,
                chatHistory: [],
                selectedContexts: [],
                userRole: null,
                currentScreen: 'home'
            };
        }
        
        // 确保 currentScreen 存在
        if (!NR.state.phoneChatState.currentScreen) {
            NR.state.phoneChatState.currentScreen = 'home';
        }
        
        // 从持久化存储加载用户角色设置（只在首次打开时加载）
        if (!NR.state.phoneChatState._userRoleLoaded) {
            if (NR.state.currentBookData.phoneUserRole) {
                NR.state.phoneChatState.userRole = NR.state.currentBookData.phoneUserRole;
            }
            NR.state.phoneChatState._userRoleLoaded = true;
        }
        
        var existingModal = document.getElementById('phone-chat-modal');
        if (existingModal) existingModal.remove();
        
        var modalHtml = 
            '<div id="phone-chat-modal" class="modal phone-chat-modal" style="display: flex;">' +
                '<div class="phone-modal-content">' +
                    NR.renderPhoneDevice() +
                '</div>' +
            '</div>';
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        var modal = document.getElementById('phone-chat-modal');
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
        
        NR.bindPhoneChatEvents();
    };
    
    // 获取用户角色显示名称
    NR.getUserRoleDisplayName = function() {
        var userRole = NR.state.phoneChatState.userRole;
        if (!userRole || userRole.type === 'default') {
            return '我';
        } else if (userRole.type === 'custom') {
            return userRole.customName || '我';
        } else if (userRole.type === 'character') {
            return userRole.selectedCharacterName || '我';
        }
        return '我';
    };

    // 获取用户头像HTML
    NR.getUserAvatarHtml = function() {
        var userRole = NR.state.phoneChatState.userRole;
        if (userRole && userRole.type === 'character' && userRole.selectedCharacterName) {
            // 使用选择的人物卡头像
            var profiles = NR.state.currentBookData.characterProfiles || [];
            var profile = profiles.find(function(p) { return p.name === userRole.selectedCharacterName; });
            if (profile && profile.cover) {
                return '<div class="phone-msg-avatar phone-msg-avatar-user" style="background-image: url(' + profile.cover + ');"></div>';
            } else if (profile) {
                var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                return '<div class="phone-msg-avatar phone-msg-avatar-user" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
            }
        }
        // 默认用户头像
        var displayName = NR.getUserRoleDisplayName();
        return '<div class="phone-msg-avatar phone-msg-avatar-user" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff;">' + NR.escapeHtml((displayName || '我')[0]) + '</div>';
    };
    
    // 获取用户角色信息（用于注入AI）
    NR.getUserRoleInfo = function() {
        var userRole = NR.state.phoneChatState.userRole;
        if (!userRole || userRole.type === 'default') {
            return '普通用户，没有特殊身份设定。';
        } else if (userRole.type === 'custom') {
            var info = '姓名: ' + (userRole.customName || '未设置');
            if (userRole.customIntro) {
                info += '\n人物介绍: ' + userRole.customIntro;
            }
            return info;
        } else if (userRole.type === 'character') {
            var profiles = NR.state.currentBookData.characterProfiles || [];
            var profile = profiles.find(function(p) { return p.name === userRole.selectedCharacterName; });
            if (profile) {
                return NR.getCharacterTagsInfo(profile);
            }
            return '选择的人物卡不存在。';
        }
        return '普通用户。';
    };
    
    // 手机主页应用列表（使用 Font Awesome 类名）
    NR.PHONE_HOME_APPS = [
        { id: 'chat', icon: 'fa-comments', name: '消息' },
        { id: 'forum', icon: 'fa-users', name: '论坛' },
        { id: 'dynamic', icon: 'fa-rss', name: '动态' },
        { id: 'map', icon: 'fa-map-marker-alt', name: '地图' },
        { id: 'music', icon: 'fa-music', name: '音乐' },
        { id: 'live', icon: 'fa-video', name: '直播' },
        { id: 'camera', icon: 'fa-camera', name: '相机' },
        { id: 'calendar', icon: 'fa-calendar-alt', name: '日历' },
        { id: 'diary', icon: 'fa-book', name: '日记' }
    ];
    
    // 手机底部 Dock 应用
    NR.PHONE_DOCK_APPS = [
        { id: 'phone-call', icon: 'fa-phone-alt', name: '电话' },
        { id: 'email', icon: 'fa-envelope', name: '邮箱' },
        { id: 'browser', icon: 'fa-globe', name: '浏览器' },
        { id: 'settings', icon: 'fa-cog', name: '设置' }
    ];
    
    // 获取当前日期字符串
    NR.getPhoneDateString = function() {
        var now = new Date();
        var month = now.getMonth() + 1;
        var day = now.getDate();
        var weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        var weekDay = weekDays[now.getDay()];
        return month + '月' + day + '日 ' + weekDay;
    };
    
    // 渲染手机主页
    NR.renderPhoneHomeScreen = function() {
        var html = '<div class="phone-home-screen">';
        
        // Widget 区域
        html += '<div class="phone-widget-container">';
        // 时钟 Widget
        html += '<div class="phone-widget phone-widget-clock">';
        html += '<div class="widget-time">' + NR.formatPhoneTime() + '</div>';
        html += '<div class="widget-date">' + NR.getPhoneDateString() + '</div>';
        html += '</div>';
        // 天气 Widget
        html += '<div class="phone-widget phone-widget-weather">';
        html += '<div class="widget-temp">25°C</div>';
        html += '<div class="widget-condition">晴</div>';
        html += '</div>';
        html += '</div>';
        
        // 应用图标网格
        html += '<div class="phone-app-grid">';
        NR.PHONE_HOME_APPS.forEach(function(app) {
            html += '<div class="phone-app-block" data-app-id="' + app.id + '">';
            html += '<div class="phone-app-icon"><i class="fas ' + app.icon + '"></i></div>';
            html += '<span class="phone-app-name">' + app.name + '</span>';
            html += '</div>';
        });
        html += '</div>';
        
        // 底部 Dock 栏
        html += '<div class="phone-bottom-bar">';
        NR.PHONE_DOCK_APPS.forEach(function(app) {
            html += '<div class="phone-dock-app" data-app-id="' + app.id + '">';
            html += '<div class="phone-dock-icon"><i class="fas ' + app.icon + '"></i></div>';
            html += '<span class="phone-dock-name">' + app.name + '</span>';
            html += '</div>';
        });
        html += '</div>';
        
        html += '</div>';
        return html;
    };
    
    // 渲染手机设置界面
    NR.renderPhoneSettingsScreen = function() {
        var userRole = NR.state.phoneChatState.userRole || { type: 'default', customName: '', customIntro: '', selectedCharacterName: null };
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        var userRoleDisplay = NR.getUserRoleDisplayName();
        
        var html = '<div class="phone-app-container">';
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">设置</span>';
        html += '<div class="phone-nav-right"></div>';
        html += '</div>';
        
        // 设置内容
        html += '<div class="phone-app-content phone-settings-content">';
        
        // 我的身份设置区域
        html += '<div class="phone-settings-section">';
        html += '<div class="phone-settings-header">👤 我的身份</div>';
        
        // 当前身份显示
        html += '<div class="phone-settings-current">';
        html += '<span class="settings-label">当前身份:</span>';
        html += '<span class="settings-value">' + NR.escapeHtml(userRoleDisplay) + '</span>';
        html += '</div>';
        
        // 角色类型选择
        html += '<div class="phone-settings-role-types">';
        
        html += '<label class="phone-settings-role-option' + (userRole.type === 'default' ? ' selected' : '') + '">';
        html += '<input type="radio" name="phone-user-role-type" value="default"' + (userRole.type === 'default' ? ' checked' : '') + '>';
        html += '<span class="role-icon">🙂</span>';
        html += '<span class="role-label">默认用户</span>';
        html += '</label>';
        
        html += '<label class="phone-settings-role-option' + (userRole.type === 'custom' ? ' selected' : '') + '">';
        html += '<input type="radio" name="phone-user-role-type" value="custom"' + (userRole.type === 'custom' ? ' checked' : '') + '>';
        html += '<span class="role-icon">✏️</span>';
        html += '<span class="role-label">自定义角色</span>';
        html += '</label>';
        
        html += '<label class="phone-settings-role-option' + (userRole.type === 'character' ? ' selected' : '') + '">';
        html += '<input type="radio" name="phone-user-role-type" value="character"' + (userRole.type === 'character' ? ' checked' : '') + '>';
        html += '<span class="role-icon">📋</span>';
        html += '<span class="role-label">使用人物卡</span>';
        html += '</label>';
        
        html += '</div>';
        
        // 自定义角色表单
        html += '<div class="phone-settings-custom-form" id="phone-settings-custom-form" style="display:' + (userRole.type === 'custom' ? 'block' : 'none') + ';">';
        html += '<div class="phone-settings-form-row">';
        html += '<label>名字</label>';
        html += '<input type="text" id="phone-settings-custom-name" class="phone-settings-input" placeholder="输入你的角色名字" value="' + NR.escapeHtml(userRole.customName || '') + '">';
        html += '</div>';
        html += '<div class="phone-settings-form-row">';
        html += '<label>人物介绍</label>';
        html += '<textarea id="phone-settings-custom-intro" class="phone-settings-textarea" placeholder="描述你的角色身份、性格、与对方的关系等...">' + NR.escapeHtml(userRole.customIntro || '') + '</textarea>';
        html += '</div>';
        html += '</div>';
        
        // 人物卡选择
        html += '<div class="phone-settings-character-select" id="phone-settings-character-select" style="display:' + (userRole.type === 'character' ? 'block' : 'none') + ';">';
        if (characterProfiles.length === 0) {
            html += '<p class="phone-settings-hint">暂无人物卡，请先添加人物</p>';
        } else {
            html += '<div class="phone-settings-character-list">';
            characterProfiles.forEach(function(profile) {
                var isSelected = userRole.selectedCharacterName === profile.name;
                var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                var roleTag = profile.isProtagonist ? '主角' : (profile.isImportant ? '重要' : '');
                
                html += '<div class="phone-settings-char-item' + (isSelected ? ' selected' : '') + '" data-name="' + NR.escapeHtml(profile.name) + '">';
                if (profile.cover) {
                    html += '<div class="phone-settings-char-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    html += '<div class="phone-settings-char-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
                }
                html += '<span class="phone-settings-char-name">' + NR.escapeHtml(profile.name) + '</span>';
                if (roleTag) {
                    html += '<span class="phone-settings-char-tag">' + roleTag + '</span>';
                }
                if (isSelected) {
                    html += '<span class="phone-settings-char-check">✓</span>';
                }
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        html += '</div>'; // end section
        
        // 壁纸设置区域
        html += '<div class="phone-settings-section">';
        html += '<div class="phone-settings-header">🖼️ 主页壁纸</div>';
        html += '<div class="phone-settings-wallpaper">';
        html += '<div class="phone-wallpaper-preview" id="phone-wallpaper-preview">';
        html += '<span class="wallpaper-placeholder">点击上传壁纸</span>';
        html += '</div>';
        html += '<div class="phone-wallpaper-actions">';
        html += '<button class="phone-wallpaper-btn" id="btn-phone-upload-wallpaper">📤 上传图片</button>';
        html += '<button class="phone-wallpaper-btn phone-wallpaper-btn-reset" id="btn-phone-reset-wallpaper">🔄 恢复默认</button>';
        html += '</div>';
        html += '<input type="file" id="phone-wallpaper-input" accept="image/*" style="display:none;">';
        html += '</div>';
        html += '</div>'; // end wallpaper section
        
        // 保存按钮
        html += '<div class="phone-settings-footer">';
        html += '<button class="phone-settings-save-btn" id="btn-phone-settings-save">💾 保存设置</button>';
        html += '</div>';
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };
    
    // 渲染手机设备（完整的手机界面）
    NR.renderPhoneDevice = function() {
        var currentScreen = NR.state.phoneChatState.currentScreen || 'home';
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        var chatHistory = NR.state.phoneChatState.chatHistory || [];
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        var protagonists = characterProfiles.filter(function(p) { return p.isProtagonist; });
        var importantNPCs = characterProfiles.filter(function(p) { return p.isImportant && !p.isProtagonist; });
        var availableCharacters = protagonists.concat(importantNPCs);
        var userRoleDisplay = NR.getUserRoleDisplayName();
        
        var html = '<div class="phone-frame phone-frame-new">';
        
        // 手机屏幕（带渐变背景）
        html += '<div class="phone-screen-new">';
        
        // 刘海
        html += '<div class="phone-notch"></div>';
        
        // 状态栏
        html += '<div class="phone-status-bar-new">';
        html += '<span class="phone-time-new">' + NR.formatPhoneTime() + '</span>';
        html += '<div class="phone-status-icons">';
        html += '<span>📶</span><span>📡</span><span>🔋</span>';
        html += '</div>';
        html += '</div>';
        
        // 主内容区
        html += '<div class="phone-content-area">';
        
        if (currentScreen === 'home') {
            // 显示主页
            html += NR.renderPhoneHomeScreen();
        } else if (currentScreen === 'chat-list' || (currentScreen === 'chat' && !selectedChar)) {
            // 显示聊天列表（人物选择）
            html += '<div class="phone-app-container">';
            // 导航栏
            html += '<div class="phone-nav-bar">';
            html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
            html += '<span class="phone-nav-title">消息</span>';
            html += '<div class="phone-nav-right">';
            html += '<button class="phone-nav-btn" id="btn-phone-user" title="设置我的身份">👤</button>';
            html += '</div>';
            html += '</div>';
            
            // 用户身份提示条
            if (NR.state.phoneChatState.userRole && NR.state.phoneChatState.userRole.type !== 'default') {
                html += '<div class="phone-user-badge-new" id="phone-user-badge">';
                html += '<span>我的身份: ' + NR.escapeHtml(userRoleDisplay) + '</span>';
                html += '</div>';
            }
            
            // 聊天列表内容
            html += '<div class="phone-app-content">';
            if (availableCharacters.length === 0) {
                html += '<div class="phone-empty-state">';
                html += '<div class="empty-icon">📭</div>';
                html += '<p>暂无可聊天的人物</p>';
                html += '<p class="hint">请先在"主角信息"或"重要人物"中添加人物</p>';
                html += '</div>';
            } else {
                html += '<div class="phone-chat-list">';
                availableCharacters.forEach(function(profile) {
                    var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                    var roleTag = profile.isProtagonist ? '主角' : '重要';
                    var roleClass = profile.isProtagonist ? 'protagonist' : 'important';
                    var identity = profile.data ? (profile.data['身份'] || profile.data['职业/身份'] || '') : '';
                    // 获取最后一条消息
                    var phoneChatHistory = NR.state.currentBookData.phoneChatHistory || {};
                    var history = phoneChatHistory[profile.name] || [];
                    var lastMsg = history.length > 0 ? history[history.length - 1].content : '点击开始聊天';
                    if (lastMsg.length > 20) lastMsg = lastMsg.substring(0, 20) + '...';
                    
                    html += '<div class="phone-list-item" data-name="' + NR.escapeHtml(profile.name) + '">';
                    if (profile.cover) {
                        html += '<div class="phone-list-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                    } else {
                        html += '<div class="phone-list-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
                    }
                    html += '<div class="phone-list-info">';
                    html += '<div class="phone-list-name">' + NR.escapeHtml(profile.name) + '</div>';
                    html += '<div class="phone-list-preview">' + NR.escapeHtml(lastMsg) + '</div>';
                    html += '</div>';
                    html += '<div class="phone-list-meta">';
                    html += '<span class="phone-list-role ' + roleClass + '">' + roleTag + '</span>';
                    html += '</div>';
                    html += '</div>';
                });
                html += '</div>';
            }
            html += '</div>';
            html += '</div>';
        } else if (currentScreen === 'chat' && selectedChar) {
            // 显示聊天详情
            html += '<div class="phone-app-container">';
            // 导航栏
            html += '<div class="phone-nav-bar">';
            html += '<button class="phone-nav-back" id="btn-phone-back">←</button>';
            html += '<span class="phone-nav-title">' + NR.escapeHtml(selectedChar.name) + '</span>';
            html += '<div class="phone-nav-right">';
            html += '<button class="phone-nav-btn" id="btn-phone-user" title="我的身份: ' + NR.escapeHtml(userRoleDisplay) + '">👤</button>';
            html += '<button class="phone-nav-btn" id="btn-phone-context" title="选择上下文">📝</button>';
            html += '<button class="phone-nav-btn" id="btn-phone-clear" title="清空聊天记录">🗑️</button>';
            html += '</div>';
            html += '</div>';
            
            // 用户身份提示条
            if (NR.state.phoneChatState.userRole && NR.state.phoneChatState.userRole.type !== 'default') {
                html += '<div class="phone-user-badge-new" id="phone-user-badge">';
                html += '<span>我的身份: ' + NR.escapeHtml(userRoleDisplay) + '</span>';
                html += '</div>';
            }
            
            // 聊天消息区域
            html += '<div class="phone-chat-messages-new" id="phone-chat-messages">';
            if (chatHistory.length === 0) {
                html += '<div class="phone-welcome-new">';
                html += '<p>开始和 ' + NR.escapeHtml(selectedChar.name) + ' 聊天吧~</p>';
                html += '</div>';
            } else {
                chatHistory.forEach(function(msg) {
                    var msgClass = msg.role === 'user' ? 'phone-msg-user' : 'phone-msg-char';
                    var content = msg.content || msg.c || '';
                    var msgType = msg.type || msg.t || 'text';
                    
                    // 特殊消息类型单独处理
                    if (msgType === 'voice' || msgType === 'file' || msgType === 'image' || msgType === 'imgdesc' || msgType === 'text-image' || msgType === 'quote' || msgType === 'transfer' || msgType === 'transfer-accepted' || msgType === 'transfer-rejected' || msgType === 'location') {
                        html += '<div class="phone-message ' + msgClass + '">';
                        // 用户消息头像放在前面（row-reverse后会显示在右边）
                        if (msg.role === 'user') {
                            html += NR.getUserAvatarHtml();
                        }
                        if (msg.role === 'assistant') {
                            if (selectedChar.cover) {
                                html += '<div class="phone-msg-avatar" style="background-image: url(' + selectedChar.cover + ');"></div>';
                            } else {
                                var color = NR.getCharacterColor(selectedChar.name, selectedChar.isProtagonist);
                                html += '<div class="phone-msg-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((selectedChar.name || '?')[0]) + '</div>';
                            }
                        }
                        html += '<div class="phone-msg-bubble">';
                        
                        if (msgType === 'voice') {
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
                        } else if (msgType === 'image') {
                            // 图片消息
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
                        } else if (msgType === 'quote') {
                            // 引用消息
                            var quote = msg.quote || {};
                            html += '<div class="msg-quote-preview">';
                            html += '<span class="quote-name">' + NR.escapeHtml(quote.name || '') + '</span>';
                            html += '<span class="quote-content">' + NR.escapeHtml(quote.c || quote.content || '') + '</span>';
                            html += '</div>';
                            html += '<div class="msg-quote-reply">' + NR.escapeHtml(content) + '</div>';
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
                        html += '</div>';
                        return; // forEach的return相当于continue
                    }
                    
                    // 普通文字消息（支持表情包拆分）
                    var bubbles = NR.splitMessageIntoBubbles ? NR.splitMessageIntoBubbles(content) : [{ text: content, isSticker: false }];
                    
                    bubbles.forEach(function(bubble) {
                        var isStickerOnly = bubble.isSticker;
                        
                        html += '<div class="phone-message ' + msgClass + (isStickerOnly ? ' sticker-only' : '') + '">';
                        // 用户消息头像放在前面（row-reverse后会显示在右边）
                        if (msg.role === 'user') {
                            html += NR.getUserAvatarHtml();
                        }
                        if (msg.role === 'assistant') {
                            if (selectedChar.cover) {
                                html += '<div class="phone-msg-avatar" style="background-image: url(' + selectedChar.cover + ');"></div>';
                            } else {
                                var color = NR.getCharacterColor(selectedChar.name, selectedChar.isProtagonist);
                                html += '<div class="phone-msg-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((selectedChar.name || '?')[0]) + '</div>';
                            }
                        }
                        var renderedContent = isStickerOnly 
                            ? (NR.renderStickerImage ? NR.renderStickerImage(bubble.text) : NR.escapeHtml(bubble.text))
                            : (NR.replaceStickersInText ? NR.replaceStickersInText(NR.escapeHtml(bubble.text)) : NR.escapeHtml(bubble.text));
                        html += '<div class="phone-msg-bubble">' + renderedContent + '</div>';
                        html += '</div>';
                    });
                });
            }
            html += '</div>';
            
            // 输入区域
            html += '<div class="phone-chat-input-area">';
            
            // 表情包面板
            html += '<div class="phone-sticker-panel" id="phone-sticker-panel" style="display: none;">';
            html += NR.renderStickerPanel();
            html += '</div>';
            
            // 功能栏（语音、图片、文件、转账、位置）
            html += '<div class="phone-function-bar" id="chat-function-bar" style="display: none;">';
            html += '<div class="function-item" data-func="voice"><i class="fas fa-microphone"></i><span>语音</span></div>';
            html += '<div class="function-item" data-func="image"><i class="fas fa-image"></i><span>图片</span></div>';
            html += '<div class="function-item" data-func="file"><i class="fas fa-file-alt"></i><span>文件</span></div>';
            html += '<div class="function-item" data-func="transfer"><i class="fas fa-money-bill-wave"></i><span>转账</span></div>';
            html += '<div class="function-item" data-func="location"><i class="fas fa-map-marker-alt"></i><span>位置</span></div>';
            html += '</div>';
            
            // 语音输入面板
            html += '<div class="phone-extend-panel" id="chat-voice-panel" style="display: none;">';
            html += '<div class="extend-panel-header"><i class="fas fa-microphone"></i> 发送语音消息</div>';
            html += '<div class="extend-panel-body">';
            html += '<div class="extend-field"><label>语音内容（转文字）</label>';
            html += '<textarea id="chat-voice-text" class="extend-textarea" placeholder="输入语音转文字的内容..."></textarea></div>';
            html += '<div class="extend-field"><label>语音时长</label>';
            html += '<input type="text" id="chat-voice-duration" class="extend-input" placeholder="如：0:15"></div>';
            html += '</div>';
            html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-chat-send-voice">发送语音</button></div>';
            html += '</div>';
            
            // 图片输入面板
            html += '<div class="phone-extend-panel" id="chat-image-panel" style="display: none;">';
            html += '<div class="extend-panel-header"><i class="fas fa-image"></i> 发送图片消息</div>';
            html += '<div class="extend-panel-body">';
            html += '<div class="extend-field"><label>图片描述</label>';
            html += '<textarea id="chat-image-desc" class="extend-textarea" placeholder="描述图片内容..."></textarea></div>';
            html += '</div>';
            html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-chat-send-image">发送图片</button></div>';
            html += '</div>';
            
            // 文件输入面板
            html += '<div class="phone-extend-panel" id="chat-file-panel" style="display: none;">';
            html += '<div class="extend-panel-header"><i class="fas fa-file-alt"></i> 发送文件消息</div>';
            html += '<div class="extend-panel-body">';
            html += '<div class="extend-field"><label>文件名</label>';
            html += '<input type="text" id="chat-file-name" class="extend-input" placeholder="如：报告.pdf"></div>';
            html += '<div class="extend-field"><label>文件大小</label>';
            html += '<input type="text" id="chat-file-size" class="extend-input" placeholder="如：2.5MB"></div>';
            html += '<div class="extend-field"><label>文件描述（可选）</label>';
            html += '<input type="text" id="chat-file-desc" class="extend-input" placeholder="简单描述文件内容"></div>';
            html += '</div>';
            html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-chat-send-file">发送文件</button></div>';
            html += '</div>';
            
            // 转账输入面板
            html += '<div class="phone-extend-panel" id="chat-transfer-panel" style="display: none;">';
            html += '<div class="extend-panel-header"><i class="fas fa-money-bill-wave"></i> 发送转账</div>';
            html += '<div class="extend-panel-body">';
            html += '<div class="extend-field"><label>转账金额</label>';
            html += '<input type="text" id="chat-transfer-amount" class="extend-input" placeholder="如：100.00"></div>';
            html += '<div class="extend-field"><label>转账备注（可选）</label>';
            html += '<input type="text" id="chat-transfer-note" class="extend-input" placeholder="如：生日快乐"></div>';
            html += '</div>';
            html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-chat-send-transfer">发送转账</button></div>';
            html += '</div>';
            
            // 位置输入面板
            html += '<div class="phone-extend-panel" id="chat-location-panel" style="display: none;">';
            html += '<div class="extend-panel-header"><i class="fas fa-map-marker-alt"></i> 发送位置</div>';
            html += '<div class="extend-panel-body">';
            html += '<div class="extend-field"><label>位置名称</label>';
            html += '<input type="text" id="chat-location-name" class="extend-input" placeholder="如：星巴克咖啡（中关村店）"></div>';
            html += '<div class="extend-field"><label>距离（可选）</label>';
            html += '<input type="text" id="chat-location-distance" class="extend-input" placeholder="如：距你500米"></div>';
            html += '</div>';
            html += '<div class="extend-panel-footer"><button class="extend-send-btn" id="btn-chat-send-location">发送位置</button></div>';
            html += '</div>';
            
            // 输入行
            html += '<div class="phone-input-row">';
            html += '<button class="phone-more-btn" id="btn-chat-more" title="更多功能"><i class="fas fa-plus"></i></button>';
            html += '<button class="phone-sticker-btn" id="btn-phone-sticker" title="表情包">😊</button>';
            html += '<input type="text" class="phone-chat-input" id="phone-chat-input" placeholder="输入消息...">';
            html += '<button class="phone-input-btn-new" id="btn-phone-input" title="添加到聊天（不发送AI）">输入</button>';
            html += '<button class="phone-send-btn-new" id="btn-phone-send" title="发送给AI">发送</button>';
            html += '</div>';
            
            html += '</div>';
            
            html += '</div>';
        } else if (currentScreen === 'settings') {
            // 设置界面
            html += NR.renderPhoneSettingsScreen();
        } else if (currentScreen === 'diary') {
            // 日记界面
            html += NR.renderPhoneDiaryScreen();
        } else if (currentScreen === 'diary-list') {
            // 角色日记列表界面
            html += NR.renderPhoneDiaryListScreen();
        } else if (currentScreen === 'diary-detail') {
            // 日记详情界面
            html += NR.renderPhoneDiaryDetailScreen();
        } else if (currentScreen === 'dynamic') {
            // 动态主界面
            html += NR.renderPhoneDynamicScreen();
        } else if (currentScreen === 'dynamic-detail') {
            // 动态详情界面
            html += NR.renderPhoneDynamicDetailScreen();
        } else if (currentScreen === 'dynamic-post') {
            // 发布动态界面
            html += NR.renderPhoneDynamicPostScreen();
        } else if (currentScreen === 'browser') {
            // 浏览器界面
            html += NR.renderPhoneBrowserScreen();
        } else if (currentScreen === 'email') {
            // 邮箱主界面
            html += NR.renderPhoneEmailScreen();
        } else if (currentScreen === 'email-detail') {
            // 邮件详情界面
            html += NR.renderPhoneEmailDetailScreen();
        } else if (currentScreen === 'email-compose') {
            // 写邮件界面
            html += NR.renderPhoneEmailComposeScreen();
        } else if (currentScreen === 'forum') {
            // 论坛主界面
            html += NR.renderPhoneForumScreen();
        } else if (currentScreen === 'forum-detail') {
            // 论坛帖子详情界面
            html += NR.renderPhoneForumPostScreen();
        } else if (currentScreen === 'forum-newpost') {
            // 发布帖子界面
            html += NR.renderPhoneForumNewPostScreen();
        } else if (currentScreen === 'map') {
            // 地图界面（新版：可缩放拖拽，面包屑导航，大地点嵌套小地点）
            html += NR.renderPhoneMapScreen();
        } else if (currentScreen === 'calendar') {
            // 日历界面
            html += NR.renderPhoneCalendarScreen();
        } else if (currentScreen === 'calendar-detail') {
            // 日历事件详情界面
            html += NR.renderPhoneCalendarDetailScreen();
        } else if (currentScreen === 'character-data') {
            // 角色数据界面（消息按钮点击后）
            html += NR.renderPhoneCharacterDataScreen();
        } else if (currentScreen === 'group-chat-detail') {
            // 群聊详情界面
            html += NR.renderPhoneGroupChatDetailScreen();
        } else if (currentScreen === 'group-chat-info') {
            // 群聊信息/编辑界面
            html += NR.renderPhoneGroupChatInfoScreen();
        } else if (currentScreen === 'phone-call') {
            // 电话联系人列表界面
            html += NR.renderPhoneCallScreen();
        } else if (currentScreen === 'call-active') {
            // 通话中界面
            html += NR.renderPhoneCallActiveScreen();
        } else if (currentScreen === 'live') {
            // 直播列表界面
            html += NR.renderPhoneLiveListScreen();
        } else if (currentScreen === 'live-room') {
            // 直播详情界面
            html += NR.renderPhoneLiveRoomScreen();
        } else if (currentScreen === 'music') {
            // 音乐界面
            html += NR.renderPhoneMusicScreen();
        } else {
            // 其他应用（暂时显示占位）
            html += '<div class="phone-app-container">';
            html += '<div class="phone-nav-bar">';
            html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
            html += '<span class="phone-nav-title">' + (currentScreen || '应用') + '</span>';
            html += '<div class="phone-nav-right"></div>';
            html += '</div>';
            html += '<div class="phone-app-content">';
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">🚧</div>';
            html += '<p>功能开发中...</p>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>'; // end phone-content-area
        html += '</div>'; // end phone-screen-new
        
        html += '</div>'; // end phone-frame
        
        // 关闭按钮（悬浮在弹窗上）
        html += '<button class="phone-close-float" id="btn-phone-close" title="关闭">✕</button>';
        
        return html;
    };
    
    // 渲染小手机聊天标签页（简化版，只显示入口按钮）
    NR.renderPhoneChatTab = function() {
        var html = '<div class="phone-tab-entry">';
        html += '<div class="phone-tab-icon">📱</div>';
        html += '<h3>小手机</h3>';
        html += '<p>与小说中的角色进行微信风格的聊天对话</p>';
        html += '<button class="control-button phone-open-btn" id="btn-open-phone-chat">打开小手机</button>';
        html += '</div>';
        return html;
    };
    
    // 渲染表情包选择面板
    NR.renderStickerPanel = function() {
        var categories = NR.STICKER_CATEGORIES;
        var catKeys = Object.keys(categories);
        if (catKeys.length === 0) return '<div class="sticker-empty">暂无表情包</div>';
        
        var html = '<div class="sticker-categories">';
        catKeys.forEach(function(cat, idx) {
            html += '<button class="sticker-cat-btn' + (idx === 0 ? ' active' : '') + '" data-category="' + cat + '">' + cat.split(' ')[0] + '</button>';
        });
        html += '</div>';
        
        html += '<div class="sticker-grid" id="sticker-grid">';
        // 默认显示第一个分类
        var firstCat = catKeys[0];
        var keywords = categories[firstCat] || [];
        keywords.forEach(function(keyword) {
            var url = NR.WECHAT_STICKERS[keyword];
            if (!url) return;
            html += '<div class="sticker-item" data-keyword="' + NR.escapeHtml(keyword) + '" title="' + NR.escapeHtml(keyword) + '">';
            html += '<img src="' + url + '" alt="' + NR.escapeHtml(keyword) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">';
            html += '</div>';
        });
        html += '</div>';
        
        return html;
    };
    
    // 切换表情包分类
    NR.switchStickerCategory = function(category) {
        var categories = NR.STICKER_CATEGORIES;
        var keywords = categories[category] || [];
        var grid = document.getElementById('sticker-grid');
        if (!grid) return;
        
        var html = '';
        keywords.forEach(function(keyword) {
            var url = NR.WECHAT_STICKERS[keyword];
            if (!url) return;
            html += '<div class="sticker-item" data-keyword="' + NR.escapeHtml(keyword) + '" title="' + NR.escapeHtml(keyword) + '">';
            html += '<img src="' + url + '" alt="' + NR.escapeHtml(keyword) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">';
            html += '</div>';
        });
        grid.innerHTML = html;
        
        // 绑定点击事件
        grid.querySelectorAll('.sticker-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var keyword = this.dataset.keyword;
                NR.insertStickerToInput(keyword);
            });
        });
    };
    
    // 插入表情包到输入框
    NR.insertStickerToInput = function(keyword) {
        var input = document.getElementById('phone-chat-input');
        if (input) {
            input.value += '[' + keyword + ']';
            input.focus();
        }
        // 关闭表情面板
        var panel = document.getElementById('phone-sticker-panel');
        if (panel) panel.style.display = 'none';
    };
    
    // 替换文本中的表情包关键词为图片
    NR.replaceStickersInText = function(text) {
        if (!text || !NR.WECHAT_STICKERS) return text;
        
        var result = text;
        Object.keys(NR.WECHAT_STICKERS).forEach(function(keyword) {
            var url = NR.WECHAT_STICKERS[keyword];
            // 匹配 [关键词] 格式
            var pattern = new RegExp('\\[' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]', 'g');
            result = result.replace(pattern, '<img class="chat-sticker" src="' + url + '" alt="' + keyword + '" title="' + keyword + '">');
        });
        return result;
    };
    
    // 显示上下文选择弹窗
    NR.showPhoneContextModal = function() {
        var existingModal = document.getElementById('phone-context-modal');
        if (existingModal) existingModal.remove();
        
        var summaries = NR.state.currentBookData.summaries || [];
        var selectedContexts = NR.state.phoneChatState.selectedContexts || [];
        
        var html = '<div id="phone-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="phone-context-body">';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，请先使用总结功能生成一些内容摘要</p>';
        } else {
            html += '<p class="hint" style="margin-bottom: 10px;">选择的总结将作为聊天背景信息发送给AI</p>';
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
        html += '<button class="control-button" id="btn-confirm-context">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('phone-context-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        // 绑定确定按钮
        document.getElementById('btn-confirm-context').addEventListener('click', function() {
            var checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            NR.state.phoneChatState.selectedContexts = [];
            checkboxes.forEach(function(cb) {
                if (cb.checked) {
                    NR.state.phoneChatState.selectedContexts.push(parseInt(cb.dataset.index));
                }
            });
            modal.remove();
        });
    };
    
    // 绑定设置界面事件
    NR.bindPhoneSettingsEvents = function(modal) {
        // 角色类型切换
        modal.querySelectorAll('input[name="phone-user-role-type"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                var type = this.value;
                modal.querySelectorAll('.phone-settings-role-option').forEach(function(opt) { opt.classList.remove('selected'); });
                this.closest('.phone-settings-role-option').classList.add('selected');
                
                var customForm = document.getElementById('phone-settings-custom-form');
                var charSelect = document.getElementById('phone-settings-character-select');
                if (customForm) customForm.style.display = type === 'custom' ? 'block' : 'none';
                if (charSelect) charSelect.style.display = type === 'character' ? 'block' : 'none';
            });
        });
        
        // 人物卡选择
        modal.querySelectorAll('.phone-settings-char-item').forEach(function(item) {
            item.addEventListener('click', function() {
                modal.querySelectorAll('.phone-settings-char-item').forEach(function(i) { 
                    i.classList.remove('selected');
                    var check = i.querySelector('.phone-settings-char-check');
                    if (check) check.remove();
                });
                this.classList.add('selected');
                this.insertAdjacentHTML('beforeend', '<span class="phone-settings-char-check">✓</span>');
            });
        });
        
        // 保存按钮
        var saveBtn = document.getElementById('btn-phone-settings-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                var selectedTypeRadio = modal.querySelector('input[name="phone-user-role-type"]:checked');
                if (!selectedTypeRadio) return;
                
                var selectedType = selectedTypeRadio.value;
                var customNameInput = document.getElementById('phone-settings-custom-name');
                var customIntroInput = document.getElementById('phone-settings-custom-intro');
                
                NR.state.phoneChatState.userRole = {
                    type: selectedType,
                    customName: customNameInput ? customNameInput.value.trim() : '',
                    customIntro: customIntroInput ? customIntroInput.value.trim() : '',
                    selectedCharacterName: null
                };
                
                if (selectedType === 'character') {
                    var selectedChar = modal.querySelector('.phone-settings-char-item.selected');
                    if (selectedChar) {
                        NR.state.phoneChatState.userRole.selectedCharacterName = selectedChar.dataset.name;
                    }
                }
                
                // 持久化保存用户角色设置
                NR.state.currentBookData.phoneUserRole = NR.state.phoneChatState.userRole;
                NR.saveBookData();
                
                // 显示保存成功提示
                saveBtn.textContent = '✓ 已保存';
                saveBtn.style.background = '#22c55e';
                setTimeout(function() {
                    saveBtn.textContent = '💾 保存设置';
                    saveBtn.style.background = '';
                }, 1500);
            });
        }
        
        // 壁纸上传按钮
        var uploadWallpaperBtn = document.getElementById('btn-phone-upload-wallpaper');
        var wallpaperInput = document.getElementById('phone-wallpaper-input');
        var wallpaperPreview = document.getElementById('phone-wallpaper-preview');
        
        if (uploadWallpaperBtn && wallpaperInput) {
            uploadWallpaperBtn.addEventListener('click', function() {
                wallpaperInput.click();
            });
            
            // 点击预览区也可以上传
            if (wallpaperPreview) {
                wallpaperPreview.addEventListener('click', function() {
                    wallpaperInput.click();
                });
            }
            
            wallpaperInput.addEventListener('change', function(e) {
                var file = e.target.files[0];
                if (!file) return;
                
                var reader = new FileReader();
                reader.onload = function(ev) {
                    var dataUrl = ev.target.result;
                    // 保存到IDB
                    NR.savePhoneWallpaper(dataUrl).then(function() {
                        // 更新预览
                        NR.updateWallpaperPreview(dataUrl);
                        NR.showToast && NR.showToast('壁纸已设置');
                    }).catch(function(err) {
                        console.error('保存壁纸失败:', err);
                        NR.showToast && NR.showToast('保存壁纸失败');
                    });
                };
                reader.readAsDataURL(file);
            });
        }
        
        // 恢复默认壁纸按钮
        var resetWallpaperBtn = document.getElementById('btn-phone-reset-wallpaper');
        if (resetWallpaperBtn) {
            resetWallpaperBtn.addEventListener('click', function() {
                NR.deletePhoneWallpaper().then(function() {
                    NR.updateWallpaperPreview(null);
                    NR.showToast && NR.showToast('已恢复默认壁纸');
                });
            });
        }
        
        // 加载当前壁纸预览
        NR.loadPhoneWallpaper().then(function(wallpaper) {
            if (wallpaper) {
                NR.updateWallpaperPreview(wallpaper);
            }
        });
    };
    
    // 保存手机壁纸到IDB
    NR.savePhoneWallpaper = function(dataUrl) {
        return NR.storageDB.saveImage('phone_wallpaper', dataUrl);
    };
    
    // 从IDB加载手机壁纸
    NR.loadPhoneWallpaper = function() {
        return NR.storageDB.loadImage('phone_wallpaper');
    };
    
    // 删除手机壁纸
    NR.deletePhoneWallpaper = function() {
        return NR.storageDB.deleteImage('phone_wallpaper');
    };
    
    // 更新壁纸预览
    NR.updateWallpaperPreview = function(dataUrl) {
        var preview = document.getElementById('phone-wallpaper-preview');
        if (!preview) return;
        
        if (dataUrl) {
            preview.style.backgroundImage = 'url(' + dataUrl + ')';
            preview.innerHTML = '';
            preview.classList.add('has-wallpaper');
        } else {
            preview.style.backgroundImage = '';
            preview.innerHTML = '<span class="wallpaper-placeholder">点击上传壁纸</span>';
            preview.classList.remove('has-wallpaper');
        }
        
        // 同时更新手机主页背景
        NR.applyPhoneWallpaper(dataUrl);
    };
    
    // 应用壁纸到手机屏幕
    NR.applyPhoneWallpaper = function(dataUrl) {
        var phoneScreen = document.querySelector('.phone-screen-new');
        if (!phoneScreen) return;
        
        if (dataUrl) {
            phoneScreen.style.backgroundImage = 'url(' + dataUrl + ')';
            phoneScreen.style.backgroundSize = 'cover';
            phoneScreen.style.backgroundPosition = 'center';
        } else {
            phoneScreen.style.backgroundImage = '';
            phoneScreen.style.backgroundSize = '';
            phoneScreen.style.backgroundPosition = '';
        }
    };
    
    // 显示用户角色设置弹窗
    NR.showPhoneUserRoleModal = function() {
        var existingModal = document.getElementById('phone-user-role-modal');
        if (existingModal) existingModal.remove();
        
        var userRole = NR.state.phoneChatState.userRole || { type: 'default', customName: '', customIntro: '', selectedCharacterName: null };
        var characterProfiles = NR.state.currentBookData.characterProfiles || [];
        
        var html = '<div id="phone-user-role-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 450px;">';
        html += '<div class="modal-header">';
        html += '<h2>👤 设置我的身份</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="phone-user-role-body">';
        
        // 角色类型选择
        html += '<div class="user-role-type-selector">';
        html += '<label class="user-role-option' + (userRole.type === 'default' ? ' selected' : '') + '">';
        html += '<input type="radio" name="user-role-type" value="default"' + (userRole.type === 'default' ? ' checked' : '') + '>';
        html += '<div class="role-option-content">';
        html += '<span class="role-option-icon">🙂</span>';
        html += '<span class="role-option-label">默认用户</span>';
        html += '<span class="role-option-desc">不设置特殊身份</span>';
        html += '</div>';
        html += '</label>';
        
        html += '<label class="user-role-option' + (userRole.type === 'custom' ? ' selected' : '') + '">';
        html += '<input type="radio" name="user-role-type" value="custom"' + (userRole.type === 'custom' ? ' checked' : '') + '>';
        html += '<div class="role-option-content">';
        html += '<span class="role-option-icon">✏️</span>';
        html += '<span class="role-option-label">自定义角色</span>';
        html += '<span class="role-option-desc">设置名字和介绍</span>';
        html += '</div>';
        html += '</label>';
        
        html += '<label class="user-role-option' + (userRole.type === 'character' ? ' selected' : '') + '">';
        html += '<input type="radio" name="user-role-type" value="character"' + (userRole.type === 'character' ? ' checked' : '') + '>';
        html += '<div class="role-option-content">';
        html += '<span class="role-option-icon">📋</span>';
        html += '<span class="role-option-label">使用人物卡</span>';
        html += '<span class="role-option-desc">选择已有人物</span>';
        html += '</div>';
        html += '</label>';
        html += '</div>';
        
        // 自定义角色表单
        html += '<div class="user-role-custom-form" id="user-role-custom-form" style="display:' + (userRole.type === 'custom' ? 'block' : 'none') + ';">';
        html += '<div class="form-row">';
        html += '<label>名字</label>';
        html += '<input type="text" id="user-role-custom-name" class="form-input" placeholder="输入你的角色名字" value="' + NR.escapeHtml(userRole.customName || '') + '">';
        html += '</div>';
        html += '<div class="form-row">';
        html += '<label>人物介绍</label>';
        html += '<textarea id="user-role-custom-intro" class="form-textarea" placeholder="描述你的角色身份、性格、与对方的关系等...">' + NR.escapeHtml(userRole.customIntro || '') + '</textarea>';
        html += '</div>';
        html += '</div>';
        
        // 人物卡选择
        html += '<div class="user-role-character-select" id="user-role-character-select" style="display:' + (userRole.type === 'character' ? 'block' : 'none') + ';">';
        if (characterProfiles.length === 0) {
            html += '<p class="no-data-hint">暂无人物卡，请先添加人物</p>';
        } else {
            html += '<div class="user-role-character-list">';
            characterProfiles.forEach(function(profile) {
                var isSelected = userRole.selectedCharacterName === profile.name;
                var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                var roleTag = profile.isProtagonist ? '主角' : (profile.isImportant ? '重要' : '');
                
                html += '<div class="user-role-char-item' + (isSelected ? ' selected' : '') + '" data-name="' + NR.escapeHtml(profile.name) + '">';
                if (profile.cover) {
                    html += '<div class="user-role-char-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    html += '<div class="user-role-char-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
                }
                html += '<span class="user-role-char-name">' + NR.escapeHtml(profile.name) + '</span>';
                if (roleTag) {
                    html += '<span class="user-role-char-tag">' + roleTag + '</span>';
                }
                if (isSelected) {
                    html += '<span class="user-role-char-check">✓</span>';
                }
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        html += '</div>';
        html += '<div class="modal-footer">';
        html += '<button class="control-button" id="btn-confirm-user-role">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('phone-user-role-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        // 角色类型切换
        modal.querySelectorAll('input[name="user-role-type"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                var type = this.value;
                modal.querySelectorAll('.user-role-option').forEach(function(opt) { opt.classList.remove('selected'); });
                this.closest('.user-role-option').classList.add('selected');
                
                document.getElementById('user-role-custom-form').style.display = type === 'custom' ? 'block' : 'none';
                document.getElementById('user-role-character-select').style.display = type === 'character' ? 'block' : 'none';
            });
        });
        
        // 人物卡选择
        modal.querySelectorAll('.user-role-char-item').forEach(function(item) {
            item.addEventListener('click', function() {
                modal.querySelectorAll('.user-role-char-item').forEach(function(i) { 
                    i.classList.remove('selected');
                    var check = i.querySelector('.user-role-char-check');
                    if (check) check.remove();
                });
                this.classList.add('selected');
                this.insertAdjacentHTML('beforeend', '<span class="user-role-char-check">✓</span>');
            });
        });
        
        // 确定按钮
        document.getElementById('btn-confirm-user-role').addEventListener('click', function() {
            var selectedType = modal.querySelector('input[name="user-role-type"]:checked').value;
            
            NR.state.phoneChatState.userRole = {
                type: selectedType,
                customName: document.getElementById('user-role-custom-name').value.trim(),
                customIntro: document.getElementById('user-role-custom-intro').value.trim(),
                selectedCharacterName: null
            };
            
            if (selectedType === 'character') {
                var selectedChar = modal.querySelector('.user-role-char-item.selected');
                if (selectedChar) {
                    NR.state.phoneChatState.userRole.selectedCharacterName = selectedChar.dataset.name;
                }
            }
            
            // 持久化保存用户角色设置
            NR.state.currentBookData.phoneUserRole = NR.state.phoneChatState.userRole;
            NR.saveBookData();
            
            modal.remove();
            NR.refreshPhoneModal();
        });
    };
    
    // 格式化手机时间
    NR.formatPhoneTime = function() {
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
    };
    
    // 获取人物卡片的所有标签信息
    NR.getCharacterTagsInfo = function(profile) {
        if (!profile || !profile.data) return '';
        
        var data = profile.data;
        var info = [];
        
        // 基础信息
        info.push('【基本信息】');
        info.push('姓名: ' + (profile.name || '-'));
        if (profile.aliases && profile.aliases.length > 0) {
            info.push('别名: ' + profile.aliases.join(', '));
        }
        
        // 遍历所有字段
        var fieldMappings = {
            '性别': '性别',
            '年龄': '年龄',
            '种族': '种族',
            '身份': '职业/身份',
            '地点': '所在地点',
            '在场状态': '在场状态',
            '外貌': '外貌特征',
            '衣着': '衣着',
            '物品': '持有的重要物品',
            '能力': '能力',
            '目的': '目的',
            '组织': '所属组织',
            '健康': '健康状态',
            '爱好': '爱好',
            '与主角关系': '与主角关系',
            '过往经历': '过往经历',
            '性格特点': '性格特点'
        };
        
        for (var key in fieldMappings) {
            var value = data[key];
            if (value && value !== '-') {
                info.push(fieldMappings[key] + ': ' + value);
            }
        }
        
        // 键值对字段
        var kvFields = ['基础属性', '特有属性', '人际关系'];
        kvFields.forEach(function(field) {
            var value = data[field];
            if (value && value !== '-') {
                info.push('\n【' + field + '】');
                info.push(value);
            }
        });
        
        return info.join('\n');
    };
    
    // 获取角色在群聊中的最近记忆（用于单聊时注入）
    NR.getCharacterGroupChatMemory = function(characterName) {
        var groupChats = NR.state.currentBookData.groupChats || [];
        var groupChatHistory = NR.state.currentBookData.groupChatHistory || {};
        var memories = [];
        
        // 遍历所有群聊，找到包含该角色的群聊
        groupChats.forEach(function(group) {
            var mainMembers = group.mainMembers || [];
            if (mainMembers.includes(characterName)) {
                var history = groupChatHistory[group.name] || [];
                if (history.length > 0) {
                    // 获取最近10条消息
                    var recentMessages = history.slice(-10);
                    var groupMemory = {
                        groupName: group.name,
                        messages: recentMessages.map(function(m) {
                            return (m.name || '未知') + ': ' + (m.content || m.c || '');
                        })
                    };
                    memories.push(groupMemory);
                }
            }
        });
        
        return memories;
    };
    
    // 构建聊天系统提示词
    NR.buildPhoneChatPrompt = function(profile, contextTexts) {
        var characterInfo = NR.getCharacterTagsInfo(profile);
        var userInfo = NR.getUserRoleInfo();
        var contextInfo = '';
        
        if (contextTexts && contextTexts.length > 0) {
            contextInfo = '以下是故事背景/剧情总结，请在对话中参考：\n\n' + contextTexts.join('\n\n---\n\n');
        } else {
            contextInfo = '暂无额外背景信息。';
        }
        
        // 获取该角色在群聊中的记忆
        var groupMemories = NR.getCharacterGroupChatMemory(profile.name);
        var groupMemoryText = '';
        if (groupMemories.length > 0) {
            groupMemoryText = '\n\n【群聊记忆】\n以下是你在群聊中的最近对话，可以在私聊中参考或提及：\n';
            groupMemories.forEach(function(memory) {
                groupMemoryText += '\n--- 群聊: ' + memory.groupName + ' ---\n';
                groupMemoryText += memory.messages.join('\n') + '\n';
            });
        }
        
        // 获取表情包列表
        var stickerList = NR.getStickerListForPrompt();
        
        var promptTemplate = NR.DEFAULT_AI_PROMPTS.PHONE_CHAT_ROLEPLAY || 
            '你现在要扮演一个角色与用户进行微信聊天。\n\n【你扮演的角色】\n{character_info}\n\n【与你聊天的人】\n{user_info}\n\n【背景信息】\n{context_info}\n\n请以角色身份回复用户的消息，回复要简短、口语化，像真实的微信聊天。';
        
        var result = promptTemplate
            .replace('{character_info}', characterInfo)
            .replace('{user_info}', userInfo)
            .replace('{context_info}', contextInfo)
            .replace('{sticker_list}', stickerList);
        
        // 在背景信息后追加群聊记忆
        if (groupMemoryText) {
            result += groupMemoryText;
        }
        
        return result;
    };
    
    // 获取表情包列表用于提示词
    NR.getStickerListForPrompt = function() {
        // 返回所有表情包关键词
        if (NR.WECHAT_STICKERS) {
            return Object.keys(NR.WECHAT_STICKERS).join('、');
        }
        return '';
    };
    
    // 保存聊天记录到持久化存储
    NR.savePhoneChatHistory = function() {
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        if (!selectedChar) return;
        
        if (!NR.state.currentBookData.phoneChatHistory) {
            NR.state.currentBookData.phoneChatHistory = {};
        }
        NR.state.currentBookData.phoneChatHistory[selectedChar.name] = NR.state.phoneChatState.chatHistory.slice();
        NR.saveBookData();
    };
    
    // 添加消息到聊天界面（不发送给AI）
    NR.addPhoneChatMessageLocal = function(userMessage) {
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        if (!selectedChar) {
            alert('请先选择一个聊天对象');
            return;
        }
        
        if (!userMessage || !userMessage.trim()) {
            return;
        }
        
        // 添加用户消息到历史
        NR.state.phoneChatState.chatHistory.push({
            role: 'user',
            content: userMessage.trim()
        });
        
        // 持久化保存聊天记录
        NR.savePhoneChatHistory();
        
        // 更新UI显示用户消息（增量模式）
        NR.renderPhoneChatMessages(true);
        
        // 重新聚焦输入框
        var inputField = document.getElementById('phone-chat-input');
        if (inputField) inputField.focus();
    };

    // 添加语音消息到单聊
    NR.addPhoneChatVoiceMessage = function(voiceText, duration) {
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        if (!selectedChar) {
            alert('请先选择一个聊天对象');
            return;
        }
        
        if (!voiceText) return;
        
        // 添加语音消息到历史
        NR.state.phoneChatState.chatHistory.push({
            role: 'user',
            content: voiceText,
            text: voiceText,
            duration: duration || '0:10',
            type: 'voice'
        });
        
        // 持久化保存聊天记录
        NR.savePhoneChatHistory();
        
        // 更新UI显示
        NR.renderPhoneChatMessages(true);
        
        // 重新聚焦输入框
        var inputField = document.getElementById('phone-chat-input');
        if (inputField) inputField.focus();
    };

    // 添加图片消息到单聊
    NR.addPhoneChatImageMessage = function(imageDesc) {
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        if (!selectedChar) {
            alert('请先选择一个聊天对象');
            return;
        }
        
        if (!imageDesc) return;
        
        // 添加图片描述消息到历史
        NR.state.phoneChatState.chatHistory.push({
            role: 'user',
            content: imageDesc,
            type: 'imgdesc'
        });
        
        // 持久化保存聊天记录
        NR.savePhoneChatHistory();
        
        // 更新UI显示
        NR.renderPhoneChatMessages(true);
        
        // 重新聚焦输入框
        var inputField = document.getElementById('phone-chat-input');
        if (inputField) inputField.focus();
    };

    // 添加文件消息到单聊
    NR.addPhoneChatFileMessage = function(fileName, fileSize, fileDesc) {
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        if (!selectedChar) {
            alert('请先选择一个聊天对象');
            return;
        }
        
        if (!fileName) return;
        
        // 添加文件消息到历史
        NR.state.phoneChatState.chatHistory.push({
            role: 'user',
            filename: fileName,
            size: fileSize || '',
            desc: fileDesc || '',
            type: 'file'
        });
        
        // 持久化保存聊天记录
        NR.savePhoneChatHistory();
        
        // 更新UI显示
        NR.renderPhoneChatMessages(true);
        
        // 重新聚焦输入框
        var inputField = document.getElementById('phone-chat-input');
        if (inputField) inputField.focus();
    };

    // 添加转账消息到单聊
    NR.addPhoneChatTransferMessage = function(amount, note) {
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        if (!selectedChar) {
            alert('请先选择一个聊天对象');
            return;
        }
        
        if (!amount) return;
        
        // 添加转账消息到历史
        NR.state.phoneChatState.chatHistory.push({
            role: 'user',
            amt: amount,
            note: note || '',
            type: 'transfer'
        });
        
        // 持久化保存聊天记录
        NR.savePhoneChatHistory();
        
        // 更新UI显示
        NR.renderPhoneChatMessages(true);
        
        // 重新聚焦输入框
        var inputField = document.getElementById('phone-chat-input');
        if (inputField) inputField.focus();
    };

    // 添加位置消息到单聊
    NR.addPhoneChatLocationMessage = function(locationName, distance) {
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        if (!selectedChar) {
            alert('请先选择一个聊天对象');
            return;
        }
        
        if (!locationName) return;
        
        // 添加位置消息到历史
        NR.state.phoneChatState.chatHistory.push({
            role: 'user',
            partnerLoc: locationName,
            dist: distance || '',
            type: 'location'
        });
        
        // 持久化保存聊天记录
        NR.savePhoneChatHistory();
        
        // 更新UI显示
        NR.renderPhoneChatMessages(true);
        
        // 重新聚焦输入框
        var inputField = document.getElementById('phone-chat-input');
        if (inputField) inputField.focus();
    };

    // 发送聊天消息
    NR.sendPhoneChatMessage = function(userMessage) {
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        if (!selectedChar) {
            alert('请先选择一个聊天对象');
            return Promise.reject('未选择角色');
        }
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('AI 功能需要配置后才能使用，请点击【设置】按钮进行配置。');
            return Promise.reject('未配置AI');
        }
        
        // 如果有新消息，先添加到历史
        if (userMessage && userMessage.trim()) {
            NR.state.phoneChatState.chatHistory.push({
                role: 'user',
                content: userMessage.trim()
            });
            
            // 持久化保存聊天记录
            NR.savePhoneChatHistory();
            
            // 更新UI显示用户消息（增量模式）
            NR.renderPhoneChatMessages(true);
        }
        
        // 检查是否有用户消息需要发送
        var chatHistory = NR.state.phoneChatState.chatHistory || [];
        var hasUserMessage = chatHistory.some(function(msg) { return msg.role === 'user'; });
        if (!hasUserMessage) {
            alert('请先输入消息');
            return Promise.reject('没有消息');
        }
        
        // 获取选中的上下文
        var contextTexts = [];
        var summaries = NR.state.currentBookData.summaries || [];
        var selectedContexts = NR.state.phoneChatState.selectedContexts || [];
        selectedContexts.forEach(function(idx) {
            if (summaries[idx]) {
                contextTexts.push(summaries[idx].text);
            }
        });
        
        // 构建系统提示词
        var systemPrompt = NR.buildPhoneChatPrompt(selectedChar, contextTexts);
        
        // 构建消息历史
        var messages = [{ role: 'system', content: systemPrompt }];
        
        // 添加聊天历史（最多保留最近20条）
        var recentHistory = NR.state.phoneChatState.chatHistory.slice(-20);
        recentHistory.forEach(function(msg) {
            var msgContent = msg.content || '';
            
            // 处理特殊消息类型，转换为文字描述
            if (msg.type === 'voice') {
                var voiceText = msg.text || msg.transcript || msg.content || '';
                var duration = msg.duration || msg.d || '';
                msgContent = '[语音消息' + (duration ? ' ' + duration : '') + ']' + (voiceText ? ' ' + voiceText : '');
            } else if (msg.type === 'file') {
                var fileName = msg.name || msg.filename || '文件';
                var fileSize = msg.size || '';
                var fileDesc = msg.desc || '';
                msgContent = '[文件] ' + fileName + (fileSize ? ' (' + fileSize + ')' : '') + (fileDesc ? ' - ' + fileDesc : '');
            } else if (msg.type === 'imgdesc' || msg.type === 'image' || msg.type === 'text-image') {
                msgContent = '[图片] ' + (msg.content || msg.c || '');
            } else if (msg.type === 'transfer') {
                var amount = msg.amt || msg.amount || '0';
                var note = msg.note || '';
                msgContent = '[转账 ￥' + amount + ']' + (note ? ' ' + note : '');
            } else if (msg.type === 'location') {
                var locName = msg.partnerLoc || msg.location || '位置';
                var dist = msg.dist || msg.distance || '';
                msgContent = '[位置] ' + locName + (dist ? ' (' + dist + ')' : '');
            }
            
            messages.push({
                role: msg.role,
                content: msgContent
            });
        });
        
        // 显示加载状态
        var messagesContainer = document.getElementById('phone-chat-messages');
        if (messagesContainer) {
            var loadingDiv = document.createElement('div');
            loadingDiv.className = 'phone-message phone-msg-char phone-msg-loading';
            loadingDiv.innerHTML = '<div class="phone-msg-avatar" style="background: #ccc;">...</div><div class="phone-msg-bubble">正在输入...</div>';
            messagesContainer.appendChild(loadingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // 调用AI API
        var apiUrl = NR.state.aiSettings.apiUrl.replace(/\/+$/, '');
        if (!apiUrl.endsWith('/chat/completions')) {
            apiUrl += '/chat/completions';
        }
        
        return fetch(apiUrl, {
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
            
            // 解析AI回复中的特殊消息标记，拆分成多条消息
            var parsedMessages = NR.parsePhoneChatReply(reply);
            
            // 添加解析后的消息到历史
            parsedMessages.forEach(function(msg) {
                NR.state.phoneChatState.chatHistory.push(msg);
            });
            
            // 持久化保存聊天记录
            NR.savePhoneChatHistory();
            
            // 更新UI（增量模式）
            NR.renderPhoneChatMessages(true);
            
            // 重新聚焦输入框
            var inputField = document.getElementById('phone-chat-input');
            if (inputField) inputField.focus();
            
            return reply;
        }).catch(function(err) {
            console.error('聊天失败:', err);
            // 移除加载状态
            var loadingMsg = document.querySelector('.phone-msg-loading');
            if (loadingMsg) loadingMsg.remove();
            
            alert('发送失败: ' + err.message);
            throw err;
        });
    };
    
    // 解析单聊AI回复中的特殊消息标记
    NR.parsePhoneChatReply = function(reply) {
        var messages = [];
        
        // 匹配特殊消息标记: {{type:content:...}}
        var specialPattern = /\{\{(voice|image|file|transfer|location):([^}]+)\}\}/g;
        var lastIndex = 0;
        var match;
        
        while ((match = specialPattern.exec(reply)) !== null) {
            // 添加标记前的普通文本
            var beforeText = reply.substring(lastIndex, match.index).trim();
            if (beforeText) {
                messages.push({
                    role: 'assistant',
                    content: beforeText,
                    type: 'text'
                });
            }
            
            var msgType = match[1];
            var params = match[2].split(':');
            
            if (msgType === 'voice') {
                // {{voice:内容:时长}}
                messages.push({
                    role: 'assistant',
                    content: params[0] || '',
                    text: params[0] || '',
                    duration: params[1] || '0:10',
                    type: 'voice'
                });
            } else if (msgType === 'image') {
                // {{image:描述}}
                messages.push({
                    role: 'assistant',
                    content: params[0] || '',
                    type: 'imgdesc'
                });
            } else if (msgType === 'file') {
                // {{file:文件名:大小:描述}}
                messages.push({
                    role: 'assistant',
                    filename: params[0] || '文件',
                    size: params[1] || '',
                    desc: params[2] || '',
                    type: 'file'
                });
            } else if (msgType === 'transfer') {
                // {{transfer:金额:备注}}
                messages.push({
                    role: 'assistant',
                    amount: params[0] || '0',
                    note: params[1] || '',
                    type: 'transfer'
                });
            } else if (msgType === 'location') {
                // {{location:位置名称:距离}}
                messages.push({
                    role: 'assistant',
                    partnerLoc: params[0] || '位置',
                    dist: params[1] || '',
                    type: 'location'
                });
            }
            
            lastIndex = match.index + match[0].length;
        }
        
        // 添加剩余的普通文本
        var remainingText = reply.substring(lastIndex).trim();
        if (remainingText) {
            messages.push({
                role: 'assistant',
                content: remainingText,
                type: 'text'
            });
        }
        
        // 如果没有匹配到任何特殊标记，返回原始消息
        if (messages.length === 0) {
            messages.push({
                role: 'assistant',
                content: reply,
                type: 'text'
            });
        }
        
        return messages;
    };
    
    // 渲染聊天消息（局部更新）
    NR.renderPhoneChatMessages = function(appendOnly) {
        var messagesContainer = document.getElementById('phone-chat-messages');
        if (!messagesContainer) return;
        
        var selectedChar = NR.state.phoneChatState.selectedCharacter;
        var chatHistory = NR.state.phoneChatState.chatHistory || [];
        
        // 记录当前滚动位置
        var wasAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 50;
        
        // 如果是增量模式且有历史消息，添加新消息
        if (appendOnly && chatHistory.length > 0) {
            // 移除加载状态
            var loadingMsg = messagesContainer.querySelector('.phone-msg-loading');
            if (loadingMsg) loadingMsg.remove();
            
            // 移除欢迎消息
            var welcomeMsg = messagesContainer.querySelector('.phone-welcome-new');
            if (welcomeMsg) welcomeMsg.remove();
            
            // 获取已渲染的消息数量
            var renderedCount = NR.state.phoneChatState.renderedMessageCount || 0;
            var newMessages = chatHistory.slice(renderedCount);
            
            newMessages.forEach(function(lastMsg) {
                var msgClass = lastMsg.role === 'user' ? 'phone-msg-user' : 'phone-msg-char';
                var content = lastMsg.content || '';
                var msgType = lastMsg.type || 'text';
                
                // 特殊消息类型单独处理
                if (msgType === 'voice' || msgType === 'file' || msgType === 'imgdesc' || msgType === 'image' || msgType === 'quote' || msgType === 'transfer' || msgType === 'transfer-accepted' || msgType === 'transfer-rejected' || msgType === 'location') {
                    var msgDiv = document.createElement('div');
                    msgDiv.className = 'phone-message ' + msgClass;
                    
                    var html = '';
                    // 用户消息头像放在前面（row-reverse后会显示在右边）
                    if (lastMsg.role === 'user') {
                        html += NR.getUserAvatarHtml();
                    }
                    if (lastMsg.role === 'assistant') {
                        if (selectedChar.cover) {
                            html += '<div class="phone-msg-avatar" style="background-image: url(' + selectedChar.cover + ');"></div>';
                        } else {
                            var color = NR.getCharacterColor(selectedChar.name, selectedChar.isProtagonist);
                            html += '<div class="phone-msg-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((selectedChar.name || '?')[0]) + '</div>';
                        }
                    }
                    html += '<div class="phone-msg-bubble">';
                    
                    if (msgType === 'voice') {
                        var voiceDuration = lastMsg.duration || lastMsg.d || '';
                        var voiceText = lastMsg.text || lastMsg.transcript || content || '';
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
                    } else if (msgType === 'file') {
                        var fileName = lastMsg.name || lastMsg.filename || '文件';
                        var fileSize = lastMsg.size || lastMsg.filesize || '';
                        var fileDesc = lastMsg.desc || lastMsg.description || '';
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
                    } else if (msgType === 'imgdesc' || msgType === 'image') {
                        html += '<div class="msg-image-desc"><i class="fas fa-image"></i> ' + NR.escapeHtml(content) + '</div>';
                    } else if (msgType === 'transfer') {
                        var amount = lastMsg.amount || lastMsg.amt || '0';
                        var note = lastMsg.note || '';
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
                        var amount = lastMsg.amount || lastMsg.amt || '0';
                        html += '<div class="msg-transfer msg-transfer-done">';
                        html += '<div class="msg-transfer-header">';
                        html += '<i class="fas fa-check-circle"></i>';
                        html += '<span>已收款</span>';
                        html += '</div>';
                        html += '<div class="msg-transfer-amount">￥' + NR.escapeHtml(amount) + '</div>';
                        html += '</div>';
                    } else if (msgType === 'transfer-rejected') {
                        var amount = lastMsg.amount || lastMsg.amt || '0';
                        html += '<div class="msg-transfer msg-transfer-rejected">';
                        html += '<div class="msg-transfer-header">';
                        html += '<i class="fas fa-times-circle"></i>';
                        html += '<span>已退还</span>';
                        html += '</div>';
                        html += '<div class="msg-transfer-amount">￥' + NR.escapeHtml(amount) + '</div>';
                        html += '</div>';
                    } else if (msgType === 'location') {
                        var locationName = lastMsg.partnerLoc || lastMsg.location || content || '位置';
                        var distance = lastMsg.dist || lastMsg.distance || '';
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
                    msgDiv.innerHTML = html;
                    messagesContainer.appendChild(msgDiv);
                } else {
                    // 普通文字消息
                    var bubbles = NR.splitMessageIntoBubbles(content);
                    
                    bubbles.forEach(function(bubble) {
                        var isStickerOnly = bubble.isSticker;
                        var msgDiv = document.createElement('div');
                        msgDiv.className = 'phone-message ' + msgClass + (isStickerOnly ? ' sticker-only' : '');
                        
                        var html = '';
                        // 用户消息头像放在前面（row-reverse后会显示在右边）
                        if (lastMsg.role === 'user') {
                            html += NR.getUserAvatarHtml();
                        }
                        if (lastMsg.role === 'assistant') {
                            if (selectedChar.cover) {
                                html += '<div class="phone-msg-avatar" style="background-image: url(' + selectedChar.cover + ');"></div>';
                            } else {
                                var color = NR.getCharacterColor(selectedChar.name, selectedChar.isProtagonist);
                                html += '<div class="phone-msg-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((selectedChar.name || '?')[0]) + '</div>';
                            }
                        }
                        var renderedContent = isStickerOnly 
                            ? NR.renderStickerImage(bubble.text)
                            : NR.replaceStickersInText(NR.escapeHtml(bubble.text));
                        html += '<div class="phone-msg-bubble">' + renderedContent + '</div>';
                        
                        msgDiv.innerHTML = html;
                        messagesContainer.appendChild(msgDiv);
                    });
                }
            });
            
            // 更新已渲染消息数量
            NR.state.phoneChatState.renderedMessageCount = chatHistory.length;
            
            // 滚动到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return;
        }
        
        // 完整重新渲染模式 - 重置已渲染计数
        NR.state.phoneChatState.renderedMessageCount = chatHistory.length;
        
        // 完整重新渲染模式
        var html = '';
        if (chatHistory.length === 0) {
            html = '<div class="phone-welcome-new"><p>开始和 ' + NR.escapeHtml(selectedChar.name) + ' 聊天吧~</p></div>';
        } else {
            chatHistory.forEach(function(msg) {
                var msgClass = msg.role === 'user' ? 'phone-msg-user' : 'phone-msg-char';
                var content = msg.content || '';
                
                // 将消息拆分成多个气泡（按行拆分，并将表情包独立出来）
                var bubbles = NR.splitMessageIntoBubbles(content);
                
                bubbles.forEach(function(bubble) {
                    var isStickerOnly = bubble.isSticker;
                    
                    html += '<div class="phone-message ' + msgClass + (isStickerOnly ? ' sticker-only' : '') + '">';
                    // 用户消息头像放在前面（row-reverse后会显示在右边）
                    if (msg.role === 'user') {
                        html += NR.getUserAvatarHtml();
                    }
                    // 每个气泡都显示头像
                    if (msg.role === 'assistant') {
                        if (selectedChar.cover) {
                            html += '<div class="phone-msg-avatar" style="background-image: url(' + selectedChar.cover + ');"></div>';
                        } else {
                            var color = NR.getCharacterColor(selectedChar.name, selectedChar.isProtagonist);
                            html += '<div class="phone-msg-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((selectedChar.name || '?')[0]) + '</div>';
                        }
                    }
                    // 渲染消息内容
                    var renderedContent = isStickerOnly 
                        ? NR.renderStickerImage(bubble.text)
                        : NR.replaceStickersInText(NR.escapeHtml(bubble.text));
                    html += '<div class="phone-msg-bubble">' + renderedContent + '</div>';
                    html += '</div>';
                });
            });
        }
        
        messagesContainer.innerHTML = html;
        
        // 只有在之前就在底部时才滚动到底部
        if (wasAtBottom || chatHistory.length <= 1) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    };
    
    // 将消息拆分成多个气泡（文字和表情包分开）
    NR.splitMessageIntoBubbles = function(content) {
        var bubbles = [];
        // 先按行拆分
        var lines = content.split('\n').filter(function(line) { return line.trim() !== ''; });
        if (lines.length === 0) lines = [content];
        
        lines.forEach(function(line) {
            // 检查行内是否有表情包，将表情包和文字分开
            var parts = NR.extractStickersFromLine(line);
            parts.forEach(function(part) {
                if (part.text.trim()) {
                    bubbles.push(part);
                }
            });
        });
        
        return bubbles.length > 0 ? bubbles : [{ text: content, isSticker: false }];
    };
    
    // 从一行文字中提取表情包，分离文字和表情包
    NR.extractStickersFromLine = function(line) {
        var parts = [];
        var stickerPattern = /\[([^\]]+)\]/g;
        var lastIndex = 0;
        var match;
        
        while ((match = stickerPattern.exec(line)) !== null) {
            var keyword = match[1];
            // 检查是否是有效的表情包
            if (NR.WECHAT_STICKERS && NR.WECHAT_STICKERS[keyword]) {
                // 添加表情包前的文字
                if (match.index > lastIndex) {
                    var textBefore = line.substring(lastIndex, match.index).trim();
                    if (textBefore) {
                        parts.push({ text: textBefore, isSticker: false });
                    }
                }
                // 添加表情包
                parts.push({ text: keyword, isSticker: true });
                lastIndex = match.index + match[0].length;
            }
        }
        
        // 添加剩余的文字
        if (lastIndex < line.length) {
            var remaining = line.substring(lastIndex).trim();
            if (remaining) {
                parts.push({ text: remaining, isSticker: false });
            }
        }
        
        // 如果没有找到表情包，返回整行
        if (parts.length === 0) {
            parts.push({ text: line, isSticker: false });
        }
        
        return parts;
    };
    
    // 渲染单个表情包图片
    NR.renderStickerImage = function(keyword) {
        var url = NR.WECHAT_STICKERS[keyword];
        if (!url) return NR.escapeHtml('[' + keyword + ']');
        // 不添加时间戳，避免每次重新渲染时重新加载
        return '<img class="chat-sticker" src="' + url + '" alt="' + NR.escapeHtml(keyword) + '" title="' + NR.escapeHtml(keyword) + '">';
    };
    
    // 检查消息是否只包含表情包
    NR.isStickerOnlyMessage = function(text) {
        if (!text || !NR.WECHAT_STICKERS) return false;
        var trimmed = text.trim();
        // 检查是否匹配 [关键词] 格式且关键词存在
        var match = trimmed.match(/^\[(.+)\]$/);
        if (match && NR.WECHAT_STICKERS[match[1]]) {
            return true;
        }
        return false;
    };
    
    // 绑定小手机聊天事件
    NR.bindPhoneChatEvents = function() {
        // 标签页入口按钮
        var openBtn = document.getElementById('btn-open-phone-chat');
        if (openBtn) {
            openBtn.addEventListener('click', function() {
                NR.openPhoneChatModal();
            });
        }
        
        // 以下是弹窗内的事件
        var modal = document.getElementById('phone-chat-modal');
        if (!modal) return;
        
        // 加载并应用壁纸
        NR.loadPhoneWallpaper().then(function(wallpaper) {
            if (wallpaper) {
                NR.applyPhoneWallpaper(wallpaper);
            }
        });
        
        // 关闭按钮
        var closeBtn = document.getElementById('btn-phone-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.remove();
            });
        }
        
        // 主页应用图标点击
        modal.querySelectorAll('.phone-app-block, .phone-dock-app').forEach(function(item) {
            item.addEventListener('click', function() {
                var appId = this.dataset.appId;
                if (appId === 'chat') {
                    // 消息按钮跳转到角色数据界面（包含私聊和群聊）
                    NR.state.phoneChatState.currentScreen = 'character-data';
                    NR.refreshPhoneModal();
                } else {
                    // 其他应用暂时显示开发中
                    NR.state.phoneChatState.currentScreen = appId;
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 返回主页按钮
        var homeBtn = document.getElementById('btn-phone-home');
        if (homeBtn) {
            homeBtn.addEventListener('click', function() {
                NR.state.phoneChatState.currentScreen = 'home';
                NR.state.phoneChatState.selectedCharacter = null;
                NR.state.phoneChatState.chatHistory = [];
                NR.refreshPhoneModal();
            });
        }
        
        // 聊天列表中的人物选择
        modal.querySelectorAll('.phone-list-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var name = this.dataset.name;
                var profiles = NR.state.currentBookData.characterProfiles || [];
                var profile = profiles.find(function(p) { return p.name === name; });
                
                if (profile) {
                    NR.state.phoneChatState.selectedCharacter = profile;
                    NR.state.phoneChatState.currentScreen = 'chat';
                    // 从持久化存储加载该角色的聊天记录
                    var phoneChatHistory = NR.state.currentBookData.phoneChatHistory || {};
                    NR.state.phoneChatState.chatHistory = phoneChatHistory[profile.name] || [];
                    // 保存上次选择的角色
                    NR.state.currentBookData.phoneLastSelectedCharacter = profile.name;
                    NR.saveBookData();
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 返回按钮（从聊天详情返回聊天列表）
        var backBtn = document.getElementById('btn-phone-back');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                NR.state.phoneChatState.currentScreen = 'chat-list';
                NR.state.phoneChatState.selectedCharacter = null;
                NR.state.phoneChatState.chatHistory = [];
                NR.refreshPhoneModal();
            });
        }
        
        // 用户角色设置按钮
        var userBtn = document.getElementById('btn-phone-user');
        if (userBtn) {
            userBtn.addEventListener('click', function() {
                NR.showPhoneUserRoleModal();
            });
        }
        
        // 用户身份提示条点击
        var userBadge = document.getElementById('phone-user-badge');
        if (userBadge) {
            userBadge.addEventListener('click', function() {
                NR.showPhoneUserRoleModal();
            });
        }
        
        // 设置界面事件绑定
        NR.bindPhoneSettingsEvents(modal);
        
        // 上下文选择按钮
        var contextBtn = document.getElementById('btn-phone-context');
        if (contextBtn) {
            contextBtn.addEventListener('click', function() {
                NR.showPhoneContextModal();
            });
        }
        
        // 清空聊天记录
        var clearBtn = document.getElementById('btn-phone-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                if (confirm('确定要清空聊天记录吗？')) {
                    NR.state.phoneChatState.chatHistory = [];
                    // 同步清空持久化存储
                    var selectedChar = NR.state.phoneChatState.selectedCharacter;
                    if (selectedChar) {
                        if (!NR.state.currentBookData.phoneChatHistory) {
                            NR.state.currentBookData.phoneChatHistory = {};
                        }
                        NR.state.currentBookData.phoneChatHistory[selectedChar.name] = [];
                        NR.saveBookData();
                    }
                    NR.refreshPhoneModal();
                }
            });
        }
        
        // 表情包按钮
        var stickerBtn = document.getElementById('btn-phone-sticker');
        var stickerPanel = document.getElementById('phone-sticker-panel');
        if (stickerBtn && stickerPanel) {
            stickerBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var isHidden = stickerPanel.style.display === 'none';
                stickerPanel.style.display = isHidden ? 'block' : 'none';
            });
            
            // 分类切换
            stickerPanel.querySelectorAll('.sticker-cat-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    stickerPanel.querySelectorAll('.sticker-cat-btn').forEach(function(b) { b.classList.remove('active'); });
                    this.classList.add('active');
                    NR.switchStickerCategory(this.dataset.category);
                });
            });
            
            // 表情包点击
            stickerPanel.querySelectorAll('.sticker-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    var keyword = this.dataset.keyword;
                    NR.insertStickerToInput(keyword);
                });
            });
            
            // 点击其他地方关闭表情面板
            document.addEventListener('click', function(e) {
                if (stickerPanel && !stickerPanel.contains(e.target) && e.target !== stickerBtn) {
                    stickerPanel.style.display = 'none';
                }
            });
        }
        
        // 发送消息
        var sendBtn = document.getElementById('btn-phone-send');
        var inputField = document.getElementById('phone-chat-input');
        
        if (sendBtn && inputField) {
            var sendMessage = function() {
                var msg = inputField.value.trim();
                inputField.value = '';
                // 即使输入框为空也尝试发送（可能有之前通过"输入"按钮添加的消息）
                NR.sendPhoneChatMessage(msg);
            };
            
            sendBtn.addEventListener('click', sendMessage);
            inputField.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // 自动聚焦输入框
            inputField.focus();
        }
        
        // 输入按钮（添加到聊天但不发送AI）
        var inputBtn = document.getElementById('btn-phone-input');
        if (inputBtn && inputField) {
            inputBtn.addEventListener('click', function() {
                var msg = inputField.value.trim();
                if (msg) {
                    inputField.value = '';
                    NR.addPhoneChatMessageLocal(msg);
                }
            });
        }
        
        // ========== 单聊功能栏事件绑定 ==========
        
        // 更多按钮点击切换功能栏
        var chatMoreBtn = document.getElementById('btn-chat-more');
        var chatFunctionBar = document.getElementById('chat-function-bar');
        if (chatMoreBtn && chatFunctionBar) {
            chatMoreBtn.addEventListener('click', function() {
                var isVisible = chatFunctionBar.style.display !== 'none';
                // 隐藏所有面板
                var panels = ['chat-voice-panel', 'chat-image-panel', 'chat-file-panel', 'chat-transfer-panel', 'chat-location-panel'];
                panels.forEach(function(id) {
                    var panel = document.getElementById(id);
                    if (panel) panel.style.display = 'none';
                });
                // 隐藏表情包面板
                if (stickerPanel) stickerPanel.style.display = 'none';
                // 切换功能栏显示
                chatFunctionBar.style.display = isVisible ? 'none' : 'flex';
            });
        }
        
        // 功能项点击切换面板
        modal.querySelectorAll('#chat-function-bar .function-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var func = this.dataset.func;
                var panelId = 'chat-' + func + '-panel';
                var panel = document.getElementById(panelId);
                
                // 隐藏所有面板
                var panels = ['chat-voice-panel', 'chat-image-panel', 'chat-file-panel', 'chat-transfer-panel', 'chat-location-panel'];
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
        
        // 发送语音消息（单聊）
        var btnChatSendVoice = document.getElementById('btn-chat-send-voice');
        if (btnChatSendVoice) {
            btnChatSendVoice.addEventListener('click', function() {
                var voiceText = document.getElementById('chat-voice-text');
                var voiceDuration = document.getElementById('chat-voice-duration');
                var text = voiceText ? voiceText.value.trim() : '';
                var duration = voiceDuration ? voiceDuration.value.trim() : '0:10';
                
                if (!text) {
                    alert('请输入语音内容');
                    return;
                }
                
                NR.addPhoneChatVoiceMessage(text, duration);
                
                // 清空输入
                if (voiceText) voiceText.value = '';
                if (voiceDuration) voiceDuration.value = '';
                // 隐藏面板
                var panel = document.getElementById('chat-voice-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 发送图片消息（单聊）
        var btnChatSendImage = document.getElementById('btn-chat-send-image');
        if (btnChatSendImage) {
            btnChatSendImage.addEventListener('click', function() {
                var imageDesc = document.getElementById('chat-image-desc');
                var desc = imageDesc ? imageDesc.value.trim() : '';
                
                if (!desc) {
                    alert('请输入图片描述');
                    return;
                }
                
                NR.addPhoneChatImageMessage(desc);
                
                // 清空输入
                if (imageDesc) imageDesc.value = '';
                // 隐藏面板
                var panel = document.getElementById('chat-image-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 发送文件消息（单聊）
        var btnChatSendFile = document.getElementById('btn-chat-send-file');
        if (btnChatSendFile) {
            btnChatSendFile.addEventListener('click', function() {
                var fileName = document.getElementById('chat-file-name');
                var fileSize = document.getElementById('chat-file-size');
                var fileDesc = document.getElementById('chat-file-desc');
                var name = fileName ? fileName.value.trim() : '';
                var size = fileSize ? fileSize.value.trim() : '';
                var desc = fileDesc ? fileDesc.value.trim() : '';
                
                if (!name) {
                    alert('请输入文件名');
                    return;
                }
                
                NR.addPhoneChatFileMessage(name, size, desc);
                
                // 清空输入
                if (fileName) fileName.value = '';
                if (fileSize) fileSize.value = '';
                if (fileDesc) fileDesc.value = '';
                // 隐藏面板
                var panel = document.getElementById('chat-file-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 发送转账消息（单聊）
        var btnChatSendTransfer = document.getElementById('btn-chat-send-transfer');
        if (btnChatSendTransfer) {
            btnChatSendTransfer.addEventListener('click', function() {
                var amountInput = document.getElementById('chat-transfer-amount');
                var noteInput = document.getElementById('chat-transfer-note');
                var amount = amountInput ? amountInput.value.trim() : '';
                var note = noteInput ? noteInput.value.trim() : '';
                
                if (!amount) {
                    alert('请输入转账金额');
                    return;
                }
                
                NR.addPhoneChatTransferMessage(amount, note);
                
                // 清空输入
                if (amountInput) amountInput.value = '';
                if (noteInput) noteInput.value = '';
                // 隐藏面板
                var panel = document.getElementById('chat-transfer-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 发送位置消息（单聊）
        var btnChatSendLocation = document.getElementById('btn-chat-send-location');
        if (btnChatSendLocation) {
            btnChatSendLocation.addEventListener('click', function() {
                var nameInput = document.getElementById('chat-location-name');
                var distInput = document.getElementById('chat-location-distance');
                var locationName = nameInput ? nameInput.value.trim() : '';
                var distance = distInput ? distInput.value.trim() : '';
                
                if (!locationName) {
                    alert('请输入位置名称');
                    return;
                }
                
                NR.addPhoneChatLocationMessage(locationName, distance);
                
                // 清空输入
                if (nameInput) nameInput.value = '';
                if (distInput) distInput.value = '';
                // 隐藏面板
                var panel = document.getElementById('chat-location-panel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // 绑定日记相关事件
        NR.bindDiaryEvents(modal);
        
        // 绑定动态相关事件
        NR.bindDynamicEvents(modal);
        
        // 绑定浏览器相关事件
        NR.bindBrowserEvents(modal);
        
        // 绑定论坛相关事件
        NR.bindForumEvents(modal);
        
        // 绑定日历相关事件
        NR.bindCalendarEvents(modal);
        
        // 绑定群聊相关事件
        if (NR.bindGroupChatEvents) {
            NR.bindGroupChatEvents(modal);
        }
        
        // 绑定邮箱相关事件
        if (NR.bindEmailEvents) {
            NR.bindEmailEvents(modal);
        }
        
        // 绑定电话相关事件
        if (NR.bindCallEvents) {
            NR.bindCallEvents(modal);
        }
        
        // 绑定直播相关事件
        if (NR.bindLiveEvents) {
            NR.bindLiveEvents(modal);
        }
        
        // 绑定音乐相关事件
        if (NR.bindMusicEvents) {
            NR.bindMusicEvents(modal);
        }
    };
    
    // 刷新手机弹窗
    NR.refreshPhoneModal = function() {
        var modal = document.getElementById('phone-chat-modal');
        if (!modal) return;
        
        var content = modal.querySelector('.phone-modal-content');
        if (content) {
            content.innerHTML = NR.renderPhoneDevice();
            NR.bindPhoneChatEvents();
        }
    };

    // 绑定地图事件（在bindPhoneChatEvents之后调用）
    var originalBindPhoneChatEvents = NR.bindPhoneChatEvents;
    NR.bindPhoneChatEvents = function() {
        originalBindPhoneChatEvents.call(NR);
        // 绑定地图事件
        var modal = document.getElementById('phone-chat-modal');
        if (modal && NR.bindMapEvents) {
            NR.bindMapEvents(modal);
        }
    };

    // ========== 日记功能 ==========
    
    // 初始化日记数据结构
    NR.initDiaryData = function() {
        if (!NR.state.currentBookData.diaries) {
            NR.state.currentBookData.diaries = [];
        }
        if (!NR.state.phoneChatState.diaryState) {
            NR.state.phoneChatState.diaryState = {
                selectedCharacter: null,
                selectedDiary: null,
                isGenerating: false
            };
        }
    };

    // 获取日记列表（按角色分组）
    NR.getDiariesByCharacter = function() {
        NR.initDiaryData();
        var diaries = NR.state.currentBookData.diaries || [];
        var grouped = {};
        
        diaries.forEach(function(diary) {
            var charName = diary.name || '未知';
            if (!grouped[charName]) {
                grouped[charName] = [];
            }
            grouped[charName].push(diary);
        });
        
        // 按日期倒序排列每个角色的日记
        Object.keys(grouped).forEach(function(charName) {
            grouped[charName].sort(function(a, b) {
                return (b.timestamp || 0) - (a.timestamp || 0);
            });
        });
        
        return grouped;
    };

    // 渲染日记主界面
    NR.renderPhoneDiaryScreen = function() {
        NR.initDiaryData();
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var diariesByChar = NR.getDiariesByCharacter();
        var diaryState = NR.state.phoneChatState.diaryState;
        
        var html = '<div class="phone-app-container phone-diary-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">日记</span>';
        html += '<div class="phone-nav-right"></div>';
        html += '</div>';
        
        // 内容区域
        html += '<div class="phone-app-content phone-diary-content">';
        
        if (profiles.length === 0) {
            // 没有角色
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">📝</div>';
            html += '<p>暂无角色</p>';
            html += '<p class="empty-hint">请先在人物卡片中添加角色</p>';
            html += '</div>';
        } else {
            // 角色选择列表
            html += '<div class="diary-character-list">';
            
            profiles.forEach(function(profile) {
                var charDiaries = diariesByChar[profile.name] || [];
                var diaryCount = charDiaries.length;
                var lastDiary = charDiaries[0];
                var color = NR.getCharacterColor(profile.name, profile.isProtagonist);
                
                html += '<div class="diary-character-card" data-name="' + NR.escapeHtml(profile.name) + '">';
                
                // 头像
                if (profile.cover) {
                    html += '<div class="diary-char-avatar" style="background-image: url(' + profile.cover + ');"></div>';
                } else {
                    html += '<div class="diary-char-avatar" style="background: ' + color.bg + '; color: ' + color.text + ';">' + NR.escapeHtml((profile.name || '?')[0]) + '</div>';
                }
                
                // 信息
                html += '<div class="diary-char-info">';
                html += '<div class="diary-char-name">' + NR.escapeHtml(profile.name) + '</div>';
                if (lastDiary) {
                    html += '<div class="diary-char-preview">' + NR.escapeHtml(lastDiary.date || '') + '</div>';
                } else {
                    html += '<div class="diary-char-preview">暂无日记</div>';
                }
                html += '</div>';
                
                // 日记数量徽章
                if (diaryCount > 0) {
                    html += '<div class="diary-count-badge">' + diaryCount + '</div>';
                }
                
                html += '<i class="fas fa-chevron-right diary-arrow"></i>';
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染角色日记列表界面
    NR.renderPhoneDiaryListScreen = function() {
        var diaryState = NR.state.phoneChatState.diaryState;
        var charName = diaryState.selectedCharacter;
        var diariesByChar = NR.getDiariesByCharacter();
        var charDiaries = diariesByChar[charName] || [];
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === charName; });
        var color = profile ? NR.getCharacterColor(profile.name, profile.isProtagonist) : { bg: '#8FB8ED', text: '#fff' };
        
        var html = '<div class="phone-app-container phone-diary-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-diary-back">←</button>';
        html += '<span class="phone-nav-title">' + NR.escapeHtml(charName) + '的日记</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-diary-context" title="选择上下文">📝</button>';
        html += '<button class="phone-nav-btn" id="btn-diary-generate" title="生成新日记">✨</button>';
        html += '</div>';
        html += '</div>';
        
        // 显示已选上下文数量
        var selectedDiaryContexts = diaryState.selectedContexts || [];
        if (selectedDiaryContexts.length > 0) {
            html += '<div class="diary-context-badge">';
            html += '<span>📝 已选择 ' + selectedDiaryContexts.length + ' 个上下文</span>';
            html += '</div>';
        }
        
        // 内容区域
        html += '<div class="phone-app-content phone-diary-content">';
        
        // 生成中提示
        if (diaryState.isGenerating) {
            html += '<div class="diary-generating">';
            html += '<div class="diary-generating-icon">✍️</div>';
            html += '<p>正在生成日记...</p>';
            html += '</div>';
        }
        
        if (charDiaries.length === 0 && !diaryState.isGenerating) {
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">📖</div>';
            html += '<p>暂无日记</p>';
            html += '<p class="empty-hint">点击右上角 ✨ 生成日记</p>';
            html += '</div>';
        } else if (charDiaries.length > 0) {
            html += '<div class="diary-list">';
            
            charDiaries.forEach(function(diary, index) {
                html += '<div class="diary-list-item" data-index="' + index + '">';
                
                // 日期徽章
                html += '<div class="diary-date-badge">';
                html += '<span class="diary-date-text">' + NR.escapeHtml(diary.date || '未知日期') + '</span>';
                html += '</div>';
                
                // 日记信息
                html += '<div class="diary-item-info">';
                html += '<div class="diary-item-weather">' + NR.escapeHtml(diary.weather || '') + '</div>';
                
                // 内容预览（去除HTML标签）
                var contentPreview = (diary.content || '').replace(/<[^>]+>/g, '').substring(0, 50);
                html += '<div class="diary-item-preview">' + NR.escapeHtml(contentPreview) + '...</div>';
                html += '</div>';
                
                html += '<i class="fas fa-chevron-right diary-arrow"></i>';
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 渲染日记详情界面
    NR.renderPhoneDiaryDetailScreen = function() {
        var diaryState = NR.state.phoneChatState.diaryState;
        var diary = diaryState.selectedDiary;
        
        if (!diary) {
            return NR.renderPhoneDiaryScreen();
        }
        
        var html = '<div class="phone-app-container phone-diary-detail-container">';
        
        // 导航栏
        html += '<div class="phone-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-diary-detail-back">←</button>';
        html += '<span class="phone-nav-title">' + NR.escapeHtml(diary.name || '') + '的日记</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn diary-delete-btn" id="btn-diary-delete" title="删除日记">🗑️</button>';
        html += '</div>';
        html += '</div>';
        
        // 日记内容区域
        html += '<div class="phone-app-content diary-detail-content">';
        html += '<div class="diary-notebook">';
        
        // 日记头部
        html += '<div class="diary-header">';
        html += '<div class="diary-date">' + NR.escapeHtml(diary.date || '') + '</div>';
        html += '<div class="diary-weather">' + NR.escapeHtml(diary.weather || '') + '</div>';
        html += '</div>';
        
        // 分隔线
        html += '<div class="diary-divider"></div>';
        
        // 日记正文（保留HTML格式）
        html += '<div class="diary-body">' + (diary.content || '') + '</div>';
        
        // 收集品展示
        if (diary.collection && diary.collection.name) {
            html += '<div class="diary-collection-section">';
            html += '<div class="diary-collection-divider"></div>';
            html += '<div class="diary-collection-card">';
            html += '<div class="diary-collection-icon"><i class="fas fa-gem"></i></div>';
            html += '<div class="diary-collection-info">';
            html += '<div class="diary-collection-label">今日收集</div>';
            html += '<div class="diary-collection-name">' + NR.escapeHtml(diary.collection.name) + '</div>';
            html += '<div class="diary-collection-desc">' + NR.escapeHtml(diary.collection.desc || '') + '</div>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }
        
        // 装饰元素
        html += '<div class="diary-decoration"><div class="decoration-flower">✿</div></div>';
        
        html += '</div>'; // end diary-notebook
        html += '</div>'; // end phone-app-content
        html += '</div>'; // end phone-app-container
        
        return html;
    };

    // 生成日记（调用AI）
    NR.generateDiary = function(characterName) {
        NR.initDiaryData();
        var diaryState = NR.state.phoneChatState.diaryState;
        
        if (diaryState.isGenerating) {
            return;
        }
        
        // 检查AI配置
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        diaryState.isGenerating = true;
        NR.refreshPhoneModal();
        
        // 获取角色信息
        var profiles = NR.state.currentBookData.characterProfiles || [];
        var profile = profiles.find(function(p) { return p.name === characterName; });
        
        if (!profile) {
            diaryState.isGenerating = false;
            alert('未找到角色信息');
            NR.refreshPhoneModal();
            return;
        }
        
        // 使用完整人物卡信息
        var charDesc = NR.getCharacterTagsInfo(profile);
        
        // 获取选中的上下文（总结）
        var selectedContexts = diaryState.selectedContexts || [];
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
        
        // 获取最近的日记作为参考
        var diariesByChar = NR.getDiariesByCharacter();
        var recentDiaries = (diariesByChar[characterName] || []).slice(0, 3);
        var recentDiaryContext = '';
        if (recentDiaries.length > 0) {
            recentDiaryContext = '\n\n【最近的日记记录（供参考，避免重复）】\n';
            recentDiaries.forEach(function(d, i) {
                recentDiaryContext += (i + 1) + '. ' + d.date + ': ' + (d.content || '').replace(/<[^>]+>/g, '').substring(0, 100) + '...\n';
            });
        }
        
        // 获取当前日期
        var now = new Date();
        var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
        var weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        var weekDay = weekDays[now.getDay()];
        
        // 构建提示词
        var prompt = '你是一个角色扮演助手，请以第一人称视角为以下角色写一篇日记。\n\n';
        prompt += '【角色完整信息】\n' + charDesc + '\n';
        prompt += contextText;
        prompt += '【日期】' + dateStr + ' ' + weekDay + '\n';
        prompt += recentDiaryContext;
        prompt += '\n【日记格式要求】\n';
        prompt += '请严格按照以下YAML格式输出日记：\n\n';
        prompt += '```yaml\n';
        prompt += 'date: "' + dateStr + ' ' + weekDay + '"\n';
        prompt += 'weather: "天气emoji 天气描述 / 温度"  # 例如: ☁️ 多云 / 15℃\n';
        prompt += 'name: "' + characterName + '"\n';
        prompt += 'content: |\n';
        prompt += '  <p>日记内容第一段...</p>\n';
        prompt += '  <p>日记内容第二段...</p>\n';
        prompt += 'collection:  # 可选，今日收集的纪念品\n';
        prompt += '  name: "纪念品名称"\n';
        prompt += '  desc: "纪念品描述"\n';
        prompt += '```\n\n';
        prompt += '【内容要求】\n';
        prompt += '1. 日记内容要符合角色性格，以第一人称书写\n';
        prompt += '2. 每段用<p></p>包裹\n';
        prompt += '3. 可以使用以下特殊样式（每篇日记使用2-3种，每种最多1次）：\n';
        prompt += '   - <span class="strikethrough">划掉的内容</span> 表示写了又划掉的内容\n';
        prompt += '   - <span class="highlight">高亮内容</span> 黄色背景高亮\n';
        prompt += '   - <span class="underline">下划线内容</span> 粉色虚线下划线\n';
        prompt += '   - <span class="emphasis">强调内容</span> 粉红色加粗\n';
        prompt += '   - <span class="handwritten">手写体内容</span> 手写体文字\n';
        prompt += '   - <span class="censored">涂黑内容</span> 被涂黑的内容（最多2-5个字）\n';
        prompt += '4. 日记内容200-400字，真实自然，表达内心想法\n';
        prompt += '5. collection字段是可选的，只有当天有特别的实物纪念品时才填写\n';
        
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
            
            // 解析YAML格式的日记
            var diary = NR.parseDiaryYaml(content, characterName);
            
            if (diary) {
                diary.timestamp = Date.now();
                diary.id = 'diary_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                // 保存日记
                if (!NR.state.currentBookData.diaries) {
                    NR.state.currentBookData.diaries = [];
                }
                NR.state.currentBookData.diaries.push(diary);
                NR.saveBookData();
                
                console.info('[Diary] 日记生成成功:', diary);
            } else {
                throw new Error('无法解析日记内容');
            }
            
            diaryState.isGenerating = false;
            NR.refreshPhoneModal();
            
        }).catch(function(err) {
            console.error('[Diary] 生成日记失败:', err);
            diaryState.isGenerating = false;
            alert('生成日记失败: ' + err.message);
            NR.refreshPhoneModal();
        });
    };

    // 解析YAML格式的日记
    NR.parseDiaryYaml = function(content, defaultName) {
        try {
            // 提取yaml代码块
            var yamlMatch = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yamlContent = yamlMatch ? yamlMatch[1].trim() : content.trim();
            
            // 简单的YAML解析
            var diary = {
                date: '',
                weather: '',
                name: defaultName,
                content: '',
                collection: null
            };
            
            // 解析date
            var dateMatch = yamlContent.match(/date:\s*["']?([^"'\n]+)["']?/);
            if (dateMatch) diary.date = dateMatch[1].trim();
            
            // 解析weather
            var weatherMatch = yamlContent.match(/weather:\s*["']?([^"'\n]+)["']?/);
            if (weatherMatch) diary.weather = weatherMatch[1].trim();
            
            // 解析name
            var nameMatch = yamlContent.match(/name:\s*["']?([^"'\n]+)["']?/);
            if (nameMatch) diary.name = nameMatch[1].trim();
            
            // 解析content（多行）
            var contentMatch = yamlContent.match(/content:\s*\|?\s*\n([\s\S]*?)(?=\ncollection:|$)/);
            if (contentMatch) {
                var contentLines = contentMatch[1].split('\n');
                var processedContent = contentLines
                    .map(function(line) { return line.replace(/^\s{2}/, ''); })
                    .filter(function(line) { return line.trim(); })
                    .join('\n');
                diary.content = processedContent;
            }
            
            // 解析collection
            var collectionMatch = yamlContent.match(/collection:\s*\n\s*name:\s*["']?([^"'\n]+)["']?\s*\n\s*desc:\s*["']?([^"'\n]+)["']?/);
            if (collectionMatch) {
                diary.collection = {
                    name: collectionMatch[1].trim(),
                    desc: collectionMatch[2].trim()
                };
            }
            
            return diary;
        } catch (e) {
            console.error('[Diary] 解析日记YAML失败:', e);
            return null;
        }
    };

    // 删除日记
    NR.deleteDiary = function(diaryId) {
        if (!NR.state.currentBookData.diaries) return;
        
        var index = NR.state.currentBookData.diaries.findIndex(function(d) { return d.id === diaryId; });
        if (index > -1) {
            NR.state.currentBookData.diaries.splice(index, 1);
            NR.saveBookData();
        }
    };

    // 显示日记上下文选择弹窗
    NR.showDiaryContextModal = function() {
        var existingModal = document.getElementById('diary-context-modal');
        if (existingModal) existingModal.remove();
        
        var diaryState = NR.state.phoneChatState.diaryState;
        var summaries = NR.state.currentBookData.summaries || [];
        var selectedContexts = diaryState.selectedContexts || [];
        
        var html = '<div id="diary-context-modal" class="modal" style="display: flex; z-index: 10001;">';
        html += '<div class="modal-content" style="max-width: 400px;">';
        html += '<div class="modal-header">';
        html += '<h2>📝 选择上下文</h2>';
        html += '<button class="close-button">&times;</button>';
        html += '</div>';
        html += '<div class="phone-context-body">';
        
        if (summaries.length === 0) {
            html += '<p class="no-data-hint">暂无总结历史，请先使用总结功能生成一些内容摘要</p>';
        } else {
            html += '<p class="hint" style="margin-bottom: 10px;">选择的总结将作为日记生成的背景信息发送给AI</p>';
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
        html += '<button class="control-button" id="btn-confirm-diary-context">确定</button>';
        html += '</div>';
        html += '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        var modal = document.getElementById('diary-context-modal');
        modal.querySelector('.close-button').addEventListener('click', function() { modal.remove(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        
        // 绑定确定按钮
        document.getElementById('btn-confirm-diary-context').addEventListener('click', function() {
            var checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            diaryState.selectedContexts = [];
            checkboxes.forEach(function(cb) {
                if (cb.checked) {
                    diaryState.selectedContexts.push(parseInt(cb.dataset.index));
                }
            });
            modal.remove();
            NR.refreshPhoneModal();
        });
    };

    // 绑定日记相关事件
    NR.bindDiaryEvents = function(modal) {
        var diaryState = NR.state.phoneChatState.diaryState;
        var currentScreen = NR.state.phoneChatState.currentScreen;
        
        // 角色卡片点击（进入角色日记列表）
        modal.querySelectorAll('.diary-character-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var name = this.dataset.name;
                diaryState.selectedCharacter = name;
                NR.state.phoneChatState.currentScreen = 'diary-list';
                NR.refreshPhoneModal();
            });
        });
        
        // 返回日记主页
        var backBtn = document.getElementById('btn-diary-back');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                diaryState.selectedCharacter = null;
                NR.state.phoneChatState.currentScreen = 'diary';
                NR.refreshPhoneModal();
            });
        }
        
        // 生成日记按钮
        var generateBtn = document.getElementById('btn-diary-generate');
        if (generateBtn) {
            generateBtn.addEventListener('click', function() {
                if (diaryState.selectedCharacter) {
                    NR.generateDiary(diaryState.selectedCharacter);
                }
            });
        }
        
        // 选择上下文按钮
        var contextBtn = document.getElementById('btn-diary-context');
        if (contextBtn) {
            contextBtn.addEventListener('click', function() {
                NR.showDiaryContextModal();
            });
        }
        
        // 日记列表项点击（查看详情）
        modal.querySelectorAll('.diary-list-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                var diariesByChar = NR.getDiariesByCharacter();
                var charDiaries = diariesByChar[diaryState.selectedCharacter] || [];
                
                if (charDiaries[index]) {
                    diaryState.selectedDiary = charDiaries[index];
                    NR.state.phoneChatState.currentScreen = 'diary-detail';
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 返回日记列表
        var detailBackBtn = document.getElementById('btn-diary-detail-back');
        if (detailBackBtn) {
            detailBackBtn.addEventListener('click', function() {
                diaryState.selectedDiary = null;
                NR.state.phoneChatState.currentScreen = 'diary-list';
                NR.refreshPhoneModal();
            });
        }
        
        // 删除日记按钮
        var deleteBtn = document.getElementById('btn-diary-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (diaryState.selectedDiary && confirm('确定要删除这篇日记吗？')) {
                    NR.deleteDiary(diaryState.selectedDiary.id);
                    diaryState.selectedDiary = null;
                    NR.state.phoneChatState.currentScreen = 'diary-list';
                    NR.refreshPhoneModal();
                }
            });
        }
    };

})();
