// dashboard.js - نسخه اصلاح شده با پراکسی جدید و ضد خطا

let putRows = [];
let callRows = [];

async function scan() {
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.innerText = "در حال تلاش برای اتصال مستقیم و کمکی...";

    // لیست پراکسی‌ها برای اطمینان (اگر یکی کار نکرد، دیگری امتحان شود)
    const targets = [
        "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionMarketWatch/1"),
        "https://corsproxy.io/?" + encodeURIComponent("https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionMarketWatch/1")
    ];

    for (let url of targets) {
        try {
            console.log("Fetching from:", url);
            const response = await fetch(url);
            if (!response.ok) continue;

            const data = await response.json();
            const records = data.instrumentOptMarketWatch || [];
            
            if (records.length > 0) {
                processAndRender(records);
                if (statusEl) statusEl.innerText = "بروزرسانی موفق در " + new Date().toLocaleTimeString('fa-IR');
                return; // خروج موفق
            }
        } catch (e) {
            console.error("Link failed:", url, e);
        }
    }
    
    if (statusEl) statusEl.innerText = "خطا در اتصال. لطفا فیلترشکن را تغییر دهید یا دقایقی دیگر تلاش کنید.";
}

function processAndRender(records) {
    putRows = [];
    callRows = [];

    records.forEach(r => {
        const underlying = Number(r.pDrCotVal_UA) || 0;
        const strike = Number(r.strikePrice) || 0;
        
        // تفکیک ساده پوت و کال
        const obj = {
            symbol: r.lVal18AFC_P || r.lVal18AFC_C,
            ua: r.lVal18AFC_UA || "-",
            strike: strike,
            price: r.pClosing_P || r.pClosing_C || 0,
            uaPrice: underlying,
            vol: r.tVol_P || r.tVol_C || 0,
            days: r.remDay || 0
        };

        if (r.lVal18AFC_P) putRows.push(obj);
        else if (r.lVal18AFC_C) callRows.push(obj);
    });

    // پر کردن جدول‌ها
    fillTable("putTableBody", putRows);
    fillTable("callTableBody", callRows);
}

function fillTable(id, list) {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    tbody.innerHTML = "";
    list.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${item.symbol}</td>
            <td>${item.ua}</td>
            <td>${item.strike.toLocaleString()}</td>
            <td>${item.price.toLocaleString()}</td>
            <td>${item.vol.toLocaleString()}</td>
            <td>-</td><td>-</td><td>-</td><td>-</td>
            <td>${item.days}</td>
        `;
        tbody.appendChild(tr);
    });
}

// اجرای ایمن
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        scan();
        const btn = document.getElementById("scanButton");
        if (btn) btn.onclick = scan;
    });
} else {
    scan();
    const btn = document.getElementById("scanButton");
    if (btn) btn.onclick = scan;
}
