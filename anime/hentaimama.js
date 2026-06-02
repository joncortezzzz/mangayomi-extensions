const mangayomiSources = [{
  "name": "HentaiMama",
  "lang": "en",
  "baseUrl": "https://hentaimama.io",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://hentaimama.io",
  "typeSource": "single",
  "isManga": false,
  "isNsfw": true,
  "version": "0.0.3",
  "appMinVerReq": "0.5.0",
  "sourceCodeLanguage": 1,
}];

class DefaultExtension extends MProvider {
  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://hentaimama.io/",
    };
  }

  async fetchDoc(url) {
    const res = await new Client().get(url, this.getHeaders());
    return new Document(res.body);
  }

  parseCard(el) {
    const a = el.selectFirst("a");
    const img = el.selectFirst("img");
    const title = el.selectFirst(".entry-title, h2, h3, .title")
                ?? el.selectFirst("a[title]");
    return {
      name: (title?.text?.trim() ?? a?.attr("title") ?? img?.attr("alt") ?? "").trim(),
      url: a?.attr("href") ?? "",
      imageUrl: img?.attr("data-src") ?? img?.attr("src") ?? "",
    };
  }

  async getPopular(page) {
    const doc = await this.fetchDoc(`https://hentaimama.io/tvshows/page/${page}/`);
    const cards = doc.select("article");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    const next = doc.selectFirst("a.next, .next a");
    return { list, hasNextPage: !!next };
  }

  async getLatestUpdates(page) {
    const doc = await this.fetchDoc(`https://hentaimama.io/episodes/page/${page}/`);
    const cards = doc.select("article");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    const next = doc.selectFirst("a.next, .next a");
    return { list, hasNextPage: !!next };
  }

  async search(query, page, filters) {
    const doc = await this.fetchDoc(
      `https://hentaimama.io/page/${page}/?s=${encodeURIComponent(query)}`
    );
    const cards = doc.select("article");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    const next = doc.selectFirst("a.next, .next a");
    return { list, hasNextPage: !!next };
  }

  async getDetail(url) {
    const doc = await this.fetchDoc(url);

    const name = (doc.selectFirst(".sheader h1, h1.entry-title, h1")?.text ?? "").trim();
    const imageUrl = doc.selectFirst(".poster img, .thumb img, img.wp-post-image")?.attr("src") ?? "";
    const description = (doc.selectFirst(".wp-content p, .sinopsis p, .description")?.text ?? "").trim();

    // Episode list
    const epLinks = doc.select("#episodes .episodios li a, .episodios li a, .episodes a");
    let episodes = [];

    if (epLinks.length > 0) {
      episodes = epLinks.map((a, i) => ({
        name: (a.text?.trim() || `Episode ${i + 1}`),
        url: a.attr("href") ?? "",
      })).filter(e => e.url);
    }

    // Fallback: if this IS an episode page itself
    if (episodes.length === 0) {
      episodes = [{ name: name || "Watch", url }];
    }

    return {
      name: name || "Unknown",
      imageUrl,
      description,
      status: 1,
      episodes,
    };
  }

  async getVideoList(url) {
    const doc = await this.fetchDoc(url);
    const videos = [];

    // Direct video sources
    for (const s of doc.select("source[src]")) {
      const src = s.attr("src") ?? "";
      const label = s.attr("label") ?? s.attr("size") ?? "Default";
      if (src) videos.push({ url: src, quality: label, originalUrl: src });
    }

    // Iframes (skip ads)
    if (videos.length === 0) {
      for (const f of doc.select("iframe")) {
        const src = f.attr("src") ?? f.attr("data-src") ?? "";
        if (src && !src.includes("google") && !src.includes("facebook") && !src.includes("disqus")) {
          videos.push({ url: src, quality: "Default", originalUrl: src });
        }
      }
    }

    return videos;
  }

  getFilterList() { return []; }
}
