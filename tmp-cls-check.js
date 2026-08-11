const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.addInitScript(() => {
    window._clsShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window._clsShifts.push({
            value: entry.value,
            sources: (entry.sources || []).map((s) => ({
              node: s.node?.nodeName,
              className: s.node?.className,
              id: s.node?.id,
              rect: s.previousRect,
            })),
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto('http://localhost:3000/wheels/jujutsu-kaisen-characters', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  const report = await page.evaluate(() => {
    const total = window._clsShifts.reduce((sum, s) => sum + s.value, 0);
    return { total, shifts: window._clsShifts };
  });

  console.log('\n=== CLS Report (after fix) ===');
  console.log('Total CLS:', report.total);
  console.log('Shift count:', report.shifts.length);
  report.shifts.forEach((s, i) => {
    console.log(`\nShift ${i + 1}: ${s.value.toFixed(5)}`);
    s.sources.forEach((src) => {
      console.log('  -', src.node, src.className?.slice(0, 80), src.id, JSON.stringify(src.rect));
    });
  });

  await browser.close();
})();
