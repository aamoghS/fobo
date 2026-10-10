-- Native Google sign-in (iOS, Android) signs in to Neon Auth with an ID token, which carries no
-- refresh token. The app also sends Google's one-time server auth code; the API exchanges it and
-- saves the refresh token on the user's Google account row in Neon Auth, where the web sign-in
-- would have put it. Google sync then reads it the same way on every platform.
create function app.save_google_refresh_token(p_user_id text, p_refresh_token text, p_scope text)
returns boolean
language plpgsql security definer set search_path = pg_catalog, pg_temp
as $$
declare updated integer;
begin
  if to_regclass('neon_auth.account') is null then
    return false;
  end if;
  execute
    'update neon_auth.account set "refreshToken" = $2, scope = $3, "updatedAt" = now()
     where "providerId" = ''google'' and "userId"::text = $1'
    using p_user_id, p_refresh_token, p_scope;
  get diagnostics updated = row_count;
  return updated > 0;
end $$;
revoke execute on function app.save_google_refresh_token(text, text, text) from public;
grant execute on function app.save_google_refresh_token(text, text, text) to app_service;
