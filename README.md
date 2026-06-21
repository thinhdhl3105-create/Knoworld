# Knoworld

A celestial knowledge platform — *"Explore knowledge like a universe."*
Built with **Next.js 14 (App Router)** + **Tailwind CSS** + **Supabase** (Auth, Postgres, Storage).
Design: *Cosmic Minimalist* (Space Grotesk + Inter, deep-space dark theme).

## Pages
- `/` Landing — hero + Curated Pathways + Active Learning Flux
- `/research` Research Archives — featured + explorations + theoretical foundations
- `/students` Student Case Studies — filterable grid + spotlight
- `/videos` Video Case Studies — grouped by category
- `/login` Sign in / Sign up (Supabase Auth)
- `/upload` Contributor dashboard — CRUD content + image upload (Storage)

Until Supabase is configured the content pages render built-in sample data, so the UI always works.

## 1. Set up Supabase
1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**, paste `supabase/schema.sql`, and run it.
   This creates `profiles`, `content`, the `content_kind` enum, RLS policies, the
   `uploads` storage bucket, and an auto-profile trigger + sample rows.
3. In **Project Settings → API** copy the **Project URL** and **anon public key**.

## 2. Local dev
```bash
npm install
cp .env.local.example .env.local   # then fill in the two values
npm run dev
```

## 3. Deploy to Vercel
1. Push this folder to a Git repo (or use `vercel` CLI / drag-drop).
2. Import the repo in Vercel.
3. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Then add your Vercel domain to Supabase **Authentication → URL Configuration**
   (Site URL + Redirect URLs) so auth emails/links resolve correctly.

## Environment variables
| Key | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
