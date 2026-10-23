# Hydro — Water Reminder Tracker

A React + Vite water intake tracker built with plain JavaScript.

## Features
- Daily water goal (default: 2500 ml)
- Quick add buttons (150 ml, 250 ml, 500 ml) and custom amounts
- Daily progress ring and remaining amount
- Water history grouped by day, with timestamps and delete actions
- Seven-day intake insights
- Browser notification reminders at 30, 45, or 60 minute intervals
- Settings and localStorage persistence
- Responsive blue dashboard UI

## Requirements
- Node.js 18 or newer (Node.js 20 LTS recommended)
- npm
- A modern browser

## Install and run
1. Extract `water-reminder-tracker.zip`.
2. Open a terminal inside the extracted `water-reminder-tracker` folder.
3. Install packages:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Production build
```bash
npm run build
npm run preview
```

## Enable notifications
1. Open the app on `localhost` or an HTTPS website.
2. Click **Enable reminders**.
3. Allow notifications in the browser prompt.
4. Pick the interval in **Settings**.

Browser notifications are not available on every browser. Notifications require permission and a secure context (localhost is treated as secure). This implementation uses a page timer, so reminders are intended to work while the app is open. Browsers can throttle background tabs, and reminders are not guaranteed after the tab/browser is closed. For reliable closed-app reminders, add a PWA/service-worker push setup or a native app.

## How localStorage works
The app stores one JSON object under this key:

```js
const STORAGE_KEY = "hydro-tracker-v1";
```

It contains the daily goal, reminder interval, reminder enabled state, and water entries. The app loads saved state when React starts and writes updates back whenever state changes. Data remains in that browser profile until site data is cleared; it does not sync across devices or browsers.

## How `useEffect` is used
- Save React state to localStorage whenever the saved app state changes.
- Create and clean up the reminder interval when reminder settings change.
- Update the displayed clock periodically.
- Clear temporary toast messages after a short delay.

## Notes
- All source code is JavaScript / JSX, not TypeScript.
- The 2500 ml goal is an editable tracking target, not a medical prescription. Adjust fluid intake for thirst, activity, heat, and any medical advice.
- Google Fonts are imported from the web; the app still works with fallback fonts if they do not load.
