# AI News Blog

A public-facing blog platform for AI News Digests powered by multi-agent systems.

## Features

- 📚 **Past Digests Archive** - Browse all historical AI news digests
- 🔍 **Search & Filters** - Find digests by category, date, or keywords
- 👍🖕 **Reactions** - Vote on digest quality
- 💬 **Comments** - Engage with the community
- 📧 **Email Subscriptions** - Get digests delivered to your inbox
- 🔄 **Auto-Update** - Weekly LinkedIn scraping + publishing
- 🛡️ **Admin Panel** - Manage content, moderate comments, view analytics
- 🤖 **MAS Visualization** - Interactive workflow diagram
- 📡 **RSS Feed** - Subscribe via feed readers

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres + Auth + Storage)
- **Automation**: GitHub Actions, Playwright
- **Email**: Resend API
- **Deployment**: Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Resend account (for emails)

### Installation

```bash
cd blog
npm install
npm run playwright:install
```

### Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Admin
ADMIN_PASSWORD=your_secure_password

# Resend (Email)
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=digest@ainewsblog.jonashaahr.com

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database Setup

1. Create a new Supabase project
2. Run the schema from `/supabase/schema.sql` in the SQL Editor

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### LinkedIn Scraper

Test the scraper locally (dry run, no database writes):

```bash
npm run scrape-linkedin:dry-run
```

Run the scraper (saves to database):

```bash
npm run scrape-linkedin
```

## Deployment

See [SETUP.md](./SETUP.md) for full deployment instructions.

### Quick Deploy to Cloudflare Pages

1. Connect your GitHub repo
2. Set framework preset to "Next.js"
3. Add environment variables
4. Deploy!

## Project Structure

```
blog/
├── app/              # Next.js pages
├── components/       # React components
│   └── ui/          # shadcn/ui components
├── lib/             # Utilities
│   ├── supabase/    # Supabase clients
│   └── types.ts     # TypeScript types
├── scripts/         # CLI scripts
│   └── scrape-linkedin.ts
├── supabase/        # Database schema
└── public/          # Static assets
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run scrape-linkedin` - Run LinkedIn scraper
- `npm run scrape-linkedin:dry-run` - Test scraper (no DB writes)
- `npm run playwright:install` - Install Playwright browsers

## Contributing

This is a personal project, but feel free to open issues or suggest improvements!

## License

MIT
