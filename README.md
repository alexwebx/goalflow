# GoalFlow

GoalFlow is an MVP task and time management app that keeps execution linked to goals.

## Stack

- React + Vite + TypeScript
- Zustand
- IndexedDB via `idb`
- GitHub Pages compatible routing via `HashRouter`

## Features

- Hierarchy: `Goal -> Project -> Task`
- Task time tracking with start/stop timer
- Manual time entry
- Auto-stop protection for forgotten timers after 12 hours
- Aggregated time and goal progress
- Filters:
  - tasks without goal
  - tasks over 4 hours
  - tasks due this week
- Quick task input
- Hotkeys:
  - `N` for new task
  - `Cmd/Ctrl + K` for command palette
  - `Cmd/Ctrl + F` for search
- JSON export/import
- Local-first persistence in IndexedDB

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Data model

- `Goal`
- `Project`
- `Task`
- `TimeEntry`

All data is stored in IndexedDB in the browser.

## GitHub Pages deploy

This project is configured for GitHub Pages static hosting:

- router: `HashRouter`
- Vite `base`: `/goalflow/`
- build output: `dist`
- deploy target: `gh-pages` branch
- workflow file: `.github/workflows/deploy.yml`

Important:

1. Open repository `Settings -> Pages`
2. Set `Source` to `Deploy from a branch`
3. Select branch `gh-pages`
4. Select folder `/ (root)`

This project intentionally does not use `configure-pages` or `deploy-pages`.

## Usage

1. Create a goal if needed.
2. Add a project under a goal if needed.
3. Create tasks through quick input, modal, or command palette.
4. Start and stop the timer inside a task.
5. Use filters and search to focus the list.
6. Export JSON for backup or import it back later.
# goalflow
