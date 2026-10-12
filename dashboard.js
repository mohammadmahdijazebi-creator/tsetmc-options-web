// dashboard.js - نسخه عیب‌یاب (Debug Version)

async function scan() {
    console.log("--- اسکن شروع شد ---");
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.innerText = "در حال دریافت...";

    try {
        const targetUrl = "https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionMarketWatch/1";
        const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl);
        
        console.log("در حال فراخوانی:", proxyUrl);
        
        const response = await fetch(proxyUrl);
        console.log("وضعیت پاسخ سرور:", response.status);

        if (!response.ok) {
            throw new Error("خطای HTTP: " + response.status);
        }

        const data = await response.json();
        console.log("داده‌های دریافتی:", data); // اینجا کل داده‌ها را در کنسول می‌بینید

        if (!data.instrumentOptMarketWatch) {
            console.error("ساختار داده تغییر کرده! فیلد instrumentOptMarketWatch پیدا نشد.");
            return;
        }

        const records = data.instrumentOptMarketWatch;
        console.log("تعداد کل رکوردها:", records.length);

        // نمایش تست در کنسول
        const firstRow = records[0];
        console.log("نمونه رکورد اول:", firstRow);

        // ادامه کد رندر جدول...
        alert("داده دریافت شد! تعداد: " + records.length + ". (جزئیات در کنسول F12)");

    } catch (err) {
        console.error("خطای بحرانی در اسکن:", err);
        if(statusEl) statusEl.innerText = "خطا رخ داد (F12 را ببینید)";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById("scanButton");
    if (scanBtn) {
        scanBtn.addEventListener("click", scan);
        console.log("دکمه اسکن متصل شد.");
    } else {
        console.error("دکمه scanButton در صفحه پیدا نشد!");
    }
    
    // اجرای اولیه
    scan();
});
