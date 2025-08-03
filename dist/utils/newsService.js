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
exports.newsService = void 0;
var NewsService = /** @class */ (function () {
    function NewsService() {
        this.cachedNews = null;
        this.lastFetchTime = 0;
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutos em millisegundos
    }
    NewsService.prototype.fetchBrazilianNews = function () {
        return __awaiter(this, void 0, void 0, function () {
            var newsApiKey, politicalResponse, economicResponse, politicalData, economicData, allNews_1, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // To verificando se ainda tem noticias em cache e se tao validas
                        if (this.cachedNews && (Date.now() - this.lastFetchTime) < this.CACHE_DURATION) {
                            console.log("Using cached news data");
                            return [2 /*return*/, this.cachedNews];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        newsApiKey = process.env.NEWS_API_KEY;
                        if (!newsApiKey) {
                            console.error("NEWS_API_KEY not found in environment variables");
                            return [2 /*return*/, null];
                        }
                        console.log("Fetching fresh news data from NewsAPI.org");
                        return [4 /*yield*/, fetch("https://newsapi.org/v2/everything?q=politics+brazil&language=pt&sortBy=publishedAt&pageSize=5&apiKey=".concat(newsApiKey))];
                    case 2:
                        politicalResponse = _a.sent();
                        return [4 /*yield*/, fetch("https://newsapi.org/v2/everything?q=economy+brazil&language=pt&sortBy=publishedAt&pageSize=5&apiKey=".concat(newsApiKey))];
                    case 3:
                        economicResponse = _a.sent();
                        return [4 /*yield*/, politicalResponse.json()];
                    case 4:
                        politicalData = _a.sent();
                        return [4 /*yield*/, economicResponse.json()];
                    case 5:
                        economicData = _a.sent();
                        allNews_1 = [];
                        if (politicalData.articles) {
                            politicalData.articles.forEach(function (article) {
                                allNews_1.push({
                                    title: article.title,
                                    description: article.description,
                                    source: article.source.name,
                                    publishedAt: article.publishedAt,
                                    category: 'Política'
                                });
                            });
                        }
                        if (economicData.articles) {
                            economicData.articles.forEach(function (article) {
                                allNews_1.push({
                                    title: article.title,
                                    description: article.description,
                                    source: article.source.name,
                                    publishedAt: article.publishedAt,
                                    category: 'Economia'
                                });
                            });
                        }
                        // Update cache
                        this.cachedNews = allNews_1;
                        this.lastFetchTime = Date.now();
                        console.log("Fetched ".concat(allNews_1.length, " news articles"));
                        return [2 /*return*/, allNews_1];
                    case 6:
                        error_1 = _a.sent();
                        console.error("Error fetching news:", error_1);
                        return [2 /*return*/, null];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    NewsService.prototype.createNewsContext = function (news) {
        if (!news || news.length === 0) {
            return "Não foi possível obter notícias recentes no momento.";
        }
        var context = "Aqui estão as principais notícias recentes sobre política e economia brasileira, use e interprete as informacoes para conversar e responder as perguntas do ususario como se estivesse em uma conversa:\n\n";
        news.forEach(function (article, index) {
            var date = new Date(article.publishedAt).toLocaleDateString('pt-BR');
            context += "".concat(index + 1, ". [").concat(article.category, "] ").concat(article.title, "\n");
            context += "   Fonte: ".concat(article.source, " | Data: ").concat(date, "\n");
            context += "   ".concat(article.description, "\n\n");
        });
        return context;
    };
    // Método para forçar atualização do cache (útil para testes)
    NewsService.prototype.clearCache = function () {
        this.cachedNews = null;
        this.lastFetchTime = 0;
        console.log("News cache cleared");
    };
    // Método para verificar se o cache está válido
    NewsService.prototype.isCacheValid = function () {
        return this.cachedNews !== null && (Date.now() - this.lastFetchTime) < this.CACHE_DURATION;
    };
    return NewsService;
}());
// Exportando um singleton (espero que esse pattern faca as noticias so serem buscadas uma vez)
exports.newsService = new NewsService();
