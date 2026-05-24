-- ============================================================
-- NITRR Clubs — 03_seed.sql
-- Placeholder data. Run AFTER 01_schema.sql and 02_rls.sql.
-- Swap real club data later by editing/replacing the rows below.
-- Idempotent-ish: uses fixed slugs so re-running won't duplicate
-- (it will error on unique slug — truncate first if you re-seed).
-- ============================================================

-- ---------- categories ----------
insert into categories (name, slug, color, icon, sort_order) values
  ('Tech & Robotics', 'tech',         '#5B52E0', 'ti-code',           1),
  ('Sports & Fitness', 'sports',      '#5C8A3A', 'ti-trophy',         2),
  ('Arts & Culture', 'arts',          '#C26A4A', 'ti-palette',        3),
  ('Social & Service', 'social',      '#B0653A', 'ti-heart',          4),
  ('Professional', 'professional',    '#5B52E0', 'ti-briefcase',      5),
  ('Culture & Media', 'culture',      '#7C8C6A', 'ti-music',          6);

-- ---------- clubs (18 placeholders across the 6 categories) ----------
-- highlights = the 3-4 bullets on the flip-card back.
insert into clubs (slug, name, tagline, description, category_id, highlights, member_count, is_recruiting)
select v.slug, v.name, v.tagline, v.description,
       (select id from categories where slug = v.cat),
       v.highlights, v.members, true
from (values
  ('robotix','ROBOTiX','Build. Automate. Compete.','The robotics and automation club at NIT Raipur.','tech',
    array['Build combat & soccer bots','National Robocon team','Arduino & ROS workshops','120+ active members'],120),
  ('technocracy','The Technocracy','Code the campus.','Coding contests, hackathons and tech talks.','tech',
    array['Weekly competitive coding','Flagship hackathon','Open-source projects','Tech mentorship'],200),
  ('motosports','NITRR Moto Sports','Design. Build. Race.','Formula-style vehicle engineering.','tech',
    array['Design & fabricate vehicles','National racing events','Hands-on mechanical work','CAD & simulation'],45),
  ('shaurya','Shaurya','Game on.','The sports committee — runs all of campus athletics.','sports',
    array['Runs SAMAR sports fest','Inter-NIT tournament teams','All sports, all levels','Trials every August'],180),
  ('ncc','NCC','Unity & discipline.','National Cadet Corps unit.','sports',
    array['Drills & camps','Leadership training','Adventure activities','Certificate benefits'],90),
  ('clickclub','Click Club','Frame the moment.','Photography and videography club.','sports',
    array['Cover campus events','Photo walks','Editing workshops','Build your portfolio'],75),
  ('abhinay','Abhinay','The stage is yours.','The dramatics club.','arts',
    array['Stage plays & street theatre','Nukkad natak on campus','Annual drama night','No experience needed'],85),
  ('raaga','Raaga','Find your sound.','The music club.','arts',
    array['Vocals, instruments & bands','Live gigs at every fest','Weekly jam sessions','Open mic nights'],110),
  ('nrityam','NRITYAM','Move to express.','The dance club.','arts',
    array['Classical to hip-hop','Choreography workshops','Fest performances','Beginner friendly'],95),
  ('literary','Literary Committee','Words that move.','Debates, poetry and creative writing.','arts',
    array['Debates & poetry slams','Creative writing circles','Quizzes & MUNs','Campus magazine'],70),
  ('chitransh','Chitransh','Make your mark.','Fine arts and design.','arts',
    array['Painting & sketching','Poster & mural design','Art exhibitions','All mediums welcome'],60),
  ('nss','NSS','Not me, but you.','National Service Scheme.','social',
    array['Community outreach drives','Blood donation camps','Village teaching programs','Make a real impact'],150),
  ('gogreen','Go Green Club','For a greener campus.','Environment & sustainability.','social',
    array['Plantation drives','Waste management','Awareness campaigns','Eco projects'],65),
  ('interact','Interact Club','Service above self.','Youth service & leadership (Rotary-backed).','social',
    array['Community service','Leadership workshops','Inter-club collabs','Social campaigns'],55),
  ('sahyog','Sahyog','Seniors guiding juniors.','The mentorship club.','social',
    array['1:1 mentoring','Academic guidance','Peer support','Smooth your first year'],100),
  ('finance','Finance & Consulting','Decode markets.','Finance, markets and consulting.','professional',
    array['Case competitions','Market analysis sessions','Financial literacy','Consulting prep'],80),
  ('tedx','TEDxNITRaipur','Ideas worth spreading.','Curating talks and big ideas.','professional',
    array['Speaker events','Curation & production','Thought leadership','Behind-the-scenes crew'],40),
  ('ecell','E-Cell','Build your venture.','The entrepreneurship cell.','professional',
    array['Startup pitch events','Founder & VC talks','Business plan contests','Incubation support'],70)
) as v(slug,name,tagline,description,cat,highlights,members);

-- ---------- events (a few upcoming, tied to clubs) ----------
insert into events (club_id, slug, title, description, venue, starts_at, reg_open)
select (select id from clubs where slug = e.club), e.slug, e.title, e.descr, e.venue,
       e.starts_at::timestamptz, true
from (values
  ('shaurya','samar-2026','SAMAR 2026 — Annual Sports Fest','Campus-wide sports festival.','NITRR Grounds','2026-06-15 09:00+05:30'),
  ('technocracy','hacknitrr-2026','HackNITRR 2026','36-hour flagship hackathon.','CS Block','2026-06-22 10:00+05:30'),
  ('abhinay','drama-night-2026','Drama Night','An evening of theatre.','Main Auditorium','2026-07-05 18:00+05:30'),
  ('raaga','music-fiesta-2026','Music Fiesta','Live bands and open mic.','Open Air Theatre','2026-07-02 17:00+05:30'),
  ('tedx','tedx-2026','TEDxNITRaipur 2026','Ideas worth spreading.','Seminar Hall','2026-07-09 11:00+05:30')
) as e(club,slug,title,descr,venue,starts_at);

-- ---------- faqs ----------
insert into faqs (question, answer, sort_order) values
  ('What is the NITRR Clubs platform?','A single place to discover every active club and committee at NIT Raipur, see their events, and apply to join.',1),
  ('How do I join a club?','Open any club page, read what they do, and hit Apply. Your application goes straight to that club''s coordinators.',2),
  ('Can I join more than one club?','Absolutely. Apply to as many as you like — most students are part of two or three.',3),
  ('Do I need to sign in to apply?','Yes — sign in with Google or any valid email so clubs can reach you and you can track your applications.',4),
  ('Who manages each club page?','Each club has admins (coordinators) who keep their page, events and gallery up to date.',5);
