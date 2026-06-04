const mangayomiSources = [{
  "name": "HentaiMama",
  "lang": "en",
  "baseUrl": "https://hentaimama.io",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://hentaimama.io",
  "typeSource": "single",
  "isManga": false,
  "isNsfw": true,
  "version": "0.0.4",
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
    const title = el.selectFirst(".entry-title, h2, h3, .title") ?? el.selectFirst("a[title]");
    const name = (title?.text?.trim() ?? a?.attr("title") ?? img?.attr("alt") ?? "Unknown").trim();
    const url = a?.attr("href") ?? "";
    const imageUrl = img?.attr("data-src") ?? img?.attr("src") ?? "";
    return { name, url, imageUrl };
  }

  async getPopular(page) {
    const doc = await this.fetchDoc(`https://hentaimama.io/tvshows/page/${page}/`);
    const list = doc.select("article").map(el => this.parseCard(el)).filter(v => v.url && v.name !== "Unknown");
    const hasNextPage = !!doc.selectFirst("a.next, .next a");
    return { list, hasNextPage };
  }

  async getLatestUpdates(page) {
    const doc = await this.fetchDoc(`https://hentaimama.io/episodes/page/${page}/`);
    const list = doc.select("article").map(el => this.parseCard(el)).filter(v => v.url && v.name !== "Unknown");
    const hasNextPage = !!doc.selectFirst("a.next, .next a");
    return { list, hasNextPage };
  }

  async search(query, page, filters) {
    const doc = await this.fetchDoc(`https://hentaimama.io/page/${page}/?s=${encodeURIComponent(query)}`);
    const list = doc.select("article").map(el => this.parseCard(el)).filter(v => v.url);
    return { list, hasNextPage: false };
  }

  async getDetail(url) {
    const doc = await this.fetchDoc(url);

    const name = (
      doc.selectFirst(".sheader h1")?.text ??
      doc.selectFirst("h1.entry-title")?.text ??
      doc.selectFirst("h1")?.text ??
      "Unknown"
    ).trim();

    const imageUrl = (
      doc.selectFirst(".poster img")?.attr("src") ??
      doc.selectFirst(".thumb img")?.attr("src") ??
      doc.selectFirst("img.wp-post-image")?.attr("src") ??
      ""
    );

    const description = (
      doc.selectFirst(".wp-content p")?.text ??
      doc.selectFirst(".sinopsis p")?.text ??
      doc.selectFirst(".description")?.text ??
      ""
    ).trim();

    // Try to get episode list
    const epEls = doc.select(".episodios li a, #episodes li a, .episodes a");
    let episodes = epEls
      .map((a, i) => ({
        name: (a.text?.trim() || `Episode ${i + 1}`),
        url: a.attr("href") ?? "",
      }))
      .filter(e => e.url);

    // Always fallback to current URL if no episodes found
    if (episodes.length === 0) {
      episodes = [{ name: name !== "Unknown" ? name : "Watch", url }];
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
    const doc = await this.fetchDoc(url);
    const videos = [];

    for (const s of doc.select("source[src]")) {
      const src = s.attr("src") ?? "";
      if (src) videos.push({ url: src, quality: s.attr("label") ?? "Default", originalUrl: src });
    }

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
