# GUHSD Weekly Tech Tips

A lightweight, static site for weekly AI tech tips for GUHSD teachers — Gemini, Brisk Teaching,
NotebookLM, and whatever else gets added later. No build step, no server, no database.

## What's here

```
index.html          This week's 3 most recent tips
archive.html         Full searchable archive
css/style.css        All styling
js/app.js            Reads data/tips-data.json and renders the cards
data/tips-data.json  <-- THE ONLY FILE YOU EDIT to add a new tip
```

## Publishing it (GitHub Pages, free)

1. In this repo: **Settings → Pages → Source → Deploy from a branch → main → / (root)**.
2. GitHub gives you a live URL in a minute or two, like
   `https://mfalconer-guhsd.github.io/guhsd-tech-tips/`.
3. Share that link with staff, or point a custom domain at it later.

## Adding a new tip yourself (self-serve)

Open `data/tips-data.json` in GitHub (click the file → pencil icon → edit) and copy one of the
existing entries inside the `"tips"` array, then update the fields:

```json
{
  "id": "2026-w30-notebooklm-something",
  "issueNumber": 4,
  "weekOf": "2026-07-27",
  "title": "Your catchy title here",
  "tool": "gemini",              // must be "gemini", "brisk", or "notebooklm"
  "video": {
    "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "title": "Exact video title",
    "channel": "Channel name",
    "description": "1-2 sentence description of what's in the video."
  },
  "whyItMatters": "1-3 sentences on the teacher/student benefit.",
  "pogTags": ["GP4", "AP1"],      // any codes from the pogElements list below
  "complianceNote": "1 sentence reminder — PII, staff-only, parent consent, etc."
}
```

Increase `issueNumber` by 1 each week. The homepage always shows the 3 highest issue numbers;
everything lives permanently in the archive.

**Adding a 4th tool later?** Add it to the `"tools"` object at the top of the JSON file first
(name, login URL, and PII/staff/student flags), then reference its key in a tip's `"tool"` field.

## Before you publish each week

- Confirm the YouTube video is still live and genuinely ≤5 minutes — I selected these based on
  official channels and descriptions, but couldn't auto-verify exact runtimes (YouTube blocks
  automated duration checks). A 10-second glance before sharing is worth it.
- Double check the compliance flags in `"tools"` still match the current district-approved list
  at the AI@GUHSD page, in case the district updates tool approvals.

## Design notes

Masthead/bulletin aesthetic (navy + gold + warm paper), monospace tags for the Portrait of a
Graduate element codes (since those really are coded — GP1, AP3, etc.), and a stamp-style
compliance badge on each issue showing staff/student approval at a glance.
