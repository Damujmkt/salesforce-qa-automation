# Salesforce QA Automation

Playwright + TypeScript + Playwright-BDD + Page Object Model. This repository currently implements Salesforce authentication and Chromium/WebKit login smoke tests. 

## Assessment Coverage

The Playwright TypeScript framework covers the following Salesforce CRM scenarios:

- Authentication: Salesforce login with Gmail OTP handling and cached browser sessions.
- Lead Management: Create Leads with unique data, validate the 18-character Lead ID, and update Lead Status.
- Lead Conversion (TC01–TC04): Convert Leads using new or existing Accounts and Contacts, and validate Opportunity details, relationships, Owner and Stage.
- Negative Testing: Validate mandatory-field errors and attempt duplicate-email creation. Duplicate detection is conditionally skipped when not enforced by Salesforce.
- API Validation : Intercept the Salesforce conversion API, validate the JSON response and capture sanitized evidence.
- Execution: Chromium and WebKit testing with parallel execution, unique test data and automatic teardown.

**Test results:** All mandatory scenarios have been implemented. Duplicate-email warning validation is conditional on the Salesforce environment.

**Observation** This Salesforce org has permitted duplicate Lead emails although there is warning. It looks like issue, that is why duplicate-warning validation is **skipped**, not reported as a successful duplicate block. the cleanup registry logs those skips.

## Prerequisites and installation

1. Create and activate a **Salesforce Developer Edition** account at <https://orgfarm-04c10729fc-dev-ed.develop.my.salesforce.com>. Registration/activation is a one-time manual prerequisite.
2. Install Node.js and npm. On Windows PowerShell, run:

```powershell
npm ci
npx playwright install chromium webkit
Copy-Item .env.example .env
```
Refer .env.example for project configurations

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
For additional test execution options, refer to the scripts section in package.json

## Reports and failure evidence

```powershell
npm run report
```

Playwright creates an HTML report (`playwright-report/`) and a JUnit file (`test-results/junit.xml`). Failure screenshots, video and traces are saved under `test-results/`. To inspect a trace:

```powershell
npx playwright show-trace "test-results/<failed-scenario>/trace.zip"
```

## Session recovery checks

1. Run `npm run auth:chromium` twice; the second run should report a valid cached session.
2. Delete `playwright/.auth/chromium.json` and rerun to test missing-cache recovery.
3. Revoke the Salesforce session and rerun to test actual server-side invalidation recovery.
4. Run `npm run test:webkit` to confirm the independent WebKit state.

## Security and tradeoffs

`.env`, `secrets/`, `playwright/.auth/`, HAR files and Playwright reports are Git-ignored. Do not commit credentials, OAuth tokens, session cookies, traces or verification codes. Gmail `gmail.readonly` grants access to the entire dedicated inbox, not just Salesforce messages. External Google OAuth apps in Testing mode can require reauthorization. This workflow automates the authorized email challenge; it does not bypass it.

