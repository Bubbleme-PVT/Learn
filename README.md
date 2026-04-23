# Shopify Mastery Platform

A modular Vite + vanilla JavaScript learning dashboard for Shopify development.

## What changed from the monolithic prototype

- split into `index.html`, `styles/main.css`, `src/*.js`, and `data/*.json`
- course content moved to JSON so topics/resources/chapters can be updated without editing UI logic
- exact primary topic tabs: **Concepts**, **Code**, **Videos**
- exact category filters: Liquid, Sections, Metafields, Apps, APIs, JavaScript, Tools
- no `alert()` popups; all feedback uses toasts
- persistent local state for:
  - completed topics
  - bookmarks
  - notes
  - quiz results
  - selected theme
  - streaks
  - daily goals
- export/import progress
- roadmap, analytics, glossary, study planner, and certificate support

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser.

## Architecture

```text
index.html
styles/main.css
src/
  main.js
  data-loader.js
  render.js
  store.js
  utils.js
data/
  topics.json
  chapters.json
  resources.json
  glossary.json
  projects.json
```

## Backend-ready next steps

This version fixes the biggest architectural flaw by removing the giant single-file app, but it is still a frontend-only learning platform. To turn it into a full SaaS academy, add:

- Supabase/Firebase auth
- synced cloud progress
- admin CMS/editor for topics and videos
- analytics event pipeline
- certificates stored per learner
- server-side content moderation / discussion threads


## Added standalone offline encyclopedia

This project also includes `shopify_mastery_platform_encyclopedic_offline.html`, a single-file offline-capable SPA that bundles curriculum data, UI logic, resources, progress tracking, bookmarks, notes, quizzes, and embedded video tabs into one portable artifact.
