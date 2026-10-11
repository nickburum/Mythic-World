/** Renders store/PRIVACY.md to privacy/index.html (the URL App Store Connect asks for). Run after editing the policy. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const ROOT = resolve(import.meta.dirname, '..');
const md = readFileSync(resolve(ROOT, 'store/PRIVACY.md'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/_(.+?)_/g, '<em>$1</em>').replace(/(https?:\/\/[^\s)]+?)([.,]?)(?=\s|$)/g, '<a href="$1">$1</a>$2');
const body = md.trim().split(/\n\s*\n/).map((p) => p.startsWith('# ') ? `<h1>${inline(p.slice(2))}</h1>` : `<p>${inline(p.replace(/\n/g, ' '))}</p>`).join('\n');
mkdirSync(resolve(ROOT, 'privacy'), { recursive: true });
writeFileSync(resolve(ROOT, 'privacy/index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Game Box · Privacy Policy</title><meta name="theme-color" content="#0b1020">
<style>:root{color-scheme:dark}body{margin:0;background:#0b1020;color:#e8ecf5;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}main{max-width:680px;margin:0 auto;padding:48px 20px 64px}h1{font-size:28px;line-height:1.2;margin:0 0 8px}p{margin:0 0 18px;color:rgba(232,236,245,.86)}b{color:#fff}em{color:rgba(232,236,245,.6);font-style:normal}a{color:#7df0ff}</style>
</head><body><main>
${body}
</main></body></html>
`);
console.log('privacy/index.html');
