"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  applyNodeChanges, Background, BackgroundVariant, BaseEdge, Controls, Handle, MarkerType,
  MiniMap, Position, ReactFlow, ReactFlowProvider, useNodesInitialized,
  useReactFlow, type Edge, type EdgeProps, type Node, type NodeProps,
} from "@xyflow/react";
import { ArrowLeft, Expand, Focus, LayoutGrid, Moon, Shrink, Sun } from "lucide-react";
import Button from "@/shared/ui/button";
import { basisIds, cards, phases, type CardId } from "@/features/workflow/cards";
import { buildGraphConnections } from "@/features/workflow/graph";
import { currentId, initialState, readStateFromSearch, toggleCardCheck, writeStateToSearch, type WorkflowState } from "@/features/workflow/state";

type CardNode = Node<{ cardId: CardId }, "card">;
type BoardNode = CardNode | Node<{ label: string; number: number }, "stage">;
const connections = buildGraphConnections();
const choiceCount = Object.values(cards).reduce((total, card) => total + (card.choices?.length ?? 0), 0);
const cardWidth = 350, columnGap = 170;
const columnX = [0, cardWidth + columnGap, (cardWidth + columnGap) * 2];
const centerX = columnX[1], stageWidth = columnX[2] + cardWidth + 100;
const stageGap = 150, cardGap = 155;

type BoardContextValue = { state: WorkflowState; toggle: (id: CardId, index: number) => void; search: string };
const BoardContext = createContext<BoardContextValue | null>(null);

function WorkflowNode({ data }: NodeProps<CardNode>) {
  const context = useContext(BoardContext);
  if (!context) return null;
  const { state, toggle } = context;
  const card = cards[data.cardId], active = currentId(state) === card.id;
  const visited = state.trail.includes(card.id), checked = new Set(state.checks[card.id] ?? []);
  return <article className={`graph-card ${active ? "is-current" : ""} ${visited ? "is-visited" : ""} ${card.id === "C19" ? "is-finish" : ""}`}>
    <Handle id="in" type="target" position={Position.Top} />
    <Handle id="out" type="source" position={Position.Bottom} />
    <Handle id="basis-out" type="source" position={Position.Right} style={{ top: "70%" }} />
    <Handle id="branch-in" type="target" position={Position.Left} style={{ top: "50%" }} />
    <Handle id="branch-out" type="source" position={Position.Right} style={{ top: "50%" }} />
    <header className="graph-card-heading"><span>{card.eyebrow}</span><b>{card.id}</b></header>
    <h2>{card.title}</h2><p>{card.description}</p>
    {card.checklist.length > 0 && <section className="graph-checks"><h3>Что проверить <span>{checked.size}/{card.checklist.length}</span></h3>
      {card.checklist.map((item, index) => <label className="graph-check nodrag" key={index}>
        <input type="checkbox" checked={checked.has(index)} onChange={() => toggle(card.id, index)} /><span>{item}</span>
      </label>)}
    </section>}
    {card.choices && <section className="graph-choices"><h3>{card.question}</h3>
      {card.choices.map(choice => <div className="graph-choice" key={choice.id}>
        <strong>{choice.label}</strong><span>→ {cards[choice.next].title}</span><small>{choice.hint}</small>
      </div>)}
    </section>}
  </article>;
}

function StageNode({ data }: NodeProps<Node<{ label: string; number: number }, "stage">>) {
  return <div className="graph-stage"><div className="graph-stage-title"><span>{String(data.number).padStart(2, "0")}</span>{data.label}</div></div>;
}

function BranchEdge({ source, target, sourceX, sourceY, targetX, targetY, markerEnd, style }: EdgeProps) {
  const basis = (source.startsWith("B") ? source : target) as (typeof basisIds)[number];
  const column = basisIds.indexOf(basis) % 3;
  const lane = columnX[column] + cardWidth + columnGap / 2;
  const fromY = sourceY + cardGap * 0.38;
  const toY = targetY - cardGap * 0.38;
  const path = source.startsWith("B")
    ? `M ${sourceX} ${sourceY} L ${lane} ${sourceY} L ${lane} ${toY} L ${targetX} ${toY} L ${targetX} ${targetY}`
    : `M ${sourceX} ${sourceY} L ${sourceX} ${fromY} L ${lane} ${fromY} L ${lane} ${toY} L ${targetX} ${toY} L ${targetX} ${targetY}`;
  return <BaseEdge path={path}
    markerEnd={markerEnd} style={style} />;
}

function SideEdge({ sourceX, sourceY, targetX, targetY, markerEnd, style }: EdgeProps) {
  const lane = columnX[2] - columnGap / 2;
  const fromY = sourceY + cardGap * 0.38;
  const toY = targetY - cardGap * 0.38;
  return <BaseEdge path={`M ${sourceX} ${sourceY} L ${sourceX} ${fromY} L ${lane} ${fromY} L ${lane} ${toY} L ${targetX} ${toY} L ${targetX} ${targetY}`}
    markerEnd={markerEnd} style={style} />;
}

const nodeTypes = { card: WorkflowNode, stage: StageNode };
const edgeTypes = { branch: BranchEdge, side: SideEdge };
const initialNodes: BoardNode[] = Object.keys(cards).map(id => ({
  id, type: "card", position: { x: 0, y: 0 }, data: { cardId: id as CardId },
  draggable: false, style: { opacity: 0, width: cardWidth, zIndex: 2 },
}));
const edges: Edge[] = connections.filter(connection => !connection.backward).map(({ source, target, choices }) => {
  const lateral = source === "C03" && target === "C20" || source === "C09" && target === "C10";
  return {
    id: `${source}-${target}`, source, target,
    sourceHandle: source.startsWith("B") ? "basis-out" : lateral ? "branch-out" : "out",
    targetHandle: lateral ? "branch-in" : "in",
    type: source.startsWith("B") || target.startsWith("B") ? "branch" : source === "C10" && target === "C11" ? "side" : "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#868581" },
    style: { stroke: "#868581", strokeWidth: 1.65 },
    label: choices.length > 1 ? `${choices.length} варианта` : undefined, zIndex: 0,
  };
});

function GraphCanvas({ state, toggle, search }: BoardContextValue) {
  const [nodes, setNodes] = useState<BoardNode[]>(initialNodes);
  const [laidOut, setLaidOut] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardId>(currentId(state));
  const initialFocus = useRef(currentId(state));
  const initialized = useNodesInitialized();
  const flow = useReactFlow<BoardNode, Edge>();
  const boardContext = useMemo(() => ({ state, toggle, search }), [state, toggle, search]);
  const focusCard = useCallback((id: CardId, duration = 450) => {
    const node = flow.getNode(id);
    if (!node) return;
    void flow.setCenter(node.position.x + cardWidth / 2, node.position.y + (node.measured?.height ?? 400) / 2, { zoom: 0.9, duration });
  }, [flow]);
  const onNodesChange = useCallback((changes: Parameters<typeof applyNodeChanges<BoardNode>>[0]) => {
    setNodes(previous => applyNodeChanges(changes, previous));
  }, []);

  useEffect(() => {
    if (!initialized || laidOut) return;
    const height = (id: CardId) => nodes.find(node => node.id === id)?.measured?.height ?? 420;
    const positions = new Map<CardId, { x: number; y: number }>();
    const stages: BoardNode[] = [];
    let cursor = 0;
    function stage(number: number, ids: CardId[], arrange: (top: number) => number) {
      const start = cursor;
      cursor = arrange(start + 85);
      stages.push({ id: `stage-${number}`, type: "stage", position: { x: -50, y: start },
        data: { label: phases[number - 1].label, number }, draggable: false, selectable: false,
        style: { width: stageWidth, height: cursor - start + 35, zIndex: -1 },
      });
      cursor += stageGap;
      for (const id of ids) if (!positions.has(id)) throw new Error(`Нет позиции для ${id}`);
    }
    function stack(ids: CardId[], top: number, x = centerX) {
      let y = top;
      for (const id of ids) { positions.set(id, { x, y }); y += height(id) + cardGap; }
      return y;
    }
    stage(1, ["C01", "C02"], top => stack(["C01", "C02"], top));
    stage(2, ["C03", "C04", "C05", ...basisIds, "C06", "C20"], top => {
      const c03 = top;
      let y = stack(["C03", "C04", "C05"], top);
      positions.set("C20", { x: columnX[2], y: c03 });
      for (let row = 0; row < 3; row++) {
        const rowIds = basisIds.slice(row * 3, row * 3 + 3);
        rowIds.forEach((id, column) => positions.set(id, { x: columnX[column], y }));
        y += Math.max(...rowIds.map(height)) + cardGap;
      }
      positions.set("C06", { x: centerX, y });
      return y + height("C06") + cardGap;
    });
    stage(3, ["C07", "C08", "C09", "C10", "C11"], top => {
      let y = stack(["C07", "C08", "C09"], top);
      const c09 = positions.get("C09")!.y;
      positions.set("C10", { x: columnX[2], y: c09 });
      y = Math.max(y, c09 + height("C10") + cardGap);
      return stack(["C11"], y);
    });
    stage(4, ["C12", "C13", "C14", "C15"], top => stack(["C12", "C13", "C14", "C15"], top));
    stage(5, ["C16", "C17", "C18", "C19"], top => stack(["C16", "C17", "C18", "C19"], top));
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setNodes([...stages, ...nodes.map(node => ({ ...node, position: positions.get(node.id as CardId)!, style: { width: cardWidth, zIndex: 2 } }))]);
      setLaidOut(true);
    });
    return () => { cancelled = true; };
  }, [initialized, laidOut, nodes]);

  useEffect(() => {
    if (!laidOut) {
      initialFocus.current = currentId(state);
      queueMicrotask(() => setSelectedCard(currentId(state)));
    }
  }, [state, laidOut]);

  useEffect(() => {
    if (!laidOut) return;
    const frame = requestAnimationFrame(() => focusCard(initialFocus.current, 0));
    return () => cancelAnimationFrame(frame);
  }, [laidOut, focusCard]);

  return <BoardContext.Provider value={boardContext}>
    <div className="graph-workspace">
      <ReactFlow<BoardNode, Edge> nodes={nodes} edges={laidOut ? edges : []} onNodesChange={onNodesChange} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        nodesDraggable={false} nodesConnectable={false} panOnDrag zoomOnPinch zoomOnScroll
        zIndexMode="manual" elevateNodesOnSelect={false} elevateEdgesOnSelect={false}
        minZoom={0.025} maxZoom={1.5} fitViewOptions={{ padding: 0.08, minZoom: 0.025 }}>
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Controls showInteractive={false} aria-label="Управление масштабом схемы" />
        <MiniMap pannable zoomable nodeColor={node => node.id.startsWith("stage-") ? "transparent" : node.id === currentId(state) ? "#f18d56" : "#b8aaa1"} />
      </ReactFlow>
      {!laidOut && <div className="graph-loading">Раскладываем карточки…</div>}
    </div>
    <div className="graph-jump">
      <select aria-label="Перейти к карточке" value={selectedCard} onChange={event => { const id = event.target.value as CardId; setSelectedCard(id); focusCard(id); }}>
        {Object.values(cards).map(card => <option key={card.id} value={card.id}>{card.id} · {card.title}</option>)}
      </select>
      <Button variant="outline" onClick={() => { setSelectedCard(currentId(state)); focusCard(currentId(state)); }} aria-label="К текущей карточке"><Focus size={17} /><span>Текущая</span></Button>
      <Button variant="outline" onClick={() => flow.fitView({ padding: 0.07, duration: 500, minZoom: 0.025 })} aria-label="Показать весь граф"><LayoutGrid size={17} /><span>Весь граф</span></Button>
    </div>
  </BoardContext.Provider>;
}

export default function ProcessMap() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [state, setState] = useState<WorkflowState>(initialState);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const board = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("workflow-theme") === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", stored === "dark");
    queueMicrotask(() => { setTheme(stored); setState(readStateFromSearch(new URLSearchParams(window.location.search))); setSearch(window.location.search); });
    const onPop = () => { setState(readStateFromSearch(new URLSearchParams(window.location.search))); setSearch(window.location.search); };
    const onFullscreen = () => setExpanded(Boolean(document.fullscreenElement));
    window.addEventListener("popstate", onPop);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { window.removeEventListener("popstate", onPop); document.removeEventListener("fullscreenchange", onFullscreen); };
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("workflow-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }
  function toggle(id: CardId, index: number) {
    const next = toggleCardCheck(state, id, index);
    setState(next);
    const url = new URL(window.location.href);
    url.search = writeStateToSearch(url.searchParams, next).toString();
    window.history.replaceState(null, "", url);
    setSearch(url.search);
  }
  async function toggleFullscreen() {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    if (board.current?.requestFullscreen) { try { await board.current.requestFullscreen(); return; } catch { /* CSS fallback */ } }
    setExpanded(value => !value);
  }

  return <main className="map-page">
    <header className="map-topbar">
      <div className="brand"><div className="brand-mark">m<span>→</span></div><div><strong>Маршрут сделки</strong><small>Карта процесса</small></div></div>
      <div className="map-topbar-actions">
        <span className="map-summary">{Object.keys(cards).length} карточек · {choiceCount} варианта ответа · 5 этапов</span>
        <Button variant="ghost" className="icon-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</Button>
        <Link className="map-back" href={`/${search}`} aria-label="К карточкам"><ArrowLeft size={16} /><span>К карточкам</span></Link>
      </div>
    </header>
    <div className={`map-board ${expanded ? "is-expanded" : ""}`} ref={board}>
      <div className="map-board-top">
        <div><strong>Карта сделки</strong><span>Перемещайте холст мышью или пальцем · прокручивайте для масштаба</span></div>
        <Button variant="outline" onClick={toggleFullscreen} aria-label={expanded ? "Закрыть полноэкранную схему" : "Открыть схему на весь экран"}>
          {expanded ? <Shrink size={18} /> : <Expand size={18} />}<span>{expanded ? "Свернуть" : "На весь экран"}</span>
        </Button>
      </div>
      <ReactFlowProvider><GraphCanvas state={state} toggle={toggle} search={search} /></ReactFlowProvider>
    </div>
  </main>;
}
