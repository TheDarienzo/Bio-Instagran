# Rayane Store — página de links

Página de links para a bio do Instagram, no estilo do Linktree, com a identidade da Rayane Store,
e um **painel de administração** para decidir o que aparece nela, sem mexer em código.

- **Página:** https://thedarienzo.github.io/Bio-Instagran/ (`index.html`)
- **Painel:** https://thedarienzo.github.io/Bio-Instagran/admin.html (`admin.html`, com login)

Os dados ficam no Supabase (projeto "Bio Instagran"). A página pública lê de lá; o painel escreve lá.

## O que dá para fazer no painel

| Aba | O que controla |
|---|---|
| **Links** | Criar, editar, apagar e reordenar (arrastando) os botões. Ligar/desligar sem apagar. Cada link vai para um endereço ou para um dos WhatsApps, com mensagem própria se quiser. Botão em destaque, selo ("Novo"), ícone, subtítulo, agendamento (o link aparece só num período). Contagem de cliques. |
| **WhatsApp** | Um número por loja (filial): nome, número, endereço e mensagem que já chega escrita. Com mais de um número ligado, o ícone de WhatsApp da página abre uma lista para o cliente escolher a loja. |
| **Perfil** | Nome, frase da bio, logo (envia uma imagem), endereço da página publicada (usado no QR code). |
| **Redes** | Instagram, TikTok, Facebook, Pinterest, YouTube, e-mail: endereço e ligado/desligado. O WhatsApp usa os números da aba WhatsApp. |
| **Horário** | Dias, horários e pausa de almoço. A página mostra "Atendendo agora", "Pausa para o almoço" ou quando volta, sempre no horário de **Cuiabá** (UTC−4), não importa onde o visitante esteja. |
| **Acessos** | Quem pode entrar no painel: criar acesso (e-mail + senha), redefinir a senha de alguém, remover. Cada pessoa também pode trocar a própria senha. |

No computador, o painel mostra uma prévia da página ao lado, que atualiza a cada salvamento.

## Acesso ao painel

**Não existe cadastro pela tela de entrada.** Só quem já tem acesso cria novos, na aba Acessos.
Quem esquecer a senha pede para alguém com acesso redefinir.

Para fechar de vez a porta de cadastro, no Supabase deixe **desligado** o "Allow new users to sign up"
(Authentication → Sign In / Providers). A criação de acessos pelo painel continua funcionando,
porque passa por uma função no servidor (`supabase/functions/acessos`) que usa a chave de serviço.

## Publicação

O site é publicado pelo GitHub Pages a partir do branch `main` (Settings → Pages).
Cada envio para o `main` atualiza o site em 1–2 minutos.

Depois de publicar, no Supabase, em **Authentication → URL Configuration**, deixe a *Site URL* apontando
para o endereço do painel.

## Segurança

- A chave que fica no site (`supabase-config.js`) é pública por natureza. Quem pode ler ou alterar o quê
  é controlado por regras no próprio banco (RLS): visitantes só leem o que está ativo; só contas
  listadas em `admins` alteram.
- Criar/remover usuários exige a chave de serviço, que fica só na Edge Function `acessos` (servidor)
  e nunca no site. A função confere se quem chama está em `admins` antes de agir.

## Estrutura

```
index.html, styles.css, app.js     página pública
admin.html, admin.css, admin.js    painel
icons.js                           ícones compartilhados
supabase-config.js                 endereço e chave pública do projeto
supabase/functions/acessos/        Edge Function que gerencia acessos (cópia do que está publicado)
assets/logo.png                    logo original com fundo transparente
assets/fonts/                      Fraunces e Jost (licença OFL)
assets/vendor/                     supabase-js (MIT) e qrcode-generator (MIT)
```

### Banco (Supabase)

| Tabela | Conteúdo |
|---|---|
| `configuracoes` | uma linha só: nome, bio, logo, horário, URL |
| `whatsapps` | números por loja: nome, número, endereço, mensagem |
| `redes` | ícones de redes sociais |
| `links` | botões e títulos de seção, com ordem, destino (URL ou WhatsApp), agendamento e cliques |
| `admins` | quem pode editar |

Horário: por dia, `[abre, fecha]` ou `[abre, fecha, almocoInicio, almocoFim]`; `null` = fechado.

Bucket de storage `midia` (público) guarda o logo enviado pelo painel.
