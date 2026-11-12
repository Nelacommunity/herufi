-- Optional map pin for an address ("Use my current location"). Many Tanzanian addresses are
-- informal, so the courier gets exact coordinates as well as the street/area description.
alter table public.addresses
  add column if not exists latitude double precision check (latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180);
