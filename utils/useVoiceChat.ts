import { useEffect, useRef, useState } from 'react';

interface VoiceChatProps {
  onUserTranscript: (transcript: string) => void;
  onAiResponse: (text: string) => void;
}

const patienceInMs = 4000; // Ms it waits for new inputs in the same phrase
const quickResponseThreshold = 30; // Character limit for quicker responses

export function useVoiceChat({ onUserTranscript, onAiResponse }: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<string>("en-US");

  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [lastHeard, setLastHeard] = useState<number>();
  const [fullTranscript, setFullTranscript] = useState<string>();

  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldRestartRef = useRef(false);


  // Server coms methods
  const sendFullTranscript = (input: string) => {
    if (input) {
      onUserTranscript(input);
      socketRef.current?.send(JSON.stringify({
        type: "chat_text",
        text: input,
      }));
      setFullTranscript(undefined);
    }
  }
  // Patience methods
  const startPatience = () => {
    const now = new Date();
    setLastHeard(now.getTime());
    setIsWaiting(true);
  }
  const resetPatience = () => {
    setIsWaiting(false);
    setLastHeard(undefined);
  }

  // Patience Feature
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldNotWait = (fullTranscript ?? '').length <= quickResponseThreshold;
  useEffect(()=>{
    if(!isWaiting || !lastHeard) return;
    // Check time every 100ms to see if user has anything else to say
    const check = () => {
      const now = Date.now();
      if(!isWaiting) {
        return; // Stops waiting (due to some user input)
      }

      // Waited enough, now send full transcript to the server for prompt processing
      if ((now - lastHeard > patienceInMs) || shouldNotWait) {
        console.log("SENDING SHIT");
        sendFullTranscript(fullTranscript ?? "...");
        resetPatience();
        return;
      }
      console.log('...?');
      timeoutIdRef.current = setTimeout(check, 100); // check again in 1 second
    };

    check(); // start loop

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [isWaiting, lastHeard])

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      shouldRestartRef.current = false;
      recognition.stop();
    } else {
      shouldRestartRef.current = true;
      recognition.start();
    }
  };

  // Setups
  
  /// WebSockets
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:10000/api/ws");

    socket.onopen = () => console.log("WebSocket connected");
    socket.onclose = () => console.log("WebSocket disconnected");

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);
        if (message.type === 'ai_response_text') {
          onAiResponse(message.text);
        }
      } else if (event.data instanceof Blob) {
        setIsSpeaking(true);

        // Stops previous audio if still in progress
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current = null;
        }

        const audioUrl = URL.createObjectURL(event.data);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.play();
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };
      }
    };

    socketRef.current = socket;

    return () => socket.close();
  }, [onAiResponse]);

  /// Speech recognition (reruns when language changes)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Removes the old one if exists
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setIsWaiting(false);

    };
    recognition.onend = () => {
      setIsListening(false);
      setIsWaiting(true);
      recognition.start(); // Keeps listening
    };

    recognition.onspeechstart = () => {
      console.log("Started hearing speech");
    };

    recognition.onerror = (event) => console.error("Speech recognition error", event.error);
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      setFullTranscript(prev => prev ? `${prev}, ${transcript}` : transcript);
      startPatience();
    };

    recognitionRef.current = recognition;

    // If was already listening, restart with new config
    if (shouldRestartRef.current) {
      recognition.start();
    }

    return () => {
      recognition.stop();
    };
  }, [language, onUserTranscript]);

  return { isListening, isSpeaking, toggleListening, setLanguage };
}
