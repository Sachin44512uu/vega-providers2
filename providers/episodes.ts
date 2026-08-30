import { EpisodeLink, ProviderContext } from "../types";

const BASE_URL = "https://animedekho.app";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const page = new URL(url, BASE_URL).href;
    const res = await axios.get(page, { headers: commonHeaders });
    const $ = cheerio.load(res.data);
    const out: EpisodeLink[] = [];
    $("a[href*='/epi/']").each((_, el) => {
      const a = $(el);
      const link = new URL(a.attr("href") || "", page).href;
      const title = a.text().replace(/\s+/g, " ").trim() || "Episode";
      if (/18\+|hentai/i.test(title + " " + link)) return;
      if (link && !out.some(x => x.link === link)) out.push({ title, link });
    });
    return out;
  } catch (err) {
    console.error("AnimeDekho episodes error", err);
    return [];
  }
};
