import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentNarrator, SpeechState } from '../utils/speechNarrator';

export function useSpeechNarrator(markdown: string) {
  const [speechState, setSpeechState] = useState<SpeechState>({
    isPlaying: false,
    isPaused: false,
    currentSentenceIndex: 0,
    totalSentences: 0,
    currentText: '',
    rate: 1.0,
  });

  const narratorRef = useRef<DocumentNarrator | null>(null);

  useEffect(() => {
    const narrator = new DocumentNarrator((state) => {
      setSpeechState(state);
    });
    narratorRef.current = narrator;

    return () => {
      narrator.destroy();
      narratorRef.current = null;
    };
  }, []);

  // Update markdown content in narrator when markdown changes and narrator is idle
  useEffect(() => {
    if (narratorRef.current) {
      narratorRef.current.setMarkdown(markdown);
    }
  }, [markdown]);

  const play = useCallback(() => {
    narratorRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    narratorRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    narratorRef.current?.stop();
  }, []);

  const setRate = useCallback((rate: number) => {
    narratorRef.current?.setRate(rate);
  }, []);

  const nextSentence = useCallback(() => {
    narratorRef.current?.next();
  }, []);

  const prevSentence = useCallback(() => {
    narratorRef.current?.prev();
  }, []);

  return {
    speechState,
    play,
    pause,
    stop,
    setRate,
    nextSentence,
    prevSentence,
  };
}
