const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });

  async function test(label, url, doScroll) {
    const page = await browser.newPage();

    await page.addInitScript(() => {
      window.__lcpEntries = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__lcpEntries.push({
            startTime: entry.startTime,
            size: entry.size,
            url: entry.url,
            elementTag: entry.element?.tagName,
            elementClass: entry.element?.className,
            elementId: entry.element?.id,
            elementText: entry.element?.textContent?.slice(0, 80),
          });
        }
      }).observe({ type: 'largest-contentful-paint' });
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    if (doScroll) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
    }

    const entries = await page.evaluate(() => window.__lcpEntries);
    console.log('\n=== ' + label + ' ' + (doScroll ? '(with scroll)' : '(no scroll)') + ' ===');
    console.log('entries:', entries.length);
    entries.forEach((e, i) => {
      const info = `${Math.round(e.startTime)}ms size=${e.size} tag=${e.elementTag || 'n/a'} url=${e.url ? e.url.slice(0, 60) : 'text'} text=${e.elementText ? e.elementText.slice(0, 50) : ''}`;
      console.log('  ' + (i + 1) + '. ' + info);
    });
    await page.close();
  }

  await test('wheels', 'http://localhost:3000/wheels/zodiac-personality-challenge-wheel', false);
  await test('wheels', 'http://localhost:3000/wheels/zodiac-personality-challenge-wheel', true);

  await browser.close();
})();
