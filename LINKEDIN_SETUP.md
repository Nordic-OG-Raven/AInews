# LinkedIn Integration Setup Guide

## Overview

This guide will help you set up automated posting to the Nordic Raven Solutions LinkedIn company page using the official LinkedIn API.

---

## Prerequisites

- ✅ LinkedIn account with admin access to Nordic Raven Solutions company page
- ✅ Access to https://www.linkedin.com/company/nordic-raven-solution
- ⏱️ ~20 minutes setup time
- 📧 Email for verification

---

## Step 1: Create LinkedIn Developer App

### 1.1 Access LinkedIn Developer Portal

1. Go to https://www.linkedin.com/developers/
2. Click **"Create app"** (top right)

### 1.2 Fill Out App Details

**Required Information:**
- **App name**: `AI News Digest`
- **LinkedIn Page**: Select **"Nordic Raven Solutions"**
  - This associates the app with your company page
- **App logo**: Upload any image (optional, can use Nordic Raven logo)
- **Privacy policy URL**: `https://nordicravensolutions.com/privacy` 
  - If you don't have one, you can use: `https://www.linkedin.com/legal/privacy-policy`
- **Legal agreement**: Check the box to agree to LinkedIn API Terms

### 1.3 Submit for Review

- Click **"Create app"**
- You'll be redirected to your app dashboard

---

## Step 2: Configure App Permissions

### 2.1 Request Products

1. In your app dashboard, click the **"Products"** tab
2. Request access to:
   - ✅ **"Share on LinkedIn"** - Required for posting
   - ✅ **"Sign In with LinkedIn using OpenID Connect"** - Required for auth

3. Click **"Request access"** for each
4. **Note**: Usually auto-approved within seconds

### 2.2 Verify Permissions

Once approved, go to the **"Auth"** tab and verify you have:
- `w_member_social` - Post to personal profile
- `w_organization_social` - Post to company page (this is what we need)

---

## Step 3: Get Your Credentials

### 3.1 Client ID and Client Secret

1. Go to the **"Auth"** tab in your app dashboard
2. Copy these values:
   - **Client ID**: e.g., `86abc123xyz456`
   - **Client Secret**: e.g., `WX9abc123XYZ456` (click "Show" to reveal)

### 3.2 Set Redirect URL

1. Still in the **"Auth"** tab, find **"Redirect URLs"**
2. Add: `http://localhost:8000/callback`
3. Click **"Update"**

**Why**: This is where LinkedIn will send the authorization code after you authenticate.

---

## Step 4: Get Organization ID

### 4.1 Find Your Company Page ID

**Method 1: From URL**
1. Go to https://www.linkedin.com/company/nordic-raven-solution
2. Click **"View page as member"** or inspect the URL
3. Look for the company ID in the URL or page source

**Method 2: Via API (Easier)**

I'll help you get this once you have the access token (next step).

---

## Step 5: Generate Access Token

This is the most important step. We need to exchange your app credentials for an access token.

### 5.1 Get Authorization Code

**Open this URL in your browser** (replace `YOUR_CLIENT_ID`):

```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=77tfz2s27nbjwb&redirect_uri=http://localhost:8000/callback&scope=w_member_social%20w_organization_social%20r_organization_social
```

**Steps**:
1. Replace `YOUR_CLIENT_ID` with your actual Client ID
2. Paste URL in browser
3. LinkedIn will ask you to authorize the app
4. Click **"Allow"**
5. You'll be redirected to `http://localhost:8000/callback?code=AQT...`
6. **Copy the entire code** from the URL (everything after `code=`)
   - Example: `AQTxYz123ABCdef456...` (very long string)

### 5.2 Exchange Code for Access Token

Run this command (replace the placeholders):

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:8000/callback" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**Response** (if successful):
```json
{
  "access_token": "AQV...very_long_token",
  "expires_in": 5184000,
  "refresh_token": "AQW...refresh_token",
  "refresh_token_expires_in": 31536000
}
```

**Save these values**:
- ✅ `access_token` - This is your **LINKEDIN_ACCESS_TOKEN**
- ✅ `refresh_token` - For renewing access later
- ⏰ `expires_in` - Token expires in ~60 days

---

## Step 6: Get Organization ID (Final Step)

With your access token, run this command:

```bash
curl -X GET https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response**:
```json
{
  "elements": [
    {
      "organizationalTarget": "urn:li:organization:12345678",
      "role": "ADMINISTRATOR"
    }
  ]
}
```

**Copy the organization URN**: `urn:li:organization:12345678`
- This is your **LINKEDIN_ORGANIZATION_ID**

---

## Step 7: Update .env File

Add these to your `/Users/jonas/AInews/.env`:

```bash
# LinkedIn API Configuration
LINKEDIN_ACCESS_TOKEN=AQV...your_very_long_access_token
LINKEDIN_ORGANIZATION_ID=urn:li:organization:12345678
```

**Note**: Keep these secret! Don't commit to git.

---

## Step 8: Test the Integration

### 8.1 Test Locally (Safe - No Posting)

```bash
cd /Users/jonas/AInews
python main_scheduled.py monday
```

This runs in TEST MODE - generates content but doesn't post to LinkedIn.

### 8.2 Verify LinkedIn Post Generation

You should see:
```
Generating LinkedIn post...

--- LinkedIn Post Preview ---
[LinkedIn post content here]
----------------------------

LinkedIn access token not found. Skipping LinkedIn posting.
```

**If you see the preview**, the generation is working!

### 8.3 Test Actual Posting (Careful!)

To test real posting, temporarily modify `main_scheduled.py`:

Change line 123 from:
```python
if test_mode:
```

To:
```python
if test_mode and False:  # Force production mode for testing
```

Then run:
```bash
python main_scheduled.py monday
```

**Check Nordic Raven Solutions LinkedIn page** - you should see a new post!

**After testing, revert the change** to avoid accidental test posts.

---

## Step 9: Add to GitHub Actions (Automated Posting)

### 9.1 Add GitHub Secrets

1. Go to your GitHub repository
2. Settings > Secrets and variables > Actions
3. Click **"New repository secret"**
4. Add:
   - Name: `LINKEDIN_ACCESS_TOKEN`
   - Value: Your access token
   - Click **"Add secret"**
5. Repeat for:
   - Name: `LINKEDIN_ORGANIZATION_ID`
   - Value: `urn:li:organization:12345678`

### 9.2 Update GitHub Workflow

The workflow (`.github/workflows/weekly-digest.yml`) already includes these as environment variables, so no changes needed!

---

## Token Expiration & Renewal

### When Does the Token Expire?

- **Access Token**: ~60 days (5,184,000 seconds)
- **Refresh Token**: ~365 days (31,536,000 seconds)

### How to Refresh the Token (Before Expiration)

Run this command:

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**Response**: New access token + new refresh token

**Update your `.env` and GitHub Secrets** with the new values.

### Automatic Monitoring

The system will warn you if posting fails. If you see:

```
✗ Failed to post to LinkedIn
Status code: 401
Details: Unauthorized
```

Your token has likely expired. Refresh it using the steps above.

---

## Troubleshooting

### Issue: "Invalid access token"

**Cause**: Token expired or incorrect

**Fix**:
1. Check token in `.env` (no extra spaces, quotes, or line breaks)
2. Refresh token using Step 9
3. Verify token with test API call:
   ```bash
   curl -X GET https://api.linkedin.com/v2/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Issue: "Insufficient permissions"

**Cause**: App doesn't have `w_organization_social` permission

**Fix**:
1. Go to app dashboard > Products
2. Ensure "Share on LinkedIn" is approved
3. Re-authorize the app (repeat Step 5)

### Issue: "Organization not found"

**Cause**: Wrong Organization ID or no admin access

**Fix**:
1. Verify you're an admin of Nordic Raven Solutions page
2. Re-fetch Organization ID (Step 6)
3. Ensure format is `urn:li:organization:XXXXXXXX`

### Issue: "Rate limit exceeded"

**Cause**: Too many API requests

**Fix**:
- Wait 24 hours (LinkedIn has daily limits)
- We only post 3x/week, so this shouldn't happen
- Check for duplicate workflows running

---

## LinkedIn Posting Best Practices

### Posting Schedule

- **Monday**: 8:00 AM UTC = Early morning US East Coast
- **Wednesday**: 8:00 AM UTC = Catches mid-week engagement
- **Friday**: 8:00 AM UTC = End-of-week reading

These times are optimized for B2B professional engagement.

### Content Guidelines

The automated posts include:
- ✅ Professional tone
- ✅ Value-driven content (research highlights)
- ✅ Clear call-to-action
- ✅ Relevant hashtags
- ✅ Emoji (sparingly - max 3)

### Engagement Tips

After posting:
- Respond to comments within 2-4 hours
- Like/reply to shares
- Monitor analytics (LinkedIn Page Analytics)

---

## Security Notes

### Keep These Secret

- ❌ **Never commit** to git:
  - `LINKEDIN_ACCESS_TOKEN`
  - `LINKEDIN_ORGANIZATION_ID`
  - Client Secret
  
- ✅ **Always use**:
  - `.env` for local development
  - GitHub Secrets for production

### Token Security

- Tokens grant full posting access to Nordic Raven Solutions
- If compromised, revoke immediately:
  1. Go to https://www.linkedin.com/developers/
  2. Apps > AI News Digest > Auth
  3. Click "Regenerate" for Client Secret
  4. Re-authorize (Step 5)

---

## Support & Resources

### Official Documentation

- [LinkedIn Share API](https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api)
- [LinkedIn OAuth 2.0](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn API Rate Limits](https://docs.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits)

### Need Help?

If you encounter issues:
1. Check troubleshooting section above
2. Review LinkedIn API error codes
3. Test with curl commands to isolate the issue

---

## Quick Reference

### .env Variables
```bash
LINKEDIN_ACCESS_TOKEN=AQV...
LINKEDIN_ORGANIZATION_ID=urn:li:organization:12345678
```

### Test Commands
```bash
# Test digest generation (no posting)
python main_scheduled.py monday

# Test in production (will actually post!)
python main_scheduled.py  # Runs today's schedule
```

### GitHub Secrets Needed
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_ORGANIZATION_ID`
- (Plus existing: `GROQ_API_KEY`, `EMAIL_SENDER`, `EMAIL_RECIPIENT`, `GMAIL_APP_PASSWORD`)

---

**Setup Complete!** 🎉

Your AI News Digest will now automatically post to:
- ✅ Email subscribers
- ✅ Nordic Raven Solutions LinkedIn page

**Schedule**: Monday/Wednesday/Friday @ 8:00 AM UTC

