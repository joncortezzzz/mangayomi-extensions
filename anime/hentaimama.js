const mangayomiSources = [{
  "name": "HentaiMama",
  "lang": "en",
  "baseUrl": "https://hentaimama.io",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://hentaimama.io",
  "typeSource": "single",
  "isManga": false,
  "isNsfw": true,
  "version": "0.0.2",
  "appMinVerReq": "0.5.0",
  "sourceCodeLanguage": 1,
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://hentaimama.io/",
    };
  }

  async fetchDoc(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    return new Document(res.body);
  }

  parseCard(el) {
    // Try multiple possible selectors
    const a = el.selectFirst("a") ;
    const img = el.selectFirst("img");
    const title = el.selectFirst(".title, h2, h3, .entry-title")
                ?? el.selectFirst("a");
    return {
      name: title?.text?.trim() ?? img?.attr("alt") ?? "",
      url: a?.attr("href") ?? "",
      imageUrl: img?.attr("data-src") ?? img?.attr("src") ?? "",
    };
  }

  async getPopular(page) {
    const doc = await this.fetchDoc(`https://hentaimama.io/tvshows/?page=${page}`);
    // Try multiple container selectors
    let cards = doc.select(".tvshows article, .movies-list article, article.item");
    if (!cards || cards.length === 0) {
      cards = doc.select("article");
    }
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    const next = doc.selectFirst("a.next, .next a, a[rel='next']");
    return { list, hasNextPage: !!next };
  }

  async getLatestUpdates(page) {
    const doc = await this.fetchDoc(`https://hentaimama.io/episodes/?page=${page}`);
    let cards = doc.select(".episodes article, article.item, article");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    const next = doc.selectFirst("a.next, .next a, a[rel='next']");
    return { list, hasNextPage: !!next };
  }

  async search(query, page, filters) {
    const doc = await this.fetchDoc(`https://hentaimama.io/?s=${encodeURIComponent(query)}&page=${page}`);
    let cards = doc.select("article");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    const next = doc.selectFirst("a.next, .next a, a[rel='next']");
    return { list, hasNextPage: !!next };
  }

  async getDetail(url) {
    const doc = await this.fetchDoc(url);
    const name = doc.selectFirst("h1, h2.entry-title, .sheader h1")?.text?.trim() ?? "";
    const imageUrl = doc.selectFirst(".poster img, .thumb img, img.wp-post-image")?.attr("src") ?? "";
    const description = doc.selectFirst(".wp-content p, .description, .sinopsis p")?.text?.trim() ?? "";

    // Look for episode list
    const epLinks = doc.select(".episodios li a, .episodes-list a, #episodes a");
    let episodes = [];
    if (epLinks.length > 0) {
      episodes = epLinks.map((a, i) => ({
        name: a.text.trim() || `Episode ${i + 1}`,
        url: a.attr("href"),
      })).filter(e => e.url);
    } else {
      episodes = [{ name: "Watch", url }];
    }

    return { name, imageUrl, description, status: 1, episodes };
  }

  async getVideoList(url) {
    const doc = await this.fetchDoc(url);
    const videos = [];

    // Direct video sources
    const sources = doc.select("source[src]");
    for (const s of sources) {
      const src = s.attr("src") ?? "";
      const label = s.attr("label") ?? s.attr("size") ?? "Default";
      if (src) videos.push({ url: src, quality: label, originalUrl: src });
    }

    // Iframes
    if (videos.length === 0) {
      const iframes = doc.select("iframe");
      for (const f of iframes) {
        const src = f.attr("src") ?? f.attr("data-src") ?? "";
        if (src && !src.includes("google") && !src.includes("facebook")) {
          videos.push({ url: src, quality: "Default", originalUrl: src });
        }
      }
    }

    return videos;
  }

  getFilterList() { return []; }
}
