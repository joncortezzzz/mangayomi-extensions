const mangayomiSources = [{
  "name": "AnimeIDHentai",
  "lang": "en",
  "baseUrl": "https://animeidhentai.com",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://animeidhentai.com",
  "typeSource": "single",
  "isManga": false,
  "isNsfw": true,
  "version": "0.0.1",
  "appMinVerReq": "0.5.0",
  "sourceCodeLanguage": 1,
}];

class DefaultExtension extends MProvider {
  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://animeidhentai.com/",
    };
  }

  async fetchDoc(url) {
    const res = await new Client().get(url, this.getHeaders());
    return new Document(res.body);
  }

  // Parse a card from listing pages — based on real HTML structure
  parseCard(el) {
    const watchLink = el.selectFirst("a[href*='animeidhentai.com']");
    const img = el.selectFirst("img");
    const title = el.selectFirst("h3, h2, .title, p");
    return {
      name: (title?.text?.trim() ?? img?.attr("alt") ?? "").trim(),
      url: watchLink?.attr("href") ?? "",
      imageUrl: img?.attr("src") ?? img?.attr("data-src") ?? "",
    };
  }

  async getPopular(page) {
    // Use trending as "popular"
    const doc = await this.fetchDoc(
      page === 1
        ? "https://animeidhentai.com/trending/"
        : `https://animeidhentai.com/trending/page/${page}/`
    );
    const cards = doc.select("article, .video-block, .item");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    const next = doc.selectFirst("a.next, .next a, a[rel='next']");
    return { list, hasNextPage: !!next };
  }

  async getLatestUpdates(page) {
    const doc = await this.fetchDoc(
      page === 1
        ? "https://animeidhentai.com/"
        : `https://animeidhentai.com/page/${page}/`
    );
    const cards = doc.select("article, .video-block, .item");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    const next = doc.selectFirst("a.next, .next a, a[rel='next']");
    return { list, hasNextPage: !!next };
  }

  async search(query, page, filters) {
    const doc = await this.fetchDoc(
      `https://animeidhentai.com/?s=${encodeURIComponent(query)}`
    );
    const cards = doc.select("article, .video-block, .item");
    const list = cards.map(el => this.parseCard(el)).filter(v => v.url && v.name);
    return { list, hasNextPage: false };
  }

  async getDetail(url) {
    const doc = await this.fetchDoc(url);

    // Title from h1
    const name = (doc.selectFirst("h1")?.text ?? "").trim();

    // Thumbnail from og:image meta or wp-content img
    const imageUrl = doc.selectFirst("meta[property='og:image']")?.attr("content")
      ?? doc.selectFirst("img[src*='wp-content']")?.attr("src")
      ?? "";

    // Description from first paragraph in article body
    const description = (doc.selectFirst(".entry-content p, article p")?.text ?? "").trim();

    // Genres
    const genre = doc.select("a[href*='/genre/']")
      .map(a => a.text.trim())
      .filter(t => t)
      .join(", ");

    // This site has no episode list — each URL IS the episode
    // But check for related episodes in "More Like This" section with same series name
    const episodes = [{ name: name || "Watch", url }];

    return {
      name: name || "Unknown",
      imageUrl,
      description,
      genre,
      status: 1,
      episodes,
    };
  }

  async getVideoList(url) {
    const doc = await this.fetchDoc(url);
    const videos = [];

    // nhplayer iframe — the main player on this site
    const iframes = doc.select("iframe");
    for (const f of iframes) {
      const src = f.attr("src") ?? f.attr("data-src") ?? "";
      if (
        src &&
        !src.includes("google") &&
        !src.includes("facebook") &&
        !src.includes("disqus") &&
        !src.includes("adtng") &&
        src.startsWith("http")
      ) {
        videos.push({
          url: src,
          quality: "Default",
          originalUrl: src,
        });
      }
    }

    // Also try direct video sources
    for (const s of doc.select("source[src]")) {
      const src = s.attr("src") ?? "";
      const label = s.attr("label") ?? s.attr("size") ?? "Default";
      if (src) videos.push({ url: src, quality: label, originalUrl: src });
    }

    return videos;
  }

  getFilterList() { return []; }
}
