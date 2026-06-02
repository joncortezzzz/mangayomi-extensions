const mangayomiSources = [{
  "name": "Hanime.tv",
  "lang": "en",
  "baseUrl": "https://hanime.tv",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://hanime.tv",
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
      "Referer": "https://hanime.tv/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };
  }

  async fetchDoc(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    return new Document(res.body);
  }

  parseCard(el) {
    const a = el.selectFirst("a.hvpi-wrap, a[href*='/hentai-videos/']");
    const img = el.selectFirst("img");
    const title = el.selectFirst(".hvpi-title, .title, h4");
    return {
      name: title?.text?.trim() ?? a?.attr("title") ?? "",
      url: a?.attr("href") ?? "",
      imageUrl: img?.attr("src") ?? img?.attr("data-src") ?? "",
    };
  }

  async getPopular(page) {
    const doc = await this.fetchDoc(`https://hanime.tv/browse/hentai-videos?order_by=likes&page=${page}`);
    const cards = doc.select(".hvpi-container, .grid-item, article");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url);
    const next = doc.selectFirst(".pagination .next, a[rel='next']");
    return { list, hasNextPage: !!next };
  }

  async getLatestUpdates(page) {
    const doc = await this.fetchDoc(`https://hanime.tv/browse/hentai-videos?order_by=created_at&page=${page}`);
    const cards = doc.select(".hvpi-container, .grid-item, article");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url);
    const next = doc.selectFirst(".pagination .next, a[rel='next']");
    return { list, hasNextPage: !!next };
  }

  async search(query, page, filters) {
    const doc = await this.fetchDoc(`https://hanime.tv/search?query=${encodeURIComponent(query)}&page=${page}`);
    const cards = doc.select(".hvpi-container, .grid-item, article");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url);
    const next = doc.selectFirst(".pagination .next, a[rel='next']");
    return { list, hasNextPage: !!next };
  }

  async getDetail(url) {
    const doc = await this.fetchDoc(url);
    const name = doc.selectFirst("h1, .hentai-info h2, .video-title")?.text?.trim() ?? "";
    const imageUrl = doc.selectFirst(".hvt-cp-left img, .cover img, video[poster]")?.attr("src") 
                  ?? doc.selectFirst("video")?.attr("poster") ?? "";
    const description = doc.selectFirst(".hv-description, .video-description, .synopsis")?.text?.trim() ?? "";
    const tags = doc.select(".hentai-tag, .tag a").map(t => t.text.trim()).join(", ");

    return {
      name,
      imageUrl,
      description,
      genre: tags,
      status: 1,
      episodes: [{ name: "Episode 1", url }],
    };
  }

  async getVideoList(url) {
    const doc = await this.fetchDoc(url);
    const videos = [];

    // Try direct video sources first
    const sources = doc.select("source[src]");
    for (const s of sources) {
      const src = s.attr("src") ?? "";
      const label = s.attr("label") ?? s.attr("size") ?? "Default";
      if (src) videos.push({ url: src, quality: label, originalUrl: src });
    }

    // Try iframes
    if (videos.length === 0) {
      const iframes = doc.select("iframe[src], iframe[data-src]");
      for (const f of iframes) {
        const src = f.attr("src") ?? f.attr("data-src") ?? "";
        if (src) videos.push({ url: src, quality: "Default", originalUrl: src });
      }
    }

    return videos;
  }

  getFilterList() { return []; }
}
