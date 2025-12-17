/* Pagina pubblica: legge data/items.json e mostra gli oggetti */
(function () {
  const titleEl = document.getElementById("siteTitle");
  const subtitleEl = document.getElementById("siteSubtitle");
  const qEl = document.getElementById("q");
  const statusEl = document.getElementById("status");
  const clearBtn = document.getElementById("clear");
  const gridEl = document.getElementById("grid");
  const loadingEl = document.getElementById("loading");
  const emptyEl = document.getElementById("empty");
  const contactBtn = document.getElementById("contactBtn");

  titleEl.textContent = window.SITE_TITLE || "Lost & Found";
  subtitleEl.textContent = window.SITE_SUBTITLE || "Hai perso qualcosa? Controlla qui 👇";
  document.title = window.SITE_TITLE || "Lost & Found";

  const contactLink = window.CONTACT_WHATSAPP_LINK || window.CONTACT_EMAIL || "#";
  contactBtn.href = contactLink;

  let items = [];

  function escapeHtml(s) {
    return (s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtDate(d) {
    if (!d) return "—";
    try {
      const [y, m, dd] = d.split("-").map(Number);
      const dt = new Date(y, (m || 1) - 1, dd || 1);
      return dt.toLocaleDateString("it-IT");
    } catch {
      return d;
    }
  }

  function card(it) {
    const statusBadge = it.status === "returned"
      ? '<span class="badge" style="border-color: rgba(56,217,169,.35); color: var(--ok);">Restituito</span>'
      : '<span class="badge" style="border-color: rgba(122,162,255,.35);">Da restituire</span>';

    const img = it.photo
      ? `<img src="${escapeHtml(it.photo)}" alt="${escapeHtml(it.title)}" loading="lazy" />`
      : `<img alt="" />`;

    return `
      <div class="card">
        ${img}
        <div class="content">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
            <h3>${escapeHtml(it.title)}</h3>
            ${statusBadge}
          </div>
          <div class="meta">Trovato: <b>${fmtDate(it.found_date)}</b></div>
          ${it.description ? `<p>${escapeHtml(it.description)}</p>` : `<p class="small">Nessuna descrizione.</p>`}
        </div>
        <div class="actions">
          <a class="btn" href="${contactLink}" target="_blank" rel="noopener">È mio</a>
          <a class="btn secondary" href="${it.photo ? escapeHtml(it.photo) : "#"}" target="_blank" rel="noopener">Apri foto</a>
        </div>
      </div>
    `;
  }

  function render() {
    const q = (qEl.value || "").trim().toLowerCase();
    const s = statusEl.value;

    const filtered = items.filter((it) => {
      const matchesStatus =
        s === "all" ? true :
        s === "found" ? it.status !== "returned" :
        it.status === "returned";

      const text = `${it.title || ""} ${it.description || ""}`.toLowerCase();
      const matchesQuery = q ? text.includes(q) : true;

      return matchesStatus && matchesQuery;
    });

    gridEl.innerHTML = filtered.map(card).join("");
    loadingEl.classList.add("hidden");
    emptyEl.classList.toggle("hidden", filtered.length !== 0);
  }

  async function load() {
    loadingEl.classList.remove("hidden");
    emptyEl.classList.add("hidden");

    try {
      const cacheBust = "cb=" + Date.now();
      const res = await fetch("data/items.json?" + cacheBust, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      items = Array.isArray(data) ? data : [];
      render();
    } catch (e) {
      console.error(e);
      loadingEl.textContent = "Errore nel caricamento (controlla data/items.json).";
    }
  }

  qEl.addEventListener("input", render);
  statusEl.addEventListener("change", render);
  clearBtn.addEventListener("click", () => { qEl.value = ""; render(); });

  load();
})();
