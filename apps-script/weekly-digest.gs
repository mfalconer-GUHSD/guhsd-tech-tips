/**
 * GUHSD Weekly Tech Tips — Staff Email Digest (v4: catch-up + reminders)
 *
 * Runs on a DAILY timer. Each day it checks whether a scheduled send date
 * has arrived (or already passed without sending) and whether new content
 * is ready. It only actually emails staff when both are true.
 *
 * REDUNDANCY #1 — CATCH-UP LOGIC:
 * Earlier versions only sent if today was an EXACT match in SEND_DATES.
 * That meant if you forgot to publish a tip by 7am on the scheduled day,
 * it would silently wait for the NEXT scheduled date — potentially a
 * multi-week gap nobody would notice. Now the script tracks the last
 * FULFILLED send-date (lastSentDateKey) instead of just an issue number.
 * Each day it finds the most recent scheduled date that is <= today. If
 * that date hasn't been fulfilled yet AND a new issue exists, it sends —
 * whether that's exactly on time or a few days late. It keeps checking
 * every day until it catches up.
 *
 * REDUNDANCY #2 — MISSED-CONTENT REMINDER:
 * If a scheduled date arrives (or has passed) with no new issue ready,
 * the script emails YOU (not staff) a one-time reminder per due-date —
 * "today was/is a scheduled day and nothing's published yet." It won't
 * repeat that reminder every day for the same due-date, so it won't spam
 * you, but it will remind again if a NEW due-date also passes unfulfilled.
 *
 * REDUNDANCY #3 — MANUAL OVERRIDE:
 * Run `forceSendNow()` anytime to immediately send the latest issue to
 * real recipients, bypassing the date check entirely. Useful if you want
 * to push a late issue out right away instead of waiting for the next
 * automatic daily check.
 *
 * SEND_DATES for 2026-27 (verified against GUHSD's adopted calendar):
 * - First Monday in session: Aug 17, 2026
 * - Labor Day (Mon Sep 7) -> shifted to Tue Sep 8
 * - Thanksgiving week (Nov 23-27) -> skipped entirely
 * - Winter break (Dec 21 - Jan 1) -> both weeks skipped
 * - MLK Day (Mon Jan 18, 2027) -> shifted to Tue Jan 19
 * - Lincoln Day (Mon Feb 8, 2027) -> shifted to Tue Feb 9
 * - Washington/Presidents' Day (Mon Feb 15, 2027) -> shifted to Tue Feb 16
 * - Spring break (Mar 22 - Apr 2, 2027) -> both weeks skipped
 * - Memorial Day (Mon May 31, 2027) -> shifted to Tue Jun 1
 * - Last day of student attendance: Thu Jun 3, 2027
 * Update this list once GUHSD adopts the 2027-28 calendar.
 *
 * IMPORTANT — sendTestEmail is safe to run anytime:
 * It ONLY ever sends to your own account, never to STATIC_RECIPIENTS or
 * the signup list, and ignores dates entirely. forceSendNow() is the one
 * that reaches real recipients on demand — use it deliberately.
 *
 * SETUP
 * 1. Go to https://script.google.com > New project (your guhsd.net account).
 * 2. Paste this entire file in, replacing whatever's there now.
 * 3. Run `sendTestEmail` once to authorize Gmail/Sheets access and check
 *    formatting. This only emails you.
 * 4. Trigger: clock icon > + Add Trigger > function: checkAndSendDigest >
 *    Time-driven > Day timer > any time window > Save.
 * 5. Done. Publish a new issue in tips-data.json before its scheduled
 *    date, or a little late is fine too — the script will catch up and
 *    remind you either way.
 */

const DATA_URL = 'https://raw.githubusercontent.com/mfalconer-GUHSD/guhsd-tech-tips/main/data/tips-data.json';
const SITE_URL = 'https://mfalconer-guhsd.github.io/guhsd-tech-tips/';
const FROM_NAME = 'Mr. Falconer — AI Tech Tips';
const TIMEZONE = 'America/Los_Angeles';

const SIGNUP_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSflh2l3PXs2NGAHv6u-hGjKtv7XPMycD4LKFdD82O3FxRU_Rg/viewform?usp=publish-editor';
const UNSUBSCRIBE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfEVWKtF0WgzySXhqXC0zeQNQlFlvSvH96vi9dVrbIH07-2TA/viewform?usp=publish-editor';

const SIGNUP_SHEET_ID = '1Ih6HpPXXAjzlpAWbEWmnHSww4GJnaqBGXesj7sX2Ins';
const SIGNUP_EMAIL_HEADER = 'Email Address';

const UNSUB_SHEET_ID = '1q-9Z9Qzxub-0QvKF_ickjmp9HcAmms0qP5aAdhfvJws';
const UNSUB_EMAIL_HEADER = 'Email Address';

// Always-included recipients regardless of the signup form (Google Group + individuals + you).
const STATIC_RECIPIENTS = [
  'ghhs-certificated-staff@guhsd.net',
  'cgaeir@guhsd.net',
  'agarcia@guhsd.net',
  'mfalconer@guhsd.net'
];

// Verified send dates for the 2026-27 school year, in order.
const SEND_DATES = [
  '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-08',
  '2026-09-14', '2026-09-21', '2026-09-28',
  '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26',
  '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-30',
  '2026-12-07', '2026-12-14',
  '2027-01-04', '2027-01-11', '2027-01-19', '2027-01-25',
  '2027-02-01', '2027-02-09', '2027-02-16', '2027-02-22',
  '2027-03-01', '2027-03-08', '2027-03-15',
  '2027-04-05', '2027-04-12', '2027-04-19', '2027-04-26',
  '2027-05-03', '2027-05-10', '2027-05-17', '2027-05-24', '2027-06-01'
];

// ---------- The daily check (this is what the trigger runs) ----------
function checkAndSendDigest() {
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');

  const dueDate = getMostRecentDueDate(today);
  if (!dueDate) {
    Logger.log('No scheduled send date has arrived yet, or the school year is over. Skipping.');
    return;
  }

  const lastSentDateKey = PropertiesService.getScriptProperties().getProperty('lastSentDateKey') || '';
  if (dueDate <= lastSentDateKey) {
    Logger.log('Most recent due date (' + dueDate + ') already fulfilled. Skipping.');
    return;
  }

  const data = fetchData();
  if (!data) return;

  const latest = getLatestTip(data);
  if (!latest) {
    Logger.log('No tips found in the data file at all. Skipping.');
    return;
  }

  const lastIssueSent = Number(PropertiesService.getScriptProperties().getProperty('lastIssueSent') || 0);
  if (latest.issueNumber <= lastIssueSent) {
    // Due date has arrived/passed but no new content exists yet — this is the
    // exact gap this version is designed to catch. Remind once per due-date.
    Logger.log('Due date ' + dueDate + ' has arrived but no new issue is published yet.');
    maybeSendMissedContentReminder(dueDate, today);
    return;
  }

  const recipients = getRecipientList();
  if (!recipients.length) {
    Logger.log('No recipients found — check SIGNUP_SHEET_ID and that the sheet has responses.');
    return;
  }

  sendDigestEmail(latest, data, recipients);
  const props = PropertiesService.getScriptProperties();
  props.setProperty('lastIssueSent', String(latest.issueNumber));
  props.setProperty('lastSentDateKey', dueDate);
  const daysLate = daysBetween(dueDate, today);
  Logger.log('Sent issue #' + latest.issueNumber + ' to ' + recipients.length + ' recipient(s). ' +
    'Due date was ' + dueDate + (daysLate > 0 ? ' (' + daysLate + ' day(s) late — caught up)' : ' (on time)') + '.');
}

// Finds the latest SEND_DATES entry that is <= today. Returns null if none yet.
function getMostRecentDueDate(todayStr) {
  let mostRecent = null;
  for (let i = 0; i < SEND_DATES.length; i++) {
    if (SEND_DATES[i] <= todayStr) {
      mostRecent = SEND_DATES[i];
    } else {
      break; // SEND_DATES is in ascending order, so we can stop early
    }
  }
  return mostRecent;
}

function daysBetween(earlierStr, laterStr) {
  const earlier = new Date(earlierStr + 'T00:00:00');
  const later = new Date(laterStr + 'T00:00:00');
  return Math.round((later - earlier) / 86400000);
}

// Sends ONE reminder to you per unfulfilled due-date — won't repeat daily for the same date.
function maybeSendMissedContentReminder(dueDate, today) {
  const props = PropertiesService.getScriptProperties();
  const lastReminded = props.getProperty('lastReminderDueDate') || '';
  if (lastReminded === dueDate) {
    return; // already reminded about this specific due-date
  }
  const me = Session.getActiveUser().getEmail();
  const daysLate = daysBetween(dueDate, today);
  const subject = daysLate === 0
    ? 'Reminder: today is a scheduled Tech Tips send date'
    : 'Reminder: Tech Tips send date (' + dueDate + ') has passed with no new issue';
  const body = 'Scheduled send date ' + dueDate + (daysLate > 0 ? ' (' + daysLate + ' day(s) ago)' : ' (today)') +
    ' has no new issue in tips-data.json yet.\n\n' +
    'Nothing has gone out to staff. As soon as you publish a new issue (increase issueNumber), ' +
    'the next daily check will send it automatically — even if that\'s a few days from now.\n\n' +
    'Site: ' + SITE_URL;
  GmailApp.sendEmail(me, subject, body, { name: FROM_NAME });
  props.setProperty('lastReminderDueDate', dueDate);
  Logger.log('Sent missed-content reminder to ' + me + ' for due date ' + dueDate + '.');
}

// Manual override: sends the latest issue to REAL recipients right now, ignoring the
// date/catch-up logic entirely. Use when you want to push a late issue immediately.
function forceSendNow() {
  const data = fetchData();
  if (!data) return;
  const latest = getLatestTip(data);
  if (!latest) { Logger.log('No tips found in the data file.'); return; }
  const recipients = getRecipientList();
  if (!recipients.length) { Logger.log('No recipients found — nothing to send to.'); return; }
  sendDigestEmail(latest, data, recipients);
  const props = PropertiesService.getScriptProperties();
  props.setProperty('lastIssueSent', String(latest.issueNumber));
  props.setProperty('lastSentDateKey', Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd'));
  Logger.log('Force-sent issue #' + latest.issueNumber + ' to ' + recipients.length + ' recipient(s).');
}

// Manually run this anytime to check formatting/authorization. ALWAYS sends only to your
// own account — never to STATIC_RECIPIENTS or the signup list, and ignores all date logic.
function sendTestEmail() {
  const data = fetchData();
  if (!data) return;
  const latest = getLatestTip(data);
  if (!latest) { Logger.log('No tips found in the data file.'); return; }
  sendDigestEmail(latest, data, [Session.getActiveUser().getEmail()]);
  Logger.log('Test email sent to ' + Session.getActiveUser().getEmail() + ' only, for issue #' + latest.issueNumber);
}

function fetchData() {
  try {
    const res = UrlFetchApp.fetch(DATA_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      Logger.log('Fetch failed with status: ' + res.getResponseCode());
      return null;
    }
    return JSON.parse(res.getContentText());
  } catch (e) {
    Logger.log('Error fetching or parsing data: ' + e);
    return null;
  }
}

function getLatestTip(data) {
  if (!data.tips || !data.tips.length) return null;
  return data.tips.reduce((a, b) => (b.issueNumber > a.issueNumber ? b : a));
}

function readEmailColumn(sheetId, headerName) {
  if (!sheetId) return [];
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return [];
    const headerRow = values[0].map(h => String(h).trim().toLowerCase());
    const col = headerRow.indexOf(headerName.trim().toLowerCase());
    if (col === -1) {
      Logger.log('Column "' + headerName + '" not found in sheet ' + sheetId + '.');
      return [];
    }
    return values.slice(1)
      .map(row => String(row[col] || '').trim().toLowerCase())
      .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  } catch (e) {
    Logger.log('Error reading sheet ' + sheetId + ': ' + e);
    return [];
  }
}

function getRecipientList() {
  const signups = new Set(readEmailColumn(SIGNUP_SHEET_ID, SIGNUP_EMAIL_HEADER));
  const unsubs = new Set(readEmailColumn(UNSUB_SHEET_ID, UNSUB_EMAIL_HEADER));
  STATIC_RECIPIENTS.forEach(e => signups.add(String(e).trim().toLowerCase()));
  unsubs.forEach(e => signups.delete(e));
  return Array.from(signups);
}

function sendDigestEmail(tip, data, recipients) {
  const tool = data.tools[tip.tool];
  const tipUrl = SITE_URL + 'tip.html?id=' + encodeURIComponent(tip.id);
  const subject = 'Weekly Tech Tip #' + tip.issueNumber + ': ' + tip.title;

  const htmlBody =
    '<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;">' +
      '<p style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#00897B;font-weight:600;margin:0 0 6px;">' +
        tool.name + ' &middot; Issue No. ' + tip.issueNumber +
      '</p>' +
      '<h2 style="margin:0 0 14px;font-size:22px;color:#1D1D1F;">' + tip.title + '</h2>' +
      '<p style="font-size:15px;color:#444;margin:0 0 18px;">' + (tip.teaser || '') + '</p>' +
      '<p style="margin:0 0 20px;">' +
        '<a href="' + tip.video.url + '" style="color:#00897B;font-weight:600;text-decoration:none;">&#9654; Watch on YouTube</a>' +
        '&nbsp;&middot;&nbsp;' +
        '<a href="' + tipUrl + '" style="color:#00897B;font-weight:600;text-decoration:none;">Read the full tip</a>' +
      '</p>' +
      '<p style="font-size:13px;color:#888;border-top:1px solid #ddd;padding-top:14px;">' +
        'Curated by Mr. Falconer, Assistant Principal &middot; Grossmont Union High School District<br>' +
        'Questions? <a href="mailto:mfalconer@guhsd.net">mfalconer@guhsd.net</a> &middot; ' +
        '<a href="' + SITE_URL + 'archive.html">See all past tips</a> &middot; ' +
        '<a href="' + UNSUBSCRIBE_FORM_URL + '">Unsubscribe</a>' +
      '</p>' +
    '</div>';

  GmailApp.sendEmail(Session.getActiveUser().getEmail(), subject, '', {
    htmlBody: htmlBody,
    name: FROM_NAME,
    bcc: recipients.join(',')
  });
}

// Optional: sends a one-time welcome email the moment someone signs up.
// To enable: open the linked signup spreadsheet > Extensions > Apps Script
// (or Triggers in this project) > + Add Trigger > function: onSignupSubmit
// > Event source: From spreadsheet > On form submit.
function onSignupSubmit(e) {
  try {
    const email = e.namedValues[SIGNUP_EMAIL_HEADER][0];
    if (!email) return;
    GmailApp.sendEmail(email,
      'You\'re signed up for GUHSD AI Tech Tips',
      'You\'ll get a short email whenever a new weekly tip is published. ' +
      'See past tips anytime at ' + SITE_URL + 'archive.html\n' +
      'Want to stop? ' + UNSUBSCRIBE_FORM_URL + '\n\n' +
      '— Mr. Falconer, Assistant Principal',
      { name: FROM_NAME }
    );
  } catch (err) {
    Logger.log('onSignupSubmit error: ' + err);
  }
}
