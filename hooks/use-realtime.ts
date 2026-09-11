"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RealtimeState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseRealtimeReturn {
  state: RealtimeState;
  error: string | null;
  isMuted: boolean;
  startSession: () => Promise<void>;
  endSession: () => void;
  toggleMute: () => void;
}

export function useRealtime(): UseRealtimeReturn {
  const [state, setState] = useState<RealtimeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef(false);
  const finalizedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }

    readyRef.current = false;
  }, []);

  const endSession = useCallback(() => {
    const dc = dcRef.current;
    if (readyRef.current && dc && dc.readyState === "open") {
      dc.send(JSON.stringify({ type: "session.close" }));
      closeTimeoutRef.current = setTimeout(() => {
        cleanup();
        setState("disconnected");
      }, 15_000);
    } else {
      cleanup();
      setIsMuted(false);
      setState("disconnected");
    }
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  }, []);

  const startSession = useCallback(async () => {
    setState("connecting");
    setError(null);
    finalizedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audioRef.current = audio;

      pc.ontrack = (event) => {
        audio.srcObject = new MediaStream([event.track]);
        audio.play().catch(() => {
          // Autoplay may still fail on some browsers
        });
      };

      pc.addTrack(stream.getAudioTracks()[0], stream);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "session.started") {
            readyRef.current = true;
            setState("connected");
            // Trigger Angel to speak first with an introduction
            if (dc.readyState === "open") {
              dc.send(JSON.stringify({ type: "response.create" }));
            }
          } else if (msg.type === "session.closed") {
            finalizedRef.current = true;
            console.log("[gpt-live] Session closed", msg.usage);
            cleanup();
            setIsMuted(false);
            setState("disconnected");
          } else if (msg.type === "session.updated") {
            console.log("[gpt-live] Session updated");
          }
        } catch {
          // Non-JSON message, ignore
        }
      });

      dc.addEventListener("close", (event) => {
        if (event.target !== dc) return;
        if (!finalizedRef.current) {
          cleanup();
          setIsMuted(false);
          setState("disconnected");
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (pc.iceGatheringState !== "complete") {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            pc.removeEventListener("icegatheringstatechange", onState);
            reject(new Error("Timed out while gathering ICE candidates"));
          }, 10_000);
          function onState() {
            if (pc.iceGatheringState !== "complete") return;
            clearTimeout(timeout);
            pc.removeEventListener("icegatheringstatechange", onState);
            resolve();
          }
          pc.addEventListener("icegatheringstatechange", onState);
          onState();
        });
      }

      const sdp = pc.localDescription?.sdp;
      if (!sdp) throw new Error("Missing local SDP offer");

      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();

      await pc.setRemoteDescription({
        type: "answer",
        sdp: result.transport.sdp,
      });

      // session.started event on the data channel confirms connection
    } catch (err) {
      cleanup();

      let message = "Failed to start session";

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        message =
          "Microphone access was denied. Please allow microphone permission in your browser settings and try again.";
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        message = "No microphone found. Please connect a microphone and try again.";
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
      setState("error");
    }
  }, [cleanup]);

  // Clean up session on unmount (e.g. navigating away)
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { state, error, isMuted, startSession, endSession, toggleMute };
}
