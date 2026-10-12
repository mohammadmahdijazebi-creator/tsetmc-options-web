/**
 * strategy.js
 * ماژول تحلیل و فیلتر استراتژی‌های آپشن (اسکنر تحت وب)
 */

window.OptionStrategies = (function () {
    'use strict';

    // تنظیمات پیش‌فرض محاسبات استراتژی
    const DEFAULT_CONFIG = {
        minDaysToMaturity: 1,
        maxDaysToMaturity: 120,
        riskFreeRate: 0.25, // نرخ بدون ریسک پیش‌فرض ۲۵ درصد
        minVolume: 10
    };

    /**
     * گروه‌بندی قراردادها بر اساس دارایی پایه
     * @param {Array} optionsList لیست قراردادهای خام دریافتی از اسکنر
     * @returns {Object} قراردادهای دسته‌بندی شده به تفکیک نماد پایه
     */
    function groupOptionsByUnderlying(optionsList) {
        const groups = {};

        if (!Array.isArray(optionsList)) return groups;

        optionsList.forEach(opt => {
            if (!opt || !opt.uaTicker) return;
            const ua = opt.uaTicker;
            if (!groups[ua]) {
                groups[ua] = {
                    uaTicker: ua,
                    uaPrice: opt.uaPrice || 0,
                    calls: [],
                    puts: []
                };
            }
            if (opt.side === 'call' || opt.type === 'call') {
                groups[ua].calls.push(opt);
            } else if (opt.side === 'put' || opt.type === 'put') {
                groups[ua].puts.push(opt);
            }
        });

        return groups;
    }

    /**
     * شناسایی فرصت‌های آربیتراژ پوشش‌داده‌شده (Covered Call)
     */
    function scanCoveredCalls(groupedData) {
        const opportunities = [];

        Object.keys(groupedData).forEach(ua => {
            const group = groupedData[ua];
            const uaPrice = group.uaPrice;
            if (!uaPrice || uaPrice <= 0) return;

            group.calls.forEach(call => {
                const strike = call.strike || call.strikePrice;
                const premium = call.bidPrice || call.lastPrice || 0;
                const days = call.daysToMaturity || 0;

                if (premium <= 0 || days <= 0) return;

                // محاسبه بازدهی در صورت ثابت ماندن قیمت پایه (Static Return)
                const staticReturn = (premium / uaPrice) * (365 / days) * 100;
                // محاسبه حداکثر بازدهی در صورت اعمال در سررسید (Max Return)
                const maxProfit = (strike - uaPrice) + premium;
                const maxReturn = (maxProfit / uaPrice) * (365 / days) * 100;
                // حاشیه امنیت (Downside Protection)
                const downsideProtection = (premium / uaPrice) * 100;

                opportunities.push({
                    strategy: 'Covered Call',
                    underlying: ua,
                    uaPrice: uaPrice,
                    symbol: call.symbol || call.lVal18AFC,
                    strike: strike,
                    premium: premium,
                    daysToMaturity: days,
                    staticAnnualReturn: parseFloat(staticReturn.toFixed(2)),
                    maxAnnualReturn: parseFloat(maxReturn.toFixed(2)),
                    protectionPercent: parseFloat(downsideProtection.toFixed(2)),
                    delta: call.delta || 0
                });
            });
        });

        return opportunities.sort((a, b) => b.staticAnnualReturn - a.staticAnnualReturn);
    }

    /**
     * شناسایی موقعیت‌های بول کال اسپرد (Bull Call Spread)
     */
    function scanBullCallSpreads(groupedData) {
        const spreads = [];

        Object.keys(groupedData).forEach(ua => {
            const group = groupedData[ua];
            const calls = group.calls.filter(c => (c.daysToMaturity || 0) > 0);

            // مرتب‌سازی بر اساس اعمال
            calls.sort((a, b) => (a.strike || a.strikePrice) - (b.strike || b.strikePrice));

            for (let i = 0; i < calls.length; i++) {
                for (let j = i + 1; j < calls.length; j++) {
                    const buyCall = calls[i];
                    const sellCall = calls[j];

                    // بررسی یکسان بودن تاریخ سررسید
                    if (buyCall.daysToMaturity !== sellCall.daysToMaturity) continue;

                    const k1 = buyCall.strike || buyCall.strikePrice;
                    const k2 = sellCall.strike || sellCall.strikePrice;
                    const askPrice = buyCall.askPrice || buyCall.lastPrice || 0;
                    const bidPrice = sellCall.bidPrice || sellCall.lastPrice || 0;

                    if (askPrice <= 0 || bidPrice <= 0) continue;

                    const netDebit = askPrice - bidPrice;
                    if (netDebit <= 0) continue; // هزینه ورود باید مثبت باشد

                    const maxProfit = (k2 - k1) - netDebit;
                    if (maxProfit <= 0) continue;

                    const rewardToRisk = maxProfit / netDebit;
                    const breakeven = k1 + netDebit;

                    spreads.push({
                        strategy: 'Bull Call Spread',
                        underlying: ua,
                        buySymbol: buyCall.symbol || buyCall.lVal18AFC,
                        sellSymbol: sellCall.symbol || sellCall.lVal18AFC,
                        k1: k1,
                        k2: k2,
                        cost: netDebit,
                        maxProfit: maxProfit,
                        rrRatio: parseFloat(rewardToRisk.toFixed(2)),
                        breakeven: breakeven,
                        daysToMaturity: buyCall.daysToMaturity
                    });
                }
            }
        });

        return spreads.sort((a, b) => b.rrRatio - a.rrRatio);
    }

    /**
     * شناسایی عدم تعادل و نرخ پوت به کال (PCR)
     */
    function calculateMarketPCR(optionsList) {
        let callVolume = 0;
        let putVolume = 0;
        let callValue = 0;
        let putValue = 0;

        if (Array.isArray(optionsList)) {
            optionsList.forEach(opt => {
                const vol = opt.volume || opt.qTotCap || 0;
                const price = opt.lastPrice || opt.pClosing || 0;
                const value = vol * price;

                if (opt.side === 'call' || opt.type === 'call') {
                    callVolume += vol;
                    callValue += value;
                } else if (opt.side === 'put' || opt.type === 'put') {
                    putVolume += vol;
                    putValue += value;
                }
            });
        }

        const pcrVolume = callVolume > 0 ? (putVolume / callVolume) : 0;
        const pcrValue = callValue > 0 ? (putValue / callValue) : 0;

        return {
            callVolume,
            putVolume,
            callValue,
            putValue,
            pcrVolume: parseFloat(pcrVolume.toFixed(2)),
            pcrValue: parseFloat(pcrValue.toFixed(2))
        };
    }

    /**
     * رندر نتایج استراتژی در المان‌های مربوطه در صفحه وب
     */
    function renderStrategyResults(strategyType, data, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = '<div style="padding:15px; text-align:center; color:#777;">هیچ موقعیتی با معیارهای مشخص شده یافت نشد.</div>';
            return;
        }

        let tableHtml = '<table style="width:100%; border-collapse:collapse; font-size:12px; text-align:center;">';
        
        if (strategyType === 'coveredCall') {
            tableHtml += `
                <thead>
                    <tr style="background:#e9ecef;">
                        <th style="padding:8px; border:1px solid #ddd;">نماد پایه</th>
                        <th style="padding:8px; border:1px solid #ddd;">قرارداد خرید</th>
                        <th style="padding:8px; border:1px solid #ddd;">قیمت اعمال</th>
                        <th style="padding:8px; border:1px solid #ddd;">پرمیوم</th>
                        <th style="padding:8px; border:1px solid #ddd;">سررسید (روز)</th>
                        <th style="padding:8px; border:1px solid #ddd;">بازده بدون تغییر (%)</th>
                        <th style="padding:8px; border:1px solid #ddd;">حداکثر بازده (%)</th>
                        <th style="padding:8px; border:1px solid #ddd;">حاشیه امنیت (%)</th>
                    </tr>
                </thead>
                <tbody>
            `;

            data.slice(0, 50).forEach(item => {
                tableHtml += `
                    <tr>
                        <td style="padding:6px; border:1px solid #ddd; font-weight:bold;">${item.underlying}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${item.symbol}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${item.strike.toLocaleString()}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${item.premium.toLocaleString()}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${item.daysToMaturity}</td>
                        <td style="padding:6px; border:1px solid #ddd; color:green; font-weight:bold;">${item.staticAnnualReturn}%</td>
                        <td style="padding:6px; border:1px solid #ddd;">${item.maxAnnualReturn}%</td>
                        <td style="padding:6px; border:1px solid #ddd;">${item.protectionPercent}%</td>
                    </tr>
                `;
            });
            tableHtml += '</tbody></table>';
        }

        container.innerHTML = tableHtml;
    }

    /**
     * لیسنر برای به‌روزرسانی خودکار استراتژی‌ها پس از اسکن جدید داده‌ها
     */
    document.addEventListener('optionScanUpdated', function (e) {
        if (!e.detail || !e.detail.options) return;
        
        const optionsList = e.detail.options;
        const grouped = groupOptionsByUnderlying(optionsList);
        const coveredCalls = scanCoveredCalls(grouped);
        const spreads = scanBullCallSpreads(grouped);
        const pcr = calculateMarketPCR(optionsList);

        // ذخیره در دسترس بودن گلوبال جهت استفاده سایر توابع
        window.StrategyResults = {
            coveredCalls,
            spreads,
            pcr
        };

        // تلاش برای رندر خودکار در صورت وجود کانتینر
        renderStrategyResults('coveredCall', coveredCalls, 'coveredCallResults');
    });

    return {
        groupOptionsByUnderlying,
        scanCoveredCalls,
        scanBullCallSpreads,
        calculateMarketPCR,
        renderStrategyResults
    };
})();
