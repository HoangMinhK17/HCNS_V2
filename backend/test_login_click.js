import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://hoadondientu.gdt.gov.vn/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Click on the "Đăng nhập" item
  console.log('Clicking Đăng nhập...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.home-header-menu-item, span, div'));
    const loginItem = items.find(el => el.innerText && el.innerText.trim() === 'Đăng nhập');
    if (loginItem) loginItem.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // Inspect the opened modal
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('.ant-modal-content, .ant-modal, [role="dialog"]');
    if (!modal) return { modalFound: false };

    const inputs = Array.from(modal.querySelectorAll('input')).map(i => ({
      name: i.name,
      id: i.id,
      placeholder: i.placeholder,
      type: i.type,
      className: i.className
    }));

    const imgs = Array.from(modal.querySelectorAll('img, svg')).map(i => ({
      tag: i.tagName,
      src: (i.src || '').slice(0, 100),
      className: i.className
    }));

    const buttons = Array.from(modal.querySelectorAll('button, a')).map(b => ({
      text: b.innerText?.trim(),
      className: b.className,
      type: b.type
    }));

    return { modalFound: true, inputs, imgs, buttons };
  });

  console.log('MODAL INFO:', JSON.stringify(modalInfo, null, 2));

  await browser.close();
})();
