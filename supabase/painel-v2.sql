-- OrçaFechou: painel do dono com mais informações + contador de pedidos.
-- Cole TUDO isto no Supabase em "SQL Editor" > "New query" e clique em "Run".
-- Pode rodar de novo sem problema: não apaga nenhum dado.
-- (Também já está incluído no fim do schema.sql.)

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

-- Avisa a API do Supabase que as funções mudaram.
notify pgrst, 'reload schema';
