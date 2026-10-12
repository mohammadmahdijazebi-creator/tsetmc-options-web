// dashboard.js - نسخه کامل و هماهنگ با index.html و GitHub Pages

let putRows = [];
let callRows = [];
let currentMode = "put";
let scanInProgress = false;

// تابع تغییر وضعیت متنی
function setStatusText(message) {
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.innerText = message;
    }
}

// تابع دریافت و پردازش داده‌ها
async function scan() {
    if (scanInProgress) return;
    scanInProgress = true;

    setStatusText("در حال دریافت اطلاعات از TSETMC...");

    try {
        // آدرس API سازمان بورس به همراه پراکسی جهت دور زدن CORS
        const targetUrl = "https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionMarketWatch/1";
        const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl);

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error("خطای ارتباط با سرور: " + response.status);
        }

        const data = await response.json();
        const records = data.instrumentOptMarketWatch || [];

        const minVolumeEl = document.getElementById("minVolume");
        const minVolume = minVolumeEl ? (Number(minVolumeEl.value) || 0) : 0;

        const puts = [];
        const calls = [];

        for (const r of records) {
            const underlying = Number(r.pDrCotVal_UA) || 0;
            const strike = Number(r.strikePrice) || 0;

            // اختیار فروش (PUT)
            if (r.lVal18AFC_P) {
                const closeP = Number(r.pClosing_P) || 0;
                const volP = Number(r.tVol_P) || 0;
                if (volP >= minVolume && closeP > 0 && strike > 0) {
                    const intrinsic = Math.max(0, strike - underlying);
                    const timeValue = Math.max(0, closeP - intrinsic);
                    const leverage = underlying > 0 ? (underlying / closeP) : 0;

                    puts.push({
                        symbol: r.lVal18AFC_P,
                        uaSymbol: r.lVal18AFC_UA || "-",
                        strike: strike,
                        days: r.remDay || 0,
                        close: closeP,
                        uaPrice: underlying,
                        vol: volP,
                        valueM: Math.round((closeP * volP) / 1000000),
                        openInt: Number(r.notSettleModVar_P) || 0,
                        leverage: leverage.toFixed(1),
                        status: underlying < strike ? "در سود" : (underlying === strike ? "بی‌تفاوت" : "در زیان")
                    });
                }
            }

            // اختیار خرید (CALL)
            if (r.lVal18AFC_C) {
                const closeC = Number(r.pClosing_C) || 0;
                const volC = Number(r.tVol_C) || 0;
                if (volC >= minVolume && closeC > 0 && strike > 0) {
                    const intrinsic = Math.max(0, underlying - strike);
                    const timeValue = Math.max(0, closeC - intrinsic);
                    const leverage = underlying > 0 ? (underlying / closeC) : 0;

                    calls.push({
                        symbol: r.lVal18AFC_C,
                        uaSymbol: r.lVal18AFC_UA || "-",
                        strike: strike,
                        days: r.remDay || 0,
                        close: closeC,
                        uaPrice: underlying,
                        vol: volC,
                        valueM: Math.round((closeC * volC) / 1000000),
                        openInt: Number(r.notSettleModVar_C) || 0,
                        leverage: leverage.toFixed(1),
                        status: underlying > strike ? "در سود" : (underlying === strike ? "بی‌تفاوت" : "در زیان")
                    });
                }
            }
        }

        putRows = puts;
        callRows = calls;

        // به‌روزرسانی کارت‌های آماری بالای صفحه
        const putCountEl = document.getElementById("putCount");
        const callCountEl = document.getElementById("callCount");
        const totalCountEl = document.getElementById("totalCount");
        const lastUpdateEl = document.getElementById("lastUpdate");

        if (putCountEl) putCountEl.innerText = puts.length.toLocaleString('fa-IR');
        if (callCountEl) callCountEl.innerText = calls.length.toLocaleString('fa-IR');
        if (totalCountEl) totalCountEl.innerText = (puts.length + calls.length).toLocaleString('fa-IR');

        const now = new Date();
        const timeStr = now.toLocaleTimeString('fa-IR');
        if (lastUpdateEl) lastUpdateEl.innerText = timeStr;

        renderTable();
        setStatusText("اطلاعات با موفقیت دریافت شد (" + timeStr + ")");

    } catch (err) {
        console.error("Scan Error:", err);
        setStatusText("خطا در دریافت اطلاعات: لطفا مجددا تلاش کنید.");
    } finally {
        scanInProgress = false;
    }
}

// نمایش سطرها در جدول
function renderTable() {
    const tbody = document.querySelector("table tbody") || document.getElementById("rows");
    if (!tbody) return;

    tbody.innerHTML = "";
    const list = currentMode === "put" ? putRows : callRows;

    for (const item of list) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${item.symbol}</b></td>
            <td>${item.uaSymbol}</td>
            <td>${item.strike.toLocaleString('fa-IR')}</td>
            <td>${item.close.toLocaleString('fa-IR')}</td>
            <td>${item.uaPrice.toLocaleString('fa-IR')}</td>
            <td>${item.vol.toLocaleString('fa-IR')}</td>
            <td>${item.days}</td>
            <td>${item.status}</td>
            <td>${item.leverage}</td>
        `;
        tbody.appendChild(tr);
    }
}

// اتصال رویدادها
document.addEventListener("DOMContentLoaded", () => {
    // دکمه اسکن جدید
    const scanBtn = document.getElementById("scanButton");
    if (scanBtn) {
        scanBtn.addEventListener("click", scan);
    }

    // دکمه‌های فیلتر پوت و کال
    const showPutBtn = document.getElementById("showPutButton");
    const showCallBtn = document.getElementById("showCallButton");

    if (showPutBtn) {
        showPutBtn.addEventListener("click", () => {
            currentMode = "put";
            renderTable();
        });
    }

    if (showCallBtn) {
        showCallBtn.addEventListener("click", () => {
            currentMode = "call";
            renderTable();
        });
    }

    // اسکن خودکار هنگام باز شدن صفحه
    scan();
});
