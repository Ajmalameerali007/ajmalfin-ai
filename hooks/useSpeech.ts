
import { useState, useEffect, useCallback } from 'react';

// TypeScript definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'en-US';
      rec.interimResults = false;

      rec.onresult = (event: any) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        setIsListening(false);
      };
      
      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please enable it in your browser settings.');
        } else if (event.error === 'no-speech') {
            setError('No speech was detected. Please try again.');
        }
        else {
            setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        // This is called when recognition ends, either by choice or automatically.
        // We only set listening to false here if it was still considered 'on'.
        if (isListening) {
          setIsListening(false);
        }
      };

      setRecognition(rec);
    }
  }, []); // isListening removed from dependencies to avoid re-creating recognition object

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript('');
      setError(''); // Clear previous errors
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        setError("Could not start listening. Please check microphone permissions.");
        setIsListening(false);
      }
    }
  }, [recognition, isListening]);
  
  const stopListening = useCallback(() => {
    if (recognition && isListening) {
        recognition.stop();
        setIsListening(false);
    }
  }, [recognition, isListening]);

  return { isListening, transcript, startListening, stopListening, setTranscript, error };
};
