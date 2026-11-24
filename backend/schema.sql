-- KaushalSetu PostgreSQL schema. Run with: npm run db:migrate
begin;
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(), email text not null unique,
  password_hash text not null, name text not null, role text not null check(role in ('seeker','employer','centre','admin')),
  district text, phone text, qualification text, experience text, education text, company text,
  verified boolean not null default false, resume_path text, resume_name text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  token_hash char(64) not null unique, expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index if not exists sessions_expiry_idx on sessions(expires_at);
create index if not exists users_role_district_idx on users(role,district);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references users(id) on delete cascade,
  kind text not null check(kind in ('employer','centre')), name text not null, sector text, district text,
  verified boolean not null default false, course_count integer not null default 0,
  accreditation text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,kind,name)
);
create index if not exists organizations_kind_district_idx on organizations(kind,district);

create table if not exists skills (
  id bigserial primary key, user_id uuid not null references users(id) on delete cascade,
  skill_name text not null, verified boolean not null default false, assessed_at timestamptz,
  unique(user_id,skill_name)
);
create index if not exists skills_name_idx on skills(lower(skill_name));

create table if not exists jobs (
  id text primary key, owner_id uuid not null references users(id), organization_id uuid references organizations(id),
  title text not null, company_name text not null, district text not null, category text not null,
  salary text not null, min_salary numeric(10,2), max_salary numeric(10,2), salary_period text not null default 'unspecified',
  experience text not null, education text not null, skills text[] not null default '{}', description text not null,
  status text not null default 'pending' check(status in ('pending','published','rejected','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists jobs_search_idx on jobs(status,district,category);
create index if not exists jobs_owner_idx on jobs(owner_id,created_at desc);
create index if not exists jobs_skills_idx on jobs using gin(skills);
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  status text not null default 'Applied' check(status in ('Applied','Under Review','Shortlisted','Rejected','Selected')),
  applied_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,job_id)
);
create index if not exists job_applications_job_status_idx on job_applications(job_id,status);
create index if not exists job_applications_user_idx on job_applications(user_id,applied_at desc);
create table if not exists candidate_shortlists (
  employer_id uuid not null references users(id) on delete cascade,
  candidate_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(employer_id,candidate_id), check(employer_id<>candidate_id)
);

create table if not exists courses (
  id text primary key, owner_id uuid not null references users(id), organization_id uuid references organizations(id),
  name text not null, district text not null, duration text not null, eligibility text not null,
  skills text[] not null default '{}', fees text not null, mode text not null,
  seats integer not null default 0 check(seats>=0), accreditation text not null default 'Demo listing',
  status text not null default 'pending' check(status in ('pending','published','rejected','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists courses_search_idx on courses(status,district);
create index if not exists courses_owner_idx on courses(owner_id,created_at desc);
create index if not exists courses_skills_idx on courses using gin(skills);
create table if not exists course_enrollments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  course_id text not null references courses(id) on delete cascade,
  status text not null default 'Enrolled' check(status in ('Enrolled','In progress','Completed')),
  attendance smallint not null default 0 check(attendance between 0 and 100), performance numeric(5,2),
  placed boolean not null default false, placement_employer text,
  enrolled_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,course_id)
);
create index if not exists enrollments_course_idx on course_enrollments(course_id,status);
create index if not exists enrollments_user_idx on course_enrollments(user_id,enrolled_at desc);

create table if not exists apprenticeships (
  id text primary key, owner_id uuid references users(id), title text not null, company text not null,
  district text not null, duration text not null, stipend text not null, eligibility text not null,
  skills text[] not null default '{}', status text not null default 'published' check(status in ('pending','published','rejected','closed')),
  created_at timestamptz not null default now()
);
create table if not exists apprenticeship_applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  apprenticeship_id text not null references apprenticeships(id) on delete cascade,
  status text not null default 'Applied' check(status in ('Applied','Under Review','Shortlisted','Rejected','Selected')),
  applied_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,apprenticeship_id)
);
create index if not exists apprentice_apps_user_idx on apprenticeship_applications(user_id,applied_at desc);

create table if not exists recruitment_drives (
  id uuid primary key default gen_random_uuid(), organizer_id uuid references users(id), name text not null,
  district text not null, drive_date date not null, hosts text not null, status text not null default 'published' check(status in ('pending','published','rejected','closed'))
);
create index if not exists drives_district_date_idx on recruitment_drives(district,drive_date);
create table if not exists certificates (
  id text primary key, user_id uuid not null references users(id) on delete cascade,
  enrollment_id uuid references course_enrollments(id), title text not null,
  issued_at timestamptz not null default now(), verified boolean not null default false,
  unique(user_id,enrollment_id)
);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  kind text not null, title text not null, body text not null, read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id,created_at desc);
create table if not exists government_analytics (
  id bigserial primary key, district text not null, metric text not null,
  period_start date not null, value numeric(14,2) not null default 0,
  refreshed_at timestamptz not null default now(), unique(district,metric,period_start)
);
create index if not exists government_analytics_district_period_idx on government_analytics(district,period_start desc);

-- Admin-only listing and organization decisions are enforced in the Express API.
create or replace view district_employment_analytics as
 select d.district, count(distinct j.id) filter(where j.status='published') as published_jobs,
        count(distinct c.id) filter(where c.status='published') as published_courses,
        count(distinct a.id) as applications,
        count(distinct ce.id) as course_enrollments
 from (select district from jobs union select district from courses union select district from users) d
 left join jobs j on j.district=d.district
 left join courses c on c.district=d.district
 left join job_applications a on a.job_id=j.id
 left join course_enrollments ce on ce.course_id=c.id
 group by d.district;
commit;
