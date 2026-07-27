// 小手机地图功能模块 - 完整移植版本
(function() {
    var NR = window.NovelReader;

    // 初始化地图数据状态
    NR.initMapData = function() {
        if (!NR.state.phoneChatState.mapState) {
            NR.state.phoneChatState.mapState = {
                // 导航路径（面包屑）
                navigationPath: [],
                // 画布变换状态
                transform: { scale: 1, translateX: 0, translateY: 0 },
                // 拖拽状态
                isDragging: false,
                dragStart: { x: 0, y: 0 },
                lastTranslate: { x: 0, y: 0 },
                // 悬停的地点（用于显示信息面板）
                hoveredLocation: null,
                // 人物列表显示
                showCharacterList: false,
                // 生成状态
                isGenerating: false
            };
        }
        if (!NR.state.currentBookData.mapData) {
            NR.state.currentBookData.mapData = null;
        }
    };

    // 获取地图数据
    NR.getMapData = function() {
        return NR.state.currentBookData.mapData;
    };

    // 获取当前层级的地点数据
    NR.getCurrentLevelLocations = function() {
        var mapData = NR.getMapData();
        if (!mapData || !mapData.locations) return {};
        
        var mapState = NR.state.phoneChatState.mapState;
        var path = mapState.navigationPath;
        
        if (path.length === 0) {
            return mapData.locations;
        }
        
        // 根据路径找到当前层级
        var current = mapData.locations[path[0].id];
        for (var i = 1; i < path.length; i++) {
            if (!current || !current.subLocations) return {};
            current = current.subLocations[path[i].id];
        }
        
        return current && current.subLocations ? current.subLocations : {};
    };

    // 渲染地图主界面
    NR.renderPhoneMapScreen = function() {
        NR.initMapData();
        var mapData = NR.getMapData();
        var mapState = NR.state.phoneChatState.mapState;
        
        var html = '<div class="phone-app-container phone-map-container">';
        
        // 顶部导航栏
        html += '<div class="phone-nav-bar map-nav-bar">';
        html += '<button class="phone-nav-back" id="btn-phone-home">←</button>';
        html += '<span class="phone-nav-title">' + NR.escapeHtml(mapData ? (mapData.mapName || '地图') : '地图') + '</span>';
        html += '<div class="phone-nav-right">';
        html += '<button class="phone-nav-btn" id="btn-map-refresh" title="刷新地图">🔄</button>';
        html += '<button class="phone-nav-btn" id="btn-map-characters" title="人物列表">👥</button>';
        html += '</div>';
        html += '</div>';
        
        // 面包屑导航
        html += NR.renderMapBreadcrumb();
        
        // 地图内容区域
        html += '<div class="phone-app-content map-content-area">';
        
        if (mapState.isGenerating) {
            html += '<div class="map-generating">';
            html += '<div class="map-generating-icon"><i class="fas fa-spinner fa-spin"></i></div>';
            html += '<p>正在生成地图数据...</p>';
            html += '</div>';
        } else if (!mapData || !mapData.locations) {
            html += '<div class="phone-empty-state">';
            html += '<div class="empty-icon">🗺️</div>';
            html += '<p>暂无地图数据</p>';
            html += '<p class="empty-hint">点击右上角 🔄 生成地图</p>';
            html += '</div>';
        } else {
            html += NR.renderMapCanvas();
        }
        
        html += '</div>';
        
        // 右上角缩放控制
        if (mapData && mapData.locations) {
            html += '<div class="map-zoom-controls">';
            html += '<button class="map-zoom-btn" id="btn-map-zoom-in"><i class="fas fa-plus"></i></button>';
            html += '<button class="map-zoom-btn" id="btn-map-zoom-out"><i class="fas fa-minus"></i></button>';
            html += '<button class="map-zoom-btn" id="btn-map-zoom-reset"><i class="fas fa-compress-arrows-alt"></i></button>';
            html += '</div>';
        }
        
        // 左下角信息面板（悬停时显示）
        if (mapState.hoveredLocation) {
            html += NR.renderMapInfoPanel();
        }
        
        // 人物列表弹窗
        if (mapState.showCharacterList && mapData && mapData.characters) {
            html += NR.renderMapCharacterList(mapData);
        }
        
        html += '</div>';
        
        return html;
    };

    // 渲染面包屑导航
    NR.renderMapBreadcrumb = function() {
        var mapState = NR.state.phoneChatState.mapState;
        var mapData = NR.getMapData();
        var path = mapState.navigationPath || [];
        
        var html = '<div class="map-breadcrumb">';
        
        var rootName = mapData ? (mapData.mapName || '世界') : '世界';
        html += '<span class="breadcrumb-item breadcrumb-root" data-index="-1">';
        html += '<i class="fas fa-globe"></i> ' + NR.escapeHtml(rootName);
        html += '</span>';
        
        path.forEach(function(item, index) {
            html += '<span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>';
            html += '<span class="breadcrumb-item" data-index="' + index + '">';
            html += NR.escapeHtml(item.name);
            html += '</span>';
        });
        
        html += '</div>';
        return html;
    };

    // 渲染地图画布
    NR.renderMapCanvas = function() {
        var mapState = NR.state.phoneChatState.mapState;
        var transform = mapState.transform;
        var locations = NR.getCurrentLevelLocations();
        
        var transformStyle = 'transform: translate(' + transform.translateX + 'px, ' + transform.translateY + 'px) scale(' + transform.scale + ');';
        
        var html = '<div class="map-canvas-wrapper">';
        html += '<div class="map-canvas" id="map-canvas" style="' + transformStyle + '">';
        html += '<div class="map-grid-bg"></div>';
        
        var locNames = Object.keys(locations);
        if (locNames.length === 0) {
            html += '<div class="map-empty-level">';
            html += '<i class="fas fa-map-marker-alt"></i>';
            html += '<p>此地点没有子区域</p>';
            html += '</div>';
        } else {
            // 渲染所有地点
            locNames.forEach(function(name, index) {
                var loc = locations[name];
                var hasChildren = loc.subLocations && Object.keys(loc.subLocations).length > 0;
                
                if (hasChildren) {
                    // 有子地点的大容器
                    html += NR.renderBigContainer(name, loc, index);
                } else {
                    // 独立的小卡片
                    html += NR.renderStandaloneCard(name, loc, index);
                }
            });
        }
        
        html += '</div>';
        html += '</div>';
        
        return html;
    };

    // 渲染大容器（有子地点）
    NR.renderBigContainer = function(name, loc, index) {
        var subLocs = loc.subLocations || {};
        var subCount = Object.keys(subLocs).length;
        
        // 使用AI生成的坐标和尺寸，或计算默认值
        var x = loc.x !== undefined ? loc.x : NR.calcDefaultX(index, true);
        var y = loc.y !== undefined ? loc.y : NR.calcDefaultY(index, true);
        var w = loc.width || NR.calcContainerWidth(subCount);
        var h = loc.height || NR.calcContainerHeight(subCount);
        var bgColor = NR.getContainerBgColor(index);
        
        var html = '<div class="map-container" data-loc="' + NR.escapeHtml(name) + '" ';
        html += 'style="left:' + x + 'px; top:' + y + 'px; width:' + w + 'px; height:' + h + 'px; background:' + bgColor + ';">';
        
        // 容器标题栏
        html += '<div class="map-container-header">';
        html += '<span class="map-container-title">' + NR.escapeHtml(name) + '</span>';
        html += '<button class="map-container-enter" data-enter="' + NR.escapeHtml(name) + '">';
        html += '<i class="fas fa-sign-in-alt"></i> 进入';
        html += '</button>';
        html += '</div>';
        
        // 容器内的子地点
        html += '<div class="map-container-body">';
        Object.keys(subLocs).forEach(function(subName, subIndex) {
            var subLoc = subLocs[subName];
            html += NR.renderInnerCard(subName, subLoc, subIndex, name);
        });
        html += '</div>';
        
        html += '</div>';
        return html;
    };

    // 渲染容器内的小卡片
    NR.renderInnerCard = function(name, loc, index, parentName) {
        // 使用AI生成的坐标，或计算默认值
        var x = loc.x !== undefined ? loc.x : NR.calcInnerX(index);
        var y = loc.y !== undefined ? loc.y : NR.calcInnerY(index);
        var iconColor = NR.getIconColor(index);
        var icon = loc.icon || 'fa-map-marker-alt';
        if (!icon.startsWith('fa-')) icon = 'fa-' + icon;
        
        // 获取人物
        var mapData = NR.getMapData();
        var chars = NR.getCharsAtPath(parentName + '/' + name, mapData ? mapData.characters : {});
        
        var html = '<div class="map-inner-card" data-loc="' + NR.escapeHtml(name) + '" data-parent="' + NR.escapeHtml(parentName) + '" ';
        html += 'style="left:' + x + 'px; top:' + y + 'px;">';
        
        html += '<div class="inner-card-icon" style="background:' + iconColor + ';">';
        html += '<i class="fas ' + icon + '"></i>';
        html += '</div>';
        html += '<div class="inner-card-name">' + NR.escapeHtml(name) + '</div>';
        
        // 人物头像
        if (chars.length > 0) {
            html += '<div class="inner-card-chars">';
            chars.slice(0, 2).forEach(function(c) {
                var profile = NR.getCharacterProfile(c.name);
                if (profile && profile.cover) {
                    html += '<img class="inner-char-avatar" src="' + profile.cover + '" title="' + NR.escapeHtml(c.name) + '">';
                } else {
                    var color = NR.getCharacterColor(c.name, profile && profile.isProtagonist);
                    html += '<div class="inner-char-avatar" style="background:' + color.bg + ';color:' + color.text + ';" title="' + NR.escapeHtml(c.name) + '">' + (c.name || '?')[0] + '</div>';
                }
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    };

    // 渲染独立卡片（无子地点）
    NR.renderStandaloneCard = function(name, loc, index) {
        // 使用AI生成的坐标，或计算默认值
        var x = loc.x !== undefined ? loc.x : NR.calcDefaultX(index, false);
        var y = loc.y !== undefined ? loc.y : NR.calcDefaultY(index, false);
        var iconColor = NR.getIconColor(index);
        var icon = loc.icon || 'fa-map-marker-alt';
        if (!icon.startsWith('fa-')) icon = 'fa-' + icon;
        
        var mapData = NR.getMapData();
        var mapState = NR.state.phoneChatState.mapState;
        var pathStr = mapState.navigationPath.map(function(p) { return p.id; }).join('/');
        var fullPath = pathStr ? pathStr + '/' + name : name;
        var chars = NR.getCharsAtPath(fullPath, mapData ? mapData.characters : {});
        
        var html = '<div class="map-standalone-card" data-loc="' + NR.escapeHtml(name) + '" ';
        html += 'style="left:' + x + 'px; top:' + y + 'px;">';
        
        html += '<div class="standalone-icon" style="background:' + iconColor + ';">';
        html += '<i class="fas ' + icon + '"></i>';
        html += '</div>';
        html += '<div class="standalone-name">' + NR.escapeHtml(name) + '</div>';
        
        if (chars.length > 0) {
            html += '<div class="standalone-chars">';
            chars.slice(0, 2).forEach(function(c) {
                var profile = NR.getCharacterProfile(c.name);
                if (profile && profile.cover) {
                    html += '<img class="standalone-char-avatar" src="' + profile.cover + '" title="' + NR.escapeHtml(c.name) + '">';
                } else {
                    var color = NR.getCharacterColor(c.name, profile && profile.isProtagonist);
                    html += '<div class="standalone-char-avatar" style="background:' + color.bg + ';color:' + color.text + ';" title="' + NR.escapeHtml(c.name) + '">' + (c.name || '?')[0] + '</div>';
                }
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    };

    // 计算默认X坐标
    NR.calcDefaultX = function(index, isContainer) {
        var col = index % 3;
        if (isContainer) {
            return 30 + col * 250;
        }
        return 40 + col * 130;
    };

    // 计算默认Y坐标
    NR.calcDefaultY = function(index, isContainer) {
        var row = Math.floor(index / 3);
        if (isContainer) {
            return 30 + row * 220;
        }
        return 40 + row * 120;
    };

    // 计算容器宽度
    NR.calcContainerWidth = function(subCount) {
        var cols = Math.min(subCount, 3);
        return Math.max(150, cols * 90 + 40);
    };

    // 计算容器高度
    NR.calcContainerHeight = function(subCount) {
        var rows = Math.ceil(subCount / 3);
        return Math.max(110, rows * 70 + 50);
    };

    // 计算容器内卡片X坐标
    NR.calcInnerX = function(index) {
        var col = index % 3;
        return 10 + col * 85;
    };

    // 计算容器内卡片Y坐标
    NR.calcInnerY = function(index) {
        var row = Math.floor(index / 3);
        return 5 + row * 65;
    };

    // 计算容器大小
    NR.calcContainerSize = function(subCount) {
        var cols = Math.min(subCount, 3);
        var rows = Math.ceil(subCount / 3);
        return {
            w: Math.max(140, cols * 90 + 30),
            h: Math.max(100, rows * 70 + 45)
        };
    };

    // 计算容器位置
    NR.calcContainerPosition = function(index, position) {
        var pos = position || (index + 1);
        var col = (pos - 1) % 3;
        var row = Math.floor((pos - 1) / 3);
        return { x: 30 + col * 220, y: 30 + row * 200 };
    };

    // 计算容器内卡片位置
    NR.calcInnerCardPosition = function(index, position) {
        var col = index % 3;
        var row = Math.floor(index / 3);
        return { x: 10 + col * 85, y: 5 + row * 65 };
    };

    // 计算独立卡片位置
    NR.calcStandalonePosition = function(index, position) {
        var pos = position || (index + 1);
        var col = (pos - 1) % 3;
        var row = Math.floor((pos - 1) / 3);
        return { x: 40 + col * 130, y: 40 + row * 120 };
    };

    // 获取容器背景色
    NR.getContainerBgColor = function(index) {
        var colors = [
            'rgba(76, 175, 80, 0.15)',   // 绿
            'rgba(33, 150, 243, 0.15)',  // 蓝
            'rgba(255, 152, 0, 0.15)',   // 橙
            'rgba(156, 39, 176, 0.15)',  // 紫
            'rgba(0, 188, 212, 0.15)',   // 青
            'rgba(233, 30, 99, 0.15)'    // 粉
        ];
        return colors[index % colors.length];
    };

    // 获取图标颜色
    NR.getIconColor = function(index) {
        var colors = ['#667eea', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'];
        return colors[index % colors.length];
    };

    // 获取指定路径的人物
    NR.getCharsAtPath = function(path, characters) {
        var result = [];
        Object.keys(characters || {}).forEach(function(name) {
            var loc = characters[name].location || '';
            if (loc === path || loc.startsWith(path + '/')) {
                result.push({ name: name, data: characters[name] });
            }
        });
        return result;
    };


    // 渲染左下角信息面板
    NR.renderMapInfoPanel = function() {
        var mapState = NR.state.phoneChatState.mapState;
        var loc = mapState.hoveredLocation;
        if (!loc) return '';
        
        var html = '<div class="map-info-panel" id="map-info-panel">';
        html += '<div class="info-panel-header">';
        html += '<span class="info-panel-title">' + NR.escapeHtml(loc.name) + '</span>';
        html += '</div>';
        html += '<div class="info-panel-body">';
        
        if (loc.data.description) {
            html += '<p class="info-panel-desc">' + NR.escapeHtml(loc.data.description) + '</p>';
        }
        if (loc.data.openTime) {
            html += '<p class="info-panel-time"><i class="fas fa-clock"></i> ' + NR.escapeHtml(loc.data.openTime) + '</p>';
        }
        
        html += '</div>';
        html += '</div>';
        return html;
    };

    // 显示信息面板（不刷新整个界面）
    NR.showMapInfoPanel = function(name, data) {
        var existing = document.getElementById('map-info-panel');
        if (existing) existing.remove();
        
        var html = '<div class="map-info-panel" id="map-info-panel">';
        html += '<div class="info-panel-header">';
        html += '<span class="info-panel-title">' + NR.escapeHtml(name) + '</span>';
        html += '</div>';
        html += '<div class="info-panel-body">';
        
        if (data.description) {
            html += '<p class="info-panel-desc">' + NR.escapeHtml(data.description) + '</p>';
        }
        if (data.openTime) {
            html += '<p class="info-panel-time"><i class="fas fa-clock"></i> ' + NR.escapeHtml(data.openTime) + '</p>';
        }
        
        html += '</div>';
        html += '</div>';
        
        var container = document.querySelector('.phone-map-container');
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
        }
    };

    // 隐藏信息面板
    NR.hideMapInfoPanel = function() {
        var panel = document.getElementById('map-info-panel');
        if (panel) panel.remove();
    };

    // 显示地点详情弹窗
    NR.showLocationDetailPopup = function(name, data, parentName) {
        var mapData = NR.getMapData();
        var characters = mapData ? mapData.characters : {};
        
        // 计算完整路径
        var mapState = NR.state.phoneChatState.mapState;
        var pathStr = mapState.navigationPath.map(function(p) { return p.id; }).join('/');
        var fullPath = pathStr ? pathStr + '/' + name : name;
        if (parentName) {
            fullPath = pathStr ? pathStr + '/' + parentName + '/' + name : parentName + '/' + name;
        }
        
        // 获取该地点的人物
        var charsHere = NR.getCharsAtPath(fullPath, characters);
        
        var html = '<div class="map-backdrop" id="map-detail-backdrop"></div>';
        html += '<div class="map-location-detail">';
        
        // 头部
        html += '<div class="location-detail-header">';
        html += '<h3 class="location-detail-title">' + NR.escapeHtml(name) + '</h3>';
        html += '<button class="location-detail-close" id="btn-detail-close"><i class="fas fa-times"></i></button>';
        html += '</div>';
        
        // 内容
        html += '<div class="location-detail-body">';
        
        // 描述
        if (data.description) {
            html += '<div class="location-detail-section">';
            html += '<div class="location-detail-label">地点描述</div>';
            html += '<p class="location-detail-text">' + NR.escapeHtml(data.description) + '</p>';
            html += '</div>';
        }
        
        // 开放时间
        if (data.openTime) {
            html += '<div class="location-detail-section">';
            html += '<div class="location-detail-label"><i class="fas fa-clock"></i> 开放时间</div>';
            html += '<p class="location-detail-text">' + NR.escapeHtml(data.openTime) + '</p>';
            html += '</div>';
        }
        
        // 当前状态
        if (data.status) {
            html += '<div class="location-detail-section">';
            html += '<div class="location-detail-label"><i class="fas fa-info-circle"></i> 当前状态</div>';
            html += '<p class="location-detail-text">' + NR.escapeHtml(data.status) + '</p>';
            html += '</div>';
        }
        
        // 正在发生的事件
        if (data.events) {
            html += '<div class="location-detail-section">';
            html += '<div class="location-detail-label"><i class="fas fa-bolt"></i> 正在发生</div>';
            html += '<p class="location-detail-text">' + NR.escapeHtml(data.events) + '</p>';
            html += '</div>';
        }
        
        // 在场人物
        html += '<div class="location-detail-section">';
        html += '<div class="location-detail-label"><i class="fas fa-users"></i> 在场人物</div>';
        html += '<div class="location-popup-characters-container">';
        
        if (charsHere.length > 0) {
            html += '<div class="location-popup-characters-group">';
            html += '<div class="location-popup-characters-label">主要人物</div>';
            html += '<div class="location-detail-chars">';
            charsHere.forEach(function(c) {
                var profile = NR.getCharacterProfile(c.name);
                var color = NR.getCharacterColor(c.name, profile && profile.isProtagonist);
                html += '<div class="location-char-item" data-char="' + NR.escapeHtml(c.name) + '">';
                if (profile && profile.cover) {
                    html += '<img class="location-char-img" src="' + profile.cover + '">';
                } else {
                    html += '<div class="location-char-img" style="background:' + color.bg + ';color:' + color.text + ';">' + (c.name || '?')[0] + '</div>';
                }
                html += '<span class="location-char-name">' + NR.escapeHtml(c.name) + '</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        }
        
        // 其他角色
        if (data.otherCharacters) {
            html += '<div class="location-popup-characters-group">';
            html += '<div class="location-popup-characters-label">其他人物</div>';
            html += '<div class="location-popup-characters other-characters">';
            html += '<span class="location-popup-empty-message normal"><i class="fas fa-users"></i> ' + NR.escapeHtml(data.otherCharacters) + '</span>';
            html += '</div>';
            html += '</div>';
        }
        
        if (charsHere.length === 0 && !data.otherCharacters) {
            html += '<div class="location-popup-characters">';
            html += '<span class="location-popup-empty-message"><i class="fas fa-user-slash"></i> 暂无人物</span>';
            html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
        
        // 子地点列表（如果有）
        if (data.subLocations && Object.keys(data.subLocations).length > 0) {
            html += '<div class="location-detail-section">';
            html += '<div class="location-detail-label"><i class="fas fa-map-signs"></i> 子地点</div>';
            html += '<div class="location-detail-sublocs">';
            Object.keys(data.subLocations).forEach(function(subName) {
                var subLoc = data.subLocations[subName];
                var subIcon = subLoc.icon || 'fa-map-marker-alt';
                if (!subIcon.startsWith('fa-')) subIcon = 'fa-' + subIcon;
                html += '<div class="location-subloc-item">';
                html += '<i class="fas ' + subIcon + '"></i>';
                html += '<span>' + NR.escapeHtml(subName) + '</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>'; // end body
        
        // 底部按钮
        html += '<div class="location-detail-footer">';
        if (data.subLocations && Object.keys(data.subLocations).length > 0) {
            html += '<button class="location-detail-enter" data-enter="' + NR.escapeHtml(name) + '"><i class="fas fa-door-open"></i> 进入此地点</button>';
        }
        html += '</div>';
        
        html += '</div>'; // end popup
        
        var container = document.querySelector('.phone-map-container');
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
            NR.bindLocationDetailEvents();
        }
    };

    // 绑定详情弹窗事件
    NR.bindLocationDetailEvents = function() {
        var closeBtn = document.getElementById('btn-detail-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                NR.hideLocationDetailPopup();
            });
        }
        
        var backdrop = document.getElementById('map-detail-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', function() {
                NR.hideLocationDetailPopup();
            });
        }
        
        // 进入按钮
        var enterBtn = document.querySelector('.location-detail-enter');
        if (enterBtn) {
            enterBtn.addEventListener('click', function() {
                var locName = this.dataset.enter;
                NR.hideLocationDetailPopup();
                NR.enterLocation(locName);
            });
        }
        
        // 人物点击
        document.querySelectorAll('.location-char-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var charName = this.dataset.char;
                var profile = NR.getCharacterProfile(charName);
                if (profile) {
                    NR.hideLocationDetailPopup();
                    NR.state.phoneChatState.selectedCharacter = profile;
                    NR.state.phoneChatState.chatHistory = (NR.state.currentBookData.phoneChatHistory || {})[charName] || [];
                    NR.state.phoneChatState.currentScreen = 'chat';
                    NR.refreshPhoneModal();
                }
            });
        });
    };

    // 隐藏详情弹窗
    NR.hideLocationDetailPopup = function() {
        var backdrop = document.getElementById('map-detail-backdrop');
        var popup = document.querySelector('.map-location-detail');
        if (backdrop) backdrop.remove();
        if (popup) popup.remove();
    };

    // 渲染人物列表
    NR.renderMapCharacterList = function(mapData) {
        var characters = mapData.characters || {};
        var names = Object.keys(characters);
        
        var html = '<div class="map-backdrop" id="map-char-backdrop"></div>';
        html += '<div class="map-characters-list">';
        html += '<div class="characters-list-header">';
        html += '<span>人物位置</span>';
        html += '<button class="characters-list-close" id="btn-char-list-close"><i class="fas fa-times"></i></button>';
        html += '</div>';
        html += '<div class="characters-list-content">';
        
        if (names.length === 0) {
            html += '<div class="no-characters">暂无人物数据</div>';
        } else {
            names.forEach(function(name) {
                var c = characters[name];
                var profile = NR.getCharacterProfile(name);
                var color = NR.getCharacterColor(name, profile && profile.isProtagonist);
                
                html += '<div class="character-item" data-char="' + NR.escapeHtml(name) + '">';
                if (profile && profile.cover) {
                    html += '<img class="character-avatar" src="' + profile.cover + '">';
                } else {
                    html += '<div class="character-avatar" style="background:' + color.bg + ';color:' + color.text + ';">' + (name || '?')[0] + '</div>';
                }
                html += '<div class="character-info">';
                html += '<div class="character-name">' + NR.escapeHtml(name) + '</div>';
                html += '<div class="character-location"><i class="fas fa-map-marker-alt"></i> ' + NR.escapeHtml(c.location || '未知') + '</div>';
                html += '</div>';
                html += '<button class="character-goto-btn" data-loc="' + NR.escapeHtml(c.location || '') + '"><i class="fas fa-location-arrow"></i></button>';
                html += '</div>';
            });
        }
        
        html += '</div></div>';
        return html;
    };

    // 获取人物卡信息
    NR.getCharacterProfile = function(name) {
        var profiles = NR.state.currentBookData.characterProfiles || [];
        return profiles.find(function(p) { return p.name === name; });
    };

    // 进入地点
    NR.enterLocation = function(locName) {
        var mapState = NR.state.phoneChatState.mapState;
        mapState.navigationPath.push({ id: locName, name: locName });
        mapState.hoveredLocation = null;
        mapState.transform = { scale: 1, translateX: 0, translateY: 0 };
        NR.refreshPhoneModal();
    };

    // 返回层级
    NR.goBackToLevel = function(index) {
        var mapState = NR.state.phoneChatState.mapState;
        if (index < 0) {
            mapState.navigationPath = [];
        } else {
            mapState.navigationPath = mapState.navigationPath.slice(0, index + 1);
        }
        mapState.hoveredLocation = null;
        mapState.transform = { scale: 1, translateX: 0, translateY: 0 };
        NR.refreshPhoneModal();
    };

    // 导航到位置
    NR.navigateToLocation = function(path) {
        if (!path) return;
        var mapState = NR.state.phoneChatState.mapState;
        var parts = path.split('/');
        mapState.navigationPath = parts.slice(0, -1).map(function(p) { return { id: p, name: p }; });
        mapState.hoveredLocation = null;
        mapState.transform = { scale: 1, translateX: 0, translateY: 0 };
        NR.refreshPhoneModal();
    };

    // 缩放
    NR.zoomMap = function(delta) {
        var mapState = NR.state.phoneChatState.mapState;
        var newScale = Math.max(0.5, Math.min(2, mapState.transform.scale + delta));
        mapState.transform.scale = newScale;
        var canvas = document.getElementById('map-canvas');
        if (canvas) {
            canvas.style.transform = 'translate(' + mapState.transform.translateX + 'px,' + mapState.transform.translateY + 'px) scale(' + newScale + ')';
        }
    };

    // 重置视图
    NR.resetMapView = function() {
        var mapState = NR.state.phoneChatState.mapState;
        mapState.transform = { scale: 1, translateX: 0, translateY: 0 };
        var canvas = document.getElementById('map-canvas');
        if (canvas) {
            canvas.style.transform = 'translate(0px,0px) scale(1)';
        }
    };

    // 生成地图数据
    NR.generateMapData = function() {
        NR.initMapData();
        var mapState = NR.state.phoneChatState.mapState;
        
        if (mapState.isGenerating) return;
        
        if (!NR.state.aiSettings.apiUrl || !NR.state.aiSettings.apiKey || !NR.state.aiSettings.modelName) {
            alert('请先在设置中配置 AI API');
            return;
        }
        
        mapState.isGenerating = true;
        NR.refreshPhoneModal();
        
        var profiles = NR.state.currentBookData.characterProfiles || [];
        if (profiles.length === 0) {
            mapState.isGenerating = false;
            alert('请先添加人物卡');
            NR.refreshPhoneModal();
            return;
        }
        
        var charInfo = profiles.map(function(p) {
            var info = '- ' + p.name;
            if (p.isProtagonist) info += '（主角）';
            if (p.data) {
                var id = p.data['身份'] || p.data['职业/身份'] || '';
                if (id) info += ' - ' + id;
            }
            return info;
        }).join('\n');
        
        var worldLocs = NR.state.currentBookData.locations || [];
        var locInfo = '';
        var hasWorldLocs = worldLocs.length > 0;
        if (hasWorldLocs) {
            locInfo = '\n\n【世界地点信息】（必须使用以下地点）\n';
            worldLocs.forEach(function(l, i) {
                var locData = l.data || l;
                var locName = locData.name || locData['地点名称'] || '未命名地点';
                var locDesc = locData.description || locData['描述'] || locData['地点描述'] || '';
                var locType = locData.type || locData['类型'] || locData['地点类型'] || '';
                locInfo += (i + 1) + '. ' + locName;
                if (locDesc) locInfo += ' - ' + locDesc;
                if (locType) locInfo += ' (' + locType + ')';
                locInfo += '\n';
            });
        }
        
        var now = new Date();
        var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
        var timeStr = (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        var prompt = '你是一个角色扮演助手，请生成地图数据。\n\n';
        prompt += '【角色信息】\n' + charInfo + '\n';
        prompt += locInfo;
        prompt += '\n【要求】\n';
        if (hasWorldLocs) {
            prompt += '1. 【重要】必须使用上面【世界地点信息】中列出的所有地点，地点名称必须完全一致\n';
            prompt += '2. 可以为这些地点添加子地点来丰富细节\n';
            prompt += '3. 生成层级地图，大地点包含多个平级的小地点\n';
        } else {
            prompt += '1. 生成层级地图，大地点包含多个平级的小地点\n';
        }
        prompt += '4. 大地点的subLocations下包含多个平级的小地点，小地点之间不要嵌套\n';
        prompt += '5. 没有子地点的地点不需要subLocations\n';
        prompt += '6. 每个地点需要指定坐标和尺寸，确保不重叠\n';
        prompt += '7. 图标用FontAwesome名如fa-home\n';
        prompt += '8. 每个地点必须包含：description(描述)、status(当前状态)、events(正在发生的事件)、otherCharacters(其他角色描述)\n\n';
        prompt += '【坐标和尺寸说明】\n';
        prompt += '- 大地点(有subLocations)：x, y是左上角坐标，width, height是容器尺寸\n';
        prompt += '- 小地点(无subLocations)：x, y是左上角坐标\n';
        prompt += '- 容器内的子地点：x, y是相对于容器内部的坐标\n';
        prompt += '- 画布大小约800x600，请合理分布地点，避免重叠\n';
        prompt += '- 大地点容器宽度建议150-300，高度建议100-200\n';
        prompt += '- 子地点之间间距约80-90像素\n\n';
        prompt += '【格式】\n```yaml\n<map>\n';
        prompt += 'mapName: 地图名\ndate: ' + dateStr + '\ntime: "' + timeStr + '"\n\n';
        prompt += 'locations:\n';
        prompt += '  老街:\n';
        prompt += '    x: 30\n';
        prompt += '    y: 30\n';
        prompt += '    width: 280\n';
        prompt += '    height: 130\n';
        prompt += '    icon: fa-road\n';
        prompt += '    description: 古老的街道，青石板路面\n';
        prompt += '    status: 人来人往，热闹非凡\n';
        prompt += '    events: 有商贩在叫卖\n';
        prompt += '    otherCharacters: 几个路人在闲逛\n';
        prompt += '    subLocations:\n';
        prompt += '      杂货铺:\n';
        prompt += '        x: 10\n';
        prompt += '        y: 5\n';
        prompt += '        icon: fa-store\n';
        prompt += '        description: 售卖日用品的小店\n';
        prompt += '        status: 正常营业中\n';
        prompt += '        events: 老板正在整理货架\n';
        prompt += '        otherCharacters: 一位老顾客在挑选商品\n';
        prompt += '      古井:\n';
        prompt += '        x: 95\n';
        prompt += '        y: 5\n';
        prompt += '        icon: fa-tint\n';
        prompt += '        description: 镇上的老井\n';
        prompt += '        status: 井水清澈\n';
        prompt += '        events: 无\n';
        prompt += '        otherCharacters: 无\n';
        prompt += '      茶馆:\n';
        prompt += '        x: 180\n';
        prompt += '        y: 5\n';
        prompt += '        icon: fa-coffee\n';
        prompt += '        description: 喝茶聊天的地方\n';
        prompt += '        status: 座无虚席\n';
        prompt += '        events: 有人在说书\n';
        prompt += '        otherCharacters: 几桌茶客在聊天\n';
        prompt += '  工厂区:\n';
        prompt += '    x: 330\n';
        prompt += '    y: 30\n';
        prompt += '    width: 200\n';
        prompt += '    height: 180\n';
        prompt += '    icon: fa-industry\n';
        prompt += '    description: 工业区\n';
        prompt += '    status: 机器轰鸣\n';
        prompt += '    events: 正在生产\n';
        prompt += '    otherCharacters: 工人们在忙碌\n';
        prompt += '    subLocations:\n';
        prompt += '      车间:\n';
        prompt += '        x: 10\n';
        prompt += '        y: 5\n';
        prompt += '        icon: fa-cogs\n';
        prompt += '        description: 生产车间\n';
        prompt += '        status: 运转中\n';
        prompt += '        events: 机器在运转\n';
        prompt += '        otherCharacters: 几个工人在操作机器\n';
        prompt += '      仓库:\n';
        prompt += '        x: 95\n';
        prompt += '        y: 5\n';
        prompt += '        icon: fa-warehouse\n';
        prompt += '        description: 存放货物的仓库\n';
        prompt += '        status: 货物堆积\n';
        prompt += '        events: 有人在搬运货物\n';
        prompt += '        otherCharacters: 仓库管理员在清点\n';
        prompt += '      办公室:\n';
        prompt += '        x: 10\n';
        prompt += '        y: 70\n';
        prompt += '        icon: fa-building\n';
        prompt += '        description: 办公区域\n';
        prompt += '        status: 安静\n';
        prompt += '        events: 无\n';
        prompt += '        otherCharacters: 几个文员在工作\n';
        prompt += '  郊外树林:\n';
        prompt += '    x: 30\n';
        prompt += '    y: 180\n';
        prompt += '    icon: fa-tree\n';
        prompt += '    description: 城外的树林\n';
        prompt += '    status: 幽静\n';
        prompt += '    events: 鸟鸣声声\n';
        prompt += '    otherCharacters: 偶尔有樵夫经过\n';
        prompt += '  河边码头:\n';
        prompt += '    x: 160\n';
        prompt += '    y: 180\n';
        prompt += '    icon: fa-ship\n';
        prompt += '    description: 货运码头\n';
        prompt += '    status: 繁忙\n';
        prompt += '    events: 有船只靠岸\n';
        prompt += '    otherCharacters: 码头工人在卸货\n\n';
        prompt += 'characters:\n';
        prompt += '  角色名:\n';
        prompt += '    location: 老街/杂货铺\n';
        prompt += '    status: 正在购物\n';
        prompt += '</map>\n```';
        
        var apiUrl = NR.state.aiSettings.apiUrl.replace(/\/+$/, '');
        if (!apiUrl.endsWith('/chat/completions')) apiUrl += '/chat/completions';
        
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
            if (!res.ok) throw new Error('API请求失败: ' + res.status);
            return res.json();
        }).then(function(data) {
            var content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : null;
            if (!content) throw new Error('AI返回为空');
            
            var result = NR.parseMapYaml(content);
            if (result) {
                NR.state.currentBookData.mapData = result;
                NR.saveBookData();
                mapState.navigationPath = [];
                mapState.hoveredLocation = null;
                mapState.transform = { scale: 1, translateX: 0, translateY: 0 };
            } else {
                throw new Error('解析失败');
            }
            
            mapState.isGenerating = false;
            NR.refreshPhoneModal();
        }).catch(function(err) {
            console.error('[Map] 生成失败:', err);
            mapState.isGenerating = false;
            alert('生成失败: ' + err.message);
            NR.refreshPhoneModal();
        });
    };


    // 解析YAML
    NR.parseMapYaml = function(content) {
        try {
            var match = content.match(/```ya?ml?\s*([\s\S]*?)```/);
            var yaml = match ? match[1].trim() : content.trim();
            
            var mapMatch = yaml.match(/<map>([\s\S]*?)<\/map>/);
            if (mapMatch) yaml = mapMatch[1].trim();
            else yaml = yaml.replace(/^<map>\s*/i, '').replace(/<\/map>\s*$/i, '');
            
            var result = { mapName: '', date: '', time: '', locations: {}, characters: {} };
            
            var nameMatch = yaml.match(/mapName:\s*["']?([^"'\n]+)["']?/);
            if (nameMatch) result.mapName = nameMatch[1].trim();
            
            var dateMatch = yaml.match(/date:\s*["']?([^"'\n]+)["']?/);
            if (dateMatch) result.date = dateMatch[1].trim();
            
            var timeMatch = yaml.match(/time:\s*["']?([^"'\n]+)["']?/);
            if (timeMatch) result.time = timeMatch[1].trim();
            
            var locMatch = yaml.match(/locations:\s*\n([\s\S]*?)(?=\ncharacters:|$)/);
            if (locMatch) result.locations = NR.parseLocations(locMatch[1]);
            
            var charMatch = yaml.match(/characters:\s*\n([\s\S]*?)$/);
            if (charMatch) result.characters = NR.parseCharacters(charMatch[1]);
            
            return result;
        } catch (e) {
            console.error('[Map] 解析错误:', e);
            return null;
        }
    };

    // 解析地点
    NR.parseLocations = function(content) {
        var locs = {};
        var lines = content.split('\n');
        var currentTopLevel = null;  // 当前顶级地点
        var inSubLocations = false;  // 是否在subLocations区域
        var subLocIndent = -1;       // subLocations的缩进
        var currentSubLoc = null;    // 当前子地点
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var trimmed = line.trim();
            if (!trimmed) continue;
            
            var indent = line.search(/\S/);
            
            // 检测 subLocations: 关键字
            if (trimmed === 'subLocations:') {
                inSubLocations = true;
                subLocIndent = indent;
                currentSubLoc = null;
                continue;
            }
            
            // 检测地点名称（以冒号结尾，不包含": "）
            if (trimmed.endsWith(':') && !trimmed.includes(': ')) {
                var name = trimmed.slice(0, -1);
                
                // 判断是顶级地点还是子地点
                if (inSubLocations && indent > subLocIndent && currentTopLevel) {
                    // 这是一个子地点，添加到当前顶级地点的subLocations
                    if (!currentTopLevel.subLocations) currentTopLevel.subLocations = {};
                    var subLoc = { x: undefined, y: undefined, icon: 'fa-map-marker-alt', description: '', openTime: '', status: '', events: '', otherCharacters: '' };
                    currentTopLevel.subLocations[name] = subLoc;
                    currentSubLoc = subLoc;
                } else {
                    // 这是一个顶级地点
                    inSubLocations = false;
                    subLocIndent = -1;
                    currentSubLoc = null;
                    
                    var loc = { x: undefined, y: undefined, width: undefined, height: undefined, icon: 'fa-map-marker-alt', description: '', openTime: '', status: '', events: '', otherCharacters: '', subLocations: {} };
                    locs[name] = loc;
                    currentTopLevel = loc;
                }
            }
            // 属性行
            else {
                var propMatch = trimmed.match(/^(\w+):\s*(.*)$/);
                if (propMatch) {
                    var key = propMatch[1];
                    var val = propMatch[2].replace(/^["']|["']$/g, '').trim();
                    
                    if (key === 'subLocations') {
                        inSubLocations = true;
                        subLocIndent = indent;
                        currentSubLoc = null;
                    } else {
                        // 确定属性属于哪个地点
                        var target = null;
                        if (inSubLocations && currentSubLoc) {
                            target = currentSubLoc;
                        } else if (currentTopLevel) {
                            target = currentTopLevel;
                        }
                        
                        if (target) {
                            // 数值类型的属性
                            if (key === 'x' || key === 'y' || key === 'width' || key === 'height' || key === 'position') {
                                target[key] = parseInt(val) || 0;
                            } else if (target.hasOwnProperty(key)) {
                                target[key] = val;
                            }
                        }
                    }
                }
            }
        }
        
        return locs;
    };

    // 解析人物
    NR.parseCharacters = function(content) {
        var chars = {};
        var lines = content.split('\n');
        var current = null;
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var trimmed = line.trim();
            if (!trimmed) continue;
            
            var indent = line.search(/\S/);
            
            if (indent === 2 && trimmed.endsWith(':') && !trimmed.includes(': ')) {
                var name = trimmed.slice(0, -1);
                current = name;
                chars[name] = { location: '', status: '' };
            } else if (indent === 4 && current) {
                var m = trimmed.match(/^(\w+):\s*(.*)$/);
                if (m && chars[current].hasOwnProperty(m[1])) {
                    chars[current][m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
                }
            }
        }
        
        return chars;
    };

    // 绑定事件
    NR.bindMapEvents = function(modal) {
        NR.initMapData();
        var mapState = NR.state.phoneChatState.mapState;
        if (NR.state.phoneChatState.currentScreen !== 'map') return;
        
        // 刷新按钮
        var refreshBtn = document.getElementById('btn-map-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() { NR.generateMapData(); });
        }
        
        // 人物列表按钮
        var charsBtn = document.getElementById('btn-map-characters');
        if (charsBtn) {
            charsBtn.addEventListener('click', function() {
                mapState.showCharacterList = !mapState.showCharacterList;
                NR.refreshPhoneModal();
            });
        }
        
        // 面包屑
        modal.querySelectorAll('.breadcrumb-item').forEach(function(item) {
            item.addEventListener('click', function() {
                NR.goBackToLevel(parseInt(this.dataset.index));
            });
        });
        
        // 大容器进入按钮
        modal.querySelectorAll('.map-container-enter').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var locName = this.dataset.enter;
                if (locName) {
                    NR.enterLocation(locName);
                }
            });
        });
        
        // 大容器点击显示详情
        modal.querySelectorAll('.map-container').forEach(function(el) {
            el.addEventListener('click', function(e) {
                // 如果点击的是进入按钮，不处理
                if (e.target.closest('.map-container-enter')) return;
                var name = this.dataset.loc;
                var locs = NR.getCurrentLevelLocations();
                if (locs[name]) {
                    NR.showLocationDetailPopup(name, locs[name]);
                }
            });
            el.addEventListener('mouseenter', function() {
                var name = this.dataset.loc;
                var locs = NR.getCurrentLevelLocations();
                if (locs[name]) {
                    NR.showMapInfoPanel(name, locs[name]);
                }
            });
            el.addEventListener('mouseleave', function() {
                NR.hideMapInfoPanel();
            });
        });
        
        // 独立卡片点击显示详情
        modal.querySelectorAll('.map-standalone-card').forEach(function(el) {
            el.addEventListener('click', function() {
                var name = this.dataset.loc;
                var locs = NR.getCurrentLevelLocations();
                if (locs[name]) {
                    NR.showLocationDetailPopup(name, locs[name]);
                }
            });
            el.addEventListener('mouseenter', function() {
                var name = this.dataset.loc;
                var locs = NR.getCurrentLevelLocations();
                if (locs[name]) {
                    NR.showMapInfoPanel(name, locs[name]);
                }
            });
            el.addEventListener('mouseleave', function() {
                NR.hideMapInfoPanel();
            });
        });
        
        // 容器内小卡片点击显示详情
        modal.querySelectorAll('.map-inner-card').forEach(function(el) {
            el.addEventListener('click', function(e) {
                e.stopPropagation();
                var name = this.dataset.loc;
                var parentName = this.dataset.parent;
                var locs = NR.getCurrentLevelLocations();
                if (parentName && locs[parentName] && locs[parentName].subLocations && locs[parentName].subLocations[name]) {
                    NR.showLocationDetailPopup(name, locs[parentName].subLocations[name], parentName);
                }
            });
        });
        
        // 缩放按钮
        var zoomIn = document.getElementById('btn-map-zoom-in');
        if (zoomIn) zoomIn.addEventListener('click', function() { NR.zoomMap(0.2); });
        
        var zoomOut = document.getElementById('btn-map-zoom-out');
        if (zoomOut) zoomOut.addEventListener('click', function() { NR.zoomMap(-0.2); });
        
        var zoomReset = document.getElementById('btn-map-zoom-reset');
        if (zoomReset) zoomReset.addEventListener('click', function() { NR.resetMapView(); });
        
        // 人物列表关闭
        var charClose = document.getElementById('btn-char-list-close');
        if (charClose) {
            charClose.addEventListener('click', function() {
                mapState.showCharacterList = false;
                NR.refreshPhoneModal();
            });
        }
        
        var charBackdrop = document.getElementById('map-char-backdrop');
        if (charBackdrop) {
            charBackdrop.addEventListener('click', function() {
                mapState.showCharacterList = false;
                NR.refreshPhoneModal();
            });
        }
        
        // 人物前往按钮
        modal.querySelectorAll('.character-goto-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                mapState.showCharacterList = false;
                NR.navigateToLocation(this.dataset.loc);
            });
        });
        
        // 人物点击发消息
        modal.querySelectorAll('.character-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var name = this.dataset.char;
                var profile = NR.getCharacterProfile(name);
                if (profile) {
                    NR.state.phoneChatState.selectedCharacter = profile;
                    NR.state.phoneChatState.chatHistory = (NR.state.currentBookData.phoneChatHistory || {})[name] || [];
                    NR.state.phoneChatState.currentScreen = 'chat';
                    mapState.showCharacterList = false;
                    NR.refreshPhoneModal();
                }
            });
        });
        
        // 拖拽
        NR.bindMapDrag(modal);
    };

    // 拖拽事件
    NR.bindMapDrag = function(modal) {
        var canvas = document.getElementById('map-canvas');
        var wrapper = modal.querySelector('.map-canvas-wrapper');
        if (!canvas || !wrapper) return;
        
        var mapState = NR.state.phoneChatState.mapState;
        
        var onStart = function(e) {
            if (e.target.closest('.map-container') || e.target.closest('.map-standalone-card')) return;
            mapState.isDragging = true;
            mapState.lastTranslate = { x: mapState.transform.translateX, y: mapState.transform.translateY };
            var pt = e.touches ? e.touches[0] : e;
            mapState.dragStart = { x: pt.clientX, y: pt.clientY };
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        };
        
        var onMove = function(e) {
            if (!mapState.isDragging) return;
            var pt = e.touches ? e.touches[0] : e;
            mapState.transform.translateX = mapState.lastTranslate.x + pt.clientX - mapState.dragStart.x;
            mapState.transform.translateY = mapState.lastTranslate.y + pt.clientY - mapState.dragStart.y;
            canvas.style.transform = 'translate(' + mapState.transform.translateX + 'px,' + mapState.transform.translateY + 'px) scale(' + mapState.transform.scale + ')';
        };
        
        var onEnd = function() {
            mapState.isDragging = false;
            canvas.style.cursor = 'grab';
        };
        
        wrapper.addEventListener('mousedown', onStart);
        wrapper.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
        
        wrapper.addEventListener('wheel', function(e) {
            e.preventDefault();
            NR.zoomMap(e.deltaY > 0 ? -0.1 : 0.1);
        }, { passive: false });
        
        canvas.style.cursor = 'grab';
    };

})();
