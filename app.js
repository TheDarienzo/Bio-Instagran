(function () {
  "use strict";

  var ICONS = window.ICONS;
  var API = window.API;
  var ARROW = '<span class="tag__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span>';
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

  var conf = {}, whatsapps = [], redes = [], links = [], destaques = [];
  var pageUrl = location.href.split("#")[0].split("?")[0];
  var pronto = false; // interações já ligadas?

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function digits(n) { return String(n || "").replace(/\D/g, ""); }
  function brl(v) { return "R$ " + Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function lojasDaPeca(c) {
    var ids = c.lojas || [];
    var todas = lojasComNumero();
    if (!ids.length) return todas;
    return todas.filter(function (w) { return ids.indexOf(w.id) >= 0; });
  }
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
    destaques = d.destaques || [];
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

    /* Vitrine */
    var wrap = document.getElementById("showcaseWrap");
    document.getElementById("showcase").innerHTML = destaques.map(function (c) {
      var capa = (c.imagens && c.imagens[0]) || "";
      if (!capa) return "";
      var out = c.status === "esgotado";
      var tag = out ? "Esgotado" : c.status === "ultimas" ? "Últimas" : (c.selo || (c.preco_antigo && c.preco && c.preco_antigo > c.preco ? "Promo" : ""));
      return '<a class="card' + (out ? " card--out" : "") + '" href="#" data-peca="' + esc(c.id) + '">' +
        '<img src="' + esc(capa) + '" alt="' + esc(c.titulo) + '" loading="lazy" decoding="async" width="300" height="375">' +
        (tag ? '<span class="card__tag">' + esc(tag) + "</span>" : "") +
        '<span class="card__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span>' +
        '<span class="card__body"><span class="card__title">' + esc(c.titulo) + "</span>" +
        (c.preco != null ? '<span class="card__sub">' + (c.preco_antigo && c.preco_antigo > c.preco ? "<s>" + brl(c.preco_antigo) + "</s>" : "") + brl(c.preco) + "</span>" : "") +
        "</span></a>";
    }).join("");
    wrap.hidden = !document.getElementById("showcase").children.length;

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
      if (it.tipo === "secao") return '<li class="section" role="presentation" style="--i:' + i + '"><p class="eyebrow">' + esc(it.titulo) + "</p></li>";
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

    /* ─── Ficha da peça ─── */
    var pieceSheet = document.getElementById("pieceSheet");
    var pieceBox = document.getElementById("piece");
    var pecaAberta = null, escolha = { tamanho: "", cor: "" };

    function msgEstoque(c, loja) {
        var variacao = [escolha.tamanho ? "tamanho " + escolha.tamanho : "", escolha.cor ? "cor " + escolha.cor : ""].filter(Boolean).join(", ");
        var modelo = conf.msg_estoque || "Oi! Vi {peca} na página de vocês por {preco}. Tem no estoque{variacao}? {foto}";
        return modelo
          .replace("{peca}", c.titulo + (c.referencia ? " (ref. " + c.referencia + ")" : ""))
          .replace("{preco}", c.preco != null ? brl(c.preco) : "")
          .replace("{variacao}", variacao ? " no " + variacao : "")
          .replace("{loja}", loja ? loja.nome : "")
          .replace("{foto}", c.imagens && c.imagens[0] ? c.imagens[0] : "")
          .replace(/\s+\?/g, "?").replace(/\s{2,}/g, " ").trim();
    }

    function abrirPeca(c) {
      pecaAberta = c; escolha = { tamanho: "", cor: "" };
      var lojas = lojasDaPeca(c);
      var out = c.status === "esgotado";
      var h = '<div class="piece__photos">' + (c.imagens || []).map(function (u, i) { return '<img src="' + esc(u) + '" alt="' + esc(c.titulo) + (i ? " " + (i + 1) : "") + '"' + (i ? ' loading="lazy"' : "") + ">"; }).join("") + "</div>";
      h += '<div class="piece__head"><div><h2 class="piece__title" id="pieceTitle">' + esc(c.titulo) + "</h2>" + (c.referencia ? '<span class="piece__ref">REF. ' + esc(c.referencia) + "</span>" : "") + "</div>";
      if (c.preco != null) h += '<div class="piece__price">' + (c.preco_antigo && c.preco_antigo > c.preco ? "<s>" + brl(c.preco_antigo) + "</s>" : "") + "<b>" + brl(c.preco) + "</b></div>";
      h += "</div>";
      if (c.descricao) h += '<p class="piece__desc">' + esc(c.descricao) + "</p>";
      if (c.tamanhos && c.tamanhos.length) h += '<span class="piece__label">Tamanho</span><div class="chips" data-grupo="tamanho">' + c.tamanhos.map(function (t) { return '<button type="button" data-v="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>";
      if (c.cores && c.cores.length) h += '<span class="piece__label">Cor</span><div class="chips" data-grupo="cor">' + c.cores.map(function (t) { return '<button type="button" data-v="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>";
      if (lojas.length) h += '<span class="piece__label">Disponível em</span><p class="piece__stores">' + lojas.map(function (w) { return "<b>" + esc(w.nome) + "</b>" + (w.endereco ? " · " + esc(w.endereco) : ""); }).join("<br>") + "</p>";
      h += '<div class="piece__actions">';
      if (out) h += '<span class="piece__cta piece__cta--out"><span class="tag__icon">' + ICONS.svg("heart") + '</span><span>Esgotado no momento<small>Fale com a loja para saber quando volta</small></span><span></span></span>';
      if (lojas.length) h += (lojas.length === 1 ? '<a class="piece__cta" data-estoque href="' + esc(waLink(lojas[0], msgEstoque(c, lojas[0]))) + '" target="_blank" rel="noopener">' : '<button type="button" class="piece__cta" data-estoque>') +
        '<span class="tag__icon">' + ICONS.svg("whatsapp") + "</span><span>" + (out ? "Avisar quando chegar" : "Tem no estoque?") + "<small>" + (lojas.length === 1 ? "Chamar " + esc(lojas[0].nome) + " no WhatsApp" : "Escolha a loja e chame no WhatsApp") + '</small></span><span class="tag__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span>' + (lojas.length === 1 ? "</a>" : "</button>");
      h += '<div class="piece__row">' + (c.url ? '<a class="piece__sec" href="' + esc(c.url) + '" target="_blank" rel="noopener" data-catalogo>' + ICONS.svg("bag") + "Ver no catálogo</a>" : "") +
        '<button type="button" class="piece__sec" data-compartilhar>' + ICONS.svg("link") + "Compartilhar</button></div></div>";
      h += '<p class="piece__note">A foto vai junto na mensagem como link.</p>';
      pieceBox.innerHTML = h;
      abrir(pieceSheet);
      API.rpc("registrar_clique_peca", { peca_id: c.id, acao: "abriu", visitante: visitanteId() }).catch(function () {});
    }

    pieceBox.addEventListener("click", function (e) {
      var chip = e.target.closest(".chips button");
      if (chip) {
        var grupo = chip.parentNode.dataset.grupo, ligado = chip.classList.contains("is-on");
        chip.parentNode.querySelectorAll("button").forEach(function (b) { b.classList.remove("is-on"); });
        if (!ligado) chip.classList.add("is-on");
        escolha[grupo] = ligado ? "" : chip.dataset.v;
        // atualiza o link do WhatsApp com a escolha
        var cta = pieceBox.querySelector("a[data-estoque]"), l1 = lojasDaPeca(pecaAberta);
        if (cta && l1.length === 1) cta.href = waLink(l1[0], msgEstoque(pecaAberta, l1[0]));
        return;
      }
      if (e.target.closest("[data-estoque]")) {
        var c = pecaAberta, lojas = lojasDaPeca(c);
        API.rpc("registrar_clique_peca", { peca_id: c.id, acao: "whatsapp", visitante: visitanteId() }).catch(function () {});
        if (lojas.length === 1) return; // é um link real; o navegador abre
        // várias lojas: lista com a mensagem de cada uma
        document.getElementById("waTitle").textContent = "Qual loja?";
        document.getElementById("waSub").textContent = "A mensagem já vai pronta com a peça";
        document.getElementById("branches").innerHTML = lojas.map(function (w) {
          return '<a class="branch" href="' + esc(waLink(w, msgEstoque(c, w))) + '" target="_blank" rel="noopener"><span class="branch__icon">' + ICONS.svg("whatsapp") + '</span><span class="branch__text"><span class="branch__name">' + esc(w.nome) + "</span>" + (w.endereco ? '<span class="branch__addr">' + esc(w.endereco) + "</span>" : "") + '</span><span class="tag__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span></a>';
        }).join("");
        fechar(pieceSheet); abrir(waSheet);
        return;
      }
      if (e.target.closest("[data-catalogo]")) API.rpc("registrar_clique_peca", { peca_id: pecaAberta.id, acao: "catalogo", visitante: visitanteId() }).catch(function () {});
      if (e.target.closest("[data-compartilhar]")) {
        var c2 = pecaAberta, texto = c2.titulo + (c2.preco != null ? " · " + brl(c2.preco) : "") + " — " + (conf.nome || "") + " " + pageUrl + "#peca=" + c2.id;
        API.rpc("registrar_clique_peca", { peca_id: c2.id, acao: "compartilhou", visitante: visitanteId() }).catch(function () {});
        if (navigator.share) navigator.share({ title: c2.titulo, text: texto, url: pageUrl + "#peca=" + c2.id }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(texto).then(function () { toast("Link da peça copiado"); });
      }
    });

    // link direto para uma peça (#peca=id)
    var m = /[#&]peca=([0-9a-f-]{36})/.exec(location.hash);
    if (m) { var alvo = destaques.filter(function (d) { return d.id === m[1]; })[0]; if (alvo) setTimeout(function () { abrirPeca(alvo); }, 300); }

    document.addEventListener("click", function (e) {
      if (e.target.closest("#pieceSheet [data-close]")) return fechar(pieceSheet);
      var cardEl = e.target.closest("a.card[data-peca]");
      if (cardEl) { e.preventDefault(); var pc = destaques.filter(function (d) { return d.id === cardEl.dataset.peca; })[0]; if (pc) abrirPeca(pc); return; }
      if (e.target.closest("#waSheet [data-close]")) return fechar(waSheet);
      if (e.target.closest("#sheet [data-close]")) return fechar(shareSheet);
      var a = e.target.closest("[data-filiais], [data-mapas]");
      if (a) { e.preventDefault(); montarLojas(a.hasAttribute("data-mapas") ? "mapas" : "filiais", a.dataset.msg || ""); abrir(waSheet); return; }
      var link = e.target.closest("#links a[data-id]");
      if (link) API.rpc("registrar_clique", { link_id: link.dataset.id, visitante: visitanteId() }).catch(function () {});
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!pieceSheet.hidden) fechar(pieceSheet);
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
