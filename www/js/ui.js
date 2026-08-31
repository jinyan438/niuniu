// UI 管理
(function() {
    var NR = window.NovelReader;

    NR.showReaderView = function() {
        NR.els['bookshelf-view'].style.display = 'none';
        var sourceView = document.getElementById('book-source-view');
        if (sourceView) sourceView.style.display = 'none';
        NR.els.readerView.style.display = 'flex';
    };

    NR.showBookshelfView = function() {
        NR.els.readerView.style.display = 'none';
        var sourceView = document.getElementById('book-source-view');
        if (sourceView) sourceView.style.display = 'none';
        NR.els['bookshelf-view'].style.display = 'flex';
        NR.populateFilterDropdown();
        NR.renderBookshelf();
        if (NR.state.isInImmersiveMode) {
            NR.state.isInImmersiveMode = false;
            NR.els.readerView.classList.remove('immersive-active');
            NR.clearImmersiveHighlight();
        }
    };

    NR.updateUI = function() {
        if (NR.state.totalPages === 0 && NR.state.currentFileName === '') {
            NR.updatePageInfo('-', '-');
            NR.els['chapter-info'].textContent = '';
            return;
        }
        NR.updatePageInfo(NR.state.currentPage, NR.state.totalPages);
        var chapInfo = NR.getChapterInfoForPage(NR.state.currentPage);
        if (chapInfo) {
            NR.els['chapter-info'].textContent = chapInfo.title + ' (' + chapInfo.current + '/' + chapInfo.total + ')';
            NR.els['chapter-info'].title = chapInfo.title + ' (本章第 ' + chapInfo.current + ' 页 / 共 ' + chapInfo.total + ' 页)';
            NR.els['chapter-info'].style.visibility = 'visible';
        } else {
            NR.els['chapter-info'].textContent = '';
            NR.els['chapter-info'].style.visibility = 'hidden';
        }
    };

    NR.updatePageInfo = function(current, total, isPaginating) {
        if (isPaginating) {
            NR.els['page-info'].textContent = '排版中...';
            NR.els['app-loader'].classList.remove('hidden');
            return;
        }
        NR.els['app-loader'].classList.add('hidden');
        NR.els['page-info'].textContent = current + ' / ' + total + ' 页';
    };

    NR.updateDOMPages = function() {
        NR.els['prev-page-container'].innerHTML = '';
        NR.els['current-page-container'].innerHTML = '';
        NR.els['next-page-container'].innerHTML = '';
        if (NR.state.allRenderedPages.length > 0 && NR.state.allRenderedPages[NR.state.currentPage - 1]) {
            NR.els['current-page-container'].appendChild(NR.state.allRenderedPages[NR.state.currentPage - 1]);
        } else {
            NR.els['current-page-container'].innerHTML = '<div class="page"><p>无内容</p></div>';
        }
        if (NR.state.currentPage > 1 && NR.state.allRenderedPages[NR.state.currentPage - 2]) {
            NR.els['prev-page-container'].appendChild(NR.state.allRenderedPages[NR.state.currentPage - 2]);
        }
        if (NR.state.currentPage < NR.state.totalPages && NR.state.allRenderedPages[NR.state.currentPage]) {
            NR.els['next-page-container'].appendChild(NR.state.allRenderedPages[NR.state.currentPage]);
        }
        NR.els['content-inner'].classList.add('is-dragging');
        NR.state.currentTranslate = -NR.state.viewportWidth;
        NR.els['content-inner'].style.transform = 'translateX(' + NR.state.currentTranslate + 'px)';
        NR.els['content-inner'].offsetHeight;
        NR.els['content-inner'].classList.remove('is-dragging');
        if (NR.refreshCommentMarkers) NR.refreshCommentMarkers();
    };

    NR.getChapterInfoForPage = function(pageNumber) {
        if (NR.state.chapters.length === 0 || !NR.state.allRenderedPages[pageNumber - 1]) return null;
        var firstPOnPage = NR.state.allRenderedPages[pageNumber - 1].querySelector("p[data-original-index]");
        if (!firstPOnPage) return null;
        var pIndex = parseInt(firstPOnPage.dataset.originalIndex, 10);
        var currentChap = null;
        for (var i = NR.state.chapters.length - 1; i >= 0; i--) {
            if (NR.state.chapters[i].p_index <= pIndex) {
                currentChap = NR.state.chapters[i];
                break;
            }
        }
        if (!currentChap) return null;
        var nextChap = NR.state.chapters.find(function(c) { return c.chap_num === currentChap.chap_num + 1; });
        var findPageForPIndex = function(idx) {
            for (var i = 0; i < NR.state.allRenderedPages.length; i++) {
                var firstP = NR.state.allRenderedPages[i].querySelector("p[data-original-index]");
                if (firstP && parseInt(firstP.dataset.originalIndex, 10) >= idx) {
                    return i + 1;
                }
            }
            return NR.state.totalPages;
        };
        var chapterStartPage = findPageForPIndex(currentChap.p_index);
        var chapterEndPage = nextChap ? findPageForPIndex(nextChap.p_index) - 1 : NR.state.totalPages;
        var totalPagesInChapter = (chapterEndPage - chapterStartPage) + 1;
        var currentPageInChapter = pageNumber - chapterStartPage + 1;
        if (currentPageInChapter < 1 || currentPageInChapter > totalPagesInChapter) return null;
        return { title: currentChap.title, current: currentPageInChapter, total: totalPagesInChapter };
    };

    NR.populateFilterDropdown = function() {
        var allTags = new Set();
        NR.state.bookshelf.forEach(function(book) {
            (book.tags || []).forEach(function(tag) { allTags.add(tag); });
        });
        NR.els['bookshelf-filter'].innerHTML = '<option value="">全部</option>';
        Array.from(allTags).sort().forEach(function(tag) {
            var option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            NR.els['bookshelf-filter'].appendChild(option);
        });
        NR.els['bookshelf-filter'].value = NR.state.activeFilterTag || '';
    };

    NR.renderBookshelf = function() {
        NR.els['bookshelf-grid'].innerHTML = '';
        var booksToRender = NR.state.bookshelf;
        if (NR.state.activeFilterTag) {
            booksToRender = NR.state.bookshelf.filter(function(b) { return b.tags && b.tags.includes(NR.state.activeFilterTag); });
        }
        if (booksToRender.length === 0) {
            var message = NR.state.activeFilterTag ? '在"' + NR.escapeHtml(NR.state.activeFilterTag) + '"分类下没有书籍。' : '书架是空的，请通过"导入"按钮添加书籍。';
            NR.els['bookshelf-grid'].innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-color);">' + message + '</p>';
            return;
        }
        booksToRender.forEach(function(book) {
            var bookEl = document.createElement('div');
            bookEl.className = 'book-item';
            bookEl.dataset.bookName = book.name;
            var coverEl = document.createElement('div');
            coverEl.className = 'book-cover';
            bookEl.dataset.hasCover = !!book.cover;
            var cleanTitle = book.name.replace(/\.(txt|epub)$/i, '');
            if (book.cover) {
                coverEl.style.backgroundImage = 'url(' + book.cover + ')';
            } else {
                coverEl.textContent = cleanTitle.substring(0, 30);
            }
            bookEl.appendChild(coverEl);
            var detailsEl = document.createElement('div');
            detailsEl.className = 'book-details';
            var titleEl = document.createElement('h3');
            titleEl.textContent = cleanTitle;
            var authorEl = document.createElement('p');
            authorEl.textContent = '作者: ' + (book.author || '未知');
            var progressEl = document.createElement('p');
            var lastPage = NR.loadProgress(book.name);
            progressEl.textContent = lastPage ? '上次读至: 第 ' + lastPage + ' 页' : '尚未开始阅读';
            var totalEl = document.createElement('p');
            if (book.onlineSource && book.downloadState && book.downloadState !== 'complete') {
                totalEl.textContent = '已缓存: ' + (book.cachedChapterCount || book.onlineSource.cachedChapters || 0) + ' / ' + (book.chapterCount > 0 ? book.chapterCount : '?') + ' 章';
            } else {
                totalEl.textContent = '总章节: ' + (book.chapterCount > 0 ? book.chapterCount + ' 章' : '未知');
            }
            detailsEl.appendChild(titleEl);
            detailsEl.appendChild(authorEl);
            detailsEl.appendChild(progressEl);
            detailsEl.appendChild(totalEl);
            bookEl.appendChild(detailsEl);
            var actionsEl = document.createElement('div');
            actionsEl.className = 'book-actions';
            var tagBtn = document.createElement('button');
            tagBtn.className = 'control-button tag-book-btn';
            tagBtn.innerHTML = '🏷️';
            tagBtn.dataset.bookName = book.name;
            tagBtn.title = '编辑标签';
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'control-button delete-book-btn-on-shelf';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.dataset.bookName = book.name;
            deleteBtn.title = '从书架删除';
            actionsEl.appendChild(tagBtn);
            actionsEl.appendChild(deleteBtn);
            bookEl.appendChild(actionsEl);
            NR.els['bookshelf-grid'].appendChild(bookEl);
        });
    };

    NR.updateAddToShelfButton = function() {
        if (!NR.state.currentFileName) {
            NR.els['btn-add-to-shelf'].style.display = 'none';
            return;
        }
        NR.els['btn-add-to-shelf'].style.display = 'inline-block';
        var exists = NR.state.bookshelf.some(function(b) { return b.name === NR.state.currentFileName; });
        NR.els['btn-add-to-shelf'].textContent = exists ? '已在书架' : '添加到书架';
        NR.els['btn-add-to-shelf'].disabled = exists;
    };

    NR.populateCatalog = function() {
        NR.els['catalog-list'].innerHTML = '';
        if (NR.state.chapters.length > 0) {
            NR.els['btn-catalog'].style.display = 'inline-block';
            NR.state.chapters.forEach(function(chap) {
                var li = document.createElement('li');
                li.textContent = chap.title;
                li.dataset.pId = chap.p_id;
                NR.els['catalog-list'].appendChild(li);
            });
        } else {
            NR.els['btn-catalog'].style.display = 'none';
        }
    };

    NR.openTagEditModal = function(bookName) {
        NR.state.bookNameToEditTags = bookName;
        var book = NR.state.bookshelf.find(function(b) { return b.name === bookName; });
        if (!book) return;
        NR.els['tag-edit-modal-title'].textContent = book.name.replace(/\.(txt|epub)$/i, '');
        NR.renderTagPills();
        NR.els['new-tag-input'].value = '';
        NR.els['tag-edit-modal'].style.display = 'flex';
        NR.els['new-tag-input'].focus();
    };

    NR.renderTagPills = function() {
        NR.els['current-tags-list'].innerHTML = '';
        var book = NR.state.bookshelf.find(function(b) { return b.name === NR.state.bookNameToEditTags; });
        if (!book || !book.tags || book.tags.length === 0) {
            NR.els['current-tags-list'].textContent = '暂无标签';
            return;
        }
        book.tags.forEach(function(tag) {
            var pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.textContent = tag;
            var removeBtn = document.createElement('button');
            removeBtn.className = 'remove-tag-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.dataset.tag = tag;
            removeBtn.title = '移除标签"' + tag + '"';
            pill.appendChild(removeBtn);
            NR.els['current-tags-list'].appendChild(pill);
        });
    };

    NR.updateHeaderForState = function() {
        var isOriginal = NR.state.activeSubView === 'original';
        var hasBook = !!NR.state.currentFileName;
        NR.els['btn-ai-menu'].style.display = isOriginal && hasBook ? 'inline-block' : 'none';
        NR.els['btn-add-to-shelf'].style.display = isOriginal && hasBook ? 'inline-block' : 'none';
        NR.els['btn-catalog'].style.display = isOriginal && hasBook && NR.state.chapters.length > 0 ? 'inline-block' : 'none';
        NR.els['btn-back-to-original'].style.display = !isOriginal ? 'inline-block' : 'none';
        NR.els['btn-search'].style.display = hasBook ? 'inline-block' : 'none';
        if (isOriginal && hasBook) NR.updateAddToShelfButton();
    };

    NR.renderHistoryList = function(listElement, historyData, type) {
        listElement.innerHTML = '';
        var noHistoryMsg = { summary: '没有已保存的总结。', sequel: '没有已保存的续写。', translation: '没有已保存的翻译。' };
        if (historyData.length === 0) {
            var li = document.createElement('li');
            li.textContent = noHistoryMsg[type];
            li.style.cursor = 'default';
            listElement.appendChild(li);
            return;
        }
        historyData.sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(item) {
            var li = document.createElement('li');
            var titleText = type === 'summary' ? item.range : '于 <strong>' + NR.escapeHtml(item.sourceRange || '') + '</strong>';
            var contentPreview = NR.escapeHtml((item.text || item.content || '')).substring(0, 100);
            var titleSpan = document.createElement('span');
            titleSpan.innerHTML = titleText;
            var actionsDiv = document.createElement('div');
            actionsDiv.className = 'modal-list-actions';
            var viewBtn = document.createElement('button');
            viewBtn.className = 'action-btn view-btn';
            viewBtn.textContent = '查看';
            viewBtn.dataset.timestamp = item.timestamp;
            actionsDiv.appendChild(viewBtn);
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.textContent = '删除';
            deleteBtn.dataset.timestamp = item.timestamp;
            actionsDiv.appendChild(deleteBtn);
            var previewDiv = document.createElement('div');
            previewDiv.className = 'history-item-text';
            previewDiv.textContent = contentPreview + '...';
            li.appendChild(titleSpan);
            li.appendChild(actionsDiv);
            li.appendChild(previewDiv);
            listElement.appendChild(li);
        });
    };

    NR.displayCharacterProfiles = function(newProfiles, rangeDesc) {
        NR.els['character-profiles-container'].innerHTML = '';
        NR.state.tempCharacterProfiles = [];
        if (newProfiles.length === 0) {
            NR.els['character-profiles-container'].innerHTML = '<p>在选定范围内未识别到明确的人物信息。</p>';
            return;
        }
        var profileFields = ["姓名", "身份", "性别", "种族", "年龄", "外貌", "衣着", "地点", "物品", "能力", "目的", "组织", "健康", "爱好", "与主角关系"];
        newProfiles.forEach(function(newProfileData) {
            if (!newProfileData || !newProfileData.姓名 || newProfileData.姓名 === '-') return;
            
            // 查找已存在的人物（支持别名匹配）
            var existingProfile = NR.state.currentBookData.characterProfiles.find(function(p) { 
                // 主名称匹配
                if (p.name === newProfileData.姓名) return true;
                // 别名匹配
                if (p.aliases && p.aliases.indexOf(newProfileData.姓名) !== -1) return true;
                return false;
            });
            
            var mergedData = {};
            profileFields.forEach(function(field) {
                var newValue = newProfileData[field];
                var existingValue = existingProfile ? existingProfile.data[field] : undefined;
                if (newValue !== undefined && newValue !== '-') {
                    mergedData[field] = newValue;
                } else {
                    mergedData[field] = (existingValue !== undefined) ? existingValue : '-';
                }
            });
            
            // 如果通过别名匹配到了已有人物，使用已有人物的主名称
            var displayName = mergedData.姓名;
            var matchedByAlias = false;
            if (existingProfile && existingProfile.name !== newProfileData.姓名) {
                displayName = existingProfile.name;
                matchedByAlias = true;
                mergedData.姓名 = existingProfile.name; // 更新为主名称
            }
            
            var profileCard = document.createElement('div');
            profileCard.className = 'character-profile-card';
            var gridHtml = '';
            profileFields.slice(1).forEach(function(field) {
                var value = mergedData[field] || '-';
                var isEmpty = !value || value === '-';
                var emptyClass = isEmpty ? ' is-empty' : '';
                var valueClass = isEmpty ? ' class="empty-value"' : '';
                gridHtml += '<div class="profile-field' + emptyClass + '"><strong>' + NR.escapeHtml(field) + '</strong><span' + valueClass + '>' + NR.escapeHtml(value) + '</span></div>';
            });
            
            // 显示别名匹配提示
            var aliasHint = matchedByAlias ? '<span class="alias-match-hint">(识别为 ' + NR.escapeHtml(newProfileData.姓名) + ')</span>' : '';
            
            profileCard.innerHTML = '<div class="character-profile-header"><h3>' + NR.escapeHtml(displayName) + aliasHint + '</h3><button class="action-btn save-single-profile-btn" data-character-name="' + NR.escapeHtml(displayName) + '">保存此人物</button></div><div class="character-profile-grid">' + gridHtml + '</div>';
            NR.els['character-profiles-container'].appendChild(profileCard);
            NR.state.tempCharacterProfiles.push({ name: displayName, data: mergedData, lastUpdated: rangeDesc });
        });
    };

    // 人物卡片颜色 - 使用characterForm.js中定义的NR.CHARACTER_COLORS
    // 获取人物卡片背景色（返回字符串颜色值）
    NR.getCardBackgroundColor = function(name, isProtagonist) {
        // 如果characterForm.js已加载，使用其颜色系统
        if (NR.CHARACTER_COLORS && NR.CHARACTER_COLORS.length > 0) {
            var colorObj = NR.getCharacterColor(name, isProtagonist);
            return colorObj.bg;
        }
        // 后备颜色列表
        var fallbackColors = [
            '#5B8FB9', '#7C9D96', '#9B7EBD', '#E57373', '#64B5F6',
            '#81C784', '#FFB74D', '#BA68C8', '#4DB6AC', '#F06292',
            '#7986CB', '#A1887F', '#90A4AE', '#DCE775', '#4DD0E1'
        ];
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colorIndex = Math.abs(hash) % fallbackColors.length;
        return fallbackColors[colorIndex];
    };

    NR.renderCharacterHistory = function() {
        NR.els['character-history-list'].innerHTML = '';
        
        // 渲染合并模式工具栏
        var toolbarHtml = '<div class="character-merge-toolbar">' +
            '<button id="btn-toggle-merge-mode" class="control-button' + (NR.state.characterMergeMode ? ' active' : '') + '">' + 
                (NR.state.characterMergeMode ? '退出合并' : '🔗 合并人物') + 
            '</button>' +
            (NR.state.characterMergeMode ? 
                '<span class="merge-hint">选择2个或更多人物卡片进行合并</span>' +
                '<button id="btn-confirm-merge" class="control-button merge-confirm-btn" disabled>合并选中 (0)</button>' 
                : '') +
        '</div>';
        NR.els['character-history-list'].insertAdjacentHTML('beforeend', toolbarHtml);
        
        if (!NR.state.currentBookData.characterProfiles || NR.state.currentBookData.characterProfiles.length === 0) {
            NR.els['character-history-list'].insertAdjacentHTML('beforeend', '<div class="character-cards-empty"><p>📭 没有已保存的人物信息</p><p style="font-size: 0.9em;">使用"人物填表"功能来生成人物卡片</p></div>');
            return;
        }
        
        // 排序：主角排第一，重要人物其次，其他按名字排序
        NR.state.currentBookData.characterProfiles.sort(function(a, b) {
            if (a.isProtagonist && !b.isProtagonist) return -1;
            if (!a.isProtagonist && b.isProtagonist) return 1;
            if (a.isImportant && !b.isImportant) return -1;
            if (!a.isImportant && b.isImportant) return 1;
            return a.name.localeCompare(b.name, 'zh-CN');
        });
        
        NR.state.currentBookData.characterProfiles.forEach(function(profile, index) {
            var card = document.createElement('div');
            card.className = 'character-card';
            card.dataset.characterName = profile.name;
            
            // 合并模式下检查是否被选中
            var isSelected = NR.state.characterMergeMode && NR.state.selectedCharactersForMerge.indexOf(profile.name) !== -1;
            if (isSelected) {
                card.classList.add('merge-selected');
            }
            
            // 获取姓名首字作为头像
            var firstChar = profile.name.charAt(0);
            
            // 获取该人物的颜色（使用新的函数获取背景色字符串）
            var cardColor = NR.getCardBackgroundColor(profile.name, profile.isProtagonist);
            card.style.backgroundColor = cardColor;
            
            // 获取简要信息
            var identity = (profile.data.身份 && profile.data.身份 !== '-') ? profile.data.身份 : '';
            var gender = (profile.data.性别 && profile.data.性别 !== '-') ? profile.data.性别 : '';
            var race = (profile.data.种族 && profile.data.种族 !== '-') ? profile.data.种族 : '';
            var age = (profile.data.年龄 && profile.data.年龄 !== '-') ? profile.data.年龄 : '';
            
            var infoText = [identity, gender, race, age].filter(function(s) { return s; }).join(' · ');
            
            // 显示别名信息
            var aliasText = '';
            if (profile.aliases && profile.aliases.length > 0) {
                aliasText = '<div class="character-card-aliases">别名: ' + NR.escapeHtml(profile.aliases.join(', ')) + '</div>';
            }
            
            // 星星状态：主角=金色实心，重要人物=绿色实心，普通=空心
            var starClass = profile.isProtagonist ? 'protagonist' : (profile.isImportant ? 'important' : 'normal');
            var starTitle = profile.isProtagonist ? '主角 (点击切换)' : (profile.isImportant ? '重要人物 (点击切换)' : '普通人物 (点击切换)');
            
            // 检查是否有封面图片
            var hasCover = !!profile.cover;
            var avatarStyle = hasCover 
                ? 'background-image: url(' + profile.cover + '); background-size: cover; background-position: center;'
                : '';
            var avatarContent = hasCover ? '' : NR.escapeHtml(firstChar);
            
            // 合并模式下显示选择指示器
            var selectIndicator = NR.state.characterMergeMode ? 
                '<div class="character-card-select-indicator">' + (isSelected ? '✓' : '') + '</div>' : '';
            
            card.innerHTML = 
                selectIndicator +
                '<div class="character-card-star ' + starClass + '" data-character-name="' + NR.escapeHtml(profile.name) + '" title="' + starTitle + '">★</div>' +
                '<div class="character-card-actions">' +
                    '<button class="character-card-delete" data-character-name="' + NR.escapeHtml(profile.name) + '" title="删除">&times;</button>' +
                '</div>' +
                '<div class="character-card-avatar" style="' + avatarStyle + '">' + avatarContent + '</div>' +
                '<div class="character-card-name">' + NR.escapeHtml(profile.name) + '</div>' +
                aliasText +
                '<div class="character-card-info"><span>' + NR.escapeHtml(infoText) + '</span></div>';
            
            NR.els['character-history-list'].appendChild(card);
        });
        
        // 绑定工具栏事件
        var toggleBtn = document.getElementById('btn-toggle-merge-mode');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                NR.toggleCharacterMergeMode();
            });
        }
        
        var confirmBtn = document.getElementById('btn-confirm-merge');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                NR.confirmCharacterMerge();
            });
        }
    };
    
    // 切换合并模式
    NR.toggleCharacterMergeMode = function() {
        NR.state.characterMergeMode = !NR.state.characterMergeMode;
        NR.state.selectedCharactersForMerge = [];
        NR.renderCharacterHistory();
    };
    
    // 切换人物选中状态（合并模式）
    NR.toggleCharacterSelection = function(characterName) {
        var idx = NR.state.selectedCharactersForMerge.indexOf(characterName);
        if (idx === -1) {
            NR.state.selectedCharactersForMerge.push(characterName);
        } else {
            NR.state.selectedCharactersForMerge.splice(idx, 1);
        }
        NR.renderCharacterHistory();
        NR.updateMergeButton();
    };
    
    // 更新合并按钮状态
    NR.updateMergeButton = function() {
        var btn = document.getElementById('btn-confirm-merge');
        if (btn) {
            var count = NR.state.selectedCharactersForMerge.length;
            btn.textContent = '合并选中 (' + count + ')';
            btn.disabled = count < 2;
        }
    };
    
    // 确认合并
    NR.confirmCharacterMerge = function() {
        var names = NR.state.selectedCharactersForMerge;
        if (names.length < 2) {
            alert('请至少选择2个人物进行合并');
            return;
        }
        
        if (!confirm('确定要将以下人物合并为一个吗？\n\n' + names.join('\n') + '\n\n合并后将由AI智能整合信息，原人物卡片将被删除。')) {
            return;
        }
        
        NR.mergeCharacterProfiles(names).then(function(newProfile) {
            alert('合并成功！\n\n主要名称: ' + newProfile.name + '\n别名: ' + (newProfile.aliases.length > 0 ? newProfile.aliases.join(', ') : '无'));
            NR.state.characterMergeMode = false;
            NR.state.selectedCharactersForMerge = [];
            NR.renderCharacterHistory();
        }).catch(function(err) {
            console.error('合并失败:', err);
            alert('合并失败: ' + (err.message || err));
        });
    };
    
    // 切换人物重要性状态：普通 → 重要 → 主角(如果没有) → 普通
    NR.toggleCharacterImportance = function(characterName) {
        var profile = NR.state.currentBookData.characterProfiles.find(function(p) { return p.name === characterName; });
        if (!profile) return;
        
        // 检查是否已有主角
        var hasProtagonist = NR.state.currentBookData.characterProfiles.some(function(p) { return p.isProtagonist; });
        
        if (profile.isProtagonist) {
            // 主角 → 普通
            profile.isProtagonist = false;
            profile.isImportant = false;
        } else if (profile.isImportant) {
            // 重要 → 主角（仅当没有主角时）或 → 普通（已有主角时）
            if (hasProtagonist) {
                // 已有主角，跳过主角状态，直接变普通
                profile.isImportant = false;
            } else {
                // 没有主角，可以设为主角
                profile.isProtagonist = true;
                profile.isImportant = false;
            }
        } else {
            // 普通 → 重要
            profile.isImportant = true;
        }
        
        NR.saveBookData();
        NR.renderCharacterHistory();
    };

    NR.showCharacterDetail = function(characterName) {
        var profile = NR.state.currentBookData.characterProfiles.find(function(p) { return p.name === characterName; });
        if (!profile) return;
        
        // 字段显示顺序和标签（使用中文key，与convertFormToProfile保持一致）
        var fieldOrder = [
            { key: '性别', label: '性别' },
            { key: '年龄', label: '年龄' },
            { key: '种族', label: '种族' },
            { key: '身份', label: '职业/身份' },
            { key: '地点', label: '所在地点' },
            { key: '在场状态', label: '在场状态' },
            { key: '外貌', label: '外貌特征' },
            { key: '衣着', label: '衣着' },
            { key: '物品', label: '持有的重要物品' },
            { key: '能力', label: '能力' },
            { key: '目的', label: '目的' },
            { key: '组织', label: '所属组织' },
            { key: '健康', label: '健康状态' },
            { key: '爱好', label: '爱好' },
            { key: '与主角关系', label: '与主角关系' },
            { key: '过往经历', label: '过往经历' },
            { key: '性格特点', label: '性格特点' },
            { key: '基础属性', label: '基础属性' },
            { key: '特有属性', label: '特有属性' },
            { key: '人际关系', label: '人际关系' }
        ];
        var longFields = ['外貌', '衣着', '能力', '目的', '性格特点', '过往经历'];
        var keyValueFields = ['基础属性', '特有属性', '人际关系'];
        
        var firstChar = profile.name.charAt(0);
        var lastUpdated = profile.lastUpdated || '未知';
        var avatarColor = NR.getCardBackgroundColor(profile.name, profile.isProtagonist);
        
        // 检查是否有封面图片
        var hasCover = !!profile.cover;
        var avatarStyle = hasCover 
            ? 'background-image: url(' + profile.cover + '); background-size: cover; background-position: center; cursor: pointer;'
            : 'background-color: ' + avatarColor + ';';
        var avatarContent = hasCover ? '' : NR.escapeHtml(firstChar);
        var avatarTitle = hasCover ? ' title="点击裁剪头像"' : '';
        
        // 别名信息
        var aliasesHtml = '';
        if (profile.aliases && profile.aliases.length > 0) {
            aliasesHtml = '<p class="character-aliases-info">别名: ' + NR.escapeHtml(profile.aliases.join(', ')) + '</p>';
        }
        
        var gridHtml = '';
        fieldOrder.forEach(function(field) {
            var key = field.key;
            var label = field.label;
            var value = profile.data[key] || '-';
            // 空值也显示，方便用户了解哪些字段尚未填写
            
            var isLong = longFields.indexOf(key) !== -1 && value.length > 20;
            var isKeyValue = keyValueFields.indexOf(key) !== -1;
            var displayValue = '';
            var isEmpty = !value || value === '-';
            
            if (isKeyValue && !isEmpty) {
                // 解析键值对并显示
                displayValue = NR.renderKeyValueDisplay(value);
            } else {
                var emptyClass = isEmpty ? ' empty-value' : '';
                displayValue = '<span class="field-value' + emptyClass + '">' + NR.escapeHtml(value) + '</span>';
            }
            
            gridHtml += '<div class="character-detail-field' + ((isLong || isKeyValue) ? ' full-width' : '') + (isEmpty ? ' is-empty' : '') + '">' +
                '<strong>' + NR.escapeHtml(label) + '</strong>' +
                displayValue +
            '</div>';
        });
        
        var modalHtml = 
            '<div id="character-detail-modal" class="modal character-detail-modal" style="display: flex;">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h2>人物详情</h2>' +
                        '<button class="close-button" onclick="this.closest(\'.modal\').remove()">&times;</button>' +
                    '</div>' +
                    '<div class="character-detail-header">' +
                        '<div class="character-detail-avatar' + (hasCover ? ' has-cover' : '') + '" style="' + avatarStyle + '"' + avatarTitle + '>' + avatarContent + '</div>' +
                        '<div class="character-detail-title">' +
                            '<h3>' + NR.escapeHtml(profile.name) + '</h3>' +
                            aliasesHtml +
                            '<p>最后更新: ' + NR.escapeHtml(lastUpdated) + '</p>' +
                            '<button class="control-button generate-cover-btn" data-character-name="' + NR.escapeHtml(profile.name) + '">🎨 生成封面</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="character-detail-grid">' + gridHtml + '</div>' +
                '</div>' +
            '</div>';
        
        // 移除已存在的详情弹窗
        var existingModal = document.getElementById('character-detail-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 点击背景关闭
        var modal = document.getElementById('character-detail-modal');
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
        
        // 绑定头像点击裁剪事件
        var avatar = modal.querySelector('.character-detail-avatar.has-cover');
        if (avatar && profile.cover) {
            avatar.addEventListener('click', function() {
                // 优先使用原图进行裁剪
                var imageToUse = profile.originalCover || profile.cover;
                NR.showAvatarCropper(imageToUse, profile.name);
            });
        }
        
        // 绑定生成封面按钮事件
        var generateBtn = modal.querySelector('.generate-cover-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', function() {
                var name = this.dataset.characterName;
                NR.generateCharacterImage(name);
            });
        }
    };
    
    // 渲染键值对显示（属性条/关系标签）
    NR.renderKeyValueDisplay = function(value) {
        if (!value || value === '-') return '<span>-</span>';
        
        var pairs = [];
        var pairStrs = value.split(';');
        for (var i = 0; i < pairStrs.length; i++) {
            var parts = pairStrs[i].split(':');
            if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                pairs.push({ name: parts[0].trim(), value: parts[1].trim() });
            }
        }
        
        if (pairs.length === 0) return '<span>' + NR.escapeHtml(value) + '</span>';
        
        var html = '<div class="keyvalue-display">';
        pairs.forEach(function(pair) {
            var isNumeric = !isNaN(pair.value) && pair.value !== '';
            if (isNumeric) {
                var numVal = parseInt(pair.value);
                var barWidth = Math.min(100, Math.max(0, numVal));
                var barColor = numVal >= 70 ? '#4CAF50' : (numVal >= 40 ? '#FF9800' : '#f44336');
                html += '<div class="kv-item">' +
                    '<span class="kv-label">' + NR.escapeHtml(pair.name) + '</span>' +
                    '<div class="kv-bar-container">' +
                        '<div class="kv-bar" style="width: ' + barWidth + '%; background: ' + barColor + ';"></div>' +
                    '</div>' +
                    '<span class="kv-num">' + NR.escapeHtml(pair.value) + '</span>' +
                '</div>';
            } else {
                html += '<span class="kv-tag">' + NR.escapeHtml(pair.name) + ': ' + NR.escapeHtml(pair.value) + '</span>';
            }
        });
        html += '</div>';
        return html;
    };
    
    // 图片查看器
    NR.showImageViewer = function(imageSrc, title) {
        // 移除已存在的查看器
        var existingViewer = document.getElementById('image-viewer-modal');
        if (existingViewer) existingViewer.remove();
        
        var viewerHtml = 
            '<div id="image-viewer-modal" class="modal image-viewer-modal" style="display: flex;">' +
                '<div class="image-viewer-content">' +
                    '<button class="image-viewer-close">&times;</button>' +
                    '<img src="' + imageSrc + '" alt="' + NR.escapeHtml(title || '图片') + '">' +
                    (title ? '<div class="image-viewer-title">' + NR.escapeHtml(title) + '</div>' : '') +
                '</div>' +
            '</div>';
        
        document.body.insertAdjacentHTML('beforeend', viewerHtml);
        
        var viewer = document.getElementById('image-viewer-modal');
        var closeBtn = viewer.querySelector('.image-viewer-close');
        
        // 点击关闭按钮或背景关闭
        closeBtn.addEventListener('click', function() {
            viewer.remove();
        });
        viewer.addEventListener('click', function(e) {
            if (e.target === viewer) viewer.remove();
        });
    };

    // 圆形头像裁剪工具
    NR.showAvatarCropper = function(imageSrc, characterName) {
        // 移除已存在的裁剪器
        var existingCropper = document.getElementById('avatar-cropper-modal');
        if (existingCropper) existingCropper.remove();
        
        var cropperHtml = 
            '<div id="avatar-cropper-modal" class="modal" style="display: flex; z-index: 10002;">' +
                '<div class="modal-content avatar-cropper-content">' +
                    '<div class="modal-header">' +
                        '<h2>裁剪头像</h2>' +
                        '<button class="close-button" id="cropper-close">&times;</button>' +
                    '</div>' +
                    '<div class="cropper-container">' +
                        '<div class="cropper-area" id="cropper-area">' +
                            '<img id="cropper-image" src="' + imageSrc + '" draggable="false">' +
                            '<div class="cropper-circle" id="cropper-circle"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="cropper-controls">' +
                        '<div class="cropper-zoom">' +
                            '<span style="font-size: 12px;">圆形大小:</span>' +
                            '<button class="cropper-btn" id="cropper-zoom-out">−</button>' +
                            '<input type="range" id="cropper-zoom-slider" min="30" max="100" value="50">' +
                            '<button class="cropper-btn" id="cropper-zoom-in">+</button>' +
                        '</div>' +
                        '<div class="cropper-hint">拖动圆形选择裁剪区域，滑动调整大小</div>' +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button class="control-button" id="cropper-cancel">取消</button>' +
                        '<button class="control-button" id="cropper-confirm" style="background: var(--accent-color);">确认裁剪</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        document.body.insertAdjacentHTML('beforeend', cropperHtml);
        
        var modal = document.getElementById('avatar-cropper-modal');
        var closeBtn = document.getElementById('cropper-close');
        var cancelBtn = document.getElementById('cropper-cancel');
        var confirmBtn = document.getElementById('cropper-confirm');
        var cropperArea = document.getElementById('cropper-area');
        var cropperImage = document.getElementById('cropper-image');
        var cropperCircle = document.getElementById('cropper-circle');
        var zoomSlider = document.getElementById('cropper-zoom-slider');
        var zoomInBtn = document.getElementById('cropper-zoom-in');
        var zoomOutBtn = document.getElementById('cropper-zoom-out');
        
        // 状态变量（全部使用像素）
        var circleSizePercent = 50; // 相对于区域宽度的百分比
        var circlePosX = 0; // 圆心X坐标（像素）
        var circlePosY = 0; // 圆心Y坐标（像素）
        var isDragging = false;
        var startX = 0;
        var startY = 0;
        var startPosX = 0;
        var startPosY = 0;
        var areaWidth = 0;
        var areaHeight = 0;
        
        // 更新圆形位置和大小
        var updateCircle = function() {
            var circlePixelSize = (circleSizePercent / 100) * areaWidth;
            var halfSize = circlePixelSize / 2;
            
            // 限制圆形在区域内
            circlePosX = Math.max(halfSize, Math.min(areaWidth - halfSize, circlePosX));
            circlePosY = Math.max(halfSize, Math.min(areaHeight - halfSize, circlePosY));
            
            cropperCircle.style.width = circlePixelSize + 'px';
            cropperCircle.style.height = circlePixelSize + 'px';
            cropperCircle.style.left = (circlePosX - halfSize) + 'px';
            cropperCircle.style.top = (circlePosY - halfSize) + 'px';
        };
        
        // 初始化
        var initCropper = function() {
            areaWidth = cropperArea.offsetWidth;
            areaHeight = cropperArea.offsetHeight;
            // 初始位置居中
            circlePosX = areaWidth / 2;
            circlePosY = areaHeight / 2;
            updateCircle();
        };
        
        // 图片加载完成后初始化
        cropperImage.onload = function() {
            initCropper();
        };
        
        // 如果图片已缓存，直接初始化
        if (cropperImage.complete) {
            setTimeout(initCropper, 50);
        }
        
        // 缩放控制
        zoomSlider.addEventListener('input', function() {
            circleSizePercent = parseInt(this.value);
            updateCircle();
        });
        
        zoomInBtn.addEventListener('click', function() {
            circleSizePercent = Math.min(100, circleSizePercent + 5);
            zoomSlider.value = circleSizePercent;
            updateCircle();
        });
        
        zoomOutBtn.addEventListener('click', function() {
            circleSizePercent = Math.max(30, circleSizePercent - 5);
            zoomSlider.value = circleSizePercent;
            updateCircle();
        });
        
        // 鼠标拖动圆形
        cropperCircle.addEventListener('mousedown', function(e) {
            isDragging = true;
            areaWidth = cropperArea.offsetWidth;
            areaHeight = cropperArea.offsetHeight;
            startX = e.clientX;
            startY = e.clientY;
            startPosX = circlePosX;
            startPosY = circlePosY;
            cropperCircle.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                var deltaX = e.clientX - startX;
                var deltaY = e.clientY - startY;
                circlePosX = startPosX + deltaX;
                circlePosY = startPosY + deltaY;
                updateCircle();
            }
        });
        
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                cropperCircle.style.cursor = 'grab';
            }
        });
        
        // 触摸拖动支持
        cropperCircle.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                isDragging = true;
                areaWidth = cropperArea.offsetWidth;
                areaHeight = cropperArea.offsetHeight;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startPosX = circlePosX;
                startPosY = circlePosY;
                e.preventDefault();
            }
        });
        
        cropperCircle.addEventListener('touchmove', function(e) {
            if (isDragging && e.touches.length === 1) {
                var deltaX = e.touches[0].clientX - startX;
                var deltaY = e.touches[0].clientY - startY;
                circlePosX = startPosX + deltaX;
                circlePosY = startPosY + deltaY;
                updateCircle();
                e.preventDefault();
            }
        });
        
        cropperCircle.addEventListener('touchend', function() {
            isDragging = false;
        });
        
        // 关闭弹窗
        var closeModal = function() {
            modal.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
        
        // 确认裁剪
        confirmBtn.addEventListener('click', function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var outputSize = 200;
            canvas.width = outputSize;
            canvas.height = outputSize;
            
            // 获取图片实际显示尺寸和位置
            var imgRect = cropperImage.getBoundingClientRect();
            var areaRect = cropperArea.getBoundingClientRect();
            
            // 计算圆形的像素尺寸
            var circlePixelSize = (circleSizePercent / 100) * areaRect.width;
            
            // 图片在区域内的偏移
            var imgOffsetX = imgRect.left - areaRect.left;
            var imgOffsetY = imgRect.top - areaRect.top;
            
            // 计算裁剪区域在原图上的位置
            var scaleX = cropperImage.naturalWidth / imgRect.width;
            var scaleY = cropperImage.naturalHeight / imgRect.height;
            
            var sourceX = (circlePosX - circlePixelSize / 2 - imgOffsetX) * scaleX;
            var sourceY = (circlePosY - circlePixelSize / 2 - imgOffsetY) * scaleY;
            var sourceSizeX = circlePixelSize * scaleX;
            var sourceSizeY = circlePixelSize * scaleY;
            
            // 创建圆形裁剪
            ctx.beginPath();
            ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            // 绘制图片
            ctx.drawImage(
                cropperImage,
                sourceX, sourceY, sourceSizeX, sourceSizeY,
                0, 0, outputSize, outputSize
            );
            
            // 转换为base64
            var croppedImage = canvas.toDataURL('image/png');
            
            // 更新人物封面
            var profile = NR.state.currentBookData.characterProfiles.find(function(p) {
                return p.name === characterName;
            });
            
            if (profile) {
                // 如果没有原图，先保存当前图片作为原图
                if (!profile.originalCover && profile.cover) {
                    profile.originalCover = imageSrc;
                }
                profile.cover = croppedImage;
                NR.saveBookData();
                
                // 更新详情弹窗中的头像
                var detailModal = document.getElementById('character-detail-modal');
                if (detailModal) {
                    var avatarEl = detailModal.querySelector('.character-detail-avatar');
                    if (avatarEl) {
                        avatarEl.style.backgroundImage = 'url(' + croppedImage + ')';
                    }
                }
                
                // 刷新人物列表
                NR.renderCharacterHistory();
            }
            
            closeModal();
        });
    };

    NR.toggleImmersiveMode = function() {
        if (!NR.state.currentFileName) return;
        NR.state.isInImmersiveMode = !NR.state.isInImmersiveMode;
        NR.els.readerView.classList.toggle('immersive-active', NR.state.isInImmersiveMode);
        NR.clearImmersiveHighlight();
        if (NR.state.isInImmersiveMode) {
            NR.initImmersiveHighlight();
        }
    };

    NR.clearImmersiveHighlight = function() {
        var highlighted = document.querySelectorAll('.immersive-highlight');
        highlighted.forEach(function(p) { p.classList.remove('immersive-highlight'); });
        NR.state.immersiveCurrentParagraph = null;
    };

    NR.initImmersiveHighlight = function() {
        var currentPageEl = document.getElementById('current-page-container');
        if (!currentPageEl) return;
        var firstP = currentPageEl.querySelector('p:not(.blank-line)');
        if (firstP) {
            NR.setImmersiveHighlight(firstP);
        }
    };

    NR.setImmersiveHighlight = function(paragraph) {
        NR.clearImmersiveHighlight();
        if (paragraph) {
            paragraph.classList.add('immersive-highlight');
            NR.state.immersiveCurrentParagraph = paragraph;
            paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    NR.immersiveNextParagraph = function() {
        if (!NR.state.isInImmersiveMode) return;
        var currentPageEl = document.getElementById('current-page-container');
        if (!currentPageEl) return;
        var allParagraphs = Array.from(currentPageEl.querySelectorAll('p:not(.blank-line)'));
        if (allParagraphs.length === 0) return;
        if (!NR.state.immersiveCurrentParagraph) {
            NR.setImmersiveHighlight(allParagraphs[0]);
            return;
        }
        var currentIndex = allParagraphs.indexOf(NR.state.immersiveCurrentParagraph);
        if (currentIndex === -1) {
            NR.setImmersiveHighlight(allParagraphs[0]);
            return;
        }
        if (currentIndex < allParagraphs.length - 1) {
            NR.setImmersiveHighlight(allParagraphs[currentIndex + 1]);
        } else {
            document.dispatchEvent(new CustomEvent('immersive-next-page'));
        }
    };

    NR.immersivePrevParagraph = function() {
        if (!NR.state.isInImmersiveMode) return;
        var currentPageEl = document.getElementById('current-page-container');
        if (!currentPageEl) return;
        var allParagraphs = Array.from(currentPageEl.querySelectorAll('p:not(.blank-line)'));
        if (allParagraphs.length === 0) return;
        if (!NR.state.immersiveCurrentParagraph) {
            NR.setImmersiveHighlight(allParagraphs[allParagraphs.length - 1]);
            return;
        }
        var currentIndex = allParagraphs.indexOf(NR.state.immersiveCurrentParagraph);
        if (currentIndex === -1) {
            NR.setImmersiveHighlight(allParagraphs[allParagraphs.length - 1]);
            return;
        }
        if (currentIndex > 0) {
            NR.setImmersiveHighlight(allParagraphs[currentIndex - 1]);
        } else {
            document.dispatchEvent(new CustomEvent('immersive-prev-page'));
        }
    };

    // 专注模式函数 - 类似沉浸模式
    NR.clearFocusHighlight = function() {
        var highlighted = document.querySelectorAll('.focus-active');
        highlighted.forEach(function(p) { p.classList.remove('focus-active'); });
        NR.state.focusCurrentParagraph = null;
    };

    NR.initFocusHighlight = function() {
        var currentPageEl = document.getElementById('current-page-container');
        if (!currentPageEl) return;
        var firstP = currentPageEl.querySelector('p:not(.blank-line)');
        if (firstP) {
            NR.setFocusHighlight(firstP);
        }
    };

    NR.setFocusHighlight = function(paragraph) {
        NR.clearFocusHighlight();
        if (paragraph) {
            paragraph.classList.add('focus-active');
            NR.state.focusCurrentParagraph = paragraph;
            paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    NR.focusNextParagraph = function() {
        if (!NR.state.settings.enableFocusMode) return;
        var currentPageEl = document.getElementById('current-page-container');
        if (!currentPageEl) return;
        var allParagraphs = Array.from(currentPageEl.querySelectorAll('p:not(.blank-line)'));
        if (allParagraphs.length === 0) return;
        if (!NR.state.focusCurrentParagraph) {
            NR.setFocusHighlight(allParagraphs[0]);
            return;
        }
        var currentIndex = allParagraphs.indexOf(NR.state.focusCurrentParagraph);
        if (currentIndex === -1) {
            NR.setFocusHighlight(allParagraphs[0]);
            return;
        }
        if (currentIndex < allParagraphs.length - 1) {
            NR.setFocusHighlight(allParagraphs[currentIndex + 1]);
        } else {
            document.dispatchEvent(new CustomEvent('focus-next-page'));
        }
    };

    NR.focusPrevParagraph = function() {
        if (!NR.state.settings.enableFocusMode) return;
        var currentPageEl = document.getElementById('current-page-container');
        if (!currentPageEl) return;
        var allParagraphs = Array.from(currentPageEl.querySelectorAll('p:not(.blank-line)'));
        if (allParagraphs.length === 0) return;
        if (!NR.state.focusCurrentParagraph) {
            NR.setFocusHighlight(allParagraphs[allParagraphs.length - 1]);
            return;
        }
        var currentIndex = allParagraphs.indexOf(NR.state.focusCurrentParagraph);
        if (currentIndex === -1) {
            NR.setFocusHighlight(allParagraphs[allParagraphs.length - 1]);
            return;
        }
        if (currentIndex > 0) {
            NR.setFocusHighlight(allParagraphs[currentIndex - 1]);
        } else {
            document.dispatchEvent(new CustomEvent('focus-prev-page'));
        }
    };

    NR.setupModal = function(modal, openBtn, onOpen, onClose) {
        if (!modal) return;
        var closeBtn = modal.querySelector('.close-button');
        var closeHandler = function() {
            modal.style.display = 'none';
            if (onClose) onClose();
        };
        if (openBtn) {
            openBtn.addEventListener('click', function() {
                if (onOpen) onOpen();
                modal.style.display = 'flex';
            });
        }
        if (closeBtn) closeBtn.addEventListener('click', closeHandler);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeHandler();
        });
    };
})();
