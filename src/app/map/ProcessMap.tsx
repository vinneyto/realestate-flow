"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Maximize2, Minus, Moon, Plus, Sun } from "lucide-react";
import Button from "@/shared/ui/button";
import { buildWorkflowDiagram, diagramStats } from "@/features/workflow/diagram";

const diagram = buildWorkflowDiagram();
let renderId = 0;
let renderQueue = Promise.resolve();

export default function ProcessMap() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const [renderAttempt, setRenderAttempt] = useState(0);
  const [returnHref, setReturnHref] = useState("/");
  const [copied, setCopied] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("workflow-theme") === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", stored === "dark");
    queueMicrotask(() => { setTheme(stored); setReturnHref(`/${window.location.search}`); });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        if (cancelled) return;
        mermaid.initialize({ startOnLoad: false, theme: theme === "dark" ? "dark" : "default", securityLevel: "strict", htmlLabels: false, flowchart: { look: "classic", wrappingWidth: 230, useMaxWidth: false, nodeSpacing: 28, rankSpacing: 46, curve: "basis" } });
        const id = `workflow-overview-${++renderId}`;
        const result = await mermaid.render(id, diagram);
        // Mermaid 12 omits the arrowhead on one-sided dotted backward links.
        // Restore its built-in start marker on those links after layout.
        const renderedSvg = result.svg.replace(/<path\b[^>]*class="[^"]*edge-pattern-dotted[^"]*"[^>]*>/g, path =>
          path.includes("marker-end=") ? path : path.replace(/>$/, ` marker-start="url(#${id}_flowchart-v2-pointStart)">`),
        );
        if (!cancelled) { setSvg(renderedSvg); setError(false); }
      } catch (cause) {
        console.error("Не удалось построить Mermaid-схему", cause);
        if (!cancelled) { setError(true); setSvg(""); }
      }
    }
    // Mermaid uses shared DOM and configuration; concurrent renders can corrupt one another.
    renderQueue = renderQueue.then(render);
    return () => { cancelled = true; };
  }, [theme, renderAttempt]);

  useEffect(() => {
    if (!svg) return;
    const frame = requestAnimationFrame(() => {
      const graph = viewport.current?.querySelector("svg");
      if (!graph || !viewport.current) return;
      const width = graph.viewBox.baseVal.width;
      if (width) setZoom(Math.max(0.08, Math.min(1, (viewport.current.clientWidth - 28) / width)));
    });
    return () => cancelAnimationFrame(frame);
  }, [svg]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("workflow-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }
  function fitDiagram() {
    const graph = viewport.current?.querySelector("svg");
    if (!graph || !viewport.current) return;
    const width = graph.viewBox.baseVal.width || graph.getBoundingClientRect().width / zoom;
    setZoom(Math.max(0.08, Math.min(1, (viewport.current.clientWidth - 28) / width)));
    viewport.current.scrollTo({ top: 0, left: 0 });
  }
  async function copySource() {
    try { await navigator.clipboard.writeText(diagram); setCopied(true); }
    catch { window.prompt("Скопируйте Mermaid-схему", diagram); }
  }

  return <main className="shell map-page">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">m<span>→</span></div><div><strong>Маршрут сделки</strong><small>Карта процесса</small></div></div>
      <div className="toolbar"><Button variant="ghost" className="icon-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</Button><Link className="map-back" href={returnHref} aria-label="К карточкам"><ArrowLeft size={16} /><span>К карточкам</span></Link></div>
    </header>
    <section className="map-heading"><div><span className="map-eyebrow">ОБЩАЯ КАРТИНА</span><h1>Схема процесса</h1><p>Все карточки и переходы: от первичных сведений до передачи объекта и закрытия сделки. Пунктир показывает возврат, повторную проверку или ожидание.</p></div><div className="map-counts"><strong>{diagramStats.cards}</strong> карточек <span>·</span> <strong>{diagramStats.choices}</strong> перехода <span>·</span> <strong>{diagramStats.ownershipBases}</strong> оснований права</div></section>
    <div className="map-controls"><div className="map-legend"><span className="solid-line" /> Следующий шаг <span className="dashed-line" /> Возврат / ожидание</div><div className="map-actions"><Button variant="outline" onClick={copySource} aria-label="Скопировать Mermaid-код"><Copy size={15} /><span>{copied ? "Скопировано" : "Mermaid"}</span></Button><Button variant="outline" onClick={() => setZoom(value => Math.max(0.08, +(value - 0.15).toFixed(2)))} aria-label="Уменьшить"><Minus size={16} /></Button><span className="zoom-label">{Math.round(zoom * 100)}%</span><Button variant="outline" onClick={() => setZoom(value => Math.min(2, +(value + 0.15).toFixed(2)))} aria-label="Увеличить"><Plus size={16} /></Button><Button variant="outline" onClick={fitDiagram} aria-label="Уместить схему по ширине"><Maximize2 size={16} /></Button></div></div>
    <div className="map-viewport" ref={viewport} aria-label="Mermaid-схема маршрута сделки">
      {error ? <div className="map-status">Не удалось построить схему. <Button variant="outline" onClick={() => setRenderAttempt(value => value + 1)}>Повторить</Button></div> : !svg ? <p className="map-status">Строим схему…</p> : <div className="map-diagram" style={{ zoom }} dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  </main>;
}
