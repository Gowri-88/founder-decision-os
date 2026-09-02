# Founder Decision OS

Turn a chaotic product wishlist into two focused current bets.

## Overview

Founder Decision OS is a lightweight ritual tool for startup founders, CEO-PMs, solo PMs, and early-stage Heads of Product. It helps you capture ideas as bounded "bets," compare trade-offs, choose no more than two current bets at a time, park the rest with a stated reason, and keep a weekly decision log — all stored locally in your browser.

This is a static HTML, CSS, and vanilla JavaScript app. There is no backend, no account system, and no external services.

## Features

- **Bets CRUD** — capture bets with a problem, hypothesis, success metric, owner, and review date.
- **Strict two-current-bet limit** — every path to making a bet "current" (Bets list, Bet Detail, Bet Council) enforces a maximum of two current bets at once.
- **Parking with a reason** — moving a bet out of consideration always requires a stated reason.
- **Bet Council** — the core weekly ritual screen: review current bets, backlog/ideas, and parked bets side by side, with a council checklist.
- **Decision Signal** — a transparent, user-scored prioritization aid (Strategy Fit + Upside + Evidence + Reversibility − Cost − Risk). It starts a conversation; it does not decide.
- **Bottleneck Signal** — a practical, transparent focus-risk heuristic (0–100) based on overdue reviews, stale ideas, and active-work load. It is not a scientific measurement or a performance score.
- **Decision Debt** — a visible count of unresolved work: overdue current bets, stale ideas, current bets without a progress note, and parked bets without a reason.
- **Deterministic Bet Brief** — a structured, copyable brief generated from each bet's own data. No AI, no network calls.
- **Deterministic Decision Logs** — weekly, editable, copyable logs generated from the current state of your workspace, with full manual editing.
- **Filtering, search, and sorting** on the Bets screen.
- **Dynamic demo workspace** — a realistic fictional B2B SaaS company (RelayDesk) with dates generated relative to today.
- **Reset workspace** — clears all local data and returns to a first-run state.
- **Responsive layout** — desktop sidebar navigation and a mobile header with a slide-in menu.

## Screenshots

(No screenshot files are included in this repository.)

## Why V0 has no login

This version intentionally removes account-creation friction so founders and PMs can try the decision ritual immediately. Data is stored locally in the browser.

## Local use

Open `index.html` directly in a browser (double-click the file, or drag it into a browser window). No build step, server, or install process is required.

## Testing locally

1. Open `index.html` in Chrome.
2. From the Dashboard, click **Try demo workspace** to load a realistic sample RelayDesk workspace.
3. Visit **Bets**, **Bet Council**, **Decision Logs**, and **How it works** from the sidebar (or the menu button on mobile) to confirm each screen renders.
4. Create, edit, park, and delete a bet to confirm changes persist after refreshing the page.
5. Try to make a third bet current from the Bets list, a Bet Detail page, and Bet Council — each should block the action once two bets are current.
6. Use **Reset workspace** to confirm it clears local data and returns to the first-run welcome screen.

## Deploying

### GitHub — push this project

```
git init
git add .
git commit -m "Build Founder Decision OS MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/founder-decision-os.git
git push -u origin main
```

### GitHub Pages

Repository **Settings → Pages → Deploy from a branch → main → /(root)**.

### Netlify

Import the GitHub repository. No build command is required. Set the publish directory to the repository root.

### Vercel

Import the GitHub repository. Framework Preset: **Other**. No build command. Output directory: `.`. No environment variables are needed.

## Limitation

Data is private to each browser/device. Clearing your browser's site data removes it permanently. There is no cross-device sync or collaboration in V0.

## V1 roadmap

- Accounts and cloud persistence
- Teams and collaboration
- Reminders for upcoming review dates
- Exports (CSV/PDF)
- Optional AI-assisted drafting for Bet Briefs, after the manual version has been validated with real users

## Disclaimer

Decision Signal and Bottleneck Signal are practical heuristics intended to support discussion. They are not scientific measurements or automatic decision systems.
