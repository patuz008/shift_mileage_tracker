# Logbook — Shift & Mileage Tracker (mobile PWA)

Same app as before, upgraded to install on your Android phone as a home-screen app with offline support and a real historical record — not just a browser tab.

## What changed from the desktop version

- **Storage**: moved from `localStorage` to **IndexedDB** (via `idb.js`), so your data isn't a flat list anymore — it's queryable by date and has no practical size limit.
- **History browsing**: the Shifts tab has a "Choose a month…" filter to look back at any month you've logged. The Mileage tab has a "Monthly history" table showing totals for every month you have data for.
- **Installable**: `manifest.json` + `sw.js` (service worker) let Chrome offer "Add to Home screen" and let the app work offline once installed.
- **Migration**: if you used the earlier browser-only version on this same device/browser, `idb.js` copies that data into IndexedDB automatically the first time you load the new version, so nothing is lost.

## Files

```
logbook-pwa/
├── index.html
├── style.css
├── app.js          → app logic, now async and IndexedDB-backed
├── idb.js          → IndexedDB storage helper
├── manifest.json   → PWA install metadata
├── sw.js           → service worker (offline caching)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## Step 1 — Run and test it in VS Code

1. Open the `logbook-pwa` folder in VS Code.
2. Install the **Live Server** extension if you don't have it (Extensions panel → search "Live Server").
3. Right-click `index.html` → **Open with Live Server**.
4. Confirm the app loads, you can add a shift/trip, and reloading the page keeps your data (that's IndexedDB working).

At this point the service worker will register fine on `localhost`, but Chrome's install prompt and IndexedDB behave slightly differently on your phone — see the next step.

## Step 2 — Get it onto your Android phone

A phone install needs the app served over **HTTPS** (browsers only allow "Add to Home screen" and offline service workers on a secure origin — `localhost` is a special exception that doesn't apply to your phone). The simplest free option:

1. **Push the folder to GitHub**, then enable **GitHub Pages** for the repo (Settings → Pages → deploy from the branch/folder). You'll get a URL like `https://yourname.github.io/logbook-pwa/`.
   - Alternatives that work just as well: **Netlify Drop** (drag-and-drop the folder at app.netlify.com/drop, no account needed) or **Vercel**.
2. On your Android phone, open that URL in **Chrome**.
3. Tap the **⋮ menu → Add to Home screen** (Chrome may also prompt you automatically after a few visits).
4. Open it from your home screen — it now runs full-screen like a native app, works offline, and keeps its own separate storage from your browser tabs.

## Step 3 — Reminders on your phone

Tap **Enable reminders** inside the app and accept the Chrome notification permission. As before, this only fires while the app is open in the foreground or background tab — true background push notifications (firing even when the app is fully closed) need a server component, which we can add later if you want it.

## Your data, going forward

- Lives in IndexedDB **on that phone**, inside the installed app — not synced anywhere else. Uninstalling the app or clearing site data in Chrome will erase it, so it's worth occasionally exporting a backup (I can add a "Export to CSV" button if that'd help).
- If you later decide you do want cross-device sync (phone + laptop), that's a bigger step — a small backend (e.g. Firebase or Supabase) to hold the data instead of IndexedDB. Straightforward to add on top of this if your needs change.
