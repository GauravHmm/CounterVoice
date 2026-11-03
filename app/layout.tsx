import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CounterVoice — Think under pressure",
  description: "An intellectual sparring partner for your ideas.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
