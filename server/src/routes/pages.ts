// Public pages Google requires before the sign-in can leave Testing: home, privacy policy, terms.
const CONTACT = 'aamoghsawantt@gmail.com';
const UPDATED = '10 October 2026';

function page(title: string, body: string) {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 680px; margin: 40px auto; padding: 0 16px; line-height: 1.55;
         color: #141414; background: #fbfbf9; }
  h1 { font-size: 28px; } h2 { font-size: 18px; margin-top: 28px; } a { color: #2547d0; }
  footer { margin-top: 40px; font-size: 14px; color: #6a6a66; }
</style></head><body>${body}
<footer><a href="/">Fobo</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · ${CONTACT}</footer>
</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

const home = () => page('Fobo', `
<h1>Fobo</h1>
<p>Fobo (Fear of Burning Out) is a capacity planner. Free time is not the same as having energy: Fobo learns how
much each plan costs you, shows when a week is getting too full, and helps you protect time to recharge.</p>
<p>Sign in with Google to bring in your Google Calendar. Friends you accept can see when you are busy and how full
your days are, never the details unless you choose to share them.</p>`);

const privacy = () => page('Fobo privacy policy', `
<h1>Privacy policy</h1>
<p>Last updated ${UPDATED}.</p>
<h2>What Fobo collects</h2>
<ul>
<li>From your Google account: your name, email address and Google account id.</li>
<li>From Google Calendar, for the calendars shown in your Google Calendar: each event's title, time and the names
or emails of other attendees, plus a token that lets Fobo keep your calendar in sync.</li>
<li>What you enter in Fobo: plans, energy costs, onboarding answers, your character, and the friends you add.</li>
</ul>
<h2>How Fobo uses it</h2>
<ul>
<li>To show your week, how full each day is, and your profile.</li>
<li>To share with friends you have accepted only what your settings allow: when you are busy, each day's load,
and the titles of plans you mark as open.</li>
<li>When you ask Fobo to fix your week, your plans for the coming days and your profile answers are sent to
Google's Gemini API to suggest changes. Nothing changes on your calendar until you apply a suggestion, and changes
are written to Google Calendar only if you turn that on.</li>
</ul>
<h2>Sharing</h2>
<p>Fobo does not sell your data or use it for advertising. Data is stored with Neon (database and hosting) and
processed by Google for sign-in, Calendar and Gemini. Fobo's use and transfer of information received from Google
APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>
<h2>Keeping and deleting</h2>
<p>Your data is kept while you use Fobo. To delete your account and all of its data, or to ask a question, email
${CONTACT}. You can also remove Fobo's access at any time in your Google account's security settings.</p>`);

const terms = () => page('Fobo terms of service', `
<h1>Terms of service</h1>
<p>Last updated ${UPDATED}.</p>
<p>Fobo is an early project built for a hackathon and offered as is, without warranties. Energy scores and
suggestions are estimates, not medical or professional advice.</p>
<p>Use Fobo only with your own accounts and calendars, and do not use it to harm others or to break the law. We may
change or stop the service at any time.</p>
<p>Questions: ${CONTACT}.</p>`);

export const pageRoutes: { method: string; path: string; run: () => Promise<Response> }[] = [
  { method: 'GET', path: '/', run: async () => home() },
  { method: 'GET', path: '/privacy', run: async () => privacy() },
  { method: 'GET', path: '/terms', run: async () => terms() },
];
