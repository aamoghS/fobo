-- Neon Auth: users live in neon_auth."user" (uuid id = JWT sub). Deleting an auth user deletes
-- the profile, which cascades to everything they own. Skipped where Neon Auth is not enabled.
create function app.delete_profile_for_auth_user() returns trigger
language plpgsql security definer set search_path = pg_catalog, pg_temp
as $$
begin
  delete from public.profiles where id = old.id::text;
  return old;
end $$;

do $$
begin
  if to_regclass('neon_auth."user"') is not null then
    create trigger profiles_delete_with_auth_user after delete on neon_auth."user"
      for each row execute function app.delete_profile_for_auth_user();
  end if;
end $$;
