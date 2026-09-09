"use client";

import { useRealtime } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, ThumbsUp, ThumbsDown } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type FeedbackRating = "positive" | "negative" | null;

export function AngelTalk() {
  const { state, error, isMuted, startSession, endSession, toggleMute } = useRealtime();
  const [elapsed, setElapsed] = useState(0);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);

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

  // Reset feedback when starting a new session
  const handleStartSession = useCallback(async () => {
    setFeedbackRating(null);
    setFeedbackComment("");
    setFeedbackSent(false);
    setFeedbackSending(false);
    await startSession();
  }, [startSession]);

  const submitFeedback = useCallback(async () => {
    if (!feedbackRating) return;

    setFeedbackSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      });
    } catch {
      // Feedback submission is best-effort — don't block the user
    }
    setFeedbackSent(true);
    setFeedbackSending(false);
  }, [feedbackRating, feedbackComment]);

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
              onClick={handleStartSession}
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
            className="flex flex-col items-center gap-6 w-full max-w-xs"
          >
            {!feedbackSent ? (
              <>
                <p className="text-muted-foreground text-center text-lg">
                  How was your experience?
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setFeedbackRating("positive")}
                    className={`p-4 rounded-full border-2 transition-colors ${
                      feedbackRating === "positive"
                        ? "border-foreground bg-foreground/10"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <ThumbsUp className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setFeedbackRating("negative")}
                    className={`p-4 rounded-full border-2 transition-colors ${
                      feedbackRating === "negative"
                        ? "border-foreground bg-foreground/10"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <ThumbsDown className="h-6 w-6" />
                  </button>
                </div>

                {feedbackRating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex flex-col gap-3 w-full"
                  >
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Anything you'd like to share? (optional)"
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />

                    <Button
                      onClick={submitFeedback}
                      size="lg"
                      className="rounded-full w-full"
                      disabled={feedbackSending}
                    >
                      {feedbackSending ? "Sending…" : "Submit"}
                    </Button>
                  </motion.div>
                )}

                <button
                  onClick={() => setFeedbackSent(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-center text-lg">
                  What&apos;s alive in you?
                </p>
                <Button
                  onClick={handleStartSession}
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8"
                >
                  Talk again
                </Button>
              </>
            )}
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
              onClick={handleStartSession}
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
