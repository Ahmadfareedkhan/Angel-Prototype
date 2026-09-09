import Link from "next/link";
import { AngelTalk } from "@/components/angel-talk";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-8">
      <div className="flex flex-col items-center gap-12 w-full max-w-sm flex-1 justify-center">
        <h1 className="text-3xl font-medium tracking-tight">Angel</h1>
        <AngelTalk />
      </div>
      <Link
        href="/admin"
        className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Admin
      </Link>
    </main>
  );
}
