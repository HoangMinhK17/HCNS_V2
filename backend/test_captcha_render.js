import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto("https://hoadondientu.gdt.gov.vn/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Chờ các request mạng hoàn tất
  await new Promise(r => setTimeout(r, 2000));

  // Kiểm tra Redux state hoặc component state
  const stateCheck = await page.evaluate(() => {
    // Check all img tags
    const imgs = Array.from(document.querySelectorAll("img, svg")).map(el => {
      return {
        tag: el.tagName,
        src: el.src || "",
        outerHTML: el.outerHTML.slice(0, 200),
        id: el.id,
        className: el.className
      };
    });
    return imgs;
  });
  console.log("Images and SVGs on page:", JSON.stringify(stateCheck, null, 2));

  // Check captcha API directly in browser
  const apiTest = await page.evaluate(async () => {
    try {
      const r = await fetch("/query/auth/captcha", { credentials: "include" });
      const data = await r.json();
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  console.log("API Test in page:", JSON.stringify(apiTest, null, 2));

  await browser.close();
})();
