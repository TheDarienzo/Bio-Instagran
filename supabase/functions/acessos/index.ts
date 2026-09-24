// Gerencia quem pode entrar no painel. Só quem já é admin consegue chamar.
// Usa a chave de serviço (que fica só aqui no servidor) para criar/remover usuários.
// Publicada no Supabase como a Edge Function "acessos" (verify_jwt ligado).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // quem está chamando?
  const auth = req.headers.get("Authorization") ?? "";
  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ erro: "Você precisa estar logado." }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: souAdmin } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!souAdmin) return json({ erro: "Esta conta não tem permissão." }, 403);

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400); }

  const email = (body.email ?? "").trim().toLowerCase();
  const senha = body.senha ?? "";
  const alvo = body.user_id ?? "";

  switch (body.acao) {
    case "listar": {
      const { data, error } = await admin.from("admins").select("user_id, email, criado_em").order("criado_em");
      if (error) return json({ erro: error.message }, 500);
      return json({ acessos: data });
    }

    case "criar": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: "E-mail inválido." }, 400);
      if (senha.length < 6) return json({ erro: "A senha precisa ter pelo menos 6 caracteres." }, 400);
      const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
      if (error) {
        const msg = /already|registered|exists/i.test(error.message) ? "Já existe uma conta com este e-mail." : error.message;
        return json({ erro: msg }, 400);
      }
      const { error: e2 } = await admin.from("admins").insert({ user_id: data.user.id, email });
      if (e2) return json({ erro: e2.message }, 500);
      return json({ ok: true, user_id: data.user.id });
    }

    case "senha": {
      if (!alvo) return json({ erro: "Usuário não informado." }, 400);
      if (senha.length < 6) return json({ erro: "A senha precisa ter pelo menos 6 caracteres." }, 400);
      const { data: ehAdmin } = await admin.from("admins").select("user_id").eq("user_id", alvo).maybeSingle();
      if (!ehAdmin) return json({ erro: "Acesso não encontrado." }, 404);
      const { error } = await admin.auth.admin.updateUserById(alvo, { password: senha });
      if (error) return json({ erro: error.message }, 400);
      return json({ ok: true });
    }

    case "remover": {
      if (!alvo) return json({ erro: "Usuário não informado." }, 400);
      if (alvo === user.id) return json({ erro: "Você não pode remover o seu próprio acesso." }, 400);
      const { count } = await admin.from("admins").select("user_id", { count: "exact", head: true });
      if ((count ?? 0) <= 1) return json({ erro: "Não dá para remover o último acesso." }, 400);
      await admin.from("admins").delete().eq("user_id", alvo);
      const { error } = await admin.auth.admin.deleteUser(alvo);
      if (error) return json({ erro: error.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ erro: "Ação desconhecida." }, 400);
  }
});
