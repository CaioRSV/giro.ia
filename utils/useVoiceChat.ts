import { useEffect, useRef, useState } from 'react';

interface VoiceChatProps {
  onUserTranscript: (transcript: string) => void;
  onAiResponse: (text: string) => void;
}

export function useVoiceChat({ onUserTranscript, onAiResponse }: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // This function is now the single point of control for the microphone
  const toggleListening = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    }
  };

  useEffect(() => {
    // This effect runs only once to set up the WebSocket and SpeechRecognition
    const connectSocket = () => {
      const socket = new WebSocket("ws://localhost:3000/api/ws");
      
      socket.onopen = () => console.log("WebSocket connected");
      socket.onclose = () => {
        console.log("WebSocket disconnected");
        // Optional: you can add reconnect logic here if you want
      };
      
      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data);
          if (message.type === 'ai_response_text') {
            onAiResponse(message.text);
          }
        } else if (event.data instanceof Blob) {
          setIsSpeaking(true);
          const audioUrl = URL.createObjectURL(event.data);
          const audio = new Audio(audioUrl);
          audio.play();
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
        }
      };
      
      socketRef.current = socket;
    };

    connectSocket();

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => console.error("Speech recognition error", event.error);
        
        recognition.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript.trim();
          if (transcript) {
            onUserTranscript(transcript);
            socketRef.current?.send(JSON.stringify({
              type: "chat_text",
              text: transcript,
            }));
          }
        };
        
        recognitionRef.current = recognition;
      }
    }

    // The cleanup function
    return () => {
      recognitionRef.current?.stop();
      socketRef.current?.close();
    };
  }, [onUserTranscript, onAiResponse]); // The callbacks should be stable, if not, wrap them in useCallback in the parent component

  return { isListening, isSpeaking, toggleListening };
}