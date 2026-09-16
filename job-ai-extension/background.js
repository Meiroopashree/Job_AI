const API_BASE = "https://jobai-api-zs2f.onrender.com";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "JOBAI_PING") {
    sendResponse({ ok: true });
    return;
  }

  if (msg && msg.type === "JOBAI_GET_PAYLOAD") {
    chrome.storage.local.get(["jobalPayload", "jobalPayloadAt"], (data) => {
      if (data.jobalPayload && data.jobalPayloadAt && Date.now() - data.jobalPayloadAt < 1000 * 60 * 60) {
        sendResponse({ ok: true, fromStorage: true, payload: data.jobalPayload });
      } else {
        sendResponse({ ok: false, error: "No autofill payload stored" });
      }
    });
    return true;
  }

  if (msg && msg.type === "JOBAI_SET_PAYLOAD") {
    chrome.storage.local.set({ jobalPayload: msg.payload, jobalPayloadAt: Date.now() }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg && msg.type === "JOBAI_FETCH_FILL_DATA") {
    if (!msg.token) {
      sendResponse({ ok: false, error: "Not signed in - add your JobAI token in the extension popup" });
      return;
    }
    fetch(`${API_BASE}/apply/fill-data/${encodeURIComponent(msg.jobId)}`, {
      headers: { Authorization: `Bearer ${msg.token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("JobAI API returned HTTP " + r.status);
        return r.json();
      })
      .then((data) => {
        if (!data.profiles || !data.profiles.length) {
          throw new Error("No resume profile found - upload one in JobAI first");
        }
        const payload =
          data.profiles.length === 1
            ? { job: data.job, profile: data.profiles[0] }
            : { job: data.job, profile: data.profiles[0], profiles: data.profiles };
        chrome.storage.local.set({ jobalPayload: payload, jobalPayloadAt: Date.now() }, () => {
          sendResponse({ ok: true, payload });
        });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }));
    return true;
  }
});