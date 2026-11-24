/* =====================================================================
   shell/components.js
   Komponen kerangka halaman. Masing-masing mengembalikan string HTML yang
   dirangkai oleh AppShell() lalu dirender ke dalam #app (lihat shell/render.js).
   Isi tiap area (tab, daftar, pemutar, dst.) tetap dirender oleh modul aplikasi.
   ===================================================================== */
'use strict';

/** Bilah atas: logo + pencarian (berisi skeleton sampai Navbar asli siap). */
function NavbarShell() {
  return `<nav class="nav" id="navbar">
      <div class="nav-left sk-boot" aria-hidden="true"><div class="logo"><span class="logo-icon sk"></span><span class="logo-text sk-text">Kureng</span></div></div>
      <div class="search sk-boot sk" aria-hidden="true"></div>
    </nav>`;
}

/** Menu samping (berisi skeleton sampai NavMenu asli siap). */
function SidebarShell() {
  return `<aside class="side" id="sidebar" aria-label="Navigasi utama">
      <div class="side-nav sk-boot" aria-hidden="true">
        <div class="nav-item"><i><b class="sk sk-ico"></b></i><span class="sk-text">Beranda</span></div>
        <div class="nav-item"><i><b class="sk sk-ico"></b></i><span class="sk-text">Jelajah</span></div>
        <div class="nav-item"><i><b class="sk sk-ico"></b></i><span class="sk-text">Musik</span></div>
        <div class="nav-item"><i><b class="sk sk-ico"></b></i><span class="sk-text">Video</span></div>
        <div class="nav-item"><i><b class="sk sk-ico"></b></i><span class="sk-text">Favorit</span></div>
      </div>
    </aside>`;
}

/** Dekorasi latar per halaman (hati, gelombang, dsb.). Dekoratif saja. */
function BackgroundDecoShell() {
  return `<div class="bg-deco" id="bgDeco" data-scene="home" aria-hidden="true">
    <div class="sc sc-home"><i class="glow g1"></i><i class="glow g2"></i><i class="h" style="--x:6%;--y:14%;--s:64px;--d:26s;--o:0.16;--r:-14deg;--dl:-3s;--dx:10px"></i><i class="h" style="--x:82%;--y:8%;--s:96px;--d:32s;--o:0.12;--r:12deg;--dl:-9s;--dx:-14px"></i><i class="h" style="--x:44%;--y:5%;--s:26px;--d:22s;--o:0.2;--r:8deg;--dl:-5s;--dx:10px"></i><i class="h" style="--x:90%;--y:46%;--s:38px;--d:24s;--o:0.18;--r:-8deg;--dl:-12s;--dx:10px"></i><i class="h" style="--x:3%;--y:52%;--s:110px;--d:36s;--o:0.1;--r:10deg;--dl:-15s;--dx:12px"></i><i class="h" style="--x:30%;--y:38%;--s:22px;--d:20s;--o:0.17;--r:-18deg;--dl:-2s;--dx:10px"></i><i class="h" style="--x:68%;--y:64%;--s:72px;--d:30s;--o:0.11;--r:-10deg;--dl:-7s;--dx:10px"></i><i class="h" style="--x:18%;--y:82%;--s:46px;--d:25s;--o:0.15;--r:16deg;--dl:-11s;--dx:10px"></i><i class="h" style="--x:55%;--y:88%;--s:120px;--d:38s;--o:0.09;--r:-6deg;--dl:-20s;--dx:-16px"></i><i class="h" style="--x:94%;--y:86%;--s:30px;--d:21s;--o:0.19;--r:6deg;--dl:-4s;--dx:10px"></i><i class="h" style="--x:38%;--y:70%;--s:18px;--d:19s;--o:0.16;--r:-22deg;--dl:-8s;--dx:10px"></i><i class="h" style="--x:74%;--y:28%;--s:20px;--d:23s;--o:0.15;--r:14deg;--dl:-13s;--dx:10px"></i></div>
    <div class="sc sc-explore"><i class="glow g1"></i><i class="glow g2"></i><i class="glow g3"></i><i class="ray"></i><i class="h soft" style="--x:12%;--y:22%;--s:120px;--d:40s;--o:0.08;--r:-10deg;--dl:-6s;--dx:18px"></i><i class="h soft" style="--x:76%;--y:12%;--s:84px;--d:34s;--o:0.09;--r:14deg;--dl:-2s;--dx:-18px"></i><i class="h soft" style="--x:60%;--y:70%;--s:150px;--d:44s;--o:0.07;--r:8deg;--dl:-14s;--dx:16px"></i><i class="h soft" style="--x:4%;--y:76%;--s:58px;--d:30s;--o:0.1;--r:-16deg;--dl:-9s;--dx:10px"></i><i class="sp" style="--x:20%;--y:10%;--s:14px;--d:6s;--o:0.7;--dl:-1s"></i><i class="sp" style="--x:48%;--y:18%;--s:9px;--d:5s;--o:0.6;--dl:-3s"></i><i class="sp" style="--x:86%;--y:36%;--s:12px;--d:7s;--o:0.7;--dl:-0s"></i><i class="sp" style="--x:70%;--y:52%;--s:8px;--d:5s;--o:0.55;--dl:-2s"></i><i class="sp" style="--x:10%;--y:44%;--s:10px;--d:6s;--o:0.6;--dl:-4s"></i><i class="sp" style="--x:34%;--y:62%;--s:13px;--d:8s;--o:0.65;--dl:-5s"></i><i class="sp" style="--x:92%;--y:74%;--s:9px;--d:6s;--o:0.6;--dl:-1.5s"></i><i class="sp" style="--x:52%;--y:90%;--s:11px;--d:7s;--o:0.6;--dl:-3.5s"></i><i class="sp" style="--x:26%;--y:86%;--s:8px;--d:5s;--o:0.5;--dl:-2.5s"></i><i class="sp" style="--x:64%;--y:6%;--s:7px;--d:4.5s;--o:0.55;--dl:-0.5s"></i></div>
    <div class="sc sc-songs"><i class="wave w1"></i><i class="wave w2"></i><i class="h" style="--x:8%;--y:18%;--s:52px;--d:28s;--o:0.14;--r:-12deg;--dl:-4s;--dx:10px"></i><i class="h" style="--x:86%;--y:24%;--s:74px;--d:34s;--o:0.11;--r:10deg;--dl:-10s;--dx:-12px"></i><i class="h" style="--x:46%;--y:60%;--s:30px;--d:24s;--o:0.15;--r:-6deg;--dl:-2s;--dx:10px"></i><i class="h" style="--x:92%;--y:70%;--s:44px;--d:26s;--o:0.13;--r:16deg;--dl:-7s;--dx:10px"></i><i class="h" style="--x:14%;--y:68%;--s:86px;--d:36s;--o:0.09;--r:8deg;--dl:-13s;--dx:14px"></i><i class="n" style="--x:24%;--y:12%;--s:34px;--d:18s;--o:0.2;--r:-10deg;--dl:-2s">♪</i><i class="n" style="--x:62%;--y:8%;--s:44px;--d:24s;--o:0.16;--r:12deg;--dl:-7s">♫</i><i class="n" style="--x:78%;--y:52%;--s:30px;--d:20s;--o:0.18;--r:-14deg;--dl:-11s">♪</i><i class="n" style="--x:5%;--y:40%;--s:40px;--d:22s;--o:0.15;--r:8deg;--dl:-5s">♫</i><i class="n" style="--x:52%;--y:82%;--s:36px;--d:19s;--o:0.17;--r:-6deg;--dl:-9s">♪</i><i class="n" style="--x:34%;--y:46%;--s:24px;--d:17s;--o:0.15;--r:14deg;--dl:-14s">♪</i><i class="sp" style="--x:70%;--y:90%;--s:9px;--d:6s;--o:0.5;--dl:-1s"></i><i class="sp" style="--x:18%;--y:90%;--s:8px;--d:5s;--o:0.5;--dl:-3s"></i></div>
    <div class="sc sc-videos"><i class="vig"></i><i class="streak s1"></i><i class="streak s2"></i><i class="b bk1" style="--x:10%;--y:20%;--s:140px;--d:30s;--o:0.18;--dl:-4s"></i><i class="b bk2" style="--x:80%;--y:14%;--s:200px;--d:38s;--o:0.15;--dl:-10s"></i><i class="b bk1" style="--x:58%;--y:46%;--s:90px;--d:26s;--o:0.16;--dl:-6s"></i><i class="b bk3" style="--x:90%;--y:62%;--s:150px;--d:34s;--o:0.14;--dl:-2s"></i><i class="b bk2" style="--x:22%;--y:72%;--s:110px;--d:28s;--o:0.15;--dl:-12s"></i><i class="b bk3" style="--x:44%;--y:88%;--s:190px;--d:40s;--o:0.12;--dl:-8s"></i><i class="b bk1" style="--x:70%;--y:82%;--s:70px;--d:24s;--o:0.17;--dl:-1s"></i><i class="b bk3" style="--x:4%;--y:48%;--s:80px;--d:25s;--o:0.14;--dl:-15s"></i><i class="b bk2" style="--x:36%;--y:12%;--s:60px;--d:23s;--o:0.16;--dl:-5s"></i><i class="h deep" style="--x:16%;--y:10%;--s:92px;--d:36s;--o:0.1;--r:-12deg;--dl:-6s;--dx:14px"></i><i class="h deep" style="--x:84%;--y:74%;--s:130px;--d:42s;--o:0.08;--r:10deg;--dl:-12s;--dx:-16px"></i><i class="h deep" style="--x:50%;--y:34%;--s:40px;--d:28s;--o:0.1;--r:-8deg;--dl:-3s;--dx:10px"></i></div>
    <div class="sc sc-favorites"><i class="glow g1"></i><i class="glow g2"></i><i class="h rose" style="--x:84%;--y:60%;--s:150px;--d:40s;--o:0.13;--r:-10deg;--dl:-8s;--dx:-12px"></i><i class="h rose" style="--x:72%;--y:74%;--s:88px;--d:32s;--o:0.15;--r:14deg;--dl:-3s;--dx:10px"></i><i class="h rose" style="--x:92%;--y:82%;--s:56px;--d:26s;--o:0.17;--r:-6deg;--dl:-10s;--dx:-8px"></i><i class="h rose" style="--x:64%;--y:88%;--s:40px;--d:24s;--o:0.17;--r:8deg;--dl:-5s;--dx:8px"></i><i class="h" style="--x:7%;--y:16%;--s:60px;--d:30s;--o:0.13;--r:12deg;--dl:-6s;--dx:12px"></i><i class="h" style="--x:26%;--y:8%;--s:28px;--d:22s;--o:0.17;--r:-14deg;--dl:-1s;--dx:10px"></i><i class="h" style="--x:2%;--y:60%;--s:44px;--d:26s;--o:0.12;--r:-8deg;--dl:-13s;--dx:10px"></i><i class="h" style="--x:46%;--y:94%;--s:24px;--d:21s;--o:0.15;--r:16deg;--dl:-9s;--dx:10px"></i><i class="sp" style="--x:12%;--y:34%;--s:13px;--d:5s;--o:0.8;--dl:-0.5s"></i><i class="sp" style="--x:38%;--y:20%;--s:10px;--d:4.5s;--o:0.7;--dl:-2s"></i><i class="sp" style="--x:58%;--y:12%;--s:14px;--d:6s;--o:0.8;--dl:-3.5s"></i><i class="sp" style="--x:90%;--y:22%;--s:11px;--d:5s;--o:0.7;--dl:-1s"></i><i class="sp" style="--x:78%;--y:46%;--s:9px;--d:4s;--o:0.7;--dl:-4s"></i><i class="sp" style="--x:20%;--y:58%;--s:10px;--d:5s;--o:0.7;--dl:-2.5s"></i><i class="sp" style="--x:50%;--y:72%;--s:12px;--d:5.5s;--o:0.75;--dl:-1s"></i><i class="sp" style="--x:96%;--y:90%;--s:9px;--d:4.5s;--o:0.7;--dl:-3s"></i><i class="sp" style="--x:6%;--y:86%;--s:11px;--d:5s;--o:0.7;--dl:-0s"></i><i class="sp" style="--x:68%;--y:30%;--s:8px;--d:4s;--o:0.65;--dl:-5s"></i></div>
  </div>`;
}

/** Area utama: #view (diisi skeleton lalu halaman asli), host video mini, dan footer kredit. */
function MainShell() {
  return `<main class="main" id="main">
      <div id="view" aria-busy="true">
${PageSkeletons()}
      </div>
      <div class="vid-host" id="vidHost" hidden>
        <div class="vid-mini-bar">
          <span class="vid-mini-title" id="vidMiniTitle"></span>
          <button type="button" class="vid-mini-btn" data-vid-expand aria-label="Buka halaman video" title="Buka halaman video"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
          <button type="button" class="vid-mini-btn" data-vid-close aria-label="Tutup video mini" title="Tutup video"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="vid-frame"></div>
      </div>
      <footer class="credit">Web Music ini dibuat dengan penuh cinta dan kasih sayang <i class="fa-solid fa-heart"></i> oleh <span class="credit-name">Sasuke</span>, untuk seseorang yaitu <span class="credit-name">Altrx</span>.
      </footer>
    </main>`;
}

/** Penampung pemutar bawah (diisi PlayerBar). */
function PlayerBarShell() {
  return `<footer class="player-bar" id="player"></footer>`;
}

/** Widget SoundCloud tersembunyi: mesin pemutar audio. src diisi SoundCloudPlayer.activate() setelah halaman termuat. */
function SoundCloudFrameShell() {
  return `<iframe id="sc" title="SoundCloud player" allow="autoplay; encrypted-media"
    style="position:fixed;right:0;bottom:0;width:300px;height:166px;border:0;opacity:0;pointer-events:none;z-index:-1"
    data-src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A1768722903&auto_play=false"></iframe>`;
}

/** Penampung layar "Sedang Diputar" (diisi NowPlaying). */
function NowPlayingShell() {
  return `<section class="np" id="nowPlaying" aria-label="Now Playing" aria-hidden="true" inert></section>`;
}

/** Penampung notifikasi singkat (diisi Toast). */
function ToastShell() {
  return `<div class="toast" id="toast" role="status"></div>`;
}

/** Seluruh susunan halaman: .app + elemen pendamping (iframe SoundCloud, Now Playing, toast). */
function AppShell() {
  return `<div class="app">
    ${NavbarShell()}
    ${SidebarShell()}
    ${BackgroundDecoShell()}
    ${MainShell()}
    ${PlayerBarShell()}
  </div>
  ${SoundCloudFrameShell()}
  ${NowPlayingShell()}
  ${ToastShell()}`;
}
