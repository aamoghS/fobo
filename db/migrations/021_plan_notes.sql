-- A plan's own notes ("Additional details" on the plan form). Private to the owner: friend_blocks
-- never returns them.
alter table events add column if not exists notes text;
