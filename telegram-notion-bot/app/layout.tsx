import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telegram Notion Bot",
  description: "Save Telegram links to Notion database",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
