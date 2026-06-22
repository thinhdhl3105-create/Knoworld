# Knoworld — Deploy & Update Guide (Supabase + Vercel)

This version adds: **Research Archive** (papers + editable Theoretical Foundations),
a separate **Knowledge Hub** (key concepts + node graph + downloadable frameworks),
upgraded **Video Case Studies** (file/YouTube upload, saved categories, concept links),
and **Student Case Studies** with detail pages (context / insight / creative approach /
execution / images). All placeholder sample content is removed so you start fresh.

---

## STEP 1 — Update the database (Supabase)

Your database already exists, so run the **migration**, not the full schema.

1. Open https://supabase.com → your project → **SQL Editor → New query**.
2. Open the file `supabase/migration_v2.sql`, copy **everything**, paste it in, click **Run**.
   - Adds new columns to `content` (paper_url, is_foundation, context, insight,
     creative_approach, execution, images, concept_id).
   - Creates new tables: `concepts`, `concept_links`, `frameworks` (with RLS policies).
   - **Deletes all existing rows in `content`** (clears the old placeholder case studies
     and videos) and seeds 5 real Theoretical Foundations you can edit later.
3. Confirm under **Table Editor** that you now see: `content`, `concepts`,
   `concept_links`, `frameworks`.

> Starting a brand-new project instead? Use `supabase/schema.sql` (the full script).

The `uploads` storage bucket and its policies already exist from the first install and
are reused for images, video files, papers and framework files.

---

## STEP 2 — Push the code (GitHub → Vercel auto-deploy)

The repo is already linked to Vercel, so a push to GitHub triggers a new deployment.
From the `knoworld/` folder on your computer:

```bash
git add -A
git commit -m "Add Knowledge Hub, frameworks, research archive, student case detail"
git push origin main      # (use your branch name if different)
```

Vercel will rebuild automatically. Watch progress at https://vercel.com → your project →
**Deployments**. When it finishes, the changes are live at https://knoworld.vercel.app.

> No change to environment variables is needed — the existing
> `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel still apply.

---

## STEP 3 — Add your content (no code needed)

Sign in, then go to **/upload**. The form adapts to the **Type** you pick:

- **Research / Foundation** — title, summary, body, optional PDF upload; tick
  *“Mark as a Theoretical Foundation”* to make it appear in the Research Archive’s
  Theoretical Foundations list (editable anytime).
- **Student Case Study** — fill **Context, Insight, Creative Approach, Execution** and
  upload multiple project images. Each case opens its own detail page.
- **Video Case Study** — paste a YouTube/Vimeo link **or** upload a video file. Type a
  **Category** (previously used categories autocomplete, so videos group together) and
  optionally **link it to a Knowledge Hub concept**.
- **Key Concept (Knowledge Hub)** — title + explanation, then tap other concepts to
  create the **node bridges** between them (shown on the concept map).
- **Framework** — write a guide and/or upload a downloadable file (PDF/DOCX/PPTX/XLSX).

Everything you publish is editable/deletable from the **Your entries** panel.

---

## Local test (optional)

```bash
cd knoworld
npm install
# .env.local already contains your Supabase keys
npm run dev        # http://localhost:3000
```

## Notes
- RLS is on: anyone reads published content; only the author can edit/delete their own.
- If Supabase keys are missing, pages render empty states instead of erroring.
