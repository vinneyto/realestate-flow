import type { Metadata } from "next";
import ProcessMap from "./ProcessMap";
import "./map.css";

export const metadata: Metadata = { title: "Граф сделки — Маршрут сделки", description: "Интерактивный граф всех карточек, проверок и переходов сделки" };

export default function MapPage() { return <ProcessMap />; }
