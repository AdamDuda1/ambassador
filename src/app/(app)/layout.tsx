import "./globals.css";

import { AppImpersonationPill } from "@/components/app-impersonation-pill";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <AppImpersonationPill />
    </>
  );
}
