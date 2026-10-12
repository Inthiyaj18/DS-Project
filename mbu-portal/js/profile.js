/* =====================================================================
   profile.js  -  Student profile page (profile.html)

   Renders the ID card (photo + basic details, taken from `profile`
   in js/data.js) and the social / contact buttons taken from
   `socialLinks` in js/data.js.
   ===================================================================== */
(function () {
  initCommon("profile");

  const app = $("#pfApp");
  const stored = (window.MBUData && window.MBUData.getState().profile);
  const data = (stored && Object.keys(stored).length) ? stored : (typeof profile !== "undefined" && profile ? profile : null);

  /* ---- Friendly state when the profile data is missing ---- */
  if (!data) {
    app.innerHTML = `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">⚠</div>
        <h3>Profile not available</h3>
        <p>The profile data could not be loaded.</p>
        <p style="margin-top:16px"><a class="btn btn-primary" data-nav href="index.html">Back to dashboard</a></p>
      </div>`;
    return;
  }

  document.title = "Profile | " + (data.name || "Student");

  /* ---------------- ID card ---------------- */
  const value = (v) => (String(v || "").trim() ? String(v) : "—");

  $("#pfTitle").textContent = value(data.name);
  $("#pfHeroSub").textContent = [data.roll, data.branch, data.degree]
    .filter(Boolean)
    .join("  ·  ");

  $("#pfName").textContent = value(data.name);
  $("#pfNameFull").textContent = value(data.name);
  $("#pfRoll").textContent = value(data.roll);
  $("#pfBranch").textContent = value(data.branch);
  $("#pfFaculty").textContent = value(data.faculty);
  $("#pfDegree").textContent = value(data.degree);
  $("#pfSubject").textContent = value(data.subjectCode);

  fillAvatar($("#pfAvatar"), data.name, data.photo);

  /* ---------------- Social links ---------------- */
  const ICONS = {
    linkedin: "in", github: "GH", instagram: "◎", twitter: "𝕏",
    x: "𝕏", youtube: "▶", email: "✉", website: "🌐"
  };
  const LABELS = {
    linkedin: "LinkedIn", github: "GitHub", instagram: "Instagram",
    twitter: "X (Twitter)", x: "X (Twitter)", youtube: "YouTube",
    email: "Email", website: "Website"
  };

  const links = (window.MBUData && window.MBUData.getState().socialLinks) || (typeof socialLinks !== "undefined" && socialLinks ? socialLinks : {});
  const grid = $("#socialGrid");

  const entries = Object.keys(links)
    .map((key) => [key, String(links[key] || "").trim()])
    .filter((entry) => entry[1] !== "");

  if (!entries.length) {
    $("#socialEmpty").hidden = false;
    return;
  }

  grid.innerHTML = entries.map(([key, url]) => {
    const isMail = url.toLowerCase().indexOf("mailto:") === 0;
    const label = LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
    const icon = ICONS[key] || "🔗";
    const hint = isMail ? url.slice(7) : hostOf(url);
    const attrs = isMail
      ? ""
      : ' target="_blank" rel="noopener noreferrer"';

    return (
      '<a class="social-tile" href="' + esc(url) + '"' + attrs +
      ' aria-label="' + esc(label) + ": " + esc(hint) + '"' +
      ' title="' + esc(label) + '">' +
      '<span class="social-ico" aria-hidden="true">' + esc(icon) + "</span>" +
      '<span class="social-text"><strong>' + esc(label) + "</strong>" +
      "<small>" + esc(hint) + "</small></span>" +
      '<span class="social-go" aria-hidden="true">' + (isMail ? "✉" : "↗") + "</span>" +
      "</a>"
    );
  }).join("");

  /* "https://www.linkedin.com/in/jane" -> "linkedin.com/in/jane" */
  function hostOf(url) {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
      return (parsed.hostname.replace(/^www\./, "") + path) || url;
    } catch (e) {
      return url;
    }
  }
})();
