import type { Metadata } from "next";
import "./workshop.css";

export const metadata: Metadata = {
  title: "onemillie",
  description: "Muziek van 1milli.prod en projecten van onemillie.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
