// Boot: load settings + killswitch, gate modules, run them, re-run on SPA
// navigation, and hot-apply settings changes.
"use strict";

(async function boot() {
  let cfg = await XT.settings.load();
  let lic = await XT.license.status();
  const running = new Set();

  // Returns null when the module may run, otherwise why it may not.
  function blockedBecause(mod) {
    if (cfg._killswitch.includes(mod.id)) return "disabled remotely"; // wins over user
    if (cfg[mod.id] === false) return "switched off";
    if (mod.tier === "pro" && !lic.pro) return `Pro (licence: ${lic.reason})`;
    return null;
  }

  function allowed(mod) {
    return blockedBecause(mod) === null;
  }

  // Modules are async, so a throw inside one arrives as a rejected promise and
  // slips straight past try/catch. That is how a module spent two debugging
  // rounds listed as active while doing nothing. Route every call through here.
  function run(mod, method) {
    try {
      const r = mod[method]();
      if (r && typeof r.catch === "function") {
        r.catch((e) => console.warn(`[XT] module ${mod.id}.${method} failed`, e));
      }
    } catch (e) {
      console.warn(`[XT] module ${mod.id}.${method} failed`, e);
    }
  }

  function sync() {
    for (const mod of XT.modules) {
      const want = allowed(mod);
      const has = running.has(mod.id);
      // One broken module must never take down the rest (HANDOFF §4).
      if (want && !has) {
        run(mod, "init");
        running.add(mod.id);
      } else if (!want && has) {
        run(mod, "destroy");
        running.delete(mod.id);
      }
    }
  }

  sync();

  // One line at boot saying what is running and why the rest is not. A module
  // that is gated off is otherwise indistinguishable from a broken one, which
  // has already cost a debugging round.
  console.info(
    "[XT] active: " + ([...running].join(", ") || "none") + " | " +
      (XT.modules
        .filter((m) => !running.has(m.id))
        .map((m) => `${m.id} (${blockedBecause(m)})`)
        .join(", ") || "nothing gated off")
  );

  // Re-init route-scoped modules on SPA navigation. destroy() first so init()
  // can re-anchor to the new page's DOM.
  XT.dom.onNavigate(() => {
    for (const mod of XT.modules) {
      if (!running.has(mod.id)) continue;
      run(mod, "destroy");
      run(mod, "init");
    }
  });

  // Settings changes can alter what a running module renders (pinning a page,
  // editing the filename template), not just whether it runs — so restart the
  // ones still enabled rather than only starting and stopping.
  XT.settings.onChange(async () => {
    cfg = await XT.settings.load();
    lic = await XT.license.status();
    for (const mod of XT.modules) {
      if (!running.has(mod.id) || !allowed(mod)) continue;
      run(mod, "destroy");
      run(mod, "init");
    }
    sync();
  });

  // Ask the service worker to refresh the killswitch file (throttled there).
  chrome.runtime.sendMessage({ type: "killswitch:refresh" }).catch(() => {});
})();
