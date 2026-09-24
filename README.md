# Rayane Store — página de links

Página de links para a bio do Instagram, no estilo do Linktree, com a identidade da Rayane Store,
e um **painel de administração** para decidir o que aparece nela, sem mexer em código.

- `index.html` — a página pública (o que vai na bio)
- `admin.html` — o painel, protegido por login

Os dados ficam no Supabase (projeto "Bio Instagran"). A página pública lê de lá; o painel escreve lá.

## O que dá para fazer no painel

| Aba | O que controla |
|---|---|
| **Links** | Criar, editar, apagar e reordenar (arrastando) os botões. Ligar/desligar sem apagar. Botão em destaque, selo ("Novo"), ícone, subtítulo, link para WhatsApp com mensagem pronta, agendamento (o link aparece só num período). Contagem de cliques por link. |
| **Perfil** | Nome, frase da bio, logo (envia uma imagem), número e mensagem do WhatsApp, endereço da página publicada (usado no QR code). |
| **Redes** | Instagram, WhatsApp, TikTok, Facebook, Pinterest, YouTube, e-mail: endereço e ligado/desligado. |
| **Horário** | Dias e horários de atendimento. A página mostra "Atendendo agora" ou quando volta. |

No computador, o painel mostra uma prévia da página ao lado, que atualiza a cada salvamento.

## Primeiro acesso

1. Abra `admin.html`.
2. Clique em **"Primeiro acesso? Criar conta"** e crie sua conta com e-mail e senha.
3. Confirme o e-mail (chega uma mensagem do Supabase) e entre.

**A primeira conta criada vira a administradora.** Contas criadas depois não conseguem editar nada.
Se esquecer a senha, use "Esqueci a senha" na tela de entrada.

## Como publicar (grátis, com GitHub Pages)

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em *Source*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
3. Em 1–2 minutos a página fica no ar em `https://<seu-usuario>.github.io/Bio-Instagran/`
   e o painel em `https://<seu-usuario>.github.io/Bio-Instagran/admin.html`.
4. Coloque o endereço da página no campo **Site** da bio do Instagram, e também no painel, em
   *Perfil → Endereço da página* (para o QR code apontar para o lugar certo).

Depois de publicar, no Supabase, em **Authentication → URL Configuration**, coloque o endereço do
painel em *Site URL* (é para onde os links de confirmação de e-mail e de recuperação de senha levam).

## Segurança

- A chave que fica no site (`supabase-config.js`) é pública por natureza. Quem pode ler ou alterar o
  quê é controlado por regras no próprio banco (RLS): visitantes só leem o que está ativo; só a conta
  administradora altera.
- O painel usa login por e-mail e senha do Supabase Auth.

## Estrutura

```
index.html, styles.css, app.js     página pública
admin.html, admin.css, admin.js    painel
icons.js                           ícones compartilhados
supabase-config.js                 endereço e chave pública do projeto
assets/logo.png                    logo original com fundo transparente
assets/fonts/                      Fraunces e Jost (licença OFL)
assets/vendor/                     supabase-js (MIT) e qrcode-generator (MIT)
```

### Banco (Supabase)

| Tabela | Conteúdo |
|---|---|
| `configuracoes` | uma linha só: nome, bio, logo, WhatsApp, horário, URL |
| `redes` | ícones de redes sociais |
| `links` | botões e títulos de seção, com ordem, agendamento e cliques |
| `admins` | quem pode editar (preenchida automaticamente na primeira conta) |

Bucket de storage `midia` (público) guarda o logo enviado pelo painel.
