import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

(async () => {
  const PROFILE_DIR = path.join(os.tmpdir(), "gdt_test_profile");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    userDataDir: PROFILE_DIR,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    ],
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  await page.goto('https://hoadondientu.gdt.gov.vn/', { waitUntil: 'domcontentloaded' });
  
  // Chờ cho React mount
  await page.waitForSelector('input, .ant-col, form', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('img, svg, .captcha, [class*="captcha" i], [id*="captcha" i], form').forEach(el => {
      const rect = el.getBoundingClientRect();
      list.push({
        tag: el.tagName,
        id: el.id,
        className: el.className?.baseVal || el.className || '',
        src: (el.src || '').slice(0, 100),
        alt: el.alt || '',
        w: rect.width,
        h: rect.height,
        parentClass: el.parentElement?.className || '',
        outerHTML: el.outerHTML.slice(0, 300)
      });
    });
    return list;
  });

  console.log('ALL ELEMENTS ON REAL CHROME:');
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
