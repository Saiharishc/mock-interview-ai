import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export type WSMsg =
  | { type: "session_start"; session_id: number; mode: string; num_questions: number }
  | { type: "question"; id: number; order: number; text: string; topic: string | null; is_followup: boolean }
  | { type: "answer_received"; question_id: number; evaluation?: Evaluation }
  | { type: "generating_report" }
  | { type: "complete"; report: Report }
  | { type: "paused" }
  | { type: "resumed" }
  | { type: "cancelled" }
  | { type: "awaiting_next" }
  | { type: "ping" }
  | { type: "error"; message: string };

export interface Evaluation {
  scores: Record<string, number>;
  score_10: number;
  feedback: { good: string; missing: string; better_answer: string; best_practices: string };
}

export interface Report {
  overall_score: number;
  topic_scores: Record<string, number>;
  strong_areas: string[];
  weak_areas: string[];
  recommended_topics: string[];
  suggestions: string[];
  summary: string;
}

interface UseSock {
  status: "idle" | "connecting" | "connected" | "error" | "done";
  send: (msg: object) => void;
  onMessage: (handler: (msg: WSMsg) => void) => void;
  connect: (sessionId: number) => void;
  disconnect: () => void;
}

export function useInterviewSocket(): UseSock {
  const [status, setStatus] = useState<UseSock["status"]>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<((msg: WSMsg) => void) | null>(null);

  const connect = useCallback((sessionId: number) => {
    const token = useAuthStore.getState().token;
    const wsBase = import.meta.env.VITE_WS_BASE_URL;
    const url = wsBase
      ? `${wsBase}/ws/interview/${sessionId}?token=${token}`
      : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/interview/${sessionId}?token=${token}`;
    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as WSMsg;
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
      handlerRef.current?.(msg);
    };
    ws.onerror = () => setStatus("error");
    ws.onclose = () => {
      if (status !== "done") setStatus("idle");
    };
  }, [status]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("done");
  }, []);

  const send = useCallback((msg: object) => {
    wsRef.current?.send(JSON.stringify(msg));
  }, []);

  const onMessage = useCallback((handler: (msg: WSMsg) => void) => {
    handlerRef.current = handler;
  }, []);

  useEffect(() => () => wsRef.current?.close(), []);

  return { status, send, onMessage, connect, disconnect };
}
