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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    const connectSocket = () => {
      const socket = new WebSocket(`ws://localhost:10000/api/ws`);

      socket.onopen = () => console.log("✅ WebSocket conectado");
      socket.onclose = () => console.warn("⚠️ WebSocket desconectado");
      socket.onerror = (event) => console.error("❌ Erro no WebSocket:", event);

      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data);
          if (message.type === 'ai_response_text') {
            onAiResponse(message.text);
          }
        } else if (event.data instanceof Blob) {
          setIsSpeaking(true);

          // Pausa reconhecimento de voz durante a fala do bot
          if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            console.log("🎤 Reconhecimento de voz pausado (fala do bot)");
          }

          const audioUrl = URL.createObjectURL(event.data);

          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            URL.revokeObjectURL(audioRef.current.src);
          }

          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.play();
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;

            // Retoma reconhecimento de voz após a fala do bot
            if (recognitionRef.current && !isListening) {
              recognitionRef.current.start();
              console.log("🎤 Reconhecimento de voz retomado após a fala do bot");
            }
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
        recognition.onend = () => {
          setIsListening(false);
          if (!isSpeaking) {
            recognition.start();
            console.log("🎤 Reconhecimento reiniciado automaticamente no onend");
          }
        };
        recognition.onerror = (event) => console.error("🎤 Erro no reconhecimento de voz:", event.error);

        recognition.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript.trim();

          if (transcript) {
            console.log("🎤 Usuário disse:", transcript);
            onUserTranscript(transcript);

            // Interrompe a fala do bot se ainda estiver tocando
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              URL.revokeObjectURL(audioRef.current.src);
              audioRef.current = null;
              setIsSpeaking(false);
              console.log("🛑 Fala do bot interrompida por fala do usuário");
            }

            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({
                type: "chat_text",
                text: transcript,
              }));
            } else {
              console.warn("WebSocket ainda não conectado. Mensagem não enviada.");
            }
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      recognitionRef.current?.stop();
      socketRef.current?.close();
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
    };
  }, [onUserTranscript, onAiResponse]);

  return { isListening, isSpeaking, toggleListening };
}
