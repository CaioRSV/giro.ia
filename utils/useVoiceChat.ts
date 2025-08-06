import { useEffect, useRef, useState } from 'react';

const resolvedPort = process.env.PORT;
interface VoiceChatProps {
  onUserTranscript: (transcript: string) => void;
  onAiResponse: (text: string) => void;
  lastMessagesContext?: string;
  language: string;
  patienceInMs: number; // Ms it waits for new inputs in the same phrase
}

export enum StatusesEnum {
  Processing = "processing",
  Written = "written",
  Ready = "ready"
}

const quickResponseThreshold = 30; // Character limit for quicker responses
export const cacheMemoryNumber = 20000 // Chars

export function useVoiceChat({ onUserTranscript, onAiResponse, lastMessagesContext, language, patienceInMs }: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [lastHeard, setLastHeard] = useState<number>();
  const [fullTranscript, setFullTranscript] = useState<string>();

  const [serverStatus, setServerStatus] = useState<StatusesEnum>();

  const [currBlob, setCurrBlob] = useState<Blob>();

  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldRestartRef = useRef(false);

  const [cachedInfo, setCachedInfo] = useState<string>();

  // Audio Methods
  const cleanAudioRef = () => {
    if(!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    URL.revokeObjectURL(audioRef.current.src);
    audioRef.current = null;
  }

    const [loudness, setLoudness] = useState(0);
    const rafRef = useRef<number>(null);

    const startLoudnessTracking = (audio: HTMLAudioElement) => {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setLoudness(Math.sqrt(sum / data.length));
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();

      audio.onended = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        analyser.disconnect();
        source.disconnect();
        ctx.close();
        setLoudness(0); // reset
      };
    };

  const playAudio = (audioPath: string, options?: {loop?: boolean, endSpeech?: boolean}) => {
    const audio = new Audio(audioPath);
    const shouldLoop = !!(options && !!options.loop);
    audio.loop = shouldLoop;
    audioRef.current = audio;

    startLoudnessTracking(audio);

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
      const resolvedPreviousKnowledge = (cachedInfo ? cachedInfo+", " : "") + (lastMessagesContext ?? "");
      const resolvedInput = resolvedPreviousKnowledge 
          ? `Coisas que eu disse antes para você ter contexto:(${resolvedPreviousKnowledge}) | E agora que eu disse agora e quero uma resposta direta:${input}`
          : input;
      socketRef.current?.send(JSON.stringify({
        type: "chat_text",
        text: `[EXPECTED LANGUAGE OF RESPONSE: ${language}]${resolvedInput}`,
      }));
      saveCacheInfo((resolvedPreviousKnowledge+", "+input).slice(0, cacheMemoryNumber));
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
        console.log("Enviando mensagem para o servidor...");
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
    if(!recognition) return;

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
    const socket = new WebSocket("/api/ws");

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
            setServerStatus(StatusesEnum.Processing);
            // playAudio("/sound1.mp3", {loop: true});
          }
          if(message.text == StatusesEnum.Written) {
            playAudio("/sound1.mp3");
            setServerStatus(StatusesEnum.Written);
          }
          if(message.text == StatusesEnum.Ready) {
            playAudio("/sound2.mp3");
            setServerStatus(StatusesEnum.Ready);
          }
        }
        else if (message.type === "mcp_flag"){
          console.log("MCP News API was used")
        }
      } else if (event.data instanceof Blob) {
        setIsSpeaking(true);
        
        // Stops previous audio if still in progress
        cleanAudioRef();

        setCurrBlob(event.data);
        const audioUrl = URL.createObjectURL(event.data);
        setServerStatus(undefined);
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
      if (isMuted) return;
      setIsListening(true);
      setIsWaiting(false);

    };
    recognition.onend = () => {
      setIsListening(false);
      setIsWaiting(false);
      recognition.start(); // Keeps listening
    };

    // recognition.onspeechstart = () => {
    //   console.log("Started hearing speech");
    // };

    // recognition.onerror = (event) => console.error("Speech recognition error", event.error);
    recognition.onresult = (event) => {
      if (isMuted) return;
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
  }, [language, isMuted, onUserTranscript]);

  // Caching
  const saveCacheInfo = (val: string) => {
    if(!val) return;
    localStorage.setItem('giroUserInfo', val);
  }

    useEffect(()=>{
      const value = localStorage.getItem('giroUserInfo');
      setCachedInfo(value ?? undefined);
    }, []);

  return { isListening, isSpeaking, isWaiting, toggleListening, currBlob, loudness, isMuted, setIsMuted, serverStatus };
}
