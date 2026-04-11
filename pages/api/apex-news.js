import axios from "axios";
import * as cheerio from "cheerio";

const APEX_NEWS_URL =
  "https://www.ea.com/ja/games/apex-legends/apex-legends/news?page=1&type=latest";

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function summarize(text, max = 80) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default async function handler(req, res) {
  try {
    const response = await axios.get(APEX_NEWS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(response.data);
    const results = [];
    const seen = new Set();

    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const text = normalize($(el).text());

      if (!href) return;
      if (!href.includes("/games/apex-legends/apex-legends/news/")) return;
      if (!text || text.length < 10) return;

      const fullUrl = href.startsWith("http")
        ? href
        : `https://www.ea.com${href}`;

      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      results.push({
        title: text,
        summary: summarize(text),
        url: fullUrl,
        source: "EA Official",
      });
    });

    res.status(200).json(results.slice(0, 5));
  } catch (error) {
    console.error("apex-news error", error.message);
    res.status(200).json([
      {
        title: "Apex公式ニュースを取得できませんでした",
        summary: "EA公式ニュースページの取得に失敗しました。",
        url: APEX_NEWS_URL,
        source: "EA Official",
      },
    ]);
  }
}