(function () {
  "use strict";

  var sb = window.supabase.createClient(window.SUPABASE.url, window.SUPABASE.key);
  var ICONS = window.ICONS;
  var $ = function (id) { return document.getElementById(id); };

  var conf = {};
  var links = [];
  var redes = [];
  var editing = null; // link em edição no modal

  var DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  var NOMES_REDES = { instagram: "Instagram", whatsapp: "WhatsApp", tiktok: "TikTok", facebook: "Facebook", pinterest: "Pinterest", youtube: "YouTube", email: "E-mail" };
  var DICAS_REDES = { instagram: "https://instagram.com/seu_usuario", whatsapp: "whatsapp (usa o número do perfil)", tiktok: "https://tiktok.com/@seu_usuario", facebook: "https://facebook.com/sua_pagina", pinterest: "https://pinterest.com/seu_usuario", youtube: "https://youtube.com/@seu_canal", email: "mailto:contato@sualoja.com.br" };

  /* ═══════════ Utilidades ═══════════ */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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
    if (/already registered/i.test(m)) return "Este e-mail já tem conta. Use \"Já tenho conta\".";
    if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar (veja a caixa de entrada).";
    if (/rate limit/i.test(m)) return "Muitas tentativas. Aguarde um minuto.";
    if (/row-level security/i.test(m)) return "Esta conta não tem permissão para editar a página.";
    return m;
  }

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

  /* ═══════════ Entrada / autenticação ═══════════ */

  var gate = $("gate");
  var shell = $("shell");

  function showGate(which) {
    ["loginForm", "signupForm", "forgotForm", "recoverForm"].forEach(function (id) { $(id).hidden = id !== which + "Form"; });
    $("gateMsg").hidden = true;
    gate.hidden = false;
    shell.hidden = true;
  }

  gate.addEventListener("click", function (e) {
    var b = e.target.closest("[data-gate]");
    if (b) showGate(b.dataset.gate);
  });

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

  $("signupForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    $("signupError").textContent = "";
    busy(f.querySelector("button[type=submit]"), true);
    sb.auth.signUp({ email: f.email.value.trim(), password: f.password.value, options: { emailRedirectTo: location.href.split("#")[0] } })
      .then(function (r) {
        if (r.error) throw r.error;
        if (!r.data.session) {
          showGate("login");
          $("gateMsg").textContent = "Conta criada. Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, é só entrar.";
          $("gateMsg").hidden = false;
        }
      })
      .catch(function (err) { $("signupError").textContent = erroMsg(err); })
      .finally(function () { busy(f.querySelector("button[type=submit]"), false); });
  });

  $("forgotForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    $("forgotError").textContent = "";
    busy(f.querySelector("button[type=submit]"), true);
    sb.auth.resetPasswordForEmail(f.email.value.trim(), { redirectTo: location.href.split("#")[0] })
      .then(function (r) {
        if (r.error) throw r.error;
        showGate("login");
        $("gateMsg").textContent = "Se esse e-mail tiver conta, você vai receber um link para criar uma nova senha.";
        $("gateMsg").hidden = false;
      })
      .catch(function (err) { $("forgotError").textContent = erroMsg(err); })
      .finally(function () { busy(f.querySelector("button[type=submit]"), false); });
  });

  $("recoverForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    busy(f.querySelector("button[type=submit]"), true);
    sb.auth.updateUser({ password: f.password.value })
      .then(function (r) {
        if (r.error) throw r.error;
        history.replaceState(null, "", location.pathname);
        toast("Senha atualizada");
        enter();
      })
      .catch(function (err) { $("recoverError").textContent = erroMsg(err); })
      .finally(function () { busy(f.querySelector("button[type=submit]"), false); });
  });

  $("logout").addEventListener("click", function () {
    sb.auth.signOut().then(function () { showGate("login"); });
  });

  var recovering = /type=recovery/.test(location.hash);

  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY" || (recovering && session)) {
      recovering = false;
      showGate("recover");
      return;
    }
    if (session && event !== "INITIAL_SESSION" && shell.hidden && $("recoverForm").hidden) enter();
  });

  sb.auth.getSession().then(function (r) {
    if (r.data.session && !recovering) enter();
    else if (!r.data.session) showGate("login");
  });

  var entered = false;
  function enter() {
    sb.from("admins").select("user_id").maybeSingle().then(function (r) {
      if (!r.data) {
        showGate("login");
        sb.auth.signOut();
        $("loginError").textContent = "Esta conta não tem permissão para editar a página.";
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
  });

  /* ═══════════ Carregar dados ═══════════ */

  function loadAll() {
    Promise.all([
      sb.from("configuracoes").select("*").eq("id", 1).maybeSingle(),
      sb.from("redes").select("*").order("ordem"),
      sb.from("links").select("*").order("ordem"),
    ]).then(function (res) {
      conf = res[0].data || { id: 1, horario: {} };
      redes = res[1].data || [];
      links = res[2].data || [];
      renderLinks();
      fillPerfil();
      renderRedes();
      renderHorario();
    });
  }

  /* ═══════════ Links ═══════════ */

  var linkRows = $("linkRows");

  function renderLinks() {
    linkRows.innerHTML = "";
    $("linksEmpty").hidden = links.length > 0;
    links.forEach(function (l) {
      var li = document.createElement("li");
      li.dataset.id = l.id;
      var now = new Date();
      var pills = "";
      if (l.inicio || l.fim) {
        var ativoAgora = (!l.inicio || now >= new Date(l.inicio)) && (!l.fim || now <= new Date(l.fim));
        pills += '<span class="row__pill' + (ativoAgora ? " is-sched" : "") + '">' +
          (l.inicio ? fmtData(l.inicio) : "…") + " → " + (l.fim ? fmtData(l.fim) : "…") + "</span>";
      }
      if (l.tipo === "secao") {
        li.className = "row row--section" + (l.ativo ? "" : " is-off");
        li.innerHTML =
          '<span class="row__handle" title="Arrastar"><svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg></span>' +
          '<div class="row__body"><span class="row__title">' + esc(l.titulo) + '<span class="row__pill">seção</span></span></div>' +
          '<div class="row__right"><label class="switch"><input type="checkbox" data-toggle' + (l.ativo ? " checked" : "") + '><span></span></label></div>';
      } else {
        li.className = "row" + (l.destaque ? " row--featured" : "") + (l.ativo ? "" : " is-off");
        li.innerHTML =
          '<span class="row__handle" title="Arrastar"><svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg></span>' +
          '<span class="row__icon">' + ICONS.svg(l.icone) + "</span>" +
          '<div class="row__body"><span class="row__title">' + esc(l.titulo) +
            (l.selo ? '<span class="row__badge">' + esc(l.selo) + "</span>" : "") + pills + "</span>" +
            '<span class="row__sub">' + esc(l.subtitulo || l.url || "sem endereço") + "</span></div>" +
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

  sortable(linkRows, function () {
    var ids = Array.prototype.map.call(linkRows.children, function (li) { return li.dataset.id; });
    links.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
    Promise.all(links.map(function (l, i) {
      l.ordem = i;
      return sb.from("links").update({ ordem: i }).eq("id", l.id);
    })).then(function () { toast("Ordem salva"); refreshPreview(); });
  });

  $("addLink").addEventListener("click", function () { openEditor(null, "link"); });
  $("addSection").addEventListener("click", function () { openEditor(null, "secao"); });

  /* ─── Editor ─── */

  var editor = $("editor");
  var linkForm = $("linkForm");

  // grade de ícones
  $("iconGrid").innerHTML = ICONS.lista.map(function (n) {
    return '<label title="' + n + '"><input type="radio" name="icone" value="' + n + '">' + ICONS.svg(n) + "</label>";
  }).join("");

  function syncTipo() {
    var isLink = linkForm.tipo.value === "link";
    linkForm.querySelector("[data-only=link]").hidden = !isLink;
  }
  linkForm.addEventListener("change", function (e) { if (e.target.name === "tipo") syncTipo(); });

  linkForm.querySelector(".chips").addEventListener("click", function (e) {
    var c = e.target.closest("[data-url]");
    if (!c) return;
    linkForm.url.value = c.dataset.url;
    if (c.dataset.url === "whatsapp:") {
      linkForm.url.value = "whatsapp:Oi! Queria saber sobre ";
      linkForm.url.focus();
      linkForm.url.setSelectionRange(linkForm.url.value.length, linkForm.url.value.length);
    }
    linkForm.icone.value = "whatsapp";
  });

  function openEditor(link, tipo) {
    editing = link;
    linkForm.reset();
    $("linkError").textContent = "";
    $("editorTitle").textContent = link ? "Editar" : (tipo === "secao" ? "Nova seção" : "Novo link");
    $("deleteLink").hidden = !link;
    $("linkStat").textContent = link && link.tipo === "link" ? link.cliques + " cliques até agora" : "";

    linkForm.tipo.value = link ? link.tipo : tipo;
    linkForm.titulo.value = link ? link.titulo : "";
    linkForm.subtitulo.value = link ? link.subtitulo : "";
    linkForm.url.value = link ? link.url : "";
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
  function closeEditor() { editor.hidden = true; editing = null; }

  editor.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeEditor(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !editor.hidden) closeEditor(); });

  linkForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var isLink = linkForm.tipo.value === "link";
    var dados = {
      tipo: linkForm.tipo.value,
      titulo: linkForm.titulo.value.trim(),
      subtitulo: isLink ? linkForm.subtitulo.value.trim() : "",
      url: isLink ? linkForm.url.value.trim() : "",
      icone: isLink ? linkForm.icone.value : "",
      destaque: isLink && linkForm.destaque.checked,
      selo: isLink ? linkForm.selo.value.trim() : "",
      inicio: isLink ? fromLocalInput(linkForm.inicio.value) : null,
      fim: isLink ? fromLocalInput(linkForm.fim.value) : null,
    };
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
      closeEditor();
      toast("Salvo");
      refreshPreview();
    }).catch(function (err) { $("linkError").textContent = erroMsg(err); })
      .finally(function () { busy(btn, false); });
  });

  $("deleteLink").addEventListener("click", function () {
    if (!editing || !confirm('Apagar "' + editing.titulo + '"? Isso não tem volta.')) return;
    sb.from("links").delete().eq("id", editing.id).then(function (r) {
      if (r.error) return toast(erroMsg(r.error), true);
      links = links.filter(function (x) { return x.id !== editing.id; });
      renderLinks();
      closeEditor();
      toast("Apagado");
      refreshPreview();
    });
  });

  /* ═══════════ Perfil ═══════════ */

  var perfilForm = $("perfilForm");
  var novoLogo = null; // File escolhido, enviado ao salvar
  var limparLogo = false;

  function fillPerfil() {
    perfilForm.nome.value = conf.nome || "";
    perfilForm.bio.value = conf.bio || "";
    perfilForm.whatsapp_numero.value = conf.whatsapp_numero || "";
    perfilForm.whatsapp_mensagem.value = conf.whatsapp_mensagem || "";
    perfilForm.url.value = conf.url || "";
    $("logoPreview").src = conf.logo_url || "assets/logo.png";
    $("logoReset").hidden = !conf.logo_url;
    updateCounter();
  }

  function updateCounter() {
    var c = perfilForm.querySelector(".counter");
    c.textContent = perfilForm.bio.value.length + " / 160";
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
      whatsapp_numero: perfilForm.whatsapp_numero.value.replace(/\D/g, ""),
      whatsapp_mensagem: perfilForm.whatsapp_mensagem.value.trim(),
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
    // garante uma linha para cada rede conhecida, mantendo a ordem salva
    var mapa = {};
    redes.forEach(function (r) { mapa[r.tipo] = r; });
    var ordem = redes.map(function (r) { return r.tipo; });
    ICONS.redes.forEach(function (t) { if (!mapa[t]) { mapa[t] = { tipo: t, url: "", ativo: false }; ordem.push(t); } });

    redeRows.innerHTML = ordem.map(function (t) {
      var r = mapa[t];
      return '<li class="row' + (r.ativo ? "" : " is-off") + '" data-tipo="' + t + '"' + (r.id ? ' data-id="' + r.id + '"' : "") + ">" +
        '<span class="row__icon">' + ICONS.svg(t) + "</span>" +
        '<label><div><div class="rede__name">' + NOMES_REDES[t] + "</div>" +
          '<input type="text" name="url" value="' + esc(r.url) + '" placeholder="' + esc(DICAS_REDES[t]) + '"></div></label>' +
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
      var url = li.querySelector("[name=url]").value.trim();
      if (li.dataset.tipo === "whatsapp" && !url) url = "whatsapp";
      var row = { tipo: li.dataset.tipo, url: url, ativo: li.querySelector("[name=ativo]").checked, ordem: i };
      if (li.dataset.id) row.id = li.dataset.id;
      return row;
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

  function renderHorario() {
    var h = conf.horario || {};
    diaRows.innerHTML = DIAS.map(function (nome, d) {
      var v = h[d];
      return '<li class="row" data-dia="' + d + '">' +
        '<label class="switch"><input type="checkbox" name="aberto"' + (v ? " checked" : "") + '><span></span></label>' +
        '<span class="dia__name">' + nome + "</span>" +
        '<span class="dia__times">das <input type="time" name="de" value="' + (v ? v[0] : "09:00") + '"' + (v ? "" : " disabled") + "> às " +
          '<input type="time" name="ate" value="' + (v ? v[1] : "18:00") + '"' + (v ? "" : " disabled") + "></span></li>";
    }).join("");
  }

  diaRows.addEventListener("change", function (e) {
    if (e.target.name !== "aberto") return;
    var li = e.target.closest("li");
    li.querySelectorAll("input[type=time]").forEach(function (i) { i.disabled = !e.target.checked; });
  });

  $("horarioForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = e.target.querySelector("button[type=submit]");
    var h = {};
    var erro = "";
    Array.prototype.forEach.call(diaRows.children, function (li) {
      var d = li.dataset.dia;
      if (!li.querySelector("[name=aberto]").checked) { h[d] = null; return; }
      var de = li.querySelector("[name=de]").value, ate = li.querySelector("[name=ate]").value;
      if (!de || !ate || de >= ate) erro = "Confira o horário de " + DIAS[d].toLowerCase() + ": o início precisa vir antes do fim.";
      h[d] = [de, ate];
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
})();
