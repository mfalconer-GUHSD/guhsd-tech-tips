/* GUHSD Weekly Tech Tips — rendering + filtering
   Data source: /data/tips-data.json
   Add new tips by editing that file — no code changes needed.

   Pages:
   - index.html: every PUBLISHED tip, newest first, with tool/search filters (#archive-issues),
     plus the 2025-26 legacy archive below it (#legacy-issues) — same search/tool filters apply
     to both sections.
   - tip.html?id=...: full detail for a single published tip (#tip-detail). Legacy tips don't
     get a detail page — they link straight out to the video/more-info/get-started URLs.
   - pipeline.html: EVERY current-year tip regardless of date, newest/upcoming first, with a
     status badge (#pipeline-issues) — personal "what have I already built" view. Not linked
     from any nav; bookmark it directly.

   IMPORTANT: a current-year tip only appears on index.html/tip.html once its weekOf date has
   arrived. This lets you draft and save future issues in tips-data.json ahead of time without
   them leaking on the public site before the scheduled email actually goes out. Legacy tips
   (data.legacyTips) are already all in the past, so they always show. */

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

// A tip is visible on the public pages once its scheduled date has arrived (local browser date).
function isPublished(tip) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekOf = new Date(tip.weekOf + 'T00:00:00');
  return weekOf <= today;
}

// Recognizable YouTube badge (red rounded rect + white triangle), not a generic play icon.
function ytIcon(w, h) {
  return `<svg class="yt-icon" width="${w}" height="${h}" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="28" height="20" rx="5" fill="#FF0000"/>
    <path d="M11.5 6.3L19 10l-7.5 3.7V6.3z" fill="#fff"/>
  </svg>`;
}

function statusPillMarkup(tool) {
  if (tool.studentUse) {
    return `<span class="status-pill approved">&#10003; Approved for staff &amp; students</span>`;
  }
  return `<span class="status-pill limited">&#9679; Staff use only</span>`;
}

function pogChipsMarkup(pogTags, pogElements) {
  return pogTags.map(code => {
    const label = pogElements[code] || code;
    return `<span class="pog-tag"><span class="pog-code">${escapeHtml(code)}</span> — ${escapeHtml(label)}</span>`;
  }).join('');
}

// ---------- Compact preview card (the single main list, current-year tips) ----------
function tipTeaserMarkup(tip, data) {
  const tool = data.tools[tip.tool];
  return `
  <article class="tip-teaser" id="${tip.id}">
    <p class="tip-teaser-meta"><span class="tip-teaser-tool">${escapeHtml(tool.name)}</span> · Issue No. ${tip.issueNumber} · ${formatWeekOf(tip.weekOf)}</p>
    <h3><a href="tip.html?id=${encodeURIComponent(tip.id)}">${escapeHtml(tip.title)}</a></h3>
    <p class="teaser-copy">${escapeHtml(tip.teaser || tip.whyItMatters)}</p>
    <div class="tip-teaser-links">
      <a class="yt-link" href="${tip.video.url}" target="_blank" rel="noopener">${ytIcon(22, 16)} Watch on YouTube</a>
      <a class="read-more" href="tip.html?id=${encodeURIComponent(tip.id)}">Read the full tip</a>
    </div>
  </article>`;
}

// ---------- Legacy tip card (2025-26 archive, shown on index.html and used for search) ----------
function legacyTeaserMarkup(tip, data) {
  const pogTagsHtml = pogChipsMarkup(tip.pogTags, data.pogElements);
  const coreNote = tip.notCoreToolNote
    ? `<p class="teaser-copy" style="margin-top:-6px;"><span class="tag-parent">${escapeHtml(tip.notCoreToolNote)}</span></p>`
    : '';
  return `
  <article class="tip-teaser" id="${tip.id}">
    <p class="tip-teaser-meta"><span class="tip-teaser-tool">${escapeHtml(tip.toolName)}</span> · ${escapeHtml(tip.dateLabel)} · <span class="tag-parent">2025–26 archive</span></p>
    <h3>${escapeHtml(tip.title)}</h3>
    <p class="teaser-copy">${escapeHtml(tip.description)}</p>
    ${coreNote}
    <div class="pog-tags" style="margin:4px 0 12px;">${pogTagsHtml}</div>
    <div class="tip-teaser-links">
      <a class="yt-link" href="${tip.videoUrl}" target="_blank" rel="noopener">${ytIcon(22, 16)} ${escapeHtml(tip.videoLabel || 'Watch on YouTube')}</a>
      <a class="read-more" href="${tip.moreInfoUrl}" target="_blank" rel="noopener">More info</a>
      <a class="read-more" href="${tip.getStartedUrl}" target="_blank" rel="noopener">Get started</a>
    </div>
  </article>`;
}

// ---------- Pipeline row (pipeline.html): compact, with a Sent/Scheduled badge ----------
function tipPipelineRowMarkup(tip, data) {
  const tool = data.tools[tip.tool];
  const published = isPublished(tip);
  const badge = published
    ? `<span class="tag-yes">&#10003; Sent</span>`
    : `<span class="tag-parent">&#9679; Scheduled — ${formatWeekOf(tip.weekOf)}</span>`;
  return `
  <article class="tip-teaser" id="${tip.id}">
    <p class="tip-teaser-meta">
      <span class="tip-teaser-tool">${escapeHtml(tool.name)}</span> · Issue No. ${tip.issueNumber} · ${formatWeekOf(tip.weekOf)} · ${badge}
    </p>
    <h3><a href="tip.html?id=${encodeURIComponent(tip.id)}">${escapeHtml(tip.title)}</a></h3>
    <p class="teaser-copy">${escapeHtml(tip.teaser || tip.whyItMatters)}</p>
    <div class="tip-teaser-links">
      <a class="yt-link" href="${tip.video.url}" target="_blank" rel="noopener">${ytIcon(22, 16)} Watch on YouTube</a>
      ${published ? `<a class="read-more" href="tip.html?id=${encodeURIComponent(tip.id)}">Read the full tip</a>` : ''}
    </div>
  </article>`;
}

// ---------- Full detail (tip.html) ----------
function tipDetailMarkup(tip, data) {
  const tool = data.tools[tip.tool];
  const pogTagsHtml = pogChipsMarkup(tip.pogTags, data.pogElements);

  return `
  <section class="tip">
    <div class="tip-inner">
      <p class="tip-meta"><span class="tip-tool">${escapeHtml(tool.name)}</span> · Issue No. ${tip.issueNumber} · Week of ${formatWeekOf(tip.weekOf)}</p>
      <h2>${escapeHtml(tip.title)}</h2>

      <a class="video-card" href="${tip.video.url}" target="_blank" rel="noopener">
        <div class="video-card-top">
          ${ytIcon(40, 29)}
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

function sortByIssueAsc(tips) {
  return [...tips].sort((a, b) => a.issueNumber - b.issueNumber);
}

function sortByDateDesc(tips) {
  return [...tips].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// ---------- The single main list (index.html): current tips + legacy archive, filterable ----------
let ALL_TIPS_DATA = null;

function populateFilters(data) {
  const toolSelect = document.getElementById('filter-tool');
  if (!toolSelect) return;

  Object.entries(data.tools).forEach(([key, tool]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = tool.name;
    toolSelect.appendChild(opt);
  });
}

function applyFilters() {
  if (!ALL_TIPS_DATA) return;
  const toolVal = document.getElementById('filter-tool').value;
  const searchVal = document.getElementById('filter-search').value.trim().toLowerCase();

  const published = ALL_TIPS_DATA.tips.filter(isPublished);
  const filteredCurrent = sortByIssueDesc(published).filter(tip => {
    if (toolVal && tip.tool !== toolVal) return false;
    if (searchVal && !tip.title.toLowerCase().includes(searchVal) &&
        !tip.whyItMatters.toLowerCase().includes(searchVal)) return false;
    return true;
  });

  const mount = document.getElementById('archive-issues');
  if (mount) {
    mount.innerHTML = filteredCurrent.length
      ? filteredCurrent.map(t => tipTeaserMarkup(t, ALL_TIPS_DATA)).join('')
      : `<p class="empty-state">No tips match those filters yet. Check back next week.</p>`;
  }

  const legacyMount = document.getElementById('legacy-issues');
  if (legacyMount) {
    const legacyTips = ALL_TIPS_DATA.legacyTips || [];
    const filteredLegacy = sortByDateDesc(legacyTips).filter(tip => {
      if (toolVal && tip.toolKey !== toolVal) return false;
      if (searchVal && !tip.title.toLowerCase().includes(searchVal) &&
          !tip.description.toLowerCase().includes(searchVal)) return false;
      return true;
    });
    legacyMount.innerHTML = filteredLegacy.length
      ? filteredLegacy.map(t => legacyTeaserMarkup(t, ALL_TIPS_DATA)).join('')
      : `<p class="empty-state">No 2025–26 archive tips match those filters.</p>`;

    const legacySection = document.getElementById('legacy-section');
    if (legacySection) {
      legacySection.style.display = filteredLegacy.length || (!toolVal && !searchVal) ? '' : 'none';
    }
  }
}

async function renderAllTips() {
  const mount = document.getElementById('archive-issues');
  if (!mount) return;
  try {
    ALL_TIPS_DATA = await loadData();
    populateFilters(ALL_TIPS_DATA);
    applyFilters();

    document.getElementById('filter-tool').addEventListener('change', applyFilters);
    document.getElementById('filter-search').addEventListener('input', applyFilters);
  } catch (e) {
    mount.innerHTML = `<p class="empty-state">Couldn't load the tips right now. Try refreshing.</p>`;
    console.error(e);
  }
}

// ---------- Pipeline page (pipeline.html): every current-year tip, newest/upcoming first ----------
async function renderPipeline() {
  const mount = document.getElementById('pipeline-issues');
  if (!mount) return;
  try {
    const data = await loadData();
    const ordered = sortByIssueDesc(data.tips);
    const sentCount = ordered.filter(isPublished).length;

    const summary = document.getElementById('pipeline-summary');
    if (summary) {
      summary.textContent = `${ordered.length} issue(s) built total — ${sentCount} already sent, ` +
        `${ordered.length - sentCount} scheduled for later.`;
    }

    mount.innerHTML = ordered.length
      ? ordered.map(t => tipPipelineRowMarkup(t, data)).join('')
      : `<p class="empty-state">No tips built yet.</p>`;
  } catch (e) {
    mount.innerHTML = `<p class="empty-state">Couldn't load the tips right now. Try refreshing.</p>`;
    console.error(e);
  }
}

// ---------- Individual tip page ----------
async function renderDetail() {
  const mount = document.getElementById('tip-detail');
  if (!mount) return;
  try {
    const data = await loadData();
    const id = new URLSearchParams(location.search).get('id');
    const tip = data.tips.find(t => t.id === id);
    if (!tip) {
      mount.innerHTML = `<p class="empty-state">Tip not found. <a href="index.html">Back to all tips</a>.</p>`;
      return;
    }
    if (!isPublished(tip)) {
      mount.innerHTML = `<p class="empty-state">This tip isn't published yet — check back on ` +
        `${formatWeekOf(tip.weekOf)}. <a href="index.html">Back to all tips</a>.</p>`;
      return;
    }
    document.title = tip.title + ' — GUHSD Weekly Tech Tips';
    mount.innerHTML = tipDetailMarkup(tip, data);
  } catch (e) {
    mount.innerHTML = `<p class="empty-state">Couldn't load this tip right now. Try refreshing.</p>`;
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAllTips();
  renderPipeline();
  renderDetail();
});
