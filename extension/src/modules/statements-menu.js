// Feature #1 (Free, 174 votes): a Statements entry in the Sales menu.
//
// Statements exists at /AccountsReceivable/Statements.aspx but is reachable
// only via Sales overview -> Send statements. Nothing in the nav points at it,
// which is what 174 people asked Xero to fix.
"use strict";

XT.register({
  id: "statements-menu",
  tier: "free",
  title: "Statements menu item",

  async init() {
    const panel = await XT.dom.waitFor(XT.selectors.panels.sales);
    if (!panel) return;
    // Sit next to Invoices — statements are generated from them.
    const anchor = XT.menu.findItem(panel, "/AccountsReceivable/Search.aspx");
    if (!anchor) return;
    if (panel.querySelector(`[data-xt-item="${this.id}"]`)) return;

    const li = XT.menu.cloneItem(anchor, {
      label: "Statements",
      href: XT.urls.statements,
      id: this.id,
    });
    // Rank 20: a destination of its own, so it sits after the Invoices status
    // filters (rank 10) rather than splitting them off from Invoices.
    if (li) XT.menu.insertAfter(anchor, [li], 20);
  },

  destroy() {
    XT.menu.removeAll(this.id);
  },
});
