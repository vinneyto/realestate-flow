import type { Metadata } from "next";
import ProcessMap from "./ProcessMap";
import "./map.css";

export const metadata: Metadata = { title: "Диаграмма сделки — Маршрут сделки", description: "Интерактивная диаграмма карточек, проверок и переходов сделки" };

export default function MapPage() { return <ProcessMap />; }
