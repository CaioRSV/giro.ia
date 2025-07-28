import { useEffect, useRef } from "react";

type Role = "user" | "assistant" | "system";

interface ChatMessage {
  role: Role;
  content: string;
}

interface OutgoingMessage {
  type: "chat";
  messages: ChatMessage[];
}

interface IncomingToken {
  type: "token";
  content: string;
}

interface DoneMessage {
  type: "done";
}

type IncomingMessage = IncomingToken | DoneMessage;

export function useChatWebSocket(onToken: (token: string) => void, onDone?: () => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const onTokenRef = useRef(onToken);
  const onDoneRef = useRef(onDone);

  // Keep the refs updated with the latest callbacks
  useEffect(() => {
    onTokenRef.current = onToken;
    onDoneRef.current = onDone;
  }, [onToken, onDone]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3000/api/ws"); // Update the URL
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const data: IncomingMessage = JSON.parse(event.data);
      if (data.type === "token") {
        onTokenRef.current(data.content); // Use the ref's current value
      }
      if (data.type === "done") {
        onDoneRef.current?.(); // Use the ref's current value
      }
    };

    return () => {
      socket.close();
    };
  }, []); // Keep the empty dependency array here

  function sendMessage(messages: ChatMessage[]) {
    const msg: OutgoingMessage = { type: "chat", messages };
    socketRef.current?.send(JSON.stringify(msg));
  }

  return { sendMessage };
}