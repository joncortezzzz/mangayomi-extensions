const mangayomiSources = [{
  "name": "Hanime.tv",
  "lang": "en",
  "baseUrl": "https://hanime.tv",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://hanime.tv",
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
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/json;charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
    };
  }

  async postSearch(query, page, orderBy = "created_at_unix") {
    const body = JSON.stringify({
      search: query ?? "",
      tags: [],
      brands: [],
      blacklist: [],
      order_by: orderBy,
      ordering: "desc",
      page: page - 1,
    });
    const res = await new Client().post(
      "https://search.hanime.tv/hentaivideos",
      this.getHeaders(),
      body
    );
    return JSON.parse(res.body);
  }

  parseItem(v) {
    return {
      name: v.name ?? "",
      url: "/hentai-videos/" + (v.slug ?? v.id),
      imageUrl: v.poster_url ?? v.cover_url ?? "",
    };
  }

  async getPopular(page) {
    const data = await this.postSearch("", page, "likes");
    const list = (data.hits ?? []).map(v => this.parseItem(v));
    return { list, hasNextPage: list.length >= 24 };
  }

  async getLatestUpdates(page) {
    const data = await this.postSearch("", page, "created_at_unix");
    const list = (data.hits ?? []).map(v => this.parseItem(v));
    return { list, hasNextPage: list.length >= 24 };
  }

  async search(query, page, filters) {
    const data = await this.postSearch(query, page, "title_sortable");
    const list = (data.hits ?? []).map(v => this.parseItem(v));
    return { list, hasNextPage: list.length >= 24 };
  }

  async getDetail(url) {
    const slug = url.replace("/hentai-videos/", "");
    const res = await new Client().get(
      `https://hanime.tv/api/v8/video?id=${slug}`,
      this.getHeaders()
    );
    const data = JSON.parse(res.body);
    const v = data.hentai_video ?? {};
    const tags = (v.hentai_tags ?? []).map(t => t.text).join(", ");

    // Build episode list from franchise videos if available
    const franchiseVideos = data.hentai_franchise_hentai_videos ?? [];
    let episodes = [];
    if (franchiseVideos.length > 0) {
      episodes = franchiseVideos.map((ep, i) => ({
        name: ep.name ?? `Episode ${i + 1}`,
        url: "/hentai-videos/" + ep.slug,
      }));
    } else {
      episodes = [{ name: v.name ?? "Episode 1", url }];
    }

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
    const res = await new Client().get(
      `https://hanime.tv/api/v8/video?id=${slug}`,
      this.getHeaders()
    );
    const data = JSON.parse(res.body);
    const videos = [];

    const servers = data.videos_manifest?.servers ?? [];
    for (const server of servers) {
      for (const stream of (server.streams ?? [])) {
        if (stream.url && stream.url.length > 5) {
          videos.push({
            url: stream.url,
            quality: stream.height ? `${stream.height}p` : "Default",
            originalUrl: stream.url,
          });
        }
      }
    }

    return videos;
  }

  getFilterList() { return []; }
}
