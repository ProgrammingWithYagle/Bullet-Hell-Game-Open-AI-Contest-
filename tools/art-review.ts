import libraryData from '../assets/production/normalized/library.json';
import heavyMotion from '../assets/production/motion/heavy-library.json';
import encounters from '../assets/production/motion/encounter-library.json';
import civic from '../assets/production/motion/civic-library.json';
import survivors from '../assets/production/motion/survivor-library.json';
import props from '../assets/production/props-library.json';
import items from '../assets/production/items/library.json';
import './art-review.css';

interface ArtEntry {
  id: string;
  name: string;
  family: string;
  kind: string;
  atlas: string;
  source: string;
  sourceSha256: string;
  atlasSha256: string;
  cellSize: number;
  columns: number;
  frames: number;
  labels: string[];
  origin: number[];
  displayHeight: number;
  displayCell: number;
  fps: number;
  status: string;
  frameDurationsMs?: number[];
  notes?: string;
}
const entries: ArtEntry[] = [
  ...(libraryData as { entries: ArtEntry[] }).entries,
  ...heavyMotion.entries,
  ...encounters.entries,
  ...civic.entries,
  ...survivors.entries,
  ...props.entries,
  ...items.entries,
];
const images = new Map<string, HTMLImageElement>();
const element = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('stage');
const context = canvas.getContext('2d')!;
let selected = entries[0],
  frame = 0,
  playing = false,
  speed = 1,
  elapsed = 0,
  previousTime = 0;
let ground = 'teal',
  anchors = true,
  hazards = false,
  onion = false,
  filter = 'all';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const url = (file: string) => '/' + file;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );

function sprite(
  ctx: CanvasRenderingContext2D,
  entry: ArtEntry,
  index: number,
  x: number,
  y: number,
  size: number,
) {
  const image = images.get(entry.id);
  if (!image) return;
  const cell = entry.cellSize;
  ctx.drawImage(
    image,
    (index % entry.columns) * cell,
    Math.floor(index / entry.columns) * cell,
    cell,
    cell,
    x - size * entry.origin[0],
    y - size * entry.origin[1],
    size,
    size,
  );
}
function thumbnail(entry: ArtEntry, index: number, width = 54, height = 68) {
  const thumb = document.createElement('canvas');
  thumb.width = width * 2;
  thumb.height = height * 2;
  thumb.setAttribute('aria-hidden', 'true');
  const ctx = thumb.getContext('2d')!;
  sprite(ctx, entry, index, width, height * 2 - 6, height * 1.55);
  return thumb;
}
function library() {
  const target = element('library');
  target.replaceChildren();
  for (const entry of entries.filter((item) => filter === 'all' || item.family === filter)) {
    const button = document.createElement('button');
    button.className = 'library-card';
    button.dataset.art = entry.id;
    button.setAttribute('aria-pressed', String(selected.id === entry.id));
    const motion = entry.kind === 'animation';
    button.innerHTML = `<span><strong>${escape(entry.name)}</strong><small>${motion ? `${entry.frames} motion frames` : `${entry.frames} reference poses`}</small></span>`;
    button.prepend(thumbnail(entry, 0, 55, 67));
    button.addEventListener('click', () => select(entry));
    target.append(button);
  }
}
function synchronizeFrame() {
  element('frame-label').textContent =
    `${selected.kind === 'animation' ? 'Frame' : 'Pose'} ${frame + 1} / ${selected.frames}`;
  for (const button of document.querySelectorAll<HTMLElement>('[data-frame]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.frame) === frame));
  }
  canvas.dataset.frame = String(frame);
  canvas.dataset.asset = selected.id;
}
function select(entry: ArtEntry) {
  selected = entry;
  frame = 0;
  elapsed = 0;
  playing = false;
  element('selected-name').textContent = entry.name;
  element('selected-kind').textContent =
    `${entry.family === 'survivors' ? 'SURVIVOR' : 'BOSS'} / ${entry.kind === 'animation' ? 'MOTION STUDY' : 'DIRECTION & POSE REFERENCE'}`;
  const play = element<HTMLButtonElement>('play');
  play.disabled = entry.kind !== 'animation';
  play.textContent = 'Play';
  element('status').textContent =
    entry.kind === 'animation' ? 'PAUSED · MOTION STUDY' : 'STATIC REFERENCE';
  element<HTMLAnchorElement>('native-link').href = url(entry.source);
  element('asset-note').textContent = entry.notes ?? entry.status;
  element('metadata').innerHTML = [
    [
      'Atlas',
      `<a href="${url(entry.atlas)}" target="_blank" rel="noopener">${escape(entry.atlas)}</a>`,
    ],
    [
      'Cell / anchor',
      `${entry.cellSize} × ${entry.cellSize} px / ${entry.origin.map((n) => n.toFixed(4)).join(', ')}`,
    ],
    [
      'Display height',
      `${entry.displayHeight} world px (nominal body height at one shared identity scale)`,
    ],
    ['Source SHA-256', escape(entry.sourceSha256)],
    ['Atlas SHA-256', escape(entry.atlasSha256)],
  ]
    .map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`)
    .join('');
  const strip = element('frames');
  strip.replaceChildren();
  for (let index = 0; index < entry.frames; index++) {
    const button = document.createElement('button');
    button.className = 'frame';
    button.dataset.frame = String(index);
    button.setAttribute(
      'aria-label',
      entry.kind === 'animation'
        ? `Frame ${index + 1}: ${entry.labels[index]}`
        : entry.labels[index],
    );
    button.append(
      thumbnail(entry, index),
      document.createTextNode(
        entry.kind === 'animation' ? String(index + 1).padStart(2, '0') : entry.labels[index],
      ),
    );
    button.addEventListener('click', () => {
      pause();
      frame = index;
      elapsed = 0;
      synchronizeFrame();
      draw();
    });
    strip.append(button);
  }
  synchronizeFrame();
  library();
  draw();
}
function pause() {
  playing = false;
  element('play').textContent = 'Play';
  element('status').textContent =
    selected.kind === 'animation' ? 'PAUSED · MOTION STUDY' : 'STATIC REFERENCE';
}
function draw() {
  const paper = ground === 'paper';
  canvas.parentElement!.classList.toggle('paper', paper);
  context.fillStyle = paper ? '#e6dcc1' : '#1b342d';
  context.fillRect(0, 0, 960, 560);
  if (ground === 'checker') {
    for (let y = 0; y < 560; y += 24)
      for (let x = 0; x < 960; x += 24) {
        context.fillStyle = (x / 24 + y / 24) % 2 ? '#31493d' : '#233d32';
        context.fillRect(x, y, 24, 24);
      }
  }
  context.fillStyle = paper ? '#56604d' : '#9aaf9d';
  context.font = '13px "Noto Sans", sans-serif';
  context.fillText('GAMEPLAY SIZE', 102, 49);
  context.fillText('TWICE GAMEPLAY SIZE', 494, 49);
  const baseline = selected.family === 'survivors' ? 390 : 456;
  context.strokeStyle = paper ? '#b6ab8e' : '#365245';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(56, baseline);
  context.lineTo(902, baseline);
  context.stroke();
  for (const [multiple, x] of [
    [1, 250],
    [2, 676],
  ]) {
    const size = selected.displayCell * multiple;
    if (onion && selected.kind === 'animation') {
      context.globalAlpha = 0.18;
      sprite(context, selected, (frame + selected.frames - 1) % selected.frames, x, baseline, size);
      context.globalAlpha = 1;
    }
    sprite(context, selected, frame, x, baseline, size);
    if (anchors) {
      context.strokeStyle = paper ? '#935a39' : '#d4ae6e';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x - 9, baseline);
      context.lineTo(x + 9, baseline);
      context.moveTo(x, baseline - 9);
      context.lineTo(x, baseline + 9);
      context.stroke();
    }
    context.fillStyle = paper ? '#3a4d3b' : '#a9bdad';
    context.fillText(
      `${selected.displayHeight * multiple} px nominal body height`,
      x - 92,
      baseline + 34,
    );
  }
  if (hazards) {
    for (const [x, y] of [
      [180, 330],
      [310, 370],
      [240, 425],
      [555, 300],
      [750, 380],
      [670, 220],
      [820, 440],
      [608, 462],
    ]) {
      context.fillStyle = '#f3bb68';
      context.strokeStyle = '#6c292b';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    context.fillStyle = paper ? '#5a4030' : '#dbc398';
    context.fillText('Illustrative overlay · not simulated game entities or hitboxes', 56, 87);
  }
}
element('play').addEventListener('click', () => {
  if (selected.kind !== 'animation') return;
  playing = !playing;
  element('play').textContent = playing ? 'Pause' : 'Play';
  element('status').textContent = playing ? 'PLAYING · MOTION STUDY' : 'PAUSED · MOTION STUDY';
  elapsed = 0;
});
element('step').addEventListener('click', () => {
  pause();
  frame = (frame + 1) % selected.frames;
  elapsed = 0;
  synchronizeFrame();
  draw();
});
element<HTMLSelectElement>('speed').addEventListener('change', (event) => {
  speed = Number((event.target as HTMLSelectElement).value);
});
element<HTMLSelectElement>('ground').addEventListener('change', (event) => {
  ground = (event.target as HTMLSelectElement).value;
  draw();
});
for (const id of ['anchors', 'hazards', 'onion'])
  element<HTMLInputElement>(id).addEventListener('change', (event) => {
    const checked = (event.target as HTMLInputElement).checked;
    if (id === 'anchors') anchors = checked;
    if (id === 'hazards') hazards = checked;
    if (id === 'onion') onion = checked;
    draw();
  });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]'))
  button.addEventListener('click', () => {
    filter = button.dataset.filter!;
    for (const other of document.querySelectorAll<HTMLButtonElement>('[data-filter]'))
      other.setAttribute('aria-pressed', String(other === button));
    library();
  });
document.addEventListener('visibilitychange', () => {
  previousTime = 0;
  elapsed = 0;
});
function tick(time: number) {
  const delta = previousTime ? time - previousTime : 0;
  previousTime = time;
  if (playing && !document.hidden) {
    elapsed += delta * speed;
    // Preserve authored wall-clock timing even when a preview is throttled.
    // Skip full cycles rather than slowing the tell or iterating a long backlog.
    elapsed %=
      selected.frameDurationsMs?.reduce((total, ms) => total + ms, 0) ??
      (selected.frames * 1000) / selected.fps;
    let duration = selected.frameDurationsMs?.[frame] ?? 1000 / selected.fps;
    while (elapsed >= duration) {
      elapsed -= duration;
      frame = (frame + 1) % selected.frames;
      duration = selected.frameDurationsMs?.[frame] ?? 1000 / selected.fps;
      synchronizeFrame();
    }
    draw();
  }
  requestAnimationFrame(tick);
}
Promise.all(
  entries.map(
    (entry) =>
      new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          images.set(entry.id, image);
          resolve();
        };
        image.onerror = () => reject(Error('Cannot load ' + entry.atlas));
        image.src = url(entry.atlas);
      }),
  ),
)
  .then(() => {
    const poses = entries
      .filter((entry) => entry.kind === 'static-reference')
      .reduce((total, entry) => total + entry.frames, 0);
    const motionFrames = entries
      .filter((entry) => entry.kind === 'animation')
      .reduce((total, entry) => total + entry.frames, 0);
    element('library-summary').textContent =
      `${new Set(entries.filter((entry) => entry.kind === 'static-reference').map((entry) => entry.id)).size} identities · ${poses} reference poses${motionFrames ? ` · ${motionFrames} motion frames` : ''}`;
    select(entries.find((entry) => entry.id === location.hash.slice(1)) ?? entries[0]);
    if (reducedMotion)
      element('status').title = 'Paused by default; reduced motion preference is respected.';
    requestAnimationFrame(tick);
  })
  .catch((error) => {
    element('selected-name').textContent = 'Archive could not load';
    element('status').textContent = String(error);
  });
