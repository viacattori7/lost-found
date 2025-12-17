/* Admin: password semplice + commit su GitHub (contents API) */
(function () {
  const pwModal = document.getElementById("pwModal");
  const pwEl = document.getElementById("pw");
  const pwBtn = document.getElementById("pwBtn");
  const pwMsg = document.getElementById("pwMsg");

  const ownerEl = document.getElementById("owner");
  const repoEl = document.getElementById("repo");
  const branchEl = document.getElementById("branch");
  const tokenEl = document.getElementById("token");
  const saveTokenBtn = document.getElementById("saveTokenBtn");
  const tokenMsg = document.getElementById("tokenMsg");

  const titleEl = document.getElementById("title");
  const foundDateEl = document.getElementById("found_date");
  const descEl = document.getElementById("description");
  const photoEl = document.getElementById("photo");
  const statusEl = document.getElementById("status");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadMsg = document.getElementById("uploadMsg");

  const listEl = document.getElementById("list");
  const listLoading = document.getElementById("listLoading");
  const refreshBtn = document.getElementById("refreshBtn");
  const filterStatusEl = document.getElementById("filterStatus");

  const SESSION_TOKEN_KEY = "lf_github_token";
  const SESSION_CFG_KEY = "lf_github_cfg";

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

  function slugify(s) {
    return (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "oggetto";
  }

  async function sha256Hex(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function checkPassword() {
    pwMsg.textContent = "";
    const entered = pwEl.value || "";
    const salt = window.ADMIN_PASSWORD_SALT || "";
    const expected = (window.ADMIN_PASSWORD_SHA256 || "").toLowerCase();
    const got = (await sha256Hex(salt + entered)).toLowerCase();
    return got === expected;
  }

  pwBtn.addEventListener("click", async () => {
    pwBtn.disabled = true;
    try {
      const ok = await checkPassword();
      if (!ok) {
        pwMsg.textContent = "Password errata.";
        return;
      }
      pwModal.classList.add("hidden");
      await init();
    } catch (e) {
      console.error(e);
      pwMsg.textContent = "Errore (browser troppo vecchio?).";
    } finally {
      pwBtn.disabled = false;
    }
  });

  pwEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") pwBtn.click();
  });

  function getCfg() {
    const owner = (ownerEl.value || "").trim() || window.GITHUB_OWNER || "";
    const repo = (repoEl.value || "").trim() || window.GITHUB_REPO || "";
    const branch = (branchEl.value || "").trim() || window.GITHUB_BRANCH || "main";
    return { owner, repo, branch };
  }

  function getToken() {
    return (tokenEl.value || "").trim() || (sessionStorage.getItem(SESSION_TOKEN_KEY) || "").trim();
  }

  function saveCfgToSession(cfg) {
    sessionStorage.setItem(SESSION_CFG_KEY, JSON.stringify(cfg));
  }

  function loadCfgFromSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_CFG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveTokenBtn.addEventListener("click", () => {
    tokenMsg.textContent = "";
    const tok = (tokenEl.value || "").trim();
    if (!tok) {
      tokenMsg.textContent = "Inserisci il token.";
      return;
    }
    sessionStorage.setItem(SESSION_TOKEN_KEY, tok);
    tokenEl.value = "";
    tokenMsg.textContent = "Token salvato per questa sessione ✅";
  });

  async function ghRequest(path, { method = "GET", token, body } = {}) {
    const url = "https://api.github.com" + path;
    const headers = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers["Authorization"] = "Bearer " + token;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const txt = await res.text();
    let data;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) ? (data.message || data.error) : ("HTTP " + res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function base64FromArrayBuffer(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    // GitHub content è base64 con newline ogni 60 chars circa
    const clean = (b64 || "").replace(/\n/g, "");
    const bin = atob(clean);
    // decode binary to utf-8
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function getItemsFile(token, cfg) {
    // GET /repos/{owner}/{repo}/contents/{path}
    return await ghRequest(`/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/data/items.json?ref=${encodeURIComponent(cfg.branch)}`, { token });
  }

  async function putFile(token, cfg, path, contentB64, message, sha) {
    const body = { message, content: contentB64, branch: cfg.branch };
    if (sha) body.sha = sha;
    return await ghRequest(`/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${path}`, { method: "PUT", token, body });
  }

  async function deleteFile(token, cfg, path, sha, message) {
    const body = { message, sha, branch: cfg.branch };
    return await ghRequest(`/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${path}`, { method: "DELETE", token, body });
  }

  async function loadList() {
    listLoading.textContent = "Caricamento…";
    listLoading.classList.remove("hidden");
    listEl.innerHTML = "";

    const token = getToken();
    const cfg = getCfg();

    if (!cfg.owner || !cfg.repo) {
      listLoading.textContent = "Imposta OWNER e REPO sopra.";
      return;
    }
    if (!token) {
      listLoading.textContent = "Inserisci il GitHub Token per leggere/scrivere dal repo.";
      return;
    }

    try {
      const file = await getItemsFile(token, cfg);
      const jsonText = base64ToUtf8(file.content || "");
      let items = [];
      try { items = JSON.parse(jsonText) || []; } catch { items = []; }

      const filter = filterStatusEl.value;
      if (filter === "found") items = items.filter(it => it.status !== "returned");
      if (filter === "returned") items = items.filter(it => it.status === "returned");

      listLoading.classList.add("hidden");

      if (!items.length) {
        listEl.innerHTML = '<div class="small">Nessun elemento.</div>';
        return;
      }

      listEl.innerHTML = items.map(it => {
        const statusText = it.status === "returned" ? "Restituito" : "Da restituire";
        const toggleLabel = it.status === "returned" ? "Rimetti 'da restituire'" : "Segna come restituito";
        const toggleClass = it.status === "returned" ? "secondary" : "ok";

        return `
          <div class="card" style="margin-bottom:12px;">
            ${it.photo ? `<img src="${escapeHtml(it.photo)}" alt="${escapeHtml(it.title)}" />` : `<img alt="" />`}
            <div class="content">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                <h3>${escapeHtml(it.title || "")}</h3>
                <span class="badge">${statusText}</span>
              </div>
              <div class="meta">Trovato: <b>${fmtDate(it.found_date)}</b></div>
              ${it.description ? `<p>${escapeHtml(it.description)}</p>` : `<p class="small">Nessuna descrizione.</p>`}
              <div class="small">id: <code>${escapeHtml(it.id || "")}</code></div>
            </div>
            <div class="actions">
              <button class="btn ${toggleClass}" data-action="toggle" data-id="${escapeHtml(it.id || "")}">${toggleLabel}</button>
              <a class="btn secondary" href="${it.photo ? escapeHtml(it.photo) : "#"}" target="_blank" rel="noopener">Apri foto</a>
              <button class="btn danger" data-action="delete" data-id="${escapeHtml(it.id || "")}">Elimina</button>
            </div>
          </div>
        `;
      }).join("");

    } catch (e) {
      console.error(e);
      listLoading.textContent = "Errore nel caricamento lista: " + (e.message || "unknown");
    }
  }

  async function updateItemsJson(token, cfg, updaterFn, commitMessage) {
    const file = await getItemsFile(token, cfg);
    const sha = file.sha;
    const jsonText = base64ToUtf8(file.content || "");
    const items = JSON.parse(jsonText) || [];

    const nextItems = updaterFn(items);

    const pretty = JSON.stringify(nextItems, null, 2) + "\n";
    const contentB64 = utf8ToBase64(pretty);

    await putFile(token, cfg, "data/items.json", contentB64, commitMessage, sha);
  }

  listEl.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    const token = getToken();
    const cfg = getCfg();
    if (!token) return alert("Inserisci il token.");
    if (!cfg.owner || !cfg.repo) return alert("Imposta OWNER/REPO.");

    btn.disabled = true;

    try {
      if (action === "toggle") {
        await updateItemsJson(token, cfg, (items) => {
          return items.map(it => it.id === id ? { ...it, status: it.status === "returned" ? "found" : "returned" } : it);
        }, `Toggle status: ${id}`);
      }

      if (action === "delete") {
        if (!confirm("Sicura di voler eliminare questo oggetto?")) return;
        // rimuove voce dal JSON
        let deletedPhotoPath = null;

        await updateItemsJson(token, cfg, (items) => {
          const kept = [];
          for (const it of items) {
            if (it.id === id) {
              // prova a derivare path repo dalla URL relativa (es: uploads/x.jpg)
              if (it.photo && it.photo.startsWith("uploads/")) deletedPhotoPath = it.photo;
              continue;
            }
            kept.push(it);
          }
          return kept;
        }, `Delete item: ${id}`);

        // prova a rimuovere anche la foto (se era in uploads/)
        if (deletedPhotoPath) {
          try {
            const file = await ghRequest(`/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${deletedPhotoPath}?ref=${encodeURIComponent(cfg.branch)}`, { token });
            await deleteFile(token, cfg, deletedPhotoPath, file.sha, `Delete photo: ${id}`);
          } catch (e) {
            console.warn("Foto non rimossa (ok):", e);
          }
        }
      }

      await loadList();
    } catch (e) {
      console.error(e);
      alert("Errore: " + (e.message || "unknown") + (e.status ? ` (HTTP ${e.status})` : ""));
    } finally {
      btn.disabled = false;
    }
  });

  uploadBtn.addEventListener("click", async () => {
    uploadMsg.textContent = "";
    uploadBtn.disabled = true;

    try {
      const token = getToken();
      const cfg = getCfg();

      if (!cfg.owner || !cfg.repo) {
        uploadMsg.textContent = "Imposta OWNER e REPO sopra.";
        return;
      }
      if (!token) {
        uploadMsg.textContent = "Inserisci il GitHub Token (PAT).";
        return;
      }

      const title = (titleEl.value || "").trim();
      const description = (descEl.value || "").trim();
      const found_date = foundDateEl.value || "";
      const status = statusEl.value || "found";
      const file = photoEl.files && photoEl.files[0];

      if (!title) { uploadMsg.textContent = "Inserisci un titolo."; return; }
      if (!file) { uploadMsg.textContent = "Seleziona una foto."; return; }

      const maxMb = Number(window.MAX_IMAGE_MB || 8);
      const maxBytes = maxMb * 1024 * 1024;
      if (file.size > maxBytes) {
        uploadMsg.textContent = `Foto troppo grande (${Math.round(file.size/1024/1024)} MB). Limite: ${maxMb} MB.`;
        return;
      }

      // salva cfg in sessione (comodità)
      saveCfgToSession(cfg);

      // 1) Upload immagine nel repo
      uploadMsg.textContent = "Carico la foto nel repo…";
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `uploads/${Date.now()}_${safeName}`;

      const buf = await file.arrayBuffer();
      const b64 = base64FromArrayBuffer(buf);

      await putFile(token, cfg, path, b64, `Add photo: ${title}`);

      // 2) Aggiorna items.json
      uploadMsg.textContent = "Aggiorno data/items.json…";

      const id = `${slugify(title)}-${Date.now()}`;
      const newItem = {
        id,
        title,
        description: description || undefined,
        found_date: found_date || undefined,
        status,
        photo: path
      };
      Object.keys(newItem).forEach(k => newItem[k] === undefined && delete newItem[k]);

      await updateItemsJson(token, cfg, (items) => [newItem, ...items], `Add item: ${title}`);

      uploadMsg.textContent = "Pubblicato ✅ (il sito si aggiornerà dopo il deploy di Pages)";
      titleEl.value = "";
      descEl.value = "";
      foundDateEl.value = "";
      photoEl.value = "";
      statusEl.value = "found";

      await loadList();

    } catch (e) {
      console.error(e);
      uploadMsg.textContent = "Errore: " + (e.message || "unknown");
      if (e.status === 401) uploadMsg.textContent += " (token non valido o scaduto)";
      if (e.status === 403) uploadMsg.textContent += " (permessi insufficienti sul repo)";
      if (e.status === 409) uploadMsg.textContent += " (conflitto: riprova)";
    } finally {
      uploadBtn.disabled = false;
    }
  });

  refreshBtn.addEventListener("click", loadList);
  filterStatusEl.addEventListener("change", loadList);

  async function init() {
    // precompila cfg da config.js o sessione
    const fromSession = loadCfgFromSession();
    const owner = (fromSession && fromSession.owner) || window.GITHUB_OWNER || "";
    const repo = (fromSession && fromSession.repo) || window.GITHUB_REPO || "";
    const branch = (fromSession && fromSession.branch) || window.GITHUB_BRANCH || "main";
    ownerEl.value = owner;
    repoEl.value = repo;
    branchEl.value = branch;

    // Se token in sessione, prova a caricare la lista
    if (sessionStorage.getItem(SESSION_TOKEN_KEY)) {
      await loadList();
    } else {
      listLoading.textContent = "Inserisci il token per caricare la lista.";
    }
  }
})();
