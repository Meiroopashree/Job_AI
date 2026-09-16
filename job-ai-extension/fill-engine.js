/* JobAI Auto-Fill - shared fill engine (content script / popup) */
if (!window.JobAIAutoFill) {
window.JobAIAutoFill = (function () {
  "use strict";

  const FIELD_RULES = {
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

  const MATCH_FIELDS = Object.keys(FIELD_RULES);

  function labelText(el) {
    const out = [];
    if (el.id) {
      const by = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (by) out.push(by.textContent || "");
    }
    const wrap = el.closest("label");
    if (wrap) out.push(wrap.textContent || "");
    const aria = el.getAttribute("aria-label");
    if (aria) out.push(aria);
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      labelledby.split(/\s+/).forEach((id) => {
        const node = document.getElementById(id);
        if (node) out.push(node.textContent || "");
      });
    }
    if (el.placeholder) out.push(el.placeholder);
    if (el.getAttribute("title")) out.push(el.getAttribute("title"));
    return out.join(" ").replace(/\s+/g, " ").trim();
  }

  function collectElements() {
    const elms = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    return Array.prototype.filter.call(elms, (el) => {
      const t = (el.type || "").toLowerCase();
      if (t === "submit" || t === "button" || t === "file" || t === "checkbox" || t === "radio" || t === "image" || t === "password") return false;
      if (el.disabled || el.readOnly) return false;
      if (el.offsetWidth === 0 && el.offsetHeight === 0 && !el.matches("select")) return false;
      return true;
    });
  }

  function score(el, rule) {
    let s = 0;
    const text = (labelText(el) + " " + (el.name || "") + " " + (el.id || "") + " " + (el.getAttribute("autocomplete") || "")).toLowerCase();
    const ac = (el.getAttribute("autocomplete") || "").toLowerCase();
    const explicit = (labelText(el) + " " + (el.getAttribute("aria-label") || "")).toLowerCase();

    rule.ac.forEach((a) => {
      if (ac === a) s += 4;
      else if (ac.indexOf(a) !== -1) s += 2;
    });
    rule.text.forEach((t) => {
      if (explicit.indexOf(t) === 0 || explicit.indexOf(" " + t) !== -1 || explicit.indexOf(":" + t) !== -1) s += 3;
      else if (text.indexOf(t) !== -1) s += 1;
    });
    if (rule.re && rule.re.test(text)) s += 2;
    if (el.tagName === "TEXTAREA" && rule.ac.length === 0 && (rule.id === "summary" || rule.id === "skills")) s += 2;
    if (el.tagName === "TEXTAREA" && rule.id === "full_name") s -= 3;
    return s;
  }

  function setValue(el, value) {
    if (el.tagName === "SELECT") {
      const lower = String(value).toLowerCase();
      const opts = Array.prototype.slice.call(el.options);
      let pick = opts.find((o) => o.text.trim().toLowerCase() === lower);
      if (!pick) pick = opts.find((o) => lower.indexOf(o.text.trim().toLowerCase()) !== -1);
      if (!pick) pick = opts.find((o) => o.value.trim().toLowerCase() === lower);
      if (pick) {
        el.value = pick.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return !!pick;
    }
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  return {
    fill(payload) {
      const fields = (payload.profile && payload.profile.fields) || {};
      const elements = collectElements();
      const assigned = new Set();
      let filled = 0;

      MATCH_FIELDS.forEach((fieldId) => {
        const value = (fields[fieldId] || "").trim();
        if (!value) return;
        const rule = FIELD_RULES[fieldId];
        let best = null;
        let bestScore = 0;
        elements.forEach((el) => {
          if (assigned.has(el)) return;
          const s = score(el, rule);
          if (s > bestScore) {
            bestScore = s;
            best = el;
          }
        });
        if (best && bestScore >= 2) {
          assigned.add(best);
          if (setValue(best, value)) filled++;
        }
      });

      return { filled, total: MATCH_FIELDS.length };
    },
    fields: MATCH_FIELDS,
  };
})();
}