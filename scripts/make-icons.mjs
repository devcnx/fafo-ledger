import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const html = `<!doctype html><html><body style="margin:0">
<canvas id="c" width="512" height="512"></canvas>
<script>
const c = document.getElementById("c");
const ctx = c.getContext("2d");
ctx.fillStyle = "#b8331d";
ctx.beginPath();
ctx.roundRect(0,0,512,512,96);
ctx.fill();
ctx.fillStyle = "#ffffff";
ctx.font = "700 168px Georgia, serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("FO", 256, 270);
</script></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.setContent(html);
const buf = await page.locator("canvas").screenshot({ type: "png" });
writeFileSync("/workspace/public/icon-512.png", buf);
const page2 = await browser.newPage({ viewport: { width: 192, height: 192 } });
await page2.setContent(html.replace('width="512" height="512"', 'width="192" height="192"').replace("168px", "64px").replace("256, 270", "96, 100").replace("roundRect(0,0,512,512,96)", "roundRect(0,0,192,192,36)"));
const buf2 = await page2.locator("canvas").screenshot({ type: "png" });
writeFileSync("/workspace/public/icon-192.png", buf2);
await browser.close();
console.log("icons written");
