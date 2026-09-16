/* JobAI Auto-Fill - popup controller */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { payload: null };

  function status(text) {
    $("status").textContent = text;
  }

  function detectJobId(url) {
    if (!url) return "";
    const match = url.match(/\/jobs\/job\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function resolveActiveTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs && tabs[0] ? tabs[0] : null));
    });
  }

  function sendToTab(tabId, message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (res) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(res || null);
      });
    });
  }

  function sendToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(res || null);
      });
    });
  }

  function getStored(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (data) => resolve(data || {}));
    });
  }

  function setStored(obj) {
    return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
  }

  function renderProfiles() {
    const profiles = state.payload.profiles || [state.payload.profile];
    const sel = $("profileSel");
    sel.innerHTML = "";
    profiles.forEach((p, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = p.file_name || "Profile " + (i + 1);
      sel.appendChild(opt);
    });
    $("profileRow").style.display = profiles.length > 1 ? "block" : "none";
    $("fillBtn").disabled = false;
  }

  function selectedPayload() {
    const profiles = state.payload.profiles || [state.payload.profile];
    const idx = parseInt(($("profileSel").value || "0"), 10);
    return { job: state.payload.job, profile: profiles[idx] || profiles[0] };
  }

  async function ensureContentScript(tab) {
    const res = await sendToTab(tab.id, { type: "JOBAI_STATUS" });
    if (res && res.ok) return true;
    return new Promise((resolve) => {
      if (!chrome.scripting || !chrome.scripting.executeScript) {
        resolve(false);
        return;
      }
      chrome.scripting.executeScript(
        { target: { tabId: tab.id }, files: ["fill-engine.js", "content.js"] },
        () => resolve(!chrome.runtime.lastError)
      );
    });
  }

  async function onLoad() {
    const token = $("token").value.trim();
    const jobId = $("jobId").value.trim();
    if (!token) return status("Enter your JobAI API token first.");
    if (!jobId) return status("Enter the JobAI job id first.");
    await setStored({ jobalToken: token, jobalJobId: jobId });
    $("loadBtn").disabled = true;
    status("Loading profile data\u2026");
    const res = await sendToBackground({ type: "JOBAI_FETCH_FILL_DATA", token, jobId });
    $("loadBtn").disabled = false;
    if (!res || !res.ok) {
      status("Error: " + (res && res.error ? res.error : "could not reach the JobAI API. Check that the backend URL is allowed by your firewall."));
      return;
    }
    state.payload = res.payload;
    const n = (res.payload.profiles || [res.payload.profile]).length;
    renderProfiles();
    status("Loaded " + n + " profile" + (n === 1 ? "" : "s") + " for \u201c" + res.payload.job.title + "\u201d at " + res.payload.job.company + ".");
  }

  async function onFill() {
    if (!state.payload) return status("Load profile data first.");
    const tab = await resolveActiveTab();
    if (!tab || !tab.id) return status("No active tab found.");
    $("fillBtn").disabled = true;
    const injected = await ensureContentScript(tab);
    if (!injected) {
      $("fillBtn").disabled = false;
      return status("Could not inject the fill script on " + (tab.url || "this page") + ". Try the JobAI bookmarklet instead.");
    }
    const res = await sendToTab(tab.id, { type: "JOBAI_FILL", payload: selectedPayload() });
    $("fillBtn").disabled = false;
    if (res && res.ok) {
      status("Filled " + res.filled + " field" + (res.filled === 1 ? "" : "s") + " of " + res.total + " candidates on this page. Review every field before submitting.");
    } else {
      status("Nothing filled: " + (res && res.error ? res.error : "no matching fields on this page. The platform may have moved; try the bookmarklet flow from the JobAI apply page."));
    }
  }

  async function init() {
    $("loadBtn").addEventListener("click", onLoad);
    $("fillBtn").addEventListener("click", onFill);
    $("token").addEventListener("input", () => setStored({ jobalToken: $("token").value.trim() }));
    $("jobId").addEventListener("input", () => setStored({ jobalJobId: $("jobId").value.trim() }));

    const stored = await getStored(["jobalToken", "jobalJobId"]);
    if (stored.jobalToken) $("token").value = stored.jobalToken;
    if (stored.jobalJobId) $("jobId").value = stored.jobalJobId;

    const tab = await resolveActiveTab();
    if (tab && tab.url) {
      const detected = detectJobId(tab.url);
      if (detected && !stored.jobalJobId) $("jobId").value = detected;
    }

    const payloadRes = await sendToBackground({ type: "JOBAI_GET_PAYLOAD" });
    if (payloadRes && payloadRes.ok && state.payload == null) {
      state.payload = payloadRes.payload;
      renderProfiles();
      status("Loaded cached profile data. Fill this page, or load a different job id.");
    }
  }

  init();
})();