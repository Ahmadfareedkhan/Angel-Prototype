"use client";

import { useCallback, useRef, useState } from "react";

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

  const cleanup = useCallback(() => {
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
  }, []);

  const endSession = useCallback(() => {
    cleanup();
    setIsMuted(false);
    setState("disconnected");
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

      // Create audio element inside user gesture for iOS autoplay policy
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audioRef.current = audio;

      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        audio.play().catch(() => {
          // Autoplay may still fail on some browsers — handled gracefully
        });
      };

      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        if (iceState === "disconnected" || iceState === "failed" || iceState === "closed") {
          cleanup();
          setState("disconnected");
        }
      };

      // Add mic track
      pc.addTrack(stream.getAudioTracks()[0], stream);

      // Set up data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Log session events for debugging — check for instruction leaks
          if (msg.type === "session.created" || msg.type === "session.updated") {
            console.log(`[oai-events] ${msg.type}`, Object.keys(msg));
          }
        } catch {
          // Non-JSON message, ignore
        }
      });

      // Create and send SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch("/api/session", {
        method: "POST",
        body: offer.sdp,
        headers: {
          "Content-Type": "application/sdp",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const answerSdp = await response.text();

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      setState("connected");
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

  return { state, error, isMuted, startSession, endSession, toggleMute };
}
