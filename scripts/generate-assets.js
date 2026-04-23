#!/usr/bin/env node
// Generates app icon + App Store screenshots using Playwright

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT, 'fastlane/screenshots');
const ICON_OUT = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');

// All locale folders that need screenshots
const LOCALES = fs.readdirSync(SCREENSHOTS_DIR).filter(f =>
  fs.statSync(path.join(SCREENSHOTS_DIR, f)).isDirectory()
);

const BG = '#f4efe6';
const TEXT = '#1a1d2e';
const ACCENT = '#c14a1f';
const CARD = '#fffdf9';
const MUTED = '#8a8478';

// ── Branding HTML ──────────────────────────────────────────────
function brandingHTML(width, height) {
  const isIpad = width > 800;
  const titleSize = isIpad ? 112 : 76;
  const tagSize = isIpad ? 14 : 12;
  const dotSize = isIpad ? 10 : 7;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100vw; height:100vh; overflow:hidden; background:${BG}; }
.wrap {
  position:absolute;
  top:50%; left:50%;
  transform:translate(-50%,-50%);
  display:flex; flex-direction:column; align-items:flex-start; gap:16px;
}
h1 { font-family:'Instrument Serif',Georgia,serif; font-style:italic; font-weight:400; font-size:${titleSize}px; color:${TEXT}; letter-spacing:-0.01em; line-height:1; white-space:nowrap; }
h1 span { color:${ACCENT}; }
p { font-family:'DM Sans',Arial,sans-serif; font-size:${tagSize}px; font-weight:400; letter-spacing:0.22em; text-transform:uppercase; color:${MUTED}; white-space:nowrap; }
.dots { display:flex; gap:7px; align-items:center; }
.dot  { width:${dotSize}px; height:${dotSize}px; border-radius:50%; background:${ACCENT}; }
.dot2 { width:${dotSize}px; height:${dotSize}px; border-radius:50%; background:${TEXT}; opacity:0.2; }
</style></head>
<body>
  <div class="wrap">
    <h1>Ludoryn<span>.</span></h1>
    <p>Play · Steal · Win</p>
    <div class="dots"><div class="dot"></div><div class="dot2"></div></div>
  </div>
</body></html>`;
}

// ── App page HTML wrapper (wraps an iframe pointing at localhost) ──
function appPageHTML(width, height, url) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; }
html, body { width:${width}px; height:${height}px; overflow:hidden; background:${BG}; }
iframe { width:100%; height:100%; border:none; display:block; }
</style></head>
<body>
<iframe src="${url}"></iframe>
</body></html>`;
}

async function main() {
  const browser = await chromium.launch({ args: ['--disable-web-security'] });

  // ── 1. App Icon 1024×1024 (shared generator) ─────────────────
  console.log('Generating app icon...');
  {
    const { generateIcon } = require('/Users/robinzegers/scripts/gen-app-icon.js');
    await generateIcon('L', ICON_OUT);
    console.log('  Icon saved:', ICON_OUT);
  }

  // ── 2. Screenshots ────────────────────────────────────────────
  const sizes = [
    { key: 'iPhone65', width: 428, height: 926, dpr: 3, label: 'iPhone 6.5"' },
    { key: 'iPadPro129', width: 1024, height: 1366, dpr: 2, label: 'iPad Pro 12.9"' },
  ];

  for (const { key, width, height, dpr, label } of sizes) {
    const pw = width * dpr;
    const ph = height * dpr;
    console.log(`\nGenerating ${label} screenshots (logical ${width}×${height} @${dpr}x = ${pw}×${ph})...`);

    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: dpr,
      isMobile: width < 600,
      hasTouch: width < 600,
    });
    const page = await ctx.newPage();

    // Screenshot 1: Branding
    console.log('  01 branding...');
    await page.setContent(brandingHTML(width, height), { waitUntil: 'networkidle' });
    let buf = await page.screenshot({ type: 'png' });
    saveScreenshot(buf, key, '01');

    // Screenshot 2: Home page
    console.log('  02 home...');
    try {
      await page.goto('http://localhost:8080/', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      buf = await page.screenshot({ type: 'png', fullPage: false });
      saveScreenshot(buf, key, '02');
    } catch (e) {
      console.warn('  Could not reach localhost:8080, skipping UI screenshots');
    }

    // Screenshot 3: Lobby
    console.log('  03 lobby...');
    try {
      await page.goto('http://localhost:8080/lobby', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      buf = await page.screenshot({ type: 'png', fullPage: false });
      saveScreenshot(buf, key, '03');
    } catch (e) { /* skip */ }

    // Screenshot 4: Shop
    console.log('  04 shop...');
    try {
      await page.goto('http://localhost:8080/shop', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      buf = await page.screenshot({ type: 'png', fullPage: false });
      saveScreenshot(buf, key, '04');
    } catch (e) { /* skip */ }

    await ctx.close();
  }

  await browser.close();
  console.log('\nDone. Now copy en-US screenshots to all locales...');

  // Copy en-US screenshots to all other locales
  const enDir = path.join(SCREENSHOTS_DIR, 'en-US');
  const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.png'));

  for (const locale of LOCALES) {
    if (locale === 'en-US') continue;
    const localeDir = path.join(SCREENSHOTS_DIR, locale);
    for (const file of enFiles) {
      fs.copyFileSync(path.join(enDir, file), path.join(localeDir, file));
    }
  }
  console.log(`Copied screenshots to ${LOCALES.length - 1} other locales.`);
}

function saveScreenshot(buf, key, num) {
  const outDir = path.join(SCREENSHOTS_DIR, 'en-US');
  const outPath = path.join(outDir, `${key}-${num}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`  Saved ${key}-${num}.png`);
}

main().catch(e => { console.error(e); process.exit(1); });
