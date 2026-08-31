// 数据库管理
(function() {
    var NR = window.NovelReader;
    
    NR.storageDB = {
        db: null,
        init: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                var request = indexedDB.open("NovelReaderDatabase", 4); // 升级版本号
                request.onupgradeneeded = function(event) {
                    var db = event.target.result;
                    if (!db.objectStoreNames.contains("assets")) {
                        db.createObjectStore("assets", { keyPath: "id" });
                    }
                    if (!db.objectStoreNames.contains("books")) {
                        db.createObjectStore("books", { keyPath: "id" });
                    }
                    if (!db.objectStoreNames.contains("images")) {
                        db.createObjectStore("images", { keyPath: "id" });
                    }
                    if (!db.objectStoreNames.contains("bookSources")) {
                        db.createObjectStore("bookSources", { keyPath: "bookSourceUrl" });
                    }
                };
                request.onsuccess = function(event) {
                    self.db = event.target.result;
                    resolve();
                };
                request.onerror = function(event) {
                    reject("IndexedDB error: " + event.target.errorCode);
                };
            });
        },
        _getStore: function(name, mode) {
            if (!this.db) {
                console.warn('[DB] 数据库未初始化，无法获取store:', name);
                return null;
            }
            try {
                return this.db.transaction([name], mode).objectStore(name);
            } catch (e) {
                console.error('[DB] 获取store失败:', name, e);
                return null;
            }
        },
        saveAsset: function(asset) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('assets', 'readwrite');
                if (!store) { resolve(); return; }
                var req = store.put(asset);
                req.onsuccess = resolve;
                req.onerror = function(e) { reject("Failed to save asset: " + e.target.error); };
            });
        },
        loadAsset: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('assets', 'readonly');
                if (!store) { resolve(null); return; }
                var req = store.get(id);
                req.onsuccess = function() { resolve(req.result); };
                req.onerror = function(e) { reject("Failed to load asset: " + e.target.error); };
            });
        },
        deleteAsset: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('assets', 'readwrite');
                if (!store) { resolve(); return; }
                var req = store.delete(id);
                req.onsuccess = resolve;
                req.onerror = function(e) { reject("Failed to delete asset: " + e.target.error); };
            });
        },
        // 图片存储相关方法
        saveImage: function(id, data) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('images', 'readwrite');
                if (!store) { resolve(); return; }
                var req = store.put({ id: id, data: data });
                req.onsuccess = resolve;
                req.onerror = function(e) { reject("Failed to save image: " + e.target.error); };
            });
        },
        loadImage: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('images', 'readonly');
                if (!store) { resolve(null); return; }
                var req = store.get(id);
                req.onsuccess = function() { resolve(req.result ? req.result.data : null); };
                req.onerror = function(e) { reject("Failed to load image: " + e.target.error); };
            });
        },
        deleteImage: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('images', 'readwrite');
                if (!store) { resolve(); return; }
                var req = store.delete(id);
                req.onsuccess = resolve;
                req.onerror = function(e) { reject("Failed to delete image: " + e.target.error); };
            });
        },
        _deleteByCursor: function(storeName, predicate) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore(storeName, 'readwrite');
                if (!store) { resolve(0); return; }
                var deleted = 0;
                var req = store.openCursor();
                req.onsuccess = function(e) {
                    var cursor = e.target.result;
                    if (!cursor) {
                        resolve(deleted);
                        return;
                    }
                    var value = cursor.value || {};
                    if (predicate(value, cursor.key)) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                };
                req.onerror = function(e) { reject("Failed to scan " + storeName + ": " + e.target.error); };
            });
        },
        deleteAssetsByIds: function(ids) {
            var self = this;
            ids = Array.from(new Set((ids || []).filter(Boolean)));
            if (ids.length === 0) return Promise.resolve(0);
            return Promise.all(ids.map(function(id) {
                return self.deleteAsset(id).then(function() { return 1; }).catch(function(err) {
                    console.warn('[DB] 删除资源失败:', id, err);
                    return 0;
                });
            })).then(function(results) {
                return results.reduce(function(sum, n) { return sum + n; }, 0);
            });
        },
        deleteImagesByBookName: function(bookName) {
            var prefix = 'img_' + bookName + '_';
            return this._deleteByCursor('images', function(value) {
                return value && typeof value.id === 'string' && value.id.indexOf(prefix) === 0;
            });
        },
        deleteBookResources: function(bookName, bookData) {
            bookData = bookData || {};
            var assetIds = [];
            (bookData.sceneImages || []).forEach(function(item) {
                if (item && item.imageId) assetIds.push(item.imageId);
            });
            return Promise.all([
                this.deleteAssetsByIds(assetIds),
                this.deleteImagesByBookName(bookName)
            ]).then(function(results) {
                return { assets: results[0] || 0, images: results[1] || 0 };
            });
        },
        saveBook: function(book) {
            var self = this;
            return new Promise(function(resolve, reject) {
                console.log('[DB] saveBook called, id:', book.id, 'content length:', book.content ? book.content.length : 0);
                var store = self._getStore('books', 'readwrite');
                if (!store) { 
                    console.warn('[DB] saveBook: store为null，跳过保存');
                    resolve(); 
                    return; 
                }
                var req = store.put(book);
                req.onsuccess = function() {
                    console.log('[DB] saveBook成功:', book.id);
                    resolve();
                };
                req.onerror = function(e) { 
                    console.error('[DB] saveBook失败:', e.target.error);
                    reject("Failed to save book: " + e.target.error); 
                };
            });
        },
        loadBook: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                console.log('[DB] loadBook called, id:', id);
                var store = self._getStore('books', 'readonly');
                if (!store) { 
                    console.warn('[DB] loadBook: store为null，返回null');
                    resolve(null); 
                    return; 
                }
                var req = store.get(id);
                req.onsuccess = function() { 
                    console.log('[DB] loadBook结果:', req.result ? '找到' : '未找到');
                    if (req.result) {
                        console.log('[DB] loadBook内容长度:', req.result.content ? req.result.content.length : 0);
                    }
                    resolve(req.result); 
                };
                req.onerror = function(e) { 
                    console.error('[DB] loadBook失败:', e.target.error);
                    reject("Failed to load book: " + e.target.error); 
                };
            });
        },
        deleteBook: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('books', 'readwrite');
                if (!store) { resolve(); return; }
                var req = store.delete(id);
                req.onsuccess = resolve;
                req.onerror = function(e) { reject("Failed to delete book: " + e.target.error); };
            });
        },
        clearBooks: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('books', 'readwrite');
                if (!store) { resolve(); return; }
                var req = store.clear();
                req.onsuccess = resolve;
                req.onerror = function(e) { reject("Failed to clear books: " + e.target.error); };
            });
        },
        saveBookSource: function(source) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('bookSources', 'readwrite');
                if (!store) { resolve(); return; }
                var req = store.put(source);
                req.onsuccess = resolve;
                req.onerror = function(e) { reject(e.target.error); };
            });
        },
        saveBookSources: function(sources) {
            var self = this;
            return Promise.all((sources || []).map(function(source) { return self.saveBookSource(source); }));
        },
        loadBookSources: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('bookSources', 'readonly');
                if (!store) { resolve([]); return; }
                var req = store.getAll();
                req.onsuccess = function() { resolve(req.result || []); };
                req.onerror = function(e) { reject(e.target.error); };
            });
        },
        deleteBookSource: function(sourceUrl) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var store = self._getStore('bookSources', 'readwrite');
                if (!store) { resolve(); return; }
                var req = store.delete(sourceUrl);
                req.onsuccess = resolve;
                req.onerror = function(e) { reject(e.target.error); };
            });
        }
    };

    // 生成图片ID
    NR.generateImageId = function(bookName, type, name) {
        return 'img_' + bookName + '_' + type + '_' + name + '_' + Date.now();
    };

    // 提取并保存图片数据到IndexedDB，返回处理后的bookData（图片替换为引用ID）
    NR.extractAndSaveImages = function(bookData, bookName) {
        var promises = [];
        var profiles = bookData.characterProfiles || [];
        
        profiles.forEach(function(profile) {
            // 处理 cover
            if (profile.cover && profile.cover.startsWith('data:')) {
                var coverId = profile._coverId || NR.generateImageId(bookName, 'cover', profile.name);
                profile._coverId = coverId;
                promises.push(NR.storageDB.saveImage(coverId, profile.cover));
                profile.cover = '@img:' + coverId; // 替换为引用
            }
            // 处理 originalCover
            if (profile.originalCover && profile.originalCover.startsWith('data:')) {
                var origId = profile._originalCoverId || NR.generateImageId(bookName, 'origcover', profile.name);
                profile._originalCoverId = origId;
                promises.push(NR.storageDB.saveImage(origId, profile.originalCover));
                profile.originalCover = '@img:' + origId; // 替换为引用
            }
        });
        
        return Promise.all(promises);
    };

    // 从IndexedDB恢复图片数据
    NR.restoreImages = function(bookData) {
        var promises = [];
        var profiles = bookData.characterProfiles || [];
        
        profiles.forEach(function(profile) {
            // 恢复 cover
            if (profile.cover && profile.cover.startsWith('@img:')) {
                var coverId = profile.cover.substring(5);
                promises.push(
                    NR.storageDB.loadImage(coverId).then(function(data) {
                        if (data) profile.cover = data;
                        else profile.cover = null;
                    })
                );
            }
            // 恢复 originalCover
            if (profile.originalCover && profile.originalCover.startsWith('@img:')) {
                var origId = profile.originalCover.substring(5);
                promises.push(
                    NR.storageDB.loadImage(origId).then(function(data) {
                        if (data) profile.originalCover = data;
                        else profile.originalCover = null;
                    })
                );
            }
        });
        
        return Promise.all(promises);
    };
})();
