"use strict";
const $=id=>document.getElementById(id);
let collection=[], accessKey=null, current=null, pageIndex=0, zoom=1;
let request=0, visit=0, currentURL="", coverURLs=[], meta={};
const gateTitle=document.title;
const encoder=new TextEncoder(), decoder=new TextDecoder();
function tokenFrom(value) {
  const t=value.trim();
  if (/^[A-Za-z0-9_-]{43}$/.test(t)) return t;
  try { return new URLSearchParams(new URL(t,location.href).hash.slice(1)).get("akses") || ""; }
  catch { return ""; }
}
async function bytes(name,key) {
  const response=await fetch("media/"+encodeURIComponent(name)+".bin",{cache:"no-store",referrerPolicy:"no-referrer"});
  if (!response.ok) throw Error("fetch");
  const data=new Uint8Array(await response.arrayBuffer());
  return crypto.subtle.decrypt({name:"AES-GCM",iv:data.slice(0,12),additionalData:encoder.encode(name)},key,data.slice(12));
}
function urlFor(buf){return URL.createObjectURL(new Blob([buf],{type:"image/webp"}));}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;}
async function unlock(code){
  if(!/^[A-Za-z0-9_-]{43}$/.test(code)){$("gate-msg").textContent="Periksa kembali tautan atau kode akses Anda.";return;}
  const serial=++visit;const submit=$("unlock").querySelector("button");submit.disabled=true;
  $("gate-msg").textContent="Membuka ruang tinjau…";
  try{
    const bin=Uint8Array.from(atob(code.replace(/-/g,"+").replace(/_/g,"/")+"="),c=>c.charCodeAt(0));
    const key=await crypto.subtle.importKey("raw",bin,"AES-GCM",false,["decrypt"]);
    const [index,template]=await Promise.all([bytes("catalog",key),bytes("room",key)]);
    if(serial!==visit)return;
    accessKey=key;const data=JSON.parse(decoder.decode(index));meta=data.meta||{};collection=data.docs;sheetOrder.push(...data.order);groups.push(...data.groups);
    refreshPrivacy();
    $("app").innerHTML=decoder.decode(template);
    try{sessionStorage.setItem("ruang-kunci",code);}catch{}
    history.replaceState(null,"",location.pathname+location.search);
    $("code").value="";$("gate-msg").textContent="";$("gate").hidden=true;$("app").hidden=false;
    document.title=(meta.judulTab||"Ruang tinjau");initRoom(serial);
  }catch{
    if(serial!==visit)return;
    $("gate-msg").textContent=crypto.subtle ? "Pratinjau belum terbuka. Periksa tautan lengkap dan sambungan internet." : "Gunakan tautan HTTPS untuk membuka pratinjau terlindungi.";
    try{sessionStorage.removeItem("ruang-kunci");}catch{}
  }finally{submit.disabled=false;}
}
function lock(){
  ++visit;if($("reader").open)$("reader").close();
  clearPages();accessKey=null;collection=[];current=null;
  refreshPrivacy();
  try{sessionStorage.removeItem("ruang-kunci");}catch{}
  $("app").replaceChildren();$("app").hidden=true;$("gate").hidden=false;document.title=gateTitle;
  history.replaceState(null,"",location.pathname+location.search);window.scrollTo(0,0);$("code").focus();
}
const sheetOrder=[];
const groups=[];
let pageDeck=[], lazyPages=null;
function clearPages(){
  lazyPages?.disconnect();lazyPages=null;
  pageDeck=[];coverURLs.forEach(URL.revokeObjectURL);coverURLs=[];
}
function createSheet(doc,page,index,serial){
  const number=pageDeck.length+1, figure=el("figure","folio-sheet");
  const caption=el("figcaption","folio-caption");
  const title=el("div");title.append(el("span","folio-meta","Lembar "+String(number).padStart(2,"0")+"  /  "+doc.rev),el("h3","",page.label));
  const full=el("button","quiet","Perbesar");full.type="button";full.setAttribute("aria-label","Perbesar "+page.label);
  full.onclick=()=>openAt(number-1);caption.append(title,full);
  const frame=el("div","folio-image"),img=el("img");img.alt=page.label;img.draggable=false;
  const ratio=page.w&&page.h?(page.w+"/"+page.h):(doc.cat==="Gambar kerja"?"420/297":doc.cat==="Visual"?"16/9":"210/297");
  frame.style.aspectRatio=ratio;
  const status=el("div","folio-status","Memuat pratinjau…");
  frame.append(img,status);figure.append(caption,frame);
  const record={doc,page,figure,loading:false,ordinal:number};
  record.load=async()=>{
    if(record.loading||img.hasAttribute("src")||visit!==serial)return;
    record.loading=true;status.textContent="Memuat pratinjau…";
    try{
      const b=await bytes(page.asset,accessKey);if(visit!==serial)return;
      const url=urlFor(b);coverURLs.push(url);img.src=url;await img.decode();
      if(visit===serial){frame.style.aspectRatio=img.naturalWidth+"/"+img.naturalHeight;status.hidden=true;}
    }catch{if(visit===serial){img.removeAttribute("src");status.textContent="Gagal memuat. ";const retry=el("button","quiet","Coba lagi");retry.onclick=record.load;status.append(retry);}}
    finally{record.loading=false;}
  };
  figure.dataset.index=String(number-1);pageDeck.push(record);return figure;
}
function filterSheets(){
  const term=$("find").value.trim().toLocaleLowerCase("id");
  let n=0;
  for(const rec of pageDeck){
    const keep=!term||[rec.page.label,rec.doc.title,rec.doc.rev,rec.doc.cat].join(" ").toLocaleLowerCase("id").includes(term);
    rec.figure.hidden=!keep;if(keep)n++;
  }
  for(const s of document.querySelectorAll(".folio-group"))s.hidden=!s.querySelector("figure:not([hidden])");
  $("count").textContent=n===pageDeck.length?n+" lembar":n+" dari "+pageDeck.length+" lembar";
  $("no-sheets").hidden=!!n;$("clear-find").hidden=!term;
}
function initRoom(serial){
  clearPages();
  const host=$("sheets"),nav=$("sheet-nav");
  for(const [g,group] of groups.entries()){
    const section=el("section","folio-group");section.id="kelompok-"+g;
    const heading=el("h2","",group.name);section.append(heading);
    for(const note of (group.notes||[])){
      const box=el("div","rabnote");box.append(el("b","",note.judul||""),el("p","",note.teks||""));
      if(note.buka){const go=el("button","quiet",note.tombol||"Buka");go.type="button";
        go.onclick=()=>{const rec=pageDeck.find(r=>r.page.asset===note.buka);if(rec)openAt(rec.ordinal-1);};box.append(go);}
      section.append(box);
    }
    for(const id of sheetOrder.filter(id=>group.ids.includes(id))){
      const doc=collection.find(d=>d.id===id);
      if(doc)doc.pages.forEach((page,i)=>section.append(createSheet(doc,page,i,serial)));
    }
    host.append(section);
    const btn=el("button","",group.name);
    btn.onclick=()=>{$("find").value="";filterSheets();section.scrollIntoView({block:"start"});heading.setAttribute("tabindex","-1");heading.focus({preventScroll:true});};nav.append(btn);
  }
  if("IntersectionObserver" in window){
    lazyPages=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){
      lazyPages.unobserve(e.target);pageDeck[Number(e.target.dataset.index)]?.load();
    }},{rootMargin:"850px 0px"});
    for(const rec of pageDeck)lazyPages.observe(rec.figure);
  }else{pageDeck.forEach(r=>r.load());}
  pageDeck[0]?.load();$("find").oninput=filterSheets;$("clear-find").onclick=()=>{$("find").value="";filterSheets();$("find").focus();};filterSheets();
  $("owner-menu").onclick=()=>{const panel=$("owner-panel");panel.hidden=!panel.hidden;$("owner-menu").setAttribute("aria-expanded",String(!panel.hidden));};
  $("lock").onclick=lock;initNav();
}
function openAt(index){
  if(!pageDeck[index])return;
  if(!$("reader").open)$("reader").showModal();
  document.body.style.overflow="hidden";show(index);
}


async function show(index){
  const rec=pageDeck[index];if(!rec)return;
  const ticket=++request;pageIndex=index;zoom=1;const p=rec.page;current=rec.doc;
  $("reader-title").textContent=p.label;$("reader-category").textContent=current.cat+" / "+current.rev;
  $("page-label").textContent="Lembar "+(index+1)+" dari "+pageDeck.length;
  $("prev").disabled=index===0;$("next").disabled=index===pageDeck.length-1;
  $("position").textContent=(index+1)+" / "+pageDeck.length;
  $("sheet").hidden=true;$("loading").hidden=false;$("loading").textContent="Memuat pratinjau…";
  try{
    const buf=await bytes(p.asset,accessKey);if(ticket!==request)return;
    const url=urlFor(buf);const sheet=$("sheet");
    if(currentURL)URL.revokeObjectURL(currentURL);currentURL=url;
    const loaded=new Promise((res,rej)=>{sheet.onload=res;sheet.onerror=rej;});
    sheet.src=url;sheet.alt=p.label+" — pratinjau";
    await loaded;
    if(ticket!==request)return;
    $("loading").hidden=true;sheet.hidden=false;
    sheet.dataset.ratio=String(sheet.naturalWidth/sheet.naturalHeight);sizeSheet();
    $("viewport").scrollTo(0,0);
  }catch{if(ticket===request){$("loading").textContent="Halaman belum termuat. ";const retry=el("button","quiet","Coba lagi");retry.onclick=()=>show(index);$("loading").append(retry);}}
}
function sizeSheet(){
  const img=$("sheet"),vp=$("viewport");if(img.hidden||!$("reader").open)return;
  const ratio=Number(img.dataset.ratio);
  const fit=Math.min(Math.max(40,vp.clientWidth-32),Math.max(60,vp.clientHeight-32)*ratio);
  img.style.width=Math.round(fit*zoom)+"px";$("fit").textContent=zoom===1?"Pas":Math.round(zoom*100)+"%";
  $("smaller").disabled=zoom<=1;$("bigger").disabled=zoom>=5;
}
$("bigger").onclick=()=>{zoom=Math.min(5,zoom+.5);sizeSheet();};$("smaller").onclick=()=>{zoom=Math.max(1,zoom-.5);sizeSheet();};$("fit").onclick=()=>{zoom=1;sizeSheet();};
$("prev").onclick=()=>show(pageIndex-1);$("next").onclick=()=>show(pageIndex+1);
$("close").onclick=()=>$("reader").close();$("reader").addEventListener("close",()=>{++request;document.body.style.overflow="";$("sheet").hidden=true;$("sheet").removeAttribute("src");if(currentURL)URL.revokeObjectURL(currentURL);currentURL="";current=null;});
document.addEventListener("keydown",e=>{if($("reader").open&&!e.altKey&&!e.ctrlKey&&!e.metaKey){
  if(e.key==="ArrowLeft"){e.preventDefault();show(pageIndex-1);}if(e.key==="ArrowRight"){e.preventDefault();show(pageIndex+1);}}
});
document.addEventListener("contextmenu",e=>{if(e.target.tagName==="IMG")e.preventDefault();});
window.addEventListener("resize",sizeSheet);
// OS capture tools do not always deliver keyboard or focus events to the page.
let windowAway=!document.hasFocus(), printing=false, maskUntil=0, maskTimer=0;
function refreshPrivacy(){
  const masked=Boolean(accessKey)&&(windowAway||document.hidden||printing||performance.now()<maskUntil);
  document.body.classList.toggle("privacy-mask",masked);
}
function maskForShortcut(event){
  if(!accessKey)return;
  const printScreen=event.key==="PrintScreen"||event.code==="PrintScreen";
  const systemCapture=event.metaKey&&event.shiftKey&&
    (["Shift","Meta","s","S","3","4","5"].includes(event.key)||
     ["KeyS","Digit3","Digit4","Digit5"].includes(event.code));
  if(!printScreen&&!systemCapture)return;
  maskUntil=performance.now()+2400;
  refreshPrivacy();
  clearTimeout(maskTimer);
  maskTimer=setTimeout(refreshPrivacy,2450);
}
window.addEventListener("keydown",maskForShortcut,true);
window.addEventListener("keyup",maskForShortcut,true);
window.addEventListener("blur",()=>{windowAway=true;refreshPrivacy();});
window.addEventListener("focus",()=>{windowAway=false;refreshPrivacy();});
document.addEventListener("visibilitychange",()=>{windowAway=!document.hasFocus();refreshPrivacy();});
window.addEventListener("pageshow",()=>{windowAway=!document.hasFocus();refreshPrivacy();});
window.addEventListener("beforeprint",()=>{printing=true;refreshPrivacy();});
window.addEventListener("afterprint",()=>{printing=false;windowAway=!document.hasFocus();refreshPrivacy();});
$("unlock").onsubmit=e=>{e.preventDefault();unlock(tokenFrom($("code").value));};
let initial=new URLSearchParams(location.hash.slice(1)).get("akses");
try{if(!initial)initial=sessionStorage.getItem("ruang-kunci");}catch{}
if(initial)unlock(initial);

/* ---------- penguatan pratinjau berwatermark (tanpa unduhan) ---------- */
const blockedCombo=e=>{
  const k=(e.key||"").toLowerCase();
  if((e.ctrlKey||e.metaKey)&&["s","p","u"].includes(k)){e.preventDefault();flashNote("Menyimpan atau mencetak tidak diizinkan pada pratinjau.");return true;}
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&["s","i","j","c","4","5"].includes(k)){e.preventDefault();flashNote("Panel pengembang dinonaktifkan pada pratinjau.");return true;}
  if(k==="f12"){e.preventDefault();flashNote("Panel pengembang dinonaktifkan pada pratinjau.");return true;}
  return false;
};
document.addEventListener("keydown",e=>{if(accessKey&&blockedCombo(e));},true);
document.addEventListener("contextmenu",e=>{if(accessKey){e.preventDefault();}},true);
document.addEventListener("dragstart",e=>{if(accessKey)e.preventDefault();},true);
document.addEventListener("copy",e=>{if(accessKey&&!e.target.closest("input,textarea")){e.preventDefault();flashNote("Menyalin isi pratinjau tidak diizinkan.");}},true);
let noteTimer=0;
function flashNote(text){
  let n=document.getElementById("wm-note");
  if(!n){n=document.createElement("div");n.id="wm-note";n.setAttribute("role","status");document.body.append(n);}
  n.textContent=text;n.classList.add("show");
  clearTimeout(noteTimer);noteTimer=setTimeout(()=>n.classList.remove("show"),2600);
}


/* ---------- menu ☰ yang selalu tersedia ---------- */
function initNav(){
  const btn=$("nav-toggle"), panel=$("nav-panel");
  if(!btn||!panel)return;
  const set=open=>{panel.hidden=!open;btn.setAttribute("aria-expanded",String(open));document.body.classList.toggle("nav-open",open);};
  btn.onclick=e=>{e.stopPropagation();set(panel.hidden);};
  document.addEventListener("click",e=>{if(!panel.hidden&&!e.target.closest(".top"))set(false);});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){e.preventDefault();set(false);}});
  panel.addEventListener("click",e=>{if(e.target.closest("button,a"))setTimeout(()=>set(false),80);});
  set(false);
}
