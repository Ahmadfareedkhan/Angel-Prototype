"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";

type AdminView = "login" | "editor";

interface FeedbackEntry {
  id: string;
  rating: "positive" | "negative";
  comment: string;
  timestamp: string;
}

export function AdminPanel() {
  const [view, setView] = useState<AdminView>("login");
  const [password, setPassword] = useState("");
  const [instructions, setInstructions] = useState("");
  const [source, setSource] = useState<"default" | "custom">("default");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const authHeader = useCallback(() => {
    return { Authorization: `Bearer ${password}` };
  }, [password]);

  const loadInstructions = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/instructions", {
        headers: authHeader(),
      });

      if (res.status === 401) {
        setView("login");
        setMessage({ text: "Invalid password.", type: "error" });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessage({ text: data.error || "Failed to load", type: "error" });
        return;
      }

      const data = await res.json();
      setInstructions(data.instructions);
      setSource(data.source);
      setView("editor");
    } catch {
      setMessage({ text: "Network error. Try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/admin/feedback", {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback ?? []);
      }
    } catch {
      // Non-critical — don't show error for feedback loading
    } finally {
      setFeedbackLoading(false);
    }
  }, [authHeader]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    await loadInstructions();
    await loadFeedback();
  };

  const handleSave = async () => {
    if (!instructions.trim()) {
      setMessage({ text: "Instructions cannot be empty.", type: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/instructions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ instructions }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessage({ text: data.error || "Failed to save", type: "error" });
        return;
      }

      setSource("custom");
      setMessage({ text: "Instructions saved. New conversations will use these.", type: "success" });
    } catch {
      setMessage({ text: "Network error. Try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset to the default instructions from the codebase? Your custom edits will be removed.")) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/instructions", {
        method: "DELETE",
        headers: authHeader(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessage({ text: data.error || "Failed to reset", type: "error" });
        return;
      }

      await loadInstructions();
      setMessage({ text: "Reset to default instructions.", type: "success" });
    } catch {
      setMessage({ text: "Network error. Try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {view === "login" && (
          <motion.form
            key="login"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleLogin}
            className="flex flex-col items-center gap-6"
          >
            <p className="text-muted-foreground text-center">
              Enter admin password to edit Angel&apos;s instructions.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full max-w-xs px-4 py-3 rounded-lg border border-border bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />

            <Button
              type="submit"
              size="lg"
              className="rounded-full px-10"
              disabled={loading || !password.trim()}
            >
              {loading ? "Checking…" : "Enter"}
            </Button>

            {message && (
              <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                {message.text}
              </p>
            )}
          </motion.form>
        )}

        {view === "editor" && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {source === "custom" ? "Custom instructions" : "Default instructions (from codebase)"}
              </p>
              {source === "custom" && (
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  className="text-muted-foreground"
                >
                  Reset to default
                </Button>
              )}
            </div>

            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={20}
              spellCheck={false}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSave}
                size="lg"
                className="rounded-full px-8"
                disabled={saving || !instructions.trim()}
              >
                {saving ? "Saving…" : "Save Instructions"}
              </Button>
            </div>

            {message && (
              <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                {message.text}
              </p>
            )}

            {/* Feedback viewer */}
            <div className="mt-8 pt-8 border-t border-border w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Feedback</h2>
                <Button
                  onClick={loadFeedback}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={feedbackLoading}
                >
                  {feedbackLoading ? "Loading…" : "Refresh"}
                </Button>
              </div>

              {feedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {feedback.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border"
                    >
                      <div className="mt-0.5">
                        {entry.rating === "positive" ? (
                          <ThumbsUp className="h-4 w-4 text-foreground/60" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-foreground/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {entry.comment && (
                          <p className="text-sm text-foreground leading-relaxed">
                            {entry.comment}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
