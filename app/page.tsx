"use client";

import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type ModelCard = {
  title: string;
  description: string;
  href: string;
  accent: string;
  border: string;
  icon: JSX.Element;
};

const lightningIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-7 h-7"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const videoIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-7 h-7"
  >
    <path d="m22 8-6 4 6 4V8Z"></path>
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>
  </svg>
);

const imageIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-7 h-7"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
    <circle cx="9" cy="9" r="2"></circle>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
  </svg>
);

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  
  // 主题相关的样式类
  const bgClass = theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-neutral-900";
  const headerBgClass = theme === "dark" ? "border-neutral-800 bg-neutral-950/70" : "border-neutral-200 bg-white/70";
  const cardBgClass = theme === "dark" ? "bg-neutral-900 border-neutral-800" : "bg-neutral-50 border-neutral-200";
  const cardTextClass = theme === "dark" ? "text-white" : "text-neutral-900";
  const mutedTextClass = theme === "dark" ? "text-neutral-400" : "text-neutral-600";
  const buttonHoverClass = theme === "dark" ? "hover:text-white hover:bg-neutral-800" : "hover:text-neutral-900 hover:bg-neutral-200";
  const footerClass = theme === "dark" ? "border-neutral-800 bg-neutral-950/60 text-neutral-500" : "border-neutral-200 bg-neutral-50/60 text-neutral-600";
  const qrBgClass = theme === "dark" ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200";

  const cards: ModelCard[] = useMemo(
    () => [
      {
        title: "Sora 2",
        description: "OpenAI 最新一代视频生成模型，创造逼真且富有想象力的场景。",
        href: "/sora",
        accent: "from-indigo-600 via-indigo-500 to-blue-500",
        border: "border-indigo-200 dark:border-neutral-800",
        icon: lightningIcon,
      },
      {
        title: "Veo 3.1",
        description: "Google DeepMind 视频生成技术，专注于高清电影级创作。",
        href: "/veo",
        accent: "from-purple-600 via-purple-500 to-pink-500",
        border: "border-purple-200 dark:border-neutral-800",
        icon: videoIcon,
      },
      {
        title: "Nanobanana Pro",
        description: "专业级图片生成工具，为您的创意提供无限可能。",
        href: "/nanobanana",
        accent: "from-yellow-500 via-amber-400 to-orange-400",
        border: "border-yellow-200 dark:border-neutral-800",
        icon: imageIcon,
      },
    ],
    []
  );

  return (
    <div className={`min-h-screen flex flex-col ${bgClass} transition-colors duration-300 font-[family-name:var(--font-geist-sans)]`}>
        <div className="flex flex-col sticky top-0 z-40">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-xs md:text-sm py-2 px-4 text-center font-medium shadow-md">
            本工具所有的操作执行都在本地浏览器端，无需上传任何个人数据到服务器~
          </div>
        <header className={`h-16 border-b flex items-center justify-between px-6 ${headerBgClass} backdrop-blur-md transition-colors duration-300`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20">
                {lightningIcon}
              </div>
              <h1 className={`text-lg font-bold tracking-tight ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>
                稳号甄选AI工具
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://ai604520.apifox.cn"
            target="_blank"
            rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 mr-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                使用教程
          </a>
          <a
                href="https://ai.604520.top"
            target="_blank"
            rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-500/20 mr-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <circle cx="7.5" cy="15.5" r="5.5"></circle>
                  <path d="m21 2-9.6 9.6"></path>
                  <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                </svg>
                获取令牌
              </a>
              <button
                className={`p-2 rounded-lg transition-all ${theme === "dark" ? "text-neutral-400 hover:text-white hover:bg-neutral-800" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200"}`}
                title="主题"
                onClick={toggleTheme}
              >
                {theme === "dark" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="m4.93 4.93 1.41 1.41"></path>
                    <path d="m17.66 17.66 1.41 1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="m6.34 17.66-1.41 1.41"></path>
                    <path d="m19.07 4.93-1.41 1.41"></path>
                  </svg>
                )}
              </button>
              <button
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${buttonHoverClass}`}
                title="语言"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="m5 8 6 6"></path>
                  <path d="m4 14 6-6 2-3"></path>
                  <path d="M2 5h12"></path>
                  <path d="M7 2h1"></path>
                  <path d="m22 22-5-10-5 10"></path>
                  <path d="M14 18h6"></path>
                </svg>
                <span className="text-xs font-bold uppercase">zh</span>
              </button>
              <button
                className={`p-2 rounded-lg transition-all ${buttonHoverClass}`}
                title="设置"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </header>
        </div>

        <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col items-center justify-center">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
              选择生成模型
            </h2>
            <p className={`${mutedTextClass} max-w-2xl mx-auto`}>
              探索最先进的AI视频和图片生成技术
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
            {cards.slice(0, 2).map((card) => (
              <a
                key={card.title}
                className={`group relative ${cardBgClass} border rounded-2xl p-8 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1`}
                href={card.href}
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.accent} rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity`}
                ></div>
                <div
                  className={`w-14 h-14 ${card.border.replace("border", "bg")} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {card.icon}
                  </span>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${cardTextClass}`}>
                  {card.title}
                </h3>
                <p className={`${mutedTextClass} mb-4`}>
                  {card.description}
                </p>
                <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium group-hover:gap-2 transition-all">
                  开始生成 <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl mt-8">
            {cards.slice(2, 3).map((card) => (
              <a
                key={card.title}
                className={`group relative ${cardBgClass} border rounded-2xl p-8 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1`}
                href={card.href}
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.accent} rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity`}
                ></div>
                <div
                  className={`w-14 h-14 ${card.border.replace("border", "bg")} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {card.icon}
                  </span>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${cardTextClass}`}>
                  {card.title}
                </h3>
                <p className={`${mutedTextClass} mb-4`}>
                  {card.description}
                </p>
                <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium group-hover:gap-2 transition-all">
                  开始生成 <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </a>
            ))}
            <div className="flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className={`p-2 ${qrBgClass} rounded-xl shadow-lg border`}>
              <img
                  src="/images/wechat-qr.png"
                alt="WeChat QR Code"
                className="w-48 h-48 object-contain rounded-lg"
              />
            </div>
              <div className={`space-y-1 ${mutedTextClass}`}>
              <p className="font-medium">如果您发现BUG或者有建议，欢迎加群反馈</p>
                <p className="text-sm">或者添加我的微信：yhb5151604</p>
              </div>
            </div>
          </div>
        </main>

        <footer className={`py-6 text-center text-sm border-t backdrop-blur ${footerClass}`}>
          © 2025 NexusGen Controller. All rights reserved.
      </footer>
    </div>
  );
}
