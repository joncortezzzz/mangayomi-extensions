const mangayomiSources = [{
  "name": "HentaiMama",
  "lang": "en",
  "baseUrl": "https://hentaimama.io",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://hentaimama.io",
  "typeSource": "single",
  "isManga": false,
  "isNsfw": true,
  "version": "0.0.1",
  "appMinVerReq": "0.5.0",
  "sourceCodeLanguage": 1,
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://hentaimama.io/",
    };
  }

  async fetchPage(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    return new Document(res.body);
  }

  // Parse an episode card from listing pages
  parseCard(el) {
    const a = el.selectFirst("a");
    const img = el.selectFirst("img");
    return {
      name: a?.attr("title") ?? img?.attr("alt") ?? "Unknown",
      url: a?.attr("href") ?? "",
      imageUrl: img?.attr("data-src") ?? img?.attr("src") ?? "",
    };
  }

  async getPopular(page) {
    const doc = await this.fetchPage(
      `https://hentaimama.io/episodes/?page=${page}`
    );
    const cards = doc.select("div.animeps");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url);
    const next = doc.selectFirst("a.nextpostslink");
    return { list, hasNextPage: !!next };
  }

  async getLatestUpdates(page) {
    const doc = await this.fetchPage(
      `https://hentaimama.io/episodes/?page=${page}`
    );
    const cards = doc.select("div.animeps");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url);
    const next = doc.selectFirst("a.nextpostslink");
    return { list, hasNextPage: !!next };
  }

  async search(query, page, filters) {
    const doc = await this.fetchPage(
      `https://hentaimama.io/?s=${encodeURIComponent(query)}&page=${page}`
    );
    const cards = doc.select("div.animeps");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url);
    const next = doc.selectFirst("a.nextpostslink");
    return { list, hasNextPage: !!next };
  }

  async getDetail(url) {
    const doc = await this.fetchPage(url);

    const name = doc.selectFirst("h1.entry-title,h2.entry-title")?.text ?? "";
    const imageUrl = doc.selectFirst("div.post-thumbnail img,img.wp-post-image")?.attr("src") ?? "";
    const description = doc.selectFirst("div.entry-content p,div.synop")?.text ?? "";

    // Get all episodes listed on this page (some pages have episode lists)
    const epLinks = doc.select("div.episodelist a, ul.episodelist a, div.episodes a");
    let episodes = [];

    if (epLinks.length > 0) {
      episodes = epLinks.map((a, i) => ({
        name: a.text.trim() || `Episode ${i + 1}`,
        url: a.attr("href"),
      })).filter(e => e.url);
    } else {
      // Single episode page
      episodes = [{ name: "Episode 1", url }];
    }

    return {
      name,
      imageUrl,
      description,
      status: 1,
      episodes,
    };
  }

  async getVideoList(url) {
    const doc = await this.fetchPage(url);
    const videos = [];

    // Try to find iframe embeds
    const iframes = doc.select("iframe");
    for (const iframe of iframes) {
      const src = iframe.attr("src") ?? iframe.attr("data-src") ?? "";
      if (src && src.length > 0) {
        videos.push({
          url: src,
          quality: "Default",
          originalUrl: src,
        });
      }
    }

    // Try direct video sources
    const sources = doc.select("source");
    for (const source of sources) {
      const src = source.attr("src") ?? "";
      const label = source.attr("label") ?? source.attr("size") ?? "Default";
      if (src && src.length > 0) {
        videos.push({
          url: src,
          quality: label,
          originalUrl: src,
        });
      }
    }

    return videos;
  }

  getFilterList() {
    return [];
  }
}
