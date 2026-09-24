"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Moon, RotateCcw, Sun } from "lucide-react";
import Button from "@/shared/ui/button";
import Card from "@/shared/ui/card";
import { basisIds, cards, coreIds, phases } from "./cards";
import { currentId, decodeState, encodeState, goBack, initialState, takeChoice, toggleCheck, type WorkflowState } from "./state";

function readUrl(): WorkflowState { return decodeState(new URLSearchParams(window.location.search).get("s")); }
function saveUrl(state: WorkflowState, push = true) {
  const url = new URL(window.location.href);
  if (state.trail.length === 1 && !Object.keys(state.checks).length) url.searchParams.delete("s");
  else url.searchParams.set("s", encodeState(state));
  window.history[push ? "pushState" : "replaceState"](null, "", url);
}

export default function WorkflowApp() {
  const [state, setState] = useState<WorkflowState>(initialState);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const selected = localStorage.getItem("workflow-theme") === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", selected === "dark");
    queueMicrotask(() => { setState(readUrl()); setTheme(selected); setReady(true); });
    const onPop = () => setState(readUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  function update(next: WorkflowState) { setState(next); saveUrl(next); setCopied(false); }
  function switchTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); localStorage.setItem("workflow-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }
  async function share() {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(window.location.href); setCopied(true); return; } catch { /* fallback below */ }
    }
    window.prompt("Скопируйте ссылку на маршрут", window.location.href);
  }

  const id = currentId(state);
  const card = cards[id];
  const visited = new Set(state.trail);
  const total = coreIds.length + 1;
  const completed = coreIds.filter(item => visited.has(item)).length + (basisIds.some(item => visited.has(item)) ? 1 : 0);
  const percent = id === "C19" ? 100 : Math.round((completed / total) * 100);
  const activePhase = phases.findIndex(phase => phase.id === card.phase);
  const selectedBasis = basisIds.find(item => visited.has(item));

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">m<span>→</span></div><div><strong>Маршрут сделки</strong><small>Интерактивный помощник риелтора</small></div></div>
      <div className="toolbar">
        <Button variant="ghost" className="icon-button" onClick={switchTheme} aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</Button>
        <Button variant="outline" onClick={share} className="share-button"><Copy size={16} />{copied ? "Ссылка скопирована" : "Поделиться"}</Button>
      </div>
    </header>

    <section className="hero" aria-label="Прогресс маршрута">
      <div className="hero-top"><div><span className="kicker">WORKFLOW / НЕДВИЖИМОСТЬ</span><h1>Каждый шаг сделки —<br /><em>на своём месте.</em></h1><p>Выбирайте ответ и двигайтесь по ситуации. При необходимости вернитесь к проверке или отправьте ссылку коллеге.</p></div><div className="progress-number"><strong>{percent}<span>%</span></strong><small>маршрута пройдено</small></div></div>
      <div className="meter" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс прохождения"><div style={{ width: `${percent}%` }} /></div>
      <div className="phase-grid">{phases.map((phase, index) => <div className={`phase ${index < activePhase ? "passed" : ""} ${index === activePhase ? "active" : ""}`} key={phase.id}><span className="phase-index">{index < activePhase ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span><span>{phase.label}</span></div>)}</div>
    </section>

    <div className="workarea">
      <aside className="sidebar" aria-label="Пройденный путь">
        <div className="sidebar-heading"><span>ВАШ МАРШРУТ</span><span>{state.trail.length} {state.trail.length === 1 ? "карточка" : "карточек"}</span></div>
        <ol className="timeline">{state.trail.map((item, index) => <li key={`${item}-${index}`} className={index === state.trail.length - 1 ? "current" : ""}><span className="timeline-dot">{index < state.trail.length - 1 ? <Check size={11} /> : index + 1}</span><div><small>{cards[item].eyebrow}</small><span>{cards[item].title}</span></div></li>)}</ol>
        <div className="privacy-note">В ссылке хранятся только выбранные шаги и отметки списка. Имена, документы и суммы здесь не записываются.</div>
      </aside>

      <div className="card-column">
        <div className="card-overline"><span>СИТУАЦИЯ {String(Math.max(1, coreIds.indexOf(id) + 1)).padStart(2, "0")}</span><span>{card.eyebrow}</span></div>
        <Card className="question-card">
          <div className="card-top"><div className="step-symbol">{id === "C19" ? <CheckCircle2 size={25} /> : id === "C20" ? <RotateCcw size={23} /> : <span>{card.id.startsWith("B") ? "↳" : "?"}</span>}</div><span className="card-code">{card.id}</span></div>
          <h2>{card.title}</h2><p className="description">{card.description}</p>
          {card.checklist.length > 0 && <section className="checklist"><h3>Что проверить <span>{(state.checks[id] ?? []).length}/{card.checklist.length}</span></h3><div className="checks">{card.checklist.map((item, index) => <label key={index} className="check-row"><input type="checkbox" checked={(state.checks[id] ?? []).includes(index)} onChange={() => update(toggleCheck(state, index))} /><span className="custom-check"><Check size={13} /></span><span>{item}</span></label>)}</div></section>}
          {card.choices && <section className="choices"><h3>{card.question}</h3><div className={id === "C05" ? "options basis-options" : "options"}>{card.choices.map(choice => <button className="option" key={choice.id} onClick={() => update(takeChoice(state, choice.id))}><span className="option-copy"><strong>{choice.label}</strong><small>{choice.hint}</small></span><ArrowRight size={19} aria-hidden="true" /></button>)}</div></section>}
          {id === "C19" && <div className="finish-note"><CheckCircle2 size={19} /> Маршрут пройден. Можно скопировать ссылку с итогом.</div>}
        </Card>
        <div className="card-footer"><Button variant="ghost" disabled={state.trail.length < 2} onClick={() => update(goBack(state))}><ArrowLeft size={16} /> Назад</Button><span>{selectedBasis ? `Ветка права: ${cards[selectedBasis].eyebrow.replace("Основание · ", "")}` : "Основание права будет выбрано на этапе проверки"}</span><Button variant="ghost" onClick={() => update(initialState)}><RotateCcw size={15} /> Сначала</Button></div>
        {!ready && <span className="sr-only">Загрузка маршрута</span>}
      </div>
    </div>
  </main>;
}
