import assert from "node:assert/strict";
import test from "node:test";
import { cards } from "../src/features/workflow/cards.ts";
import { buildWorkflowDiagram, diagramStats } from "../src/features/workflow/diagram.ts";

test("схема содержит каждую карточку и все уникальные переходы маршрута", () => {
  const diagram = buildWorkflowDiagram();
  assert.equal(diagramStats.cards, 29);
  assert.equal(diagramStats.choices, 62);
  for (const card of Object.values(cards)) {
    assert.match(diagram, new RegExp(`^\\s*${card.id}[\\[{(]`, "m"));
    for (const next of new Set(card.choices?.map(choice => choice.next) ?? [])) {
      assert.ok(
        diagram.includes(`  ${card.id} --> ${next}`) ||
        diagram.includes(`  ${card.id} -.-> ${next}`) ||
        diagram.includes(`  ${next} <-.- ${card.id}`),
        `${card.id} → ${next} отсутствует в схеме`,
      );
    }
  }
  assert.match(diagram, /C03 --> C20/);
  assert.match(diagram, /C02 <-.- C20/);
  assert.match(diagram, /C02 <-.- C03/);
  assert.match(diagram, /C18 --> C19/);
  assert.equal(diagram.match(/C08 --> C09/g)?.length, 1);
});
