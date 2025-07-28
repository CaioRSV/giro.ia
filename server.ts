import { createServer } from "http";
import { WebSocketServer } from "ws";
import next from "next";
import { OpenAI } from "openai";
import 'dotenv/config'; // Loads .env.local
import { parse } from 'url';

// 1. Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // 2. Create the basic HTTP server using Next.js
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // 3. Set up the WebSocket server without attaching it
  const wss = new WebSocketServer({ noServer: true });

  // 4. Handle new WebSocket connections
  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");

    // This is the core logic for handling messages
    ws.on("message", async (message) => {
      try {
        const parsed = JSON.parse(message.toString());

        // We expect a message with the transcribed text from the client
        if (parsed.type === "chat_text" && parsed.text) {
          console.log(`Received text: "${parsed.text}"`);

          // Step A: Get a text response from the OpenAI LLM
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: parsed.text }],
          });

          const responseText = completion.choices[0].message.content;

          if (responseText) {
            console.log(`AI Response: "${responseText}"`);

            // Step B: Convert the text response to audio using OpenAI TTS
            const ttsResponse = await openai.audio.speech.create({
              model: 'tts-1',
              voice: 'alloy', // You can change the voice here
              input: responseText,
            });

            // Step C: Stream the audio buffer back to the client
            const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
            ws.send(audioBuffer);
            console.log("Sent audio response to client.");
          }
        }
      } catch (error) {
        console.error("An error occurred:", error);
      }
    });

    ws.on('close', () => {
        console.log("Client disconnected");
    });
  });

  // 5. Handle the HTTP upgrade to WebSocket only on a specific path
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '', true);

    if (pathname === '/api/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  // 6. Start the server
  server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
});