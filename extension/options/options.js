"use strict";

async function render() {
  const cfg = await chrome.storage.sync.get(null);
  const { killswitch, license } = await chrome.storage.local.get(["killswitch", "license"]);
  const killed = (killswitch && killswitch.disabled) || [];
  const hasPro = XT_LICENSE_RULES.standing(license).pro;
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
      // install prompt. Ask for it here, at the moment it becomes useful — and
      // hand it back the moment it stops being useful, so the permissions list
      // always matches what the extension is actually doing.
      if (mod.needsDownloads) {
        if (box.checked) {
          const ok = await chrome.permissions.request({ permissions: ["downloads"] });
          if (!ok) {
            box.checked = false;
            return;
          }
        } else {
          await chrome.permissions.remove({ permissions: ["downloads"] });
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
  const standing = XT_LICENSE_RULES.standing(license);
  const state = document.getElementById("pro-state");
  const input = document.getElementById("license-key");
  const remove = document.getElementById("license-remove");
  const buy = document.getElementById("buy-link");

  buy.href = XT_CONFIG.checkoutUrl;
  if (license?.key) input.value = license.key;
  remove.hidden = !license?.key;

  state.className = "state " + (standing.pro ? "ok" : "off");
  if (standing.pro) {
    const used = license.activationUsage;
    const limit = license.activationLimit;
    const seats = limit ? ` · ${used} of ${limit} browsers activated` : "";
    state.textContent =
      standing.reason === "grace"
        ? `Pro is active (offline — last checked ${when(license.checkedAt)})${seats}`
        : `Pro is active${seats}`;
  } else {
    state.textContent = explain(standing.reason);
  }
}

// Reasons are stored as slugs so the UI can say something useful rather than
// "invalid", which sends people to support for a problem they could fix.
function explain(reason) {
  switch (reason) {
    case "none": return "Pro is not active. Paste a licence key to unlock it.";
    case "not-configured": return "Pro is not available in this build yet.";
    case "wrong-store":
    case "wrong-product": return "That key is for a different product.";
    case "key-expired":
    case "expired": return "That licence has expired. Renew it to continue.";
    case "key-disabled": return "That licence has been disabled.";
    case "key-inactive": return "That licence is not active yet.";
    case "test-key": return "That is a test-mode key and this build does not accept them.";
    case "offline": return "Could not reach the licence server. It will retry.";
    default: return "That licence is not valid. Pro features stay off.";
  }
}

function when(ts) {
  if (!ts) return "never";
  const days = Math.floor((Date.now() - ts) / 86400000);
  return days < 1 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

document.getElementById("license-save").addEventListener("click", async () => {
  const key = document.getElementById("license-key").value.trim();
  const status = document.getElementById("license-status");
  status.textContent = "Checking…";
  const res = await chrome.runtime.sendMessage({ type: "license:activate", key });
  status.textContent = res?.ok ? "" : explain(res?.reason);
  render();
  renderLicense();
});

document.getElementById("license-remove").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "license:deactivate" });
  document.getElementById("license-key").value = "";
  document.getElementById("license-status").textContent =
    "Removed from this browser. The activation slot is free again.";
  render();
  renderLicense();
});

// Keep both panels honest when the licence changes from anywhere (activation
// here, a background revalidation, or a manual reset).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.license) {
    render();
    renderLicense();
  }
});

render();
renderLicense();
