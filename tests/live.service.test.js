const test = require("node:test");
const assert = require("node:assert/strict");
const { pickActiveFromGroup, parseTeacherKey } = require("../src/services/live.service");

// =====================================================================
// parseTeacherKey tests
// =====================================================================

test("parseTeacherKey: supports teacher-prefixed format", () => {
  assert.equal(parseTeacherKey("teacher-12"), 12);
  assert.equal(parseTeacherKey("teacher-1"), 1);
  assert.equal(parseTeacherKey("teacher-999"), 999);
});

test("parseTeacherKey: supports numeric values", () => {
  assert.equal(parseTeacherKey("7"), 7);
  assert.equal(parseTeacherKey("1"), 1);
  assert.equal(parseTeacherKey("100"), 100);
});

test("parseTeacherKey: case insensitive for teacher prefix", () => {
  assert.equal(parseTeacherKey("Teacher-5"), 5);
  assert.equal(parseTeacherKey("TEACHER-3"), 3);
});

test("parseTeacherKey: returns null for invalid formats", () => {
  assert.equal(parseTeacherKey("teacher-abc"), null);
  assert.equal(parseTeacherKey("someone"), null);
  assert.equal(parseTeacherKey("teacher-"), null);
  assert.equal(parseTeacherKey(""), null);
  assert.equal(parseTeacherKey(null), null);
  assert.equal(parseTeacherKey(undefined), null);
});

test("parseTeacherKey: rejects non-teacher prefixed strings", () => {
  assert.equal(parseTeacherKey("student-1"), null);
  assert.equal(parseTeacherKey("admin-5"), null);
  assert.equal(parseTeacherKey("abc"), null);
});

// =====================================================================
// pickActiveFromGroup tests
// =====================================================================

function content(id, rotationOrder, durationMinutes, createdAt) {
  return {
    id,
    schedule: {
      rotationOrder,
      durationMinutes,
      createdAt
    }
  };
}

test("pickActiveFromGroup: rotates content by duration", () => {
  const anchor = new Date("2026-01-01T00:00:00.000Z");
  const group = [
    content(1, 1, 1, anchor),
    content(2, 2, 1, anchor),
    content(3, 3, 1, anchor)
  ];

  const at0 = pickActiveFromGroup(group, new Date("2026-01-01T00:00:20.000Z"));
  const at70 = pickActiveFromGroup(group, new Date("2026-01-01T00:01:10.000Z"));
  const at130 = pickActiveFromGroup(group, new Date("2026-01-01T00:02:10.000Z"));
  const at190 = pickActiveFromGroup(group, new Date("2026-01-01T00:03:10.000Z"));

  assert.equal(at0.id, 1);
  assert.equal(at70.id, 2);
  assert.equal(at130.id, 3);
  assert.equal(at190.id, 1); // cycles back
});

test("pickActiveFromGroup: returns null for empty group", () => {
  const result = pickActiveFromGroup([], new Date());
  assert.equal(result, null);
});

test("pickActiveFromGroup: returns single item for single-item group", () => {
  const anchor = new Date("2026-01-01T00:00:00.000Z");
  const group = [content(1, 1, 5, anchor)];
  const result = pickActiveFromGroup(group, new Date("2026-01-01T00:10:00.000Z"));
  assert.equal(result.id, 1);
});

test("pickActiveFromGroup: handles different duration values", () => {
  const anchor = new Date("2026-01-01T00:00:00.000Z");
  const group = [
    content(1, 1, 2, anchor), // 2 minutes = 120 seconds
    content(2, 2, 3, anchor)  // 3 minutes = 180 seconds
  ];

  // At 60s into cycle => still item 1 (within first 120s)
  const at60 = pickActiveFromGroup(group, new Date("2026-01-01T00:01:00.000Z"));
  assert.equal(at60.id, 1);

  // At 150s into cycle => item 2 (past 120s, within 120+180=300s)
  const at150 = pickActiveFromGroup(group, new Date("2026-01-01T00:02:30.000Z"));
  assert.equal(at150.id, 2);

  // At 310s into cycle => wraps around (310 % 300 = 10s => item 1)
  const at310 = pickActiveFromGroup(group, new Date("2026-01-01T00:05:10.000Z"));
  assert.equal(at310.id, 1);
});

test("pickActiveFromGroup: skips items without schedule", () => {
  const anchor = new Date("2026-01-01T00:00:00.000Z");
  const group = [
    { id: 1, schedule: null },
    content(2, 1, 5, anchor),
    { id: 3, schedule: undefined }
  ];

  const result = pickActiveFromGroup(group, new Date("2026-01-01T00:01:00.000Z"));
  assert.equal(result.id, 2);
});

test("pickActiveFromGroup: sorts by rotationOrder then by id", () => {
  const anchor = new Date("2026-01-01T00:00:00.000Z");
  const group = [
    content(5, 2, 1, anchor),
    content(3, 1, 1, anchor),
    content(7, 3, 1, anchor)
  ];

  // At t=0 should return the one with rotationOrder=1 (id=3)
  const atStart = pickActiveFromGroup(group, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(atStart.id, 3);
});

test("pickActiveFromGroup: handles minimum 1-minute enforcement for 0 duration", () => {
  const anchor = new Date("2026-01-01T00:00:00.000Z");
  // Even if durationMinutes is 0, it should be treated as 1
  const group = [
    content(1, 1, 0, anchor),
    content(2, 2, 0, anchor)
  ];

  const result = pickActiveFromGroup(group, anchor);
  assert.equal(result.id, 1);
});

// =====================================================================
// normalizeSubject tests
// =====================================================================

const { normalizeSubject } = require("../src/utils/subject");

test("normalizeSubject: normalizes to lowercase trimmed", () => {
  assert.equal(normalizeSubject("Maths"), "maths");
  assert.equal(normalizeSubject("  Science "), "science");
  assert.equal(normalizeSubject("ENGLISH"), "english");
});

test("normalizeSubject: returns empty for null/undefined", () => {
  assert.equal(normalizeSubject(null), "");
  assert.equal(normalizeSubject(undefined), "");
  assert.equal(normalizeSubject(""), "");
});

test("normalizeSubject: returns empty for non-string", () => {
  assert.equal(normalizeSubject(123), "");
  assert.equal(normalizeSubject({}), "");
});

// =====================================================================
// ApiError tests
// =====================================================================

const ApiError = require("../src/utils/api-error");

test("ApiError: stores statusCode and message", () => {
  const err = new ApiError(404, "Not found");
  assert.equal(err.statusCode, 404);
  assert.equal(err.message, "Not found");
  assert.equal(err.name, "ApiError");
  assert.equal(err instanceof Error, true);
});

test("ApiError: stores details", () => {
  const details = { field: "email", issue: "invalid" };
  const err = new ApiError(400, "Validation failed", details);
  assert.deepEqual(err.details, details);
});

// =====================================================================
// JWT utility tests
// =====================================================================

const { signToken, verifyToken } = require("../src/utils/jwt");

test("signToken + verifyToken: roundtrip works", () => {
  const user = { id: 42, role: "TEACHER", email: "test@test.com" };
  const token = signToken(user);
  assert.equal(typeof token, "string");

  const payload = verifyToken(token);
  assert.equal(payload.sub, 42);
  assert.equal(payload.role, "TEACHER");
  assert.equal(payload.email, "test@test.com");
});

test("verifyToken: throws on invalid token", () => {
  assert.throws(() => verifyToken("invalid.token.here"));
});

// =====================================================================
// Cache service tests (unit — no Redis needed)
// =====================================================================

const { buildLiveCacheKey } = require("../src/services/cache.service");

test("buildLiveCacheKey: builds correct key with subject", () => {
  assert.equal(buildLiveCacheKey("teacher-1", "maths"), "live:teacher-1:maths");
  assert.equal(buildLiveCacheKey("5", "science"), "live:5:science");
});

test("buildLiveCacheKey: builds key with :all when no subject", () => {
  assert.equal(buildLiveCacheKey("teacher-2", null), "live:teacher-2:all");
  assert.equal(buildLiveCacheKey("teacher-2", undefined), "live:teacher-2:all");
});

console.log("\n✅ All unit tests defined and running...\n");
