import { createServer } from "http";
import { WebSocketServer } from "ws";
import next from "next";
import { OpenAI } from "openai";
import 'dotenv/config'; // Loads .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });
import { parse } from 'url';
import { newsService } from './utils/newsService.js';

// 1. Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// 2. Global variable to store news context
let newsContext: string = "";

// 3. Initialize news context on server start
async function initializeNewsContext() {
  console.log("Initializing news context...");
  const news = await newsService.fetchBrazilianNews();
  newsContext = newsService.createNewsContext(news);
  console.log("News context initialized successfully");
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // 2. Initialize news context before starting the server
  await initializeNewsContext();
  
  // 3. Create the basic HTTP server using Next.js
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // 4. Set up the WebSocket server without attaching it
  const wss = new WebSocketServer({ noServer: true });

  // 5. Handle new WebSocket connections
  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");

    // This is the core logic for handling messages
    ws.on("message", async (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        console.log("@!#@!#@!#@!#@!#@!#@!#@!")

        // We expect a message with the transcribed text from the client
        if ( (parsed.type === "chat_text" && parsed.text) || (!!message.toString().length)) {
          console.log("PROMPT ADDED");
          console.log(newsContext);
          // Step A: Create system message with cached news context
          const systemMessage = `Você é um assistente de IA especializado em política e economia brasileira. 
          
          ${newsContext}

          Use essas informações como contexto para responder às perguntas do usuário. Seja informativo, preciso e sempre mencione as fontes quando relevante. Responda em português brasileiro.`;

          // Step B: Get a text response from the OpenAI LLM with context
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: parsed.text }
            ],
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

  // 6. Handle the HTTP upgrade to WebSocket only on a specific path
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '', true);

    if (pathname === '/api/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  // 7. Start the server
  server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
});
