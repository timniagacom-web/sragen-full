/* Portal dokumen klien (mode full) — Kit Portal Klien
   Semua isi berasal dari assets/data.js (dibuat oleh build.py). Tanpa dependensi. */
(function () {
  'use strict';

  const D = window.PORTAL;
  if (!D) return;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ICON_ZOOM = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg>';
  const ICON_DL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></svg>';
  const ICON_EYE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>';

  const DISC_ORDER = D.disiplin || [];
  const state = { disc: 'Semua' };

  /* ------------------------------------------------------------------ status ringkas */
  function renderStatus() {
    const M = D.meta;
    const list = $('#statusList');
    if (list) list.innerHTML = (M.statusList || []).map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('');
    const dl = $('#dlSummary');
    if (dl) dl.textContent = `${D.unduhan.length} berkas · total ${M.totalUnduh} · semua tautan di bawah.`;
    $('#metaList').innerHTML = (M.metaList || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const cta = [];
    if (D.sheets.length) cta.push(`<a class="btn btn-primary" href="#gambar">Lihat gambar kerja (${D.sheets.length} lembar)</a>`);
    if (D.lembarUnduh) cta.push(`<a class="btn btn-ghost" href="${esc(D.lembarUnduh.file)}" download>${ICON_DL} ${esc(D.lembarUnduh.label)}</a>`);
    $('#cta').innerHTML = cta.join('');
    $('#stats').innerHTML = (M.angka || []).map((a) => `<div class="stat"><span>${esc(a.label)}</span><b>${esc(a.nilai)}</b><em>${esc(a.ket || '')}</em></div>`).join('');
    if (!(M.angka || []).length) $('#stats').hidden = true;
    $('#specBody').innerHTML = (M.spesifikasi || []).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
    if (!(M.spesifikasi || []).length) $('.spec').hidden = true;
    if ((M.perubahan || []).length) {
      $('#changes').hidden = false;
      $('#changesList').innerHTML = M.perubahan.map((t) => `<li>${esc(t)}</li>`).join('');
    }
    const quick = D.unduhan.filter((u) => u.cepat);
    if (quick.length) $('#quick').insertAdjacentHTML('beforeend', quick.map((u) =>
      `<a href="${esc(u.file)}" download><span>${esc(u.nama)}</span><small>${esc(u.tipe)}</small></a>`).join(''));
    else $('#quick').hidden = true;
    if (M.catatanUnduhan) $('#dlNote').hidden = false;
    // sembunyikan bagian kosong
    const hide = (id) => { const sec = document.getElementById(id); if (sec) sec.hidden = true; const a = $(`.nav a[href="#${id}"]`); if (a) a.hidden = true; };
    if (!D.sheets.length) hide('gambar');
    if (!D.laporan.length) hide('laporan');
    if (!D.visual.length) hide('visual');
  }

  /* ------------------------------------------------------------------ filter + grid lembar */
  function disciplines() {
    const counts = new Map();
    D.sheets.forEach((s) => counts.set(s.disiplin, (counts.get(s.disiplin) || 0) + 1));
    return DISC_ORDER.filter((d) => counts.has(d)).map((d) => ({ nama: d, n: counts.get(d) }));
  }

  function renderFilters() {
    const box = $('#filters');
    const items = [{ nama: 'Semua', n: D.sheets.length }].concat(disciplines());
    box.innerHTML = items.map((it) =>
      `<button class="fbtn" type="button" data-disc="${esc(it.nama)}" aria-pressed="${it.nama === state.disc}">${esc(it.nama)} <span style="opacity:.6">${it.n}</span></button>`
    ).join('');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-disc]');
      if (!b) return;
      state.disc = b.dataset.disc;
      $$('.fbtn', box).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.disc === state.disc)));
      renderSheets();
    });
  }

  function renderSheets() {
    const grid = $('#sheetGrid');
    const list = D.sheets.filter((s) => state.disc === 'Semua' || s.disiplin === state.disc);
    $('#sheetCount').textContent = `${list.length} dari ${D.sheets.length} lembar`;
    grid.innerHTML = list.map((s) => {
      const i = D.sheets.indexOf(s);
      return `<button class="sheet" type="button" data-i="${i}" aria-label="Buka lembar ${esc(s.no)} — ${esc(s.judul)}">
        <span class="thumb">
          <img src="${esc(s.thumb)}" alt="Pratinjau lembar ${esc(s.no)} — ${esc(s.judul)}" loading="lazy" decoding="async" width="520" height="368">
          <span class="no">${esc(s.no)}</span>
          <span class="zoom" aria-hidden="true">${ICON_ZOOM}</span>
        </span>
        <span class="cap">
          <b>${esc(s.judul)}</b>
          <span>${esc(s.disiplin)} · lembar ${s.halaman} dari ${s.total}</span>
        </span>
      </button>`;
    }).join('') || '<div class="empty">Belum ada lembar pada disiplin ini.</div>';
  }

  /* ------------------------------------------------------------------ lightbox */
  const lb = $('#lb');
  let lbItems = [], lbIndex = 0, lbOpener = null;

  function openLb(items, index, opener) {
    lbItems = items; lbIndex = index; lbOpener = opener || document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    showLb();
    $('#lbClose').focus();
  }

  function showLb() {
    const it = lbItems[lbIndex];
    if (!it) return;
    const img = $('#lbImg');
    img.src = it.img;
    img.alt = it.alt || it.title || '';
    $('#lbTitle').textContent = it.title || '';
    $('#lbSub').textContent = it.sub || '';
    $('#lbCount').textContent = lbItems.length > 1 ? `${lbIndex + 1} / ${lbItems.length}` : '';
    $('#lbOpen').href = it.img;
    const one = lbItems.length < 2;
    $('#lbPrev').style.visibility = one ? 'hidden' : 'visible';
    $('#lbNext').style.visibility = one ? 'hidden' : 'visible';
    const dl = $('#lbDl');
    if (it.download) { dl.href = it.download; dl.textContent = it.downloadLabel || 'Unduh berkas'; dl.style.display = ''; }
    else dl.style.display = 'none';
  }

  function stepLb(d) {
    if (lbItems.length < 2) return;
    lbIndex = (lbIndex + d + lbItems.length) % lbItems.length;
    showLb();
  }

  function closeLb() {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lbOpener && lbOpener.focus) lbOpener.focus();
  }

  function sheetItems() {
    return D.sheets.map((s) => ({
      img: s.img,
      title: `${s.no} — ${s.judul}`,
      sub: `${s.disiplin} · lembar ${s.halaman} dari ${s.total} · ${s.ket}`,
      alt: `Lembar ${s.no} ${s.judul}`,
      download: D.lembarUnduh ? D.lembarUnduh.file : '',
      downloadLabel: D.lembarUnduh ? D.lembarUnduh.label : '',
    }));
  }

  $('#sheetGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.sheet');
    if (!b) return;
    openLb(sheetItems(), Number(b.dataset.i), b);
  });

  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', () => stepLb(-1));
  $('#lbNext').addEventListener('click', () => stepLb(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });

  // geser (sentuh)
  let tx = 0, ty = 0;
  $('.lb-stage').addEventListener('touchstart', (e) => {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  $('.lb-stage').addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) stepLb(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ------------------------------------------------------------------ laporan */
  function renderReports() {
    const grid = $('#reportGrid');
    grid.innerHTML = D.laporan.map((r, i) => `
      <article class="report">
        <div class="cover" data-report="${i}" role="button" tabindex="0" aria-label="Pratinjau ${esc(r.kode)}">
          <img src="${esc(r.pages[0])}" alt="Halaman pertama ${esc(r.kode)} — ${esc(r.judul)}" loading="lazy" decoding="async">
          <span class="pages">${r.n} halaman</span>
        </div>
        <div class="body">
          <b><em>${esc(r.kode)}</em>${esc(r.judul)}</b>
          <p>${esc(r.ket)}</p>
          <div class="actions">
            <button class="btn btn-quiet" type="button" data-report="${i}">${ICON_EYE} Pratinjau</button>
            <a class="btn btn-primary" href="${esc(r.file)}" download>${ICON_DL} Unduh PDF</a>
          </div>
        </div>
      </article>`).join('');

    grid.addEventListener('click', (e) => {
      const t = e.target.closest('[data-report]');
      if (!t || t.tagName === 'A') return;
      openPdf(Number(t.dataset.report), t);
    });
    grid.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('cover')) {
        e.preventDefault(); openPdf(Number(e.target.dataset.report), e.target);
      }
    });

    const work = D.unduhan.filter((u) => u.tipe === 'XLSX');
    $('#workFiles').innerHTML = work.map((u) =>
      `<a class="btn btn-quiet" href="${esc(u.file)}" download>${ICON_DL} ${esc(u.tipe === 'XLSX' ? u.nama.split('—')[0].trim() : u.nama)}</a>`).join('');
    if (work.length) $('#workFilesNote').textContent = work.map((u) => `${u.nama} — ${u.ukuran}`).join(' · ');
  }

  /* ------------------------------------------------------------------ modal pratinjau laporan */
  const pdfModal = $('#pdfModal');
  let pdfOpener = null;

  function openPdf(i, opener) {
    const r = D.laporan[i];
    if (!r) return;
    pdfOpener = opener || document.activeElement;
    $('#pdfTitle').textContent = `${r.kode} — ${r.judul}`;
    $('#pdfSub').textContent = `${r.n} halaman · ${r.ukuran}`;
    const dl = $('#pdfDl');
    dl.href = r.file;
    $('#pdfBody').innerHTML = r.pages.map((p, k) =>
      `<img src="${esc(p)}" alt="Halaman ${k + 1} ${esc(r.kode)}" loading="${k < 2 ? 'eager' : 'lazy'}" decoding="async">`).join('');
    pdfModal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#pdfClose').focus();
  }

  function closePdf() {
    pdfModal.hidden = true;
    $('#pdfBody').innerHTML = '';
    document.body.style.overflow = '';
    if (pdfOpener && pdfOpener.focus) pdfOpener.focus();
  }

  $('#pdfClose').addEventListener('click', closePdf);
  pdfModal.addEventListener('click', (e) => { if (e.target === pdfModal) closePdf(); });

  /* ------------------------------------------------------------------ visual 3D */
  function renderShots() {
    const grid = $('#shotGrid');
    grid.innerHTML = D.visual.map((v, i) => `
      <figure class="shot" data-shot="${i}" tabindex="0" role="button" aria-label="Perbesar ${esc(v.judul)}">
        <img src="${esc(v.thumb)}" alt="${esc(v.judul)} — ${esc(v.ket)}" loading="lazy" decoding="async">
        <span class="res">${esc(v.px)} px</span>
        <figcaption><span><b>${esc(v.judul)}</b><span>${esc(v.ket)}</span></span></figcaption>
      </figure>`).join('');

    const items = () => D.visual.map((v) => ({
      img: v.img, title: v.judul, sub: v.ket, alt: v.judul,
      download: v.file, downloadLabel: 'Unduh gambar (' + v.file.split('.').pop().toUpperCase() + ')',
    }));
    const open = (t) => openLb(items(), Number(t.dataset.shot), t);
    grid.addEventListener('click', (e) => { const t = e.target.closest('.shot'); if (t) open(t); });
    grid.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('shot')) { e.preventDefault(); open(e.target); }
    });
  }

  /* ------------------------------------------------------------------ tabel unduhan */
  function renderDownloads() {
    const body = $('#dlBody');
    let last = '';
    const rows = [];
    D.unduhan.forEach((u) => {
      if (u.grup !== last) { rows.push(`<tr class="grp"><td colspan="4">${esc(u.grup)}</td></tr>`); last = u.grup; }
      const cls = String(u.tipe || '').toLowerCase().replace(/[^a-z]/g, '');
      rows.push(`<tr>
        <td class="name">${esc(u.nama)}<small>${esc(u.ket)}</small></td>
        <td class="fmt"><span class="tag ${cls}">${esc(u.tipe)}</span></td>
        <td class="size">${esc(u.ukuran)}</td>
        <td class="act"><a class="dlbtn" href="${esc(u.file)}" download>${ICON_DL} Unduh</a></td>
      </tr>`);
    });
    rows.push(`<tr class="total"><td>Total</td><td></td><td class="size" id="totalUnduh">${esc(D.meta.totalUnduh)}</td><td></td></tr>`);
    body.innerHTML = rows.join('');
  }

  /* ------------------------------------------------------------------ navigasi aktif + hash */
  function navSpy() {
    const links = $$('.nav a');
    if (!('IntersectionObserver' in window) || !links.length) return;
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.remove('on'));
        const a = map.get(en.target.id);
        if (a) a.classList.add('on');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    $$('main section[id]').forEach((s) => obs.observe(s));
  }

  function hashOpen() {
    const h = decodeURIComponent(location.hash || '');
    const m = /^#lembar-([A-Za-z]-?\d{3}(?:\.\d+)?)$/.exec(h);
    if (m) {
      const i = D.sheets.findIndex((s) => s.no.toLowerCase() === m[1].toLowerCase());
      if (i >= 0) setTimeout(() => openLb(sheetItems(), i, null), 60);
      return;
    }
    const r = /^#laporan-(.+)$/i.exec(h);
    if (r) {
      const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const i = D.laporan.findIndex((x) => slug(x.kode) === slug(r[1]));
      if (i >= 0) setTimeout(() => openPdf(i, null), 60);
    }
  }

  /* ------------------------------------------------------------------ tombol papan tombol */
  document.addEventListener('keydown', (e) => {
    if (!lb.hidden) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stepLb(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLb(-1); }
      else if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
      return;
    }
    if (!pdfModal.hidden && e.key === 'Escape') { e.preventDefault(); closePdf(); }
  });

  /* ------------------------------------------------------------------ jalan */
  renderStatus();
  renderFilters();
  renderSheets();
  renderReports();
  renderShots();
  renderDownloads();
  navSpy();
  hashOpen();
})();
