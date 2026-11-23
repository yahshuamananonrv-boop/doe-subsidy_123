# DOE Subsidy Site Report vs LandBank Reconciliation

Static web app (HTML + JavaScript, no build step). Everything runs in the browser:
password-protected LandBank files are decrypted locally and never uploaded to a server.

## Deploy on Vercel
1. Put these files in a GitHub repository (or run `npx vercel --prod` inside this folder).
2. In Vercel: Add New → Project → Import the repository.
3. Framework Preset: **Other**. Leave Build Command and Output Directory empty.
4. Deploy.

## Data storage on this deployment
Data (uploads, matches, notes, reimbursements, audit trail) is saved in each user's own
browser (IndexedDB). It is not shared between users or devices. Use Settings → Data & backup
to download/restore a JSON backup.
