"use strict";

(async function () {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onXero = /^https:\/\/[^/]*\.xero\.com\//.test(tab?.url || "");
  document.getElementById(onXero ? "on-xero" : "off-xero").hidden = false;
  if (!onXero) return;

  const cfg = await chrome.storage.sync.get(null);
  const root = document.getElementById("modules");
  for (const mod of XT_CATALOG) {
    const row = document.createElement("label");
    row.className = "row";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = cfg[mod.id] !== false;
    box.addEventListener("change", () => chrome.storage.sync.set({ [mod.id]: box.checked }));
    const name = document.createElement("span");
    name.textContent = mod.title;
    row.append(box, name);
    root.append(row);
  }

  document.getElementById("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
})();
