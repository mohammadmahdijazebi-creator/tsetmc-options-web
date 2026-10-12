let putData = [];
let callData = [];

// تابع هوشمند واکشی دیتا با پروکسی Vercel و پشتیبان مستقیم
async function fetchTsetmcData(endpointPath) {
    const proxyUrl = `/api/tsetmc/${endpointPath}`;
    const directUrl = `https://cdn.tsetmc.com/api/${endpointPath}`;

    try {
        const res = await fetch(proxyUrl);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.warn('Proxy fetch failed, trying direct...', e);
    }

    // در صورتی که کاربر داخل شبکه بدون محدودیت باشد
    const directRes = await fetch(directUrl);
    if (!directRes.ok) {
        throw new Error(`خطا در دریافت اطلاعات: ${directRes.status}`);
    }
    return await directRes.json();
}

async function scan() {

    const status = document.getElementById("status");
    const scanButton = document.getElementById("scanButton");

    status.innerText = "در حال دریافت اطلاعات از TSETMC...";
    scanButton.disabled = true;

    try {

        const data = await fetchTsetmcData("Instrument/GetInstrumentOptionMarketWatch/1");

        const list = data.instrumentOptMarketWatch;

        putData = [];
        callData = [];

        const minVolumeInput =
            document.getElementById("minVolume");

        const minVolume =
            minVolumeInput && !isNaN(minVolumeInput.value)
                ? Number(minVolumeInput.value)
                : 5000;

        list.forEach(item => {

            const underlyingPrice =
                item.pClosing_U;

            const strike =
                item.strikePrice;

            const days =
                item.remainedDay;

            const expDate =
                item.contractEndDate;

            // ================= PUT =================

            if (item.lVal18AFC_P) {

                const vol =
                    item.qTotTran5J_P;

                const last =
                    item.pDrCotVal_P;

                if (vol > minVolume && last > 0) {

                    const intrinsic =
                        Math.max(
                            0,
                            strike - underlyingPrice
                        );

                    const effectiveSell =
                        strike - last;

                    const diff =
                        effectiveSell - underlyingPrice;

                    const percent =
                        underlyingPrice > 0
                            ? (diff / underlyingPrice) * 100
                            : 0;

                    putData.push({

                        symbol:
                            item.lVal18AFC_P,

                        underlying:
                            item.lVal18AFC_U,

                        strike:
                            strike,

                        last:
                            last,

                        volume:
                            vol,

                        intrinsic:
                            intrinsic,

                        effectiveSell:
                            effectiveSell,

                        percent:
                            percent,

                        days:
                            days,

                        expDate:
                            expDate

                    });

                }

            }

            // ================= CALL =================

            if (item.lVal18AFC_C) {

                const vol =
                    item.qTotTran5J_C;

                const last =
                    item.pDrCotVal_C;

                if (vol > minVolume && last > 0) {

                    const intrinsic =
                        Math.max(
                            0,
                            underlyingPrice - strike
                        );

                    const effectiveBuy =
                        strike + last;

                    const diff =
                        effectiveBuy - underlyingPrice;

                    const percent =
                        underlyingPrice > 0
                            ? (diff / underlyingPrice) * 100
                            : 0;

                    callData.push({

                        symbol:
                            item.lVal18AFC_C,

                        underlying:
                            item.lVal18AFC_U,

                        strike:
                            strike,

                        last:
                            last,

                        volume:
                            vol,

                        intrinsic:
                            intrinsic,

                        effectiveBuy:
                            effectiveBuy,

                        percent:
                            percent,

                        days:
                            days,

                        expDate:
                            expDate

                    });

                }

            }

        });

        sortPut();
        sortCall();

        renderPut();
        renderCall();

        document.getElementById("putCount").innerText =
            putData.length;

        document.getElementById("callCount").innerText =
            callData.length;

        document.getElementById("totalCount").innerText =
            putData.length + callData.length;

        document.getElementById("lastUpdate").innerText =
            new Date().toLocaleTimeString("fa-IR");

        status.innerText =
            "اسکن با موفقیت انجام شد ✅";

        // ارسال رخداد برای ماژول استراتژی و سود/زیان
        document.dispatchEvent(new CustomEvent('optionScanUpdated', {
            detail: {
                rawList: list,
                putData: putData,
                callData: callData
            }
        }));

    }

    catch (error) {

        status.innerText =
            "خطا در دریافت اطلاعات: " + error.message;

        console.error(error);

    }

    finally {

        scanButton.disabled = false;

    }

}

function sortPut() {

    putData.sort((a, b) =>
        b.percent - a.percent
    );

}

function sortCall() {

    callData.sort((a, b) =>
        a.percent - b.percent
    );

}

function formatNumber(num) {

    if (!num && num !== 0) return "-";

    return Math.round(num)
        .toLocaleString("fa-IR");

}

function formatPercent(num) {

    if (!num && num !== 0) return "-";

    const fixed =
        num.toFixed(2);

    return Number(fixed)
        .toLocaleString("fa-IR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + " %";

}

function renderPut() {

    const tbody =
        document.getElementById("putTableBody");

    tbody.innerHTML = "";

    putData.forEach((row, index) => {

        const tr =
            document.createElement("tr");

        const cls =
            row.percent > 0
                ? "positive"
                : row.percent < 0
                    ? "negative"
                    : "zero";

        tr.innerHTML = `

            <td>${(index + 1).toLocaleString("fa-IR")}</td>

            <td><strong>${row.symbol}</strong></td>

            <td>${row.underlying}</td>

            <td>${formatNumber(row.strike)}</td>

            <td>${formatNumber(row.last)}</td>

            <td>${formatNumber(row.volume)}</td>

            <td>${formatNumber(row.intrinsic)}</td>

            <td>${formatNumber(row.effectiveSell)}</td>

            <td class="${cls}">${formatPercent(row.percent)}</td>

            <td>${row.expDate}</td>

            <td>${Number(row.days).toLocaleString("fa-IR")}</td>

        `;

        tbody.appendChild(tr);

    });

}

function renderCall() {

    const tbody =
        document.getElementById("callTableBody");

    tbody.innerHTML = "";

    callData.forEach((row, index) => {

        const tr =
            document.createElement("tr");

        const cls =
            row.percent < 0
                ? "positive"
                : row.percent > 0
                    ? "negative"
                    : "zero";

        tr.innerHTML = `

            <td>${(index + 1).toLocaleString("fa-IR")}</td>

            <td><strong>${row.symbol}</strong></td>

            <td>${row.underlying}</td>

            <td>${formatNumber(row.strike)}</td>

            <td>${formatNumber(row.last)}</td>

            <td>${formatNumber(row.volume)}</td>

            <td>${formatNumber(row.intrinsic)}</td>

            <td>${formatNumber(row.effectiveBuy)}</td>

            <td class="${cls}">${formatPercent(row.percent)}</td>

            <td>${row.expDate}</td>

            <td>${Number(row.days).toLocaleString("fa-IR")}</td>

        `;

        tbody.appendChild(tr);

    });

}

function showPutOnly() {

    document.getElementById("putSection")
        .classList.remove("hidden");

    document.getElementById("callSection")
        .classList.add("hidden");

    document.getElementById("strategySection")
        .classList.add("hidden");

    document.getElementById("payoffSection")
        .classList.add("hidden");

    document.getElementById("underlyingSection")
        .classList.add("hidden");

    document.getElementById("marketSummarySection")
        .classList.add("hidden");

    setActiveButton("showPutButton");

}

function showCallOnly() {

    document.getElementById("putSection")
        .classList.add("hidden");

    document.getElementById("callSection")
        .classList.remove("hidden");

    document.getElementById("strategySection")
        .classList.add("hidden");

    document.getElementById("payoffSection")
        .classList.add("hidden");

    document.getElementById("underlyingSection")
        .classList.add("hidden");

    document.getElementById("marketSummarySection")
        .classList.add("hidden");

    setActiveButton("showCallButton");

}

function showAll() {

    document.getElementById("putSection")
        .classList.remove("hidden");

    document.getElementById("callSection")
        .classList.remove("hidden");

    document.getElementById("strategySection")
        .classList.add("hidden");

    document.getElementById("payoffSection")
        .classList.add("hidden");

    document.getElementById("underlyingSection")
        .classList.add("hidden");

    document.getElementById("marketSummarySection")
        .classList.add("hidden");

    setActiveButton("showAllButton");

}

function setActiveButton(buttonId) {

    const buttons = [
        "showPutButton",
        "showCallButton",
        "showAllButton",
        "strategyButton",
        "payoffButton",
        "underlyingButton",
        "marketSummaryButton"
    ];

    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove("active");
        }
    });

    const activeBtn = document.getElementById(buttonId);
    if (activeBtn) {
        activeBtn.classList.add("active");
    }

}

document.addEventListener("DOMContentLoaded", () => {

    const scanBtn = document.getElementById("scanButton");
    if (scanBtn) scanBtn.addEventListener("click", scan);

    const minVol = document.getElementById("minVolume");
    if (minVol) {
        minVol.addEventListener("change", () => {
            if (putData.length || callData.length) {
                scan();
            }
        });
    }

    const putBtn = document.getElementById("showPutButton");
    if (putBtn) putBtn.addEventListener("click", showPutOnly);

    const callBtn = document.getElementById("showCallButton");
    if (callBtn) callBtn.addEventListener("click", showCallOnly);

    const allBtn = document.getElementById("showAllButton");
    if (allBtn) allBtn.addEventListener("click", showAll);

    // اسکن خودکار در آغاز کار
    scan();

    // اسکن خودکار هر ۳ دقیقه
    setInterval(scan, 180000);

});
