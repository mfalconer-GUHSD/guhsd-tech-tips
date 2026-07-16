/**
 * GUHSD Weekly Tech Tips — Staff Email Digest
 * Runs on a weekly timer. Checks the site's live data file for a new
 * issue and, if one has been published since the last send, emails a
 * short summary to staff. If no new issue exists, it does nothing —
 * safe to leave running every week even during slow weeks.
 *
 * SETUP
 * 1. Go to https://script.google.com > New project (sign in with your
 *    guhsd.net Google account).
 * 2. Delete the placeholder code and paste this entire file in.
 * 3. Change STAFF_EMAIL below to your staff Google Group address.
 * 4. Run `sendTestEmail` once: top toolbar > function dropdown >
 *    select "sendTestEmail" > Run. The first run will ask you to
 *    authorize Gmail access under your own account — approve it.
 *    This sends a real test email regardless of "new issue" status,
 *    so you can check formatting before relying on it.
 * 5. Set the real trigger: click the clock icon (Triggers) in the left
 *    sidebar > + Add Trigger > function: checkAndSendDigest >
 *    Event source: Time-driven > Week timer > pick a day (e.g. Monday)
 *    and a time window (e.g. 6am–7am) > Save.
 * 6. Done. From now on, whenever data/tips-data.json on GitHub gets a
 *    new issueNumber, the next scheduled run emails it automatically.
 *    Nothing else to maintain unless the site URL or repo path changes.
 */

const DATA_URL = 'https://raw.githubusercontent.com/mfalconer-GUHSD/guhsd-tech-tips/main/data/tips-data.json';
const SITE_URL = 'https://mfalconer-guhsd.github.io/guhsd-tech-tips/';
const STAFF_EMAIL = 'all-staff@guhsd.net'; // <-- change to your actual staff Google Group
const FROM_NAME = 'Mr. Falconer — AI Tech Tips';

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

  sendDigestEmail(latest, data);
  PropertiesService.getScriptProperties().setProperty('lastIssueSent', String(latest.issueNumber));
  Logger.log('Sent issue #' + latest.issueNumber);
}

// Manually run this once to test formatting/authorization before trusting the trigger.
function sendTestEmail() {
  const data = fetchData();
  if (!data) return;
  const latest = getLatestTip(data);
  if (!latest) { Logger.log('No tips found in the data file.'); return; }
  sendDigestEmail(latest, data);
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

function sendDigestEmail(tip, data) {
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
        '<a href="' + SITE_URL + 'archive.html">See all past tips</a>' +
      '</p>' +
    '</div>';

  GmailApp.sendEmail(STAFF_EMAIL, subject, '', {
    htmlBody: htmlBody,
    name: FROM_NAME
  });
}
