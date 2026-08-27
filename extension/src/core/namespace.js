// XT — global namespace shared by all content scripts (classic scripts, no bundler).
// Load order is defined by manifest.json: core/* -> modules/* -> main.js
"use strict";

var XT = globalThis.XT || {
  // Module registry. Each module file calls XT.register({...}) at load time.
  //
  // Module shape:
  //   id:      string   — stable id, also the settings/killswitch key
  //   tier:    "free" | "pro"
  //   title:   string   — shown in options/popup UI
  //   init:    (ctx) => void
  //   destroy: () => void
  //
  // init(ctx) runs when the module is enabled and the page is ready. It must be
  // idempotent per navigation (main.js re-invokes it on SPA route changes) and
  // destroy() must fully remove the module's DOM/listeners so a kill-switch
  // flip at runtime leaves no trace.
  modules: [],

  register(mod) {
    if (!mod || !mod.id || typeof mod.init !== "function" || typeof mod.destroy !== "function") {
      console.warn("[XT] invalid module registration", mod);
      return;
    }

    // Every init() awaits (waiting for Xero's markup, reading settings) before
    // it touches the page, so a guard written inside the module runs after the
    // await and cannot stop a second call that got there first. Two overlapping
    // calls then both insert, and because each one overwrites the module's
    // reference to what it built, the earlier node is orphaned in the page with
    // nothing left pointing at it. That is how the favourites bar grew a new
    // row on every pin.
    //
    // Overlapping calls are routine: pinning a page writes settings, which
    // re-inits every module, while an SPA navigation may be doing the same.
    const rawInit = mod.init.bind(mod);
    const rawDestroy = mod.destroy.bind(mod);
    let running = false;
    let queued = false;

    mod.init = async function guardedInit() {
      // Re-entrant calls are remembered rather than dropped: the second one
      // usually means the page changed under us, so its work still has to
      // happen — just not at the same time.
      if (running) {
        queued = true;
        return;
      }
      running = true;
      try {
        await rawInit();
      } finally {
        running = false;
      }
      if (queued) {
        queued = false;
        await mod.init();
      }
    };

    mod.destroy = function guardedDestroy() {
      rawDestroy();
      // Sweep by marker, not by stored reference, so anything the module lost
      // track of still goes. Without this an orphan survives every teardown.
      for (const n of document.querySelectorAll(`[data-xt-item="${mod.id}"]`)) n.remove();
    };

    this.modules.push(mod);
  },
};

globalThis.XT = XT;
