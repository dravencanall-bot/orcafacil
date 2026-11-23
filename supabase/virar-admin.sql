-- Rode isto UMA vez, depois de criar sua conta no app.
-- Troque o e-mail abaixo pelo e-mail que você usou para criar a conta.
insert into public.admins (user_id)
select id from auth.users where email = 'SEU-EMAIL-AQUI@gmail.com'
on conflict do nothing;

-- Confere: tem que aparecer 1 linha com o seu e-mail.
select u.email from public.admins a join auth.users u on u.id = a.user_id;
