import { createServer } from "http";
import { WebSocketServer } from "ws";
import WebSocket from 'ws';
import next from "next";
import { OpenAI } from "openai";
import 'dotenv/config'; // Loads .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });
import { parse } from 'url';

// 0. Resources
/// Common
type SignalStatuses = "processing" | "written" | "ready";

enum StatusesEnum {
  Processing = "processing",
  Written = "written",
  Ready = "ready"
}
//
function SignalStatus(ws: WebSocket, val: SignalStatuses) {
    ws.send(JSON.stringify({
      text: val,
      type: "status"
    }));
}

// 1. Initialize resources
const initialContextString = `
Você é um assistente de IA chamada "Giro" ou "Giro.IA", especializado em dar notícias tailoradas aos gostos do usuário. Caso ele não tenha gostos, sugira sobre política e economia brasileiras.
Sempre que um usuário quiser saber de notícias, utilize a news_api e news_api-search-everything para pesquisar sobre. Use buscas com diversos parâmetros e pegue as notícias mais relevantes para garantir que quase sempre haverão notícias na resposta.
`;

const communicationStyleString = `O texto será lido pro TTS, logo não inclua links, apenas nomes das fontes.
Sempre dê um panorama geral das notícias, sem incluir links, focando no conteúdo delas, citando apenas a fonte no início.
Seja bem completo com sua descrição das notícias, se o usuário tiver solicitado. Se não, pode ser sucinto.`

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const mcpServerURL = process.env.PIPEDREAM_API_URL!;

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// 2. Server setup
app.prepare().then(async () => {
  // 1. Create the basic HTTP server using Next.js
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // 2. Set up the WebSocket server for better control
  const wss = new WebSocketServer({ noServer: true });

  // 3. Handle new WebSocket connections
  wss.on("connection", (ws) => {
    console.log("Cliente conectado");

    // This is the core logic for handling messages
    ws.on("message", async (message) => {
      try {
        const parsed = JSON.parse(message.toString());

        // Expecting transcribed input from user
        if ( (parsed.type === "chat_text" && parsed.text) || (!!message.toString().length)) {
          // Signal status to client
          SignalStatus(ws, StatusesEnum.Processing);

          // Bare-bones prompt + Preferences acquired if they exist
          // const cacheInfo = `Aqui está uma lista de pesquisas recentes do usuário para contextualizar: ${getCache()}`;
          const systemMessage = initialContextString + communicationStyleString;

          // Step B: Get a text response from the OpenAI LLM with context
          const response = await openai.responses.create({
            model: "gpt-4o",
            instructions: systemMessage,
            input: parsed.text,
            tools: [
              {
                type: "mcp",
                server_label: "news_api", 
                server_url: mcpServerURL, // Custom MCP Server for fetching
                require_approval: "never",
                allowed_tools: ["news_api-search-everything"]
              },
            ],
            temperature: 0.8
          });

          const responseText = response.output_text;

          const mcpWasUsed = response.output.some(e => e.type == "mcp_call" && e.name == "news_api-search-everything");
          if(mcpWasUsed) {
            const mcpUsed = response.output.find(e => e.type == "mcp_call" && e.name == "news_api-search-everything");
            console.log("🕹️ MCP was used!");
            ws.send(JSON.stringify({
              text: "true",
              type: "mcp_flag"
            }));
          }

          if (responseText) {
            console.log(`AI Response: "${responseText}"`);
            ws.send(JSON.stringify({
              text: responseText,
              type: "ai_response_text"
            }));

            // Signal status to client
            SignalStatus(ws, StatusesEnum.Written);

            // Step B: Convert the text response to audio using OpenAI TTS
            const ttsResponse = await openai.audio.speech.create({
              model: 'tts-1',
              voice: 'shimmer', // You can change the voice here
              input: responseText,
            });

            // Signal status to client
            SignalStatus(ws, StatusesEnum.Ready);

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
  server.listen(process.env.PORT, () => {
    console.log("Server running on PORT: "+process.env.PORT);
  });
});
