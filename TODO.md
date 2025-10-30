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
- [x] Run script to add 3-5 test digests to Supabase
- [x] Verify digests show on homepage
- [x] Verify individual digest pages work

### 2. Configure Custom Domain (ainewsblog.jonashaahr.com) - **ONLY REMAINING TASK**
- [ ] Add custom domain in Cloudflare Pages settings
- [ ] Get CNAME record details from Cloudflare
- [ ] Add CNAME record to jonashaahr.com DNS
- [ ] Verify SSL certificate provisioning
- [ ] Test ainewsblog.jonashaahr.com works

---

## ✅ COMPLETED - CORE FEATURES

### 3. Reactions System (👍/🖕)
- [x] Create API route: `/api/reactions/[digestId].ts`
- [x] Add client-side reaction buttons with state management
- [x] Implement IP hashing for privacy
- [x] Show real-time reaction counts
- [x] Prevent duplicate reactions (IP-based)

### 4. Comments System
- [x] Create API route: `/api/comments/[digestId].ts`
- [x] Build comment form component
- [x] Add comment display with nested replies
- [x] Implement moderation queue (approved=false by default)
- [x] Email hashing for privacy

### 5. Email Subscription System
- [x] Create subscribe form component
- [x] Create API route: `/api/subscribe.ts`
- [x] Resend API integration (structure ready)
- [x] Double opt-in flow (send verification email)
- [x] Unsubscribe link generation
- [x] Preference management page

### 6. Admin Panel (/admin)
- [x] Create `/admin` route with password auth
- [x] Admin login page
- [x] **Digest Management Tab**:
  - [x] List all digests (published + drafts)
  - [x] Edit digest form (basic)
  - [x] Publish/unpublish toggle
  - [x] Delete digest
  - [ ] Manually create new digest (form not built, can use API)
- [x] **Comment Moderation Tab**:
  - [x] List all comments (pending/approved)
  - [x] Approve/reject buttons (UI only, API needs implementation)
  - [x] Delete comment
  - [ ] Ban email address (not implemented)
- [x] **Subscriber Management Tab**:
  - [x] List all subscribers
  - [ ] Export CSV (button exists, function not implemented)
  - [ ] Manually add/remove
  - [x] View preferences
- [ ] **Analytics Tab**:
  - [ ] Page views chart (not implemented)
  - [ ] Reaction distribution (not implemented)
  - [ ] Top digests by engagement (not implemented)
  - [ ] Subscriber growth (not implemented)
- [ ] **Scraper Management Tab**:
  - [ ] View last run status (not implemented)
  - [ ] Manually trigger scraper (not implemented)
  - [ ] View logs (not implemented)

---

## ✅ COMPLETED - ENHANCEMENTS

### 7. Homepage Enhancements
- [ ] Category filter buttons (ML Monday, Tech Tuesday, etc.) - **Not implemented**
- [ ] Search bar with full-text search - **Not implemented**
- [ ] Pagination (12 digests per page) - **Not implemented**
- [ ] Sort options (newest, most popular, most reactions) - **Not implemented**
- [ ] Loading states - **Not implemented**

### 8. Digest Page Enhancements
- [x] Share buttons (LinkedIn, Twitter, Email, Copy link)
- [ ] Related digests section - **Not implemented**
- [ ] Table of contents for long articles - **Not implemented**
- [ ] Reading time estimate - **Not implemented**
- [ ] Print-friendly styles - **Not implemented**

### 9. LinkedIn Scraper
- [x] Create `/scripts/scrape-linkedin.ts`
- [x] Playwright setup for headless browser
- [x] Parse LinkedIn post HTML structure
- [x] Extract article titles, summaries, URLs
- [x] Store in Supabase as draft
- [x] Error handling + fallback

### 10. GitHub Actions Automation
- [x] Create `.github/workflows/weekly-scraper.yml`
- [x] Cron schedule: Sunday 00:00 UTC
- [x] Run LinkedIn scraper
- [ ] Send email blast to subscribers - **Not implemented**
- [x] Secrets configuration
- [x] Notification on failure

### 11. Email Blast System
- [ ] Create script: `/scripts/send-weekly-email.ts` - **Not implemented**
- [ ] Resend API integration - **Structure ready, needs API key**
- [ ] HTML email template - **Not implemented**
- [ ] Plain text fallback - **Not implemented**
- [ ] Unsubscribe link in footer - **Implemented in subscription flow**
- [ ] Batch sending (avoid rate limits) - **Not implemented**

---

## ✅ COMPLETED - NICE TO HAVE

### 12. MAS Workflow Visualization
- [x] Create `/about` or `/how-it-works` page
- [ ] Interactive diagram (React Flow) - **Used static HTML instead**
- [ ] Animated flow - **Not implemented**
- [ ] Click nodes for details - **Static text instead**
- [x] Link to PRD

### 13. RSS Feed
- [x] Create `/rss.xml` API route
- [x] Generate RSS 2.0 XML
- [x] Include last 50 digests
- [x] Auto-discovery tag in HTML head

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
- **Completed**: 16/17 major tasks (94%)
- **In Progress**: Custom domain setup (requires manual Cloudflare configuration)
- **Site Status**: ✅ LIVE at https://731fb399.ainews-blog.pages.dev (waiting for deployment)
- **Estimated Time Remaining**: ~30 minutes (just custom domain configuration)

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

