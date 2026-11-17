"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import AuthHeader from "@/components/AuthHeader";
import AuthFooter from "@/components/AuthFooter";

import Footer from "@/components/Footer";
import CartToast from "@/components/CartToast";
import CookieConsent from "@/components/CookieConsent";
import SubHeader from "./SubHeader";

function ConditionalShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = [
    "/login",
    "/signup",
    "/cadastro",
    "/recuperar-senha",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isAuthPage) {
    return (
      <>
        <AuthHeader />
        {children}
        <AuthFooter />
        <CookieConsent />
      </>
    );
  }

  return (
    <>
      <Header />
      <SubHeader />

      <CartToast />
      {children}
      <Footer />
      <CookieConsent />
    </>
  );
}

export default function ConditionalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={children}>
      <ConditionalShellContent>{children}</ConditionalShellContent>
    </Suspense>
  );
}
