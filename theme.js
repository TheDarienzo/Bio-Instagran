// Aplica o tema do painel antes de desenhar, para não piscar.
// Fica em arquivo separado por causa da política de segurança (CSP) que proíbe script inline.
(function () {
  var pref = "auto";
  try { pref = localStorage.getItem("rs_tema") || "auto"; } catch (e) {}
  var escuro = pref === "dark" || (pref === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", escuro ? "dark" : "light");
  document.documentElement.setAttribute("data-theme-pref", pref);
})();
