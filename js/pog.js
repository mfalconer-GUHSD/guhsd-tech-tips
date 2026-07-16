/* GUHSD Portrait of a Graduate — interactive reference page
   Data source: /data/pog-elements.json
   Click a card to expand its descriptors; tabs filter by profile. */

const POG_DATA_URL = 'data/pog-elements.json';

// Simple line-icon set (24x24, stroke-based). Kept minimal and reused across elements.
const ICONS = {
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H12v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z"/><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H12v20h5.5a2.5 2.5 0 0 0 2.5-2.5v-15Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2 13 13l-3.8 1.8L11 11l3.8-1.8Z"/>',
  chat: '<path d="M4 5h16v11H8l-4 4V5Z"/>',
  heart: '<path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 6 3.5 4 7.5C19 16.65 12 21 12 21Z"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z"/>',
  users: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.3"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M14.5 20c0-2.1 1.3-3.9 2.8-4.5"/>',
  lightbulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0 0 12 3Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9Z"/>',
  leaf: '<path d="M20 4C10 4 4 10 4 18c8 0 14-6 14-14Z"/><path d="M8 18c0-4 3-8 8-9"/>',
  building: '<rect x="5" y="3" width="14" height="18"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/>',
  briefcase: '<rect x="3" y="8" width="18" height="11" rx="1.5"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  puzzle: '<path d="M9 3h4v2.3a1.85 1.85 0 1 0 0 3.7V13h4.3a1.85 1.85 0 1 1 0 3.7H13V21H9.7a1.85 1.85 0 1 0-3.7 0H3v-4.3a1.85 1.85 0 1 0 0-3.7H3V9h4.3a1.85 1.85 0 1 0 3.7 0V3Z"/>'
};

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.book}</svg>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let POG_DATA = null;
let ACTIVE_PROFILE = 'GP';

async function loadPogData() {
  const res = await fetch(POG_DATA_URL);
  if (!res.ok) throw new Error('Could not load Portrait of a Graduate data');
  return res.json();
}

function cardMarkup(el) {
  const descriptorsHtml = el.descriptors
    .map(d => `<li>${escapeHtml(d)}</li>`)
    .join('');
  return `
  <article class="pog-card" data-profile="${el.profile}">
    <button class="pog-card-trigger" aria-expanded="false">
      <span class="pog-card-icon pog-${el.profile.toLowerCase()}">${iconSvg(el.icon)}</span>
      <span class="pog-card-heading">
        <span class="pog-card-code">${el.code}</span>
        <span class="pog-card-title">${escapeHtml(el.title)}</span>
      </span>
      <span class="pog-card-chevron" aria-hidden="true">&#8250;</span>
    </button>
    <div class="pog-card-panel">
      <ul class="pog-card-list">${descriptorsHtml}</ul>
    </div>
  </article>`;
}

function renderProfileIntro(profileKey) {
  const p = POG_DATA.profiles[profileKey];
  const introEl = document.getElementById('pog-profile-intro');
  if (introEl) {
    introEl.innerHTML = `<strong>${escapeHtml(p.label)}</strong> &middot; ${escapeHtml(p.who)} — ${escapeHtml(p.intro)}`;
  }
}

function renderCards(profileKey) {
  const mount = document.getElementById('pog-cards');
  if (!mount) return;
  const items = POG_DATA.elements.filter(e => e.profile === profileKey);
  mount.innerHTML = items.map(cardMarkup).join('');
  mount.setAttribute('data-active-profile', profileKey.toLowerCase());

  mount.querySelectorAll('.pog-card-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.pog-card');
      const panel = card.querySelector('.pog-card-panel');
      const isOpen = card.classList.contains('is-open');

      if (isOpen) {
        panel.style.maxHeight = null;
        card.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        card.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
}

function setActiveTab(profileKey) {
  ACTIVE_PROFILE = profileKey;
  document.querySelectorAll('.pog-tab').forEach(tab => {
    const isActive = tab.dataset.profile === profileKey;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  renderProfileIntro(profileKey);
  renderCards(profileKey);
}

async function renderPogPage() {
  const mount = document.getElementById('pog-cards');
  if (!mount) return;
  try {
    POG_DATA = await loadPogData();
    document.querySelectorAll('.pog-tab').forEach(tab => {
      tab.addEventListener('click', () => setActiveTab(tab.dataset.profile));
    });
    setActiveTab('GP');
  } catch (e) {
    mount.innerHTML = `<p class="empty-state">Couldn't load the Portrait of a Graduate right now. Try refreshing.</p>`;
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', renderPogPage);
