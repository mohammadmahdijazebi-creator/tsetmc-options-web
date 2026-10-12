// dashboard.js - نسخه نهایی سازگار با ساختار جدول‌های Put و Call

let putRows = [];
let callRows = [];
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
        // آدرس API سازمان بورس به همراه پراکسی CORS
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
            const remDay = Number(r.remDay) || 0;

            // اختیار فروش (PUT)
            if (r.lVal18AFC_P) {
                const closeP = Number(r.pClosing_P) || 0;
                const volP = Number(r.tVol_P) || 0;
                if (volP >= minVolume && closeP > 0 && strike > 0) {
                    const intrinsic = Math.max(0, strike - underlying);
                    const timeValue = Math.max(0, closeP - intrinsic);

                    puts.push({
                        symbol: r.lVal18AFC_P,
                        uaSymbol: r.lVal18AFC_UA || "-",
                        strike: strike,
                        close: closeP,
                        vol: volP,
                        intrinsic: intrinsic,
                        timeValue: timeValue,
                        remDay: remDay
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

                    calls.push({
                        symbol: r.lVal18AFC_C,
                        uaSymbol: r.lVal18AFC_UA || "-",
                        strike: strike,
                        close: closeC,
                        vol: volC,
                        intrinsic: intrinsic,
                        timeValue: timeValue,
                        remDay: remDay
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

        renderTables();
        setStatusText("اطلاعات با موفقیت دریافت شد (" + timeStr + ")");

    } catch (err) {
        console.error("Scan Error:", err);
        setStatusText("خطا در دریافت اطلاعات: لطفا مجددا تلاش کنید.");
    } finally {
        scanInProgress = false;
    }
}

// نمایش داده‌ها در جدول‌های منفک پوت و کال
function renderTables() {
    // رندر جدول پوت
    const putTbody = document.getElementById("putTableBody");
    if (putTbody) {
        putTbody.innerHTML = "";
        putRows.forEach((item, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><b>${item.symbol}</b></td>
                <td>${item.uaSymbol}</td>
                <td>${item.strike.toLocaleString('fa-IR')}</td>
                <td>${item.close.toLocaleString('fa-IR')}</td>
                <td>${item.vol.toLocaleString('fa-IR')}</td>
                <td>${item.intrinsic.toLocaleString('fa-IR')}</td>
                <td>${item.timeValue.toLocaleString('fa-IR')}</td>
                <td>-</td>
                <td>-</td>
                <td>${item.remDay} روز</td>
            `;
            putTbody.appendChild(tr);
        });
    }

    // رندر جدول کال
    const callTbody = document.getElementById("callTableBody");
    if (callTbody) {
        callTbody.innerHTML = "";
        callRows.forEach((item, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><b>${item.symbol}</b></td>
                <td>${item.uaSymbol}</td>
                <td>${item.strike.toLocaleString('fa-IR')}</td>
                <td>${item.close.toLocaleString('fa-IR')}</td>
                <td>${item.vol.toLocaleString('fa-IR')}</td>
                <td>${item.intrinsic.toLocaleString('fa-IR')}</td>
                <td>${item.timeValue.toLocaleString('fa-IR')}</td>
                <td>-</td>
                <td>-</td>
                <td>${item.remDay} روز</td>
            `;
            callTbody.appendChild(tr);
        });
    }
}

// اتصال رویدادها
document.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById("scanButton");
    if (scanBtn) {
        scanBtn.addEventListener("click", scan);
    }

    // اسکن خودکار هنگام لود صفحه
    scan();
});
