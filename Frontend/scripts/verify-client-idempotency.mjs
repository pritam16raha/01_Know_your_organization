import assert from "node:assert/strict";
import { createIdempotencyKey } from "../src/lib/idempotency-key.ts";

const expectedRandomUuid = "11111111-1111-4111-8111-111111111111";
assert.equal(
  createIdempotencyKey({ randomUUID: () => expectedRandomUuid }),
  expectedRandomUuid,
);

const insecureOriginFallback = createIdempotencyKey({
  getRandomValues(bytes) {
    bytes.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    return bytes;
  },
});

assert.match(
  insecureOriginFallback,
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
assert.equal(insecureOriginFallback, "00010203-0405-4607-8809-0a0b0c0d0e0f");

console.log(
  JSON.stringify({
    nativeRandomUuid: "passed",
    insecureOriginFallback: "passed",
    fallbackUuid: insecureOriginFallback,
  }),
);

