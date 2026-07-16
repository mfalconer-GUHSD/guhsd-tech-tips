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

function statusPillMarkup(tool) {
  if (tool.studentUse) {
    return `<span class="status-pill approved">&#10003; Approved for staff &amp; students</span>`;
  }
  return `<span class="status-pill limited">&#9679; Staff use only</span>`;
}

function issueCardMarkup(tip, data) {
  const tool = data.tools[tip.tool];
  const pogTagsHtml = tip.pogTags.map(code => {
    const label = data.pogElements[code] || code;
    return `<span class="pog-tag"><span class="pog-code">${escapeHtml(code)}</span> — ${escapeHtml(label)}</span>`;
  }).join('');

  return `
  <section class="tip" id="${tip.id}">
    <div class="tip-inner">
      <p class="tip-meta"><span class="tip-tool">${escapeHtml(tool.name)}</span> · Issue No. ${tip.issueNumber} · Week of ${formatWeekOf(tip.weekOf)}</p>
      <h2>${escapeHtml(tip.title)}</h2>

      <a class="video-card" href="${tip.video.url}" target="_blank" rel="noopener">
        <div class="video-card-top">
          <span class="play-badge" aria-hidden="true">&#9654;</span>
          <span>
            <span class="video-card-title">${escapeHtml(tip.video.title)}</span>
            <span class="video-card-channel">${escapeHtml(tip.video.channel)} · watch on YouTube</span>
          </span>
        </div>
        <p class="video-card-desc">${escapeHtml(tip.video.description)}</p>
      </a>

      <p class="why-copy">
        <span class="label">Why it matters</span>
        ${escapeHtml(tip.whyItMatters)}
      </p>

      <div class="pog-block">
        <span class="label">Portrait of a Graduate elements</span>
        <div class="pog-tags">${pogTagsHtml}</div>
      </div>

      <div class="tip-footer">
        ${statusPillMarkup(tool)}
        <p class="compliance-line">${escapeHtml(tip.complianceNote)}</p>
        <div class="action-links">
          <a href="${tool.loginUrl}" target="_blank" rel="noopener">Log in to ${escapeHtml(tool.name)}</a>
          <a href="${data.district.complianceUrl}" target="_blank" rel="noopener">District AI guidance</a>
        </div>
      </div>
    </div>
  </section>`;
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
