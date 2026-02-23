import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Babysitting",
  description:
    "Trusted childcare in Palm Beach — CPR certified, background checked, and experienced. Book babysitting with Natalia today.",
};

export default function BabysittingLayout({
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
