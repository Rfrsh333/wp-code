This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Security Checks

Run the security smoke tests against a running dev server:

```bash
BASE=127.0.0.1:3001 bash scripts/security-check.sh
```

Expected: all checks report `OK` and the script finishes with `All security checks passed.`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Content Intelligence Pipeline

This repository now includes an additive content intelligence foundation for curated hospitality news, editorial drafting, and branded hero image generation. It does not replace the existing app or current static blog setup.

### How ingestion works

- Curated sources are stored in the `sources` table.
- RSS is the preferred ingest path; feed items are written to `raw_articles`.
- Article extraction normalizes full-page content into `normalized_articles`.
- AI classification writes relevance, audience, impact, and action metadata into `article_analysis`.
- Rules, dedupe, and clustering enrich that data before draft generation.
- A first manual ingest path is available from `/admin/news`:
  `Seed bronnen` -> `Run ingest` -> `Extract artikelen`

### How jobs run

- Trigger-ready job definitions live in `trigger/content-intelligence.jobs.ts`.
- Service-layer logic lives in `src/lib/content/services`.
- Job state is tracked in `job_runs`.
- The first implementation pass is safe scaffolding: connect your actual Trigger.dev runtime to these definitions and services after environment setup.

### How review and publish works

- Admin dashboards live under the `Content` entry in the main admin sidebar and under `/admin/news`, `/admin/news/sources`, `/admin/news/clusters`, and `/admin/news/drafts`.
- Individual draft review pages live under `/admin/news/drafts/[id]`.
- Drafts remain in reviewable states until an admin approves or publishes them.
- Published editorial content renders under `/blog/editorial`.
- Review history is stored in `review_events`, and publish scheduling uses `publish_queue`.

### How image generation works

- AI first generates a realistic editorial image prompt and alt text.
- Generated images are tracked in `generated_images`.
- Branding is deterministic in `src/lib/images/hero-branding.ts`:
  the logo is composited in the lower-left corner and a subtle orange bottom glow is added during post-processing.
- Final images should be stored in the `editorial-images` bucket or another server-controlled storage path.

### Manual setup still required

- Apply `supabase-migration-content-intelligence.sql`.
- Configure your Trigger.dev runtime and wire its tasks to the job definitions in `trigger/`.
- Add your OpenAI client implementation behind the `AiTextClient` interface used in `src/lib/content/services`.
- Add storage policies or signed URL delivery for branded hero images, depending on whether the bucket stays private.
- Ensure your deployment/runtime allows outbound fetches for RSS feeds and article pages.

### Environment variables for classification

- `OPENAI_API_KEY`
- `OPENAI_CONTENT_MODEL` optional, defaults to `gpt-5-mini`
- `OPENAI_BASE_URL` optional, defaults to `https://api.openai.com/v1`
- `OPENAI_IMAGE_MODEL` optional, defaults to `gpt-image-1`

With those set, the admin content flow becomes:
`Seed bronnen` -> `Run ingest` -> `Extract artikelen` -> `Analyseer content` -> `Cluster nieuws` -> `Genereer drafts` -> `Genereer images` -> `Publiceer queue`

Important:
- the key must be available to the Next.js runtime itself, not only as a Supabase secret
