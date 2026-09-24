(function () {
  "use strict";

  var cfg = window.RAYANE || {};
  var perfil = cfg.perfil || {};
  var wa = cfg.whatsapp || {};

  var ICONS = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r=".6" fill="currentColor"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.2 4.4 5 4.6"/>',
    facebook: '<path d="M15 3h-2a4 4 0 0 0-4 4v3H7v3.5h2V21h3.5v-7.5H15l.5-3.5h-3V7.5c0-.6.4-1 1-1H15z"/>',
    pinterest: '<circle cx="12" cy="12" r="9"/><path d="M10.5 21l2-8.2M11 13c.5 1 1.4 1.5 2.5 1.5 2.3 0 3.8-2.1 3.8-4.6 0-2.7-2.2-4.6-5.1-4.6-3.3 0-5.2 2.3-5.2 4.8 0 1.1.4 2.1 1.2 2.6"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.3v5.4l4.6-2.7z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    map: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0z"/><circle cx="8" cy="8" r="1.4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.6 5.5 3.6 9S14.5 18.5 12 21c-2.5-2.5-3.6-5.5-3.6-9S9.5 5.5 12 3z"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    heart: '<path d="M12 20s-8-4.8-8-10.4A4.5 4.5 0 0 1 12 6.8a4.5 4.5 0 0 1 8 2.8C20 15.2 12 20 12 20z"/>',
    truck: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.8 4 8.5 4a2 2 0 0 0 0 4M12 8s1.2-4 3.5-4a2 2 0 0 1 0 4"/>',
  };
  var ARROW = '<svg class="tag__go" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

  function icon(name) {
    if (name === "whatsapp") {
      return '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><use href="#i-whatsapp"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.heart) + "</svg>";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function waLink(msg) {
    var text = msg == null ? wa.mensagem : msg;
    return "https://wa.me/" + String(wa.numero || "").replace(/\D/g, "") + (text ? "?text=" + encodeURIComponent(text) : "");
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

  var pageUrl = (perfil.url || location.href.split("#")[0]).trim();

  /* ─── Perfil ─── */
  document.getElementById("bio").textContent = perfil.bio || "";
  document.getElementById("year").textContent = "© " + new Date().getFullYear();
  if (perfil.nome) document.title = perfil.nome;

  /* ─── Redes ─── */
  var socials = document.getElementById("socials");
  (cfg.redes || []).forEach(function (r) {
    var href = resolve(r.url);
    if (!href) return;
    var a = document.createElement("a");
    a.href = href;
    a.innerHTML = icon(r.tipo);
    a.setAttribute("aria-label", r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1));
    if (isExternal(href)) { a.target = "_blank"; a.rel = "noopener"; }
    socials.appendChild(a);
  });
  if (!socials.children.length) socials.remove();

  /* ─── Links ─── */
  var list = document.getElementById("links");
  var now = new Date();
  var i = 0;
  var items = (cfg.links || []).filter(function (it) { return inWindow(it, now); });

  // não mostra um título de seção se não sobrar nenhum link nela
  items = items.filter(function (it, idx) {
    if (!it.secao) return true;
    var next = items[idx + 1];
    return next && !next.secao;
  });

  items.forEach(function (it) {
    var li = document.createElement("li");
    li.style.setProperty("--i", i++);

    if (it.secao) {
      li.className = "section";
      li.setAttribute("role", "presentation");
      li.textContent = it.secao;
      list.appendChild(li);
      return;
    }

    var href = resolve(it.url) || "#";
    if (it.destaque) li.className = "is-featured";

    li.innerHTML =
      '<a class="tag' + (it.destaque ? " tag--featured" : "") + '" href="' + esc(href) + '"' +
      (isExternal(href) ? ' target="_blank" rel="noopener"' : "") + ">" +
      '<span class="tag__icon">' + icon(it.icone) + "</span>" +
      '<span class="tag__text">' +
        '<span class="tag__title">' + esc(it.titulo) +
          (it.selo ? '<span class="tag__badge">' + esc(it.selo) + "</span>" : "") +
        "</span>" +
        (it.subtitulo ? '<span class="tag__sub">' + esc(it.subtitulo) + "</span>" : "") +
      "</span>" + ARROW + "</a>";
    list.appendChild(li);
  });

  /* ─── Horário de atendimento ─── */
  (function () {
    var h = cfg.horario;
    if (!h) return;
    var el = document.getElementById("status");
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
  })();

  /* ─── Compartilhar ─── */
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
    "https://wa.me/?text=" + encodeURIComponent((perfil.nome || "") + " 💜 " + pageUrl);

  document.getElementById("copyLink").addEventListener("click", function () {
    function done() { toast("Link copiado"); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(pageUrl).then(done, fallback);
    } else fallback();
    function fallback() {
      var t = document.createElement("textarea");
      t.value = pageUrl;
      t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast(pageUrl); }
      t.remove();
    }
  });

  var nativeBtn = document.getElementById("nativeShare");
  if (navigator.share) {
    nativeBtn.hidden = false;
    nativeBtn.addEventListener("click", function () {
      navigator.share({ title: perfil.nome, text: perfil.bio, url: pageUrl }).catch(function () {});
    });
  }

  document.getElementById("saveContact").addEventListener("click", function () {
    var tel = String(wa.numero || "").replace(/\D/g, "");
    var vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:" + (perfil.nome || "Rayane Store"),
      "ORG:" + (perfil.nome || "Rayane Store"),
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
})();
