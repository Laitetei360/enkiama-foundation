# Vercel Deployment

This project is configured to deploy the existing static frontend and Express API on Vercel while keeping Supabase as the database and storage layer.

## Project Structure

- `frontend/` contains the static public website and admin pages.
- `backend/app.js` exports the Express app used by Vercel serverless functions.
- `backend/server.js` starts the same app for local development.
- `api/index.js` is the Vercel serverless entrypoint for all `/api/*` routes.
- `vercel.json` rewrites public pages/assets from `frontend/` and keeps API paths under `/api/...`.

## Required Vercel Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

Recommended optional variables:

- `FRONTEND_URL` set to your production Vercel URL, for example `https://your-project.vercel.app`
- `ANALYTICS_IP_HASH_SALT`
- `API_RATE_LIMIT_MAX`
- `ADMIN_RATE_LIMIT_MAX`
- `CMS_RATE_LIMIT_MAX`
- `ANALYTICS_RATE_LIMIT_MAX`

Do not add the Supabase service role key to any frontend JavaScript or `NEXT_PUBLIC_*` variable.

## Local Development

From the project root:

```bash
npm install
npm start
```

The local server still serves the static frontend and all API routes at the same paths.

## Vercel Behavior

- `/` opens `frontend/index.html`.
- `/admin-login.html` opens the admin login page.
- `/admin.html` opens the dashboard.
- `/api/...` requests are handled by the Express app through a Vercel serverless function.
