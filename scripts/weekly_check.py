"""
GUHSD Weekly Tech Tips — automated weekly monitor.

Runs via .github/workflows/weekly-check.yml on a free GitHub Actions
schedule (public repos get unlimited free Actions minutes — this costs
nothing and needs no API key).

What this DOES do, autonomously, every week:
1. Checks how many upcoming scheduled send dates already have a drafted
   tip in tips-data.json. If fewer than BUFFER_THRESHOLD are ready, it
   opens a GitHub Issue reminding you to draft more with Claude.
2. Fetches the district's AI@GUHSD approval page and compares it against
   the last-seen version. If it changed, it opens a GitHub Issue so you
   know to ask Claude to re-check tools.html against the current page.

What this does NOT do, and cannot do for free:
It does not use an AI model to judge whether a video is still good, find
new/better tools, or write new content. That requires either a human
(you + Claude, in conversation) or a paid LLM API call. This script is
pattern-matching and change-detection only — genuinely free, genuinely
autonomous, but not "smart." Think of it as a tripwire, not a researcher.
"""

import json
import os
import sys
import hashlib
import urllib.request
import datetime

REPO = "mfalconer-GUHSD/guhsd-tech-tips"
TOKEN = os.environ.get("GITHUB_TOKEN")
SEND_DATES_PATH = "data/send-dates.json"
TIPS_PATH = "data/tips-data.json"
HASH_PATH = "data/.ai-page-hash.txt"
AI_PAGE_URL = (
    "https://www.guhsd.net/Departments/Business-Services/"
    "Educational-Technology-Services/Application-Support/"
    "Artificial-Intelligence-AI/index.html"
)
BUFFER_THRESHOLD = 2  # remind if fewer than this many future issues are drafted


def load_json(path):
    with open(path) as f:
        return json.load(f)


def github_api(method, path, body=None):
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "guhsd-tech-tips-bot",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def issue_already_open(title):
    issues = github_api(
        "GET", f"/repos/{REPO}/issues?state=open&labels=automated-reminder"
    )
    return any(i["title"] == title for i in issues)


def create_issue(title, body):
    if issue_already_open(title):
        print(f"Issue already open, skipping: {title}")
        return
    github_api(
        "POST",
        f"/repos/{REPO}/issues",
        {"title": title, "body": body, "labels": ["automated-reminder"]},
    )
    print(f"Created issue: {title}")


def check_content_buffer():
    today = datetime.date.today().isoformat()
    send_dates = load_json(SEND_DATES_PATH)["sendDates"]
    tips = load_json(TIPS_PATH)["tips"]

    future_dates = [d for d in send_dates if d >= today]
    if not future_dates:
        print("No future send dates remain in the schedule. Nothing to check.")
        return

    drafted_dates = {t["weekOf"] for t in tips}
    ready_count = sum(1 for d in future_dates if d in drafted_dates)

    if ready_count < BUFFER_THRESHOLD:
        missing = [d for d in future_dates if d not in drafted_dates][:3]
        create_issue(
            "Running low on drafted tech tips",
            "Only " + str(ready_count) + " upcoming issue(s) are drafted ahead "
            "of schedule (threshold is " + str(BUFFER_THRESHOLD) + ").\n\n"
            "Next send dates that still need content: " + ", ".join(missing) + "\n\n"
            "Message Claude to research and draft the next tip(s), same process "
            "as always — real video, real compliance check, then add to "
            "data/tips-data.json.\n\n"
            "This issue will stay open until enough new tips are added; it won't "
            "duplicate itself on future runs.",
        )
    else:
        print(f"Content buffer looks fine: {ready_count} of next {len(future_dates)} dates ready.")


def check_district_page():
    try:
        req = urllib.request.Request(
            AI_PAGE_URL, headers={"User-Agent": "guhsd-tech-tips-bot"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read()
        current_hash = hashlib.sha256(content).hexdigest()
    except Exception as e:
        print(f"Could not fetch district AI page (non-fatal): {e}")
        return

    try:
        with open(HASH_PATH) as f:
            last_hash = f.read().strip()
    except FileNotFoundError:
        last_hash = ""

    if not last_hash:
        print("No prior hash on record — storing baseline, no reminder needed yet.")
        with open(HASH_PATH, "w") as f:
            f.write(current_hash)
        return

    if current_hash != last_hash:
        create_issue(
            "AI@GUHSD page may have changed",
            "The district's AI tool approval page's content changed since the "
            "last weekly check.\n\n"
            "Page: " + AI_PAGE_URL + "\n\n"
            "This could mean a tool's approval status changed, or it could be an "
            "unrelated wording/formatting edit — someone needs to actually look. "
            "Ask Claude to re-check the approved-tools table on tools.html "
            "against the current page and update it if needed.",
        )
        with open(HASH_PATH, "w") as f:
            f.write(current_hash)
    else:
        print("District AI page unchanged since last check.")


if __name__ == "__main__":
    if not TOKEN:
        print("No GITHUB_TOKEN available — cannot create issues. Exiting.")
        sys.exit(1)
    check_content_buffer()
    check_district_page()
