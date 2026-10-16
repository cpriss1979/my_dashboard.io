# Cloud dashboard

Current cloud-enabled source for [the live dashboard](https://my-day-personal-hub.cpriss.chatgpt.site/).

## Features

Calendar, projects and project archive, bookmarks, notes, daily priorities, and games. Finances supports separate people, monthly income and bills, recurring entries, archive access, per-month Paid checkboxes, and printable monthly bills.

## Cloud data

Sign in with the same ChatGPT account on each device to sync. The server stores separate documents per authenticated user in Cloudflare D1. Personal dashboard entries, local caches, database contents, and credentials are not included in this repository.

This is a manual-upload source package with unused starter components removed. Upload the extracted cloud-dashboard folder, not this ZIP. It contains fewer than 100 files, and the full dashboard module and lockfile are already included; no restore script or source-parts folder is needed.

The original static files at the repository root are preserved. This folder contains the newer server-backed version. GitHub stores its source; GitHub Pages alone cannot run its server API, D1 database, or Sites-managed ChatGPT authentication. The existing live URL remains the working cloud deployment. Copying this source does not copy saved user data.

## Development

Requires Node.js >=22.13.0. From this directory run `npm ci`, then `npm run dev`. The local preview uses simulated ChatGPT sign-in; see STARTER.md for setup and database migration instructions. Use `npm run build` to build.

Key files: `lib/dashboard-html.ts` contains the dashboard interface, `app/route.ts` serves the signed-in interface, `app/api/state/route.ts` handles per-user sync, and `db/schema.ts` plus `drizzle/` define the database. `.openai/hosting.json` identifies the existing Sites deployment and DB binding; it contains no secret credentials. Standalone hosting requires configuring trusted authentication and a D1 database; do not expose the API behind an untrusted identity header.

## Moving older entries to cloud

Export backup in the older dashboard, then Restore backup once in the live cloud dashboard. Use the live URL on your devices and in Plash.
