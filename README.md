# A Third Was To Do

A tiny Mac menu bar app with two tabs.

- **Calendar**: your Google Calendar, showing the last hour and the next five hours, with a red line for right now.
- **To-do**: a numbered list. Add as many as you want, drag to reorder, click the box to cross off, double-click to edit.

No accounts, no AI, no servers. Your to-dos stay on your Mac.

## Get it

Go to the **Releases** page and download the `.dmg`, drag the app into Applications, and open it. A small checkbox icon appears by your clock. Click it.

The app isn't signed with an Apple developer certificate, so the first time, right-click the app, choose **Open**, then **Open** again.

Right-click the menu bar icon for **Launch at login** and **Quit**.

## Connect Google Calendar

1. Open Google Calendar on the web, then Settings.
2. Pick your calendar in the left list.
3. Scroll to **Secret address in iCal format** and copy it.
4. In the app, click **Link** (top right) and paste it.

Add more than one calendar later by repeating this with each calendar's link, one at a time (the app reads one link for now). Keep the link private, anyone with it can see your calendar.

## Run from source

```bash
npm install
npm start
```

## Build the Mac app yourself

```bash
npm run dist
```

Or push a tag like `v1.0.0` and GitHub Actions builds the `.dmg` and attaches it to a release.

## Tweak the window

In `src/app.js`, `HOURS_BACK` and `HOURS_AHEAD` control the calendar window.
