// The one place Pro is mentioned outside the settings page.
//
// Bookkeepers never open an extension's settings — the thing works, so there is
// no reason to. That leaves Pro effectively invisible. The moment it is
// actually wanted is the moment an invoice PDF lands with Xero's generic name,
// and until now we said nothing then.
//
// So: after someone downloads an invoice PDF, once ever, show what the file
// would have been called. Never again after that, whether they act on it or
// not. This is the free tier telling you about a paid one, which is only
// acceptable if it happens at the moment of use and never repeats — and the
// product itself suppresses Xero's promotional banners, so nagging here would
// be hypocritical.
"use strict";

XT.register({
  id: "pro-hint",
  tier: "free",
  title: "Tell me once about Pro",
  _toast: null,
  _onClick: null,

  async init() {
    if (!XT.routes.isInvoiceView(location.pathname)) return;

    const { pro } = await XT.license.status();
    if (pro) return; // nothing to advertise

    const cfg = await XT.settings.load();
    if (cfg.proHintSeen) return;

    // The download itself is invisible without the downloads permission, which
    // free users have not granted. The print button is the reliable proxy, and
    // it is the same click that produces the file.
    const button = await XT.dom.waitFor(XT.selectors.invoice.printButton);
    if (!button) return;

    this._onClick = () => {
      // Let the download start first: the hint reads as an observation about
      // what just happened, not an interruption of it.
      setTimeout(() => this.show(cfg.filenameTemplate), 1600);
      button.removeEventListener("click", this._onClick);
    };
    button.addEventListener("click", this._onClick);
  },

  async show(template) {
    if (this._toast) return;
    const number = XT.invoice.number();
    const contact = XT.invoice.contact();
    // Without both, the example would be a template rather than their file,
    // and a generic example is not worth interrupting anyone for.
    if (!number || !contact) return;

    const better = XT.invoice.fill(template || "{number} - {contact}.pdf", { number, contact });

    const el = XT.dom.el("div", { class: "xt-hint", "data-xt-item": this.id, role: "status" });
    el.append(
      XT.dom.el("div", { class: "xt-hint-body" }, [
        XT.dom.el("div", { class: "xt-hint-line" }, [
          XT.dom.el("span", { class: "xt-hint-muted", text: "Downloaded " }),
          XT.dom.el("span", { class: "xt-hint-old", text: XT.invoice.xeroName(number) }),
        ]),
        XT.dom.el("div", { class: "xt-hint-line" }, [
          XT.dom.el("span", { class: "xt-hint-muted", text: "PowerBar Pro would name it " }),
          XT.dom.el("strong", { class: "xt-hint-new", text: better }),
        ]),
      ]),
      XT.dom.el("button", {
        class: "xt-hint-cta",
        type: "button",
        text: "See Pro",
        onclick: () => {
          chrome.runtime.sendMessage({ type: "options:open" }).catch(() => {});
          this.dismiss();
        },
      }),
      XT.dom.el("button", {
        class: "xt-hint-close",
        type: "button",
        "aria-label": "Dismiss",
        text: "×",
        onclick: () => this.dismiss(),
      })
    );

    document.body.append(el);
    this._toast = el;
    // Shown counts as spent, whether or not they engage. Leaving it unset until
    // a click would mean showing it again on the next invoice.
    XT.settings.set({ proHintSeen: true });

    // Long enough to read twice, short enough not to sit in the way.
    setTimeout(() => this.dismiss(), 20000);
  },

  dismiss() {
    this._toast?.remove();
    this._toast = null;
  },

  destroy() {
    this.dismiss();
    this._onClick = null;
  },
});
