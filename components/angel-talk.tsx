"use client";

import { useRealtime } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AngelTalk() {
  const { state, error, isMuted, startSession, endSession, toggleMute } = useRealtime();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state !== "connected") {
      setElapsed(0);
      return;
    }

    const maxSeconds = parseInt(
      process.env.NEXT_PUBLIC_MAX_SESSION_SECONDS || "600",
      10
    );

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= maxSeconds) {
          endSession();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state, endSession]);

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-6"
          >
            <p className="text-muted-foreground text-center text-lg leading-relaxed max-w-xs">
              A place to think something through.
            </p>
            <Button
              onClick={startSession}
              size="lg"
              className="h-14 px-10 text-lg rounded-full"
            >
              Talk
            </Button>
          </motion.div>
        )}

        {state === "connecting" && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex gap-1.5 items-center h-8">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-foreground/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
            <p className="text-muted-foreground text-sm">Connecting…</p>
          </motion.div>
        )}

        {state === "connected" && (
          <motion.div
            key="connected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-8"
          >
            {/* Breathing indicator */}
            <motion.div
              className="w-20 h-20 rounded-full bg-foreground/8 flex items-center justify-center"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <motion.div
                className="w-10 h-10 rounded-full bg-foreground/15"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.15,
                }}
              />
            </motion.div>

            <p className="text-muted-foreground text-sm tabular-nums">
              {formatTime(elapsed)}
            </p>

            <div className="flex gap-3 items-center">
              <Button
                onClick={toggleMute}
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full border-2"
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6 text-destructive" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              <Button
                onClick={endSession}
                variant="outline"
                size="lg"
                className="rounded-full px-8"
              >
                End
              </Button>
            </div>
          </motion.div>
        )}

        {state === "disconnected" && (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-6"
          >
            <p className="text-muted-foreground text-center text-lg">
              Take care of yourself.
            </p>
            <Button
              onClick={startSession}
              variant="outline"
              size="lg"
              className="rounded-full px-8"
            >
              Talk again
            </Button>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-6 max-w-xs"
          >
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              {error}
            </p>
            <Button
              onClick={startSession}
              variant="outline"
              size="lg"
              className="rounded-full px-8"
            >
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
