import { useEffect, useRef, useState } from 'react';

interface VoiceChatProps {
  onUserTranscript: (transcript: string) => void;
  onAiResponse: (text: string) => void;
}

enum StatusesEnum {
  Processing = "processing",
  Written = "written",
  Ready = "ready"
}

const patienceInMs = 1000; // Ms it waits for new inputs in the same phrase
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


  // Audio Methods
  const cleanAudioRef = () => {
    if(!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    URL.revokeObjectURL(audioRef.current.src);
    audioRef.current = null;
  }

  const playAudio = (audioPath: string, options?: {loop?: boolean, endSpeech?: boolean}) => {
    const audio = new Audio(audioPath);
    const shouldLoop = !!(options && !!options.loop);
    audio.loop = shouldLoop;
    audioRef.current = audio;

    audio.play();
    audio.onended = () => {
      if(shouldLoop) return;
      options?.endSpeech && setIsSpeaking(false);
      URL.revokeObjectURL(audioPath);
      cleanAudioRef();
    };
  }


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

  // Patience Feature

  /// Patience methods
  const startPatience = () => {
    const now = new Date();
    setLastHeard(now.getTime());
    setIsWaiting(true);
  }
  const resetPatience = () => {
    setIsWaiting(false);
    setLastHeard(undefined);
  }
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldNotWait = (fullTranscript ?? '').length <= quickResponseThreshold;

  /// Patience Checker
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

    /// Questions and answers
    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);
        if (message.type === 'ai_response_text') {
          onAiResponse(message.text);
          cleanAudioRef(); // Stops current audio sooner to prepare for new one (and not annoy the user tbf)
        }
        else if (message.type === "status") {
          cleanAudioRef();
          if(message.text == StatusesEnum.Processing) {
            playAudio("/sound1.mp3");
            // playAudio("/sound1.mp3", {loop: true});
          }
          if(message.text == StatusesEnum.Written) {
            playAudio("/sound1.mp3");
          }
          if(message.text == StatusesEnum.Ready) {
            playAudio("/sound2.mp3");
          }
        }
        else if (message.type === "mcp_flag"){
          console.log("yeah it used the API")
        }
      } else if (event.data instanceof Blob) {
        setIsSpeaking(true);

        // Stops previous audio if still in progress
        cleanAudioRef();

        const audioUrl = URL.createObjectURL(event.data);
        playAudio(audioUrl, {endSpeech: true});
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

    // recognition.onerror = (event) => console.error("Speech recognition error", event.error);
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
