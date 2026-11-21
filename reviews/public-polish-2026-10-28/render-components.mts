import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { data } from '../../src/shared/game.ts';
import { arenaPreviewMarkup, arenaPreviewModel } from '../../src/client/arena-preview.ts';
import { drawMoldCue } from '../../src/client/mold-cues.ts';
import type { MoldReaction } from '../../src/shared/mold-mixing.ts';
const sharp = createRequire('C:/Users/yigal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const output = resolve('output/public-polish-2026-10-28');
const grounds = Object.fromEntries([...data.arenas.map(a => a.id), 'gatehouse-half', 'gatehouse-open'].map(id => [id,
  'data:image/png;base64,' + readFileSync(id === 'gatehouse' ? 'assets/proofs/arena-v1.png' :
    'assets/production/arenas/' + id + (id.startsWith('gatehouse') ? '-v1.png' : '-ground-v1.png')).toString('base64')]));
const css = readFileSync('src/client/ui/expedition.css', 'utf8');
for (const difficulty of ['normal', 'hellish']) {
  const cells = [];
  for (const a of data.arenas) {
    const markup = arenaPreviewMarkup(a.id, difficulty, grounds, { name: a.name, difficulty,
      overview: 'Arena overview', start: 'Your starting point', boss: 'Boss starting point', cover: 'Cover', lava: 'Lava' });
    const svg = markup.match(/<svg[\s\S]*?<\/svg>/)![0]
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="620" height="340" ')
      .replace(/(<svg[^>]*>)/, '$1<style>' + css + '</style>');
    const raster = await sharp(Buffer.from(svg)).png().toBuffer();
    const title = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="620" height="45"><text x="14" y="30" fill="#eee0b6" font-family="sans-serif" font-size="19">${a.name} · ${difficulty}</text></svg>`)).png().toBuffer();
    const index = data.arenas.indexOf(a);
    cells.push({ input: title, left: index % 2 * 640 + 10, top: Math.floor(index / 2) * 400 + 40 });
    cells.push({ input: raster, left: index % 2 * 640 + 10, top: Math.floor(index / 2) * 400 + 85 });
  }
  await sharp({ create: { width: 1280, height: 1240, channels: 4, background: '#142b25' } }).composite(cells).png().toFile(output + '/maps-' + difficulty + '.png');
}
const makeCue = (fired: boolean): MoldReaction => ({ kind: 'mold-reaction', id: 1, x: 150, y: 160, radius: 90,
  type: 'catalytic', beganAt: 10, at: 40, until: 48, fired, sources: [] });
const panels: string[] = [];
for (const [index, [now, reduced, title]] of ([[25, false, 'Warning'], [44, false, 'Eruption'], [44, true, 'Reduced motion']] as const).entries()) {
  const shapes: string[] = []; let fill = '#fff', stroke = '#fff', opacity = 1, width = 1, path = '';
  const color = (n: number) => '#' + n.toString(16).padStart(6, '0');
  const g: any = {
    lineStyle(w: number, c: number, a: number) { width = w; stroke = color(c); opacity = a; return g; },
    fillStyle(c: number, a: number) { fill = color(c); opacity = a; return g; },
    strokeCircle(x: number, y: number, r: number) { shapes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`); return g; },
    fillCircle(x: number, y: number, r: number) { shapes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${opacity}"/>`); return g; },
    lineBetween(x: number, y: number, xx: number, yy: number) { shapes.push(`<path d="M${x} ${y}L${xx} ${yy}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`); return g; },
    strokeTriangle(x: number, y: number, xx: number, yy: number, xxx: number, yyy: number) { shapes.push(`<path d="M${x} ${y}L${xx} ${yy}L${xxx} ${yyy}Z" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`); return g; },
    beginPath() { path = ''; return g; },
    moveTo(x: number, y: number) { path += `M${x} ${y}`; return g; },
    lineTo(x: number, y: number) { path += `L${x} ${y}`; return g; },
    closePath() { path += 'Z'; return g; },
    fillPath() { shapes.push(`<path d="${path}" fill="${fill}" opacity="${opacity}"/>`); return g; },
    strokePath() { shapes.push(`<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`); return g; },
  };
  drawMoldCue(g, g, makeCue(now >= 40), now, [], reduced);
  panels.push(`<g transform="translate(${index * 320} 0)"><text x="150" y="30" fill="#eee0b6" text-anchor="middle" font-family="sans-serif" font-size="18">${title}</text>${shapes.join('')}</g>`);
}
const cueSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="300"><rect width="960" height="300" fill="#142b25"/>${panels.join('')}</svg>`;
writeFileSync(output + '/catalyst-cue-sample.svg', cueSvg);
await sharp(Buffer.from(cueSvg)).png().toFile(output + '/catalyst-cue-sample.png');
writeFileSync(output + '/static-review-scope.txt', 'Static rasterization of the actual map SVG and recorded Graphics draw calls. This does not inspect browser CSS layout, Phaser playback, audio, playability or any physical device.\n');
console.log(JSON.stringify({ passed: true, maps: 12, cueStates: 3, browserUsed: false, output }));
