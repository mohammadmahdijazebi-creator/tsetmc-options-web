/**
 * underlying.js
 * ماژول مدیریت، نگاشت و واکشی اطلاعات دارایی‌های پایه (سهم‌های پایه اختیار معامله)
 */

window.UnderlyingAssets = (function () {
    'use strict';

    // کش محلی برای نگهداری مشخصات و قیمت‌های دارایی پایه
    const underlyingCache = new Map();

    /**
     * استخراج نماد دارایی پایه از نماد اختیار یا نام کامل
     * @param {string} optionSymbol نماد قرارداد اختیار (مثلاً ضخود1204 یا طاهرم1108)
     * @param {string} optionName نام کامل قرارداد
     * @returns {string} نماد حدسی دارایی پایه
     */
    function extractUnderlyingTicker(optionSymbol, optionName) {
        if (!optionSymbol && !optionName) return '';

        // استخراج از نام کامل در صورت وجود فرمت رسمی بورس (مثلاً: اختیارخ خودرو...)
        if (optionName) {
            const matchName = optionName.match(/اختیار[خف]\s+([^\-]+)/);
            if (matchName && matchName[1]) {
                return matchName[1].trim();
            }
        }

        // استخراج بر اساس نماد (حذف حرف اول ض یا ط و حذف ارقام سررسید انتهایی)
        if (optionSymbol && optionSymbol.length >= 4) {
            let base = optionSymbol;
            if (base.startsWith('ض') || base.startsWith('ط')) {
                base = base.substring(1);
            }
            // حذف اعداد سررسید از انتهای نماد
            base = base.replace(/[0-9]+$/, '');
            return base.trim();
        }

        return '';
    }

    /**
     * ثبت و به‌روزرسانی اطلاعات دارایی پایه در کش
     * @param {string} ticker نماد پایه
     * @param {Object} data اطلاعات قیمت، پایانی و تغییرات
     */
    function setUnderlyingData(ticker, data) {
        if (!ticker) return;
        const current = underlyingCache.get(ticker) || {};
        underlyingCache.set(ticker, {
            ...current,
            ...data,
            lastUpdated: Date.now()
        });
    }

    /**
     * دریافت اطلاعات دارایی پایه از کش
     * @param {string} ticker نماد پایه
     * @returns {Object|null}
     */
    function getUnderlyingData(ticker) {
        if (!ticker) return null;
        return underlyingCache.get(ticker) || null;
    }

    /**
     * دریافت تمام دارایی‌های پایه ثبت‌شده
     */
    function getAllUnderlyings() {
        const result = [];
        underlyingCache.forEach((value, key) => {
            result.push({ ticker: key, ...value });
        });
        return result;
    }

    /**
     * همگام‌سازی دارایی‌های پایه از داده‌های خام دریافتی اسکنر
     * @param {Array} optionsList لیست قراردادهای دریافتی
     */
    function syncFromOptionsList(optionsList) {
        if (!Array.isArray(optionsList)) return;

        optionsList.forEach(opt => {
            const uaTicker = opt.uaTicker || extractUnderlyingTicker(opt.symbol || opt.lVal18AFC, opt.name || opt.lVal30);
            if (!uaTicker) return;

            const existing = underlyingCache.get(uaTicker) || {};
            const uaPrice = Number(opt.uaPrice || opt.pClosingUA || existing.price || 0);

            underlyingCache.set(uaTicker, {
                ticker: uaTicker,
                price: uaPrice,
                lastUpdated: Date.now()
            });
        });
    }

    /**
     * گوش دادن به رویداد به‌روزرسانی اسکنر
     */
    document.addEventListener('optionScanUpdated', function (e) {
        if (e.detail && e.detail.options) {
            syncFromOptionsList(e.detail.options);
        }
    });

    return {
        extractUnderlyingTicker,
        setUnderlyingData,
        getUnderlyingData,
        getAllUnderlyings,
        syncFromOptionsList
    };
})();
