-- Google sign-in runs through the API (google_accounts); Neon Auth's Google path is no longer used.
drop function app.save_google_refresh_token(text, text, text);
drop function app.google_refresh_token(text);

-- The caller's email, from their Google sign-in.
create or replace function app.my_email() returns text
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$
  select email from public.google_accounts where user_id = app.current_user_id()
$$;
