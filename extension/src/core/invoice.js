// Reading the invoice on screen. Shared by the Pro feature that renames the
// download and by the free hint that shows what the name would have been —
// they must agree, or the hint promises something the feature does not deliver.
"use strict";

XT.invoice = {
  // "Invoice ORC1042" -> "ORC1042"
  number() {
    const el = document.querySelector(XT.selectors.invoice.title);
    if (!el) return null;
    const text = el.textContent.trim();
    return (/([A-Z0-9][A-Z0-9-]*\d)\s*$/.exec(text) || [])[1] || text || null;
  },

  // The name sits on the <button> right after the "Contact" caption. Reading
  // the caption's parent instead picks up the address block too.
  contact() {
    const label = document.querySelector(XT.selectors.invoice.contactLabel);
    if (!label) return null;
    const next = label.nextElementSibling;
    const el =
      next && next.tagName === "BUTTON" ? next : label.parentElement?.querySelector("button");
    const name = (el?.textContent || "").trim();
    if (!name || name.length > 80 || name.includes("\n")) return null;
    if (name === label.textContent.trim()) return null;
    return name;
  },

  // "{number} - {contact}.pdf" -> "ORC1042 - Boom FM.pdf"
  fill(template, fields) {
    const name = template.replace(/\{(\w+)\}/g, (_, k) => (fields[k] ?? "").trim());
    // Characters Windows rejects would make the download fail outright.
    return name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  },

  // What Xero itself would call this download, so the hint can show the
  // before and after side by side.
  xeroName(number) {
    return `Invoice ${number}.pdf`;
  },
};
