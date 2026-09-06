import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hunar Hire — AI Hiring Assistant",
  description: "AI-powered candidate screening with Hunar Voice Agents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}