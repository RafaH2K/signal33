// Convierte docs/manual.html en docs/SIGNAL33-manual-boletos.pdf usando el Edge instalado.
//
//   node scripts/manual-pdf.mjs
import path from 'node:path';
import { chromium } from 'playwright-core';

const html = path.resolve('docs/manual.html');
const pdf = path.resolve('docs/SIGNAL33-manual-boletos.pdf');

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(`file://${html}`, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdf,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-family:system-ui,sans-serif;font-size:7pt;color:#8a8a8a;padding:0 16mm;display:flex;justify-content:space-between">' +
    '<span>SIGNAL33 · Sistema de boletos</span><span class="pageNumber"></span></div>',
  margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
});
await browser.close();
console.log(`PDF generado: ${pdf}`);
