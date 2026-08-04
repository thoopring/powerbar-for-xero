// Helpers for injecting items into Xero's nav dropdowns.
//
// Xero pre-renders every dropdown panel and hides it with a class, so we can
// inject at page load without waiting for the user to open a menu. Injected
// items clone the markup of a real neighbouring item, which is what keeps them
// visually native across Xero restyles (HANDOFF §5-2: native camouflage).
"use strict";

XT.menu = {
  // Clone an existing menu item and retarget it. Cloning beats hand-built
  // markup: we inherit Xero's current classes, icon slots and focus handling
  // for free, so a restyle carries our items along with theirs.
  cloneItem(templateLi, { label, href, id }) {
    const li = templateLi.cloneNode(true);
    li.setAttribute("data-xt-item", id);
    li.removeAttribute("aria-label");

    const a = li.querySelector("a");
    if (!a) return null;
    a.setAttribute("href", href);
    a.removeAttribute("aria-current");

    // Item text lives in a <span role="none"> next to optional icon markup.
    const span = a.querySelector('span[role="none"]') || a.querySelector("span") || a;
    span.textContent = label;

    // A cloned item may carry a count badge or "new" pill from its template.
    for (const extra of li.querySelectorAll("[data-automationid*='badge'], .x-nav--pill")) {
      extra.remove();
    }
    return li;
  },

  // Find the <li> for a menu entry inside a panel, matched on its link target.
  // Text matching would break under Xero's other locales.
  findItem(panel, hrefFragment) {
    const a = panel.querySelector(`a[href*="${hrefFragment}"]`);
    return a ? a.closest("li") : null;
  },

  // Insert `nodes` after `anchor`, ordered by `rank` against anything another
  // module already put there. Several modules inject after the same entry
  // (statuses and Statements both hang off Invoices), so without an explicit
  // rank the menu order would depend on module start order — which changes as
  // the user toggles features. Lower rank sits closer to the anchor.
  insertAfter(anchor, nodes, rank = 50) {
    let at = anchor;
    // Walk past already-injected siblings that outrank us.
    while (true) {
      const next = at.nextElementSibling;
      const theirRank = next?.getAttribute?.("data-xt-rank");
      if (theirRank === null || theirRank === undefined) break;
      if (Number(theirRank) > rank) break;
      at = next;
    }
    for (const n of nodes) {
      n.setAttribute("data-xt-rank", String(rank));
      at.after(n);
      at = n;
    }
  },

  // Remove everything a module injected. Safe to call when nothing was added.
  removeAll(id) {
    for (const n of document.querySelectorAll(`[data-xt-item="${id}"]`)) n.remove();
  },
};
