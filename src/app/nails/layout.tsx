import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Nails",
  description:
    "Premium nail services in Palm Beach — manicures, pedicures, acrylics, and nail art. Book your appointment with Natalia today.",
};

export default function NailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100dvh-8rem)]">{children}</main>
      <Footer />
    </>
  );
}
