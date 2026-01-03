import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*", // 对所有爬虫生效
        allow: "/",
        disallow: ["/api/"], // 禁止爬取 API 路由
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot"], // 专门针对 AI 爬虫
        allow: "/",
      },
    ],
    sitemap: "https://job-signal.vercel.app/sitemap.xml", // 替换成你的真实域名
  };
}
