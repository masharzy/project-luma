import 'server-only';
import { openSync, type Font } from 'fontkit';
import { join } from 'node:path';

const fonts = new Map<string, Font>();
function fontFor(text: string) {
  const file = /[\u0980-\u09ff]/.test(text) ? 'font-0.woff2' : 'font-2.woff2';
  let font = fonts.get(file);
  if (!font) {
    font = openSync(join(process.cwd(), 'public/fonts', file)) as Font;
    fonts.set(file, font);
  }
  return font;
}

// Outline the bundled font before rasterizing: no OS fonts or fontconfig required.
export function chartText(text: string, x: number, y: number, size: number, width: number, anchor: 'start'|'middle' = 'start') {
  text = text.replace(/\s+/g, ' ').trim();
  const font = fontFor(text), run = font.layout(text);
  if (run.glyphs.some(g => g.id === 0)) throw Error('Unsupported character in chart text');
  const scale = Math.min(size / font.unitsPerEm, width / Math.max(1, run.advanceWidth));
  const start = anchor === 'middle' ? x - run.advanceWidth * scale / 2 : x;
  let penX = 0, penY = 0;
  const paths = run.glyphs.map((glyph, i) => {
    const position = run.positions[i];
    const d = glyph.path.toSVG();
    const path = d ? `<path transform="translate(${penX + position.xOffset} ${penY + position.yOffset})" d="${d}"/>` : '';
    penX += position.xAdvance; penY += position.yAdvance;
    return path;
  }).join('');
  return `<g transform="translate(${start} ${y}) scale(${scale} ${-scale})">${paths}</g>`;
}

export function chartTextLines(text: string, width: number, size: number) {
  const font = fontFor(text), lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? line + ' ' + word : word;
    if (line && font.layout(candidate).advanceWidth * size / font.unitsPerEm > width) {
      lines.push(line); line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}
