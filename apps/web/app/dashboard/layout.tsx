"use client";

import SignOutButton from "@/components/signout-button";
import { useServerInfo } from "@/hooks/use-server-info";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: serverInfoResponse, isLoading: isServerInfoLoading } =
    useServerInfo();

  return (
    <main className="flex flex-1 flex-col">
      <header>
        <div className="w-full flex justify-between items-center py-10 px-50">
          <h1>{serverInfoResponse?.data?.server.name}</h1>
          <SignOutButton />
        </div>
        {children}
      </header>
    </main>
  );
}
