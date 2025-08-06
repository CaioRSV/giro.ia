'use client';

import { useState, useCallback, useEffect, useRef } from 'react'; // 1. Import useCallback
import { StatusesEnum, useVoiceChat } from '@/utils/useVoiceChat';
import { AnimatePresence, motion } from "motion/react"
import { twMerge } from 'tailwind-merge';

import { ChevronDown, ListCollapse, ListCollapseIcon, Menu, Mic, MousePointerClick, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { MicOff } from 'lucide-react';

import Flag from 'react-world-flags';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

  const [loudnessHistory, setLoudnessHistory] = useState<number[]>();
  const [throttledLoudness, setThrottledLoudness] = useState<number>(0);

  const [appActive, setAppActive] = useState<boolean>(false);


  const languageOptions = {
    "pt-br": "br",
    "en-us": "usa",
    "es-ES": "es"
  }

  const LanguageToStringObject = {
    "pt-br": "Português",
    "en-us": "Inglês",
    "es-ES": "Espanhol"
  }

  type LanguageKey = keyof typeof languageOptions;

  const [currLanguage, setCurrLanguage] = useState<LanguageKey>("pt-br");

  const [showChat, setShowChat] = useState<boolean>();

  const [patienceInMs, setPatienceInMs] = useState<number>(1000);

  const { isListening, isSpeaking, isWaiting, toggleListening, currBlob, loudness, isMuted, setIsMuted, serverStatus} = useVoiceChat({
    onUserTranscript: handleUserTranscript,
    onAiResponse: handleAiResponse,
    lastMessagesContext: conversation.filter(e => e.author === "You").length ? conversation.filter(e => e.author === "You").map(e => e.text).join(", ") : undefined,
    language: currLanguage,
    patienceInMs: patienceInMs,
  });

  useEffect(()=>{
    if(!loudnessHistory?.includes(loudness)){
      setLoudnessHistory(prev => [...(prev ?? []), loudness]);
    }
    if (loudnessHistory && loudnessHistory.length > audioThrottlingParameter) {
      const values = [...loudnessHistory, loudness];
      const meanLoudness = values.reduce((sum, val) => sum + val, 0) / values.length;
      setThrottledLoudness(meanLoudness);
      setLoudnessHistory(undefined);
    }
  },[loudness]);

  useEffect(()=>{
    if(conversation.length){
      showChat == undefined && setShowChat(true);
    }
  }, [conversation]);


  // Cached options handling
  useEffect(()=>{
    const cachedLanguage = localStorage.getItem('giroLanguage')
    const resolvedLanguage =  cachedLanguage as keyof typeof languageOptions ?? "pt-br";

    const cachedPatience = localStorage.getItem('giroPatience');
    const resolvedPatience = cachedPatience == null ? 1000 : parseInt(cachedPatience);

    setCurrLanguage(resolvedLanguage);
    setPatienceInMs(resolvedPatience);
  }, []);

  useEffect(()=>{
    localStorage.setItem('giroLanguage', currLanguage);
  }, [currLanguage]);

  useEffect(()=>{
    localStorage.setItem('giroPatience', patienceInMs.toString());
  }, [patienceInMs]);

  const handleClearCache = () => {
    localStorage.clear();
    window.location.reload();
  }

    return (
    <div className="w-screen h-screen">
      <div className="flex sm:flex-row flex-col w-full h-full bg-radial-[at_25%_25%] from-slate-200 to-slate-400 overflow-y-scroll scrollbar-hide">
          <div 
            className={twMerge("absolute w-screen h-screen flex justify-center items-center transition-all z-50",
              appActive ? "opacity-0" : "bg-blue-500/40 backdrop-blur-sm cursor-pointer"
            )}
            onClick={()=>{
              toggleListening();
              setAppActive(true);
            }}
            style={{
              pointerEvents: appActive ? "none" : "all"
            }}
          >
            <div className="rounded-full sm:flex justify-center items-center gap-2">
              <div className="h-full flex sm:justify-end justify-center items-center">
                <MousePointerClick size={"50%"} className="text-white" /> 
              </div>
              <div className="rounded-lg flex flex-col gap-2 p-4 font-sans text-lg font-semibold h-full">
                <p className="text-white">• Clique na tela</p>
                <p className="text-white">• Desmute seu microfone</p>
                <p className="text-white">• Converse e se informe com o Giro.IA!</p>
              </div>
            </div>
          </div>

          <div className="min-h-screen p-16 flex-1 w-full flex flex-col justify-center items-center scrollbar-hide">
              <Dialog>
                <DialogTrigger>
                  <Menu size={40} className="text-slate-900 cursor-pointer" />
                </DialogTrigger>
                <DialogContent className="h-[90%] min-w-64 sm:w-auto w-[90%] overflow-y-scroll scrollbar-hide bg-radial-[at_25%_25%] from-slate-200 to-slate-400">
                  <DialogHeader>
                    <DialogTitle>Configurações</DialogTitle>
                    <DialogDescription>
                      Personalize o agente
                    </DialogDescription>

                    <div className="w-full bg-accent/30 p-2 flex justify-between rounded-lg items-center">
                      <p>Escolher linguagem</p>

                      <div className="min-w-16 w-full" />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="cursor-pointer flex gap-1 items-center justify-between w-32"
                          >
                            <Flag className="size-4" code={languageOptions[currLanguage]} />
                              {LanguageToStringObject[currLanguage as keyof typeof languageOptions]}
                            <ChevronDown />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Linguagem de detecção de voz</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={()=>{setCurrLanguage("pt-br")}}>Português</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>{setCurrLanguage("en-us")}}>Inglês</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>{setCurrLanguage("es-ES")}}>Espanhol</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="w-full bg-accent/30 p-2 flex justify-between rounded-lg items-center">
                      <p>Tempo de espera para continuação de frases</p>

                      <div className="min-w-16 w-full" />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="cursor-pointer flex gap-1 items-center justify-between w-32"
                          >
                              {`${patienceInMs/1000} segundo${patienceInMs != 1000 ? "s" : ""}`}
                            <ChevronDown />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Tempo de espera para continuação de frases</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={()=>{setPatienceInMs(1000)}}>1 segundo</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>{setPatienceInMs(3000)}}>3 segundos</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>{setPatienceInMs(5000)}}>5 segundos</DropdownMenuItem>
                          <DropdownMenuItem onClick={()=>{setPatienceInMs(10000)}}>10 segundos</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* <p className="text-sm">A primeira frase deve ser mais longa para que a espera subsequente seja ativada</p> */}
                    </div>

                    <div className="w-full bg-accent/30 p-2 flex justify-between rounded-lg items-center">
                      <p>Limpar informações</p>

                      <div className="min-w-16 w-full" />

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="default"
                            className="cursor-pointer hover:bg-red-900"
                          >
                            Limpar dados de uso
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza que deseja limpar seus dados de uso?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O nosso agente esquecerá de todo o seu histórico de utilização até o momento, incluind suas preferências e interesses.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-700 hover:bg-red-800 cursor-pointer" onClick={handleClearCache}>Excluir dados</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                  </DialogHeader>
                </DialogContent>
              </Dialog>

              <div className="flex-1 flex flex-col justify-center items-center">
                <motion.div
                  className="overflow-hidden rounded-full bg-radial from-sky-400 from-40% to-sky-600 aspect-square sm:h-[75%] sm:w-auto w-[75%] min-h-32 min-w-32 flex justify-center items-center"
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
                    <p className="text-white sm:text-[1.2vw] text-center select-none">{
                      
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

          <div 
            className={twMerge("transition-all",
              conversation.length ? "p-4 opacity-100" : "opacity-0 pointer-events-none w-0 h-0"
            )}
          >
            <div className="bg-slate-500/5 p-3 rounded-md cursor-pointer flex justify-center items-center"
              onClick={()=>{
                setShowChat(prev => !prev);
              }}
            >
              { !showChat ? <PanelLeftClose/> : <PanelRightClose/> }
            </div>
              
          </div>
          
          <div className={twMerge(" transition-all duration-200", 
            conversation.length && showChat ? "sm:h-full h-fit sm:w-[20%] opacity-100 p-4" : "w-0 h-0 opacity-0"
          )}>
            <p className="text-slate-800 font-semibold mb-2">Histórico da conversa</p>
            <motion.div 
              className="flex flex-col gap-2 max-h-[95%] overflow-y-scroll scrollbar-hide"
              style={{ width: 0 }}
              animate={{ width: conversation.length ? "100%" : 0 }}
              transition={{ duration: 0.2 }}
            >
              { conversation.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex ${msg.author === 'You' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg max-w-sm ${
                      msg.author !== 'You' ? 'bg-sky-500/40 text-white pl-2' : ' text-gray-800 pr-2 bg-slate-200/40'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
      </div>
    </div>
  );
}