/* JobAI Auto-Fill - bookmarklet engine
 * Loaded by the job-ai-bookmarklet from https://job-ai-frontend-beryl.vercel.app/autofill.js
 * Reads a JobAI fill payload (window.__JOBAI_AUTOFILL__ or clipboard JSON) and
 * fills matching fields on the current job application form. Never submits.
 */
(function () {
  "use strict";
  if (window.__JOBAI_AUTOFILL_LOADED__) return;

  var FIELD_RULES = {
    full_name: { ac: ["name"], text: ["full name", "legal name", "your name", "candidate name", "applicant name", "your full name", "name *", "name"], re: /\bname\b/i },
    email: { ac: ["email"], text: ["email", "e-mail", "email address", "email address *", "email *"], re: /e-?mail/i },
    phone: { ac: ["tel", "telephone"], text: ["phone", "telephone", "mobile", "cell phone", "contact number", "phone number", "phone *"], re: /phone|telephone|mobile|cell/i },
    location: { ac: ["address-level2", "address-level1", "country-name", "street-address", "address-line2"], text: ["location", "city", "current location", "current city", "address", "town", "location *", "city *"], re: /\b(location|city|address|town)\b/i },
    linkedin: { ac: ["url"], text: ["linkedin", "linkedin url", "linkedin profile", "linkedin *"], re: /linkedin|linked ?in/i },
    github: { ac: ["url"], text: ["github", "github url", "github profile"], re: /github|git ?hub/i },
    portfolio: { ac: ["url"], text: ["portfolio", "website", "web site", "personal site", "personal website", "portfolio url"], re: /portfolio|website|web ?site|personal site/i },
    current_title: { ac: ["organization-title", "job-title"], text: ["current title", "current job title", "job title", "most recent title", "title", "designation", "current role", "role", "title *"], re: /\b(title|designation)\b/i },
    current_company: { ac: ["organization", "company", "employer"], text: ["current company", "current employer", "company", "employer", "organization", "company name", "company *"], re: /\b(company|employer|organization)\b/i },
    years_experience: { ac: [], text: ["years of experience", "years experience", "years of experience *", "experience years", "total experience", "relevant experience", "work experience"], re: /years.{0,8}experience|experience.{0,8}years/i },
    summary: { ac: [], text: ["professional summary", "profile summary", "summary", "about me", "about you", "about", "bio", "cover letter", "personal statement", "introduction"], re: /\b(summary|about|bio|cover letter|personal statement|introduction)\b/i },
    skills: { ac: [], text: ["skills", "skill set", "key skills", "core skills", "technical skills", "skills *"], re: /\bskills?\b/i },
    education: { ac: [], text: ["education", "degree", "highest education", "qualification", "education *"], re: /\b(education|degree|qualification)\b/i },
    certifications: { ac: [], text: ["certifications", "certification", "certificates"], re: /certificat/i },
    languages: { ac: ["language"], text: ["languages", "language", "language fluency"], re: /language/i },
  };

  var MATCH_FIELDS = Object.keys(FIELD_RULES);

  function loadPayload() {
    if (window.__JOBAI_AUTOFILL__ && window.__JOBAI_AUTOFILL__.profile && window.__JOBAI_AUTOFILL__.profile.fields) {
      return window.__JOBAI_AUTOFILL__;
    }
    if (navigator.clipboard && navigator.clipboard.readText) {
      return navigator.clipboard.readText().then(function (text) {
        try {
          var parsed = JSON.parse(text);
          if (parsed.profile && parsed.profile.fields) return parsed;
        } catch { /* not a payload */ }
        return null;
      });
    }
    return Promise.resolve(null);
  }

  function labelText(el) {
    var out = [];
    if (el.id) {
      var by = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (by) out.push(by.textContent || "");
    }
    var wrap = el.closest("label");
    if (wrap) out.push(wrap.textContent || "");
    var aria = el.getAttribute("aria-label");
    if (aria) out.push(aria);
    var labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      labelledby.split(/\s+/).forEach(function (id) {
        var node = document.getElementById(id);
        if (node) out.push(node.textContent || "");
      });
    }
    if (el.placeholder) out.push(el.placeholder);
    if (el.getAttribute("title")) out.push(el.getAttribute("title"));
    return out.join(" ").replace(/\s+/g, " ").trim();
  }

  function collectElements() {
    var elms = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    return Array.prototype.filter.call(elms, function (el) {
      var t = (el.type || "").toLowerCase();
      if (t === "submit" || t === "button" || t === "file" || t === "checkbox" || t === "radio" || t === "image" || t === "password") return false;
      if (el.disabled || el.readOnly) return false;
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
      return true;
    });
  }

  function score(el, rule) {
    var score = 0;
    var text = (labelText(el) + " " + (el.name || "") + " " + (el.id || "") + " " + (el.getAttribute("autocomplete") || "")).toLowerCase();
    var ac = (el.getAttribute("autocomplete") || "").toLowerCase();
    var explicit = (labelText(el) + " " + (el.getAttribute("aria-label") || "")).toLowerCase();

    rule.ac.forEach(function (a) {
      if (ac === a) score += 4;
      else if (ac.indexOf(a) !== -1) score += 2;
    });
    rule.text.forEach(function (t) {
      if (explicit.indexOf(t) === 0 || explicit.indexOf(" " + t) !== -1 || explicit.indexOf(":" + t) !== -1) score += 3;
      else if (text.indexOf(t) !== -1) score += 1;
    });
    if (rule.re && rule.re.test(text)) score += 2;
    if ((el.tagName === "TEXTAREA") && rule.ac.length === 0 && (rule.id === "summary" || rule.id === "skills")) score += 2;
    if ((el.tagName === "TEXTAREA") && rule.id === "full_name") score -= 3;
    return score;
  }

  function setValue(el, value) {
    if (el.tagName === "SELECT") {
      var lower = String(value).toLowerCase();
      var opts = Array.prototype.slice.call(el.options);
      var pick = opts.find(function (o) { return o.text.trim().toLowerCase() === lower; });
      if (!pick) pick = opts.find(function (o) { return lower.indexOf(o.text.trim().toLowerCase()) !== -1; });
      if (!pick) pick = opts.find(function (o) { return o.value.trim().toLowerCase() === lower; });
      if (pick) {
        el.value = pick.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return !!pick;
    }
    var proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    if (el.tagName === "TEXTAREA") {
      var evt = new Event("input", { bubbles: true });
      Object.defineProperty(evt, "target", { value: el });
      el.dispatchEvent(evt);
    }
    return true;
  }

  function fill(payload) {
    var fields = (payload.profile && payload.profile.fields) || {};
    var elements = collectElements();
    var assigned = {};
    var filled = 0;

    MATCH_FIELDS.forEach(function (fieldId) {
      var value = (fields[fieldId] || "").trim();
      if (!value) return;
      var rule = FIELD_RULES[fieldId];
      var best = null;
      var bestScore = 0;
      elements.forEach(function (el) {
        if (assigned[el]) return;
        var s = score(el, rule);
        if (s > bestScore) { bestScore = s; best = el; }
      });
      if (best && bestScore >= 2) {
        assigned[best] = true;
        if (setValue(best, value)) filled++;
      }
    });
    return filled;
  }

  function toast(filled) {
    var name = (window.__JOBAI_AUTOFILL__ && window.__JOBAI_AUTOFILL__.profile && window.__JOBAI_AUTOFILL__.profile.file_name) || "";
    var box = document.createElement("div");
    box.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#35231d;color:#fbf5eb;padding:12px 16px;border-radius:12px;font:600 13px/1.4 -apple-system,'Segoe UI',sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25);max-width:320px;";
    box.textContent = filled > 0 ? "JobAI: filled " + filled + " field" + (filled === 1 ? "" : "s") + (name ? " (" + name + ")" : "") + ". Review before submitting." : "JobAI: no fields matched. Copy autofill data in JobAI first.";
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 6000);
  }

  loadPayload().then(function (payload) {
    if (!payload) {
      toast(0);
      return;
    }
    var filled = fill(payload);
    toast(filled);
  }).catch(function () { toast(0); });

  window.__JOBAI_AUTOFILL_LOADED__ = true;
  setTimeout(function () {
    window.__JOBAI_AUTOFILL_LOADED__ = false;
  }, 0);
})();