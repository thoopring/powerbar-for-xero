// Feature #2 (Free, 107 votes): status entries under Purchases, mirroring the
// sales side. Bills use modern org-scoped routes, so URLs are built at runtime.
"use strict";

XT.register({
  id: "purchases-submenu",
  tier: "free",
  title: "Purchases status submenu",

  async init() {
    const panel = await XT.dom.waitFor(XT.selectors.panels.purchases);
    if (!panel) return;
    const anchor = XT.menu.findItem(panel, "/bills");
    if (!anchor) return;
    if (panel.querySelector(`[data-xt-item="${this.id}"]`)) return;

    const items = [];
    for (const [label, route] of Object.entries(XT.urls.billsByStatus)) {
      const li = XT.menu.cloneItem(anchor, {
        label,
        href: XT.routes.app(route),
        id: this.id,
      });
      if (li) items.push(li);
    }
    XT.menu.insertAfter(anchor, items);
  },

  destroy() {
    XT.menu.removeAll(this.id);
  },
});
