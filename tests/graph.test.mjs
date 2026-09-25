import assert from "node:assert/strict";
import test from "node:test";
import { cards } from "../src/features/workflow/cards.ts";
import { buildGraphConnections, graphOrder } from "../src/features/workflow/graph.ts";

test("граф включает все карточки, ответы и возвраты", () => {
  const connections = buildGraphConnections();
  assert.equal(graphOrder.length, Object.keys(cards).length);
  assert.equal(new Set(graphOrder).size, graphOrder.length);
  assert.equal(connections.reduce((total, item) => total + item.choices.length, 0), 62);
  for (const card of Object.values(cards)) {
    for (const choice of card.choices ?? []) {
      assert.ok(connections.some(edge => edge.source === card.id && edge.target === choice.next && edge.choices.includes(choice.label)));
    }
  }
  assert.ok(connections.find(edge => edge.source === "C03" && edge.target === "C02")?.backward);
  assert.ok(connections.find(edge => edge.source === "C20" && edge.target === "C02")?.backward);
  assert.ok(connections.find(edge => edge.source === "C18" && edge.target === "C19")?.backward === false);
  assert.equal(connections.find(edge => edge.source === "C08" && edge.target === "C09")?.choices.length, 3);
});
