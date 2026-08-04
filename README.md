# PowerBar for Xero

Menu shortcuts for the Xero web app, as a Chrome extension.

Every feature here comes from a request on Xero's own product ideas forum,
where the votes have been sitting under "Gaining Support" for years.

**This repository exists so you can check the extension before installing it.**
Bookkeepers work in client books; an extension in that browser should not have
to be taken on faith.

## What it does

Free:

- **Statements in the Sales menu.** Xero only reaches customer statements via
  Sales overview.
- **Status entries for invoices and bills.** Draft, Awaiting approval, Awaiting
  payment, Paid, Repeating, straight from the Sales and Purchases menus.
- **A favourites bar.** Pin the screens you use, under the nav on every page.
- **Reconcile shortcuts.** Any bank account's reconcile screen from the
  Accounting menu.
- **Financial settings shortcut.**
- **Quieter screens.** Hides promotional and onboarding banners.

Pro (paid): custom invoice PDF filenames, so downloads carry the contact name
instead of Xero's generic `Invoice INV-0042.pdf`.

Every feature has its own on/off switch.

## What it can reach

The manifest asks for exactly two things:

- `https://*.xero.com/*` — it cannot read or change any other site
- `storage` — your settings

`downloads` is an *optional* permission, requested only if you switch on custom
PDF filenames, and only at that moment. It never appears in the install prompt.

## What it sends

Nothing about you, anywhere. There are no analytics, no telemetry, no accounts,
and no server of ours to send anything to. Two outbound requests exist:

- `killswitch.json` in this repository, fetched at most every six hours. It
  lets a broken feature be switched off remotely after a Xero UI change,
  instead of the whole extension breaking. It is a plain file download.
- The Lemon Squeezy licensing API, only if you have entered a Pro licence key,
  and carrying only that key.

See [PRIVACY.md](PRIVACY.md).

## Reading the code

No build step and no dependencies — what is here is what runs.

```
extension/
  manifest.json      permissions and load order
  background.js      kill-switch fetch, licence check, PDF renaming
  src/
    core/            namespace, selector registry, settings, DOM helpers
    modules/         one file per feature, each independently switchable
    main.js          gating, SPA navigation, live toggling
  options/ popup/    settings UI
```

`src/core/selectors.js` is worth a look: every DOM selector lives there, so a
Xero redesign has one place to fix.

## Installing from source

1. `chrome://extensions` → enable Developer mode
2. **Load unpacked** → select the `extension/` folder
3. Open any page on `xero.com`

## Affiliation

PowerBar for Xero is an independent product. It is not affiliated with,
endorsed by, or sponsored by Xero Limited. Xero is a trademark of Xero Limited.

## Licence

MIT — see [LICENSE](LICENSE).
