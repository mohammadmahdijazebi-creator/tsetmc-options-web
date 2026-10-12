/**
 * payoff.js
 * ماژول محاسبه و رسم نمودار سود و زیان (Payoff) در سررسید
 */

window.OptionPayoff = (function () {
    'use strict';

    /**
     * محاسبه سود/زیان یک موقعیت خرید یا فروش اختیار خرید/فروش
     * @param {string} type 'call' یا 'put'
     * @param {string} position 'long' (خرید) یا 'short' (فروش)
     * @param {number} strike قیمت اعمال
     * @param {number} premium پرمیوم (قیمت خرید/فروش اختیار)
     * @param {number} underlyingPrice قیمت پایانی سهم پایه در سررسید
     * @param {number} contractSize اندازه قرارداد (پیش‌فرض ۱۰۰۰)
     */
    function calculateLegPayoff(type, position, strike, premium, underlyingPrice, contractSize = 1000) {
        let intrinsicValue = 0;

        if (type.toLowerCase() === 'call') {
            intrinsicValue = Math.max(0, underlyingPrice - strike);
        } else if (type.toLowerCase() === 'put') {
            intrinsicValue = Math.max(0, strike - underlyingPrice);
        }

        let profitPerShare = 0;
        if (position.toLowerCase() === 'long') {
            profitPerShare = intrinsicValue - premium;
        } else if (position.toLowerCase() === 'short') {
            profitPerShare = premium - intrinsicValue;
        }

        return profitPerShare * contractSize;
    }

    /**
     * محاسبه سود/زیان سهم پایه (موقعیت نقدی)
     */
    function calculateStockPayoff(buyPrice, currentPrice, quantity = 1000) {
        return (currentPrice - buyPrice) * quantity;
    }

    /**
     * تولید آرایه داده‌ها برای رسم نمودار در بازه‌ای از قیمت‌های دارایی پایه
     * @param {Array} legs موقعیت‌ها: [{ type: 'call'|'put'|'stock', position: 'long'|'short', strike: 0, premium: 0, buyPrice: 0, quantity: 1000 }]
     * @param {number} currentPrice قیمت فعلی سهم پایه
     * @param {number} rangePercent درصد نوسان بالا و پایین برای محور افقی (پیش‌فرض ۳۰ درصد)
     */
    function generatePayoffData(legs, currentPrice, rangePercent = 30) {
        if (!currentPrice || currentPrice <= 0 || !Array.isArray(legs) || legs.length === 0) {
            return { prices: [], payoffs: [], breakevens: [], maxProfit: 0, maxLoss: 0 };
        }

        const minPrice = Math.max(1, Math.floor(currentPrice * (1 - rangePercent / 100)));
        const maxPrice = Math.ceil(currentPrice * (1 + rangePercent / 100));
        const step = Math.max(1, Math.round((maxPrice - minPrice) / 100));

        const prices = [];
        const payoffs = [];
        let maxProfit = -Infinity;
        let maxLoss = Infinity;

        for (let p = minPrice; p <= maxPrice; p += step) {
            let totalProfit = 0;

            legs.forEach(leg => {
                if (leg.type === 'stock') {
                    totalProfit += calculateStockPayoff(leg.buyPrice, p, leg.quantity || 1000);
                } else {
                    totalProfit += calculateLegPayoff(
                        leg.type,
                        leg.position,
                        leg.strike,
                        leg.premium,
                        p,
                        leg.quantity || 1000
                    );
                }
            });

            prices.push(p);
            payoffs.push(Math.round(totalProfit));

            if (totalProfit > maxProfit) maxProfit = totalProfit;
            if (totalProfit < maxLoss) maxLoss = totalProfit;
        }

        // یافتن نقاط سربه‌سر (Breakeven)
        const breakevens = [];
        for (let i = 1; i < payoffs.length; i++) {
            if ((payoffs[i - 1] <= 0 && payoffs[i] >= 0) || (payoffs[i - 1] >= 0 && payoffs[i] <= 0)) {
                breakevens.push(prices[i]);
            }
        }

        return {
            prices,
            payoffs,
            breakevens,
            maxProfit: Math.round(maxProfit),
            maxLoss: Math.round(maxLoss)
        };
    }

    /**
     * رسم نمودار Payoff روی Canvas HTML5 بدون نیاز به کتابخانه‌های خارجی
     * @param {string} canvasId شناسه المان canvas
     * @param {Object} payoffData خروجی تابع generatePayoffData
     * @param {number} currentPrice قیمت فعلی سهم
     */
    function drawPayoffCanvas(canvasId, payoffData, currentPrice) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const { prices, payoffs } = payoffData;
        if (!prices || prices.length < 2) return;

        const minPayoff = Math.min(...payoffs);
        const maxPayoff = Math.max(...payoffs);
        const payoffSpan = Math.max(1, maxPayoff - minPayoff);

        const padding = { top: 30, right: 40, bottom: 40, left: 60 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;

        // تابع تبدیل مختصات
        const getX = (price) => {
            const minP = prices[0];
            const maxP = prices[prices.length - 1];
            return padding.left + ((price - minP) / (maxP - minP)) * plotWidth;
        };

        const getY = (val) => {
            return padding.top + plotHeight - ((val - minPayoff) / payoffSpan) * plotHeight;
        };

        // رسم خط صفر (سربه‌سر)
        const zeroY = getY(0);
        ctx.beginPath();
        ctx.strokeStyle = '#9e9e9e';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(width - padding.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // رسم خط قیمت فعلی دارایی پایه
        if (currentPrice >= prices[0] && currentPrice <= prices[prices.length - 1]) {
            const currentX = getX(currentPrice);
            ctx.beginPath();
            ctx.strokeStyle = '#2196f3';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 2]);
            ctx.moveTo(currentX, padding.top);
            ctx.lineTo(currentX, height - padding.bottom);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#1976d2';
            ctx.font = '11px Tahoma';
            ctx.fillText(`قیمت کنونی: ${currentPrice.toLocaleString()}`, currentX - 45, padding.top - 10);
        }

        // رسم خط سود/زیان
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        for (let i = 0; i < prices.length; i++) {
            const x = getX(prices[i]);
            const y = getY(payoffs[i]);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = '#2e7d32'; // سبز
        ctx.stroke();

        // برچسب‌های محور قیمت
        ctx.fillStyle = '#555';
        ctx.font = '10px Tahoma';
        ctx.fillText(prices[0].toLocaleString(), padding.left, height - padding.bottom + 20);
        ctx.fillText(prices[prices.length - 1].toLocaleString(), width - padding.right - 30, height - padding.bottom + 20);
    }

    return {
        calculateLegPayoff,
        calculateStockPayoff,
        generatePayoffData,
        drawPayoffCanvas
    };
})();
