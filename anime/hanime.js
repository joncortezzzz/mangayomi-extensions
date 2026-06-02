const mangayomiSources = [{
  "name": "Hanime.tv",
  "lang": "en",
  "baseUrl": "https://hanime.tv",
  "apiUrl": "https://api.hanime.tv",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://hanime.tv",
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
      "Referer": "https://hanime.tv/",
    };
  }

  // Helper: fetch JSON from hanime API
  async apiGet(path) {
    const res = await new Client().get(
      `https://api.hanime.tv${path}`,
      { "User-Agent": "Mozilla/5.0", "Referer": "https://hanime.tv/" }
    );
    return JSON.parse(res.body);
  }

  // Parse a hentai video object into MPages item format
  parseVideo(item) {
    return {
      name: item.name ?? item.title ?? "",
      url: "/hentai-videos/" + (item.slug ?? ""),
      imageUrl: item.poster_url ?? item.cover_url ?? "",
    };
  }

  async getPopular(page) {
    const data = await this.apiGet(
      `/api/v8/videos?ordering=likes&page=${page - 1}&links=1`
    );
    const list = (data.hentai_videos ?? []).map(v => this.parseVideo(v));
    return { list, hasNextPage: list.length > 0 };
  }

  async getLatestUpdates(page) {
    const data = await this.apiGet(
      `/api/v8/videos?ordering=created_at_unix&page=${page - 1}&links=1`
    );
    const list = (data.hentai_videos ?? []).map(v => this.parseVideo(v));
    return { list, hasNextPage: list.length > 0 };
  }

  async search(query, page, filters) {
    const data = await this.apiGet(
      `/api/v8/videos?search=${encodeURIComponent(query)}&page=${page - 1}&links=1`
    );
    const list = (data.hentai_videos ?? []).map(v => this.parseVideo(v));
    return { list, hasNextPage: list.length > 0 };
  }

  async getDetail(url) {
    // url is like /hentai-videos/some-slug
    const slug = url.replace("/hentai-videos/", "");
    const data = await this.apiGet(`/api/v8/video?id=${slug}`);
    const v = data.hentai_video ?? {};

    const tags = (v.hentai_tags ?? []).map(t => t.text).join(", ");

    const episodes = [{
      name: v.name ?? "Episode 1",
      url: url,
    }];

    return {
      name: v.name ?? "",
      imageUrl: v.poster_url ?? v.cover_url ?? "",
      description: v.description ?? "",
      genre: tags,
      status: 1,
      episodes,
    };
  }

  async getVideoList(url) {
    const slug = url.replace("/hentai-videos/", "");
    const data = await this.apiGet(`/api/v8/video?id=${slug}`);
    const streams = data.videos_manifest?.servers ?? [];

    const videos = [];
    for (const server of streams) {
      for (const stream of (server.streams ?? [])) {
        if (stream.url && stream.url.length > 0) {
          videos.push({
            url: stream.url,
            quality: stream.height ? `${stream.height}p` : "Unknown",
            originalUrl: stream.url,
          });
        }
      }
    }

    return videos;
  }

  getFilterList() {
    return [];
  }
}
