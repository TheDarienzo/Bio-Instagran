-- ═══════════════════════════════════════════════════════════════
--  Endurecimento de segurança (aplicar no projeto "Bio Instagran")
--  Pode ser colado no SQL Editor do Supabase. É idempotente.
-- ═══════════════════════════════════════════════════════════════

-- ───────── 1. Limites de tamanho (validação no servidor) ─────────
-- Mesmo que alguém pule o painel e chame a API direto, nada gigante entra.
alter table public.links
  drop constraint if exists links_tamanhos,
  add constraint links_tamanhos check (
    length(titulo) <= 80 and length(subtitulo) <= 120 and length(url) <= 2048
    and length(selo) <= 20 and length(icone) <= 30 and length(whatsapp_mensagem) <= 500
  );
alter table public.whatsapps
  drop constraint if exists whatsapps_tamanhos,
  add constraint whatsapps_tamanhos check (
    length(nome) <= 60 and length(numero) <= 20 and numero ~ '^[0-9]*$'
    and length(endereco) <= 160 and length(mensagem) <= 500 and length(mapa_url) <= 2048
  );
alter table public.configuracoes
  drop constraint if exists configuracoes_tamanhos,
  add constraint configuracoes_tamanhos check (
    length(nome) <= 60 and length(bio) <= 200 and length(url) <= 2048
    and (logo_url is null or length(logo_url) <= 2048)
  );
alter table public.redes
  drop constraint if exists redes_tamanhos,
  add constraint redes_tamanhos check (length(tipo) <= 20 and length(url) <= 2048);
alter table public.visitas
  drop constraint if exists visitas_tamanhos,
  add constraint visitas_tamanhos check (
    length(visitante) between 1 and 64 and length(dispositivo) <= 20 and length(sistema) <= 20
    and length(navegador) <= 30 and length(cidade) <= 80 and length(estado) <= 80
    and length(pais) <= 60 and length(origem) <= 20 and length(idioma) <= 10
    and (largura is null or largura between 0 and 10000)
  );

-- ───────── 2. Anti-abuso nas visitas (o único INSERT aberto ao público) ─────────
-- Uma visita por visitante a cada 10 minutos e no máximo 600 visitas por minuto no total.
create or replace function public.visitas_anti_abuso()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.visitas where visitante = new.visitante and criado_em > now() - interval '10 minutes') then
    return null; -- ignora em silêncio, sem erro para o visitante
  end if;
  if (select count(*) from public.visitas where criado_em > now() - interval '1 minute') >= 600 then
    return null;
  end if;
  -- ninguém escolhe a data nem o id
  new.criado_em := now();
  return new;
end $$;
drop trigger if exists visitas_anti_abuso on public.visitas;
create trigger visitas_anti_abuso before insert on public.visitas
  for each row execute function public.visitas_anti_abuso();

-- ───────── 3. Cliques: só em link ativo e com limite por visitante ─────────
create or replace function public.registrar_clique(link_id uuid, visitante text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if visitante is null or length(visitante) > 64 then return; end if;
  if not exists (select 1 from public.links where id = link_id and ativo) then return; end if;
  if (select count(*) from public.cliques c where c.visitante = registrar_clique.visitante and c.criado_em > now() - interval '1 minute') >= 30 then return; end if;
  update public.links set cliques = cliques + 1 where id = link_id;
  insert into public.cliques (link_id, visitante) values (link_id, visitante);
end $$;

-- ───────── 4. Menos dados expostos ao público ─────────
-- O visitante não precisa ver o contador de cliques nem a ordem interna.
revoke select on public.links from anon;
grant select (id, tipo, titulo, subtitulo, url, icone, destaque, selo, inicio, fim, ativo, ordem,
              whatsapp_id, whatsapp_mensagem, whatsapp_todos, mapa) on public.links to anon;
revoke select on public.whatsapps from anon;
grant select (id, nome, numero, endereco, mensagem, mapa_url, ativo, ordem) on public.whatsapps to anon;
revoke select on public.redes from anon;
grant select (id, tipo, url, ativo, ordem) on public.redes to anon;
revoke select on public.configuracoes from anon;
grant select (id, nome, bio, url, logo_url, horario) on public.configuracoes to anon;

-- ───────── 5. Uploads: só imagem, até 2 MB ─────────
update storage.buckets
  set file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  where id = 'midia';

-- ───────── 6. Funções internas fora da API ─────────
revoke execute on function public.visitas_anti_abuso() from public, anon, authenticated;
