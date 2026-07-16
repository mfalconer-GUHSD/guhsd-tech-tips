/**
 * GUHSD Weekly Tech Tips — Staff Email Digest (v2: self-serve signup)
 * Runs on a weekly timer. Checks the site's live data file for a new
 * issue and, if one has been published since the last send, emails a
 * short summary to everyone on the signup list (minus anyone who has
 * unsubscribed). If no new issue exists, it does nothing.
 *
 * SETUP — signup form
 * 1. Go to forms.google.com > + Blank form. Title: "AI Tech Tips — Sign Up".
 * 2. Add one question: "Email address" (Short answer).
 * 3. Settings (gear icon) > Responses > turn on "Collect email addresses"
 *    AND, if available for your Workspace, restrict to your organization
 *    so only guhsd.net accounts can respond.
 * 4. Responses tab > click the green Sheets icon to create a linked
 *    spreadsheet. Open that spreadsheet, copy its ID from the URL:
 *    https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
 * 5. Paste that ID into SIGNUP_SHEET_ID below.
 * 6. Put the signup form's shareable link in your weekly email footer,
 *    on the website, in a staff bulletin, etc.
 *
 * SETUP — unsubscribe form (optional but recommended)
 * Repeat the same steps with a form titled "AI Tech Tips — Unsubscribe",
 * and paste that spreadsheet's ID into UNSUB_SHEET_ID below. Leave it as
 * an empty string ('') if you'd rather skip this for now.
 *
 * SETUP — the script itself
 * 1. Go to https://script.google.com > New project (your guhsd.net account).
 * 2. Paste this entire file in, replacing the placeholder code.
 * 3. Fill in SIGNUP_SHEET_ID (required) and UNSUB_SHEET_ID (optional) below.
 * 4. Run `sendTestEmail` once (function dropdown > Run) to authorize Gmail
 *    and Sheets access, and to confirm formatting. This always sends,
 *    regardless of whether there's a "new" issue.
 * 5. Set the real trigger: clock icon (Triggers) > + Add Trigger >
 *    function: checkAndSendDigest > Time-driven > Week timer > pick a
 *    day/time > Save.
 * 6. Done. Publishing a new issue in tips-data.json is now the only
 *    manual step — signup, unsubscribe, and sending are all automatic.
 */

const DATA_URL = 'https://raw.githubusercontent.com/mfalconer-GUHSD/guhsd-tech-tips/main/data/tips-data.json';
const SITE_URL = 'https://mfalconer-guhsd.github.io/guhsd-tech-tips/';
const FROM_NAME = 'Mr. Falconer — AI Tech Tips';

// The public forms staff use to manage their own subscription:
const SIGNUP_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSflh2l3PXs2NGAHv6u-hGjKtv7XPMycD4LKFdD82O3FxRU_Rg/viewform?usp=publish-editor';
const UNSUBSCRIBE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfEVWKtF0WgzySXhqXC0zeQNQlFlvSvH96vi9dVrbIH07-2TA/viewform?usp=publish-editor';

// Signup form's response-spreadsheet ID:
const SIGNUP_SHEET_ID = '1Ih6HpPXXAjzlpAWbEWmnHSww4GJnaqBGXesj7sX2Ins';
const SIGNUP_EMAIL_HEADER = 'Email Address'; // must match the header text in that sheet

// Unsubscribe form's response-spreadsheet ID:
const UNSUB_SHEET_ID = '1q-9Z9Qzxub-0QvKF_ickjmp9HcAmms0qP5aAdhfvJws';
const UNSUB_EMAIL_HEADER = 'Email Address';

// Any extra addresses/groups always included regardless of signup, e.g. ['staff@yourschool.guhsd.net']:
const STATIC_RECIPIENTS = [];

function checkAndSendDigest() {
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
  Logger.log('Sent issue #' + latest.issueNumber + ' to ' + recipients.length + ' recipient(s).');
}

// Manually run this once to test formatting/authorization before trusting the trigger.
function sendTestEmail() {
  const data = fetchData();
  if (!data) return;
  const latest = getLatestTip(data);
  if (!latest) { Logger.log('No tips found in the data file.'); return; }
  const recipients = getRecipientList();
  if (!recipients.length) { Logger.log('No recipients found yet — that\'s okay for a first test.'); }
  sendDigestEmail(latest, data, recipients.length ? recipients : [Session.getActiveUser().getEmail()]);
  Logger.log('Test email sent for issue #' + latest.issueNumber);
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
