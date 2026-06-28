import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useInterviewSocket, type Evaluation } from "@/hooks/useInterviewSocket";
import { useWebSpeech } from "@/hooks/useWebSpeech";
import { QuestionPanel } from "@/components/interview/QuestionPanel";
import { AnswerInput } from "@/components/interview/AnswerInput";
import { EvaluationCard } from "@/components/interview/EvaluationCard";
import { Transcript, type TranscriptEntry } from "@/components/interview/Transcript";
import { Timer } from "@/components/interview/Timer";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

interface ActiveQuestion {
  id: number;
  order: number;
  text: string;
  topic: string | null;
  isFollowup: boolean;
}

export function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sock = useInterviewSocket();
  const speech = useWebSpeech();

  const { data: sessionInfo } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => (await apiClient.get(`/sessions/${sessionId}`)).data,
    enabled: !!sessionId,
  });

  const [mode, setMode] = useState<"practice" | "exam">("practice");
  const [numQuestions, setNumQuestions] = useState(5);
  const [durationMin, setDurationMin] = useState(
    () => sessionInfo?.session?.duration_min ?? 30,
  );
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (sessionInfo?.session?.duration_min) {
      setDurationMin(sessionInfo.session.duration_min);
    }
  }, [sessionInfo]);
  const [question, setQuestion] = useState<ActiveQuestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answer, setAnswer] = useState("");
  const [lastEval, setLastEval] = useState<Evaluation | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [, setReport] = useState<Report | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [drawer, setDrawer] = useState<{ title: string; content: string } | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const answerRef = useRef(answer);
  answerRef.current = answer;

  // Track finalized speech separately so interim display never wipes it
  const accumulatedSpeechRef = useRef("");

  useEffect(() => {
    if (speech.finalTranscript) {
      accumulatedSpeechRef.current = (accumulatedSpeechRef.current + " " + speech.finalTranscript).trim();
      setAnswer(accumulatedSpeechRef.current);
    }
  }, [speech.finalTranscript]);

  useEffect(() => {
    if (speech.interimTranscript) {
      // Show accumulated finals + current interim without overwriting finals
      setAnswer((accumulatedSpeechRef.current + " " + speech.interimTranscript).trim());
    }
  }, [speech.interimTranscript]);

  // Register WS handler
  sock.onMessage((msg) => {
    if (msg.type === "session_start") {
      setMode(msg.mode as "practice" | "exam");
      setNumQuestions(msg.num_questions);
      setIsGenerating(true);
      setTimerRunning(true);
      setStatusMsg("Interview starting…");
    }
    if (msg.type === "question") {
      setIsGenerating(false);
      setLastEval(null);
      setAnswer("");
      accumulatedSpeechRef.current = "";
      const q: ActiveQuestion = {
        id: msg.id, order: msg.order, text: msg.text, topic: msg.topic, isFollowup: msg.is_followup,
      };
      setQuestion(q);
      setStatusMsg("");
      setAwaitingNext(false);
      speech.speak(msg.text, localStorage.getItem("preferred-voice-uri") ?? undefined);
    }
    if (msg.type === "answer_received") {
      setIsGenerating(false);
      setStatusMsg("Evaluating…");
      if (msg.evaluation) setLastEval(msg.evaluation);
      setTranscript((t) => {
        const prev = [...t];
        const idx = prev.findIndex((e) => e.questionId === msg.question_id);
        if (idx !== -1) {
          prev[idx] = { ...prev[idx], evaluation: msg.evaluation };
        }
        return prev;
      });
    }
    if (msg.type === "generating_report") {
      setQuestion(null);
      setStatusMsg("Generating your report…");
    }
    if (msg.type === "complete") {
      setReport(msg.report);
      setStatusMsg("");
      sock.disconnect();
      navigate(`/report/${sessionId}`, { state: { report: msg.report } });
    }
    if (msg.type === "awaiting_next") {
      setAwaitingNext(true);
      setStatusMsg("");
    }
    if (msg.type === "paused") setIsPaused(true);
    if (msg.type === "resumed") setIsPaused(false);
    if (msg.type === "error") setStatusMsg(`Error: ${msg.message}`);
    if (msg.type === "cancelled") navigate("/dashboard");
  });

  // Connect on mount
  useEffect(() => {
    if (!sessionId) return;
    sock.connect(Number(sessionId));
    return () => {
      speech.cancel();
      sock.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function submitAnswer() {
    if (!question || !answer.trim()) return;
    speech.cancel();
    speech.stopListening();
    sock.send({ type: "answer", question_id: question.id, transcript: answer.trim() });
    setTranscript((t) => [
      ...t,
      { questionId: question.id, order: question.order, questionText: question.text, answerText: answer.trim() },
    ]);
    setIsGenerating(true);
    setStatusMsg("Submitting…");
  }

  async function viewAnswer() {
    if (!question || !sessionId) return;
    setDrawerLoading(true);
    setDrawer(null);
    try {
      const res = await apiClient.get(`/sessions/${sessionId}/questions/${question.id}/reference-answer`);
      setDrawer({ title: "Key Answer", content: res.data.reference_answer });
    } catch {
      setDrawer({ title: "Key Answer", content: "Failed to load. Please try again." });
    } finally {
      setDrawerLoading(false);
    }
  }

  async function modifyAnswer() {
    if (!question || !sessionId || !answer.trim()) return;
    setDrawerLoading(true);
    setDrawer(null);
    try {
      const res = await apiClient.post(`/sessions/${sessionId}/questions/${question.id}/modify-answer`, { answer });
      setDrawer({ title: "Improved Answer", content: res.data.modified_answer });
    } catch {
      setDrawer({ title: "Improved Answer", content: "Failed to improve answer. Please try again." });
    } finally {
      setDrawerLoading(false);
    }
  }

  function nextQuestion() {
    setAwaitingNext(false);
    setLastEval(null);
    setQuestion(null);
    setIsGenerating(true);
    setStatusMsg("Generating next question…");
    sock.send({ type: "next_question" });
  }

  function togglePause() {
    if (isPaused) {
      sock.send({ type: "resume" });
    } else {
      sock.send({ type: "pause" });
      speech.cancel();
    }
  }

  if (sock.status === "connecting") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Connecting to interview session…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {mode === "practice" ? "Practice mode — feedback after each answer" : "Exam mode — feedback at the end"}
        </div>
        <div className="flex items-center gap-3">
          <Timer durationMin={durationMin} running={timerRunning && !isPaused} onExpire={() => sock.send({ type: "cancel" })} />
          <Button variant="outline" size="sm" onClick={togglePause}>
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => sock.send({ type: "cancel" })}>
            End interview
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div className="text-sm text-muted-foreground animate-pulse">{statusMsg}</div>
      )}

      {/* Active question */}
      {(question || isGenerating) && (
        <QuestionPanel
          order={question?.order ?? 0}
          total={numQuestions}
          text={question?.text ?? ""}
          topic={question?.topic ?? null}
          isFollowup={question?.isFollowup ?? false}
          isGenerating={isGenerating && !question}
        />
      )}

      {/* Answer input */}
      {question && !isPaused && (
        <AnswerInput
          value={answer}
          onChange={setAnswer}
          onSubmit={submitAnswer}
          onViewAnswer={viewAnswer}
          onModifyAnswer={modifyAnswer}
          isListening={speech.isListening}
          onToggleMic={() => (speech.isListening ? speech.stopListening() : speech.startListening())}
          voiceSupported={speech.isSupported}
          disabled={isGenerating || awaitingNext}
        />
      )}

      {/* Evaluation (practice mode: shown immediately) */}
      {mode === "practice" && lastEval && (
        <EvaluationCard evaluation={lastEval} />
      )}

      {/* Next Question button */}
      {awaitingNext && (
        <div className="flex justify-end">
          <Button onClick={nextQuestion} size="lg">
            Next Question →
          </Button>
        </div>
      )}

      {/* Transcript */}
      <Transcript entries={transcript} />

      {/* Drawer for View Answer / Modify Answer */}
      <Drawer
        open={drawerLoading || drawer !== null}
        onClose={() => { setDrawer(null); setDrawerLoading(false); }}
        title={drawer?.title ?? "Loading…"}
      >
        {drawerLoading ? (
          <div className="text-muted-foreground animate-pulse text-sm">Generating…</div>
        ) : drawer ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Question</div>
              <p className="text-sm font-medium">{question?.text}</p>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{drawer.content}</p>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
