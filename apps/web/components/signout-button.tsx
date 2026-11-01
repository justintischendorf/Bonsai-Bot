"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { resetLoadingScreen } from "@/components/loading-screen";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { toast } from "./ui/toast";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.add({
        title: "Fehler beim Abmelden",
        description: error.message,
      });
      return;
    }
    resetLoadingScreen();
    router.push("/login");
  }

  return (
    <Button
      className="flex"
      variant="destructive"
      type="button"
      onClick={signOut}
    >
      <LogOut />
      Sign Out
    </Button>
  );
}
