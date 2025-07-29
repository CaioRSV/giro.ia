interface NewsArticle {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  category: string;
}

class NewsService {
  private cachedNews: NewsArticle[] | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos em millisegundos

  async fetchBrazilianNews(): Promise<NewsArticle[] | null> {
    // To verificando se ainda tem noticias em cache e se tao validas
    if (this.cachedNews && (Date.now() - this.lastFetchTime) < this.CACHE_DURATION) {
      console.log("Using cached news data");
      return this.cachedNews;
    }

    try {
      const newsApiKey = process.env.NEWS_API_KEY;
      if (!newsApiKey) {
        console.error("NEWS_API_KEY not found in environment variables");
        return null;
      }

      console.log("Fetching fresh news data from NewsAPI.org");

      // Depois implementar a busca de noticias de temas variados baseado em preferencias do usuario (possivelmente salvando em local Storage)

      // buscando noticias de politica (deixar a busca mais elaborada no futuro)
      const politicalResponse = await fetch(
        `https://newsapi.org/v2/everything?q=politics+brazil&language=pt&sortBy=publishedAt&pageSize=5&apiKey=${newsApiKey}`
      );
      
      // buscando noticias de economia (deixar a busca mais elaborada no futuro)
      const economicResponse = await fetch(
        `https://newsapi.org/v2/everything?q=economy+brazil&language=pt&sortBy=publishedAt&pageSize=5&apiKey=${newsApiKey}`
      );

      const politicalData = await politicalResponse.json();
      const economicData = await economicResponse.json();

      // Aqui eu combino as noticia, talvez valha a pena sumarizar tudo antes 
      const allNews: NewsArticle[] = [];
      
      if (politicalData.articles) {
        politicalData.articles.forEach((article: any) => {
          allNews.push({
            title: article.title,
            description: article.description,
            source: article.source.name,
            publishedAt: article.publishedAt,
            category: 'Política'
          });
        });
      }
      
      if (economicData.articles) {
        economicData.articles.forEach((article: any) => {
          allNews.push({
            title: article.title,
            description: article.description,
            source: article.source.name,
            publishedAt: article.publishedAt,
            category: 'Economia'
          });
        });
      }

      // Update cache
      this.cachedNews = allNews;
      this.lastFetchTime = Date.now();
      
      console.log(`Fetched ${allNews.length} news articles`);
      return allNews;
    } catch (error) {
      console.error("Error fetching news:", error);
      return null;
    }
  }

  createNewsContext(news: NewsArticle[] | null): string {
    if (!news || news.length === 0) {
      return "Não foi possível obter notícias recentes no momento.";
    }

    let context = "Aqui estão as principais notícias recentes sobre política e economia brasileira, use e interprete as informacoes para conversar e responder as perguntas do ususario como se estivesse em uma conversa:\n\n";
    
    news.forEach((article: NewsArticle, index: number) => {
      const date = new Date(article.publishedAt).toLocaleDateString('pt-BR');
      context += `${index + 1}. [${article.category}] ${article.title}\n`;
      context += `   Fonte: ${article.source} | Data: ${date}\n`;
      context += `   ${article.description}\n\n`;
    });

    return context;
  }

  // Método para forçar atualização do cache (útil para testes)
  clearCache(): void {
    this.cachedNews = null;
    this.lastFetchTime = 0;
    console.log("News cache cleared");
  }

  // Método para verificar se o cache está válido
  isCacheValid(): boolean {
    return this.cachedNews !== null && (Date.now() - this.lastFetchTime) < this.CACHE_DURATION;
  }
}

// Exportando um singleton (espero que esse pattern faca as noticias so serem buscadas uma vez)
export const newsService = new NewsService(); 