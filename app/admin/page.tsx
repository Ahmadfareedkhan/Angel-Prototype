import Link from "next/link";
import { AdminPanel } from "@/components/admin-panel";

export default function AdminPage() {
  return (
    <main className="flex flex-col items-center min-h-dvh px-6 py-8">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Home
        </Link>
      </div>
      <div className="flex flex-col items-center gap-8 w-full mt-8">
        <h1 className="text-2xl font-medium tracking-tight">Angel — Admin</h1>
        <AdminPanel />
      </div>
    </main>
  );
}
