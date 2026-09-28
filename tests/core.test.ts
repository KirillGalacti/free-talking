import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultSettings } from "../shared/catalog";
import { presetBrief } from "../shared/preset-scenario";
import { generateSeed, isSeed, seededRandom } from "../shared/seed";
import { presetCard } from "../server/card";
import { applyRandomPicks, checkConsistency, sanitizeSettings } from "../server/scenario";
import { anonymise, findRealNames } from "../src/lib/real-names";
import { encodePcm16 } from "../src/lib/audio-pcm";

test("seed is well-formed and the PRNG is deterministic", () => {
  const seed = generateSeed();
  assert.ok(isSeed(seed));
  const a = seededRandom("7KQ2M1XA");
  const b = seededRandom("7KQ2M1XA");
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("consistent random keeps locked values and repeats for the same seed", () => {
  const settings = { ...defaultSettings(), method: "random" as const, topic: "purchasing" as const, role: "sales_manager" as const, tactics: "hard" as const };
  const first = applyRandomPicks(settings, "01JFREE9X3");
  const second = applyRandomPicks(settings, "01JFREE9X3");
  assert.deepEqual(first, second);
  assert.equal(first.topic, "purchasing");
  assert.equal(first.tactics, "hard");
  assert.notEqual(first.style, "friendly", "pressure tactics never pair with a friendly style");
});

test("the pre-validated preset scenario passes the consistency checks", () => {
  const report = checkConsistency(presetBrief, presetCard, defaultSettings());
  assert.deepEqual(report.problems, []);
});

test("consistency check rejects a BATNA that repeats the stated position", () => {
  const card = { ...presetCard, batna: presetCard.statedPosition };
  const report = checkConsistency(presetBrief, card, defaultSettings());
  assert.ok(report.problems.some((problem) => problem.includes("BATNA")));
});

test("settings from the browser are sanitized", () => {
  const settings = sanitizeSettings({ method: "hack", difficulty: "insane", durationMin: 999, profile: { toughness: "max" } });
  assert.equal(settings.method, "preset");
  assert.equal(settings.difficulty, "medium");
  assert.equal(settings.durationMin, 15);
  assert.equal(settings.profile.toughness, "mid");
});

test("real company names are found and anonymised", () => {
  const text = "У «ТехПак» есть предложение, а ООО Ромашка молчит.";
  assert.equal(findRealNames(text).length, 2);
  assert.equal(anonymise("Работаем с «ТехПак» три года"), "Работаем с «Клиент» три года");
});

test("PCM encoder mixes channels into 16-bit little-endian samples", () => {
  const pcm = encodePcm16([new Float32Array([1, -1, 0]), new Float32Array([1, -1, 0])]);
  const view = new DataView(pcm);
  assert.equal(view.getInt16(0, true), 32767);
  assert.equal(view.getInt16(2, true), -32768);
  assert.equal(view.getInt16(4, true), 0);
});
