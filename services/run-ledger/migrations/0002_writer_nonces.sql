CREATE TABLE writer_nonces (
  key_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(key_id,server_id,nonce)
);
CREATE INDEX writer_nonces_expiry ON writer_nonces(key_id,server_id,expires_at);
