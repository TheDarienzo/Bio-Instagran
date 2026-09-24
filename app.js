(function () {
  "use strict";

  var sb = window.supabase.createClient(window.SUPABASE.url, window.SUPABASE.key, {
    auth: { persistSession: false },
  });
  var ICONS = window.ICONS;
  var ARROW = '<svg class="tag__go" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

  var conf = {};
  var pageUrl = location.href.split("#")[0].split("?")[0];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function waLink(msg) {
    var text = msg == null ? conf.whatsapp_mensagem : msg;
    return "https://wa.me/" + String(conf.whatsapp_numero || "").replace(/\D/g, "") + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  function resolve(url) {
    if (!url) return "";
    if (url === "whatsapp") return waLink();
    if (url.indexOf("whatsapp:") === 0) return waLink(url.slice(9));
    return url;
  }

  function isExternal(url) { return /^https?:/i.test(url); }

  function inWindow(item, now) {
    if (item.inicio && now < new Date(item.inicio)) return false;
    if (item.fim && now > new Date(item.fim)) return false;
    return true;
  }

  /* ─── Carrega tudo ─── */
  Promise.all([
    sb.from("configuracoes").select("*").eq("id", 1).maybeSingle(),
    sb.from("redes").select("*").eq("ativo", true).order("ordem"),
    sb.from("links").select("*").eq("ativo", true).order("ordem"),
  ]).then(function (res) {
    conf = res[0].data || {};
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
      var href = resolve(r.url);
      if (!href) return;
      var a = document.createElement("a");
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
    var items = links.filter(function (it) { return it.tipo === "secao" || inWindow(it, now); });

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

      var href = resolve(it.url) || "#";
      if (it.destaque) li.className = "is-featured";

      li.innerHTML =
        '<a class="tag' + (it.destaque ? " tag--featured" : "") + '" href="' + esc(href) + '" data-id="' + esc(it.id) + '"' +
        (isExternal(href) ? ' target="_blank" rel="noopener"' : "") + ">" +
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
    setupShare();
  }

  /* ─── Horário de atendimento ─── */
  function renderStatus() {
    var h = conf.horario;
    var el = document.getElementById("status");
    if (!h || !Object.keys(h).some(function (k) { return h[k]; })) return;

    var d = new Date();
    var mins = d.getHours() * 60 + d.getMinutes();
    var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

    function toMin(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }
    function fmt(t) { var p = t.split(":"); return +p[0] + "h" + (p[1] !== "00" ? p[1] : ""); }

    var today = h[d.getDay()];
    if (today && mins >= toMin(today[0]) && mins < toMin(today[1])) {
      el.textContent = "Atendendo agora · até " + fmt(today[1]);
      el.classList.add("is-open");
    } else {
      var msg = "";
      if (today && mins < toMin(today[0])) {
        msg = "Abre hoje às " + fmt(today[0]);
      } else {
        for (var k = 1; k <= 7; k++) {
          var day = (d.getDay() + k) % 7;
          if (h[day]) {
            msg = "Volta " + (k === 1 ? "amanhã" : DIAS[day]) + " às " + fmt(h[day][0]);
            break;
          }
        }
      }
      el.textContent = msg ? "Fora do horário · " + msg : "";
    }
    el.hidden = !el.textContent;
  }

  /* ─── Compartilhar ─── */
  function setupShare() {
    var sheet = document.getElementById("sheet");
    var toastEl = document.getElementById("toast");
    var toastTimer;
    var lastFocus;

    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("is-on");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
    }

    function openSheet() {
      lastFocus = document.activeElement;
      sheet.hidden = false;
      renderQR();
      sheet.querySelector(".sheet__x").focus();
    }
    function closeSheet() {
      sheet.hidden = true;
      if (lastFocus) lastFocus.focus();
    }

    document.getElementById("shareBtn").addEventListener("click", openSheet);
    sheet.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeSheet();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !sheet.hidden) closeSheet();
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
      var tel = String(conf.whatsapp_numero || "").replace(/\D/g, "");
      var vcf = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "FN:" + (conf.nome || "Rayane Store"),
        "ORG:" + (conf.nome || "Rayane Store"),
        tel ? "TEL;TYPE=CELL:+" + tel : "",
        "URL:" + pageUrl,
        "END:VCARD",
      ].filter(Boolean).join("\r\n");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([vcf], { type: "text/vcard" }));
      a.download = "rayane-store.vcf";
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
