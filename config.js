/*
 * ─────────────────────────────────────────────────────────────
 *  RAYANE STORE — configuração da página de links
 *  Edite só este arquivo. Salve e recarregue a página.
 * ─────────────────────────────────────────────────────────────
 *
 *  Ícones disponíveis: whatsapp, instagram, tiktok, facebook,
 *  pinterest, youtube, email, map, bag, tag, globe, star, heart,
 *  truck, ruler, gift
 */
window.RAYANE = {
  perfil: {
    nome: "Rayane Store",
    // Frase curta que aparece embaixo do logo
    bio: "Moda feminina escolhida peça por peça. Enviamos para todo o Brasil.",
    // Endereço onde a página ficará publicada (usado no botão de compartilhar e no QR code)
    url: "",
  },

  // Número com DDI + DDD, só dígitos. Ex.: 5571999998888
  whatsapp: {
    numero: "5500000000000",
    mensagem: "Oi, Rayane! Vim pelo Instagram e quero saber mais sobre as peças 💜",
  },

  // Horário de atendimento — mostra "Atendendo agora" / "Volta às 9h"
  // 0 = domingo … 6 = sábado. Deixe null para dias fechados.
  horario: {
    0: null,
    1: ["09:00", "18:00"],
    2: ["09:00", "18:00"],
    3: ["09:00", "18:00"],
    4: ["09:00", "18:00"],
    5: ["09:00", "18:00"],
    6: ["09:00", "13:00"],
  },

  // Ícones redondos no topo
  redes: [
    { tipo: "instagram", url: "https://instagram.com/rayanestore" },
    { tipo: "whatsapp", url: "whatsapp" }, // "whatsapp" usa o número acima
    { tipo: "tiktok", url: "" },            // vazio = não aparece
    { tipo: "facebook", url: "" },
    { tipo: "email", url: "" },            // ex.: "mailto:contato@rayanestore.com.br"
  ],

  /*
   * Botões principais. Tipos de item:
   *   { secao: "Título" }                        → divide os links em grupos
   *   { titulo, subtitulo, url, icone }          → link normal
   *   destaque: true                             → botão cheio, em evidência
   *   inicio / fim: "2026-10-01T00:00"           → link agendado (só aparece nesse período)
   *   selo: "Novo"                               → etiqueta pequena ao lado
   *   url: "whatsapp"                            → abre o WhatsApp com a mensagem acima
   *   url: "whatsapp:Texto personalizado"        → WhatsApp com outra mensagem
   */
  links: [
    {
      titulo: "Comprar pelo WhatsApp",
      subtitulo: "Atendimento com a Rayane",
      url: "whatsapp",
      icone: "whatsapp",
      destaque: true,
    },
    {
      titulo: "Novidades da semana",
      subtitulo: "Peças que acabaram de chegar",
      url: "https://instagram.com/rayanestore",
      icone: "tag",
      selo: "Novo",
    },
    {
      titulo: "Catálogo completo",
      subtitulo: "Veja tudo com preços",
      url: "#",
      icone: "bag",
    },

    { secao: "Antes de comprar" },
    {
      titulo: "Tabela de medidas",
      url: "#",
      icone: "ruler",
    },
    {
      titulo: "Frete e prazos de entrega",
      url: "whatsapp:Oi! Queria saber o frete para o meu CEP: ",
      icone: "truck",
    },
    {
      titulo: "Clientes que já compraram",
      url: "https://instagram.com/rayanestore",
      icone: "star",
    },

    { secao: "Visite a loja" },
    {
      titulo: "Como chegar",
      subtitulo: "Abrir no mapa",
      url: "https://maps.google.com/?q=Rayane+Store",
      icone: "map",
    },

    // Exemplo de link agendado (some sozinho depois da data):
    {
      titulo: "Promoção de aniversário",
      subtitulo: "Só esta semana",
      url: "#",
      icone: "gift",
      inicio: "2026-11-01T00:00",
      fim: "2026-11-08T23:59",
    },
  ],
};
