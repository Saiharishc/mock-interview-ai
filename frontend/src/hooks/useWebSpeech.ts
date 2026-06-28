import { useCallback, useEffect, useRef, useState } from "react";

// Augment window types for non-standard SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

interface UseWebSpeech {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, voiceURI?: string) => void;
  cancel: () => void;
  voices: SpeechSynthesisVoice[];
}

export function useWebSpeech(): UseWebSpeech {
  const SpeechRec =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;
  const isSupported = !!SpeechRec;

  const recRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices (async on Chrome)
  useEffect(() => {
    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRec || isListening) return;
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setInterimTranscript(interim);
      if (final) {
        setFinalTranscript(final);
        setInterimTranscript("");
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recRef.current = rec;
    rec.start();
    setIsListening(true);
    setInterimTranscript("");
    setFinalTranscript("");
  }, [SpeechRec, isListening]);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string, voiceURI?: string) => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1.0;
    if (voiceURI) {
      const v = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
      if (v) utt.voice = v;
    }
    window.speechSynthesis.speak(utt);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    stopListening();
  }, [stopListening]);

  useEffect(() => () => cancel(), [cancel]);

  return { isSupported, isListening, interimTranscript, finalTranscript, startListening, stopListening, speak, cancel, voices };
}
