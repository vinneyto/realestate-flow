import type { Metadata } from "next";
import ProcessMap from "./ProcessMap";
import "./map.css";

export const metadata: Metadata = { title: "Карта сделки — Маршрут сделки", description: "Интерактивная карта карточек, проверок и переходов сделки" };

export default function MapPage() { return <ProcessMap />; }
