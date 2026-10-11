// ====== ISI DI SINI: URL Web App dari Google Apps Script ======
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxMMuj4c_tq6c7lcdLUWyqWdFDTleTgUUw4-qFcFo2H7uKGDFSUxLi-JSXCGe4oybX9/exec"; // contoh: "https://script.google.com/macros/s/XXXX/exec"
// ==============================================================
const PFX = "photobox-";
const $ = id => document.getElementById(id);
const FILTERS = {Normal:"none",Vintage:"sepia(.6) contrast(1.1) saturate(1.3)","B&W":"grayscale(1) contrast(1.2)",Pinky:"saturate(1.5) hue-rotate(-20deg) brightness(1.1)",Cool:"hue-rotate(160deg) saturate(1.2)",Warm:"sepia(.3) saturate(1.6) brightness(1.05)"};
let peer, conn, stream, isHost, code, lobbyName, filter = "none", ready = {me:false, th:false}, busy = false, mine = [], theirs = [], score = 0, theme = 0;

const toast = t => { const e = $("toast"); e.textContent = t; e.classList.add("s"); setTimeout(() => e.classList.remove("s"), 2200); };
const show = id => ["home","lobby","result"].forEach(s => $(s).hidden = s !== id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const genCode = () => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from({length:6}, () => c[Math.random()*c.length|0]).join(""); };

function logSheet(aksi) {
  if (!SHEET_URL) return;
  fetch(SHEET_URL, {method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({lobby:lobbyName, kode:code, aksi})}).catch(() => {});
}

// stiker interaktif
document.querySelectorAll(".st").forEach(s => s.onclick = () => { s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); });

async function getCam() {
  try { stream = await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:"user"}, audio:{echoCancellation:true,noiseSuppression:true}}); }
  catch { toast("Izinkan kamera & mikrofon dulu ya!"); return false; }
  $("vMe").srcObject = stream; return true;
}

// ---------- Buat / Gabung ----------
$("btnCreate").onclick = async () => {
  lobbyName = $("lobbyName").value.trim() || "Lobby Seru";
  if (!(await getCam())) return;
  isHost = true; code = genCode();
  peer = new Peer(PFX + code);
  peer.on("open", () => { enterLobby(); logSheet("dibuat"); });
  peer.on("error", e => { if (e.type === "unavailable-id") { peer.destroy(); $("btnCreate").click(); } else toast("Error: " + e.type); });
  peer.on("connection", c => { if (conn) return c.close(); conn = c; wire(); });
  peer.on("call", call => { call.answer(stream); call.on("stream", showFriend); });
};
$("btnJoin").onclick = async () => {
  code = $("joinCode").value.trim().toUpperCase();
  if (code.length !== 6) return toast("Kode harus 6 karakter");
  if (!(await getCam())) return;
  isHost = false; peer = new Peer();
  peer.on("open", () => {
    conn = peer.connect(PFX + code, {reliable:true}); wire();
    peer.call(PFX + code, stream).on("stream", showFriend);
  });
  peer.on("error", e => { if (e.type === "peer-unavailable") { toast("Kode tidak ditemukan ❌"); stream.getTracks().forEach(t => t.stop()); show("home"); } });
};
function enterLobby() {
  show("lobby"); $("lobbyTitle").textContent = lobbyName || "Lobby"; $("codeChip").textContent = code;
  $("status").textContent = isHost ? "Bagikan kode ke temanmu →" : "Menghubungkan…";
  theme = [...code].reduce((a, c) => a + c.charCodeAt(0), 0) % 3; startGame();
}
$("codeChip").onclick = () => { navigator.clipboard?.writeText(code); toast("Kode disalin! 📋"); };

function wire() {
  conn.on("open", () => {
    if (isHost) conn.send({t:"hello", name:lobbyName});
    else { enterLobby(); }
    $("tagFr").textContent = "Teman 😎"; $("btnReady").disabled = false; $("status").textContent = "Terhubung ✅";
  });
  conn.on("data", d => {
    if (d.t === "hello") { lobbyName = d.name; $("lobbyTitle").textContent = lobbyName; logSheet("bergabung"); }
    if (d.t === "chat") addMsg(d.m, false);
    if (d.t === "ready") { ready.th = d.v; sync(); }
    if (d.t === "score") $("sFr").textContent = d.v;
    if (d.t === "start") run();
    if (d.t === "shot") theirs[d.i] = d.img;
  });
  conn.on("close", () => { toast("Temanmu keluar"); ready = {me:false, th:false}; $("tagFr").textContent = "Menunggu teman…"; $("vFr").srcObject = null; $("btnReady").disabled = true; conn = null; sync(); });
}
function showFriend(s) { $("vFr").srcObject = s; $("btnReady").disabled = false; }

// ---------- Ready ----------
function sync() {
  $("tagMe").textContent = "Kamu " + (ready.me ? "✅ siap" : ""); $("tagMe").classList.toggle("ok", ready.me);
  $("tagFr").classList.toggle("ok", ready.th); if (conn) $("tagFr").textContent = "Teman " + (ready.th ? "✅ siap" : "😎");
  $("btnReady").classList.toggle("on", ready.me); $("btnReady").textContent = ready.me ? "⏳ Menunggu teman…" : "✅ Aku Siap!";
  if (isHost && ready.me && ready.th && !busy && conn) { conn.send({t:"start"}); run(); }
}
$("btnReady").onclick = () => { ready.me = !ready.me; conn?.send({t:"ready", v:ready.me}); sync(); };
$("btnMic").onclick = e => { const t = stream.getAudioTracks()[0]; t.enabled = !t.enabled; e.target.textContent = t.enabled ? "🎤 Mic ON" : "🔇 Mic OFF"; e.target.classList.toggle("on", !t.enabled); };

// ---------- Filter ----------
Object.entries(FILTERS).forEach(([n, v], i) => {
  const b = document.createElement("button"); b.className = "f" + (i ? "" : " a"); b.textContent = n;
  b.onclick = () => { filter = v; $("vMe").style.filter = v; document.querySelectorAll(".f").forEach(x => x.classList.remove("a")); b.classList.add("a"); };
  $("filters").append(b);
});

// ---------- Chat ----------
function addMsg(m, me) { const d = document.createElement("div"); d.className = "m " + (me ? "me" : "th"); d.textContent = m; $("msgs").append(d); $("msgs").scrollTop = 1e9; }
$("chatIn").onkeydown = e => { if (e.key === "Enter" && e.target.value.trim() && conn) { conn.send({t:"chat", m:e.target.value}); addMsg(e.target.value, true); e.target.value = ""; } };

// ---------- Mini game: pecahkan balon dengan gerakan ----------
const gc = $("game"), g = gc.getContext("2d"), mc = document.createElement("canvas"); mc.width = 32; mc.height = 24;
const mx = mc.getContext("2d", {willReadFrequently:true}); let prev = null, balls = [], rings = [], tick = 0, started = false;
const COL = ["#ff4f8b","#ffd23f","#2ec4b6","#7b5cff","#ff8a3d"];
function startGame() { if (started) return; started = true; requestAnimationFrame(loop); }
function loop() {
  requestAnimationFrame(loop); if (busy || document.hidden) return; tick++;
  g.clearRect(0, 0, 320, 240);
  let mo = null;
  if (tick % 2 === 0 && $("vMe").readyState > 1) {
    mx.drawImage($("vMe"), 0, 0, 32, 24); const d = mx.getImageData(0, 0, 32, 24).data;
    if (prev) { mo = new Uint8Array(768); for (let i = 0; i < 768; i++) mo[i] = Math.abs(d[i*4+1] - prev[i*4+1]) > 40; }
    prev = d;
  }
  if (tick % 40 === 0 && balls.length < 8) balls.push({x:30 + Math.random()*260, y:250, r:16 + Math.random()*10, v:.8 + Math.random(), c:COL[Math.random()*5|0]});
  balls = balls.filter(b => {
    b.y -= b.v;
    if (mo) { const cx = b.x/10|0, cy = b.y/10|0; if (cx>=0&&cx<32&&cy>=0&&cy<24&&mo[cy*32+cx]) { rings.push({x:b.x,y:b.y,r:b.r,c:b.c}); $("sMe").textContent = ++score; conn?.send({t:"score", v:score}); return false; } }
    g.fillStyle = b.c; g.strokeStyle = "#2b1b3d"; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.arc(b.x - b.r/3, b.y - b.r/3, b.r/4, 0, 7); g.fill();
    return b.y > -30;
  });
  rings = rings.filter(r => { r.r += 3; g.strokeStyle = r.c; g.lineWidth = 4; g.globalAlpha = Math.max(0, 1 - (r.r - 16) / 40); g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.stroke(); g.globalAlpha = 1; return r.r < 56; });
}

// ---------- Sesi foto (3 jepretan) ----------
async function run() {
  busy = true; mine = []; theirs = []; $("count").hidden = false;
  for (let i = 0; i < 3; i++) {
    for (let n = 3; n > 0; n--) { $("count").innerHTML = `<span>${n}</span>`; await sleep(1000); }
    $("count").innerHTML = ""; const f = $("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    mine[i] = capture(); conn.send({t:"shot", i, img:mine[i]});
    while (!theirs[i]) await sleep(100);
    await sleep(400);
  }
  $("count").hidden = true; ready = {me:false, th:false}; sync(); await compose(); show("result"); busy = false;
}
function capture() {
  const c = document.createElement("canvas"), v = $("vMe"); c.width = 480; c.height = 360; const x = c.getContext("2d");
  x.filter = filter; x.translate(480, 0); x.scale(-1, 1); x.drawImage(v, 0, 0, 480, 360); return c.toDataURL("image/jpeg", .75);
}
const loadImg = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
const THEMES = [["#ff4f8b","#ffd23f","#2ec4b6"],["#ff8a3d","#ff4f8b","#7b5cff"],["#2ec4b6","#c6f135","#ff4f8b"]];
async function compose() {
  const c = $("strip"), x = c.getContext("2d"), W = 800, H = 1100; c.width = W; c.height = H;
  const T = THEMES[theme], gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, T[0]); gr.addColorStop(.5, T[1]); gr.addColorStop(1, T[2]);
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(255,255,255,.25)"; for (let a = 0; a < W; a += 24) for (let b = 0; b < H; b += 24) { x.beginPath(); x.arc(a, b, 4, 0, 7); x.fill(); }
  x.font = "64px Bungee, Impact"; x.textAlign = "center"; x.lineWidth = 10; x.strokeStyle = "#2b1b3d"; x.strokeText("PHOTOBOX", W/2, 90); x.fillStyle = "#fff3d6"; x.fillText("PHOTOBOX", W/2, 90);
  const L = isHost ? mine : theirs, R = isHost ? theirs : mine;
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
    const im = await loadImg((k ? R : L)[i]), px = 30 + k * 385, py = 130 + i * 294;
    x.save(); x.translate(px + 180, py + 135); x.rotate((k ? 1 : -1) * .025);
    x.fillStyle = "#2b1b3d"; x.fillRect(-176, -126, 370, 280); x.fillStyle = "#fff"; x.fillRect(-184, -134, 370, 280);
    x.drawImage(im, -176, -126, 354, 264); x.restore();
  }
  let s = [...code].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7); const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const em = ["⭐","💖","✨","🎀","📸"]; x.font = "44px serif";
  for (let i = 0; i < 14; i++) x.fillText(em[i % 5], 20 + rnd() * 760, 120 + rnd() * 900);
  x.font = "28px Bungee, Impact"; x.fillStyle = "#2b1b3d"; x.fillText((lobbyName || "") + " · " + new Date().toLocaleDateString("id-ID"), W/2, H - 34);
}
document.querySelectorAll("[data-th]").forEach(b => b.onclick = () => { theme = +b.dataset.th; compose(); });
$("btnDl").onclick = () => $("strip").toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "photobox.png"; a.click(); logSheet("foto selesai"); });
$("btnAgain").onclick = () => show("lobby");
