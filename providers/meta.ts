import { Info, Link, ProviderContext } from "../types";

const BASE_URL = "https://animedekho.app";

function abs(base: string, value?: string) {
  if (!value) return "";
  try { return new URL(value, base).href; } catch { return value; }
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const url = new URL(link, BASE_URL).href;
    const res = await axios.get(url, { headers: commonHeaders });
    const $ = cheerio.load(res.data);

    const title = $("h1").first().text().trim() || $("title").text().split("|")[0].trim();
    const image = abs(url, $("meta[property='og:image']").attr("content") || $("img").first().attr("src"));
    const synopsis = $("meta[name='description']").attr("content") || $(".description,.entry-content,.summary").first().text().replace(/\s+/g, " ").trim();
    const tags: string[] = [];
    $("a[href]").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text && /anime|cartoon|series|movie|hindi|tamil|telugu|action|adventure|comedy|drama|fantasy|animation/i.test(text) && text.length < 40) {
        if (!tags.includes(text)) tags.push(text);
      }
    });

    const directLinks: Link["directLinks"] = [];
    $("a[href]").each((_, el) => {
      const a = $(el);
      const href = abs(url, a.attr("href"));
      const text = a.text().replace(/\s+/g, " ").trim();
      if (!href || !href.startsWith(BASE_URL) || !/\/epi\//.test(href)) return;
      if (/18\+|hentai/i.test(text + " " + href)) return;
      if (directLinks.some(x => x.link === href)) return;
      directLinks.push({
        title: text || href.split("/").filter(Boolean).pop() || "Episode",
        link: href,
        type: "series",
      });
    });

    const isEpisode = /\/epi\//.test(url);
    return {
      title,
      image,
      poster: image,
      synopsis,
      imdbId: "",
      type: isEpisode ? "series" : (directLinks.length ? "series" : "movie"),
      tags: tags.slice(0, 12),
      linkList: directLinks.length ? [{ title: "Episodes", directLinks }] : [{ title: "Watch", directLinks: [{ title: "Open AnimeDekho", link: url }] }],
      webUrl: url,
    };
  } catch (err) {
    console.error("AnimeDekho metadata error", err);
    return { title: "", image: "", synopsis: "", imdbId: "", type: "movie", linkList: [] };
  }
};
