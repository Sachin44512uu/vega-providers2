import { Post, ProviderContext } from "../types";

const BASE_URL = "https://animedekho.app";

function abs(base: string, value?: string) {
  if (!value) return "";
  try {
    return new URL(value, base).href;
  } catch {
    return value;
  }
}

function parsePosts(html: string, baseUrl: string, cheerio: ProviderContext["cheerio"]): Post[] {
  const $ = cheerio.load(html);
  const out: Post[] = [];
  const seen = new Set<string>();

  // AnimeDekho uses article/card links around "Watch Now" / "Watch Series" / "Watch Movies".
  $("a[href]").each((_, el) => {
    const a = $(el);
    const text = a.text().replace(/\s+/g, " ").trim();
    const href = abs(baseUrl, a.attr("href"));
    if (!href || !href.startsWith(BASE_URL)) return;
    if (/\/epi\//.test(href)) return;
    if (/hentaidekho|18\+/i.test(text + " " + href)) return;
    if (!/(watch now|watch series|watch movies|watch)$/i.test(text)) return;

    const card = a.closest("article, .item, .post, .movie, .series, li, .col");
    const title =
      card.find("h1,h2,h3,h4,.title,.name,.entry-title").first().text().trim() ||
      a.prevAll("h1,h2,h3,h4").first().text().trim();
    const image = abs(baseUrl, card.find("img").first().attr("src") || card.find("img").first().attr("data-src"));
    if (!title || seen.has(href)) return;
    seen.add(href);
    out.push({ title, link: href, image });
  });

  return out;
}

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const path = filter || "/home/";
    const url = new URL(path, BASE_URL);
    if (page > 1) url.searchParams.set("paged", String(page));
    const res = await axios.get(url.href, { headers: commonHeaders, signal });
    return parsePosts(res.data, BASE_URL, cheerio);
  } catch (err) {
    console.error("AnimeDekho posts error", err);
    return [];
  }
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    if (page > 1) return [];
    const { axios, cheerio, commonHeaders } = providerContext;
    // AnimeDekho is WordPress-style; the normal site search uses ?s=...
    const url = new URL("/", BASE_URL);
    url.searchParams.set("s", searchQuery);
    const res = await axios.get(url.href, { headers: commonHeaders, signal });
    return parsePosts(res.data, BASE_URL, cheerio);
  } catch (err) {
    console.error("AnimeDekho search error", err);
    return [];
  }
};
