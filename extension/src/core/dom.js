// DOM helpers shared by modules.
"use strict";

XT.dom = {
  // Resolve a selector once it appears, or null after timeout. Never throws.
  waitFor(selector, { timeout = 8000, root = document } = {}) {
    if (!selector || selector === "PLACEHOLDER") return Promise.resolve(null);
    const found = root.querySelector(selector);
    if (found) return Promise.resolve(found);
    return new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        const el = root.querySelector(selector);
        if (el) {
          obs.disconnect();
          clearTimeout(t);
          resolve(el);
        }
      });
      obs.observe(root === document ? document.documentElement : root, {
        childList: true,
        subtree: true,
      });
      const t = setTimeout(() => {
        obs.disconnect();
        resolve(null);
      }, timeout);
    });
  },

  // Fire cb on every SPA route change (history API + popstate), deduped.
  onNavigate(cb) {
    let last = location.pathname + location.search;
    const check = () => {
      const now = location.pathname + location.search;
      if (now !== last) {
        last = now;
        cb(now);
      }
    };
    for (const m of ["pushState", "replaceState"]) {
      const orig = history[m];
      history[m] = function (...args) {
        const r = orig.apply(this, args);
        queueMicrotask(check);
        return r;
      };
    }
    addEventListener("popstate", check);
    // Xero mixes SPA and full-page loads; observer catches soft rerenders too.
    new MutationObserver(check).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  },

  el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) node.append(c);
    return node;
  },
};
