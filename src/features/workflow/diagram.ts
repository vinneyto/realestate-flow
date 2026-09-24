import { basisIds, cards, phases, type CardId } from "./cards";

// Short labels keep the complete graph legible; the source of nodes and edges is cards.ts.
const labels: Record<CardId, string> = {
  C01: "Клиент и объект", C02: "Исходные сведения", C03: "Проверка юриста",
  C04: "Договор услуг", C05: "Основание права", C06: "Предыдущий собственник",
  C07: "Документы аванса", C08: "Тип платежа (3)", C09: "Соглашение и платёж",
  C10: "Ожидание платежа", C11: "Открытые вопросы", C12: "Пакет сделки",
  C13: "Актуальность справок", C14: "ДКП и акты", C15: "Подписание",
  C16: "Расчёты", C17: "Ключи и акт", C18: "Комиссия и CRM",
  C19: "Сделка завершена", C20: "Объект в архиве",
  B01: "Купля-продажа", B02: "Дарение", B03: "Наследство",
  B04: "Реновация", B05: "Приватизация", B06: "ЖСК",
  B07: "Рента", B08: "ДДУ / инвестиции", B09: "Решение суда",
};

const order: CardId[] = ["C01", "C02", "C03", "C04", "C05", ...basisIds, "C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13", "C14", "C15", "C16", "C17", "C18", "C19", "C20"];
const position = new Map(order.map((id, index) => [id, index]));

export function buildWorkflowDiagram(): string {
  const lines = ["flowchart TB"];
  for (const [phaseIndex, phase] of phases.entries()) {
    lines.push(`  subgraph phase_${phase.id}["${phaseIndex + 1}. ${phase.label}"]`);
    for (const card of Object.values(cards).filter(item => item.phase === phase.id)) {
      if (card.id.startsWith("B")) continue;
      const label = `${card.id} · ${labels[card.id]}`;
      lines.push(card.id === "C05" ? `    ${card.id}{"${label}"}` : card.id === "C19" || card.id === "C20" ? `    ${card.id}(["${label}"])` : `    ${card.id}["${label}"]`);
      if (card.id === "C05") {
        for (const id of basisIds) lines.push(`      ${id}["${id} · ${labels[id]}"]`);
      }
    }
    lines.push("  end");
  }

  const edges = new Set<string>();
  for (const card of Object.values(cards)) {
    for (const choice of card.choices ?? []) {
      const backwards = (position.get(choice.next) ?? 0) <= (position.get(card.id) ?? 0) && choice.next !== "C20";
      // Put the return arrow at the start of a top-to-bottom edge. This keeps
      // Mermaid's layout acyclic without reversing the meaning of the return.
      const edge = backwards && choice.next !== card.id
        ? `  ${choice.next} <-.- ${card.id}`
        : `  ${card.id} ${backwards ? "-.->" : "-->"} ${choice.next}`;
      edges.add(edge); // Multiple payment types may converge on the same card.
    }
  }
  lines.push(...edges);
  lines.push("  classDef outcome fill:#f18d56,stroke:#d97742,color:#211914");
  lines.push("  class C19 outcome");
  return lines.join("\n");
}

export const diagramStats = {
  cards: Object.keys(cards).length,
  choices: Object.values(cards).reduce((count, card) => count + (card.choices?.length ?? 0), 0),
  ownershipBases: basisIds.length,
};
