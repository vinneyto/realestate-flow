import { cards, type CardId } from "./cards";

export type WorkflowState = { v: 1; trail: CardId[]; answers: Record<string, string>; checks: Record<string, number[]> };
export const initialState: WorkflowState = { v: 1, trail: ["C01"], answers: {}, checks: {} };
export const currentId = (state: WorkflowState): CardId => state.trail[state.trail.length - 1];

function asBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}
export function encodeState(state: WorkflowState): string { return asBase64Url(JSON.stringify(state)); }

export function decodeState(value: string | null): WorkflowState {
  if (!value || value.length > 12000) return initialState;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (!parsed || typeof parsed !== "object") return initialState;
    const candidate = parsed as Partial<WorkflowState>;
    if (candidate.v !== 1 || !Array.isArray(candidate.trail) || candidate.trail.length < 1 || candidate.trail.length > 100) return initialState;
    if (candidate.trail[0] !== "C01" || !candidate.trail.every(id => typeof id === "string" && id in cards)) return initialState;
    for (let i = 1; i < candidate.trail.length; i++) {
      const previous = cards[candidate.trail[i - 1]];
      if (!previous.choices?.some(choice => choice.next === candidate.trail![i])) return initialState;
    }
    const trail = candidate.trail as CardId[];
    const answers: Record<string, string> = {};
    if (candidate.answers && typeof candidate.answers === "object" && !Array.isArray(candidate.answers)) {
      for (const [id, answer] of Object.entries(candidate.answers)) {
        if (id in cards && typeof answer === "string" && cards[id as CardId].choices?.some(choice => choice.id === answer)) answers[id] = answer;
      }
    }
    const checks: Record<string, number[]> = {};
    if (candidate.checks && typeof candidate.checks === "object" && !Array.isArray(candidate.checks)) {
      for (const [id, indices] of Object.entries(candidate.checks)) {
        if (id in cards && Array.isArray(indices)) checks[id] = [...new Set(indices.filter(index => Number.isInteger(index) && index >= 0 && index < cards[id as CardId].checklist.length))];
      }
    }
    return { v: 1, trail, answers, checks };
  } catch { return initialState; }
}

export function takeChoice(state: WorkflowState, choiceId: string): WorkflowState {
  const current = currentId(state);
  const choice = cards[current].choices?.find(item => item.id === choiceId);
  if (!choice) return state;
  if (choice.next === current) return { ...state, answers: { ...state.answers, [current]: choiceId } };
  const visited = new Set(state.trail);
  // Revisiting an earlier situation starts a new path. Its earlier checklist may still be useful,
  // but subsequent answers and checks are cleared to avoid showing obsolete completion.
  const cut = state.trail.lastIndexOf(choice.next);
  const trail = cut >= 0 ? state.trail.slice(0, cut + 1) : [...state.trail, choice.next];
  const retained = new Set(trail);
  const answers = Object.fromEntries(Object.entries(state.answers).filter(([id]) => retained.has(id as CardId)));
  const checks = Object.fromEntries(Object.entries(state.checks).filter(([id]) => retained.has(id as CardId)));
  if (cut >= 0 || visited.has(choice.next)) delete answers[choice.next];
  if (retained.has(current)) answers[current] = choiceId;
  return { v: 1, trail, answers, checks };
}
export function goBack(state: WorkflowState): WorkflowState {
  if (state.trail.length < 2) return state;
  const trail = state.trail.slice(0, -1);
  const retained = new Set(trail);
  return { v: 1, trail, answers: Object.fromEntries(Object.entries(state.answers).filter(([id]) => retained.has(id as CardId))), checks: Object.fromEntries(Object.entries(state.checks).filter(([id]) => retained.has(id as CardId))) };
}
export function toggleCheck(state: WorkflowState, index: number): WorkflowState {
  const id = currentId(state);
  if (!Number.isInteger(index) || index < 0 || index >= cards[id].checklist.length) return state;
  const set = new Set(state.checks[id] ?? []);
  if (set.has(index)) set.delete(index); else set.add(index);
  return { ...state, checks: { ...state.checks, [id]: [...set].sort((a, b) => a - b) } };
}
