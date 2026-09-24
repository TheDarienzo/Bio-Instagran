// Gestão de acessos do painel do CATÁLOGO (catalogo.rayanestore.com.br).
// Substitui a rota /api/usuarios do antigo Worker da Cloudflare.
//
// O catálogo usa OUTRO projeto Supabase (wxgirkweylomsrwpyymm). Esta função
// valida o token do usuário lá e usa a chave de serviço de lá (segredo
// CATALOGO_SERVICE_KEY) para criar/remover usuários. verify_jwt fica desligado
// porque o token não é deste projeto; a validação é feita aqui dentro.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CATALOGO_URL = "https://wxgirkweylomsrwpyymm.supabase.co";
const CATALOGO_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Z2lya3dleWxvbXNyd3B5eW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDk1ODYsImV4cCI6MjEwMTc4NTU4Nn0.7M1j7C9OpEXg7XaiFUjJoENhopO-o-Ws3uE2BnB6IbQ";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function json(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function usuarioLogado(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const r = await fetch(`${CATALOGO_URL}/auth/v1/user`, { headers: { apikey: CATALOGO_ANON_KEY, Authorization: auth } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch {
    return null;
  }
}

function chamarAdmin(service: string, caminho: string, opcoes: RequestInit = {}) {
  return fetch(`${CATALOGO_URL}/auth/v1/admin/${caminho}`, {
    ...opcoes,
    headers: { apikey: service, Authorization: `Bearer ${service}`, "content-type": "application/json", ...(opcoes.headers || {}) },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const service = Deno.env.get("CATALOGO_SERVICE_KEY");
  if (!service) return json({ erro: "A chave de administrador ainda não foi configurada no servidor." }, 503);

  const eu = await usuarioLogado(req);
  if (!eu) return json({ erro: "Sessão expirada. Entre novamente." }, 401);

  const url = new URL(req.url);

  if (req.method === "GET") {
    const r = await chamarAdmin(service, "users?per_page=200");
    if (!r.ok) return json({ erro: "Não foi possível carregar os acessos." }, 502);
    const dados = await r.json();
    const usuarios = (dados.users || []).map((u: any) => ({
      id: u.id, email: u.email, criadoEm: u.created_at, ultimoAcesso: u.last_sign_in_at, souEu: u.id === eu.id,
    }));
    usuarios.sort((a: any, b: any) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
    return json({ usuarios });
  }

  if (req.method === "POST") {
    let corpo: any;
    try { corpo = await req.json(); } catch { return json({ erro: "Dados inválidos." }, 400); }
    const email = String(corpo.email || "").trim().toLowerCase();
    const senha = String(corpo.senha || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ erro: "Informe um e-mail válido." }, 400);
    if (senha.length < 8) return json({ erro: "A senha precisa ter pelo menos 8 caracteres." }, 400);
    const r = await chamarAdmin(service, "users", { method: "POST", body: JSON.stringify({ email, password: senha, email_confirm: true }) });
    if (!r.ok) {
      const detalhe = await r.text();
      const jaExiste = /already|registered|exists|duplicate/i.test(detalhe);
      return json({ erro: jaExiste ? "Já existe um acesso com esse e-mail." : "Não foi possível criar o acesso. Tente novamente." }, jaExiste ? 409 : 502);
    }
    const novo = await r.json();
    return json({ ok: true, usuario: { id: novo.id, email: novo.email } }, 201);
  }

  if (req.method === "DELETE") {
    const id = url.pathname.split("/").filter(Boolean).pop() || "";
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return json({ erro: "Acesso não encontrado." }, 400);
    if (id === eu.id) return json({ erro: "Você não pode remover o seu próprio acesso." }, 400);
    const lista = await chamarAdmin(service, "users?per_page=200");
    if (lista.ok) {
      const dados = await lista.json();
      if ((dados.users || []).length <= 1) return json({ erro: "É preciso manter pelo menos um acesso." }, 400);
    }
    const r = await chamarAdmin(service, `users/${id}`, { method: "DELETE" });
    if (!r.ok) return json({ erro: "Não foi possível remover o acesso." }, 502);
    return json({ ok: true });
  }

  return json({ erro: "Método não suportado." }, 405);
});
