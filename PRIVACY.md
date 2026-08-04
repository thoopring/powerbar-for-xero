# PowerBar for Xero — Privacy Policy

Last updated: 2026-08-04

**The short version: nothing you do ever leaves your browser.**

PowerBar for Xero runs entirely inside your browser as a content script on
`xero.com` pages.

## What we collect

Nothing. The extension:

- sends no analytics, telemetry, or crash reports;
- reads no accounting data off the page for any purpose other than rendering
  its own UI locally (e.g. building a filename from the invoice number shown
  on screen);
- transmits no page content, keystrokes, or browsing activity anywhere.

## What is stored, and where

- Your settings (which modules are on, your pinned favorites, your filename
  template) are stored in Chrome's extension storage, synced by Chrome to your
  own Google profile if you have Chrome sync enabled. We never see them.
- If you buy Pro, your license key is stored locally and validated against the
  Lemon Squeezy licensing API (our payment provider). The only data sent in
  that request is the license key itself. See Lemon Squeezy's privacy policy
  for their handling.
- The extension periodically fetches a small static status file (from GitHub)
  that lets us remotely switch off a module if a Xero UI update breaks it.
  This is a plain file download; no data about you is sent with it beyond a
  standard HTTP request.

## Permissions

The extension requests access to `https://*.xero.com/*` only — it cannot read
or modify any other website.

## Affiliation

PowerBar for Xero is an independent product. It is not affiliated with,
endorsed by, or sponsored by Xero Limited. Xero is a trademark of Xero
Limited.

## Contact

Questions, or anything here that does not match what you observe:
https://github.com/thoopring/powerbar-for-xero/issues
