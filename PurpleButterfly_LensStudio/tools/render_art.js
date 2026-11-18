// 用法：node tools/render_art.js <svg資料夾> <輸出圖片資料夾>
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const [src, dst] = process.argv.slice(2);
  fs.mkdirSync(dst, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(src, "manifest.json"), "utf8"));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const m of manifest) {
    const svg = fs.readFileSync(path.join(src, m.name + ".svg"), "utf8");
    await page.setViewportSize({ width: m.w, height: m.h });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    const file = path.join(dst, m.name + (m.fmt === "jpg" ? ".jpg" : ".png"));
    if (m.fmt === "jpg") await page.screenshot({ path: file, type: "jpeg", quality: 88 });
    else await page.screenshot({ path: file, type: "png", omitBackground: true });
    console.log(file, fs.statSync(file).size);
  }
  await browser.close();
})();
