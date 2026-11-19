# RECLAIM

A local-first workspace for taking stock of personal data shared with AI services and other platforms, organizing privacy actions, and keeping an audit trail. The initial app is a static web app that runs locally on Kali Linux or any modern browser.

## Run on Kali Linux

No Node.js packages or elevated privileges are required. From the repository directory:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000> in your browser. Stop the server with `Ctrl+C`.

You can also open `index.html` directly, though some browser features (such as clipboard access) work best over localhost.

## Current features

- **Private workspace:** inventory, actions, and activity notes are stored in this browser's local storage. There is no backend or analytics.
- **Local export scanning:** choose a JSON, text, or CSV account export (up to 10 MB). The browser searches for email addresses, phone numbers, and IPv4 addresses. It saves only category counts and a masked example; the source file contents are discarded. Scanning is best-effort and does not identify every kind of personal data.
- **Reclaim checklist:** create, complete, and remove data deletion, access, and privacy-setting actions.
- **Request drafting:** prepare and copy a request template for deletion, access, or opting out of AI-training use. You must review it and submit it yourself using the service's official process; laws, rights, and processes differ by location.
- **Local activity log:** record observations manually, including settings changes, data requests, and privacy alerts.
- **Workspace backup:** export or erase local workspace data.

## Important monitoring limitation

This standalone web app **does not** inspect or block network traffic, monitor other browser tabs or applications, detect what a chatbot has collected, or prevent future data collection. The “Local Watch” control only represents optional local reminders for manual activity logging. A web page cannot reliably inspect other apps' traffic. True live monitoring/blocking would need a separate, explicitly permissioned browser extension or operating-system component, careful allow-listing, and security review. Do not treat this dashboard or its score as a security assessment.

## Data handling

Imported files are read in the current browser tab only; they are not uploaded. The app stores the category, count, source filename, and a masked sample in local storage. Do not import data on a shared device. Exported backups and activity notes may contain personal context; store them securely. Clearing browser storage erases the workspace unless you made a backup.

## Development

The app has no build step or external JavaScript dependencies. Fonts are loaded from Google Fonts when online; the system falls back to local sans-serif and monospace fonts when offline.
