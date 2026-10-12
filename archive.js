/**
 * archive.js
 * ماژول ذخیره‌سازی و بایگانی تاریخچه اسکن بازار با استفاده از IndexedDB در مرورگر
 */

window.OptionArchive = (function () {
    'use strict';

    const DB_NAME = 'TsetmcOptionsArchiveDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'marketSnapshots';

    let dbInstance = null;

    /**
     * راه‌اندازی و اتصال به پایگاه داده مرورگر (IndexedDB)
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                return resolve(dbInstance);
            }

            if (!window.indexedDB) {
                console.warn('مرورگر شما از IndexedDB پشتیبانی نمی‌کند.');
                return resolve(null);
            }

            const request = window.indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function (event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // ایجاد مخزن با کلید timestamp
                    db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
                }
            };

            request.onsuccess = function (event) {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onerror = function (event) {
                console.error('خطا در باز کردن IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * ذخیره یک اسنپ‌شات جدید از داده‌های اسکن‌شده بازار
     * @param {Array} optionsData آرایه اطلاعات قراردادها
     */
    async function saveSnapshot(optionsData) {
        if (!Array.isArray(optionsData) || optionsData.length === 0) return false;

        try {
            const db = await initDB();
            if (!db) return false;

            const record = {
                timestamp: Date.now(),
                dateStr: new Date().toLocaleDateString('fa-IR'),
                timeStr: new Date().toLocaleTimeString('fa-IR'),
                count: optionsData.length,
                data: optionsData
            };

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const req = store.add(record);

                req.onsuccess = () => resolve(true);
                req.onerror = (e) => {
                    console.error('خطا در ثبت رکورد در آرشیو:', e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error('استثنا در saveSnapshot:', err);
            return false;
        }
    }

    /**
     * دریافت لیست تاریخچه اسکن‌ها (فقط متادیتا و بدون داده‌های سنگین)
     */
    async function getArchiveList() {
        try {
            const db = await initDB();
            if (!db) return [];

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const req = store.getAll();

                req.onsuccess = () => {
                    const results = req.result || [];
                    // خلاصه کردن برای سرعت بالا در رابط کاربری
                    const summaries = results.map(item => ({
                        timestamp: item.timestamp,
                        dateStr: item.dateStr,
                        timeStr: item.timeStr,
                        count: item.count
                    })).sort((a, b) => b.timestamp - a.timestamp);

                    resolve(summaries);
                };

                req.onerror = (e) => reject(e.target.error);
            });
        } catch (err) {
            console.error('خطا در دریافت لیست آرشیو:', err);
            return [];
        }
    }

    /**
     * دریافت داده‌های کامل یک اسنپ‌شات خاص با timestamp
     * @param {number} timestamp
     */
    async function getSnapshot(timestamp) {
        try {
            const db = await initDB();
            if (!db) return null;

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const req = store.get(timestamp);

                req.onsuccess = () => resolve(req.result ? req.result.data : null);
                req.onerror = (e) => reject(e.target.error);
            });
        } catch (err) {
            console.error('خطا در بازیابی اسنپ‌شات:', err);
            return null;
        }
    }

    /**
     * حذف داده‌های قدیمی‌تر از N روز برای جلوگیری از اشغال حافظه
     * @param {number} days
     */
    async function cleanOldSnapshots(days = 7) {
        try {
            const db = await initDB();
            if (!db) return;

            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const req = store.openCursor();

            req.onsuccess = function (event) {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.timestamp < cutoff) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
        } catch (err) {
            console.error('خطا در پاکسازی آرشیو قدیمی:', err);
        }
    }

    // ذخیره خودکار هنگام وقوع رویداد اسکن
    document.addEventListener('optionScanUpdated', function (e) {
        if (e.detail && e.detail.options && e.detail.options.length > 0) {
            saveSnapshot(e.detail.options).catch(console.error);
            cleanOldSnapshots(7).catch(console.error);
        }
    });

    return {
        initDB,
        saveSnapshot,
        getArchiveList,
        getSnapshot,
        cleanOldSnapshots
    };
})();
