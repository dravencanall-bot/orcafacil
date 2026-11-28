-- OrçaFechou: recursos do Pro (catálogo de serviços e aviso de "cliente abriu").
-- Cole TUDO isto no Supabase em "SQL Editor" > "New query" e clique em "Run".
-- Pode rodar de novo sem problema: não apaga nenhum dado.
-- (Também já está incluído no fim do schema.sql.)

-- Catálogo de serviços salvos (preços que o profissional usa sempre).
create table if not exists public.catalogos (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  itens jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.catalogos enable row level security;
drop policy if exists "catalogo proprio" on public.catalogos;
create policy "catalogo proprio" on public.catalogos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.catalogos to authenticated;

-- Cada vez que o cliente abre o link do orçamento.
create table if not exists public.aberturas (
  id bigint generated always as identity primary key,
  doc_id text not null references public.docs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  em timestamptz not null default now()
);
create index if not exists aberturas_user_idx on public.aberturas (user_id, em desc);
create index if not exists aberturas_doc_idx on public.aberturas (doc_id, em desc);
alter table public.aberturas enable row level security; -- ninguém lê direto: só pelas funções abaixo

-- Chamado pela página do cliente. Não conta quando o próprio profissional abre,
-- e conta no máximo uma vez a cada 10 minutos por orçamento.
create or replace function public.marcar_aberto(codigo text) returns void
  language plpgsql security definer set search_path = public as $$
declare dono uuid;
begin
  select d.user_id into dono from public.docs d where d.id = codigo;
  if dono is null or dono = auth.uid() then return; end if;
  if exists (select 1 from public.aberturas a where a.doc_id = codigo and a.em > now() - interval '10 minutes') then return; end if;
  insert into public.aberturas (doc_id, user_id) values (codigo, dono);
end $$;

-- Para o app do profissional: quem é Pro vê qual orçamento foi aberto e quando;
-- quem é grátis só fica sabendo que "alguém abriu".
create or replace function public.minhas_aberturas() returns json
  language sql stable security definer set search_path = public as $$
  select case when public.eh_pro(auth.uid()) then
    json_build_object('lista', coalesce((
      select json_agg(json_build_object('doc', x.doc_id, 'vezes', x.vezes, 'primeira', x.primeira, 'ultima', x.ultima))
      from (select a.doc_id, count(*)::int as vezes, min(a.em) as primeira, max(a.em) as ultima
            from public.aberturas a where a.user_id = auth.uid() and a.em > now() - interval '120 days'
            group by a.doc_id) x), '[]'::json))
  else json_build_object('bloqueado', true,
    'total', (select count(distinct a.doc_id) from public.aberturas a where a.user_id = auth.uid() and a.em > now() - interval '30 days'),
    'ultima', (select max(a.em) from public.aberturas a where a.user_id = auth.uid()))
  end
$$;

grant execute on function public.marcar_aberto(text) to anon, authenticated;
grant execute on function public.minhas_aberturas() to authenticated;
revoke all on function public.minhas_aberturas() from anon;

-- Avisa a API do Supabase que as tabelas e funções mudaram.
notify pgrst, 'reload schema';
