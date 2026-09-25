import assert from "node:assert/strict";
import test from "node:test";
import { cards } from "../src/features/workflow/cards.ts";
import { currentId, decodeState, encodeState, goBack, initialState, readStateFromSearch, takeChoice, toggleCardCheck, toggleCheck, writeStateToSearch } from "../src/features/workflow/state.ts";

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

test("один параметр s сохраняет маршрут, ответы и отметки", () => {
  let state = initialState;
  for (const choice of ["start", "review", "accepted", "basis", "gift", "predecessor", "advance", "payment", "deposit"]) state = move(state, choice);
  state = toggleCheck(state, 0);
  const params = writeStateToSearch(new URLSearchParams("utm=team"), state);
  assert.ok(params.get("s"));
  assert.equal(params.get("path"), null);
  assert.equal(params.get("done"), null);
  assert.equal(params.get("answer"), null);
  assert.equal(params.get("utm"), "team");
  assert.deepEqual(readStateFromSearch(params), state);
});

test("чекбокс на графе сохраняется в ссылке для любой карточки", () => {
  const checked = toggleCardCheck(initialState, "B05", 2);
  assert.deepEqual(readStateFromSearch(writeStateToSearch(new URLSearchParams(), checked)).checks.B05, [2]);
  assert.deepEqual(toggleCardCheck(checked, "B05", 2).checks.B05, []);
});

test("исходная ссылка с s продолжает открываться", () => {
  const old = new URLSearchParams({ s: encodeState(move(initialState, "start")) });
  const restored = readStateFromSearch(old);
  assert.equal(writeStateToSearch(old, restored).get("s"), old.get("s"));
});

test("ссылки с длинными названиями переводятся в s", () => {
  const previous = new URLSearchParams("path=client.object.legal-review.services.ownership.purchase&done=object.1&answer=ownership.purchase");
  const state = readStateFromSearch(previous);
  assert.equal(currentId(state), "B01");
  assert.deepEqual(state.checks.C02, [0]);
  const rewritten = writeStateToSearch(previous, state);
  assert.equal(rewritten.get("path"), null);
  assert.deepEqual(readStateFromSearch(rewritten), state);
});

test("ссылки с короткими кодами переводятся в s", () => {
  const previous = new URLSearchParams("path=C01.C02.C03.C04.C05.B01&done=C02.1&answer=C05.purchase");
  const state = readStateFromSearch(previous);
  assert.equal(currentId(state), "B01");
  const rewritten = writeStateToSearch(previous, state);
  assert.equal(rewritten.get("path"), null);
  assert.deepEqual(readStateFromSearch(rewritten), state);
});

test("ответ на вопрос и описание следующего шага хранятся отдельно", () => {
  assert.equal(cards.C12.question, "Пакет собран?");
  assert.equal(cards.C12.choices[0].label, "Да, пакет собран");
  assert.equal(cards.C12.choices[0].hint, "Актуальность сведений перед подписанием");
  for (const card of Object.values(cards)) for (const choice of card.choices ?? []) assert.ok(choice.label && choice.hint);
});
