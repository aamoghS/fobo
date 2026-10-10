-- The automatic handle was 'user_' + the first 19 characters of the id, so ids sharing those characters
-- collided and the second profile could not be created. It now ends in a hash of the whole id.
create or replace function app.default_handle() returns trigger
language plpgsql
as $$
begin
  if new.handle is null then
    new.handle := 'user_' || left(lower(regexp_replace(new.id, '[^A-Za-z0-9]', '', 'g')), 11)
                  || '_' || left(md5(new.id), 6);
  end if;
  return new;
end $$;
