import type { Metadata } from "next";
import ProcessMap from "./ProcessMap";
import "./map.css";

export const metadata: Metadata = { title: "Схема процесса — Маршрут сделки", description: "Полный граф переходов между карточками сделки" };

export default function MapPage() { return <ProcessMap />; }
