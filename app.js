(function () {
  "use strict";

  var ICONS = window.ICONS;
  var API = window.API;
  var ARROW = '<svg class="tag__go" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  var CACHE = "rs_pagina_v1";

  /* ─── Modo leve: aparelho fraco, economia de dados ou "reduzir movimento" ─── */
  var lite = false;
  try {
    var con = navigator.connection || {};
    lite = (navigator.deviceMemory && navigator.deviceMemory <= 3) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      con.saveData === true || /(^|-)2g$/.test(con.effectiveType || "") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}
  if (lite) document.documentElement.classList.add("lite");

  var conf = {}, whatsapps = [], redes = [], links = [];
  var pageUrl = location.href.split("#")[0].split("?")[0];
  var pronto = false; // interações já ligadas?

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function digits(n) { return String(n || "").replace(/\D/g, ""); }
  function waLink(wa, msg) {
    var text = msg || wa.mensagem;
    return "https://wa.me/" + digits(wa.numero) + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function mapaLink(w) {
    return w.mapa_url || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(w.endereco);
  }
  function lojasComEndereco() { return whatsapps.filter(function (w) { return w.endereco || w.mapa_url; }); }
  function lojasComNumero() { return whatsapps.filter(function (w) { return digits(w.numero); }); }
  function isExternal(url) { return /^https?:/i.test(url); }
  function inWindow(item, now) {
    if (item.inicio && now < new Date(item.inicio)) return false;
    if (item.fim && now > new Date(item.fim)) return false;
    return true;
  }

  // Para onde um link leva: "" = sem destino, "#filiais" = lista de WhatsApps, "#mapas" = lista de endereços
  function destino(l) {
    if (l.mapa) {
      var lojas = lojasComEndereco();
      if (!lojas.length) return "";
      return lojas.length === 1 ? mapaLink(lojas[0]) : "#mapas";
    }
    var usaWa = l.whatsapp_todos || l.whatsapp_id || l.url === "whatsapp" || (l.url || "").indexOf("whatsapp:") === 0;
    if (!usaWa) return l.url || "#";
    var comNumero = lojasComNumero();
    if (!comNumero.length) return "";
    var msg = l.whatsapp_mensagem || ((l.url || "").indexOf("whatsapp:") === 0 ? l.url.slice(9) : "");
    if (l.whatsapp_todos && comNumero.length > 1) return "#filiais";
    var wa = null;
    for (var i = 0; i < comNumero.length; i++) if (comNumero[i].id === l.whatsapp_id) wa = comNumero[i];
    return waLink(wa || comNumero[0], msg);
  }

  /* ─── Carregamento: desenha o cache na hora, busca a versão nova por baixo ─── */
  var cacheTxt = null;
  try { cacheTxt = localStorage.getItem(CACHE); } catch (e) {}
  if (cacheTxt) { try { aplicar(JSON.parse(cacheTxt)); } catch (e) { cacheTxt = null; } }

  API.rpc("pagina_publica").then(function (dados) {
    var txt = JSON.stringify(dados);
    if (txt !== cacheTxt) {
      aplicar(dados);
      try { localStorage.setItem(CACHE, txt); } catch (e) {}
    }
    registrarVisita();
  }).catch(function () {
    if (!cacheTxt) document.getElementById("bio").textContent = "Não foi possível carregar a página agora.";
  });

  function aplicar(d) {
    conf = d.conf || {};
    redes = d.redes || [];
    links = d.links || [];
    whatsapps = (d.whatsapps || []).filter(function (w) { return digits(w.numero) || w.endereco || w.mapa_url; });
    if (conf.url) pageUrl = conf.url;
    render();
    if (!pronto) { pronto = true; setupInteracoes(); }
  }

  /* ─── Desenho (pode rodar mais de uma vez) ─── */
  function render() {
    var logo = document.querySelector(".logo img");
    if (conf.logo_url && logo.getAttribute("src") !== conf.logo_url) logo.src = conf.logo_url;
    document.getElementById("bio").textContent = conf.bio || "";
    document.getElementById("year").textContent = "© " + new Date().getFullYear();
    document.getElementById("footName").textContent = conf.nome || "";
    if (conf.nome) document.title = conf.nome;

    /* Redes */
    var socials = document.getElementById("socials");
    var comNumero = lojasComNumero();
    socials.innerHTML = redes.map(function (r) {
      var href = r.url, extra = "";
      if (r.tipo === "whatsapp") {
        if (!comNumero.length) return "";
        if (comNumero.length === 1) href = waLink(comNumero[0]); else { href = "#"; extra = " data-filiais"; }
      }
      if (!href) return "";
      var nome = r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1);
      return '<a href="' + esc(href) + '" aria-label="' + esc(nome) + '"' + extra + (isExternal(href) ? ' target="_blank" rel="noopener"' : "") + ">" + ICONS.svg(r.tipo) + "</a>";
    }).join("");
    socials.hidden = !socials.children.length;

    /* Links */
    var now = new Date();
    var items = [];
    links.forEach(function (it) {
      if (it.tipo === "secao") { items.push(it); return; }
      if (!inWindow(it, now)) return;
      var href = destino(it);
      if (href) items.push(Object.assign({}, it, { href: href }));
    });
    items = items.filter(function (it, idx) { // seção sem link embaixo não aparece
      if (it.tipo !== "secao") return true;
      var next = items[idx + 1];
      return next && next.tipo !== "secao";
    });

    document.getElementById("links").innerHTML = items.map(function (it, i) {
      if (it.tipo === "secao") return '<li class="section" role="presentation" style="--i:' + i + '">' + esc(it.titulo) + "</li>";
      return '<li class="' + (it.destaque ? "is-featured" : "") + '" style="--i:' + i + '">' +
        '<a class="tag' + (it.destaque ? " tag--featured" : "") + '" href="' + esc(it.href) + '" data-id="' + esc(it.id) + '"' +
        (it.href === "#filiais" ? ' data-filiais data-msg="' + esc(it.whatsapp_mensagem) + '"' : "") +
        (it.href === "#mapas" ? " data-mapas" : "") +
        (isExternal(it.href) ? ' target="_blank" rel="noopener"' : "") + ">" +
        '<span class="tag__icon">' + ICONS.svg(it.icone) + "</span>" +
        '<span class="tag__text"><span class="tag__title">' + esc(it.titulo) +
          (it.selo ? '<span class="tag__badge">' + esc(it.selo) + "</span>" : "") + "</span>" +
          (it.subtitulo ? '<span class="tag__sub">' + esc(it.subtitulo) + "</span>" : "") +
        "</span>" + ARROW + "</a></li>";
    }).join("");

    renderStatus();
    document.getElementById("shareWa").href = "https://wa.me/?text=" + encodeURIComponent((conf.nome || "") + " 💜 " + pageUrl);
  }

  /* ─── Horário de atendimento (fuso de Cuiabá) ─── */
  var FUSO = "America/Cuiaba";
  function agoraNaLoja() {
    try {
      var partes = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date());
      var v = {}; partes.forEach(function (p) { v[p.type] = p.value; });
      var dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v.weekday);
      return { dia: dia < 0 ? new Date().getDay() : dia, mins: (+v.hour % 24) * 60 + +v.minute };
    } catch (e) { var d = new Date(); return { dia: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() }; }
  }

  function renderStatus() {
    var h = conf.horario;
    var el = document.getElementById("status");
    var box = document.getElementById("hours");
    el.className = "status";
    if (!h || !Object.keys(h).some(function (k) { return h[k]; })) { el.hidden = true; box.hidden = true; return; }

    var agora = agoraNaLoja(), mins = agora.mins;
    var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    function toMin(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }
    function fmt(t) { var p = t.split(":"); return +p[0] + "h" + (p[1] !== "00" ? p[1] : ""); }

    var hoje = h[agora.dia];
    var almoco = hoje && hoje[2] && hoje[3] ? [toMin(hoje[2]), toMin(hoje[3])] : null;
    var texto = "";
    if (hoje && mins >= toMin(hoje[0]) && mins < toMin(hoje[1])) {
      if (almoco && mins >= almoco[0] && mins < almoco[1]) texto = "Pausa para o almoço · volta às " + fmt(hoje[3]);
      else if (almoco && mins < almoco[0]) { texto = "Atendendo agora · pausa às " + fmt(hoje[2]); el.classList.add("is-open"); }
      else { texto = "Atendendo agora · até " + fmt(hoje[1]); el.classList.add("is-open"); }
    } else {
      var msg = "";
      if (hoje && mins < toMin(hoje[0])) msg = "Abre hoje às " + fmt(hoje[0]);
      else for (var k = 1; k <= 7; k++) { var dia = (agora.dia + k) % 7; if (h[dia]) { msg = "Volta " + (k === 1 ? "amanhã" : DIAS[dia]) + " às " + fmt(h[dia][0]); break; } }
      texto = msg ? "Fora do horário · " + msg : "";
    }
    el.textContent = texto;
    el.hidden = !texto;

    // tabela resumida: dias seguidos iguais viram "Segunda a sexta"
    var grupos = [];
    for (var d = 1; d <= 7; d++) {
      var di = d % 7, chave = JSON.stringify(h[di] || null), ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.chave === chave) ultimo.dias.push(di); else grupos.push({ chave: chave, v: h[di], dias: [di] });
    }
    function rotulo(dias) {
      var a = DIAS[dias[0]], b = DIAS[dias[dias.length - 1]];
      var t = dias.length === 1 ? a : dias.length === 2 ? a + " e " + b : a + " a " + b;
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    box.innerHTML = "<dl>" + grupos.map(function (g) {
      var v = g.v, cls = (g.dias.indexOf(agora.dia) >= 0 ? "is-today" : "") + (v ? "" : " is-closed");
      var txt = v ? fmt(v[0]) + " às " + fmt(v[1]) + (v[2] && v[3] ? '<span class="hours__lunch">almoço ' + fmt(v[2]) + " às " + fmt(v[3]) + "</span>" : "") : "fechado";
      return '<div class="' + cls.trim() + '" style="display:contents"><dt>' + rotulo(g.dias) + "</dt><dd>" + txt + "</dd></div>";
    }).join("") + "</dl><small>Horário de Cuiabá</small>";
    box.hidden = false;
  }

  /* ─── Interações (ligadas uma vez, por delegação) ─── */
  function setupInteracoes() {
    var waSheet = document.getElementById("waSheet");
    var shareSheet = document.getElementById("sheet");
    var toastEl = document.getElementById("toast");
    var toastTimer, lastFocus, qrDone = false;

    function abrir(sheet) { lastFocus = document.activeElement; sheet.hidden = false; sheet.querySelector(".sheet__x").focus(); }
    function fechar(sheet) { sheet.hidden = true; if (lastFocus) lastFocus.focus(); }
    function toast(msg) {
      toastEl.textContent = msg; toastEl.classList.add("is-on");
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
    }

    // lista de lojas (WhatsApp ou mapa)
    function montarLojas(modo, msg) {
      var mapa = modo === "mapas";
      var lojas = mapa ? lojasComEndereco() : lojasComNumero();
      document.getElementById("waTitle").textContent = mapa ? "Como chegar" : "Falar no WhatsApp";
      document.getElementById("waSub").textContent = mapa ? "Escolha a loja para abrir no mapa" : "Escolha a loja mais perto de você";
      document.getElementById("branches").innerHTML = lojas.map(function (w) {
        return '<a class="branch" href="' + esc(mapa ? mapaLink(w) : waLink(w, msg)) + '" target="_blank" rel="noopener">' +
          '<span class="branch__icon">' + ICONS.svg(mapa ? "map" : "whatsapp") + "</span>" +
          '<span class="branch__text"><span class="branch__name">' + esc(w.nome || (mapa ? "Loja" : "WhatsApp")) + "</span>" +
            (w.endereco ? '<span class="branch__addr">' + esc(w.endereco) + "</span>" : "") + "</span>" + ARROW + "</a>";
      }).join("");
    }

    document.addEventListener("click", function (e) {
      if (e.target.closest("#waSheet [data-close]")) return fechar(waSheet);
      if (e.target.closest("#sheet [data-close]")) return fechar(shareSheet);
      var a = e.target.closest("[data-filiais], [data-mapas]");
      if (a) { e.preventDefault(); montarLojas(a.hasAttribute("data-mapas") ? "mapas" : "filiais", a.dataset.msg || ""); abrir(waSheet); return; }
      var link = e.target.closest("#links a[data-id]");
      if (link) API.rpc("registrar_clique", { link_id: link.dataset.id, visitante: visitanteId() }).catch(function () {});
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!waSheet.hidden) fechar(waSheet);
      if (!shareSheet.hidden) fechar(shareSheet);
    });

    // compartilhar
    document.getElementById("shareBtn").addEventListener("click", function () { abrir(shareSheet); renderQR(); });
    document.getElementById("copyLink").addEventListener("click", function () {
      function done() { toast("Link copiado"); }
      function fallback() {
        var t = document.createElement("textarea"); t.value = pageUrl; t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); done(); } catch (e) { toast(pageUrl); }
        t.remove();
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(pageUrl).then(done, fallback); else fallback();
    });
    var nativeBtn = document.getElementById("nativeShare");
    if (navigator.share) {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener("click", function () { navigator.share({ title: conf.nome, text: conf.bio, url: pageUrl }).catch(function () {}); });
    }
    document.getElementById("saveContact").addEventListener("click", function () {
      var nome = conf.nome || "Rayane Store";
      var linhas = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + nome, "ORG:" + nome];
      whatsapps.forEach(function (w) { if (digits(w.numero)) linhas.push("TEL;TYPE=CELL" + (w.nome ? ";TYPE=" + w.nome.replace(/[^\w]/g, "") : "") + ":+" + digits(w.numero)); });
      whatsapps.forEach(function (w) { if (w.endereco) linhas.push("ADR;TYPE=WORK:;;" + w.endereco.replace(/[,;]/g, " ") + ";;;;"); });
      linhas.push("URL:" + pageUrl, "END:VCARD");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([linhas.join("\r\n")], { type: "text/vcard" }));
      a.download = nome.toLowerCase().replace(/\s+/g, "-") + ".vcf";
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    function renderQR() {
      if (qrDone) return;
      var box = document.getElementById("qr");
      function draw() {
        var qr = window.qrcode(0, "M"); qr.addData(pageUrl); qr.make();
        var n = qr.getModuleCount(), d = "";
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
        box.innerHTML = '<svg viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges"><path fill="#6f1f76" d="' + d + '"/></svg>';
        qrDone = true;
      }
      if (window.qrcode) return draw();
      var s = document.createElement("script"); s.src = "assets/vendor/qrcode.js"; s.onload = draw;
      s.onerror = function () { box.textContent = "QR indisponível"; };
      document.head.appendChild(s);
    }

    // ondulação ao tocar e inclinação 3D no computador (nunca no modo leve)
    if (lite) return;
    document.getElementById("links").addEventListener("pointerdown", function (e) {
      var a = e.target.closest("a.tag"); if (!a) return;
      var r = a.getBoundingClientRect(), tam = Math.max(r.width, r.height) * 1.6;
      var s = document.createElement("span"); s.className = "ripple";
      s.style.width = s.style.height = tam + "px";
      s.style.left = (e.clientX - r.left - tam / 2) + "px"; s.style.top = (e.clientY - r.top - tam / 2) + "px";
      a.appendChild(s); setTimeout(function () { s.remove(); }, 650);
    });
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var rack = document.querySelector(".rack"), alvo = { x: 0, y: 0 }, atual = { x: 0, y: 0 }, raf = null;
    function anima() {
      atual.x += (alvo.x - atual.x) * .16; atual.y += (alvo.y - atual.y) * .16;
      rack.style.transform = "perspective(1100px) rotateX(" + atual.x.toFixed(2) + "deg) rotateY(" + atual.y.toFixed(2) + "deg)";
      raf = (Math.abs(alvo.x - atual.x) > .01 || Math.abs(alvo.y - atual.y) > .01) ? requestAnimationFrame(anima) : null;
    }
    document.addEventListener("pointermove", function (e) {
      var r = rack.getBoundingClientRect();
      alvo.y = (e.clientX - (r.left + r.width / 2)) / r.width * 2.2;
      alvo.x = -(e.clientY - (r.top + r.height / 2)) / r.height * 1.6;
      if (!raf) raf = requestAnimationFrame(anima);
    });
    document.addEventListener("pointerleave", function () { alvo.x = alvo.y = 0; if (!raf) raf = requestAnimationFrame(anima); });
  }

  /* ─── Medição anônima (sem IP, sem nome) ─── */
  function visitanteId() {
    try {
      var id = localStorage.getItem("rs_visitante");
      if (!id) { id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); localStorage.setItem("rs_visitante", id); }
      return id;
    } catch (e) { return "anon"; }
  }

  function registrarVisita() {
    var hoje = new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem("rs_ultima_visita") === hoje) return; } catch (e) {}
    var ua = navigator.userAgent;
    if (/bot|crawl|spider|preview|facebookexternalhit|WhatsApp\//i.test(ua)) return;

    var dispositivo = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "celular" : "computador";
    var sistema = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "outro";
    var navegador = /Instagram/.test(ua) ? "Instagram (app)" : /FBAN|FBAV/.test(ua) ? "Facebook (app)" : /TikTok/i.test(ua) ? "TikTok (app)" : /EdgA?\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /OPR\//.test(ua) ? "Opera" : /Firefox/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "outro";
    var ref = ""; try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
    var origem = /instagram/.test(ref) || /Instagram/.test(ua) ? "instagram" : /whatsapp/.test(ref) ? "whatsapp" : /facebook|fb\./.test(ref) || /FBAN|FBAV/.test(ua) ? "facebook" : /tiktok/i.test(ref + ua) ? "tiktok" : /google/.test(ref) ? "google" : ref ? "outro site" : "direto";

    var dados = { visitante: visitanteId(), dispositivo: dispositivo, sistema: sistema, navegador: navegador, origem: origem, idioma: (navigator.language || "").slice(0, 5), largura: window.innerWidth, cidade: "", estado: "", pais: "" };

    // localização aproximada (cidade/estado); se falhar ou demorar, segue sem
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 2500);
    fetch("https://get.geojs.io/v1/ip/geo.json", { signal: ctrl && ctrl.signal })
      .then(function (r) { return r.json(); })
      .then(function (g) { dados.cidade = g.city || ""; dados.estado = g.region || ""; dados.pais = g.country || ""; })
      .catch(function () {})
      .then(function () { clearTimeout(timer); return API.inserir("visitas", dados); })
      .then(function () { try { localStorage.setItem("rs_ultima_visita", hoje); } catch (e) {} })
      .catch(function () {});
  }
})();
