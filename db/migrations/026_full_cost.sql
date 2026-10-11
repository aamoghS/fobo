-- The cost of staying a plan the whole time, kept the first time Plan my exit lowers events.cost, so a
-- later exit is weighed from it instead of from the lowered cost (src/data/plans.ts PlanDetail.fullCost).
-- Null until an exit is set. Grants on events are table level (002_rls.sql), so app_user and app_service
-- reach it under the same row-level security as the rest of the row; friend_blocks and day_scores never
-- return it.
alter table events add column if not exists full_cost numeric(3, 1) check (full_cost between -1 and 10);
