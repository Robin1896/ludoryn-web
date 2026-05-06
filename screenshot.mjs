import { chromium } from '@playwright/test';

const BASE = 'https://robin1896-ludoryn-web.hf.space';
const OUT = '/tmp/screenshots';

const pages = [
  { name: '01-home', url: '/' },
  { name: '02-lobby-grub', url: '/lobby?game=grub' },
  { name: '03-grub-start', url: '/grub' },
  { name: '04-flikflak-start', url: '/beverbende' },
  { name: '05-bommen-start', url: '/bommen' },
  { name: '06-carcassonne-start', url: '/carcassonne' },
  { name: '07-qwixx-start', url: '/qwixx' },
  { name: '08-scores', url: '/scores' },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

for (const p of pages) {
  const page = await context.newPage();
  try {
    await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/${p.name}.png` });
    console.log(`✓ ${p.name}`);
  } catch(e) {
    console.log(`✗ ${p.name}: ${e.message}`);
  }
  await page.close();
}

await browser.close();
