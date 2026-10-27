import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "onemillie — Inrichting kiezen",
  description: "Bekijk 3D-ruimtes en modellen, kies aantallen en bewaar je inrichting.",
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
