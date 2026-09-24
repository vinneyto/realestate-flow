import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Маршрут сделки — риелтор", description: "Интерактивная карта подготовки сделки с недвижимостью" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" suppressHydrationWarning><body>{children}</body></html>; }
