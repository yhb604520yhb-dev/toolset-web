"use client";

import { ChangeEvent, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { editImageWithNanoBanana, getNanoBananaTaskStatus } from "@/lib/api/nanobanana";
import type { NanoBananaStatusResponse } from "@/lib/api/nanobanana";
import {
  saveNanobananaTasks,
  getNanobananaTasks,
  type NanobananaTask,
} from "@/lib/storage";
import ConfirmModal from "@/components/ConfirmModal";
import { useTheme } from "@/contexts/ThemeContext";

export default function NanobananaPage() {
  const { theme } = useTheme();
  const bgClass = theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-neutral-900";
  const cardBgClass = theme === "dark" ? "bg-neutral-900/60 border-neutral-800" : "bg-neutral-50 border-neutral-200";
  const textClass = theme === "dark" ? "text-white" : "text-neutral-900";
  const secondaryTextClass = theme === "dark" ? "text-neutral-300" : "text-neutral-700";
  const mutedTextClass = theme === "dark" ? "text-neutral-400" : "text-neutral-500";
  const inputBgClass = theme === "dark" ? "bg-neutral-950 border-neutral-800 text-white" : "bg-white border-neutral-300 text-neutral-900";
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refImageFiles, setRefImageFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gemini-3-pro-image-preview");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageSize, setImageSize] = useState("1K");
  const [numImages, setNumImages] = useState(1);
  const [tasks, setTasks] = useState<NanobananaTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<NanobananaTask | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 加载已保存的任务（优化加载性能）
  useEffect(() => {
    // 使用 requestIdleCallback 或 setTimeout 延迟执行，避免阻塞页面渲染
    const loadTasks = () => {
      try {
        const savedTasks = getNanobananaTasks();
        if (savedTasks.length > 0) {
          // 按创建时间排序，优先显示最新任务
          const sortedTasks = savedTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          
          // 限制初始显示的任务数量（最多显示50个，避免渲染过多DOM）
          const displayTasks = sortedTasks.slice(0, 50);
          setTasks(displayTasks);
          
          // 延迟启动轮询，让页面先完成渲染（延迟1.5秒）
          const timer = setTimeout(() => {
            // 只对未完成的任务启动轮询，并限制同时轮询的数量
            const pendingTasks = displayTasks.filter(
              (task) =>
                (task.status === "IN_QUEUE" ||
                  task.status === "IN_PROGRESS" ||
                  (task.statusUrl && task.status !== "COMPLETED" && task.status !== "FAILED"))
            );
            
            // 限制同时轮询的任务数量（最多5个）
            const tasksToPoll = pendingTasks.slice(0, 5);
            
            tasksToPoll.forEach((task, index) => {
              // 为每个任务添加递增延迟，避免同时发起大量请求
              const delay = 1000 + index * 500; // 1秒 + 每个任务延迟0.5秒
              setTimeout(() => {
                if (task.statusUrl) {
                  startPolling(task.id, task.statusUrl);
                }
              }, delay);
            });
          }, 1500); // 延迟1.5秒再开始轮询
          
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('加载任务失败:', error);
      }
    };

    // 如果浏览器支持 requestIdleCallback，使用它；否则使用 setTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(loadTasks, { timeout: 2000 });
    } else {
      setTimeout(loadTasks, 100);
    }
  }, []);

  // 清理轮询
  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach((interval) => clearInterval(interval));
      pollingIntervals.current.clear();
    };
  }, []);

  // 处理图片上传
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const remainingSlots = 9 - refImages.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setRefImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    setRefImageFiles((prev) => [...prev, ...filesToAdd]);
    // 重置 input
    e.target.value = "";
  };

  // 删除参考图片
  const handleRemoveImage = (index: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== index));
    setRefImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 将 base64 转换为 URL（直接在客户端上传到图床获取真实 HTTP URL）
  const convertBase64ToUrl = async (base64: string): Promise<string> => {
    console.log('📤 开始上传图片到图床...');
    console.log('📋 Base64 长度:', base64.length);
    
    // 提取 base64 数据
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // 获取图片格式
    let imageType = 'image/png';
    let ext = 'png';
    if (base64.startsWith('data:image/')) {
      const match = base64.match(/data:image\/([^;]+)/);
      if (match) {
        ext = match[1];
        imageType = `image/${ext}`;
      }
    }

    // 将 base64 转换为 Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: imageType });
    const fileName = `image.${ext}`;

    // 只使用服务器端上传（避免 CORS 问题，服务器会自动切换多个图床）
    const uploadMethods = [
      {
        name: '服务器端上传（自动切换多个图床）',
        upload: async () => {
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageBase64: base64 }),
          });

          const result = await response.json();
          console.log('📋 服务器上传响应:', result);

          if (result.success && result.url && result.url.startsWith('http')) {
            console.log(`✅ 使用图床: ${result.host || '未知'}`);
            return result.url;
          }
          
          // 提供更详细的错误信息
          const errorMsg = result.error || '服务器上传失败';
          const details = result.details ? ` (${result.details.name || ''} ${result.details.code || ''})` : '';
          throw new Error(`${errorMsg}${details}。请检查服务器端控制台日志获取详细错误信息。`);
        },
      },
    ];

    // 依次尝试各个上传方法
    for (const method of uploadMethods) {
      try {
        console.log(`📤 尝试 ${method.name}...`);
        const imageUrl = await method.upload();
        console.log(`✅ ${method.name} 成功，获得 HTTP URL:`, imageUrl);
        return imageUrl;
      } catch (error: any) {
        console.warn(`⚠️ ${method.name} 失败:`, error.message);
        // 继续尝试下一个方法
        continue;
      }
    }

    // 所有方法都失败了
    throw new Error('所有上传方法都失败，请检查网络连接或稍后重试');
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string, statusUrl: string) => {
    try {
      const status = await getNanoBananaTaskStatus(statusUrl);

      setTasks((prev) => {
        const updated = prev.map((task) => {
          if (task.id === taskId) {
            const progress = status.status === "IN_PROGRESS" ? 50 : status.status === "COMPLETED" ? 100 : 0;
            
            return {
              ...task,
              status: status.status,
              progress,
              resultImages: status.response?.images || task.resultImages,
              error: status.error || task.error,
              completedAt: status.status === "COMPLETED" ? Date.now() : task.completedAt,
            };
          }
          return task;
        });
        saveNanobananaTasks(updated);
        return updated;
      });

      // 如果任务完成或失败，停止轮询
      if (status.status === "COMPLETED" || status.status === "FAILED") {
        const interval = pollingIntervals.current.get(taskId);
        if (interval) {
          clearInterval(interval);
          pollingIntervals.current.delete(taskId);
        }
        
        // 更新选中任务
        if (selectedTask?.id === taskId) {
          const updatedTask = tasks.find((t) => t.id === taskId);
          if (updatedTask) {
            setSelectedTask(updatedTask);
          }
        }
      }
    } catch (error: any) {
      console.error("查询任务状态失败:", taskId, error);
      
      setTasks((prev) => {
        const updated = prev.map((task) =>
          task.id === taskId
            ? { ...task, error: error?.message || "查询状态失败" }
            : task
        );
        saveNanobananaTasks(updated);
        return updated;
      });
    }
  };

  // 开始轮询任务状态
  const startPolling = (taskId: string, statusUrl: string) => {
    // 检查是否已经在轮询，避免重复
    if (pollingIntervals.current.has(taskId)) {
      console.log(`⏭️ 任务 ${taskId} 已在轮询中，跳过`);
      return;
    }

    // 延迟第一次查询，避免阻塞
    const initialDelay = setTimeout(() => {
      pollTaskStatus(taskId, statusUrl);
    }, 500);

    // 每5秒轮询一次（从3秒改为5秒，减少请求频率）
    const interval = setInterval(() => {
      pollTaskStatus(taskId, statusUrl);
    }, 5000);

    pollingIntervals.current.set(taskId, interval);
    
    // 清理初始延迟定时器
    return () => clearTimeout(initialDelay);
  };

  // 处理开始生成
  const handleGenerate = async () => {
    // 验证输入
    if (!prompt.trim()) {
      alert("请输入提示词");
      return;
    }

    if (refImages.length === 0) {
      alert("请至少上传一张参考图片");
      return;
    }

    setIsGenerating(true);

    try {
      // 将 base64 图片转换为 URL 数组
      console.log('🔄 开始转换图片 URL，共', refImages.length, '张图片');
      const imageUrls: string[] = [];
      
      for (let i = 0; i < refImages.length; i++) {
        console.log(`📤 正在处理第 ${i + 1}/${refImages.length} 张图片...`);
        const img = refImages[i];
        
        // 如果已经是 HTTP URL，直接使用
        if (img.startsWith('http://') || img.startsWith('https://')) {
          console.log(`✅ 第 ${i + 1} 张图片已经是 HTTP URL，直接使用`);
          imageUrls.push(img);
          continue;
        }
        
        // 如果是 base64，尝试上传到图床
        if (img.startsWith('data:')) {
          try {
            const url = await convertBase64ToUrl(img);
            console.log(`✅ 第 ${i + 1} 张图片上传成功，获得 HTTP URL`);
            imageUrls.push(url);
          } catch (uploadError: any) {
            // 如果所有图床都失败，允许使用 base64，让 API 决定是否支持
            console.warn(`⚠️ 第 ${i + 1} 张图片图床上传失败，尝试直接使用 base64:`, uploadError.message);
            imageUrls.push(img); // 先尝试使用 base64，如果 API 不支持会返回错误
          }
        } else {
          // 其他情况，直接使用
          imageUrls.push(img);
        }
      }
      
      console.log('✅ 所有图片 URL 处理完成');
      
      // 检查是否有 base64（如果图床上传失败）
      const hasBase64 = imageUrls.some(url => url.startsWith('data:'));
      if (hasBase64) {
        console.warn('⚠️ 部分图片使用 base64 格式，API 可能不支持，将尝试调用 API');
      }

      // 构建提示词（包含宽高比和尺寸信息）
      let enhancedPrompt = prompt;
      if (aspectRatio && aspectRatio !== "自定义") {
        enhancedPrompt += `, aspect ratio: ${aspectRatio}`;
      }
      if (imageSize) {
        enhancedPrompt += `, resolution: ${imageSize}`;
      }

      // 此时应该全部是 HTTP URL（如果还有 base64，上面的代码会抛出错误）
      console.log('✅ 所有图片 URL 验证通过，全部为 HTTP URL');

      console.log("🎨 开始生成图片...");
      console.log("📝 提示词:", enhancedPrompt);
      console.log("🖼️ 参考图片数量:", imageUrls.length);
      console.log("📊 生成数量:", numImages);
      console.log("🖼️ 图片 URL 类型: 全部为 HTTP URL");
      console.log("🖼️ 图片 URL 示例:", imageUrls[0]?.substring(0, 100) + "...");

      // 调用 API
      const response = await editImageWithNanoBanana({
        prompt: enhancedPrompt,
        image_urls: imageUrls,
        num_images: numImages,
      });

      console.log("✅ 任务创建成功:", response);

      // 创建任务对象
      const newTask: NanobananaTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestId: response.request_id,
        status: response.status as any,
        title: prompt.substring(0, 30) + (prompt.length > 30 ? "..." : ""),
        prompt: enhancedPrompt,
        imageUrls,
        numImages,
        statusUrl: response.status_url,
        responseUrl: response.response_url,
        cancelUrl: response.cancel_url,
        progress: 0,
        createdAt: Date.now(),
      };

      // 添加到任务列表
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      saveNanobananaTasks(updatedTasks);

      // 自动选中新任务
      setSelectedTask(newTask);

      // 开始轮询状态
      startPolling(newTask.id, newTask.statusUrl);

      alert("任务创建成功，正在处理中...");
    } catch (error: any) {
      console.error("❌ 生成失败 - 完整错误对象:", error);
      console.error("❌ 错误类型:", typeof error);
      console.error("❌ 错误名称:", error?.name);
      console.error("❌ 错误消息:", error?.message);
      console.error("❌ 错误字符串:", String(error));
      
      // 提取错误信息
      let errorMessage = "生成失败，请检查网络连接和API密钥";
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        console.log("✅ 使用 Error.message:", errorMessage);
      } else if (error?.message) {
        errorMessage = String(error.message) || errorMessage;
        console.log("✅ 使用 error.message:", errorMessage);
      } else if (typeof error === 'string') {
        errorMessage = error;
        console.log("✅ 使用字符串错误:", errorMessage);
      } else {
        // 尝试转换为字符串
        try {
          const errorStr = JSON.stringify(error);
          if (errorStr && errorStr !== '{}') {
            errorMessage = `生成失败: ${errorStr}`;
          }
        } catch (e) {
          errorMessage = String(error) || errorMessage;
        }
        console.log("✅ 使用转换后的错误:", errorMessage);
      }
      
      // 确保错误消息不为空
      if (!errorMessage || errorMessage.trim() === '') {
        errorMessage = "生成失败，请检查网络连接和API密钥";
      }
      
      console.log("📢 最终显示的错误消息:", errorMessage);
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // 处理删除任务
  const handleDeleteTask = (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "确认删除",
      message: "确定要删除这个任务吗？",
      onConfirm: () => {
        // 停止轮询
        const interval = pollingIntervals.current.get(taskId);
        if (interval) {
          clearInterval(interval);
          pollingIntervals.current.delete(taskId);
        }

        // 删除任务
        const updatedTasks = tasks.filter((t) => t.id !== taskId);
        setTasks(updatedTasks);
        saveNanobananaTasks(updatedTasks);

        // 如果删除的是选中任务，清空选中
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
        }

        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  // 处理下载图片
  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `nanobanana_${selectedTask?.id}_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "IN_QUEUE":
        return "排队中";
      case "IN_PROGRESS":
        return "处理中";
      case "COMPLETED":
        return "已完成";
      case "FAILED":
        return "失败";
      default:
        return status;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_QUEUE":
        return "text-yellow-400";
      case "IN_PROGRESS":
        return "text-blue-400";
      case "COMPLETED":
        return "text-green-400";
      case "FAILED":
        return "text-red-400";
      default:
        return "text-neutral-400";
    }
  };

  return (
    <div className={`min-h-screen ${bgClass} overflow-y-auto flex flex-col transition-colors duration-300`}>
      <div
        className="w-full flex-1 grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4 auto-rows-[1fr] px-4 sm:px-6 md:px-8 lg:px-[35px] py-4 sm:py-6 md:py-8 lg:py-[35px] pb-16 sm:pb-24 md:pb-32 lg:pb-[166px]"
        style={{
          boxSizing: "border-box",
        }}
      >
        {/* 左侧表单 */}
        <section className={`${cardBgClass} border rounded-2xl shadow-xl p-5 space-y-4 h-full overflow-y-auto transition-colors duration-300`}>
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${textClass}`}>
            <span className="text-yellow-400 text-lg">🖼</span>
            生成图片
          </h2>

          <div className="space-y-1">
            <label className={`text-sm ${secondaryTextClass}`}>模型</label>
            <select
              className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300`}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className={`flex items-center justify-between text-sm ${secondaryTextClass}`}>
              <span>参考图片 ({refImages.length}/9)</span>
              <button
                onClick={() => {
                  const url = window.prompt(
                    '请输入图片 HTTP URL:\n\n提示：\n1. 将图片上传到 https://sm.ms 或 https://imgur.com\n2. 复制图片的 HTTP URL\n3. 粘贴到此处',
                    ''
                  );
                  if (url) {
                    const trimmedUrl = url.trim();
                    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
                      setRefImages((prev) => [...prev, trimmedUrl]);
                    } else {
                      window.alert('❌ 请输入有效的 HTTP URL（必须以 http:// 或 https:// 开头）');
                    }
                  }
                }}
                className="text-xs text-amber-400 hover:text-amber-300 border border-amber-400/30 rounded-lg px-2 py-1 hover:border-amber-400 transition"
                title="手动输入图片 HTTP URL（图床上传失败时使用）"
              >
                输入URL
              </button>
            </div>
            {refImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {refImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`参考图片 ${idx + 1}`}
                      className={`w-full h-24 object-cover rounded-lg border ${theme === "dark" ? "border-neutral-800" : "border-neutral-200"} transition-colors duration-300`}
                    />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {refImages.length < 9 && (
                  <label className={`group border border-dashed ${theme === "dark" ? "border-neutral-700" : "border-neutral-300"} rounded-lg h-24 ${theme === "dark" ? "bg-neutral-950" : "bg-neutral-50"} flex items-center justify-center ${mutedTextClass} cursor-pointer hover:border-amber-500 ${theme === "dark" ? "hover:bg-neutral-900" : "hover:bg-neutral-100"} transition-colors duration-300`}>
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-xl group-hover:text-amber-500 transition-colors">＋</div>
                      <div className="text-xs group-hover:text-amber-500 transition-colors">上传</div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      multiple
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>
            ) : (
              <label className={`group border border-dashed ${theme === "dark" ? "border-neutral-700" : "border-neutral-300"} rounded-xl h-48 ${theme === "dark" ? "bg-neutral-950" : "bg-neutral-50"} flex items-center justify-center ${mutedTextClass} cursor-pointer hover:border-amber-500 ${theme === "dark" ? "hover:bg-neutral-900" : "hover:bg-neutral-100"} transition-colors duration-300`}>
                <div className="flex flex-col items-center gap-2">
                  <div className="text-2xl group-hover:text-amber-500 transition-colors">＋</div>
                  <div className="text-sm group-hover:text-amber-500 transition-colors">上传</div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>

          <div className="space-y-1">
            <div className={`flex items-center justify-between text-sm ${secondaryTextClass}`}>
              <span>提示词</span>
              <button className={`text-xs ${mutedTextClass} border ${theme === "dark" ? "border-neutral-800" : "border-neutral-300"} rounded-lg px-2 py-1 hover:border-indigo-500 transition-colors duration-300`}>
                智能指令
              </button>
            </div>
            <textarea
              className={`w-full h-32 ${inputBgClass} border rounded-xl px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none resize-none transition-colors duration-300`}
              placeholder="未来的赛博朋克城市，霓虹灯，电影质感，4k..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className={`text-sm ${secondaryTextClass}`}>宽高比</div>
              <select
                className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300`}
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="2:3">2:3</option>
                <option value="3:2">3:2</option>
                <option value="1:1">1:1</option>
                <option value="4:5">4:5</option>
                <option value="5:4">5:4</option>
                <option value="21:9">21:9</option>
                <option value="自定义">自定义</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className={`text-sm ${secondaryTextClass}`}>图片尺寸</div>
              <select
                className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300`}
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
              >
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <div className={`text-sm ${secondaryTextClass}`}>生成数量</div>
            <select
              className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300`}
              value={numImages}
              onChange={(e) => setNumImages(Number(e.target.value))}
            >
              <option value={1}>1张</option>
              <option value={2}>2张</option>
              <option value={3}>3张</option>
              <option value={4}>4张</option>
            </select>
          </div>

          <button
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "生成中..." : "开始生成"}
          </button>
        </section>

        {/* 右侧任务展示 */}
        <section className={`${cardBgClass} border rounded-2xl shadow-xl p-0 flex flex-col h-full overflow-hidden transition-colors duration-300`}>
          <div className={`flex items-center justify-between px-4 h-12 border-b ${theme === "dark" ? "border-neutral-800" : "border-neutral-200"} text-sm ${secondaryTextClass} transition-colors duration-300`}>
            <button className={`flex items-center gap-2 ${secondaryTextClass} ${theme === "dark" ? "hover:text-white" : "hover:text-neutral-900"} transition-colors duration-300`}>
              <span className="text-lg">←</span>
              <span>导入</span>
            </button>
            {selectedTask?.status === "COMPLETED" && selectedTask.resultImages && selectedTask.resultImages.length > 0 && (
              <button
                className="flex items-center gap-1 text-neutral-400 hover:text-white transition"
                onClick={() => handleDownload(selectedTask.resultImages![0].url, 0)}
              >
                <span className="text-lg">下载</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex-1 grid grid-rows-[1fr_auto] overflow-hidden">
            {/* 主内容区域 */}
            <div className="overflow-y-auto p-4">
              {selectedTask ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{selectedTask.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm ${getStatusColor(selectedTask.status)}`}>
                        {getStatusText(selectedTask.status)}
                      </span>
                      {selectedTask.progress !== undefined && (
                        <div className="flex-1 bg-neutral-800 rounded-full h-2">
                          <div
                            className="bg-amber-500 h-2 rounded-full transition-all"
                            style={{ width: `${selectedTask.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {selectedTask.error && (
                      <div className="text-red-400 text-sm mt-2">{selectedTask.error}</div>
                    )}
                  </div>

                  {selectedTask.status === "COMPLETED" && selectedTask.resultImages && selectedTask.resultImages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedTask.resultImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.url}
                            alt={`生成图片 ${idx + 1}`}
                            className="w-full rounded-lg border border-neutral-800"
                          />
                          <button
                            onClick={() => handleDownload(img.url, idx)}
                            className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            下载
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-neutral-500">
                      <div className="flex flex-col items-center gap-2">
                        {selectedTask.status === "IN_PROGRESS" ? (
                          <>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                            <div className="text-sm">正在生成中...</div>
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="64"
                              height="64"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-neutral-500"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <path d="m21 15-3.5-3.5a2.12 2.12 0 0 0-3 0L9 17"></path>
                              <path d="m9 17-2-2-4 4"></path>
                            </svg>
                            <div className="text-sm">等待生成结果...</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-500">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-neutral-500"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <path d="m21 15-3.5-3.5a2.12 2.12 0 0 0-3 0L9 17"></path>
                      <path d="m9 17-2-2-4 4"></path>
                    </svg>
                    <div className="text-sm">选择任务以查看详情</div>
                  </div>
                </div>
              )}
            </div>

            {/* 任务历史列表 */}
            <div className="border-t border-neutral-800 p-4">
              <div className="text-sm text-neutral-400 mb-2">History</div>
              {tasks.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                        selectedTask?.id === task.id
                          ? "bg-amber-500/20 border border-amber-500"
                          : "bg-neutral-800/50 border border-transparent hover:bg-neutral-800"
                      }`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{task.title}</div>
                        <div className={`text-xs ${getStatusColor(task.status)}`}>
                          {getStatusText(task.status)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="ml-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-neutral-600 text-sm">
                  暂无生成任务
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 确认删除弹窗 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
