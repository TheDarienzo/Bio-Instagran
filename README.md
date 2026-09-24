# Rayane Store — página de links

Página de links para a bio do Instagram, no estilo do Linktree, com a identidade da Rayane Store.
Os links aparecem como etiquetas de roupa penduradas numa arara, e o logo "balança" como um cabide ao abrir a página.

## O que tem (recursos trazidos do Linktree)

| Recurso | Como funciona aqui |
|---|---|
| Logo, nome e bio | Topo da página (`perfil` no `config.js`) |
| Ícones das redes sociais | Instagram, WhatsApp, TikTok, Facebook, Pinterest, YouTube, e-mail (`redes`) |
| Botões de link com ícone e subtítulo | `links` |
| Link em destaque (com animação) | `destaque: true` |
| Selo "Novo" / "Promo" | `selo: "Novo"` |
| Títulos de seção | `{ secao: "Título" }` |
| Links agendados | `inicio` / `fim` — o link aparece e some sozinho |
| WhatsApp com mensagem pronta | `url: "whatsapp"` ou `url: "whatsapp:Sua mensagem"` |
| Compartilhar a página | Botão no canto: QR code, copiar link, enviar no WhatsApp, compartilhar do celular |
| Salvar contato | Baixa o contato da loja (vCard) direto na agenda |
| Horário de atendimento | Mostra "Atendendo agora" ou quando volta (`horario`) |

## Como editar

Tudo fica em **`config.js`**. Troque:

1. `whatsapp.numero` — seu número com DDI e DDD, só dígitos (ex.: `5571999998888`).
2. Os endereços do Instagram (`https://instagram.com/seu_usuario`).
3. `perfil.url` — o endereço final da página, depois de publicada (usado no QR code).
4. Os links que quiser em `links` (os que estão lá são exemplos; `"#"` = ainda sem endereço).

## Como publicar (grátis, com GitHub Pages)

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em *Source*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
3. Em 1–2 minutos a página fica no ar em `https://<seu-usuario>.github.io/Bio-Instagran/`.
4. Coloque esse endereço no campo **Site** da bio do Instagram.

Para testar no computador, basta abrir o `index.html` no navegador.

## Arquivos

- `index.html` — estrutura da página
- `styles.css` — visual
- `app.js` — monta os links a partir do `config.js`
- `assets/logo.png` — logo com fundo transparente
- `assets/fonts/` — fontes Fraunces e Jost (licença OFL)
- `assets/vendor/qrcode.js` — gerador de QR code (licença MIT)
