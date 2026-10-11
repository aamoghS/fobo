-- No Outlook: undoes 021_outlook.sql where it ran (a no-op elsewhere). Back to Google as the only
-- calendar provider and one connection per Google account (007_google_sync.sql).
drop table if exists outlook_tokens;
delete from events where source = 'outlook';
delete from calendar_connections where provider = 'outlook';

alter table calendar_connections drop constraint calendar_connections_provider_check;
alter table calendar_connections add constraint calendar_connections_provider_check
  check (provider = 'google');
alter table calendar_connections drop constraint calendar_connections_one_per_account;
alter table calendar_connections add constraint calendar_connections_one_per_account
  unique (user_id, account_email);

alter table events drop constraint events_source_check;
alter table events add constraint events_source_check check (source in ('capacity', 'google'));
