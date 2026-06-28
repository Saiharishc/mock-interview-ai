export function BrowserWarning() {
  const hasSpeech =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  if (hasSpeech) return null;
  return (
    <div className="mx-auto max-w-6xl px-6 pt-4">
      <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
        Voice input (speech-to-text) is not supported in this browser. Please use Chrome or Edge for the best experience. Text input is always available as a fallback.
      </div>
    </div>
  );
}
