"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { saveApiKey, getApiKey } from "@/lib/storage";
import { useTheme, ThemeProvider } from "@/contexts/ThemeContext";

const titleMap: Record<string, string> = {
  "/sora": "Sora 2 Generator",
  "/veo": "Veo 3.1 Generator",
  "/nanobanana": "Nanobanana Pro Generator",
};

function NoticeBar() {
  return (
    <div className="w-full bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white text-xs md:text-sm py-2 px-4 text-center font-medium shadow-md">
      本工具所有的操作执行都在本地浏览器端，无需上传任何个人数据到服务器~
    </div>
  );
}

function TopNav() {
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "稳号甄选AI工具";
  const { theme, toggleTheme } = useTheme();
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 加载保存的 API Key
  useEffect(() => {
    const savedKey = getApiKey();
    if (savedKey) {
      // 去除 Bearer 前缀，显示原始密钥
      const displayKey = savedKey.replace(/^Bearer\s*/i, '').trim();
      // 如果之前保存的密钥包含 Bearer 前缀，现在去除并重新保存（迁移旧数据）
      if (savedKey !== displayKey) {
        saveApiKey(displayKey);
      }
      setApiKey(displayKey);
    }
  }, []);

  // 验证 API 密钥是否有效
  // key: 原始密钥（不包含 Bearer 前缀）
  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      // 去除可能存在的 Bearer 前缀，然后添加前缀用于验证
      const cleanKey = key.replace(/^Bearer\s*/i, '').trim();
      if (!cleanKey) {
        console.error('❌ 密钥验证失败：密钥为空');
        return false;
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_SORA2_API_URL || 'https://ai.604520.top';
      // 使用查询任务状态端点来验证密钥（这个端点是确认存在的）
      // 查询一个不存在的任务ID，通过状态码判断密钥是否有效
      // 端点：GET /v1/videos/{id}
      // - 如果密钥有效：返回 404（任务不存在但认证通过）
      // - 如果密钥无效：返回 401/403（未授权）
      const testTaskId = 'validation-test-' + Date.now();
      const testUrl = `${baseUrl}/v1/videos/${testTaskId}`;
      
      // 验证时添加 Bearer 前缀
      const authKey = `Bearer ${cleanKey}`;
      
      console.log('🔐 开始验证密钥...', { testUrl, hasKey: !!cleanKey });
      
      // 创建一个可控制的 AbortController，以便更好地处理超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 增加到30秒
      
      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': authKey,
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        console.log('📊 验证响应状态码:', response.status);

        // 如果返回 401 或 403，说明密钥无效或未授权
        if (response.status === 401 || response.status === 403) {
          console.error('❌ 密钥验证失败：未授权', response.status);
          return false;
        }
        
        // 如果返回 404，说明密钥有效（能通过认证），只是任务不存在
        if (response.status === 404) {
          console.log('✅ 密钥验证成功：返回 404（认证通过，任务不存在）');
          return true;
        }
        
        // 如果返回 400，说明请求格式问题，但认证通过了，也认为密钥有效
        if (response.status === 400) {
          console.log('✅ 密钥验证成功：返回 400（认证通过，请求格式问题）');
          return true;
        }
        
        // 如果返回 200，也认为密钥有效（虽然这种情况不太可能，因为任务ID是随机生成的）
        if (response.status === 200) {
          console.log('✅ 密钥验证成功：返回 200');
          return true;
        }
        
        // 其他状态码，记录并返回 false
        console.error('❌ 密钥验证失败：未知状态码', response.status);
        // 尝试读取响应体获取更多信息
        try {
          const text = await response.text();
          console.error('响应内容:', text.substring(0, 200));
        } catch (e) {
          // 忽略读取错误
        }
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      // 如果是 AbortError（超时），可能是网络问题或API响应慢
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.error('❌ 密钥验证失败：请求超时（30秒）', error.message);
        console.warn('⚠️ 提示：API服务器响应较慢，可能是网络问题。如果确定密钥正确，可以稍后重试。');
        return false;
      }
      
      // 检查是否是网络错误
      if (error.message && error.message.includes('Failed to fetch')) {
        console.error('❌ 密钥验证失败：网络连接错误', error.message);
        return false;
      }
      
      // 其他错误，记录并返回 false
      console.error('❌ 密钥验证失败：未知错误', error.name, error.message);
      return false;
    }
  };

  // 处理保存配置
  const handleSave = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      alert("请输入 API 密钥");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);
    setErrorMessage("");

    try {
      // 去除 Bearer 前缀，保存原始密钥
      const cleanKey = trimmedKey.replace(/^Bearer\s*/i, '').trim();
      
      if (!cleanKey) {
        setSaveError(true);
        setErrorMessage("请输入有效的 API 密钥");
        setTimeout(() => {
          setSaveError(false);
          setErrorMessage("");
        }, 3000);
        return;
      }
      
      // 验证 API 密钥（验证时会自动添加 Bearer 前缀）
      console.log('🔐 正在验证 API 密钥...');
      const isValid = await validateApiKey(cleanKey);
      
      if (!isValid) {
        // 密钥验证失败
        setSaveError(true);
        setErrorMessage("密钥错误");
        console.error('❌ API 密钥验证失败');
        
        // 3秒后清除错误状态
        setTimeout(() => {
          setSaveError(false);
          setErrorMessage("");
        }, 3000);
        return;
      }
      
      // 密钥验证成功，保存原始密钥（不包含 Bearer 前缀）到本地存储
      console.log('✅ API 密钥验证成功');
      saveApiKey(cleanKey);
      
      // 更新显示（去除 Bearer 前缀）
      setApiKey(cleanKey);
      
      // 显示成功提示
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("保存配置失败:", error);
      setSaveError(true);
      setErrorMessage("验证失败，请检查网络连接");
      setTimeout(() => {
        setSaveError(false);
        setErrorMessage("");
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理输入框失去焦点时清理 Bearer 前缀（仅用于显示）
  const handleBlur = () => {
    const value = apiKey.trim();
    if (!value || value === "Bearer") {
      setApiKey("");
    } else {
      // 去除 Bearer 前缀，保存原始密钥格式
      const cleanedValue = value.replace(/^Bearer\s*/i, '').trim();
      if (cleanedValue) {
        setApiKey(cleanedValue);
      } else {
        setApiKey("");
      }
    }
  };

  return (
    <header className={`h-16 border-b flex items-center justify-between px-4 sm:px-6 backdrop-blur-md transition-colors duration-300 ${
      theme === "dark" 
        ? "border-neutral-800 bg-neutral-950/70" 
        : "border-neutral-200 bg-white/70"
    }`}>
      <div className="flex items-center gap-3">
        <a
          href="/"
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
            theme === "dark"
              ? "bg-neutral-800 hover:bg-neutral-700 text-white"
              : "bg-neutral-200 hover:bg-neutral-300 text-neutral-900"
          }`}
          aria-label="返回主页"
        >
          ←
        </a>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
        <span className={`text-lg font-bold tracking-tight ${
          theme === "dark" ? "text-white" : "text-neutral-900"
        }`}>{title}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* API 密钥输入框和保存按钮 */}
        <div className="hidden md:flex items-center gap-2 mr-2">
          <label className={`text-sm font-medium whitespace-nowrap ${
            theme === "dark" ? "text-neutral-300" : "text-neutral-700"
          }`}>
            API密钥
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={handleBlur}
            placeholder="API 密钥"
            className={`w-[360px] px-3 py-1.5 border rounded-lg placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm ${
              theme === "dark"
                ? "bg-neutral-900 border-neutral-700 text-white"
                : "bg-white border-neutral-300 text-neutral-900"
            }`}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              saveSuccess
                ? "bg-green-600 text-white"
                : saveError
                ? "bg-red-600 text-white"
                : isSaving
                ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            }`}
          >
            {saveSuccess ? (
              <span className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
                已保存
              </span>
            ) : saveError ? (
              <span className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {errorMessage || "密钥错误"}
              </span>
            ) : isSaving ? (
              "验证中..."
            ) : (
              "保存设置"
            )}
          </button>
        </div>
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
          aria-label="主题"
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-all ${
            theme === "dark"
              ? "text-neutral-400 hover:text-white hover:bg-neutral-800"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200"
          }`}
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
          aria-label="语言"
          className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
            theme === "dark"
              ? "text-neutral-400 hover:text-white hover:bg-neutral-800"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200"
          }`}
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
      </div>
    </header>
  );
}


function LayoutContent({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-neutral-900"
    }`}>
      <div className="sticky top-0 z-50 flex flex-col">
        <NoticeBar />
        <TopNav />
      </div>
      <main>{children}</main>
    </div>
  );
}

export default function WithNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LayoutContent>{children}</LayoutContent>
    </ThemeProvider>
  );
}

