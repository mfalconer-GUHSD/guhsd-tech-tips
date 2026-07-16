# GUHSD Weekly Tech Tips

A lightweight, static site for weekly AI tech tips for GUHSD teachers — Gemini, Brisk Teaching,
NotebookLM, and whatever else gets added later. No build step, no server, no database.

Curated by Mr. Falconer, Assistant Principal. Questions: mfalconer@guhsd.net

## What's here

```
index.html                 This week's 3 most recent tips (compact preview cards)
archive.html                Full searchable archive (compact preview cards)
tip.html                    Full detail for one tip — linked from every preview card
tools.html                  "Find a Tool" quick reference + district compliance table
css/style.css                All styling
js/app.js                   Reads data/tips-data.json and renders all pages
data/tips-data.json          <-- THE ONLY FILE YOU EDIT to add a new tip
data/send-dates.json         Reference copy of the 2026-27 send calendar (used by the weekly monitor)
apps-script/weekly-digest.gs  Auto-emails subscribers when a new issue goes live, on the real school calendar
scripts/weekly_check.py       Free automated weekly content/compliance monitor (see below)
.github/workflows/weekly-check.yml   Runs the monitor script on a free weekly schedule
docs/gem-instructions.md     Instructions for the "AI Tool Guide" Gemini Gem
```

## Publishing it (GitHub Pages, free)

1. In this repo: **Settings → Pages → Source → Deploy from a branch → main → / (root)**.
2. Live at: `https://mfalconer-guhsd.github.io/guhsd-tech-tips/`
3. Share that link with staff, or point a custom domain at it later.

## Adding a new tip yourself (self-serve)

Open `data/tips-data.json` in GitHub (click the file → pencil icon → edit) and copy one of the
existing entries inside the `"tips"` array, then update the fields:

```json
{
  "id": "2026-10-05-something",
  "issueNumber": 7,
  "weekOf": "2026-10-05",
  "title": "Your catchy title here",
  "teaser": "One punchy sentence — shown on the homepage/archive preview card.",
  "tool": "gemini",              // must be "gemini", "brisk", or "notebooklm"
  "video": {
    "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "title": "Exact video title",
    "channel": "Channel name",
    "description": "1-2 sentence description of what's in the video."
  },
  "whyItMatters": "1-3 sentences on the teacher/student benefit. Shown only on the tip's own page.",
  "pogTags": ["GP4", "AP1", "SP7"], // any codes from pogElements: GP (Graduate), AP (Adult), SP (System)
  "complianceNote": "1 sentence reminder — PII, staff-only, parent consent, etc."
}
```

Only tag a code if the tip genuinely supports it — don't pad the list for coverage. Most weekly
tool tips will fit **SP7 (Supports Innovative Pedagogical Practices)**; other SP codes rarely
apply to a tech tip specifically.

`issueNumber` must keep increasing and never repeat — it's how the email script knows something
new was published. `weekOf` should match one of the dates in `data/send-dates.json` for that
issue to actually get emailed on schedule. Each tip automatically gets its own page at
`tip.html?id=<the id you set above>`.

**Adding a 4th tool later?** Add it to the `"tools"` object at the top of the JSON file first
(name, login URL, and PII/staff/student flags), then reference its key in a tip's `"tool"` field.

## Before you publish each week

- Confirm the YouTube video is still live and genuinely ≤5 minutes.
- Double check the compliance flags in `"tools"` still match the current district-approved list
  at the AI@GUHSD page, in case the district updates tool approvals.

## Automating the staff email

`apps-script/weekly-digest.gs` checks the site daily and emails the recipient list whenever a
new issue has actually been published — but only on the 37 verified school-year send dates
(holidays shifted to Tuesday, break weeks skipped entirely). If a date passes with nothing
published, it emails *you* a one-time reminder instead of staff, and will catch up automatically
once you do publish, even a few days late.

**Recipients:** a mix of always-included addresses (`STATIC_RECIPIENTS` in the script — a Google
Group plus a few individuals) and self-serve sign-ups via a Google Form + linked Sheet. An
unsubscribe form works the same way and is subtracted from the send list.

**Setup** (see the comment block at the top of `apps-script/weekly-digest.gs` for full detail):
1. script.google.com → paste in the file → run `sendTestEmail` once (only ever emails you, safe
   anytime) → set trigger: function `checkAndSendDigest`, Time-driven, **Day timer** (not week —
   the script decides which days actually send).
2. `forceSendNow()` is a manual override to push the latest issue out immediately, bypassing all
   date logic, if you ever want to send something right away.

**Content is still human-reviewed by design.** Only the emailing is automated; each week's tip
is drafted with Claude and reviewed before it's added to `tips-data.json`, since the video links
and compliance flags need a real check, not just an AI guess.

## The weekly automated monitor (free, no API key)

`.github/workflows/weekly-check.yml` runs `scripts/weekly_check.py` every Monday via GitHub
Actions — free forever on a public repo, no billing, no API key. Each run does two things:

1. **Content buffer check:** counts how many upcoming scheduled send dates already have a
   drafted tip. If fewer than 2 are ready, it opens a GitHub Issue (label `automated-reminder`)
   telling you to draft more with Claude. Won't duplicate the reminder while one's still open.
2. **District page change detection:** fetches the AI@GUHSD approval page and compares it to
   last week's version (a stored hash). If it changed, it opens an Issue telling you to ask
   Claude to re-check `tools.html`'s compliance table against the current page.

**What this can't do for free:** it cannot judge whether a video is still good, discover new or
better tools, or write content — that needs an AI model in the loop, which means either a human
conversation with Claude (free, what we've been doing) or a paid API integration (not free). This
script is a tripwire, not a researcher — it tells you *when* to check in, not *what* to say.

Check the repo's **Issues tab** periodically, or watch the repo for notifications, to see these
reminders. You can also run it manually anytime: **Actions tab → Weekly Tech Tips Monitor → Run
workflow**.

## The Gemini "AI Tool Guide"

`docs/gem-instructions.md` has the full instructions text for a custom Gemini Gem that helps
teachers pick the right tool and stay within policy. It can only be *linked* to, not embedded —
Google doesn't offer a public embed for Gems. Currently waiting on GUHSD's Workspace admin to
enable Gem sharing district-wide; `tools.html` has a placeholder callout for it.

## Design notes

Apple.com-inspired layout — sticky blurred nav, big hero, alternating white/gray product-style
sections — in GUHSD teal/green with white lettering in the nav and hero. YouTube's own badge
icon marks every video link. Portrait of a Graduate element codes (GP1, AP3, etc.) are shown
with their full titles inline, not just on hover. `tools.html` links prominently to the official
district page above its own compliance table, since that table is a hand-synced copy that can
go stale.
