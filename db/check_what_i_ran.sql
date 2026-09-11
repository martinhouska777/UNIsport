/*
  WHAT HAVE I RUN, AND WHAT IS LEFT — paste this whole file into the Supabase
  SQL editor and press Run. It only READS; it changes nothing.

  Read the result top to bottom: anything that needs doing is at the top, and
  everything already in place is at the bottom.

  GENERATED FILE — do not edit by hand. It is the same check as
  scripts/check-db.mjs, frozen into one query. Regenerate after changing db/:

      node scripts/check-db.mjs --sql > db/check_what_i_ran.sql

  Covers 184 objects across the migration files in db/.
  Seeds, undo scripts, schema.sql and the *_test.sql files are left out on
  purpose — none of them has to run for the app to work.
*/
with expected (file, kind, name) as (
  values
    ('auth_autoconfirm.sql','function','auto_confirm_email'),
    ('buddy_board.sql','table','buddy_posts'),
    ('buddy_board.sql','function','buddy_next_date'),
    ('buddy_board.sql','function','buddy_focus_activity'),
    ('buddy_board.sql','function','buddy_post_create'),
    ('buddy_board.sql','function','buddy_board_list'),
    ('buddy_board.sql','function','buddy_for_session'),
    ('buddy_board.sql','function','buddy_my_posts'),
    ('buddy_board.sql','function','buddy_post_delete'),
    ('buddy_board.sql','column','buddy_posts.hour'),
    ('buddy_board.sql','column','buddy_posts.post_date'),
    ('events.sql','function','event_km'),
    ('events.sql','function','event_counters'),
    ('events.sql','function','event_house_counters'),
    ('follows.sql','table','follows'),
    ('follows.sql','function','follow_user'),
    ('follows.sql','function','unfollow_user'),
    ('follows.sql','function','follow_status'),
    ('follows.sql','function','my_follow_counts'),
    ('gym_crowd.sql','table','gym_crowd_reports'),
    ('gym_crowd.sql','function','gym_crowd_report'),
    ('gym_crowd.sql','function','gym_crowd_recent'),
    ('leaderboards.sql','function','leaderboard_since'),
    ('leaderboards.sql','function','initials_of'),
    ('leaderboards.sql','function','partner_counts'),
    ('leaderboards.sql','function','leaderboard_session_kinds'),
    ('leaderboards.sql','function','leaderboard_people'),
    ('leaderboards.sql','function','leaderboard_groups'),
    ('leaderboards.sql','function','my_leaderboard_standing'),
    ('leaderboards.sql','column','workout_logs.partner_status'),
    ('log_reminders.sql','table','log_reminders'),
    ('matching.sql','view','match_profiles'),
    ('matching.sql','function','match_region'),
    ('matching.sql','function','pref_allows'),
    ('matching.sql','function','block_range'),
    ('matching.sql','function','match_candidates'),
    ('matching.sql','function','match_browse'),
    ('matching.sql','function','match_session_search'),
    ('matching.sql','function','match_pair'),
    ('messages.sql','table','dm_conversations'),
    ('messages.sql','table','dm_messages'),
    ('messages.sql','table','dm_reads'),
    ('messages.sql','table','channels'),
    ('messages.sql','table','channel_messages'),
    ('messages.sql','table','channel_reads'),
    ('messages.sql','table','channel_members'),
    ('messages.sql','function','dm_start'),
    ('messages.sql','function','dm_list'),
    ('messages.sql','function','dm_thread'),
    ('messages.sql','function','dm_send'),
    ('messages.sql','function','channel_list'),
    ('messages.sql','function','channel_join'),
    ('messages.sql','function','channel_leave'),
    ('messages.sql','function','channel_thread'),
    ('messages.sql','function','channel_send'),
    ('messages.sql','function','dm_peer_read'),
    ('messages.sql','function','unread_total'),
    ('messages.sql','column','channel_messages.sender_class_year'),
    ('partner_requests.sql','function','partner_requests_for_me'),
    ('partner_requests.sql','function','partner_request_respond'),
    ('partner_requests.sql','function','partner_push_targets'),
    ('partner_requests.sql','column','workout_logs.partner_status'),
    ('partner_requests.sql','column','workout_logs.mirror_of'),
    ('patch_announced.sql','column','varsity_lineups.announced'),
    ('patch_announced.sql','column','varsity_plan_blocks.announced'),
    ('patch_session_search_any_activity.sql','function','match_session_search'),
    ('profiles.sql','table','profiles'),
    ('profiles.sql','policy','public.profiles::Profiles are viewable by their owner'),
    ('profiles.sql','policy','public.profiles::Users can insert their own profile'),
    ('profiles.sql','policy','public.profiles::Users can update their own profile'),
    ('public_profile.sql','function','get_public_profile'),
    ('push_notify.sql','function','dm_push_targets'),
    ('push_notify.sql','function','my_display_name'),
    ('push_notify.sql','function','push_forget'),
    ('push_notify.sql','function','follow_push_targets'),
    ('push_subscriptions.sql','table','push_subscriptions'),
    ('push_subscriptions.sql','policy','public.push_subscriptions::Own push subscriptions readable'),
    ('push_subscriptions.sql','policy','public.push_subscriptions::Own push subscriptions insertable'),
    ('push_subscriptions.sql','policy','public.push_subscriptions::Own push subscriptions updatable'),
    ('push_subscriptions.sql','policy','public.push_subscriptions::Own push subscriptions deletable'),
    ('session_plans.sql','table','session_plans'),
    ('session_plans.sql','function','dm_thread'),
    ('session_plans.sql','function','plan_create'),
    ('session_plans.sql','function','plan_respond'),
    ('session_plans.sql','function','plan_confirm'),
    ('session_plans.sql','function','my_upcoming_plans'),
    ('session_plans.sql','function','plan_cancel'),
    ('session_plans.sql','function','plan_reschedule'),
    ('session_plans.sql','column','dm_messages.kind'),
    ('session_plans.sql','column','dm_messages.plan_id'),
    ('session_plans.sql','column','session_plans.proposer_answer'),
    ('session_plans.sql','column','session_plans.recipient_answer'),
    ('session_plans.sql','column','workout_logs.plan_id'),
    ('session_plans.sql','column','workout_logs.verified'),
    ('varsity_availability.sql','table','varsity_availability'),
    ('varsity_availability.sql','policy','public.varsity_availability::Varsity availability readable by signed-in users'),
    ('varsity_availability.sql','policy','public.varsity_availability::Varsity availability writable by signed-in users'),
    ('varsity_coach_notes.sql','table','varsity_coach_notes'),
    ('varsity_coach_notes.sql','function','get_team_roster'),
    ('varsity_coach_notes.sql','policy','public.varsity_coach_notes::Coach notes readable by signed-in users'),
    ('varsity_coach_notes.sql','policy','public.varsity_coach_notes::Coach notes writable by signed-in users'),
    ('varsity_coach_reads.sql','function','varsity_is_my_athlete'),
    ('varsity_coach_reads.sql','function','varsity_athlete_card'),
    ('varsity_coach_reads.sql','policy','public.varsity_logs::Squad logs readable by their coach'),
    ('varsity_lineups.sql','table','varsity_lineups'),
    ('varsity_lineups.sql','policy','public.varsity_lineups::Varsity lineups readable by signed-in users'),
    ('varsity_lineups.sql','policy','public.varsity_lineups::Varsity lineups writable by signed-in users'),
    ('varsity_logs.sql','table','varsity_logs'),
    ('varsity_logs.sql','column','varsity_logs.minutes'),
    ('varsity_logs.sql','column','varsity_logs.metres'),
    ('varsity_logs.sql','column','varsity_logs.split'),
    ('varsity_logs.sql','column','varsity_logs.effort'),
    ('varsity_logs.sql','policy','public.varsity_logs::Own logs readable'),
    ('varsity_logs.sql','policy','public.varsity_logs::Own logs insertable'),
    ('varsity_logs.sql','policy','public.varsity_logs::Own logs updatable'),
    ('varsity_logs.sql','policy','public.varsity_logs::Own logs deletable'),
    ('varsity_plan.sql','table','varsity_plan_blocks'),
    ('varsity_plan.sql','table','varsity_plan_sessions'),
    ('varsity_plan.sql','column','varsity_plan_sessions.location'),
    ('varsity_plan.sql','policy','public.varsity_plan_blocks::Varsity blocks readable by signed-in users'),
    ('varsity_plan.sql','policy','public.varsity_plan_blocks::Varsity blocks writable by signed-in users'),
    ('varsity_plan.sql','policy','public.varsity_plan_sessions::Varsity sessions readable by signed-in users'),
    ('varsity_plan.sql','policy','public.varsity_plan_sessions::Varsity sessions writable by signed-in users'),
    ('varsity_push_notify.sql','function','varsity_my_coach_team'),
    ('varsity_push_notify.sql','function','team_push_targets'),
    ('varsity_push_notify.sql','function','athlete_push_targets'),
    ('varsity_results.sql','table','varsity_results'),
    ('varsity_results.sql','column','varsity_plan_sessions.team_workout'),
    ('varsity_results.sql','column','varsity_plan_sessions.board'),
    ('varsity_results.sql','column','varsity_results.monitor'),
    ('varsity_results.sql','column','varsity_results.photo_path'),
    ('varsity_results.sql','column','varsity_results.intervals'),
    ('varsity_results.sql','policy','public.varsity_results::Varsity results readable by signed-in users'),
    ('varsity_results.sql','policy','public.varsity_results::Own result insertable'),
    ('varsity_results.sql','policy','public.varsity_results::Own result updatable'),
    ('varsity_results.sql','policy','public.varsity_results::Own result deletable'),
    ('varsity_results.sql','policy','storage.objects::Erg photos readable by signed-in users'),
    ('varsity_results.sql','policy','storage.objects::Own erg photo insertable'),
    ('varsity_results.sql','policy','storage.objects::Own erg photo updatable'),
    ('varsity_results.sql','policy','storage.objects::Own erg photo deletable'),
    ('varsity_setup.sql','column','profiles.varsity_setup_completed'),
    ('varsity_teams.sql','table','varsity_teams'),
    ('varsity_teams.sql','table','varsity_members'),
    ('varsity_teams.sql','table','varsity_invites'),
    ('varsity_teams.sql','function','varsity_my_role'),
    ('varsity_teams.sql','function','varsity_can_admin'),
    ('varsity_teams.sql','function','varsity_create_team'),
    ('varsity_teams.sql','function','varsity_my_membership'),
    ('varsity_teams.sql','function','varsity_gen_code'),
    ('varsity_teams.sql','function','varsity_create_invite'),
    ('varsity_teams.sql','function','varsity_revoke_invite'),
    ('varsity_teams.sql','function','varsity_invite_preview'),
    ('varsity_teams.sql','function','varsity_redeem_invite'),
    ('varsity_teams.sql','function','varsity_squad'),
    ('varsity_teams.sql','function','varsity_set_member_status'),
    ('varsity_teams.sql','function','varsity_set_member_role'),
    ('varsity_teams.sql','function','varsity_invite_list'),
    ('varsity_teams.sql','policy','public.varsity_teams::Varsity teams readable by their members'),
    ('varsity_teams.sql','policy','public.varsity_members::Varsity members readable by the squad'),
    ('varsity_teams.sql','policy','public.varsity_invites::Varsity invites readable by admins'),
    ('varsity_telemetry.sql','table','varsity_telemetry'),
    ('varsity_telemetry.sql','policy','public.varsity_telemetry::Telemetry readable by signed-in users'),
    ('varsity_telemetry.sql','policy','public.varsity_telemetry::Own telemetry insertable'),
    ('varsity_telemetry.sql','policy','public.varsity_telemetry::Own telemetry updatable'),
    ('varsity_telemetry.sql','policy','public.varsity_telemetry::Own telemetry deletable'),
    ('varsity_training_config.sql','table','varsity_team_config'),
    ('varsity_training_config.sql','function','varsity_save_team_config'),
    ('varsity_training_config.sql','policy','public.varsity_team_config::Team config readable by the squad'),
    ('varsity_videos.sql','table','varsity_videos'),
    ('varsity_videos.sql','policy','public.varsity_videos::Crew videos readable by signed-in users'),
    ('varsity_videos.sql','policy','public.varsity_videos::Crew videos insertable by signed-in users'),
    ('varsity_videos.sql','policy','public.varsity_videos::Own crew video updatable'),
    ('varsity_videos.sql','policy','public.varsity_videos::Own crew video deletable'),
    ('varsity_videos.sql','policy','storage.objects::Crew videos readable by signed-in users'),
    ('varsity_videos.sql','policy','storage.objects::Crew videos insertable by signed-in users'),
    ('varsity_videos.sql','policy','storage.objects::Own crew video file deletable'),
    ('workout_logs.sql','table','workout_logs'),
    ('workout_logs.sql','column','workout_logs.metrics'),
    ('workout_logs.sql','column','workout_logs.photos'),
    ('workout_logs.sql','column','workout_logs.partner_id'),
    ('workout_logs.sql','policy','public.workout_logs::Own workout logs readable'),
    ('workout_logs.sql','policy','public.workout_logs::Own workout logs insertable'),
    ('workout_logs.sql','policy','public.workout_logs::Own workout logs updatable'),
    ('workout_logs.sql','policy','public.workout_logs::Own workout logs deletable')
),
expect_rls (tbl) as (
  values
    ('buddy_posts'),
    ('follows'),
    ('gym_crowd_reports'),
    ('log_reminders'),
    ('dm_conversations'),
    ('dm_messages'),
    ('dm_reads'),
    ('channels'),
    ('channel_messages'),
    ('channel_reads'),
    ('channel_members'),
    ('profiles'),
    ('push_subscriptions'),
    ('session_plans'),
    ('varsity_availability'),
    ('varsity_coach_notes'),
    ('varsity_lineups'),
    ('varsity_logs'),
    ('varsity_plan_blocks'),
    ('varsity_plan_sessions'),
    ('varsity_results'),
    ('varsity_teams'),
    ('varsity_members'),
    ('varsity_invites'),
    ('varsity_telemetry'),
    ('varsity_team_config'),
    ('varsity_videos'),
    ('workout_logs')
),

-- Everything that actually exists right now.
--
-- The ::text casts are load-bearing. relname is Postgres's "name" type (63
-- bytes); without them the union's column resolves to "name" and every policy
-- key longer than 63 characters is silently truncated, so a file that HAS been
-- run reports as half-run. Five files did exactly that.
present (kind, name) as (
  select distinct 'table', c.relname::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','p')
  union
  select distinct 'view', c.relname::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('v','m')
  union
  select distinct 'column', c.relname::text || '.' || a.attname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
   where n.nspname = 'public' and c.relkind in ('r','p')
     and a.attnum > 0 and not a.attisdropped
  union
  select distinct 'function', p.proname::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
  union
  select distinct 'policy', n.nspname::text || '.' || c.relname || '::' || pol.polname
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
),

per_file as (
  select e.file,
         count(*) as expects,
         count(p.name) as found,
         string_agg(e.kind || ' ' || e.name, ', ' order by e.kind, e.name)
           filter (where p.name is null) as missing
    from expected e
    left join present p on p.kind = e.kind and p.name = e.name
   group by e.file
),

-- One line per file: run it, finish it, or leave it alone.
files as (
  select case when found = expects then 4 when found = 0 then 2 else 3 end as sort,
         case when found = expects then 'OK — already run'
              when found = 0      then 'RUN THIS'
              else                     'PARTLY RUN — see note'
         end as status,
         file as item,
         case when found = expects
              then expects || ' objects all present'
              else found || ' of ' || expects || ' present · missing: ' || missing
         end as detail
    from per_file
),

-- Row security a file turns on, but the live table has off.
rls_off as (
  select 1 as sort,
         'ROW SECURITY IS OFF' as status,
         r.tbl as item,
         'this table is readable by anyone until its file is re-run' as detail
    from expect_rls r
    join pg_class c on c.relname = r.tbl
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relkind in ('r','p') and c.relrowsecurity = false
),

-- The match_profiles fix creates no object, so the piles above cannot see it.
-- It is two statements in db/matching.sql, just after the view definition.
security as (
  select 0 as sort,
         'SECURITY — NOT FIXED YET' as status,
         'match_profiles' as item,
         'every signed-in user can read every onboarded profile. Run: alter view '
         || 'public.match_profiles set (security_invoker = on); '
         || 'revoke all on public.match_profiles from anon, authenticated;' as detail
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relname = 'match_profiles'
     and c.relkind = 'v'
     and (
       coalesce(array_to_string(c.reloptions, ','), '') not like '%security_invoker=%'
       or (
         exists (select 1 from pg_roles where rolname = 'authenticated')
         and has_table_privilege('authenticated', c.oid, 'select')
       )
     )
)

select status, item, detail
  from (
    select * from security
    union all select * from rls_off
    union all select * from files
  ) all_rows
 order by sort, item;
