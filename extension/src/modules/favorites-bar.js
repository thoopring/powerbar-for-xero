// Feature #5 (Free, 55 votes): pin frequently used screens to a strip under
// the nav. This is the hero surface for the store listing (HANDOFF §5-2), so it
// has to read as part of Xero rather than a bolt-on.
"use strict";

XT.register({
  id: "favorites-bar",
  tier: "free",
  title: "Favorites bar",
  _bar: null,

  async init() {
    const nav = await XT.dom.waitFor(XT.selectors.nav.bar);
    if (!nav || this._bar) return;

    const cfg = await XT.settings.load();
    const favs = cfg.favorites || [];
    const here = location.pathname + location.search;
    const pinned = favs.some((f) => f.url === here);

    this._bar = XT.dom.el("div", {
      class: "xt-favbar",
      "data-xt-item": this.id,
      role: "navigation",
      "aria-label": "Pinned pages",
    });

    for (const f of favs) {
      const link = XT.dom.el("a", { class: "xt-fav", href: f.url, text: f.label });
      const remove = XT.dom.el("button", {
        class: "xt-fav-remove",
        type: "button",
        title: `Unpin ${f.label}`,
        "aria-label": `Unpin ${f.label}`,
        text: "×",
        onclick: async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await XT.settings.set({ favorites: favs.filter((x) => x.url !== f.url) });
        },
      });
      const wrap = XT.dom.el("span", { class: "xt-fav-wrap" }, [link, remove]);
      this._bar.append(wrap);
    }

    // With nothing pinned, a bare star reads as an empty strip Xero rendered by
    // mistake. Spelling out the action makes the bar explain itself on first
    // run, which is also the onboarding the store listing promises.
    const label = favs.length ? (pinned ? "★" : "☆") : "☆ Pin this page";
    this._bar.append(
      XT.dom.el("button", {
        class: `xt-fav xt-fav-add${favs.length ? "" : " xt-fav-empty"}`,
        type: "button",
        title: pinned ? "This page is pinned" : "Pin this page",
        "aria-label": pinned ? "This page is pinned" : "Pin this page",
        text: label,
        onclick: async () => {
          if (pinned) return;
          await XT.settings.set({ favorites: [...favs, { label: this.pageLabel(), url: here }] });
        },
      })
    );

    nav.after(this._bar);
  },

  // Naming a pin is harder than it looks. Xero uses two title formats —
  // legacy pages put the brand first ("Xero | Invoices | Demo Company (AU)"),
  // the app shell puts it last ("Bank accounts – Demo Company (AU) – Xero") —
  // and some titles are useless on their own ("All" for the bills list).
  //
  // So ask the nav first: it already names every page it links to, in the
  // user's own language, and it includes the entries we injected, which is how
  // a pinned "Draft" ends up called Draft rather than Invoices.
  pageLabel() {
    return this.labelFromNav() || this.labelFromTitle() || location.pathname;
  },

  labelFromNav() {
    const nav = document.querySelector(XT.selectors.nav.bar);
    if (!nav) return null;
    const here = location.pathname + location.search;
    let best = null;

    for (const a of nav.querySelectorAll("a[href]")) {
      let url;
      try {
        url = new URL(a.getAttribute("href"), location.origin);
      } catch {
        continue;
      }
      if (url.host && url.host !== location.host) continue;
      const target = url.pathname + url.search;
      const text = (a.textContent || "").trim();
      if (!text || text.length > 40) continue;

      // Exact match wins outright; otherwise keep the longest path prefix, so
      // /bills/list/all resolves to the nav's "Bills".
      if (target === here) return text;
      if (here.startsWith(url.pathname) && (!best || url.pathname.length > best.len)) {
        best = { text, len: url.pathname.length };
      }
    }
    return best ? best.text : null;
  },

  labelFromTitle() {
    // Dropping the brand leaves the page name first in both formats; the
    // organisation name is never first, so it needs no special handling.
    const parts = document.title
      .split(/\s*[|–—]\s*/)
      .map((s) => s.trim())
      .filter((s) => s && s !== "Xero");
    return parts[0] || null;
  },

  destroy() {
    this._bar?.remove();
    this._bar = null;
  },
});
