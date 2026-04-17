import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    typeof meta.display_name === "string" ? meta.display_name : "";

  return (
    <SettingsClient
      email={user.email}
      displayName={displayName}
      createdAt={user.created_at ?? null}
    />
  );
}
