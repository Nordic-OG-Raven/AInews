# AI News Blog Setup Guide

This guide will help you set up the complete AI News Blog system.

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Resend account for emails (free tier: 3,000 emails/month)
- Cloudflare account for deployment

## Step 1: Supabase Setup

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name it: `ainews-blog`
4. Choose a strong database password
5. Select a region close to you

### 1.2 Run Database Schema
1. In Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy contents of `/supabase/schema.sql`
4. Paste and click "Run"
5. Verify tables were created in "Table Editor"

### 1.3 Get API Keys
1. Go to "Settings" → "API"
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** secret key (⚠️ Keep this secret!)

## Step 2: Resend Setup

### 2.1 Create Account
1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 3,000 emails/month)
3. Verify your email

### 2.2 Add Domain
1. Go to "Domains" → "Add Domain"
2. Add: `ainewsblog.jonashaahr.com`
3. Follow DNS verification steps in Cloudflare:
   - Add TXT record for domain verification
   - Add MX, TXT (SPF), TXT (DKIM) records
4. Wait for verification (usually < 5 minutes)

### 2.3 Get API Key
1. Go to "API Keys"
2. Create new key
3. Copy the API key

## Step 3: Local Environment Setup

### 3.1 Create .env.local
```bash
cd /Users/jonas/AInews/blog
cp .env.local.example .env.local
```

### 3.2 Fill in Environment Variables
Edit `.env.local`:
```env
# Supabase (from Step 1.3)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Admin
ADMIN_PASSWORD=choose_a_secure_password

# Resend (from Step 2.3)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=digest@ainewsblog.jonashaahr.com

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3.3 Test Locally
```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the homepage!

## Step 4: Import Email Archives

We'll create a script to parse your existing email digests and import them into Supabase.

```bash
# TODO: Run import script (will create this next)
npm run import-digests
```

## Step 5: Deploy to Cloudflare Pages

### 5.1 Connect GitHub
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create application" → "Pages" → "Connect to Git"
3. Select repository: `Nordic-OG-Raven/AInews-Blog`
4. Configure build:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`

### 5.2 Add Environment Variables
In Cloudflare Pages → Settings → Environment variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_SITE_URL` = `https://ainewsblog.jonashaahr.com`

### 5.3 Configure Custom Domain
1. In Cloudflare Pages → Custom domains
2. Add: `ainewsblog.jonashaahr.com`
3. Cloudflare will auto-configure DNS (already on Cloudflare)
4. Wait for SSL certificate (~2 minutes)

## Step 6: Set Up LinkedIn Scraper

### 6.1 Add GitHub Secrets
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `LINKEDIN_EMAIL` (your LinkedIn login)
   - `LINKEDIN_PASSWORD` (your LinkedIn password)

### 6.2 Test Scraper Manually
```bash
cd /Users/jonas/AInews/blog
npm run scrape-linkedin
```

## Step 7: Verify Everything Works

- [ ] Homepage loads at `ainewsblog.jonashaahr.com`
- [ ] Can view past digests
- [ ] Can subscribe with email (check inbox for confirmation)
- [ ] Can react with 👍/🖕
- [ ] Can post comments
- [ ] Admin panel works at `/admin`
- [ ] RSS feed works at `/rss.xml`

## Troubleshooting

### Supabase RLS Issues
If queries fail, check Row Level Security policies:
```sql
-- Temporarily disable RLS for testing (re-enable after!)
ALTER TABLE digests DISABLE ROW LEVEL SECURITY;
```

### Email Not Sending
1. Check Resend domain is verified
2. Verify DNS records are correct
3. Check API key is valid
4. Look at Resend dashboard → Logs

### Build Fails on Cloudflare
1. Check all environment variables are set
2. Verify `NEXT_PUBLIC_*` variables are set correctly
3. Check build logs for specific errors

## Next Steps

1. **Import your email archives** (see Step 4)
2. **Test the admin panel** at `/admin`
3. **Schedule first LinkedIn scrape** (GitHub Actions runs Sunday 00:00 UTC)
4. **Share the blog** on LinkedIn!

## Support

Issues? Check:
- Supabase logs (Database → Logs)
- Cloudflare Pages logs (Deployments → View details)
- Resend logs (Logs tab)
- GitHub Actions logs (Actions tab)

