/* GUHSD Weekly Tech Tips — rendering + filtering
   Data source: /data/tips-data.json
   Add new tips by editing that file — no code changes needed. */

const DATA_URL = 'data/tips-data.json';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatWeekOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function stampMarkup(tool) {
  if (tool.studentUse) {
    return `<div class="stamp" title="Staff &amp; student approved">STAFF<br>+<br>STUDENT</div>`;
  }
  return `<div class="stamp caution" title="${escapeHtml(tool.studentNote)}">STAFF<br>ONLY</div>`;
}

function issueCardMarkup(tip, data) {
  const tool = data.tools[tip.tool];
  const pogTagsHtml = tip.pogTags.map(code => {
    const label = data.pogElements[code] || code;
    return `<span class="pog-tag"><span class="pog-code">${escapeHtml(code)}</span> — ${escapeHtml(label)}</span>`;
  }).join('');

  return `
  <article class="issue" id="${tip.id}">
    <div class="issue-head">
      <div class="issue-number">
        <strong>Issue No. ${tip.issueNumber}</strong> · Week of ${formatWeekOf(tip.weekOf)}
      </div>
      <span class="tool-tag">${escapeHtml(tool.name)}</span>
    </div>

    <h2>${escapeHtml(tip.title)}</h2>

    <a class="video-block" href="${tip.video.url}" target="_blank" rel="noopener">
      <span class="play" aria-hidden="true">&#9654;</span>
      <span class="video-meta">
        <span class="video-title">${escapeHtml(tip.video.title)}</span>
        <span class="video-channel">${escapeHtml(tip.video.channel)} · watch on YouTube</span>
        <span class="video-desc">${escapeHtml(tip.video.description)}</span>
      </span>
    </a>

    <div class="why-block">
      <span class="label">Why it matters</span>
      ${escapeHtml(tip.whyItMatters)}
    </div>

    <div class="why-block">
      <span class="label">Portrait of a Graduate elements</span>
      <div class="pog-tags">${pogTagsHtml}</div>
    </div>

    <div class="issue-footer">
      <div class="stamp-row">
        ${stampMarkup(tool)}
        <p class="compliance-note">${escapeHtml(tip.complianceNote)}</p>
      </div>
      <div class="action-links">
        <a class="btn primary" href="${tool.loginUrl}" target="_blank" rel="noopener">Log in to ${escapeHtml(tool.name)}</a>
        <a class="btn" href="${data.district.complianceUrl}" target="_blank" rel="noopener">District AI guidance</a>
      </div>
    </div>
  </article>`;
}

async function loadData() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error('Could not load tips data');
  return res.json();
}

function sortByIssueDesc(tips) {
  return [...tips].sort((a, b) => b.issueNumber - a.issueNumber);
}

// ---------- Home page ----------
async function renderHome() {
  const mount = document.getElementById('latest-issues');
  if (!mount) return;
  try {
    const data = await loadData();
    const latest = sortByIssueDesc(data.tips).slice(0, 3);
    mount.innerHTML = latest.map(t => issueCardMarkup(t, data)).join('');
  } catch (e) {
    mount.innerHTML = `<p class="empty-state">Couldn't load this week's tips right now. Try refreshing.</p>`;
    console.error(e);
  }
}

// ---------- Archive page ----------
let ARCHIVE_DATA = null;

function populateFilters(data) {
  const toolSelect = document.getElementById('filter-tool');
  const pogSelect = document.getElementById('filter-pog');
  if (!toolSelect || !pogSelect) return;

  Object.entries(data.tools).forEach(([key, tool]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = tool.name;
    toolSelect.appendChild(opt);
  });

  Object.entries(data.pogElements).forEach(([code, label]) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${code} — ${label}`;
    pogSelect.appendChild(opt);
  });
}

function applyFilters() {
  if (!ARCHIVE_DATA) return;
  const toolVal = document.getElementById('filter-tool').value;
  const pogVal = document.getElementById('filter-pog').value;
  const searchVal = document.getElementById('filter-search').value.trim().toLowerCase();

  const filtered = sortByIssueDesc(ARCHIVE_DATA.tips).filter(tip => {
    if (toolVal && tip.tool !== toolVal) return false;
    if (pogVal && !tip.pogTags.includes(pogVal)) return false;
    if (searchVal && !tip.title.toLowerCase().includes(searchVal) &&
        !tip.whyItMatters.toLowerCase().includes(searchVal)) return false;
    return true;
  });

  const mount = document.getElementById('archive-issues');
  mount.innerHTML = filtered.length
    ? filtered.map(t => issueCardMarkup(t, ARCHIVE_DATA)).join('')
    : `<p class="empty-state">No tips match those filters yet. Check back next week.</p>`;
}

async function renderArchive() {
  const mount = document.getElementById('archive-issues');
  if (!mount) return;
  try {
    ARCHIVE_DATA = await loadData();
    populateFilters(ARCHIVE_DATA);
    applyFilters();

    ['filter-tool', 'filter-pog'].forEach(id =>
      document.getElementById(id).addEventListener('change', applyFilters));
    document.getElementById('filter-search').addEventListener('input', applyFilters);
  } catch (e) {
    mount.innerHTML = `<p class="empty-state">Couldn't load the archive right now. Try refreshing.</p>`;
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  renderArchive();
});
