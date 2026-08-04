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
    this.modules.push(mod);
  },
};

globalThis.XT = XT;
