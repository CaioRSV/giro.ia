"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = require("http");
var ws_1 = require("ws");
var next_1 = require("next");
var openai_1 = require("openai");
require("dotenv/config"); // Loads .env.local
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.local' });
var url_1 = require("url");
var newsService_js_1 = require("./utils/newsService.js");
// 1. Initialize OpenAI
var openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// 2. Global variable to store news context
var newsContext = "";
// 3. Initialize news context on server start
function initializeNewsContext() {
    return __awaiter(this, void 0, void 0, function () {
        var news;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Initializing news context...");
                    return [4 /*yield*/, newsService_js_1.newsService.fetchBrazilianNews()];
                case 1:
                    news = _a.sent();
                    newsContext = newsService_js_1.newsService.createNewsContext(news);
                    console.log("News context initialized successfully");
                    return [2 /*return*/];
            }
        });
    });
}
var dev = process.env.NODE_ENV !== "production";
var app = (0, next_1.default)({ dev: dev });
var handle = app.getRequestHandler();
app.prepare().then(function () { return __awaiter(void 0, void 0, void 0, function () {
    var server, wss;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: 
            // 2. Initialize news context before starting the server
            return [4 /*yield*/, initializeNewsContext()];
            case 1:
                // 2. Initialize news context before starting the server
                _a.sent();
                server = (0, http_1.createServer)(function (req, res) {
                    handle(req, res);
                });
                wss = new ws_1.WebSocketServer({ noServer: true });
                // 5. Handle new WebSocket connections
                wss.on("connection", function (ws) {
                    console.log("Client connected to WebSocket");
                    // This is the core logic for handling messages
                    ws.on("message", function (message) { return __awaiter(void 0, void 0, void 0, function () {
                        var parsed, systemMessage, completion, responseText, ttsResponse, audioBuffer, _a, _b, error_1;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 5, , 6]);
                                    parsed = JSON.parse(message.toString());
                                    console.log("@!#@!#@!#@!#@!#@!#@!#@!");
                                    if (!((parsed.type === "chat_text" && parsed.text) || (!!message.toString().length))) return [3 /*break*/, 4];
                                    console.log("PROMPT ADDED");
                                    console.log(newsContext);
                                    systemMessage = "Voc\u00EA \u00E9 um assistente de IA especializado em pol\u00EDtica e economia brasileira. \n          \n          ".concat(newsContext, "\n\n          Use essas informa\u00E7\u00F5es como contexto para responder \u00E0s perguntas do usu\u00E1rio. Seja informativo, preciso e sempre mencione as fontes quando relevante. Responda em portugu\u00EAs brasileiro.");
                                    return [4 /*yield*/, openai.chat.completions.create({
                                            model: "gpt-4o",
                                            messages: [
                                                { role: "system", content: systemMessage },
                                                { role: "user", content: parsed.text }
                                            ],
                                        })];
                                case 1:
                                    completion = _c.sent();
                                    responseText = completion.choices[0].message.content;
                                    if (!responseText) return [3 /*break*/, 4];
                                    console.log("AI Response: \"".concat(responseText, "\""));
                                    return [4 /*yield*/, openai.audio.speech.create({
                                            model: 'tts-1',
                                            voice: 'alloy', // You can change the voice here
                                            input: responseText,
                                        })];
                                case 2:
                                    ttsResponse = _c.sent();
                                    _b = (_a = Buffer).from;
                                    return [4 /*yield*/, ttsResponse.arrayBuffer()];
                                case 3:
                                    audioBuffer = _b.apply(_a, [_c.sent()]);
                                    ws.send(audioBuffer);
                                    console.log("Sent audio response to client.");
                                    _c.label = 4;
                                case 4: return [3 /*break*/, 6];
                                case 5:
                                    error_1 = _c.sent();
                                    console.error("An error occurred:", error_1);
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); });
                    ws.on('close', function () {
                        console.log("Client disconnected");
                    });
                });
                // 6. Handle the HTTP upgrade to WebSocket only on a specific path
                server.on('upgrade', function (req, socket, head) {
                    var pathname = (0, url_1.parse)(req.url || '', true).pathname;
                    if (pathname === '/api/ws') {
                        wss.handleUpgrade(req, socket, head, function (ws) {
                            wss.emit('connection', ws, req);
                        });
                    }
                });
                // 7. Start the server
                server.listen(3000, function () {
                    console.log("Server running on http://localhost:3000");
                });
                return [2 /*return*/];
        }
    });
}); });
