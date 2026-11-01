"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  async function signOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.add({
        title: "Fehler beim Abmelden",
        description: error.message,
      });
      return;
    }
    router.push("/login");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Hallo {session?.user.name}</h1>
      <Button variant="outline" type="button" onClick={signOut}>
        Logout
      </Button>
    </main>
  );
}
