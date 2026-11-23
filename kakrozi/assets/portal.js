/* Portal tinjau klien — Gambar.Express
   Gaya mengikuti portal owner Gambar.Express: menu lengket, tab kelompok, pencarian,
   kartu per lembar, lightbox perbesar. Proteksi bersifat pencegahan (best effort). */
(function () {
  const P = window.PORTAL;
  if (!P) return;

  const $ = (s) => document.querySelector(s);
  const tabs = $("#tabs");
  const menuBtn = $("#menuBtn");
  const menuPanel = $("#menuPanel");
  const search = $("#searchInput");
  const count = $("#count");
  const root = $("#groups");
  const lb = $("#lb");
  const lbImg = $("#lbImg");
  const lbTitle = $("#lbTitle");
  const lbWm = $("#lbWm");
  const blackout = $("#blackout");

  const wmSvg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='520' height='360'>` +
    `<text x='0' y='180' fill='%23000000' font-size='22' font-family='Segoe UI'` +
    ` transform='rotate(-24 260 180)' opacity='0.5'>${P.watermark}</text></svg>`;
  lbWm.style.backgroundImage = `url("data:image/svg+xml,${wmSvg}")`;

  // ---------------------------------------------------------------- katalog
  const flat = [];
  P.groups.forEach((g) => {
    g.items.forEach((it) => {
      it.group = g.title;
      it.gid = g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      flat.push(it);
    });
  });

  function renderTabs() {
    tabs.innerHTML = "";
    P.groups.forEach((g) => {
      const b = document.createElement("button");
      b.textContent = g.title;
      b.dataset.gid = g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      b.onclick = () => {
        document.getElementById(b.dataset.gid)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(b.dataset.gid);
        closeMenu();
      };
      tabs.appendChild(b);
    });
    setActive(document.querySelector("section.group")?.id || "");
  }

  function setActive(gid) {
    tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.gid === gid));
  }

  function card(it, n) {
    const el = document.createElement("article");
    el.className = "card";
    el.dataset.search = `${it.code} ${it.title} ${it.note || ""} ${it.group}`.toLowerCase();
    el.innerHTML = `
      <div class="card-head">
        <div>
          <div class="card-label">Lembar ${String(n).padStart(2, "0")} · ${it.code} · ${P.status}</div>
          <div class="card-title">${it.title}</div>
        </div>
        <div class="card-actions">
          <button class="btn" type="button">Perbesar</button>
        </div>
      </div>
      <div class="card-body">
        <span class="wm-tag">DRAF · gambarexpress.id</span>
        <img src="${it.img}" alt="${it.title}" loading="lazy" draggable="false">
        <button class="zoom" type="button" aria-label="Perbesar ${it.title}"></button>
      </div>`;
    const open = () => openLb(it);
    el.querySelector(".zoom").onclick = open;
    el.querySelector(".btn").onclick = open;
    return el;
  }

  function render(sections) {
    root.innerHTML = "";
    sections.forEach((g) => {
      const sec = document.createElement("section");
      sec.className = "group";
      sec.id = g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const h = document.createElement("h2");
      h.textContent = g.title;
      sec.appendChild(h);
      const wrap = document.createElement("div");
      g.items.forEach((it, i) => wrap.appendChild(card(it, g.items.indexOf(it) + 1)));
      sec.appendChild(wrap);
      root.appendChild(sec);
    });
    count.textContent = `${flat.length} lembar`;
  }

  // ---------------------------------------------------------------- menu
  function buildMenu() {
    menuPanel.innerHTML = "";
    P.groups.forEach((g, i) => {
      const b = document.createElement("button");
      b.innerHTML = `<span class="n">${String(i + 1).padStart(2, "0")}</span><span>${g.title}</span>
        <span style="margin-left:auto;color:#8a857b;font-size:12px">${g.items.length} lembar</span>`;
      b.onclick = () => {
        document.getElementById(g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        closeMenu();
      };
      menuPanel.appendChild(b);
    });
  }
  function closeMenu() { menuPanel.classList.remove("open"); }
  menuBtn.onclick = (e) => { e.stopPropagation(); menuPanel.classList.toggle("open"); };
  document.addEventListener("click", (e) => {
    if (!menuPanel.contains(e.target) && e.target !== menuBtn) closeMenu();
  });

  // ---------------------------------------------------------------- pencarian
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll(".card").forEach((c) => {
      const hit = !q || c.dataset.search.includes(q);
      c.style.display = hit ? "" : "none";
      if (hit) shown++;
    });
    document.querySelectorAll("section.group").forEach((s) => {
      const any = [...s.querySelectorAll(".card")].some((c) => c.style.display !== "none");
      s.style.display = any ? "" : "none";
    });
    count.textContent = q ? `${shown} hasil` : `${flat.length} lembar`;
  });

  // ---------------------------------------------------------------- lightbox
  let cur = 0;
  function openLb(it) {
    cur = flat.indexOf(it);
    paint();
    lb.classList.add("open");
  }
  function paint() {
    const it = flat[cur];
    lbImg.src = it.img;
    lbImg.alt = it.title;
    lbTitle.textContent = `${it.code} · ${it.title}`;
  }
  function closeLb() { lb.classList.remove("open"); lbImg.src = ""; }
  $("#lbClose").onclick = closeLb;
  $("#lbPrev").onclick = () => { cur = (cur - 1 + flat.length) % flat.length; paint(); };
  $("#lbNext").onclick = () => { cur = (cur + 1) % flat.length; paint(); };
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.id === "lbStage") closeLb(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeLb(); closeMenu(); }
    if (!lb.classList.contains("open")) return;
    if (e.key === "ArrowRight") $("#lbNext").click();
    if (e.key === "ArrowLeft") $("#lbPrev").click();
    if (e.key === "PrintScreen") { e.preventDefault(); blackoutNow(4); }
    if ((e.ctrlKey || e.metaKey) && ["s", "p", "u"].includes(e.key.toLowerCase())) {
      e.preventDefault(); blackoutNow(2.5);
    }
  });

  // ---------------------------------------------------------------- proteksi
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("dragstart", (e) => e.preventDefault());
  document.addEventListener("selectstart", (e) => e.preventDefault());
  document.addEventListener("copy", (e) => {
    e.clipboardData.setData("text/plain", `${P.watermark} — pratinjau klien`);
    e.preventDefault();
  });
  let t = null;
  function blackoutNow(sec) {
    blackout.classList.add("show");
    clearTimeout(t);
    t = setTimeout(() => blackout.classList.remove("show"), (sec || 3) * 1000);
  }
  window.addEventListener("blur", () => blackoutNow(999));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) blackoutNow(999);
    else { clearTimeout(t); blackout.classList.remove("show"); }
  });
  blackout.addEventListener("click", () => blackout.classList.remove("show"));

  // ---------------------------------------------------------------- start
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt("heroDate", P.date);
  setTxt("heroCode", P.code);
  setTxt("heroSub", P.subtitle || "");
  setTxt("topStatus", P.status ? P.status.charAt(0).toUpperCase() + P.status.slice(1) : "");
  setTxt("ownerName", P.owner);
  document.title = `Ruang tinjau — ${P.project} · Gambar.Express`;
  render(P.groups);
  renderTabs();
  buildMenu();
})();
