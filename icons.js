/* Ícones usados na página pública e no painel. Traço fino, 24x24. */
(function () {
  "use strict";

  var PATHS = {
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
    dress: '<path d="M9 3l3 3 3-3M9 3 7.5 9l1.5 1.5L5 20h14l-4-9.5L16.5 9 15 3"/>',
    shoe: '<path d="M3 15c3-1 5-4 6-7l2.5 1.5c1 .6 2.4.9 3.8 1L21 13v3H3z"/>',
    sparkle: '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM5 3l.5 2L7.5 5.5 5.5 6 5 8l-.5-2L2.5 5.5 4.5 5z"/>',
    percent: '<path d="M6 18 18 6"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
    phone: '<path d="M6.5 3h3l1.5 4.5L9 9a11 11 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5a2 2 0 0 1 2-2z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };

  var WHATSAPP = '<path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zM12 .2A11.8 11.8 0 0 0 1.8 17.8L.2 23.8l6.1-1.6A11.8 11.8 0 1 0 12 .2z"/>';

  // Ordem em que aparecem no seletor do painel
  var LISTA = [
    "whatsapp", "instagram", "tiktok", "facebook", "pinterest", "youtube", "email", "phone",
    "bag", "tag", "dress", "shoe", "sparkle", "percent", "gift", "star", "heart",
    "truck", "ruler", "card", "map", "globe", "link",
  ];

  var REDES = ["instagram", "whatsapp", "tiktok", "facebook", "pinterest", "youtube", "email"];

  function svg(name, cls) {
    var c = cls ? ' class="' + cls + '"' : "";
    if (name === "whatsapp") {
      return '<svg viewBox="0 0 24 24" class="fill' + (cls ? " " + cls : "") + '" aria-hidden="true">' + WHATSAPP + "</svg>";
    }
    return '<svg viewBox="0 0 24 24"' + c + ' aria-hidden="true">' + (PATHS[name] || PATHS.heart) + "</svg>";
  }

  window.ICONS = { svg: svg, lista: LISTA, redes: REDES, existe: function (n) { return n === "whatsapp" || !!PATHS[n]; } };
})();
