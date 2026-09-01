import { AngelTalk } from "@/components/angel-talk";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6">
      <div className="flex flex-col items-center gap-12 w-full max-w-sm">
        <h1 className="text-3xl font-medium tracking-tight">Angel</h1>
        <AngelTalk />
      </div>
    </main>
  );
}
