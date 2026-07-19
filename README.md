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
HF_TOKEN=your_hugging_face_token
HF_MODEL=openai/gpt-oss-20b:fastest
```

`HF_TOKEN` enables hosted Hugging Face conversational answers. If it is missing, or if hosted inference quota is unavailable, the app still works in excerpt-search mode from the rules document.

Create a Hugging Face token:

1. Go to `https://huggingface.co/settings/tokens`.
2. Create a fine-grained token.
3. Enable permission to make calls to Inference Providers.
4. Copy the token into `.env.local` locally and into Vercel environment variables.

Hugging Face hosted inference is not free and unlimited. Free accounts receive limited credits/rate-limited access. The app's built-in document-search fallback is the unlimited no-cost path.

## Deploy To Vercel

1. Push this folder to a GitHub/GitLab/Bitbucket repository.
2. In Vercel, choose **New Project** and import the repository.
3. Add `HF_TOKEN` under **Settings > Environment Variables**.
4. Optionally add `HF_MODEL=openai/gpt-oss-20b:fastest`.
5. Deploy.
6. Share the production URL with your team.

The default Vercel build command is `npm run build`; no custom output directory is required.
