import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
try {
  await db.exec("create role anon; create role authenticated;");
  await db.exec(await readFile(new URL("../supabase/setup.sql", import.meta.url), "utf8"));
  await db.exec("set role anon;");
  const a = "a".repeat(64);
  const b = "b".repeat(64);
  const call = async (action, id, token) =>
    (await db.query("select * from public.kimmo_gifts($1, $2, $3)", [action, id, token])).rows;

  assert.equal((await call("list", null, a)).length, 9);
  let rows = await call("reserve", 7, a);
  assert.deepEqual(rows[0], { gift_id: 7, busy: true, mine: true });
  assert.deepEqual((await call("list", null, b))[0], { gift_id: 7, busy: true, mine: false });
  await assert.rejects(call("reserve", 7, b), (e) => e.code === "23505");
  assert.equal((await call("reserve", 7, a))[0].mine, true, "Retry by the owner is idempotent");
  assert.equal((await call("release", 7, b))[0].busy, true, "Another visitor cannot release");
  await assert.rejects(
    db.query("select * from kimmo_private.reservations_2026"),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    db.query("delete from kimmo_private.reservations_2026"),
    (e) => e.code === "42501",
  );
  await assert.rejects(call("reserve", 99, a), (e) => e.code === "22023");
  await assert.rejects(call("reserve", 8, "invalid"), (e) => e.code === "22023");
  await assert.rejects(call("invalid", 8, a), (e) => e.code === "22023");
  rows = await call("release", 7, a);
  assert.deepEqual(rows[0], { gift_id: 7, busy: false, mine: false });
  assert.equal(
    (await call("reserve", 7, b))[0].mine,
    true,
    "A released gift can be reserved again",
  );
  await call("release", 7, b);
  console.log(
    "PostgreSQL checks passed: reserve, conflict, ownership, release, retries, private data, invalid inputs.",
  );
} finally {
  await db.close();
}
