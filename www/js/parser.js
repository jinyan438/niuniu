// EPUB 解析器
(function() {
    var NR = window.NovelReader;

    NR.isEpubFile = function(file) {
        return /\.epub$/i.test(file.name) || file.type === 'application/epub+zip';
    };

    function parseXml(text) {
        return new DOMParser().parseFromString(text, 'application/xml');
    }

    function parseHtmlLike(text) {
        var doc = new DOMParser().parseFromString(text, 'text/html');
        if (!doc || !doc.body || doc.body.childNodes.length === 0) {
            doc = new DOMParser().parseFromString(text, 'application/xhtml+xml');
        }
        return doc;
    }

    function makeImageDataUrl(zip, fullPath, mime) {
        var entry = zip.file(fullPath);
        if (!entry) return Promise.resolve(null);
        return entry.async('base64').then(function(base64) {
            var mimeType = mime || NR.inferMimeByPath(fullPath);
            return 'data:' + mimeType + ';base64,' + base64;
        });
    }

    NR.parseEpubToPlainText = function(file) {
        return JSZip.loadAsync(file).then(function(zip) {
            var containerPath = 'META-INF/container.xml';
            var containerFile = zip.file(containerPath);
            if (!containerFile) throw new Error('未找到 META-INF/container.xml');
            
            return containerFile.async('string').then(function(containerXml) {
                var containerDoc = parseXml(containerXml);
                var rootfileEl = containerDoc.querySelector('rootfile');
                if (!rootfileEl) throw new Error('EPUB: 未找到 rootfile');
                var opfPath = rootfileEl.getAttribute('full-path');
                if (!opfPath) throw new Error('EPUB: container.xml 中缺少 full-path');
                var opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
                var opfFile = zip.file(opfPath);
                if (!opfFile) throw new Error('EPUB: 未找到 OPF 文件 at ' + opfPath);
                
                return opfFile.async('string').then(function(opfText) {
                    var opfDoc = parseXml(opfText);
                    var manifest = {};
                    opfDoc.querySelectorAll('manifest > item').forEach(function(item) {
                        manifest[item.getAttribute('id')] = {
                            id: item.getAttribute('id'),
                            href: item.getAttribute('href'),
                            mediaType: item.getAttribute('media-type'),
                            properties: item.getAttribute('properties') || ''
                        };
                    });
                    var manifestByFullPath = {};
                    Object.values(manifest).forEach(function(it) {
                        manifestByFullPath[NR.resolvePath(opfDir, it.href)] = it;
                    });
                    
                    var coverUrl = null;
                    var metaCover = opfDoc.querySelector('metadata > meta[name="cover"]');
                    var coverId = metaCover ? metaCover.getAttribute('content') : null;
                    if (!coverId) {
                        var coverItem = opfDoc.querySelector('manifest > item[properties~="cover-image"]');
                        if (coverItem) coverId = coverItem.getAttribute('id');
                    }
                    
                    var coverPromise = Promise.resolve(null);
                    if (coverId) {
                        var coverManifestItem = manifest[coverId];
                        if (coverManifestItem) {
                            var coverPath = NR.resolvePath(opfDir, coverManifestItem.href);
                            coverPromise = makeImageDataUrl(zip, coverPath, coverManifestItem.mediaType);
                        }
                    }
                    
                    return coverPromise.then(function(cover) {
                        coverUrl = cover;
                        var spineIds = Array.from(opfDoc.querySelectorAll('spine > itemref')).map(function(el) {
                            return el.getAttribute('idref');
                        });
                        var titleByHref = {};
                        var navItem = Object.values(manifest).find(function(it) {
                            return (it.properties || '').split(/\s+/).includes('nav');
                        });
                        
                        var navPromise = Promise.resolve();
                        if (navItem) {
                            var navFullPath = NR.resolvePath(opfDir, navItem.href);
                            var navEntry = zip.file(navFullPath);
                            if (navEntry) {
                                navPromise = navEntry.async('string').then(function(navText) {
                                    var navDoc = parseHtmlLike(navText);
                                    navDoc.querySelectorAll('nav[epub\\:type="toc"] ol a[href], nav[role="doc-toc"] ol a[href]').forEach(function(a) {
                                        var hrefAttr = a.getAttribute('href');
                                        if (hrefAttr) {
                                            var clean = NR.resolvePath(opfDir, hrefAttr).split('#')[0];
                                            if (a.textContent.trim()) titleByHref[clean] = a.textContent.trim();
                                        }
                                    });
                                });
                            }
                        }
                        
                        return navPromise.then(function() {
                            var IMG_MARK = ':::EPUB_IMG:::';
                            var lines = [];
                            var isFirstImage = true;
                            
                            function processSpineItem(index) {
                                if (index >= spineIds.length) {
                                    var fullText = lines.join('\n');
                                    if (!fullText.trim()) throw new Error('EPUB 解析结果为空');
                                    return { textContent: fullText, coverUrl: coverUrl };
                                }
                                
                                var idref = spineIds[index];
                                var item = manifest[idref];
                                if (!item || !/html|xhtml/.test(item.mediaType || '')) {
                                    return processSpineItem(index + 1);
                                }
                                
                                var htmlPath = NR.resolvePath(opfDir, item.href);
                                var htmlEntry = zip.file(htmlPath);
                                if (!htmlEntry) return processSpineItem(index + 1);
                                
                                return htmlEntry.async('string').then(function(html) {
                                    var doc = parseHtmlLike(html);
                                    var chapterTitleText = titleByHref[htmlPath];
                                    if (!chapterTitleText) {
                                        var titleEl = doc.querySelector('h1,h2,h3,h4,h5,h6,title');
                                        if (titleEl) chapterTitleText = titleEl.textContent;
                                    }
                                    if (chapterTitleText && chapterTitleText.trim()) {
                                        lines.push(chapterTitleText.trim(), '');
                                    }
                                    
                                    var nodes = doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,figure,img,image,p,blockquote,pre');
                                    var imagePromises = [];
                                    
                                    nodes.forEach(function(el) {
                                        var tag = el.tagName.toUpperCase();
                                        if (/^H[1-6]$/.test(tag)) return;
                                        
                                        function processImage(imgEl) {
                                            var xlinkHref = imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                                            var src = imgEl.getAttribute('src') || imgEl.getAttribute('href') || xlinkHref || imgEl.getAttribute('xlink:href') || '';
                                            if (!src) return Promise.resolve(null);
                                            var cleanPath = NR.resolvePath(htmlPath.substring(0, htmlPath.lastIndexOf('/') + 1), src).split('#')[0];
                                            var manifestItem = manifestByFullPath[cleanPath];
                                            return makeImageDataUrl(zip, cleanPath, manifestItem && manifestItem.mediaType).then(function(imgDataUrl) {
                                                if (imgDataUrl) {
                                                    if (isFirstImage && !coverUrl) {
                                                        coverUrl = imgDataUrl;
                                                        isFirstImage = false;
                                                    }
                                                    NR.state.epubImagePreloadList.push(imgDataUrl);
                                                    return { url: imgDataUrl, alt: (imgEl.getAttribute('alt') || '').trim() };
                                                }
                                                return null;
                                            });
                                        }
                                        
                                        if (tag === 'FIGURE') {
                                            var img = el.querySelector('img, image');
                                            if (img) {
                                                imagePromises.push(processImage(img).then(function(imgData) {
                                                    if (imgData) {
                                                        lines.push(IMG_MARK + encodeURIComponent(imgData.url) + '|' + encodeURIComponent(imgData.alt));
                                                        var capEl = el.querySelector('figcaption');
                                                        var cap = (capEl ? capEl.textContent : '').trim();
                                                        if (cap) lines.push(cap);
                                                        lines.push('');
                                                    }
                                                }));
                                            }
                                        } else if ((tag === 'IMG' || tag === 'IMAGE') && !el.closest('figure')) {
                                            imagePromises.push(processImage(el).then(function(imgData) {
                                                if (imgData) {
                                                    lines.push(IMG_MARK + encodeURIComponent(imgData.url) + '|' + encodeURIComponent(imgData.alt), '');
                                                }
                                            }));
                                        } else if (['P', 'BLOCKQUOTE', 'PRE'].indexOf(tag) !== -1 && (!el.children.length || ['IMG', 'IMAGE'].indexOf(el.children[0].tagName.toUpperCase()) === -1)) {
                                            var text = (el.textContent || '').replace(/\s+\n/g, '\n').replace(/\u00A0/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
                                            if (text) lines.push(text);
                                        }
                                    });
                                    
                                    return Promise.all(imagePromises).then(function() {
                                        if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
                                        return processSpineItem(index + 1);
                                    });
                                });
                            }
                            
                            return processSpineItem(0);
                        });
                    });
                });
            });
        });
    };

    NR.readFileAsText = function(file, encoding) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() { resolve(reader.result); };
            reader.onerror = function() { reject(reader.error); };
            reader.readAsText(file, encoding);
        });
    };
})();
