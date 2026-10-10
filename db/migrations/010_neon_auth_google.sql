-- Google Calendar access comes from Neon Auth: when a user signs in with Google (Calendar scope,
-- offline access), Neon Auth keeps the tokens in neon_auth.account. The API reads them through
-- this function as app_service; the separately stored, encrypted tokens are no longer used.
create function app.google_refresh_token(p_user_id text)
returns table (refresh_token text, scope text, email text)
language plpgsql stable security definer set search_path = pg_catalog, pg_temp
as $$
begin
  if to_regclass('neon_auth.account') is null then
    return;
  end if;
  return query execute
    'select a."refreshToken"::text, a.scope::text, u.email::text
     from neon_auth.account a join neon_auth."user" u on u.id = a."userId"
     where a."providerId" = ''google'' and a."userId"::text = $1 and a."refreshToken" is not null
     order by a."updatedAt" desc
     limit 1'
    using p_user_id;
end $$;
revoke execute on function app.google_refresh_token(text) from public;
grant execute on function app.google_refresh_token(text) to app_service;

drop table connection_secrets;
