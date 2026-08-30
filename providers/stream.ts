import { ProviderContext, Stream } from "../types";

const BASE_URL = "https://animedekho.app";

function abs(base: string, value?: string) {
  if (!value) return "";
  try { return new URL(value, base).href; } catch { return value; }
}

export const getStream = async function ({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const url = new URL(link, BASE_URL).href;
    const res = await axios.get(url, { headers: commonHeaders, signal });
    const $ = cheerio.load(res.data);
    const streams: Stream[] = [];
    const seen = new Set<string>();

    // Prefer direct HTML5 sources, then embedded iframe players.
    $("video source[src], video[src]").each((_, el) => {
      const src = abs(url, $(el).attr("src"));
      if (!src || seen.has(src)) return;
      seen.add(src);
      const type = $(el).attr("type") || (src.includes(".m3u8") ? "m3u8" : "mp4");
      streams.push({ server: "AnimeDekho", link: src, type, headers: { Referer: url } });
    });

    $("iframe[src]").each((_, el) => {
      const src = abs(url, $(el).attr("src"));
      if (!src || seen.has(src) || /youtube\.com\/embed/i.test(src)) return;
      seen.add(src);
      streams.push({ server: "AnimeDekho Player", link: src, type: "iframe", headers: { Referer: url } });
    });

    // Some pages expose player URLs in data attributes.
    $("[data-src],[data-video],[data-embed]").each((_, el) => {
      const raw = $(el).attr("data-src") || $(el).attr("data-video") || $(el).attr("data-embed");
      const src = abs(url, raw);
      if (!src || seen.has(src) || /youtube\.com\/embed/i.test(src)) return;
      seen.add(src);
      streams.push({ server: "AnimeDekho Player", link: src, type: "iframe", headers: { Referer: url } });
    });

    return streams;
  } catch (err) {
    console.error("AnimeDekho stream error", err);
    return [];
  }
};
