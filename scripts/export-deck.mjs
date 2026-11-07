import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { DeckDocument } = await server.ssrLoadModule('/src/pages/Deck.tsx');
  const data = JSON.parse(readFileSync('portfolio_codex_bundle/portfolio-data.json', 'utf8'));
  const css = readFileSync('src/deck.css', 'utf8');
  const script = readFileSync('scripts/deck-runtime.js', 'utf8');
  const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const html = `<!DOCTYPE html>
<html lang="ko" data-owner="${escape(data.profile.nameEn)}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#F4F1EA"><title>${escape(data.presentation.title)}</title><style>${css}</style></head><body>${renderToStaticMarkup(createElement(DeckDocument, { active: 0, basePath: '/' }))}<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
  const target = resolve(process.argv[2] ?? 'dist/portfolio.html');
  mkdirSync(resolve(target, '..'), { recursive: true });
  writeFileSync(target, html);
  console.log(`Exported standalone HTML: ${target} (${Math.round(Buffer.byteLength(html)/1024)} KiB)`);
} finally { await server.close(); }
