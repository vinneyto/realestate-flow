import { basisIds, cards, type CardId } from "./cards";

export const graphOrder: CardId[] = [
  "C01", "C02", "C03", "C20", "C04", "C05", ...basisIds, "C06",
  "C07", "C08", "C09", "C10", "C11", "C12", "C13", "C14", "C15",
  "C16", "C17", "C18", "C19",
];

const rank = new Map(graphOrder.map((id, index) => [id, index]));

export type GraphConnection = {
  source: CardId;
  target: CardId;
  backward: boolean;
  choices: string[];
};

export function buildGraphConnections(): GraphConnection[] {
  const connections = new Map<string, GraphConnection>();
  for (const card of Object.values(cards)) {
    for (const choice of card.choices ?? []) {
      const key = `${card.id}:${choice.next}`;
      const existing = connections.get(key);
      if (existing) existing.choices.push(choice.label);
      else connections.set(key, {
        source: card.id,
        target: choice.next,
        backward: (rank.get(choice.next) ?? 0) <= (rank.get(card.id) ?? 0),
        choices: [choice.label],
      });
    }
  }
  return [...connections.values()];
}
