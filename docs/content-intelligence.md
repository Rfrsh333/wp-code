# Content Intelligence Pipeline

This module extends the current Next.js + Supabase application with an additive editorial intelligence workflow. It does not replace existing blog content, routes, or admin tooling.

## Placement

- Domain and services live under `src/lib/content`
- RSS parsing lives under `src/lib/rss`
- Rule evaluation lives under `src/lib/rules`
- Scoring lives under `src/lib/scoring`
- AI prompt and validation utilities live under `src/lib/ai`
- Admin workflow surfaces live under `src/app/admin/news`
- Public editorial publishing lives under `src/app/blog/editorial`
- Trigger-ready job definitions live under `trigger`

## Integration strategy

1. Source ingestion writes to new Supabase tables only.
2. Review and publishing workflows operate independently from the existing static blog dataset.
3. Public editorial pages are mounted under `/blog/editorial`, leaving the current `/blog` implementation untouched.
4. Existing Supabase auth and admin verification remain the enforcement layer for new admin APIs.
