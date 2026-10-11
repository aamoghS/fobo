// Puts upcoming plans with friends on Google Calendar when they never got there, so the friends get
// their invites. Before 023_service_reads_friendships.sql, looking up friends' addresses failed and
// those plans stayed in Fobo only. Reads DATABASE_URL and the Google keys.
//   node --env-file=.env.local server/scripts/resend-invites.ts --dry   (lists them)
//   node --env-file=.env.local server/scripts/resend-invites.ts         (sends them)
import { createPool } from '../src/db.ts';
import { toGoogle } from '../src/routes/events.ts';

const dry = process.argv.includes('--dry');
const pool = createPool();
try {
  // A save that failed was often tapped again, leaving copies of one plan: each is sent once.
  const { rows } = await pool.query<{ id: string; user_id: string; title: string; starts: string; guests: number }>(`
    select * from (
      select distinct on (user_id, title, time, with_people) id, user_id, title,
             to_char(lower(time), 'YYYY-MM-DD HH24:MI') as starts, cardinality(with_people) as guests
      from events
      where source = 'capacity' and external_id is null and status = 'accepted'
        and cardinality(with_people) > 0 and upper(time) > now()
        and not exists (select 1 from events s where s.user_id = events.user_id and s.title = events.title
                          and s.time = events.time and s.external_id is not null)
      order by user_id, title, time, with_people, id
    ) p order by starts`);
  console.log(`${rows.length} plan(s) with friends not on Google Calendar`);
  for (const p of rows) {
    if (dry) {
      console.log(`  ${p.starts}  ${p.title}  (${p.guests} guest(s))`);
      continue;
    }
    await toGoogle(pool, p.user_id, p.id);
    const sent = (await pool.query('select external_id from events where id = $1', [p.id])).rows[0]?.external_id;
    console.log(`  ${sent ? 'sent   ' : 'skipped'}  ${p.starts}  ${p.title}`);
  }
} finally {
  await pool.end();
}
