// Feature #4 (Free, 88 votes): suppress Xero's promotional and onboarding
// banners.
//
// CSS-only. Click-dismissing would fire Xero's own "user dismissed this"
// telemetry and could mark onboarding complete on the account; hiding leaves
// the account untouched and is reversible by switching the module off.
"use strict";

XT.register({
  id: "popup-dismiss",
  tier: "free",
  title: "Hide promos & onboarding banners",
  _style: null,

  init() {
    if (this._style) return;
    const sels = [...XT.selectors.noise.banners, ...XT.selectors.noise.tours].filter(
      (s) => s && s !== "PLACEHOLDER"
    );
    if (!sels.length) return;
    this._style = XT.dom.el("style", {
      "data-xt-item": this.id,
      text: `${sels.join(",")}{display:none !important;}`,
    });
    document.documentElement.append(this._style);
  },

  destroy() {
    this._style?.remove();
    this._style = null;
  },
});
