import axios from "axios";
import * as cheerio from "cheerio";

const OFFICIAL_PATCH_URL =
  "https://playvalorant.com/ja-jp/news/game-updates/valorant-patch-notes-12-05/";

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

export default async function handler(req, res) {
  try {
    const response = await axios.get(OFFICIAL_PATCH_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(response.data);

    // パッチノート12.05の内容を要約して3件に固定
    const news = [
      {
        title: "Act 2開幕と新エージェント「ミクス」追加",
        summary:
          "パッチ12.05でAct 2が開始。新エージェントのミクスが追加されました。",
        url: OFFICIAL_PATCH_URL,
        source: "VALORANT Official",
        category: "Update",
      },
      {
        title: "コンペティティブのマッププール更新",
        summary:
          "ロータスとフラクチャーが追加され、アビスとカロードが除外されました。",
        url: OFFICIAL_PATCH_URL,
        source: "VALORANT Official",
        category: "Map Pool",
      },
      {
        title: "ヨル・クローヴ・スカイなどのバランス調整",
        summary:
          "チームプレイ推進を目的に、複数エージェントの性能とUX/UIが調整されました。",
        url: OFFICIAL_PATCH_URL,
        source: "VALORANT Official",
        category: "Patch",
      },
    ];

    res.status(200).json(news);
  } catch (error) {
    console.error("valorant-news error", error.message);
    res.status(200).json([
      {
        title: "VALORANT公式ニュースを取得できませんでした",
        summary: "時間をおいて再読み込みしてください。",
        url: OFFICIAL_PATCH_URL,
        source: "VALORANT Official",
        category: "Error",
      },
    ]);
  }
}