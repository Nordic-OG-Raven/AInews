# AI News Blog - TODO List

## ✅ COMPLETED
- [x] Supabase database schema (digests, comments, reactions, subscribers, scraper_runs)
- [x] Basic Astro project setup with Cloudflare adapter
- [x] Homepage skeleton (title, subtitle, digest grid)
- [x] Individual digest page skeleton
- [x] Supabase connection working
- [x] Deployed to Cloudflare Pages (https://731fb399.ainews-blog.pages.dev)
- [x] Environment variables configured

---

## 🔴 CRITICAL - MUST DO NOW

### 1. Add Test Data to Database
- [ ] Run script to add 3-5 test digests to Supabase
- [ ] Verify digests show on homepage
- [ ] Verify individual digest pages work

### 2. Configure Custom Domain (ainewsblog.jonashaahr.com)
- [ ] Add custom domain in Cloudflare Pages settings
- [ ] Get CNAME record details from Cloudflare
- [ ] Add CNAME record to jonashaahr.com DNS
- [ ] Verify SSL certificate provisioning
- [ ] Test ainewsblog.jonashaahr.com works

---

## 🟡 HIGH PRIORITY - CORE FEATURES

### 3. Reactions System (👍/🖕)
- [ ] Create API route: `/api/reactions/[digestId].ts`
- [ ] Add client-side reaction buttons with state management
- [ ] Implement IP hashing for privacy
- [ ] Show real-time reaction counts
- [ ] Prevent duplicate reactions (IP-based)

### 4. Comments System
- [ ] Create API route: `/api/comments/[digestId].ts`
- [ ] Build comment form component
- [ ] Add comment display with nested replies
- [ ] Implement moderation queue (approved=false by default)
- [ ] Email hashing for privacy

### 5. Email Subscription System
- [ ] Create subscribe form component
- [ ] Create API route: `/api/subscribe.ts`
- [ ] Resend API integration
- [ ] Double opt-in flow (send verification email)
- [ ] Unsubscribe link generation
- [ ] Preference management page

### 6. Admin Panel (/admin)
- [ ] Create `/admin` route with password auth
- [ ] Admin login page
- [ ] **Digest Management Tab**:
  - [ ] List all digests (published + drafts)
  - [ ] Edit digest form
  - [ ] Publish/unpublish toggle
  - [ ] Delete digest
  - [ ] Manually create new digest
- [ ] **Comment Moderation Tab**:
  - [ ] List all comments (pending/approved)
  - [ ] Approve/reject buttons
  - [ ] Delete comment
  - [ ] Ban email address
- [ ] **Subscriber Management Tab**:
  - [ ] List all subscribers
  - [ ] Export CSV
  - [ ] Manually add/remove
  - [ ] View preferences
- [ ] **Analytics Tab**:
  - [ ] Page views chart
  - [ ] Reaction distribution
  - [ ] Top digests by engagement
  - [ ] Subscriber growth
- [ ] **Scraper Management Tab**:
  - [ ] View last run status
  - [ ] Manually trigger scraper
  - [ ] View logs

---

## 🟢 MEDIUM PRIORITY - ENHANCEMENTS

### 7. Homepage Enhancements
- [ ] Category filter buttons (ML Monday, Tech Tuesday, etc.)
- [ ] Search bar with full-text search
- [ ] Pagination (12 digests per page)
- [ ] Sort options (newest, most popular, most reactions)
- [ ] Loading states

### 8. Digest Page Enhancements
- [ ] Share buttons (LinkedIn, Twitter, Email, Copy link)
- [ ] Related digests section
- [ ] Table of contents for long articles
- [ ] Reading time estimate
- [ ] Print-friendly styles

### 9. LinkedIn Scraper
- [ ] Create `/scripts/scrape-linkedin.ts`
- [ ] Playwright setup for headless browser
- [ ] Parse LinkedIn post HTML structure
- [ ] Extract article titles, summaries, URLs
- [ ] Store in Supabase as draft
- [ ] Error handling + fallback

### 10. GitHub Actions Automation
- [ ] Create `.github/workflows/weekly-scraper.yml`
- [ ] Cron schedule: Sunday 00:00 UTC
- [ ] Run LinkedIn scraper
- [ ] Send email blast to subscribers
- [ ] Secrets configuration
- [ ] Notification on failure

### 11. Email Blast System
- [ ] Create script: `/scripts/send-weekly-email.ts`
- [ ] Resend API integration
- [ ] HTML email template
- [ ] Plain text fallback
- [ ] Unsubscribe link in footer
- [ ] Batch sending (avoid rate limits)

---

## 🔵 LOW PRIORITY - NICE TO HAVE

### 12. MAS Workflow Visualization
- [ ] Create `/about` or `/how-it-works` page
- [ ] Interactive diagram (React Flow)
- [ ] Animated flow
- [ ] Click nodes for details
- [ ] Link to PRD

### 13. RSS Feed
- [ ] Create `/rss.xml` API route
- [ ] Generate RSS 2.0 XML
- [ ] Include last 50 digests
- [ ] Auto-discovery tag in HTML head

### 14. SEO & Performance
- [ ] Meta tags (title, description, OG tags)
- [ ] Sitemap.xml
- [ ] robots.txt
- [ ] Image optimization
- [ ] Lighthouse score > 90

### 15. Mobile Optimization
- [ ] Responsive design testing
- [ ] Touch-friendly buttons
- [ ] Mobile navigation
- [ ] Native share API

### 16. Accessibility
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Screen reader testing
- [ ] Color contrast checks

---

## 📊 CURRENT STATUS
- **Completed**: 7/16 major tasks (44%)
- **In Progress**: Deployment + Domain setup
- **Next Up**: Add test data + Build reactions/comments
- **Estimated Time Remaining**: ~8-10 hours of work

---

## 🚨 BLOCKERS / ISSUES
- [ ] No data in database yet (preventing testing)
- [ ] Custom domain not configured
- [ ] Admin panel not built (can't manually add digests)
- [ ] LinkedIn scraper not built (can't auto-populate)

---

## 📝 NOTES
- Site is LIVE but empty: https://731fb399.ainews-blog.pages.dev
- Email archives exist but not imported (user said not to use them)
- LinkedIn is the source of truth for content
- All backend features need to be built in Astro API routes

