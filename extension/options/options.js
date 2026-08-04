"use strict";

async function render() {
  const cfg = await chrome.storage.sync.get(null);
  const { killswitch, license } = await chrome.storage.local.get(["killswitch", "license"]);
  const killed = (killswitch && killswitch.disabled) || [];
  const hasPro = !!license?.valid;
  const root = document.getElementById("modules");
  root.textContent = "";

  for (const mod of XT_CATALOG) {
    const row = document.createElement("label");
    row.className = "module-row";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = cfg[mod.id] !== false;
    box.addEventListener("change", async () => {
      // Renaming downloads needs a permission we deliberately keep out of the
      // install prompt. Ask for it here, at the moment it becomes useful.
      if (box.checked && mod.needsDownloads) {
        const ok = await chrome.permissions.request({ permissions: ["downloads"] });
        if (!ok) {
          box.checked = false;
          return;
        }
      }
      chrome.storage.sync.set({ [mod.id]: box.checked });
    });
    const name = document.createElement("span");
    name.textContent = mod.title;
    row.append(box, name);
    if (mod.tier === "pro") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "PRO";
      row.append(badge);
      // A ticked box on a feature the licence gate will refuse reads as broken.
      // Show the gate instead of letting it fail silently.
      if (!hasPro) {
        box.disabled = true;
        const note = document.createElement("span");
        note.className = "badge badge-off";
        note.textContent = "needs a licence";
        row.append(note);
      }
    }
    if (killed.includes(mod.id)) {
      const badge = document.createElement("span");
      badge.className = "badge badge-off";
      badge.textContent = "temporarily disabled (Xero update)";
      box.disabled = true;
      row.append(badge);
    }
    root.append(row);
  }
}

async function renderLicense() {
  const { license } = await chrome.storage.local.get("license");
  const status = document.getElementById("license-status");
  const input = document.getElementById("license-key");
  if (license?.key) input.value = license.key;
  status.textContent = license?.valid
    ? "Pro is active. Pro features can be switched on above."
    : license?.key
      ? "That licence is not valid. Pro features stay off."
      : "Pro is not active. Pro features above are locked.";
}

// Keep both panels honest when the licence changes from anywhere (activation
// here, a background revalidation, or a manual reset).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.license) {
    render();
    renderLicense();
  }
});

document.getElementById("license-save").addEventListener("click", async () => {
  const key = document.getElementById("license-key").value.trim();
  const status = document.getElementById("license-status");
  status.textContent = "Checking…";
  const res = await chrome.runtime.sendMessage({ type: "license:validate", key });
  status.textContent = res?.valid
    ? "Pro is active. Pro features can be switched on above."
    : res?.offline
      ? "Could not reach the licence server — will retry."
      : "That licence is not valid. Pro features stay off.";
  render();
});

render();
renderLicense();
