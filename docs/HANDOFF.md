# GUHSD Weekly Tech Tips — Handoff Guide

Last updated Oct 2026. Written so someone new can keep this running without the original author.

## What this is
A weekly AI tip for GUHSD staff about three district-approved tools (Google Gemini, Gemini Notebook, Brisk Teaching).
- **Public site:** https://mfalconer-guhsd.github.io/guhsd-tech-tips/ (GitHub Pages, repo `mfalconer-GUHSD/guhsd-tech-tips`, branch `main`)
- **Weekly email:** sent by a Google Apps Script on a daily trigger
- **Current content focus (2026-27):** each tip pairs one tool feature with one step of building strong learning goals, aligned with Granite Hills' clear-goals work (learning goal = the WHY, success criteria = observable "I can" statements, task vs. learning).

## Where everything lives
| Piece | Location | Notes |
|---|---|---|
| All tip content | `data/tips-data.json` | **The only file you normally edit.** |
| Site pages | `index.html`, `tools.html`, `tip.html`, `pipeline.html`, `portrait-of-a-graduate.html` | Render from the JSON; rarely need edits |
| Email automation | `apps-script/weekly-digest.gs` | The repo copy is a backup; the **live** copy runs in Google Apps Script (see below) |
| Staff signup / unsubscribe / suggestion | Three Google Forms with response sheets | IDs are constants at the top of the script |

## How a tip gets sent
1. A tip exists in `tips-data.json` with `weekOf` equal to a date in `SEND_DATES` (in the script).
2. A **daily** Apps Script trigger (`checkAndSendDigest`) finds the earliest unsent date that has arrived, finds the tip with that exact `weekOf`, and BCCs the staff list. It records that date as sent.
3. If a date arrives with no matching tip, the script emails the script owner once. Nothing goes to staff.
4. If a date is missed, it catches up in order, one per run. It never skips a week.
5. `issueNumber` is display-only ("Tip #12"). It resets to 1 each school year. Ordering and sending use `weekOf`, never the number.

**Status as of Oct 2026:** all 37 scheduled dates (Aug 17, 2026 through Jun 1, 2027) have a tip. Nothing is required weekly unless you want to change content.

## Things tied to one person's account (the real handoff risks)
These are the items that can silently stop if the original owner's account changes:
1. **The Apps Script project and its triggers** run under the account that created them (guhsd.net). Triggers do not transfer when you share a script. To hand off: the new owner opens the script, makes a copy (or is added as editor), then re-creates the two triggers (`checkAndSendDigest` daily; `weeklyResearchReminder` weekly) and runs `sendTestEmail` once to authorize. Then the old owner deletes their triggers, so emails don't send twice.
2. **Script Properties** (`lastSentDateKey`) live in that project. A new copy starts empty, so it would try to "catch up" from the first date. After copying, set `lastSentDateKey` to the last date already sent (Project Settings > Script Properties) before enabling the daily trigger.
3. **The three Google Forms and their response sheets** are owned by one account. Transfer ownership in Drive (Share > change owner), or the signup list can be lost.
4. **The GitHub repo** is owned by one GitHub user. Add the successor as a collaborator (Settings > Collaborators), or transfer the repo.
5. **Attribution text**: the site footer and every email footer say "Curated by Mike Falconer, Assistant Principal." Update the name and title in `index.html`, `tools.html`, `tip.html`, `pipeline.html`, `portrait-of-a-graduate.html`, and in `sendDigestEmail` / `FROM_NAME` in the script. Also update `STATIC_RECIPIENTS` and the "Questions?" email.

## The weekly routine (about 15 minutes, only if content needs changing)
A weekly check-in email goes to the script owner with a ready-made prompt. Paste it into a Claude conversation. The prompt tells Claude to read the live `tips-data.json`, find unfilled dates, draft tips in the house format, verify videos, and publish to GitHub.

## Standards every tip must meet
- **Real video, verified ≤ 5 minutes.** YouTube Shorts (under 60 seconds) count as verified. Regular `/watch` pages often can't be checked, so do not guess a runtime. Describe honestly what the video does and does not show.
- **Compliance note matching the district list** (https://www.guhsd.net/Departments/Business-Services/Educational-Technology-Services/Application-Support/Artificial-Intelligence-AI/index.html). Brisk is **staff-only**. Gemini and Gemini Notebook are approved for staff and students. Never recommend a feature that needs a paid plan, and flag age limits (many features are 18+).
- **No student names or work samples** in any prompt a tip suggests.
- **Portrait of a Graduate tags** only where they genuinely fit (SP7 usually applies).

## Adding or editing a tip
Open `data/tips-data.json`. Each tip needs: `id`, `issueNumber`, `weekOf` (a date in `SEND_DATES`), `title`, `teaser`, `tool` (`gemini`, `brisk`, or `notebooklm`), `video {url, title, channel, description}`, `whyItMatters`, `pogTags`, `complianceNote`. Copy an existing tip as a template. Validate that the file is valid JSON before committing — a syntax error breaks both the site and the email.

## Moving to a new school year
1. Update `SEND_DATES` in the script from GUHSD's adopted calendar.
2. Move the finished year's tips from `tips` into `legacyTips` (reformat to the legacy fields) and restart `issueNumber` at 1.
3. Paste the updated script into the live Apps Script project.

## Known open items (Oct 2026)
- The Dec 14 tip uses a generic Gemini-in-Classroom video, and Nov 30 uses a Ukrainian-language Short (disclosed in the tip). Swap in better videos when found.
- A Gemini Notebook "Learning Guide" tutor-mode tip is planned for Dec 14 once a verified short video is found; the content is documented in Google's own announcement.
- Gem sharing across the district is not enabled yet; tips that mention Gems share instructions through a Google Doc instead.
- The district's AI page still calls Gemini Notebook "NotebookLM." The tool is approved either way.
