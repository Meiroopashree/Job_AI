/* JobAI Auto-Fill - content script
 * Receives JOBAI_FILL from the popup (with an explicit payload, or pulls the
 * cached one from extension storage) and runs the shared fill engine.
 */
(() => {
  "use strict";
  if (window.__JOBAI_CONTENT_LOADED__) return;
  window.__JOBAI_CONTENT_LOADED__ = true;

  const engine = () => window.JobAIAutoFill;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "JOBAI_STATUS") {
      sendResponse({ ok: true, loaded: true });
      return;
    }

    if (msg.type === "JOBAI_FILL") {
      const run = (payload) => {
        const fill = engine();
        if (!fill) {
          sendResponse({ ok: false, error: "Fill engine not loaded - reload the page and retry" });
          return;
        }
        if (!payload || !payload.profile || !payload.profile.fields) {
          sendResponse({ ok: false, error: "No autofill payload loaded. Open the JobAI popup and load profile data first." });
          return;
        }
        const result = fill.fill(payload);
        sendResponse({ ok: true, filled: result.filled, total: result.total });
      };

      if (msg.payload) {
        run(msg.payload);
      } else {
        chrome.runtime.sendMessage({ type: "JOBAI_GET_PAYLOAD" }, (res) => {
          run(res && res.ok ? res.payload : null);
        });
      }
      return true;
    }
  });
})();