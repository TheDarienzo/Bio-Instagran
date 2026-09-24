(function () {
  "use strict";

  var sb = window.supabase.createClient(window.SUPABASE.url, window.SUPABASE.key);
  var ICONS = window.ICONS;
  var $ = function (id) { return document.getElementById(id); };

  var me = null;    // usuário logado
  var conf = {};
  var links = [];
  var redes = [];
  var whatsapps = [];
  var acessos = [];
  var editing = null;   // link em edição
  var editingWa = null; // whatsapp em edição
  var editingAccess = null; // acesso em edição (redefinir senha)

  var DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  var NOMES_REDES = { instagram: "Instagram", whatsapp: "WhatsApp", tiktok: "TikTok", facebook: "Facebook", pinterest: "Pinterest", youtube: "YouTube", email: "E-mail" };
  var DICAS_REDES = { instagram: "https://instagram.com/seu_usuario", tiktok: "https://tiktok.com/@seu_usuario", facebook: "https://facebook.com/sua_pagina", pinterest: "https://pinterest.com/seu_usuario", youtube: "https://youtube.com/@seu_canal", email: "mailto:contato@sualoja.com.br" };

  /* ═══════════ Utilidades ═══════════ */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function digits(n) { return String(n || "").replace(/\D/g, ""); }

  function novoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function fmtNumero(n) {
    var d = digits(n);
    if (d.length === 13) return "+" + d.slice(0, 2) + " (" + d.slice(2, 4) + ") " + d.slice(4, 9) + "-" + d.slice(9);
    if (d.length === 12) return "+" + d.slice(0, 2) + " (" + d.slice(2, 4) + ") " + d.slice(4, 8) + "-" + d.slice(8);
    return d ? "+" + d : "sem número";
  }

  var toastTimer;
  function toast(msg, isErr) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.toggle("is-err", !!isErr);
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, isErr ? 4000 : 2200);
  }

  function refreshPreview() {
    var f = $("preview");
    if (f && f.contentWindow) { try { f.contentWindow.location.reload(); } catch (e) { f.src = f.src; } }
  }

  // ISO (UTC) → valor para <input type="datetime-local"> no fuso local
  function toLocalInput(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function fromLocalInput(v) { return v ? new Date(v).toISOString() : null; }
  function fmtData(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  function busy(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    if (on) { btn.dataset.txt = btn.textContent; btn.textContent = "Salvando…"; }
    else if (btn.dataset.txt) btn.textContent = btn.dataset.txt;
  }

  function erroMsg(e) {
    var m = (e && e.message) || String(e);
    if (/Invalid login/i.test(m)) return "E-mail ou senha incorretos.";
    if (/Email not confirmed/i.test(m)) return "Este e-mail ainda não foi confirmado.";
    if (/rate limit/i.test(m)) return "Muitas tentativas. Aguarde um minuto.";
    if (/row-level security/i.test(m)) return "Esta conta não tem permissão para editar a página.";
    if (/Failed to fetch|NetworkError/i.test(m)) return "Sem conexão. Verifique a internet e tente de novo.";
    return m;
  }

  // Chama a função do servidor que gerencia acessos
  function acessosApi(body) {
    return sb.functions.invoke("acessos", { body: body }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        if (ctx && typeof ctx.json === "function") {
          return ctx.json().then(function (j) { throw new Error(j.erro || r.error.message); }, function () { throw r.error; });
        }
        throw r.error;
      }
      if (r.data && r.data.erro) throw new Error(r.data.erro);
      return r.data;
    });
  }

  var HANDLE = '<span class="row__handle" title="Arrastar"><svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg></span>';

  /* ═══════════ Ordenação por arrastar ═══════════ */

  function sortable(list, onEnd) {
    var dragging = null;
    list.addEventListener("pointerdown", function (e) {
      var handle = e.target.closest(".row__handle");
      if (!handle) return;
      dragging = handle.closest("li");
      dragging.classList.add("is-dragging");
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    list.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var over = el && el.closest("li");
      if (!over || over === dragging || over.parentNode !== list) return;
      var r = over.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) list.insertBefore(dragging, over);
      else list.insertBefore(dragging, over.nextSibling);
    });
    function stop() {
      if (!dragging) return;
      dragging.classList.remove("is-dragging");
      dragging = null;
      onEnd();
    }
    list.addEventListener("pointerup", stop);
    list.addEventListener("pointercancel", stop);
  }

  function saveOrder(table, arr, listEl) {
    var ids = Array.prototype.map.call(listEl.children, function (li) { return li.dataset.id; });
    arr.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
    return Promise.all(arr.map(function (it, i) {
      it.ordem = i;
      return sb.from(table).update({ ordem: i }).eq("id", it.id);
    })).then(function () { toast("Ordem salva"); refreshPreview(); });
  }

  /* ═══════════ Modais ═══════════ */

  function wireModal(modal, onClose) {
    modal.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) { modal.hidden = true; onClose && onClose(); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) { modal.hidden = true; onClose && onClose(); } });
  }

  /* ═══════════ Entrada / autenticação ═══════════ */

  var gate = $("gate");
  var shell = $("shell");

  function showGate() { gate.hidden = false; shell.hidden = true; }

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    $("loginError").textContent = "";
    busy(f.querySelector("button[type=submit]"), true);
    sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value })
      .then(function (r) { if (r.error) throw r.error; })
      .catch(function (err) { $("loginError").textContent = erroMsg(err); })
      .finally(function () { busy(f.querySelector("button[type=submit]"), false); });
  });

  $("logout").addEventListener("click", function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });

  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_IN" && session && shell.hidden) enter(session);
  });

  sb.auth.getSession().then(function (r) {
    if (r.data.session) enter(r.data.session);
    else showGate();
  });

  var entered = false;
  function enter(session) {
    me = session.user;
    sb.from("admins").select("user_id").eq("user_id", me.id).maybeSingle().then(function (r) {
      if (!r.data) {
        sb.auth.signOut();
        showGate();
        $("loginError").textContent = "Esta conta não tem permissão para entrar no painel.";
        return;
      }
      gate.hidden = true;
      shell.hidden = false;
      if (!entered) { entered = true; loadAll(); }
    });
  }

  /* ═══════════ Navegação ═══════════ */

  $("nav").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]");
    if (!b) return;
    document.querySelectorAll("#nav button").forEach(function (x) { x.classList.toggle("is-active", x === b); });
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("is-active", p.dataset.panel === b.dataset.tab); });
    if (b.dataset.tab === "acessos" && !acessos.length) loadAcessos();
    if (b.dataset.tab === "dash") { dashCache = {}; loadDash(); }
  });

  /* ═══════════ Carregar dados ═══════════ */

  function loadAll() {
    Promise.all([
      sb.from("configuracoes").select("*").eq("id", 1).maybeSingle(),
      sb.from("redes").select("*").order("ordem"),
      sb.from("links").select("*").order("ordem"),
      sb.from("whatsapps").select("*").order("ordem"),
    ]).then(function (res) {
      conf = res[0].data || { id: 1, horario: {} };
      redes = res[1].data || [];
      links = res[2].data || [];
      whatsapps = res[3].data || [];
      renderLinks();
      renderWa();
      fillPerfil();
      renderRedes();
      renderHorario();
      loadDash();
    });
  }

  function waById(id) {
    for (var i = 0; i < whatsapps.length; i++) if (whatsapps[i].id === id) return whatsapps[i];
    return null;
  }

  /* ═══════════ Links ═══════════ */

  var linkRows = $("linkRows");

  function usaWhatsapp(l) {
    return !!(l.whatsapp_todos || l.whatsapp_id || l.url === "whatsapp" || (l.url || "").indexOf("whatsapp:") === 0);
  }

  function descreveDestino(l) {
    if (l.mapa) {
      var comEnd = whatsapps.filter(function (w) { return w.endereco || w.mapa_url; });
      if (!comEnd.length) return "Como chegar · nenhuma loja com endereço";
      return "Como chegar · " + (comEnd.length > 1 ? "o cliente escolhe a loja" : (comEnd[0].nome || comEnd[0].endereco));
    }
    if (usaWhatsapp(l)) {
      if (!whatsapps.length) return "WhatsApp · nenhum número cadastrado";
      if (l.whatsapp_todos) return whatsapps.length > 1 ? "WhatsApp · o cliente escolhe a loja" : "WhatsApp · " + (whatsapps[0].nome || fmtNumero(whatsapps[0].numero));
      var wa = waById(l.whatsapp_id) || whatsapps[0];
      return "WhatsApp · " + (wa.nome || fmtNumero(wa.numero));
    }
    return l.url || "sem endereço";
  }

  function renderLinks() {
    linkRows.innerHTML = "";
    $("linksEmpty").hidden = links.length > 0;
    var now = new Date();
    links.forEach(function (l) {
      var li = document.createElement("li");
      li.dataset.id = l.id;
      var pills = "";
      if (l.inicio || l.fim) {
        var ativoAgora = (!l.inicio || now >= new Date(l.inicio)) && (!l.fim || now <= new Date(l.fim));
        pills += '<span class="row__pill' + (ativoAgora ? " is-sched" : "") + '">' +
          (l.inicio ? fmtData(l.inicio) : "…") + " → " + (l.fim ? fmtData(l.fim) : "…") + "</span>";
      }
      if (l.tipo === "secao") {
        li.className = "row row--section" + (l.ativo ? "" : " is-off");
        li.innerHTML = HANDLE +
          '<div class="row__body"><span class="row__title">' + esc(l.titulo) + '<span class="row__pill">seção</span></span></div>' +
          '<div class="row__right"><label class="switch"><input type="checkbox" data-toggle' + (l.ativo ? " checked" : "") + '><span></span></label></div>';
      } else {
        li.className = "row" + (l.destaque ? " row--featured" : "") + (l.ativo ? "" : " is-off");
        li.innerHTML = HANDLE +
          '<span class="row__icon">' + ICONS.svg(l.icone) + "</span>" +
          '<div class="row__body"><span class="row__title">' + esc(l.titulo) +
            (l.selo ? '<span class="row__badge">' + esc(l.selo) + "</span>" : "") + pills + "</span>" +
            '<span class="row__sub">' + esc(l.subtitulo ? l.subtitulo + " · " + descreveDestino(l) : descreveDestino(l)) + "</span></div>" +
          '<div class="row__right"><span class="row__clicks">' + l.cliques + (l.cliques === 1 ? " clique" : " cliques") + "</span>" +
            '<label class="switch"><input type="checkbox" data-toggle' + (l.ativo ? " checked" : "") + '><span></span></label></div>';
      }
      linkRows.appendChild(li);
    });
  }

  linkRows.addEventListener("change", function (e) {
    if (!e.target.matches("[data-toggle]")) return;
    var li = e.target.closest("li");
    var ativo = e.target.checked;
    li.classList.toggle("is-off", !ativo);
    sb.from("links").update({ ativo: ativo }).eq("id", li.dataset.id).then(function (r) {
      if (r.error) return toast(erroMsg(r.error), true);
      var l = links.find(function (x) { return x.id === li.dataset.id; });
      if (l) l.ativo = ativo;
      toast(ativo ? "Link visível" : "Link escondido");
      refreshPreview();
    });
  });

  linkRows.addEventListener("click", function (e) {
    var body = e.target.closest(".row__body");
    if (!body) return;
    var id = body.closest("li").dataset.id;
    openEditor(links.find(function (x) { return x.id === id; }));
  });

  sortable(linkRows, function () { saveOrder("links", links, linkRows); });

  $("addLink").addEventListener("click", function () { openEditor(null, "link"); });
  $("addSection").addEventListener("click", function () { openEditor(null, "secao"); });

  /* ─── Editor de link ─── */

  var editor = $("editor");
  var linkForm = $("linkForm");

  $("iconGrid").innerHTML = ICONS.lista.map(function (n) {
    return '<label title="' + n + '"><input type="radio" name="icone" value="' + n + '">' + ICONS.svg(n) + "</label>";
  }).join("");

  function syncTipo() {
    var isLink = linkForm.tipo.value === "link";
    linkForm.querySelector("[data-only=link]").hidden = !isLink;
    var dest = linkForm.destino.value;
    linkForm.querySelectorAll("[data-dest]").forEach(function (el) { el.hidden = el.dataset.dest !== dest; });
  }
  linkForm.addEventListener("change", function (e) {
    if (e.target.name === "tipo" || e.target.name === "destino") syncTipo();
    if (e.target.name === "destino" && !editing) {
      if (e.target.value === "whatsapp") linkForm.icone.value = "whatsapp";
      if (e.target.value === "mapa") linkForm.icone.value = "map";
    }
  });

  function fillWaSelect(link) {
    var sel = linkForm.whatsapp_id;
    sel.innerHTML = '<option value="todos">Deixar o cliente escolher a loja (abre a lista)</option>' +
      whatsapps.map(function (w) {
        return '<option value="' + w.id + '"' + (w.ativo ? "" : " disabled") + ">" + esc(w.nome || fmtNumero(w.numero)) + (w.ativo ? "" : " (desligado)") + "</option>";
      }).join("");
    $("waNone").hidden = whatsapps.length > 0;
    sel.value = link && link.whatsapp_id && waById(link.whatsapp_id) ? link.whatsapp_id : "todos";
  }

  function openEditor(link, tipo) {
    editing = link;
    linkForm.reset();
    $("linkError").textContent = "";
    $("editorTitle").textContent = link ? "Editar" : (tipo === "secao" ? "Nova seção" : "Novo link");
    $("deleteLink").hidden = !link;
    $("linkStat").textContent = link && link.tipo === "link" ? link.cliques + " cliques até agora" : "";

    var usaWa = !!(link && usaWhatsapp(link));
    linkForm.tipo.value = link ? link.tipo : tipo;
    linkForm.titulo.value = link ? link.titulo : "";
    linkForm.subtitulo.value = link ? link.subtitulo : "";
    linkForm.destino.value = link && link.mapa ? "mapa" : (usaWa ? "whatsapp" : "url");
    linkForm.url.value = link && !usaWa && !link.mapa ? link.url : "";
    fillWaSelect(link);
    linkForm.whatsapp_mensagem.value = link ? (link.whatsapp_mensagem || ((link.url || "").indexOf("whatsapp:") === 0 ? link.url.slice(9) : "")) : "";
    linkForm.icone.value = link && ICONS.existe(link.icone) ? link.icone : "link";
    linkForm.destaque.checked = !!(link && link.destaque);
    linkForm.selo.value = link ? link.selo : "";
    linkForm.inicio.value = link ? toLocalInput(link.inicio) : "";
    linkForm.fim.value = link ? toLocalInput(link.fim) : "";
    linkForm.querySelector(".sched").open = !!(link && (link.inicio || link.fim));
    syncTipo();

    editor.hidden = false;
    setTimeout(function () { linkForm.titulo.focus(); }, 50);
  }
  wireModal(editor, function () { editing = null; });

  linkForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var isLink = linkForm.tipo.value === "link";
    var usaWa = isLink && linkForm.destino.value === "whatsapp";
    var usaMapa = isLink && linkForm.destino.value === "mapa";
    var dados = {
      tipo: linkForm.tipo.value,
      titulo: linkForm.titulo.value.trim(),
      subtitulo: isLink ? linkForm.subtitulo.value.trim() : "",
      url: isLink && !usaWa && !usaMapa ? linkForm.url.value.trim() : "",
      mapa: usaMapa,
      whatsapp_todos: usaWa && linkForm.whatsapp_id.value === "todos",
      whatsapp_id: usaWa && linkForm.whatsapp_id.value !== "todos" ? (linkForm.whatsapp_id.value || null) : null,
      whatsapp_mensagem: usaWa ? linkForm.whatsapp_mensagem.value.trim() : "",
      icone: isLink ? linkForm.icone.value : "",
      destaque: isLink && linkForm.destaque.checked,
      selo: isLink ? linkForm.selo.value.trim() : "",
      inicio: isLink ? fromLocalInput(linkForm.inicio.value) : null,
      fim: isLink ? fromLocalInput(linkForm.fim.value) : null,
    };
    if (usaWa && !whatsapps.some(function (w) { return digits(w.numero); })) {
      $("linkError").textContent = "Cadastre uma loja com WhatsApp na aba Lojas antes.";
      return;
    }
    if (usaMapa && !whatsapps.some(function (w) { return w.endereco || w.mapa_url; })) {
      $("linkError").textContent = "Cadastre o endereço de pelo menos uma loja na aba Lojas antes.";
      return;
    }
    if (dados.inicio && dados.fim && dados.inicio > dados.fim) {
      $("linkError").textContent = "A data de início precisa vir antes da data final.";
      return;
    }
    var btn = linkForm.querySelector("button[type=submit]");
    busy(btn, true);

    var q = editing
      ? sb.from("links").update(dados).eq("id", editing.id).select().single()
      : sb.from("links").insert(Object.assign(dados, { ordem: links.length })).select().single();

    q.then(function (r) {
      if (r.error) throw r.error;
      if (editing) {
        var i = links.findIndex(function (x) { return x.id === editing.id; });
        links[i] = r.data;
      } else links.push(r.data);
      renderLinks();
      editor.hidden = true; editing = null;
      toast("Salvo");
      refreshPreview();
    }).catch(function (err) { $("linkError").textContent = erroMsg(err); })
      .finally(function () { busy(btn, false); });
  });

  $("deleteLink").addEventListener("click", function () {
    if (!editing || !confirm('Apagar "' + editing.titulo + '"? Isso não tem volta.')) return;
    var alvo = editing;
    sb.from("links").delete().eq("id", alvo.id).then(function (r) {
      if (r.error) return toast(erroMsg(r.error), true);
      links = links.filter(function (x) { return x.id !== alvo.id; });
      renderLinks();
      editor.hidden = true; editing = null;
      toast("Apagado");
      refreshPreview();
    });
  });

  /* ═══════════ WhatsApp (filiais) ═══════════ */

  var waRows = $("waRows");
  var waEditor = $("waEditor");
  var waForm = $("waForm");

  function renderWa() {
    waRows.innerHTML = "";
    $("waEmpty").hidden = whatsapps.length > 0;
    whatsapps.forEach(function (w) {
      var li = document.createElement("li");
      li.dataset.id = w.id;
      li.className = "row" + (w.ativo ? "" : " is-off");
      var partes = [];
      if (digits(w.numero)) partes.push(fmtNumero(w.numero));
      if (w.endereco) partes.push(w.endereco);
      li.innerHTML = HANDLE +
        '<span class="row__icon">' + ICONS.svg(digits(w.numero) ? "whatsapp" : "map") + "</span>" +
        '<div class="row__body"><span class="row__title">' + esc(w.nome || "Sem nome") +
          (!digits(w.numero) ? '<span class="row__pill">sem WhatsApp</span>' : "") +
          (!w.endereco && !w.mapa_url ? '<span class="row__pill">sem endereço</span>' : "") + "</span>" +
          '<span class="row__sub">' + esc(partes.join(" · ") || "preencha WhatsApp ou endereço") + "</span></div>" +
        '<div class="row__right"><label class="switch"><input type="checkbox" data-toggle' + (w.ativo ? " checked" : "") + '><span></span></label></div>';
      waRows.appendChild(li);
    });
    // a lista de números no editor de link e as descrições dos links dependem disso
    renderLinks();
  }

  waRows.addEventListener("change", function (e) {
    if (!e.target.matches("[data-toggle]")) return;
    var li = e.target.closest("li");
    var ativo = e.target.checked;
    li.classList.toggle("is-off", !ativo);
    sb.from("whatsapps").update({ ativo: ativo }).eq("id", li.dataset.id).then(function (r) {
      if (r.error) return toast(erroMsg(r.error), true);
      var w = waById(li.dataset.id);
      if (w) w.ativo = ativo;
      toast(ativo ? "Número ligado" : "Número desligado");
      refreshPreview();
    });
  });

  waRows.addEventListener("click", function (e) {
    var body = e.target.closest(".row__body");
    if (!body) return;
    openWaEditor(waById(body.closest("li").dataset.id));
  });

  sortable(waRows, function () { saveOrder("whatsapps", whatsapps, waRows); });

  $("addWa").addEventListener("click", function () { openWaEditor(null); });

  function openWaEditor(w) {
    editingWa = w;
    waForm.reset();
    $("waError").textContent = "";
    $("waEditorTitle").textContent = w ? "Editar loja" : "Nova loja";
    $("deleteWa").hidden = !w;
    waForm.nome.value = w ? w.nome : "";
    waForm.numero.value = w ? w.numero : "";
    waForm.endereco.value = w ? w.endereco : "";
    waForm.mapa_url.value = w ? w.mapa_url || "" : "";
    waForm.mensagem.value = w ? w.mensagem : "";
    waEditor.hidden = false;
    setTimeout(function () { waForm.nome.focus(); }, 50);
  }
  wireModal(waEditor, function () { editingWa = null; });

  waForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var numero = digits(waForm.numero.value);
    // DDD + número sem o código do país → assume Brasil
    if ((numero.length === 10 || numero.length === 11) && numero.indexOf("55") !== 0) numero = "55" + numero;
    if (numero && numero.length < 12) { $("waError").textContent = "Número incompleto. Use DDD + número, ex.: (65) 99999-0000."; return; }
    var dados = {
      nome: waForm.nome.value.trim(),
      numero: numero,
      endereco: waForm.endereco.value.trim(),
      mapa_url: waForm.mapa_url.value.trim(),
      mensagem: waForm.mensagem.value.trim(),
    };
    if (!numero && !dados.endereco && !dados.mapa_url) { $("waError").textContent = "Informe pelo menos o WhatsApp ou o endereço."; return; }
    var btn = waForm.querySelector("button[type=submit]");
    busy(btn, true);
    var q = editingWa
      ? sb.from("whatsapps").update(dados).eq("id", editingWa.id).select().single()
      : sb.from("whatsapps").insert(Object.assign(dados, { ordem: whatsapps.length })).select().single();
    q.then(function (r) {
      if (r.error) throw r.error;
      if (editingWa) {
        var i = whatsapps.findIndex(function (x) { return x.id === editingWa.id; });
        whatsapps[i] = r.data;
      } else whatsapps.push(r.data);
      renderWa();
      waEditor.hidden = true; editingWa = null;
      toast("Salvo");
      refreshPreview();
    }).catch(function (err) { $("waError").textContent = erroMsg(err); })
      .finally(function () { busy(btn, false); });
  });

  $("deleteWa").addEventListener("click", function () {
    if (!editingWa) return;
    var usados = links.filter(function (l) { return l.whatsapp_id === editingWa.id; }).length;
    var aviso = usados ? "\n\n" + usados + (usados === 1 ? " link aponta" : " links apontam") + " para este número e vão passar a usar o primeiro da lista." : "";
    if (!confirm('Apagar "' + editingWa.nome + '"?' + aviso)) return;
    var alvo = editingWa;
    sb.from("whatsapps").delete().eq("id", alvo.id).then(function (r) {
      if (r.error) return toast(erroMsg(r.error), true);
      whatsapps = whatsapps.filter(function (x) { return x.id !== alvo.id; });
      links.forEach(function (l) { if (l.whatsapp_id === alvo.id) l.whatsapp_id = null; });
      renderWa();
      waEditor.hidden = true; editingWa = null;
      toast("Apagado");
      refreshPreview();
    });
  });

  /* ═══════════ Perfil ═══════════ */

  var perfilForm = $("perfilForm");
  var novoLogo = null;
  var limparLogo = false;

  function fillPerfil() {
    perfilForm.nome.value = conf.nome || "";
    perfilForm.bio.value = conf.bio || "";
    perfilForm.url.value = conf.url || "";
    $("logoPreview").src = conf.logo_url || "assets/logo.png";
    $("logoReset").hidden = !conf.logo_url;
    updateCounter();
  }

  function updateCounter() {
    perfilForm.querySelector(".counter").textContent = perfilForm.bio.value.length + " / 160";
  }
  perfilForm.bio.addEventListener("input", updateCounter);

  $("logoFile").addEventListener("change", function () {
    var f = this.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast("Imagem muito grande (máx. 2 MB)", true); this.value = ""; return; }
    novoLogo = f;
    limparLogo = false;
    $("logoPreview").src = URL.createObjectURL(f);
    $("logoReset").hidden = false;
  });

  $("logoReset").addEventListener("click", function () {
    novoLogo = null;
    limparLogo = true;
    $("logoFile").value = "";
    $("logoPreview").src = "assets/logo.png";
    this.hidden = true;
  });

  perfilForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = perfilForm.querySelector("button[type=submit]");
    busy(btn, true);

    var dados = {
      id: 1,
      nome: perfilForm.nome.value.trim(),
      bio: perfilForm.bio.value.trim(),
      url: perfilForm.url.value.trim(),
      atualizado_em: new Date().toISOString(),
    };

    var upload = Promise.resolve();
    if (novoLogo) {
      var ext = (novoLogo.name.split(".").pop() || "png").toLowerCase();
      var path = "logo-" + Date.now() + "." + ext;
      upload = sb.storage.from("midia").upload(path, novoLogo, { upsert: true, contentType: novoLogo.type })
        .then(function (r) {
          if (r.error) throw r.error;
          dados.logo_url = sb.storage.from("midia").getPublicUrl(path).data.publicUrl;
        });
    } else if (limparLogo) {
      dados.logo_url = null;
    }

    upload
      .then(function () { return sb.from("configuracoes").upsert(dados).select().single(); })
      .then(function (r) {
        if (r.error) throw r.error;
        conf = r.data;
        novoLogo = null; limparLogo = false;
        fillPerfil();
        toast("Perfil salvo");
        refreshPreview();
      })
      .catch(function (err) { toast(erroMsg(err), true); })
      .finally(function () { busy(btn, false); });
  });

  /* ═══════════ Redes ═══════════ */

  var redeRows = $("redeRows");

  function renderRedes() {
    var mapa = {};
    redes.forEach(function (r) { mapa[r.tipo] = r; });
    var ordem = redes.map(function (r) { return r.tipo; });
    ICONS.redes.forEach(function (t) { if (!mapa[t]) { mapa[t] = { tipo: t, url: "", ativo: false }; ordem.push(t); } });

    redeRows.innerHTML = ordem.map(function (t) {
      var r = mapa[t];
      var campo = t === "whatsapp"
        ? '<span class="rede__auto">Usa os WhatsApps da aba Lojas' + (whatsapps.length > 1 ? " (o cliente escolhe a loja)" : "") + "</span>"
        : '<input type="text" name="url" value="' + esc(r.url) + '" placeholder="' + esc(DICAS_REDES[t]) + '">';
      return '<li class="row' + (r.ativo ? "" : " is-off") + '" data-tipo="' + t + '"' + (r.id ? ' data-id="' + r.id + '"' : "") + ">" +
        '<span class="row__icon">' + ICONS.svg(t) + "</span>" +
        '<label><div><div class="rede__name">' + NOMES_REDES[t] + "</div>" + campo + "</div></label>" +
        '<label class="switch"><input type="checkbox" name="ativo"' + (r.ativo ? " checked" : "") + '><span></span></label></li>';
    }).join("");
  }

  redeRows.addEventListener("change", function (e) {
    if (e.target.name !== "ativo") return;
    e.target.closest("li").classList.toggle("is-off", !e.target.checked);
  });

  $("redesForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = e.target.querySelector("button[type=submit]");
    busy(btn, true);
    var linhas = Array.prototype.map.call(redeRows.children, function (li, i) {
      var input = li.querySelector("[name=url]");
      var url = input ? input.value.trim() : "whatsapp";
      // linhas novas (rede ainda sem registro) ganham id aqui, para salvar tudo de uma vez
      return { id: li.dataset.id || novoId(), tipo: li.dataset.tipo, url: url, ativo: li.querySelector("[name=ativo]").checked, ordem: i };
    });
    sb.from("redes").upsert(linhas).select().then(function (r) {
      if (r.error) throw r.error;
      redes = r.data.sort(function (a, b) { return a.ordem - b.ordem; });
      renderRedes();
      toast("Redes salvas");
      refreshPreview();
    }).catch(function (err) { toast(erroMsg(err), true); })
      .finally(function () { busy(btn, false); });
  });

  /* ═══════════ Horário ═══════════ */

  var diaRows = $("diaRows");

  // Um dia salvo é [abre, fecha] ou [abre, fecha, almocoInicio, almocoFim]
  function renderHorario() {
    var h = conf.horario || {};
    diaRows.innerHTML = DIAS.map(function (nome, d) {
      var v = h[d];
      var temAlmoco = !!(v && v[2] && v[3]);
      var dis = v ? "" : " disabled";
      var disAlmoco = v && temAlmoco ? "" : " disabled";
      return '<li class="row row--dia' + (v ? "" : " is-off") + '" data-dia="' + d + '">' +
        '<label class="switch"><input type="checkbox" name="aberto"' + (v ? " checked" : "") + '><span></span></label>' +
        '<span class="dia__name">' + nome + "</span>" +
        '<span class="dia__times">das <input type="time" name="de" value="' + (v ? v[0] : "08:00") + '"' + dis + "> às " +
          '<input type="time" name="ate" value="' + (v ? v[1] : "18:00") + '"' + dis + "></span>" +
        '<span class="dia__lunch">' +
          '<label class="check check--sm"><input type="checkbox" name="temAlmoco"' + (temAlmoco ? " checked" : "") + dis + "><span>almoço</span></label>" +
          'das <input type="time" name="almocoDe" value="' + (temAlmoco ? v[2] : "12:00") + '"' + disAlmoco + "> às " +
          '<input type="time" name="almocoAte" value="' + (temAlmoco ? v[3] : "13:00") + '"' + disAlmoco + ">" +
        "</span></li>";
    }).join("");
  }

  function syncDia(li) {
    var aberto = li.querySelector("[name=aberto]").checked;
    var almoco = li.querySelector("[name=temAlmoco]");
    li.classList.toggle("is-off", !aberto);
    li.querySelector("[name=de]").disabled = !aberto;
    li.querySelector("[name=ate]").disabled = !aberto;
    almoco.disabled = !aberto;
    li.querySelector("[name=almocoDe]").disabled = !(aberto && almoco.checked);
    li.querySelector("[name=almocoAte]").disabled = !(aberto && almoco.checked);
  }

  diaRows.addEventListener("change", function (e) {
    if (e.target.name === "aberto" || e.target.name === "temAlmoco") syncDia(e.target.closest("li"));
  });

  $("horarioForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = e.target.querySelector("button[type=submit]");
    var h = {};
    var erro = "";
    Array.prototype.forEach.call(diaRows.children, function (li) {
      var d = li.dataset.dia;
      var nome = DIAS[d].toLowerCase();
      if (!li.querySelector("[name=aberto]").checked) { h[d] = null; return; }
      var de = li.querySelector("[name=de]").value, ate = li.querySelector("[name=ate]").value;
      if (!de || !ate || de >= ate) erro = "Confira o horário de " + nome + ": o início precisa vir antes do fim.";
      h[d] = [de, ate];
      if (li.querySelector("[name=temAlmoco]").checked) {
        var a1 = li.querySelector("[name=almocoDe]").value, a2 = li.querySelector("[name=almocoAte]").value;
        if (!a1 || !a2 || a1 >= a2) erro = "Confira o almoço de " + nome + ": o início precisa vir antes do fim.";
        else if (a1 < de || a2 > ate) erro = "O almoço de " + nome + " precisa ficar dentro do horário de atendimento.";
        h[d] = [de, ate, a1, a2];
      }
    });
    if (erro) return toast(erro, true);
    busy(btn, true);
    sb.from("configuracoes").upsert({ id: 1, horario: h, atualizado_em: new Date().toISOString() }).select().single()
      .then(function (r) {
        if (r.error) throw r.error;
        conf = r.data;
        toast("Horário salvo");
        refreshPreview();
      }).catch(function (err) { toast(erroMsg(err), true); })
      .finally(function () { busy(btn, false); });
  });

  /* ═══════════ Visão geral (dashboard) ═══════════ */

  var dashCache = {};

  function saudacao() {
    var h = new Date().getHours();
    var s = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    $("dashHello").textContent = s + (conf.nome ? ", " + conf.nome : "");
    $("dashDate").textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    var url = conf.url || location.href.replace(/admin\.html.*$/, "");
    $("dashUrl").textContent = url;
    $("dashOpen").href = url;
  }

  $("dashCopy").addEventListener("click", function () {
    var url = $("dashUrl").textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast("Link copiado"); }, function () { toast(url); });
  });

  $("dashPeriod").addEventListener("change", function () { loadDash(); });

  function fmtNum(n) { return n.toLocaleString("pt-BR"); }
  function pct(a, b) { return b ? Math.round((a - b) / b * 100) : null; }

  function loadDash() {
    saudacao();
    var dias = +document.querySelector("#dashPeriod input:checked").value;
    var agora = new Date();
    var inicio = new Date(agora); inicio.setDate(inicio.getDate() - dias + 1); inicio.setHours(0, 0, 0, 0);
    var anterior = new Date(inicio); anterior.setDate(anterior.getDate() - dias);
    var chave = dias + ":" + inicio.toDateString();

    var p = dashCache[chave] || Promise.all([
      sb.from("visitas").select("visitante,criado_em,dispositivo,sistema,navegador,cidade,estado,pais,origem").gte("criado_em", anterior.toISOString()).order("criado_em").limit(20000),
      sb.from("cliques").select("link_id,criado_em").gte("criado_em", anterior.toISOString()).limit(20000),
    ]);
    dashCache[chave] = p;

    p.then(function (res) {
      var visitas = res[0].data || [], cliques = res[1].data || [];
      var atual = function (r) { return new Date(r.criado_em) >= inicio; };
      var vA = visitas.filter(atual), vP = visitas.filter(function (r) { return !atual(r); });
      var cA = cliques.filter(atual), cP = cliques.filter(function (r) { return !atual(r); });
      var unicos = function (arr) { var s = {}; arr.forEach(function (r) { s[r.visitante] = 1; }); return Object.keys(s).length; };

      $("dashEmpty").hidden = visitas.length > 0 || cliques.length > 0;

      setTile("unicos", fmtNum(unicos(vA)), pct(unicos(vA), unicos(vP)), dias);
      setTile("visitas", fmtNum(vA.length), pct(vA.length, vP.length), dias);
      setTile("cliques", fmtNum(cA.length), pct(cA.length, cP.length), dias);
      document.querySelector('[data-k="taxa"]').textContent = vA.length ? (cA.length / vA.length).toFixed(1).replace(".", ",") : "–";

      renderChart(vA, inicio, dias);
      renderBars("devBars", contar(vA, "dispositivo"), { celular: "Celular", computador: "Computador", tablet: "Tablet" });
      renderBars("srcBars", contar(vA, "origem"), { instagram: "Instagram", whatsapp: "WhatsApp", facebook: "Facebook", tiktok: "TikTok", google: "Google", direto: "Direto (link digitado ou salvo)", "outro site": "Outro site" });
      renderBars("geoBars", contar(vA, function (r) { return r.cidade ? r.cidade + " · " + r.estado : (r.pais ? r.pais : "Não identificado"); }), {}, 8);
      renderBars("uaBars", contar(vA, function (r) { return (r.sistema || "?") + " · " + (r.navegador || "?"); }), {}, 6);

      var porLink = contar(cA, "link_id");
      var nomes = {}; links.forEach(function (l) { nomes[l.id] = l.titulo; });
      renderBars("linkBars", porLink, nomes, 8);
    }).catch(function (err) { toast(erroMsg(err), true); });
  }

  function setTile(k, valor, delta, dias) {
    document.querySelector('[data-k="' + k + '"]').textContent = valor;
    var el = document.querySelector('[data-k="' + k + 'Delta"]');
    el.className = "tile__delta" + (delta > 0 ? " is-up" : delta < 0 ? " is-down" : "");
    el.textContent = delta == null ? "sem base de comparação" : (delta > 0 ? "▲ " : delta < 0 ? "▼ " : "= ") + Math.abs(delta) + "% vs. " + dias + " dias antes";
  }

  function contar(arr, campo) {
    var m = {};
    arr.forEach(function (r) { var k = typeof campo === "function" ? campo(r) : (r[campo] || "?"); m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; });
  }

  function renderBars(id, itens, nomes, max) {
    var box = $(id);
    if (!itens.length) { box.innerHTML = '<p class="empty">Sem dados no período.</p>'; return; }
    var total = itens.reduce(function (s, i) { return s + i.n; }, 0);
    var top = itens.slice(0, max || 6);
    box.innerHTML = top.map(function (i) {
      var p = Math.round(i.n / total * 100);
      return '<div class="bar"><span class="bar__label">' + esc(nomes[i.k] || i.k) + '</span><span class="bar__value">' + fmtNum(i.n) + " · " + p + '%</span>' +
        '<span class="bar__track"><span class="bar__fill" data-w="' + p + '"></span></span></div>';
    }).join("");
    requestAnimationFrame(function () { box.querySelectorAll(".bar__fill").forEach(function (f) { f.style.width = f.dataset.w + "%"; }); });
  }

  // colunas por dia: <=24px de largura, topo arredondado, tooltip ao passar
  function renderChart(visitas, inicio, dias) {
    var porDia = {};
    for (var i = 0; i < dias; i++) { var d = new Date(inicio); d.setDate(d.getDate() + i); porDia[d.toDateString()] = { d: d, n: 0, u: {} }; }
    visitas.forEach(function (v) { var k = new Date(v.criado_em).toDateString(); if (porDia[k]) { porDia[k].n++; porDia[k].u[v.visitante] = 1; } });
    var serie = Object.keys(porDia).map(function (k) { return porDia[k]; });
    var maxN = Math.max(1, Math.max.apply(null, serie.map(function (s) { return s.n; })));
    var teto = maxN <= 5 ? 5 : Math.ceil(maxN / 5) * 5;
    $("chartSub").textContent = fmtNum(visitas.length) + " visitas · pico de " + maxN + " num dia";

    var W = 600, H = 180, L = 28, B = 22, T = 8;
    var slot = (W - L) / dias, bw = Math.min(24, slot * .7);
    var y = function (n) { return T + (H - T - B) * (1 - n / teto); };
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">';
    [0, .5, 1].forEach(function (f) {
      var v = Math.round(teto * f), yy = y(v);
      svg += '<line class="grid" x1="' + L + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '"/><text class="axis" x="' + (L - 6) + '" y="' + (yy + 3) + '" text-anchor="end">' + v + "</text>";
    });
    serie.forEach(function (s, i) {
      var x = L + slot * i + (slot - bw) / 2, top = y(s.n), h = Math.max(0, y(0) - top);
      var r = Math.min(4, bw / 2, h);
      var path = h > 0 ? "M" + x + " " + y(0) + "v-" + (h - r) + "a" + r + " " + r + " 0 0 1 " + r + " -" + r + "h" + (bw - 2 * r) + "a" + r + " " + r + " 0 0 1 " + r + " " + r + "v" + (h - r) + "z" : "";
      svg += '<path class="col" d="' + path + '"/>';
      svg += '<rect class="hit" x="' + (L + slot * i) + '" y="' + T + '" width="' + slot + '" height="' + (H - T) + '" data-i="' + i + '"/>';
      var passo = dias <= 7 ? 1 : dias <= 30 ? 5 : 15;
      if (i % passo === 0 || i === dias - 1) svg += '<text class="axis" x="' + (x + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + s.d.getDate() + "/" + (s.d.getMonth() + 1) + "</text>";
    });
    svg += "</svg>";
    var box = $("chart");
    box.innerHTML = svg;

    var tip = $("chartTip");
    box.onmousemove = function (e) {
      var hit = e.target.closest(".hit");
      if (!hit) { tip.hidden = true; box.querySelectorAll(".col.is-dim").forEach(function (c) { c.classList.remove("is-dim"); }); return; }
      var s = serie[+hit.dataset.i];
      tip.hidden = false;
      tip.innerHTML = "<b>" + s.d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) + "</b> · " + s.n + (s.n === 1 ? " visita" : " visitas") + " · " + Object.keys(s.u).length + " únicos";
      var r = box.getBoundingClientRect(), hr = hit.getBoundingClientRect();
      tip.style.left = (hr.left - r.left + hr.width / 2) + "px";
      tip.style.top = (hr.top - r.top + (hr.height * (1 - s.n / teto)) * ((H - T - B) / (H - T))) + "px";
      box.querySelectorAll(".col").forEach(function (c, i) { c.classList.toggle("is-dim", i !== +hit.dataset.i); });
    };
    box.onmouseleave = function () { tip.hidden = true; box.querySelectorAll(".col.is-dim").forEach(function (c) { c.classList.remove("is-dim"); }); };
  }

  /* ═══════════ Acessos ═══════════ */

  var accessRows = $("accessRows");
  var accessEditor = $("accessEditor");
  var accessForm = $("accessForm");

  function loadAcessos() {
    $("accessLoading").hidden = false;
    $("accessLoading").textContent = "Carregando…";
    acessosApi({ acao: "listar" }).then(function (d) {
      acessos = d.acessos || [];
      renderAcessos();
    }).catch(function (err) {
      $("accessLoading").textContent = "Não foi possível carregar: " + erroMsg(err);
    });
  }

  function renderAcessos() {
    $("accessLoading").hidden = true;
    accessRows.innerHTML = acessos.map(function (a) {
      var souEu = a.user_id === me.id;
      return '<li class="row row--access" data-id="' + a.user_id + '">' +
        '<span class="row__icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/></svg></span>' +
        '<div class="row__body row__body--static"><span class="row__title">' + esc(a.email) + (souEu ? '<span class="row__pill">você</span>' : "") + "</span>" +
          '<span class="row__sub">desde ' + new Date(a.criado_em).toLocaleDateString("pt-BR") + "</span></div>" +
        '<div class="row__right">' +
          (souEu ? "" : '<button type="button" class="linkish" data-reset>Redefinir senha</button>' +
                        '<button type="button" class="linkish danger" data-remove>Remover</button>') +
        "</div></li>";
    }).join("");
  }

  accessRows.addEventListener("click", function (e) {
    var li = e.target.closest("li");
    if (!li) return;
    var a = acessos.find(function (x) { return x.user_id === li.dataset.id; });
    if (e.target.closest("[data-reset]")) openAccessEditor(a);
    if (e.target.closest("[data-remove]")) {
      if (!confirm("Remover o acesso de " + a.email + "? A pessoa não vai mais conseguir entrar.")) return;
      acessosApi({ acao: "remover", user_id: a.user_id }).then(function () {
        acessos = acessos.filter(function (x) { return x.user_id !== a.user_id; });
        renderAcessos();
        toast("Acesso removido");
      }).catch(function (err) { toast(erroMsg(err), true); });
    }
  });

  $("addAccess").addEventListener("click", function () { openAccessEditor(null); });

  function openAccessEditor(a) {
    editingAccess = a;
    accessForm.reset();
    $("accessError").textContent = "";
    $("accessTitle").textContent = a ? "Nova senha para " + a.email : "Novo acesso";
    $("accessHint").hidden = !!a;
    $("accessEmailField").hidden = !!a;
    accessForm.email.required = !a;
    accessEditor.hidden = false;
    setTimeout(function () { (a ? accessForm.senha : accessForm.email).focus(); }, 50);
  }
  wireModal(accessEditor, function () { editingAccess = null; });

  accessForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = accessForm.querySelector("button[type=submit]");
    busy(btn, true);
    var p = editingAccess
      ? acessosApi({ acao: "senha", user_id: editingAccess.user_id, senha: accessForm.senha.value })
      : acessosApi({ acao: "criar", email: accessForm.email.value.trim(), senha: accessForm.senha.value });
    p.then(function () {
      accessEditor.hidden = true;
      toast(editingAccess ? "Senha redefinida" : "Acesso criado");
      editingAccess = null;
      loadAcessos();
    }).catch(function (err) { $("accessError").textContent = erroMsg(err); })
      .finally(function () { busy(btn, false); });
  });

  $("minhaSenhaForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.senha.value !== f.confirma.value) return toast("As senhas não são iguais.", true);
    var btn = f.querySelector("button[type=submit]");
    busy(btn, true);
    sb.auth.updateUser({ password: f.senha.value }).then(function (r) {
      if (r.error) throw r.error;
      f.reset();
      toast("Sua senha foi alterada");
    }).catch(function (err) { toast(erroMsg(err), true); })
      .finally(function () { busy(btn, false); });
  });
})();
