"use client";

import { LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useDiscordServerInfo } from "@/hooks/use-discord-server-info";
import { authClient } from "@/lib/auth-client";

const currentYear = new Date().getFullYear();

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    data: serverDiscordInfoResponse,
    isLoading: isDiscordServerInfoLoading,
  } = useDiscordServerInfo();

  async function signOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.add({
        title: "Fehler beim Abmelden",
        description: error.message,
      });
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col py-6 lg:py-10">
      <header className="flex items-center justify-between px-4 pb-4 gap-4 sm:px-8 lg:pb-10 xl:px-25">
        <Navigation />
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {isDiscordServerInfoLoading ? (
            <Skeleton className="w-42 h-8 rounded-full" />
          ) : (
            <div className="flex h-8 min-w-0 items-center gap-2 rounded-full border border-accent pl-1 pr-1 min-[360px]:pr-3">
              <Image
                loading="eager"
                src={serverDiscordInfoResponse?.data?.server.iconUrl || ""}
                alt=""
                width={24}
                height={24}
                className="shrink-0 rounded-full"
              ></Image>
              <span className="min-w-0 truncate text-sm font-medium max-[359px]:hidden">
                {serverDiscordInfoResponse?.data?.server.name}
              </span>
            </div>
          )}

          <Button
            className="flex"
            variant="destructive"
            type="button"
            aria-label="Abmelden"
            onClick={signOut}
          >
            <LogOut />
            <span className="hidden sm:inline">Abmelden</span>
          </Button>
        </div>
      </header>
      {children}
      <span className="text-center text-sm text-muted-foreground mt-auto px-4 pt-8 lg:pt-20">
        Copyright © {currentYear} Bonsai Bot. Alle Rechte vorbehalten.
      </span>
    </main>
  );
}
