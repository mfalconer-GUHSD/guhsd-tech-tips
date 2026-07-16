/**
 * GUHSD Weekly Tech Tips — Staff Email Digest (v3.1: school-calendar-aware)
 *
 * Runs on a DAILY timer (not weekly — see below for why). Each day it
 * checks two things: (1) is today one of the pre-approved send dates for
 * the 2026-27 school year, and (2) has a new issue been published since
 * the last send. Only sends when both are true. On every other day it
 * does nothing.
 *
 * WHY DAILY, NOT WEEKLY:
 * Google's built-in weekly trigger can only fire on a fixed day every
 * single week — it has no way to skip Thanksgiving/Winter/Spring break
 * weeks or shift off a Monday holiday. So instead, the trigger fires
 * every day, and SEND_DATES (below) is the explicit, verified list of
 * dates tips actually go out. Adding this list is what encodes "skip
 * break weeks" and "shift holiday Mondays to Tuesday."
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
 * - Last day of student attendance: Thu Jun 3, 2027 (no send after May 31/Jun 1)
 * If GUHSD updates next year's calendar, update SEND_DATES accordingly —
 * this list needs refreshing every school year.
 *
 * IMPORTANT — sendTestEmail is safe to run anytime:
 * It ONLY ever sends to your own account (Session.getActiveUser().getEmail()),
 * never to STATIC_RECIPIENTS or the signup list. That's intentional — a "test"
 * should never actually reach real staff, especially during summer break when
 * nobody should be getting these yet. Only checkAndSendDigest (the real
 * scheduled function) sends to actual recipients, and only on a SEND_DATES day.
 *
 * SETUP
 * 1. Go to https://script.google.com > New project (your guhsd.net account).
 * 2. Paste this entire file in, replacing whatever's there now.
 * 3. Run `sendTestEmail` once (function dropdown > Run) to authorize Gmail
 *    and Sheets access, and to confirm formatting. This only emails you.
 * 4. Set the real trigger: clock icon (Triggers) > + Add Trigger >
 *    function: checkAndSendDigest > Time-driven > Day timer > pick any
 *    time window (e.g. 6am-7am) > Save. (Day timer, NOT week timer —
 *    the script itself decides which days actually send.)
 * 5. Done. Publishing a new issue in tips-data.json before its scheduled
 *    SEND_DATES date is the only manual step from here on.
 */

const DATA_URL = 'https://raw.githubusercontent.com/mfalconer-GUHSD/guhsd-tech-tips/main/data/tips-data.json';
const SITE_URL = 'https://mfalconer-guhsd.github.io/guhsd-tech-tips/';
const FROM_NAME = 'Mr. Falconer — AI Tech Tips';
const TIMEZONE = 'America/Los_Angeles';

// The public forms staff use to manage their own subscription:
const SIGNUP_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSflh2l3PXs2NGAHv6u-hGjKtv7XPMycD4LKFdD82O3FxRU_Rg/viewform?usp=publish-editor';
const UNSUBSCRIBE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfEVWKtF0WgzySXhqXC0zeQNQlFlvSvH96vi9dVrbIH07-2TA/viewform?usp=publish-editor';

// Signup form's response-spreadsheet ID:
const SIGNUP_SHEET_ID = '1Ih6HpPXXAjzlpAWbEWmnHSww4GJnaqBGXesj7sX2Ins';
const SIGNUP_EMAIL_HEADER = 'Email Address'; // must match the header text in that sheet

// Unsubscribe form's response-spreadsheet ID:
const UNSUB_SHEET_ID = '1q-9Z9Qzxub-0QvKF_ickjmp9HcAmms0qP5aAdhfvJws';
const UNSUB_EMAIL_HEADER = 'Email Address';

// Always-included recipients regardless of the signup form (Google Group + individuals).
// These are only ever used by the REAL send (checkAndSendDigest) on a scheduled date —
// sendTestEmail never touches this list.
const STATIC_RECIPIENTS = [
  'ghhs-certificated-staff@guhsd.net',
  'cgaeir@guhsd.net',
  'agarcia@guhsd.net'
];

// Verified send dates for the 2026-27 school year (see header comment for the logic behind these).
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

function checkAndSendDigest() {
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  if (SEND_DATES.indexOf(today) === -1) {
    Logger.log('Today (' + today + ') is not a scheduled send date. Skipping.');
    return;
  }

  const data = fetchData();
  if (!data) return;

  const latest = getLatestTip(data);
  if (!latest) return;

  const lastSent = Number(PropertiesService.getScriptProperties().getProperty('lastIssueSent') || 0);
  if (latest.issueNumber <= lastSent) {
    Logger.log('No new issue since last send (last sent: #' + lastSent + ').');
    return;
  }

  const recipients = getRecipientList();
  if (!recipients.length) {
    Logger.log('No recipients found — check SIGNUP_SHEET_ID and that the sheet has responses.');
    return;
  }

  sendDigestEmail(latest, data, recipients);
  PropertiesService.getScriptProperties().setProperty('lastIssueSent', String(latest.issueNumber));
  Logger.log('Sent issue #' + latest.issueNumber + ' to ' + recipients.length + ' recipient(s) on ' + today + '.');
}

// Manually run this anytime to check formatting/authorization. ALWAYS sends only to your
// own account — never to STATIC_RECIPIENTS or the signup list, and ignores SEND_DATES.
// Safe to run during summer break or any other time without emailing real staff.
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
