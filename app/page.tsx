'use client';

import { useState, useCallback } from 'react'; // 1. Import useCallback
import { useVoiceChat } from '@/utils/useVoiceChat';

interface Message {
  author: 'You' | 'AI';
  text: string;
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
  const { isListening, isSpeaking, toggleListening } = useVoiceChat({
    onUserTranscript: handleUserTranscript,
    onAiResponse: handleAiResponse,
  });

  const getButtonState = () => {
    if (isListening) return { text: 'Listening...', disabled: true };
    if (isSpeaking) return { text: 'AI is Speaking...', disabled: true };
    return { text: 'Push to Talk', disabled: false };
  };

  const buttonState = getButtonState();

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col h-screen">
      <h1 className="text-3xl font-bold text-center mb-4">Voice Chat</h1>

      <div className="flex-grow space-y-4 overflow-y-auto bg-gray-50 p-4 rounded-lg border">
        {conversation.map((msg, index) => (
          <div key={index} className={`flex ${msg.author === 'You' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`px-4 py-2 rounded-lg max-w-sm ${
                msg.author === 'You' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isListening && (
            <div className="flex justify-end">
                <div className="px-4 py-2 rounded-lg max-w-sm bg-blue-500 text-white opacity-60">
                    ...
                </div>
            </div>
        )}
      </div>

      <div className="flex justify-center mt-4">
        <button
          onClick={toggleListening}
          disabled={buttonState.disabled}
          className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {buttonState.text}
        </button>
      </div>
    </div>
  );
}