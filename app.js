(function () {
  "use strict";

  var sb = window.supabase.createClient(window.SUPABASE.url, window.SUPABASE.key, {
    auth: { persistSession: false },
  });
  var ICONS = window.ICONS;
  var ARROW = '<svg class="tag__go" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

  var conf = {};
  var whatsapps = [];
  var pageUrl = location.href.split("#")[0].split("?")[0];

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

  function isExternal(url) { return /^https?:/i.test(url); }

  function inWindow(item, now) {
    if (item.inicio && now < new Date(item.inicio)) return false;
    if (item.fim && now > new Date(item.fim)) return false;
    return true;
  }

  function mapaLink(w) {
    return w.mapa_url || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(w.endereco);
  }
  function lojasComEndereco() {
    return whatsapps.filter(function (w) { return w.endereco || w.mapa_url; });
  }

  // Para onde um link leva. Devolve "" quando não há como montar o destino,
  // "#filiais" quando abre a lista de WhatsApps e "#mapas" quando abre a lista de endereços.
  function destino(l) {
    if (l.mapa) {
      var lojas = lojasComEndereco();
      if (!lojas.length) return "";
      return lojas.length === 1 ? mapaLink(lojas[0]) : "#mapas";
    }
    var usaWa = l.whatsapp_todos || l.whatsapp_id || l.url === "whatsapp" || (l.url || "").indexOf("whatsapp:") === 0;
    if (!usaWa) return l.url || "#";
    if (!whatsapps.length) return "";
    var msg = l.whatsapp_mensagem || ((l.url || "").indexOf("whatsapp:") === 0 ? l.url.slice(9) : "");
    if (l.whatsapp_todos && whatsapps.length > 1) return "#filiais";
    var wa = null;
    for (var i = 0; i < whatsapps.length; i++) if (whatsapps[i].id === l.whatsapp_id) wa = whatsapps[i];
    return waLink(wa || whatsapps[0], msg);
  }

  /* ─── Carrega tudo ─── */
  Promise.all([
    sb.from("configuracoes").select("*").eq("id", 1).maybeSingle(),
    sb.from("redes").select("*").eq("ativo", true).order("ordem"),
    sb.from("links").select("*").eq("ativo", true).order("ordem"),
    sb.from("whatsapps").select("*").eq("ativo", true).order("ordem"),
  ]).then(function (res) {
    conf = res[0].data || {};
    whatsapps = (res[3].data || []).filter(function (w) { return digits(w.numero) || w.endereco || w.mapa_url; });
    render(res[1].data || [], res[2].data || []);
  }).catch(function () {
    document.getElementById("bio").textContent = "Não foi possível carregar a página agora.";
  });

  function render(redes, links) {
    if (conf.url) pageUrl = conf.url;

    /* Perfil */
    if (conf.logo_url) document.querySelector(".logo img").src = conf.logo_url;
    document.getElementById("bio").textContent = conf.bio || "";
    document.getElementById("year").textContent = "© " + new Date().getFullYear();
    document.getElementById("footName").textContent = conf.nome || "";
    if (conf.nome) document.title = conf.nome;

    /* Redes */
    var socials = document.getElementById("socials");
    redes.forEach(function (r) {
      var href = r.url;
      var a = document.createElement("a");
      if (r.tipo === "whatsapp") {
        var comNumero = whatsapps.filter(function (w) { return digits(w.numero); });
        if (!comNumero.length) return;
        if (comNumero.length === 1) href = waLink(comNumero[0]);
        else { href = "#"; a.dataset.filiais = ""; }
      }
      if (!href) return;
      a.href = href;
      a.innerHTML = ICONS.svg(r.tipo);
      a.setAttribute("aria-label", r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1));
      if (isExternal(href)) { a.target = "_blank"; a.rel = "noopener"; }
      socials.appendChild(a);
    });
    if (!socials.children.length) socials.remove();

    /* Links */
    var list = document.getElementById("links");
    var now = new Date();
    var items = [];
    links.forEach(function (it) {
      if (it.tipo === "secao") { items.push(it); return; }
      if (!inWindow(it, now)) return;
      var href = destino(it);
      if (!href) return; // WhatsApp sem filial cadastrada
      items.push(Object.assign({}, it, { href: href }));
    });

    // não mostra um título de seção se não sobrar nenhum link nela
    items = items.filter(function (it, idx) {
      if (it.tipo !== "secao") return true;
      var next = items[idx + 1];
      return next && next.tipo !== "secao";
    });

    items.forEach(function (it, i) {
      var li = document.createElement("li");
      li.style.setProperty("--i", i);

      if (it.tipo === "secao") {
        li.className = "section";
        li.setAttribute("role", "presentation");
        li.textContent = it.titulo;
        list.appendChild(li);
        return;
      }

      if (it.destaque) li.className = "is-featured";
      li.innerHTML =
        '<a class="tag' + (it.destaque ? " tag--featured" : "") + '" href="' + esc(it.href) + '" data-id="' + esc(it.id) + '"' +
        (it.href === "#filiais" ? ' data-filiais data-msg="' + esc(it.whatsapp_mensagem) + '"' : "") +
        (it.href === "#mapas" ? " data-mapas" : "") +
        (isExternal(it.href) ? ' target="_blank" rel="noopener"' : "") + ">" +
        '<span class="tag__icon">' + ICONS.svg(it.icone) + "</span>" +
        '<span class="tag__text">' +
          '<span class="tag__title">' + esc(it.titulo) +
            (it.selo ? '<span class="tag__badge">' + esc(it.selo) + "</span>" : "") +
          "</span>" +
          (it.subtitulo ? '<span class="tag__sub">' + esc(it.subtitulo) + "</span>" : "") +
        "</span>" + ARROW + "</a>";
      list.appendChild(li);
    });

    // contagem de cliques (não atrasa a abertura do link)
    list.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-id]");
      if (a) sb.rpc("registrar_clique", { link_id: a.dataset.id }).then(function () {});
    });

    renderStatus();
    setupFiliais();
    setupShare();
    setupEfeitos();
  }

  /* ─── Efeitos: ondulação ao tocar e inclinação 3D no computador ─── */
  function setupEfeitos() {
    var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return;

    document.getElementById("links").addEventListener("pointerdown", function (e) {
      var a = e.target.closest("a.tag");
      if (!a) return;
      var r = a.getBoundingClientRect();
      var tam = Math.max(r.width, r.height) * 1.6;
      var s = document.createElement("span");
      s.className = "ripple";
      s.style.width = s.style.height = tam + "px";
      s.style.left = (e.clientX - r.left - tam / 2) + "px";
      s.style.top = (e.clientY - r.top - tam / 2) + "px";
      a.appendChild(s);
      setTimeout(function () { s.remove(); }, 650);
    });

    // só com mouse (no toque não faz sentido)
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var rack = document.querySelector(".rack");
    var alvo = { x: 0, y: 0 }, atual = { x: 0, y: 0 }, raf = null;
    function anima() {
      atual.x += (alvo.x - atual.x) * .16;
      atual.y += (alvo.y - atual.y) * .16;
      rack.style.transform = "perspective(1100px) rotateX(" + atual.x.toFixed(2) + "deg) rotateY(" + atual.y.toFixed(2) + "deg)";
      raf = (Math.abs(alvo.x - atual.x) > .01 || Math.abs(alvo.y - atual.y) > .01) ? requestAnimationFrame(anima) : null;
    }
    document.addEventListener("pointermove", function (e) {
      var r = rack.getBoundingClientRect();
      var px = (e.clientX - (r.left + r.width / 2)) / r.width;
      var py = (e.clientY - (r.top + r.height / 2)) / r.height;
      alvo.y = px * 2.2;
      alvo.x = -py * 1.6;
      if (!raf) raf = requestAnimationFrame(anima);
    });
    document.addEventListener("pointerleave", function () { alvo.x = alvo.y = 0; if (!raf) raf = requestAnimationFrame(anima); });
  }

  /* ─── Horário de atendimento ─── */

  // Hora atual nas lojas (Cuiabá, UTC−4), não importa onde o visitante esteja.
  var FUSO = "America/Cuiaba";
  function agoraNaLoja() {
    var partes = new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO, hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date());
    var v = {};
    partes.forEach(function (p) { v[p.type] = p.value; });
    var dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v.weekday);
    return { dia: dia < 0 ? new Date().getDay() : dia, mins: (+v.hour % 24) * 60 + +v.minute };
  }

  // Um dia salvo é [abre, fecha] ou [abre, fecha, almocoInicio, almocoFim]
  function renderStatus() {
    var h = conf.horario;
    var el = document.getElementById("status");
    if (!h || !Object.keys(h).some(function (k) { return h[k]; })) return;

    var agora = agoraNaLoja();
    var mins = agora.mins;
    var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

    function toMin(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }
    function fmt(t) { var p = t.split(":"); return +p[0] + "h" + (p[1] !== "00" ? p[1] : ""); }

    var hoje = h[agora.dia];
    var almoco = hoje && hoje[2] && hoje[3] ? [toMin(hoje[2]), toMin(hoje[3])] : null;
    var texto = "";

    if (hoje && mins >= toMin(hoje[0]) && mins < toMin(hoje[1])) {
      if (almoco && mins >= almoco[0] && mins < almoco[1]) {
        texto = "Pausa para o almoço · volta às " + fmt(hoje[3]);
      } else if (almoco && mins < almoco[0]) {
        texto = "Atendendo agora · pausa às " + fmt(hoje[2]);
        el.classList.add("is-open");
      } else {
        texto = "Atendendo agora · até " + fmt(hoje[1]);
        el.classList.add("is-open");
      }
    } else {
      var msg = "";
      if (hoje && mins < toMin(hoje[0])) {
        msg = "Abre hoje às " + fmt(hoje[0]);
      } else {
        for (var k = 1; k <= 7; k++) {
          var dia = (agora.dia + k) % 7;
          if (h[dia]) {
            msg = "Volta " + (k === 1 ? "amanhã" : DIAS[dia]) + " às " + fmt(h[dia][0]);
            break;
          }
        }
      }
      texto = msg ? "Fora do horário · " + msg : "";
    }
    el.textContent = texto;
    el.hidden = !texto;

    // tabela da semana, abre ao tocar no status
    var NOMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    var box = document.getElementById("hours");

    // agrupa dias seguidos com o mesmo horário: "segunda a sexta", "sábado", "domingo"
    var grupos = [];
    for (var d = 1; d <= 7; d++) {
      var dia = d % 7;
      var chave = JSON.stringify(h[dia] || null);
      var ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.chave === chave) ultimo.dias.push(dia);
      else grupos.push({ chave: chave, v: h[dia], dias: [dia] });
    }
    function rotulo(dias) {
      var a = NOMES[dias[0]], b = NOMES[dias[dias.length - 1]];
      var t = dias.length === 1 ? a : dias.length === 2 ? a + " e " + b : a + " a " + b;
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    var linhas = grupos.map(function (g) {
      var v = g.v;
      var cls = (g.dias.indexOf(agora.dia) >= 0 ? "is-today" : "") + (v ? "" : " is-closed");
      var txt = v
        ? fmt(v[0]) + " às " + fmt(v[1]) + (v[2] && v[3] ? '<span class="hours__lunch">almoço ' + fmt(v[2]) + " às " + fmt(v[3]) + "</span>" : "")
        : "fechado";
      return '<div class="' + cls.trim() + '" style="display:contents"><dt>' + rotulo(g.dias) + "</dt><dd>" + txt + "</dd></div>";
    }).join("");
    box.innerHTML = "<dl>" + linhas + "</dl><small>Horário de Cuiabá</small>";
    box.hidden = false;
  }

  /* ─── Folhas (compartilhar / filiais) ─── */
  var lastFocus;
  function openSheet(sheet) {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    sheet.querySelector(".sheet__x").focus();
  }
  function closeSheet(sheet) {
    sheet.hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  function wireSheet(sheet) {
    sheet.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeSheet(sheet);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !sheet.hidden) closeSheet(sheet);
    });
  }

  /* ─── Escolha de filial (quando há mais de um WhatsApp) ─── */
  function setupFiliais() {
    var sheet = document.getElementById("waSheet");
    var box = document.getElementById("branches");
    if (whatsapps.length < 2) return;

    // A mesma folha serve para "falar no WhatsApp" e "como chegar";
    // muda o título, o ícone e para onde cada loja leva.
    function montar(modo, msg) {
      var mapa = modo === "mapas";
      var lojas = mapa ? lojasComEndereco() : whatsapps.filter(function (w) { return digits(w.numero); });
      document.getElementById("waTitle").textContent = mapa ? "Como chegar" : "Falar no WhatsApp";
      document.getElementById("waSub").textContent = mapa ? "Escolha a loja para abrir no mapa" : "Escolha a loja mais perto de você";
      box.innerHTML = lojas.map(function (w) {
        return '<a class="branch" href="' + esc(mapa ? mapaLink(w) : waLink(w, msg)) + '" target="_blank" rel="noopener">' +
          '<span class="branch__icon">' + ICONS.svg(mapa ? "map" : "whatsapp") + "</span>" +
          '<span class="branch__text"><span class="branch__name">' + esc(w.nome || (mapa ? "Loja" : "WhatsApp")) + "</span>" +
            (w.endereco ? '<span class="branch__addr">' + esc(w.endereco) + "</span>" : "") + "</span>" +
          ARROW + "</a>";
      }).join("");
    }

    wireSheet(sheet);
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-filiais], [data-mapas]");
      if (!a) return;
      e.preventDefault();
      montar(a.hasAttribute("data-mapas") ? "mapas" : "filiais", a.dataset.msg || "");
      openSheet(sheet);
    });
  }

  /* ─── Compartilhar ─── */
  function setupShare() {
    var sheet = document.getElementById("sheet");
    var toastEl = document.getElementById("toast");
    var toastTimer;

    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("is-on");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
    }

    wireSheet(sheet);
    document.getElementById("shareBtn").addEventListener("click", function () {
      openSheet(sheet);
      renderQR();
    });

    document.getElementById("shareWa").href =
      "https://wa.me/?text=" + encodeURIComponent((conf.nome || "") + " 💜 " + pageUrl);

    document.getElementById("copyLink").addEventListener("click", function () {
      function done() { toast("Link copiado"); }
      function fallback() {
        var t = document.createElement("textarea");
        t.value = pageUrl;
        t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t);
        t.select();
        try { document.execCommand("copy"); done(); } catch (e) { toast(pageUrl); }
        t.remove();
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(pageUrl).then(done, fallback);
      } else fallback();
    });

    var nativeBtn = document.getElementById("nativeShare");
    if (navigator.share) {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener("click", function () {
        navigator.share({ title: conf.nome, text: conf.bio, url: pageUrl }).catch(function () {});
      });
    }

    document.getElementById("saveContact").addEventListener("click", function () {
      var nome = conf.nome || "Rayane Store";
      var linhas = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + nome, "ORG:" + nome];
      whatsapps.forEach(function (w) {
        linhas.push("TEL;TYPE=CELL" + (w.nome ? ";TYPE=" + w.nome.replace(/[^\w]/g, "") : "") + ":+" + digits(w.numero));
      });
      whatsapps.forEach(function (w) {
        if (w.endereco) linhas.push("ADR;TYPE=WORK:;;" + w.endereco.replace(/[,;]/g, " ") + ";;;;");
      });
      linhas.push("URL:" + pageUrl, "END:VCARD");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([linhas.join("\r\n")], { type: "text/vcard" }));
      a.download = nome.toLowerCase().replace(/\s+/g, "-") + ".vcf";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });

    var qrDone = false;
    function renderQR() {
      if (qrDone) return;
      var box = document.getElementById("qr");
      function draw() {
        var qr = window.qrcode(0, "M");
        qr.addData(pageUrl);
        qr.make();
        var n = qr.getModuleCount();
        var d = "";
        for (var r = 0; r < n; r++) {
          for (var c = 0; c < n; c++) {
            if (qr.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
          }
        }
        box.innerHTML = '<svg viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges"><path fill="#6f1f76" d="' + d + '"/></svg>';
        qrDone = true;
      }
      if (window.qrcode) return draw();
      var s = document.createElement("script");
      s.src = "assets/vendor/qrcode.js";
      s.onload = draw;
      s.onerror = function () { box.textContent = "QR indisponível"; };
      document.head.appendChild(s);
    }
  }
})();
