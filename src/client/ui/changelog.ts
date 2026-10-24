import history from '../../shared/update-history.json';
import revision from '../../../content/revision.json';
import { PROTOCOL } from '../../shared/protocol.ts';
import { escape as e } from './html.ts';

// English editorial notes are explicitly marked; navigation follows the selected locale.
export function changelogHTML(
  labels: { title: string; back: string; english: string },
  locale: string,
) {
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(value + 'T12:00:00Z'));
  return `<div class="changelog-page"><div class="setup-heading"><h1 tabindex="-1" id="changelog-heading">${e(labels.title)}</h1><p class="build-stamp" dir="ltr">${e(revision.version)} · ${e(history.buildId)} · protocol ${PROTOCOL}</p><p>${e(labels.english)}</p><button id="back-home">← ${e(labels.back)}</button></div><div lang="en" dir="ltr"><aside class="journal-status"><strong>${history.snapshot.bosses} playable bosses · ${history.snapshot.classes} classes · ${history.snapshot.maps} maps</strong><p>Development build · <a href="#journal-open">Remaining work</a></p></aside><ol class="change-history">${history.entries.map((entry, i) => `<li><article aria-labelledby="change-${e(entry.id)}"><header><time datetime="${entry.date}">${e(date(entry.date))}</time><h2 id="change-${e(entry.id)}">${e(entry.title)}</h2>${i === 0 ? '<span class="journal-latest">Latest update</span>' : ''}</header>${entry.groups.map((group) => `<h3>${e(group.title)}</h3><ul>${group.items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`).join('')}${'commit' in entry ? `<a href="https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/${e(entry.commit)}" target="_blank" rel="noopener">Source checkpoint ↗</a>` : ''}</article></li>`).join('')}</ol><details id="journal-open" class="journal-status"><summary>Still in development</summary><ul>${history.limitations.map((x) => `<li>${e(x)}</li>`).join('')}</ul></details></div></div>`;
}
