import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, "Set Supabase URL and publishable key");
const tokens = [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")];
async function call(action, giftId, token) {
  const response = await fetch(`${url}/rest/v1/rpc/kimmo_gifts`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_gift_id: giftId, p_token: token }),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}

const initial = await call("list", null, tokens[0]);
assert.equal(initial.status, 200);
assert.equal(initial.body.length, 9);
const gift = initial.body.find((row) => !row.busy);
assert.ok(gift, "No free gifts available for the smoke test");
const id = gift.gift_id;
try {
  const race = await Promise.all(tokens.map((token) => call("reserve", id, token)));
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  const winner = race.findIndex((r) => r.status === 200);
  const loser = 1 - winner;
  assert.equal(race[loser].body.code, "23505");
  const otherView = await call("list", null, tokens[loser]);
  assert.deepEqual(
    otherView.body.find((r) => r.gift_id === id),
    { gift_id: id, busy: true, mine: false },
  );
  const unauthorizedRelease = await call("release", id, tokens[loser]);
  assert.equal(unauthorizedRelease.body.find((r) => r.gift_id === id).busy, true);
  const ownerView = await call("list", null, tokens[winner]);
  assert.equal(ownerView.body.find((r) => r.gift_id === id).mine, true);
  assert.equal((await call("reserve", 99, tokens[0])).status, 400);
  assert.equal((await call("reserve", id, "invalid")).status, 400);
  const released = await call("release", id, tokens[winner]);
  assert.equal(released.body.find((r) => r.gift_id === id).busy, false);
  console.log(
    "Live Supabase API passed: concurrent reserve, conflict, ownership, unauthorized release, invalid inputs, cleanup.",
  );
} finally {
  await Promise.all(tokens.map((token) => call("release", id, token)));
}
