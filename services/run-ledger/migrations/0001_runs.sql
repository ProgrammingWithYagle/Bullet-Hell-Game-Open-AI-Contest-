CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  registration_hash TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_epoch INTEGER NOT NULL CHECK(owner_epoch >= 1),
  sequence INTEGER NOT NULL CHECK(sequence >= 0),
  state TEXT NOT NULL CHECK(state IN ('intermission','combat','finalized')),
  lease_until INTEGER NOT NULL,
  digest TEXT NOT NULL,
  checkpoint TEXT NOT NULL,
  ranked INTEGER NOT NULL CHECK(ranked IN (0,1))
);
CREATE TABLE run_events (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  guard_epoch INTEGER NOT NULL,
  response TEXT NOT NULL,
  PRIMARY KEY(run_id,event_id)
);
