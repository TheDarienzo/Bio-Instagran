/* Cliente mínimo do Supabase para a página pública (substitui a biblioteca de 216 KB).
   Só o que a página usa: chamar uma função (rpc) e inserir uma linha. */
(function () {
  "use strict";
  var cfg = window.SUPABASE;
  var base = cfg.url.replace(/\/$/, "") + "/rest/v1/";
  var headers = {
    apikey: cfg.key,
    Authorization: "Bearer " + cfg.key,
    "Content-Type": "application/json",
  };

  function chamar(caminho, opcoes) {
    return fetch(base + caminho, Object.assign({ headers: headers }, opcoes)).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.status === 204 || r.status === 201 ? null : r.json();
    });
  }

  window.API = {
    rpc: function (nome, args) {
      return chamar("rpc/" + nome, { method: "POST", body: JSON.stringify(args || {}) });
    },
    inserir: function (tabela, linha) {
      return chamar(tabela, {
        method: "POST",
        headers: Object.assign({ Prefer: "return=minimal" }, headers),
        body: JSON.stringify(linha),
      });
    },
  };
})();
