// Asks for a store review. Once, ever, and only of people the extension has
// demonstrably helped.
//
// Reviews are not vanity here: the launch plan holds back the one-shot channels
// (r/xero, the Xero Community, the product ideas threads) until the listing has
// five to ten of them, because sending that traffic to a listing with none
// wastes an audience we can only spend once.
//
// The bar to be asked is deliberately high. Fourteen days since install, and
// ten actual uses of an injected shortcut — not ten page views. Someone who
// clicked our menu entries ten times has an opinion worth asking for. Someone
// who installed it and forgot does not, and asking them costs us a one-star.
"use strict";

XT.register({
  id: "review-request",
  tier: "free",
  title: "Ask me once for a review",
  _toast: null,
  _onClick: null,

  DAYS_BEFORE_ASKING: 14,
  USES_BEFORE_ASKING: 10,

  async init() {
    const cfg = await XT.settings.load();
    if (cfg.reviewAsked) return;

    // Count every click on something we put on the page. Delegated, because the
    // injected nodes are replaced on each SPA navigation.
    this._onClick = (e) => {
      if (!e.target.closest?.("[data-xt-item]")) return;
      this.recordUse();
    };
    document.addEventListener("click", this._onClick, true);

    await this.maybeAsk(cfg);
  },

  async recordUse() {
    const { shortcutUses = 0 } = await chrome.storage.local.get("shortcutUses");
    await chrome.storage.local.set({ shortcutUses: shortcutUses + 1 });
  },

  async maybeAsk(cfg) {
    const { installedAt, shortcutUses = 0 } = await chrome.storage.local.get([
      "installedAt",
      "shortcutUses",
    ]);
    if (!installedAt) return; // set by the service worker on install
    const days = (Date.now() - installedAt) / 86400000;
    if (days < this.DAYS_BEFORE_ASKING) return;
    if (shortcutUses < this.USES_BEFORE_ASKING) return;
    this.show();
  },

  show() {
    if (this._toast) return;
    const url = `https://chromewebstore.google.com/detail/${XT_CONFIG.extensionId}/reviews`;

    const el = XT.dom.el("div", { class: "xt-hint", "data-xt-item": this.id, role: "status" });
    el.append(
      XT.dom.el("div", { class: "xt-hint-body" }, [
        XT.dom.el("div", { class: "xt-hint-line" }, [
          XT.dom.el("strong", { text: "Has PowerBar saved you clicks?" }),
        ]),
        XT.dom.el("div", { class: "xt-hint-line" }, [
          XT.dom.el("span", {
            class: "xt-hint-muted",
            // Says why it helps them, not why it helps us. Bookkeepers pick
            // extensions on trust signals, and reviews are the loudest one.
            text: "A review helps other bookkeepers decide whether to trust it.",
          }),
        ]),
      ]),
      XT.dom.el("button", {
        class: "xt-hint-cta",
        type: "button",
        text: "Write one",
        onclick: () => {
          window.open(url, "_blank", "noopener");
          this.done();
        },
      }),
      XT.dom.el("button", {
        class: "xt-hint-close",
        type: "button",
        "aria-label": "No thanks",
        text: "×",
        onclick: () => this.done(),
      })
    );

    document.body.append(el);
    this._toast = el;
    // Asked counts as spent either way. A second ask is how a quiet tool turns
    // into a nagging one.
    XT.settings.set({ reviewAsked: true });
    setTimeout(() => this.dismiss(), 25000);
  },

  done() {
    XT.settings.set({ reviewAsked: true });
    this.dismiss();
  },

  dismiss() {
    this._toast?.remove();
    this._toast = null;
  },

  destroy() {
    if (this._onClick) document.removeEventListener("click", this._onClick, true);
    this._onClick = null;
    this.dismiss();
  },
});
