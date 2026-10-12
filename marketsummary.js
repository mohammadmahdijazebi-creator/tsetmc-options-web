/**
 * marketsummary.js
 * ماژول خلاصه وضعیت کلی بازار مشتقه و اختیار معامله
 */

window.MarketSummary = (function () {
    'use strict';

    /**
     * پردازش داده‌های کلی بازار و استخراج شاخص‌های تجمیعی
     * @param {Array} optionsList لیست قراردادهای دریافتی
     * @returns {Object} آمار کلان بازار
     */
    function computeMarketStats(optionsList) {
        if (!Array.isArray(optionsList) || optionsList.length === 0) {
            return {
                totalContracts: 0,
                totalVolume: 0,
                totalValueRial: 0,
                callCount: 0,
                putCount: 0,
                callVolume: 0,
                putVolume: 0,
                callValueRial: 0,
                putValueRial: 0,
                topValuedOptions: [],
                maturityGroups: {}
            };
        }

        let totalVolume = 0;
        let totalValueRial = 0;
        let callCount = 0;
        let putCount = 0;
        let callVolume = 0;
        let putVolume = 0;
        let callValueRial = 0;
        let putValueRial = 0;
        const maturityGroups = {};

        optionsList.forEach(opt => {
            const vol = Number(opt.volume || opt.qTotCap || 0);
            const price = Number(opt.lastPrice || opt.pClosing || 0);
            const val = vol * price;
            const days = opt.daysToMaturity !== undefined ? opt.daysToMaturity : '-';
            const side = (opt.side || opt.type || '').toLowerCase();

            totalVolume += vol;
            totalValueRial += val;

            if (side === 'call') {
                callCount++;
                callVolume += vol;
                callValueRial += val;
            } else if (side === 'put') {
                putCount++;
                putVolume += vol;
                putValueRial += val;
            }

            // تجمیع بر اساس سررسید
            if (!maturityGroups[days]) {
                maturityGroups[days] = {
                    daysToMaturity: days,
                    count: 0,
                    volume: 0,
                    valueRial: 0
                };
            }
            maturityGroups[days].count++;
            maturityGroups[days].volume += vol;
            maturityGroups[days].valueRial += val;
        });

        // بیشترین ارزش معاملات
        const topValuedOptions = [...optionsList]
            .map(opt => ({
                symbol: opt.symbol || opt.lVal18AFC || '-',
                name: opt.name || opt.lVal30 || '-',
                side: opt.side || opt.type || '-',
                volume: Number(opt.volume || opt.qTotCap || 0),
                valueRial: Number(opt.volume || opt.qTotCap || 0) * Number(opt.lastPrice || opt.pClosing || 0)
            }))
            .sort((a, b) => b.valueRial - a.valueRial)
            .slice(0, 10);

        return {
            totalContracts: optionsList.length,
            totalVolume,
            totalValueRial,
            callCount,
            putCount,
            callVolume,
            putVolume,
            callValueRial,
            putValueRial,
            topValuedOptions,
            maturityGroups
        };
    }

    /**
     * فرمت‌دهی اعداد به ریال / میلیون / میلیارد
     */
    function formatValue(num) {
        if (!num || isNaN(num)) return '۰';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + ' همت';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + ' میلیارد';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + ' میلیون';
        return Number(num).toLocaleString('fa-IR');
    }

    /**
     * رندر کارت‌های خلاصه بازار در رابط کاربری
     */
    function renderSummaryCards(stats, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const pcrVolume = stats.callVolume > 0 ? (stats.putVolume / stats.callVolume).toFixed(2) : '۰';
        const pcrValue = stats.callValueRial > 0 ? (stats.putValueRial / stats.callValueRial).toFixed(2) : '۰';

        container.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:15px; font-size:13px;">
                <div style="flex:1; min-width:180px; background:#fff; padding:12px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.1); border-top:3px solid #1976d2;">
                    <div style="color:#666; font-size:11px;">تعداد کل نمادها</div>
                    <div style="font-size:18px; font-weight:bold; margin-top:4px;">${stats.totalContracts.toLocaleString('fa-IR')}</div>
                    <div style="font-size:11px; color:#888; margin-top:4px;">خرید: ${stats.callCount} | فروش: ${stats.putCount}</div>
                </div>

                <div style="flex:1; min-width:180px; background:#fff; padding:12px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.1); border-top:3px solid #388e3c;">
                    <div style="color:#666; font-size:11px;">حجم کل معاملات</div>
                    <div style="font-size:18px; font-weight:bold; margin-top:4px;">${formatValue(stats.totalVolume)}</div>
                    <div style="font-size:11px; color:#888; margin-top:4px;">خرید: ${formatValue(stats.callVolume)} | فروش: ${formatValue(stats.putVolume)}</div>
                </div>

                <div style="flex:1; min-width:180px; background:#fff; padding:12px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.1); border-top:3px solid #f57c00;">
                    <div style="color:#666; font-size:11px;">ارزش کل معاملات</div>
                    <div style="font-size:18px; font-weight:bold; margin-top:4px;">${formatValue(stats.totalValueRial)} ریال</div>
                    <div style="font-size:11px; color:#888; margin-top:4px;">خرید: ${formatValue(stats.callValueRial)} | فروش: ${formatValue(stats.putValueRial)}</div>
                </div>

                <div style="flex:1; min-width:180px; background:#fff; padding:12px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.1); border-top:3px solid #7b1fa2;">
                    <div style="color:#666; font-size:11px;">نسبت پوت به کال (PCR)</div>
                    <div style="font-size:18px; font-weight:bold; margin-top:4px;">حجمی: ${pcrVolume}</div>
                    <div style="font-size:11px; color:#888; margin-top:4px;">ارزشی: ${pcrValue}</div>
                </div>
            </div>
        `;
    }

    /**
     * گوش دادن به رویداد به‌روزرسانی اسکنر
     */
    document.addEventListener('optionScanUpdated', function (e) {
        if (!e.detail || !e.detail.options) return;
        const stats = computeMarketStats(e.detail.options);
        window.MarketSummaryStats = stats;
        renderSummaryCards(stats, 'marketSummaryCards');
    });

    return {
        computeMarketStats,
        formatValue,
        renderSummaryCards
    };
})();
