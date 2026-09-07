# ProSafe Feedback

Node.js/Vercel serverless port of the original `feedback.php` script, plus a
matching feedback form UI.

## Structure

```
prosafe-feedback/
├── api/
│   └── feedback.js     ← serverless function (was feedback.php)
├── public/
│   └── index.html      ← feedback form UI
├── package.json
└── .env.example
```

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside it with the
   Vercel CLI — no repo needed).
2. Import the repo at https://vercel.com/new, or run:
   ```
   npx vercel
   ```
3. In the Vercel project dashboard → **Settings → Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `RESEND_API_KEY` | your Resend API key (from resend.com) |
   | `FEEDBACK_TO_EMAIL` | the email you signed up to Resend with |
   | `FEEDBACK_FROM` | *(optional)* `ProSafe Feedback <onboarding@resend.dev>` |
4. Redeploy (env var changes require a redeploy). Your form is live at
   `https://<your-project>.vercel.app/`, posting to `/api/feedback`.

## Local testing

```
npm i -g vercel
cp .env.example .env   # fill in real values
vercel dev
```

## Notes on what changed from the PHP version

- **Session-based rate limiting → in-memory per-IP limiting.** Serverless
  functions have no persistent PHP session. The Node version rate-limits by
  request IP instead, using a plain in-memory `Map`. This is best-effort:
  because Vercel may spin up multiple instances of the function, a
  determined abuser could exceed 5/hour in rare cases. For a hard limit
  across all instances, swap the `Map` in `api/feedback.js` for
  [Vercel KV](https://vercel.com/docs/storage/vercel-kv) or Upstash Redis —
  happy to wire that up if you want it.
- **`curl` → `fetch`.** Vercel's Node runtime has `fetch` built in, so no
  extra dependency is needed.
- Everything else (Resend payload, HTML escaping, 5000-char cap, error
  responses) behaves the same as the original PHP script.
