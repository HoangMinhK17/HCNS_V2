import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://hoadondientu.gdt.gov.vn/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('header *, nav *, .header *, .ant-layout-header *, button, a')).map(el => ({
      tag: el.tagName,
      text: el.innerText?.trim() || '',
      className: el.className || '',
      id: el.id || '',
      href: el.href || '',
      role: el.getAttribute('role') || ''
    })).filter(e => e.text.length > 0 && e.text.length < 50);
  });

  console.log('CLICKABLE HEADER ELEMENTS:', JSON.stringify(elements, null, 2));

  await browser.close();
})();
