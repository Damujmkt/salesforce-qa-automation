# Salesforce QA Automation

Playwright + TypeScript + Playwright-BDD + Page Object Model. This repository currently implements Salesforce authentication and Chromium/WebKit login smoke tests. 

## Setup

```powershell
npm ci
npx playwright install chromium webkit
Copy-Item .env.example .env
```

###  Configure Google Cloud OAuth (one-time)
1. Open https://console.cloud.google.com and create/select a project.
2. Enable **Gmail API** (APIs & Services → Library).
3. In **Google Auth Platform** configure Branding and Audience. For personal Gmail choose External; if Testing, add your email under Test users.
4. Add scope `https://www.googleapis.com/auth/gmail.readonly` in Data Access.
5. Add Gmail ID under Test users as in audience Tab
6. Create an OAuth client of type **Desktop app** under Clients; download JSON.
7. Rename the downloaded JSON to `secrets/google-oauth-client.json`.
8. Run:

A browser opens for Google's consent screen. Approve only if this is your own mailbox / authorized test mailbox. `secrets/gmail-token.json` is created locally. **Never paste, commit, or upload its contents.**

**Important:** `gmail.readonly` allows reading the entire mailbox, not only Salesforce messages. Prefer a dedicated mailbox. Google External/Testing refresh tokens for Gmail scopes may expire after seven days. Re-run `npm run auth:gmail` if authorization expires or is revoked.

##  Confirm real Salesforce email and login selectors

Check a genuine Salesforce verification email and set:
- `GMAIL_SENDER` = sender's exact email address (Ex : noreply@salesforce.com)
- `GMAIL_SUBJECT_KEYWORD` = Ex : Verify your identity


## Run Tests

```powershell
npm run auth:gmail
npm run auth:chromium
npm run bddgen
npm run typecheck
npm run test:smoke
npm run test:webkit
npm run report
```

## Session recovery checks

1. Run `npm run auth:chromium` twice; the second run should report a valid cached session.
2. Delete `playwright/.auth/chromium.json` and rerun to test missing-cache recovery.
3. Revoke the Salesforce session and rerun to test actual server-side invalidation recovery.
4. Run `npm run test:webkit` to confirm the independent WebKit state.

Missing-cache recovery does not prove recovery from a revoked session. Keep both results as separate evidence.

## Security and tradeoffs

`.env`, `secrets/`, `playwright/.auth/`, HAR files and Playwright reports are Git-ignored. Do not commit credentials, OAuth tokens, session cookies, traces or verification codes. Gmail `gmail.readonly` grants access to the entire dedicated inbox, not just Salesforce messages. External Google OAuth apps in Testing mode can require reauthorization. This workflow automates the authorized email challenge; it does not bypass it.

