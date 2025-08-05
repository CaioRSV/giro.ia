'use client';

import { useState, useCallback, useEffect, useRef } from 'react'; // 1. Import useCallback
import { StatusesEnum, useVoiceChat } from '@/utils/useVoiceChat';
import { AnimatePresence, motion } from "motion/react"
import { twMerge } from 'tailwind-merge';

import { Mic, MousePointerClick } from 'lucide-react';
import { MicOff } from 'lucide-react';

import Flag from 'react-world-flags';

interface Message {
  author: 'You' | 'AI';
  text: string;
}



export const cacheMemoryNumber = 20000 // Chars

const circleSizeSumParameter = 1 // X + (0.0 - 1.0)
const circleScaleLoudnessMultiplier = 1.5 // X + (0.0 - 1.0)
const audioThrottlingParameter = 8; // The lower it is, the more quickly the center circle animates while the bot speaks


const statusLabels = {
  waiting: "Giro"
}

export default function HomePage() {
  const [conversation, setConversation] = useState<Message[]>([]);

  // 2. Wrap your handler functions in useCallback
  const handleUserTranscript = useCallback((transcript: string) => {
    setConversation((prev) => [...prev, { author: 'You', text: transcript }]);
  }, []);

  const handleAiResponse = useCallback((responseText: string) => {
    setConversation((prev) => [...prev, { author: 'AI', text: responseText }]);
  }, []);

  // 3. Pass the stable functions to the hook
  const { isListening, isSpeaking, isWaiting, toggleListening, setLanguage, currBlob, loudness, isMuted, setIsMuted, serverStatus} = useVoiceChat({
    onUserTranscript: handleUserTranscript,
    onAiResponse: handleAiResponse,
    lastMessagesContext: conversation.filter(e => e.author === "You").length ? conversation.filter(e => e.author === "You").map(e => e.text).join(", ") : undefined,
  });

  const [loudnessHistory, setLoudnessHistory] = useState<number[]>();
  const [throttledLoudness, setThrottledLoudness] = useState<number>(0);

  const [appActive, setAppActive] = useState<boolean>(false);


  const languageOptions = {
    "pt-br": "br",

  }

  type LanguageKey = keyof typeof languageOptions;

  const [currLanguage, setCurrLanguage] = useState<LanguageKey>();


  useEffect(()=>{
    if(!loudnessHistory?.includes(loudness)){
      setLoudnessHistory(prev => [...(prev ?? []), loudness]);
    }
    if (loudnessHistory && loudnessHistory.length > audioThrottlingParameter) {
      const values = [...loudnessHistory, loudness];
      const meanLoudness = values.reduce((sum, val) => sum + val, 0) / values.length;
      setThrottledLoudness(meanLoudness);
      console.log('NEW LOUDNESS: '+loudness);
      setLoudnessHistory(undefined);
    }
  },[loudness]);

    return (
    <div className="w-screen h-screen">
      <div className="flex sm:flex-row flex-col w-full h-full bg-radial-[at_25%_25%] from-slate-200 to-slate-400 overflow-y-scroll scrollbar-hide">
          <div 
            className={twMerge("absolute w-screen h-screen flex justify-center items-center transition-all z-50",
              appActive ? "opacity-0" : "bg-blue-500/20 backdrop-blur-sm cursor-pointer"
            )}
            onClick={()=>{
              toggleListening();
              setAppActive(true);
            }}
            style={{
              pointerEvents: appActive ? "none" : "all"
            }}
          >
            <div className="size-64 rounded-full flex justify-center items-center">
              <MousePointerClick size={"50%"} className="text-white" /> 
            </div>
          </div>

          <div className="min-h-screen p-16 flex-1 w-full flex flex-col justify-center items-center scrollbar-hide">
              {/* <div className="flex justify-center items-center bg-slate-400 p-0.5 rounded-full">
                <button 
                  onClick={()=>{setIsMuted(prev => !prev)}}
                  className="rounded-4xl flex justify-center items-center bg-slate-300 w-fit cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isMuted ? "mic-off" : "mic-on"}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "keyframes", duration: 0.05 }}
                    >
                      <Flag code="br" className="h-10 p-1 rounded-4xl" />
                    </motion.div>
                  </AnimatePresence>
                </button>
                <p>Português</p>
              </div> */}

              <div className="flex-1 flex flex-col justify-center items-center">
                <motion.div
                  className="rounded-full bg-radial from-sky-400 from-40% to-sky-600 aspect-square sm:h-[75%] sm:w-auto w-[75%] min-h-32 min-w-32 flex justify-center items-center"
                  animate={{
                    scale: circleSizeSumParameter + (throttledLoudness * circleScaleLoudnessMultiplier),
                    opacity: 
                      serverStatus == StatusesEnum.Processing
                          ? 0.7
                          : serverStatus == StatusesEnum.Written
                            ? 0.8
                            : isSpeaking
                              ? 1.0
                              : isMuted
                                ? 0.5
                                : 1.0,
                  }}
                  transition={{ duration: 0.1, ease: "easeInOut" }}
                >
                  <div className="flex flex-col justify-center items-center">
                    <p className="text-[4vw] text-slate-100 font-semibold font-mono opacity-80 select-none">Giro.IA</p>
                    <p className="text-white">{
                      
                      isWaiting
                        ? "Giro está aguardando..."
                        : serverStatus == StatusesEnum.Processing
                          ? "Pensando..."
                          : serverStatus == StatusesEnum.Written
                            ? "Hmm..."
                            : serverStatus == StatusesEnum.Ready
                              ? "Já sei!"
                              : isSpeaking
                                ? "Giro está falando"
                                : isMuted
                                  ? ""
                                  : "Giro está escutando..."
                    }</p> 
                  </div>
                </motion.div>
              </div>
            
            <div className="flex justify-center items-center bg-gray-900 p-2 rounded-full">
              <button 
                onClick={()=>{setIsMuted(prev => !prev)}}
                className="p-2 rounded-full flex justify-center items-center bg-gray-800 w-fit cursor-pointer"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isMuted ? "mic-off" : "mic-on"}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "keyframes", duration: 0.05 }}
                  >
                    {isMuted ? (
                      <MicOff size={45} className="aspect-square p-1 text-slate-500" />
                    ) : (
                      <Mic size={45} className="aspect-square p-1 text-slate-100" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
          </div>

          <div className={twMerge("p-8 transition-all duration-200", 
            conversation.length ? "sm:h-full sm:w-[20%] opacity-100" : "w-0 opacity-0"
          )}>
            <p className="text-slate-800 font-semibold mb-2">Histórico da conversa</p>
              <motion.div 
                className="flex flex-col gap-2 max-h-[95%] overflow-y-scroll scrollbar-hide"
                style={{
                  width: 0
                }}
                animate={{
                  width: conversation.length ? "100%" : 0
                }}
                transition={{
                  duration: 0.2
                }}
              >
                {conversation.map((msg, index) => (
                  <div key={index} className={`flex ${msg.author === 'You' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`px-4 py-2 rounded-lg max-w-sm ${
                        msg.author !== 'You' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
            </motion.div>
          </div>
      </div>
    </div>
  );
}