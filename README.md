# GUHSD Weekly Tech Tips

A lightweight, static site for weekly AI tech tips for GUHSD teachers — Gemini, Brisk Teaching,
NotebookLM, and whatever else gets added later. No build step, no server, no database.

Curated by Mr. Falconer, Assistant Principal. Questions: mfalconer@guhsd.net

## What's here

```
index.html               This week's 3 most recent tips (compact preview cards)
archive.html              Full searchable archive (compact preview cards)
tip.html                  Full detail for one tip — linked from every preview card
css/style.css             All styling
js/app.js                 Reads data/tips-data.json and renders all three pages
data/tips-data.json       <-- THE ONLY FILE YOU EDIT to add a new tip
apps-script/weekly-digest.gs   Optional: auto-emails staff when a new issue goes live
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
  "id": "2026-w30-notebooklm-something",
  "issueNumber": 5,
  "weekOf": "2026-08-03",
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

Only tag a code if the tip genuinely supports it — don't pad the list for coverage. In practice,
most weekly tool tips will fit **SP7 (Supports Innovative Pedagogical Practices)** since that's
what adopting a new AI tool generally is at the system level. The other SP codes (health,
facilities, community partnerships, course offerings, etc.) will rarely apply to a tech tip —
only add them when a tip is actually about that thing.

Increase `issueNumber` by 1 each week. The homepage always shows the 3 highest issue numbers;
everything lives permanently in the archive. Each tip automatically gets its own page at
`tip.html?id=<the id you set above>` — no extra step needed.

**Adding a 4th tool later?** Add it to the `"tools"` object at the top of the JSON file first
(name, login URL, and PII/staff/student flags), then reference its key in a tip's `"tool"` field.

## Before you publish each week

- Confirm the YouTube video is still live and genuinely ≤5 minutes.
- Double check the compliance flags in `"tools"` still match the current district-approved list
  at the AI@GUHSD page, in case the district updates tool approvals.

## Automating the staff email (optional)

`apps-script/weekly-digest.gs` is a Google Apps Script that checks this site weekly and emails
staff a short summary — but only if a new issue has actually been published since the last send,
so it's safe to leave running on weeks you don't get to a new tip.

1. Go to [script.google.com](https://script.google.com) (sign in with your guhsd.net account) →
   New project.
2. Paste in the contents of `apps-script/weekly-digest.gs`.
3. Change `STAFF_EMAIL` near the top to your staff Google Group address.
4. Run the `sendTestEmail` function once (top toolbar → function dropdown → Run) to authorize
   Gmail access and check the formatting.
5. Set the real schedule: Triggers (clock icon, left sidebar) → + Add Trigger → function
   `checkAndSendDigest` → Time-driven → Week timer → pick a day/time → Save.

From then on, publishing a new issue in `tips-data.json` is the only step — the email goes out
automatically on the next scheduled run.

**Content is still human-reviewed by design.** Only the emailing is automated; each week's tip
is drafted with Claude and reviewed before it's added to `tips-data.json`, since the video links
and compliance flags need a real check, not just an AI guess.

## Design notes

Apple.com-inspired layout — sticky blurred nav, big hero, alternating white/gray product-style
sections — in GUHSD teal/green with white lettering in the nav and hero. YouTube's own badge
icon marks every video link. Portrait of a Graduate element codes (GP1, AP3, etc.) are shown
with their full titles inline, not just on hover.
