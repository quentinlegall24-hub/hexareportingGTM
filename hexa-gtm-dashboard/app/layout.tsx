import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hexa GTM Dashboard",
  description: "Commercial performance dashboard for Hexa portfolio startups",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
