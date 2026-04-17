import {
  AppSidebar,
  MobileNav,
  MobileTopBar,
} from "@/components/app/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    typeof meta.display_name === "string" && meta.display_name.trim().length > 0
      ? (meta.display_name as string)
      : null;

  return (
    <div className="shell">
      <AppSidebar email={user.email} displayName={displayName} />
      <div className="flex min-w-0 min-h-screen flex-1 flex-col overflow-y-auto">
        <MobileTopBar email={user.email} displayName={displayName} />
        <div className="main-content flex-1">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}
