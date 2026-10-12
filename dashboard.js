// dashboard.js - نسخه آنلاین وب با پشتیبانی از CORS Proxy

let putRows = [];
let callRows = [];

let currentMode = "put";
let showAll = false;
let scanTimer = null;
let scanInProgress = false;

// =====================================================
// تابع کمکی برای آپدیت ایمن متون در صفحه
// =====================================================
function setStatusText(message) {
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.innerText = message;
    }
}

// =====================================================
// اسکن اطلاعات
// =====================================================

async function scan() {

    if (scanInProgress) return;
    scanInProgress = true;

    setStatusText("در حال دریافت و پردازش اطلاعات TSETMC...");

    try {

        // استفاده از پراکسی جهت دور زدن محدودیت CORS مرورگر در وب‌سایت آنلاین
        const targetUrl = "https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionMarketWatch/1";
        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);

        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error("خطا در دریافت اطلاعات: کد " + response.status);
        }

        const data = await response.json();

        const records = data.instrumentOptMarketWatch || [];

        const minVolumeInput = document.getElementById("minVolume");
        const minVolume = minVolumeInput ? (Number(minVolumeInput.value) || 5000) : 5000;

        const puts = [];
        const calls = [];

        for (const r of records) {

            const underlying = Number(r.pDrCotVal_UA) || 0;
            const strike = Number(r.strikePrice) || 0;

            // ================================
            // PUT - اختیار فروش
            // ================================

            if (r.lVal18AFC_P) {

                const closeP = Number(r.pClosing_P) || 0;
                const volP = Number(r.tVol_P) || 0;
                const openIntP = Number(r.notSettleModVar_P) || 0;

                if (closeP > 0 && strike > 0) {

                    const intrinsic = Math.max(0, strike - underlying);
                    const timeValue = Math.max(0, closeP - intrinsic);

                    const leverage = underlying > 0 ? (underlying / closeP) : 0;

                    const moneyStatus =
                        underlying < strike ? "در سود (ITM)" :
                        underlying === strike ? "بی‌تفاوت (ATM)" :
                        "در زیان (OTM)";

                    const valueM = Math.round((closeP * volP) / 1000000);

                    puts.push({

                        symbol: r.lVal18AFC_P,
                        underlyingSymbol: r.lVal18AFC_UA || "-",

                        strike: strike,
                        days: r.remDay || 0,

                        close: closeP,
                        underlying: underlying,

                        vol: volP,
                        valueM: valueM,

                        openInt: openIntP,

                        intrinsic: intrinsic,
                        timeValue: timeValue,

                        leverage: leverage.toFixed(1),

                        moneyStatus: moneyStatus

                    });

                }

            }

            // ================================
            // CALL - اختیار خرید
            // ================================

            if (r.lVal18AFC_C) {

                const closeC = Number(r.pClosing_C) || 0;
                const volC = Number(r.tVol_C) || 0;
                const openIntC = Number(r.notSettleModVar_C) || 0;

                if (closeC > 0 && strike > 0) {

                    const intrinsic = Math.max(0, underlying - strike);
                    const timeValue = Math.max(0, closeC - intrinsic);

                    const leverage = underlying > 0 ? (underlying / closeC) : 0;

                    const moneyStatus =
                        underlying > strike ? "در سود (ITM)" :
                        underlying === strike ? "بی‌تفاوت (ATM)" :
                        "در زیان (OTM)";

                    const valueM = Math.round((closeC * volC) / 1000000);

                    calls.push({

                        symbol: r.lVal18AFC_C,
                        underlyingSymbol: r.lVal18AFC_UA || "-",

                        strike: strike,
                        days: r.remDay || 0,

                        close: closeC,
                        underlying: underlying,

                        vol: volC,
                        valueM: valueM,

                        openInt: openIntC,

                        intrinsic: intrinsic,
                        timeValue: timeValue,

                        leverage: leverage.toFixed(1),

                        moneyStatus: moneyStatus

                    });

                }

            }

        }

        putRows = puts;
        callRows = calls;

        renderTable();
        updateSummary();

        const now = new Date();
        const timeStr = now.toLocaleTimeString('fa-IR');

        setStatusText("آخرین بروزرسانی: " + timeStr);

    } catch (err) {

        console.error(err);
        setStatusText("خطا در دریافت اطلاعات از TSETMC");

    } finally {

        scanInProgress = false;

    }

}


// =====================================================
// رندر جدول
// =====================================================

function renderTable() {

    const tbody = document.getElementById("rows");
    if (!tbody) return;

    tbody.innerHTML = "";

    const list = currentMode === "put" ? putRows : callRows;

    const symbolFilterInput = document.getElementById("symbolFilter");
    const underlyingFilterSelect = document.getElementById("underlyingFilter");

    const symbolFilter = symbolFilterInput ? symbolFilterInput.value.trim() : "";
    const underlyingFilter = underlyingFilterSelect ? underlyingFilterSelect.value : "ALL";

    const filtered = list.filter(r => {

        if (symbolFilter && !r.symbol.includes(symbolFilter)) {
            return false;
        }

        if (underlyingFilter !== "ALL" && r.underlyingSymbol !== underlyingFilter) {
            return false;
        }

        return true;

    });

    for (const r of filtered) {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${currentMode === "put" ? "اختیار فروش" : "اختیار خرید"}</td>
            <td><b>${r.symbol}</b></td>
            <td>${r.underlyingSymbol}</td>
            <td>${r.strike.toLocaleString('fa-IR')}</td>
            <td>${r.days} روز</td>
            <td>${r.close.toLocaleString('fa-IR')}</td>
            <td>${r.underlying.toLocaleString('fa-IR')}</td>
            <td>${r.vol.toLocaleString('fa-IR')}</td>
            <td>${r.valueM.toLocaleString('fa-IR')}</td>
            <td>${r.openInt.toLocaleString('fa-IR')}</td>
            <td><span class="badge ${getBadgeClass(r.moneyStatus)}">${r.moneyStatus}</span></td>
            <td>${r.leverage}x</td>
        `;

        tbody.appendChild(tr);

    }

}

function getBadgeClass(status) {
    if (status.includes("ITM")) return "bg-success";
    if (status.includes("ATM")) return "bg-warning text-dark";
    return "bg-danger";
}


// =====================================================
// خلاصه آماری
// =====================================================

function updateSummary() {

    let totalCallValue = 0;
    let totalPutValue = 0;

    for (const r of callRows) totalCallValue += r.valueM;
    for (const r of putRows) totalPutValue += r.valueM;

    const callValEl = document.getElementById("totalCallValue");
    const putValEl = document.getElementById("totalPutValue");
    const activeCountEl = document.getElementById("activeCount");

    if (callValEl) callValEl.innerText = totalCallValue.toLocaleString('fa-IR') + " میلیون";
    if (putValEl) putValEl.innerText = totalPutValue.toLocaleString('fa-IR') + " میلیون";
    if (activeCountEl) activeCountEl.innerText = (callRows.length + putRows.length).toLocaleString('fa-IR');

}


// =====================================================
// رویدادها و راه اندازی اولیه
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    const scanBtn = document.getElementById("scanBtn");
    if (scanBtn) {
        scanBtn.addEventListener("click", scan);
    }

    const typeFilter = document.getElementById("typeFilter");
    if (typeFilter) {
        typeFilter.addEventListener("change", (e) => {
            currentMode = e.target.value;
            renderTable();
        });
    }

    const symbolFilter = document.getElementById("symbolFilter");
    if (symbolFilter) {
        symbolFilter.addEventListener("input", renderTable);
    }

    const underlyingFilter = document.getElementById("underlyingFilter");
    if (underlyingFilter) {
        underlyingFilter.addEventListener("change", renderTable);
    }

    // اسکن اولیه خودکار
    scan();

});
