# Brenton & Bre’s wedding countdown

A black-and-silver wedding page with a softly desaturated photo background and black overlay. A responsive page with a live countdown, month calendar and downloadable calendar event. No build tools or account keys required.

## Put it live on GitHub Pages

1. Create a GitHub repository (for example, `brenton-and-bre`). Use a public repository if you want free GitHub Pages hosting.
2. Upload `index.html`, the `assets` folder, and `.nojekyll` to the repository’s top level. Do not upload the ZIP itself.
3. Open the repository’s **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**, then **main** and **/ (root)**. Save.
5. GitHub will show the published address on that screen after deployment, typically `https://YOUR-USERNAME.github.io/brenton-and-bre/`.

## Wedding date and time

The page uses **April 17, 2027 at 2:00 p.m. America/Chicago** as requested. At the ceremony time, the timer disappears and the page displays “Congratulations”.

To set a different year for every visitor, edit this line in `index.html`:

```js
const WEDDING_DATE = '2027-04-17';
```

The following two lines control the ceremony time and time zone. Daylight saving time is handled automatically.

```js
const WEDDING_TIME = '14:00';
const TIME_ZONE = 'America/Chicago';
```

If you change the date, also update the description near the top of the file. 

The timer counts down to the exact ceremony time. “Save the date” downloads a calendar entry with the ceremony start time and a one-hour placeholder duration; no wedding end time or venue has been supplied.

The page uses Google Fonts when available, with local font fallbacks. The background photo is included in `assets/couple.jpeg`. Keep that folder beside `index.html` when uploading to GitHub.
