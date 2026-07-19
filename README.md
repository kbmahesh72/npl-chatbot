# NPL BLAST Rules Chatbot

A Next.js chatbot grounded in `data/cricket-rules.md`, extracted from `Criket_Rules.docx`.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Set these locally in `.env.local` and in Vercel project settings:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
```

`GEMINI_API_KEY` is recommended for conversational answers. If it is missing, the app still works in excerpt-search mode.

Create a free Gemini API key in Google AI Studio:

1. Go to `https://aistudio.google.com/app/apikey`.
2. Sign in with your Google account.
3. Click **Create API key**.
4. Copy the key into `.env.local` locally and into Vercel environment variables.

## Deploy To Vercel

1. Push this folder to a GitHub/GitLab/Bitbucket repository.
2. In Vercel, choose **New Project** and import the repository.
3. Add `GEMINI_API_KEY` under **Settings > Environment Variables**.
4. Optionally add `GEMINI_MODEL=gemini-3.5-flash`.
5. Deploy.
6. Share the production URL with your team.

The default Vercel build command is `npm run build`; no custom output directory is required.
