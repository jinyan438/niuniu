// 搜索功能
(function() {
    var NR = window.NovelReader;

    function highlightTextNodeSafely(textNode, keywordRegex) {
        var text = textNode.nodeValue;
        keywordRegex.lastIndex = 0;
        var matches = [];
        var match;
        while ((match = keywordRegex.exec(text)) !== null) {
            matches.push({ index: match.index, length: match[0].length });
            if (match.index === keywordRegex.lastIndex) {
                keywordRegex.lastIndex++;
            }
        }

        if (matches.length === 0) return null;

        var frag = document.createDocumentFragment();
        var lastIndex = 0;
        var createdSpans = [];
        
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            if (m.index > lastIndex) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
            }
            var span = document.createElement('span');
            span.className = 'search-highlight';
            span.textContent = text.substr(m.index, m.length);
            frag.appendChild(span);
            createdSpans.push(span);
            lastIndex = m.index + m.length;
        }

        if (lastIndex < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        if (textNode.parentNode) {
            textNode.parentNode.replaceChild(frag, textNode);
        }
        
        return createdSpans;
    }

    function clearHighlights() {
        NR.state.allRenderedPages.forEach(function(page) {
            var highlights = page.querySelectorAll('span.search-highlight');
            if (highlights.length === 0) return;
            
            highlights.forEach(function(span) {
                var parent = span.parentNode;
                if (parent) {
                    parent.replaceChild(document.createTextNode(span.textContent), span);
                    parent.normalize();
                }
            });
        });
    }

    NR.updateSearchUI = function() {
        if (NR.state.searchResults.length > 0) {
            NR.els['search-results-info'].textContent = (NR.state.currentSearchIndex + 1) + ' / ' + NR.state.searchResults.length;
        } else {
            NR.els['search-results-info'].textContent = NR.els['search-input'].value ? '0 / 0' : '';
        }
        NR.els['btn-search-prev'].disabled = NR.state.searchResults.length <= 1;
        NR.els['btn-search-next'].disabled = NR.state.searchResults.length <= 1;
    };

    NR.clearSearch = function() {
        if (NR.state.searchResults.length > 0) {
            clearHighlights();
            NR.updateDOMPages();
        }
        NR.state.searchResults = [];
        NR.state.currentSearchIndex = -1;
        NR.els['search-bar'].style.display = 'none';
        NR.els['search-input'].value = '';
        NR.updateSearchUI();
    };

    function getCurrentChapterBoundaries() {
        if (NR.state.chapters.length === 0 || !NR.state.allRenderedPages[NR.state.currentPage - 1]) return null;
        var firstPOnPage = NR.state.allRenderedPages[NR.state.currentPage - 1].querySelector("p[data-original-index]");
        if (!firstPOnPage) return null;
        var pIndex = parseInt(firstPOnPage.dataset.originalIndex, 10);
        var currentChap = null;
        for (var i = NR.state.chapters.length - 1; i >= 0; i--) {
            if (NR.state.chapters[i].p_index <= pIndex) {
                currentChap = NR.state.chapters[i];
                break;
            }
        }
        if (!currentChap) {
            var firstChapter = NR.state.chapters[0];
            return pIndex < firstChapter.p_index ? {
                startPIndex: 0,
                endPIndex: firstChapter.p_index
            } : null;
        }
        var nextChap = NR.state.chapters.find(function(c) { return c.chap_num === currentChap.chap_num + 1; });
        var startPIndex = currentChap.p_index;
        var endPIndex = nextChap ? nextChap.p_index : NR.state.originalParagraphs.length;
        return {
            startPIndex: startPIndex,
            endPIndex: endPIndex
        };
    }

    NR.executeSearch = function(scope) {
        scope = scope || 'all';
        var keyword = NR.els['search-input'].value.trim();
        clearHighlights();
        NR.state.searchResults = [];
        NR.state.currentSearchIndex = -1;
        if (!keyword) {
            NR.updateSearchUI();
            return;
        }
        var pagesToSearch = [];
        if (scope === 'chapter') {
            var boundaries = getCurrentChapterBoundaries();
            if (!boundaries) {
                alert("无法确定当前章节范围，请在章节正文内搜索。");
                NR.updateSearchUI();
                return;
            }
            pagesToSearch = NR.state.allRenderedPages.filter(function(page) {
                var pageParas = page.querySelectorAll('p[data-original-index]');
                if (pageParas.length === 0) return false;
                var firstPIndex = parseInt(pageParas[0].dataset.originalIndex, 10);
                var lastPIndex = parseInt(pageParas[pageParas.length - 1].dataset.originalIndex, 10);
                return firstPIndex < boundaries.endPIndex && lastPIndex >= boundaries.startPIndex;
            });
        } else {
            pagesToSearch = NR.state.allRenderedPages;
        }

        var keywordRegex = new RegExp(NR.escapeRegExp(keyword), 'gi');

        pagesToSearch.forEach(function(page) {
            var walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, {
                acceptNode: function(node) {
                    if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    if (node.parentNode.closest('script, style, .search-highlight')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });

            var currentNode;
            var textNodesToProcess = [];
            while (currentNode = walker.nextNode()) {
                textNodesToProcess.push(currentNode);
            }

            textNodesToProcess.forEach(function(textNode) {
                var createdSpans = highlightTextNodeSafely(textNode, keywordRegex);
                if (createdSpans) {
                    NR.state.searchResults.push.apply(NR.state.searchResults, createdSpans);
                }
            });
        });

        NR.updateDOMPages();
        if (NR.state.searchResults.length > 0) {
            NR.state.currentSearchIndex = 0;
            NR.navigateToSearchResult('current');
        }
        NR.updateSearchUI();
    };

    NR.navigateToSearchResult = function(direction) {
        if (NR.state.searchResults.length === 0) return;
        if (NR.state.currentSearchIndex > -1 && NR.state.searchResults[NR.state.currentSearchIndex]) {
            NR.state.searchResults[NR.state.currentSearchIndex].classList.remove('active');
        }
        if (direction === 'next') {
            NR.state.currentSearchIndex = (NR.state.currentSearchIndex + 1) % NR.state.searchResults.length;
        } else if (direction === 'prev') {
            NR.state.currentSearchIndex = (NR.state.currentSearchIndex - 1 + NR.state.searchResults.length) % NR.state.searchResults.length;
        }
        var currentMatch = NR.state.searchResults[NR.state.currentSearchIndex];
        if (!currentMatch) return;
        currentMatch.classList.add('active');
        var pageElement = currentMatch.closest('.page');
        if (!pageElement) return;

        var targetPage = NR.state.allRenderedPages.findIndex(function(p) { return p.isSameNode(pageElement); }) + 1;
       
        if (targetPage > 0 && targetPage !== NR.state.currentPage) {
            NR.jumpToPage(targetPage);
            setTimeout(function() {
                var newMatch = NR.state.searchResults[NR.state.currentSearchIndex];
                if (newMatch) {
                    newMatch.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }, 350);
        } else {
            currentMatch.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
        NR.updateSearchUI();
    };
})();
