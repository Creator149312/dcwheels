const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });

  async function run(url, label) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(4000);

    const metrics = await page.evaluate(() => {
      const paint = performance.getEntriesByType('paint');
      const lcpList = performance.getEntriesByType('largest-contentful-paint');
      const lcp = lcpList[lcpList.length - 1];
      const clsEntries = performance.getEntriesByType('layout-shift').filter(e => !e.hadRecentInput);
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        lcp: lcp ? lcp.startTime : null,
        fcp: (paint.find(p => p.name === 'first-contentful-paint') || {}).startTime,
        cls: clsEntries.reduce((a, e) => a + e.value, 0),
        ttfb: nav ? nav.responseStart : null,
      };
    });

    console.log('\n=== ' + label + ' ===');
    console.log('URL:', url);
    console.log('LCP:', metrics.lcp ? Math.round(metrics.lcp) + 'ms' : 'n/a');
    console.log('FCP:', metrics.fcp ? Math.round(metrics.fcp) + 'ms' : 'n/a');
    console.log('CLS:', metrics.cls.toFixed(4));
    console.log('TTFB:', metrics.ttfb ? Math.round(metrics.ttfb) + 'ms' : 'n/a');

    await context.close();
  }

  const slug = 'http://localhost:3000/wheels/jujutsu-kaisen-characters';
  await run(slug, 'COLD (fresh context)');
  await run(slug + '?nocache=1', 'WARM + cache-bust query');
  await run(slug, 'WARM (repeat)');

  await browser.close();
})();
