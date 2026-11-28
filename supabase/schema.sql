-- OrçaFechou: banco de dados.
-- Cole TUDO isto no Supabase em "SQL Editor" > "New query" e clique em "Run".
-- Pode rodar de novo sem problema: ele não apaga dados.

-- Dados do profissional (nome, WhatsApp, Pix, logo...)
create table if not exists public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Orçamentos e recibos
create table if not exists public.docs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null default 'orcamento' check (tipo in ('orcamento', 'recibo')),
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists docs_user_idx on public.docs (user_id, criado_em desc);

-- Plano Pro: só o servidor (webhook do pagamento) altera esta tabela.
create table if not exists public.assinaturas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pro_ate timestamptz,
  atualizado_em timestamptz not null default now()
);

-- Pagamentos recebidos (evita liberar o Pro duas vezes pelo mesmo Pix)
create table if not exists public.pagamentos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plano text not null,
  valor numeric(10, 2) not null,
  status text not null,
  criado_em timestamptz not null default now()
);

-- Segurança: cada pessoa só enxerga e mexe no que é dela.
alter table public.perfis enable row level security;
alter table public.docs enable row level security;
alter table public.assinaturas enable row level security;
alter table public.pagamentos enable row level security;

drop policy if exists "perfil proprio" on public.perfis;
create policy "perfil proprio" on public.perfis for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "docs proprios" on public.docs;
create policy "docs proprios" on public.docs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ver minha assinatura" on public.assinaturas;
create policy "ver minha assinatura" on public.assinaturas for select
  using (auth.uid() = user_id);

drop policy if exists "ver meus pagamentos" on public.pagamentos;
create policy "ver meus pagamentos" on public.pagamentos for select
  using (auth.uid() = user_id);

-- Limite do plano grátis: 5 orçamentos por mês (recibos não contam).
create or replace function public.limite_gratis() returns integer
  language sql immutable as $$ select 5 $$;

create or replace function public.eh_pro(uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.assinaturas a where a.user_id = uid and a.pro_ate > now())
$$;

create or replace function public.orcamentos_no_mes(uid uuid) returns integer
  language sql stable security definer set search_path = public as $$
  select count(*)::int from public.docs d
  where d.user_id = uid and d.tipo = 'orcamento'
    and d.criado_em >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
$$;

create or replace function public.checar_limite() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.criado_em := now();
  if new.tipo = 'orcamento' and not public.eh_pro(new.user_id)
     and public.orcamentos_no_mes(new.user_id) >= public.limite_gratis() then
    raise exception 'LIMITE_GRATIS' using hint = 'Assine o Pro para fazer orçamentos ilimitados.';
  end if;
  return new;
end $$;

drop trigger if exists docs_limite on public.docs;
create trigger docs_limite before insert on public.docs
  for each row execute function public.checar_limite();

-- Ao editar, não deixa mudar o dono, o tipo nem a data de criação.
create or replace function public.proteger_doc() returns trigger
  language plpgsql as $$
begin
  new.user_id := old.user_id;
  new.tipo := old.tipo;
  new.criado_em := old.criado_em;
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists docs_proteger on public.docs;
create trigger docs_proteger before update on public.docs
  for each row execute function public.proteger_doc();

-- Resumo da conta para o app: é Pro? até quando? quantos orçamentos usou no mês?
create or replace function public.minha_conta() returns json
  language sql stable security definer set search_path = public as $$
  select json_build_object(
    'pro', public.eh_pro(auth.uid()),
    'pro_ate', (select pro_ate from public.assinaturas where user_id = auth.uid()),
    'usados_mes', public.orcamentos_no_mes(auth.uid()),
    'limite', public.limite_gratis()
  )
$$;

-- Link curto: o cliente abre o orçamento sem login, só com o código do link.
create or replace function public.doc_publico(doc_id text) returns json
  language sql stable security definer set search_path = public as $$
  select json_build_object(
    'doc', d.dados,
    'perfil', coalesce(p.dados, '{}'::jsonb),
    'pro', public.eh_pro(d.user_id)
  )
  from public.docs d
  left join public.perfis p on p.user_id = d.user_id
  where d.id = doc_id
$$;

-- Usado pelo servidor quando um Pix é aprovado.
create or replace function public.liberar_pro(p_pagamento text, p_user uuid, p_plano text, p_valor numeric, p_dias integer)
  returns timestamptz
  language plpgsql security definer set search_path = public as $$
declare novo_fim timestamptz;
begin
  insert into public.pagamentos (id, user_id, plano, valor, status)
    values (p_pagamento, p_user, p_plano, p_valor, 'approved')
    on conflict (id) do nothing;
  if not found then
    select pro_ate into novo_fim from public.assinaturas where user_id = p_user;
    return novo_fim; -- já processado antes
  end if;
  insert into public.assinaturas (user_id, pro_ate)
    values (p_user, now() + make_interval(days => p_dias))
    on conflict (user_id) do update
      set pro_ate = greatest(coalesce(public.assinaturas.pro_ate, now()), now()) + make_interval(days => p_dias),
          atualizado_em = now()
    returning pro_ate into novo_fim;
  return novo_fim;
end $$;

revoke all on function public.liberar_pro(text, uuid, text, numeric, integer) from public, anon, authenticated;
revoke all on function public.eh_pro(uuid) from public, anon, authenticated;
revoke all on function public.orcamentos_no_mes(uuid) from public, anon, authenticated;
grant execute on function public.minha_conta() to authenticated;
grant execute on function public.doc_publico(text) to anon, authenticated;

-- O servidor (chave secreta) precisa poder liberar o Pro.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.liberar_pro(text, uuid, text, numeric, integer) to service_role;
  end if;
end $$;

-- ===================================================================
-- Pagamento MANUAL do Pro (enquanto não há Mercado Pago):
-- o cliente paga no Pix do dono do app, avisa no app, e o dono libera no painel.
-- ===================================================================

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security; -- ninguém lê/escreve direto

create or replace function public.eh_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- Configuração pública: chave Pix e WhatsApp para receber as assinaturas.
create table if not exists public.config (
  id integer primary key default 1 check (id = 1),
  pix_chave text not null default '',
  pix_escolha text not null default '',
  pix_nome text not null default '',
  pix_cidade text not null default '',
  whatsapp text not null default ''
);
insert into public.config (id) values (1) on conflict do nothing;
alter table public.config enable row level security;
drop policy if exists "config publica" on public.config;
create policy "config publica" on public.config for select using (true);
drop policy if exists "admin edita config" on public.config;
create policy "admin edita config" on public.config for update using (public.eh_admin()) with check (public.eh_admin());

-- Pedidos de Pro ("já paguei"), que o dono aprova no painel.
create table if not exists public.pedidos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plano text not null check (plano in ('mensal', 'anual')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  criado_em timestamptz not null default now()
);
create unique index if not exists pedidos_um_pendente on public.pedidos (user_id) where status = 'pendente';
alter table public.pedidos enable row level security;
drop policy if exists "ver meus pedidos" on public.pedidos;
create policy "ver meus pedidos" on public.pedidos for select using (auth.uid() = user_id);
drop policy if exists "criar meu pedido" on public.pedidos;
create policy "criar meu pedido" on public.pedidos for insert
  with check (auth.uid() = user_id and status = 'pendente');

create or replace function public.admin_dar_pro(uid uuid, dias integer) returns timestamptz
  language plpgsql security definer set search_path = public as $$
declare fim timestamptz;
begin
  if not public.eh_admin() then raise exception 'SEM_PERMISSAO'; end if;
  if dias not between 1 and 400 then raise exception 'DIAS_INVALIDOS'; end if;
  fim := public.liberar_pro('manual-' || gen_random_uuid()::text, uid, case when dias >= 365 then 'anual' else 'mensal' end,
                            case when dias >= 365 then 119 else 14.90 end, dias);
  update public.pedidos set status = 'aprovado' where user_id = uid and status = 'pendente';
  return fim;
end $$;

create or replace function public.admin_tirar_pro(uid uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'SEM_PERMISSAO'; end if;
  update public.assinaturas set pro_ate = now(), atualizado_em = now() where user_id = uid;
end $$;

create or replace function public.admin_recusar_pedido(pid bigint) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'SEM_PERMISSAO'; end if;
  update public.pedidos set status = 'recusado' where id = pid;
end $$;

grant execute on function public.eh_admin() to authenticated;
grant execute on function public.admin_dar_pro(uuid, integer) to authenticated;
grant execute on function public.admin_tirar_pro(uuid) to authenticated;
grant execute on function public.admin_recusar_pedido(bigint) to authenticated;
revoke all on function public.admin_dar_pro(uuid, integer) from anon;
revoke all on function public.admin_tirar_pro(uuid) from anon;
revoke all on function public.admin_recusar_pedido(bigint) from anon;

-- Permissões de acesso da API (necessário quando o projeto foi criado sem
-- "Grant API access to new tables automatically"). A segurança de verdade são as regras (RLS) acima.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.perfis, public.docs to authenticated;
grant select on public.assinaturas, public.pagamentos to authenticated;
grant select on public.config to anon, authenticated;
grant update on public.config to authenticated;
grant select, insert on public.pedidos to authenticated;
grant usage, select on all sequences in schema public to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant all on all tables in schema public to service_role;
    grant all on all sequences in schema public to service_role;
  end if;
end $$;

-- ===================================================================
-- Painel do dono (versão 2): mais informações + contador de pedidos.
-- ===================================================================

-- Lista de usuários com telefone, profissão, último acesso, quanto já pagou etc.
drop function if exists public.admin_usuarios(text);
create function public.admin_usuarios(busca text default '')
  returns table (user_id uuid, email text, criado_em timestamptz, pro_ate timestamptz, usados_mes integer,
                 pedido_id bigint, pedido_plano text, pedido_em timestamptz, nome text,
                 telefone text, profissao text, cidade text, ultimo_acesso timestamptz,
                 total_orcamentos integer, total_recibos integer, total_pago numeric, vezes_pagou integer,
                 pedidos_recusados integer)
  language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.eh_admin() then raise exception 'SEM_PERMISSAO'; end if;
  return query
    select u.id, u.email::text, u.created_at, a.pro_ate, public.orcamentos_no_mes(u.id),
           pe.id, pe.plano, pe.criado_em, (p.dados ->> 'nome'),
           (p.dados ->> 'telefone'), (p.dados ->> 'profissao'), (p.dados ->> 'cidade'), u.last_sign_in_at,
           (select count(*)::int from public.docs d where d.user_id = u.id and d.tipo = 'orcamento'),
           (select count(*)::int from public.docs d where d.user_id = u.id and d.tipo = 'recibo'),
           (select coalesce(sum(g.valor), 0) from public.pagamentos g where g.user_id = u.id and g.status = 'approved'),
           (select count(*)::int from public.pagamentos g where g.user_id = u.id and g.status = 'approved'),
           (select count(*)::int from public.pedidos r where r.user_id = u.id and r.status = 'recusado')
    from auth.users u
    left join public.assinaturas a on a.user_id = u.id
    left join public.perfis p on p.user_id = u.id
    left join public.pedidos pe on pe.user_id = u.id and pe.status = 'pendente'
    where coalesce(busca, '') = '' or u.email ilike '%' || busca || '%' or (p.dados ->> 'nome') ilike '%' || busca || '%'
    order by pe.criado_em desc nulls last, u.created_at desc
    limit 200;
end $$;

-- Números do topo do painel (e o pontinho laranja do "Painel").
create or replace function public.admin_resumo() returns json
  language plpgsql stable security definer set search_path = public, auth as $$
declare inicio_mes timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  if not public.eh_admin() then raise exception 'SEM_PERMISSAO'; end if;
  return json_build_object(
    'usuarios', (select count(*) from auth.users),
    'novos_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'pro_ativos', (select count(*) from public.assinaturas where pro_ate > now()),
    'pendentes', (select count(*) from public.pedidos where status = 'pendente'),
    'receita_mes', (select coalesce(sum(valor), 0) from public.pagamentos where status = 'approved' and criado_em >= inicio_mes),
    'receita_total', (select coalesce(sum(valor), 0) from public.pagamentos where status = 'approved')
  );
end $$;

grant execute on function public.admin_usuarios(text) to authenticated;
grant execute on function public.admin_resumo() to authenticated;
revoke all on function public.admin_usuarios(text) from anon;
revoke all on function public.admin_resumo() from anon;

-- Avisa a API do Supabase que as tabelas e funções mudaram.
notify pgrst, 'reload schema';
