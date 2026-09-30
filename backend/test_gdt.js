import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  console.log("Navigating to https://hoadondientu.gdt.gov.vn/...");
  await page.goto("https://hoadondientu.gdt.gov.vn/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  console.log("Loaded!");

  // Check what requests happen on page
  const title = await page.title();
  console.log("Title:", title);

  // Check inputs
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("input")).map((i) => ({
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
      id: i.id,
      className: i.className,
    }));
  });
  console.log("Inputs:", JSON.stringify(inputs));

  // Check images
  const imgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img")).map((i) => ({
      src: i.src.slice(0, 100),
      alt: i.alt,
      className: i.className,
      w: i.width,
      h: i.height,
    }));
  });
  console.log("Images:", JSON.stringify(imgs));

  // Test captcha API
  const apiCaptcha = await page.evaluate(async () => {
    try {
      const r = await fetch("/query/auth/captcha", { credentials: "include" });
      const data = await r.json();
      return { ok: true, data: { key: data.key, contentLength: data.content?.length, prefix: data.content?.slice(0, 50) } };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  console.log("Captcha API:", JSON.stringify(apiCaptcha));

  await browser.close();
})();
