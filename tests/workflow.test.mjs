import assert from "node:assert/strict";
import test from "node:test";
import { cards } from "../src/features/workflow/cards.ts";
import { currentId, decodeState, encodeState, goBack, initialState, takeChoice, toggleCheck } from "../src/features/workflow/state.ts";

function move(state, choice) { return takeChoice(state, choice); }

test("все переходы ведут к существующим карточкам, а завершение не задаёт вопросов", () => {
  for (const card of Object.values(cards)) for (const choice of card.choices ?? []) assert.ok(cards[choice.next], `${card.id} -> ${choice.next}`);
  assert.equal(cards.C19.choices, undefined);
});

test("ветка права и путь восстанавливаются из ссылки", () => {
  let state = initialState;
  for (const choice of ["start", "review", "accepted", "basis", "inheritance", "predecessor", "advance"]) state = move(state, choice);
  state = toggleCheck(state, 0);
  assert.equal(currentId(state), "C07");
  assert.ok(state.trail.includes("B03"));
  assert.deepEqual(decodeState(encodeState(state)), state);
  assert.equal(currentId(goBack(state)), "C06");
});

test("возврат к предыдущей ситуации убирает дальнейшие ответы", () => {
  let state = initialState;
  for (const choice of ["start", "review", "accepted", "basis", "gift", "predecessor", "basis"]) state = move(state, choice);
  assert.equal(currentId(state), "C05");
  assert.equal(state.trail.includes("B02"), false);
  state = move(state, "court");
  assert.equal(currentId(state), "B09");
  assert.equal(state.trail.includes("B02"), false);
});

test("испорченная или подменённая ссылка безопасно сбрасывается", () => {
  assert.deepEqual(decodeState("not-base64"), initialState);
  const invalid = { v: 1, trail: ["C01", "C19"], answers: {}, checks: {} };
  assert.deepEqual(decodeState(Buffer.from(JSON.stringify(invalid)).toString("base64url")), initialState);
});
