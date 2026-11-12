-- Monitoring Area Surabaya — skema Supabase
-- Jalankan di Supabase: SQL Editor → New query → paste → Run. Lalu jalankan seed.sql.

create table if not exists rayon (
  id   text primary key,
  nama text not null
);

create table if not exists brief (
  id            text primary key,
  nama          text not null,
  brand         text,
  channel       text,
  nomor_dokumen text
);

create table if not exists sub_program (
  id               text primary key,
  brief_id         text not null references brief(id) on delete cascade,
  nama             text not null,
  kategori         text,
  berlaku_surabaya text not null check (berlaku_surabaya in ('ya','tidak','belum_dirinci')),
  tingkat_alokasi  text,
  periode_mulai    text,
  periode_selesai  text
);

-- Progress per sub-program per rayon (target dari brief; program level area dibagi rata 5 rayon)
create table if not exists progress_rayon (
  id              bigint generated always as identity primary key,
  sub_program_id  text not null references sub_program(id) on delete cascade,
  rayon_id        text not null references rayon(id),
  satuan          text,
  target          numeric,
  target_dibagi_rata boolean not null default false,
  realisasi       numeric check (realisasi is null or realisasi >= 0),
  status          text check (status in ('belum_mulai','berjalan','selesai','terlambat','tidak_berlaku')),
  pic             text,
  update_terakhir date,
  catatan         text,
  link_bukti      text,
  updated_at      timestamptz not null default now(),
  unique (sub_program_id, rayon_id)
);

create table if not exists volume_mingguan (
  id         bigint generated always as identity primary key,
  brief_id   text not null references brief(id) on delete cascade,
  varian     text not null,
  minggu     text not null,
  target     numeric,
  realisasi  numeric,
  updated_at timestamptz not null default now(),
  unique (brief_id, varian, minggu)
);

create table if not exists promotor (
  id              text primary key,          -- p1..p8 (tanpa ID karyawan)
  nama            text not null,
  rayon_id        text references rayon(id),
  target_trial_cy numeric,
  target_trial_td numeric,
  target_call     numeric,
  target_sunblind numeric,
  cycle           text not null
);

create table if not exists trial_titik (
  id          bigint generated always as identity primary key,
  promotor_id text not null references promotor(id) on delete cascade,
  tanggal     date,
  lat         double precision not null,
  lng         double precision not null,
  head        integer not null default 1,
  lokasi      text,
  unique (promotor_id, tanggal, lat, lng)
);

-- updated_at otomatis
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_progress_upd on progress_rayon;
create trigger trg_progress_upd before update on progress_rayon for each row execute function set_updated_at();
drop trigger if exists trg_volume_upd on volume_mingguan;
create trigger trg_volume_upd before update on volume_mingguan for each row execute function set_updated_at();

-- RLS: web (anon key) hanya boleh BACA. Input lewat dashboard Supabase / service role.
alter table rayon           enable row level security;
alter table brief           enable row level security;
alter table sub_program     enable row level security;
alter table progress_rayon  enable row level security;
alter table volume_mingguan enable row level security;
alter table promotor        enable row level security;
alter table trial_titik     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['rayon','brief','sub_program','progress_rayon','volume_mingguan','promotor','trial_titik'] loop
    execute format('drop policy if exists "anon read" on %I', t);
    execute format('create policy "anon read" on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
