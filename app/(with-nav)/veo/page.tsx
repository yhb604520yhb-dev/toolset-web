"use client";

import { ChangeEvent, useMemo, useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { createVeo3Video, createVeo3VideoOpenAI, getVeo3TaskStatus, shouldUseOpenAIFormat } from "@/lib/api/veo3";
import { saveVeo3Tasks, getVeo3Tasks, type Veo3Task } from "@/lib/storage";

type Aspect = { label: string; value: string };

export default function VeoPage() {
  const { theme } = useTheme();
  const bgClass = theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-neutral-900";
  const cardBgClass = theme === "dark" ? "bg-neutral-900/60 border-neutral-800" : "bg-neutral-50 border-neutral-200";
  const textClass = theme === "dark" ? "text-white" : "text-neutral-900";
  const secondaryTextClass = theme === "dark" ? "text-neutral-300" : "text-neutral-700";
  const mutedTextClass = theme === "dark" ? "text-neutral-400" : "text-neutral-500";
  const inputBgClass = theme === "dark" ? "bg-neutral-950 border-neutral-800 text-white" : "bg-white border-neutral-300 text-neutral-900";
  const buttonBgClass = theme === "dark" ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200";
  
  const aspects: Aspect[] = useMemo(
    () => [
      { label: "16:9（横屏）", value: "16:9" },
      { label: "9:16（竖屏）", value: "9:16" },
    ],
    []
  );

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("veo3");
  const [aspect, setAspect] = useState(aspects[0]?.value ?? "16:9");
  // veo3 模型默认开启提示词优化和分辨率提升
  const [resolutionOn, setResolutionOn] = useState(true);
  const [promptOptOn, setPromptOptOn] = useState(true);
  const [refImageA, setRefImageA] = useState<string | null>(null);
  const [refImageB, setRefImageB] = useState<string | null>(null);
  const [videoTasks, setVideoTasks] = useState<Veo3Task[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Veo3Task | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isMountedRef = useRef(true);

  // 组件卸载标记
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 清理所有轮询
      pollingIntervals.current.forEach((interval) => clearInterval(interval));
      pollingIntervals.current.clear();
    };
  }, []);

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    // 检查组件是否仍然挂载
    if (!isMountedRef.current) {
      const interval = pollingIntervals.current.get(taskId);
      if (interval) {
        clearInterval(interval);
        pollingIntervals.current.delete(taskId);
      }
      return;
    }

    try {
      console.log(`🔄 查询任务状态: ${taskId}`);
      const status = await getVeo3TaskStatus(taskId);
      
      // 再次检查组件是否仍然挂载
      if (!isMountedRef.current) {
        return;
      }
      
      console.log(`📊 任务状态更新:`, {
        id: taskId,
        status: status.status,
        progress: status.progress || 0,
        videoUrl: status.video_url ? '已生成' : '未生成',
      });
      
      setVideoTasks((prev) => {
        // 再次检查组件是否仍然挂载
        if (!isMountedRef.current) {
          return prev;
        }
        const updated = prev.map((task) => {
          if (task.id === taskId) {
            // 优先使用 API 返回的进度，如果 API 没有返回，保持原有进度或根据状态估算
            let newProgress = status.progress;
            
            if (newProgress === undefined || newProgress === null) {
              // 如果 API 没有返回进度，根据状态估算
              const statusProgressMap: Record<string, number> = {
                'pending': 0,
                'queued': 5,
                'image_downloading': 10, // 图片下载中
                'processing': 30,
                'in_progress': 50,
                'video_generating': 60,
                'video_upsampling': 80,
                'completed': 100,
                'succeeded': 100,
                'failed': task.progress || 0,
              };
              // 如果状态包含某些关键词，也映射到对应的进度
              if (status.status && typeof status.status === 'string') {
                if (status.status.includes('image') || status.status.includes('download')) {
                  newProgress = 10;
                } else if (status.status.includes('generating')) {
                  newProgress = 60;
                } else if (status.status.includes('upsampling') || status.status.includes('upsample')) {
                  newProgress = 80;
                } else {
                  newProgress = statusProgressMap[status.status] !== undefined 
                    ? statusProgressMap[status.status] 
                    : (task.progress || 0);
                }
              } else {
                newProgress = statusProgressMap[status.status] !== undefined 
                  ? statusProgressMap[status.status] 
                  : (task.progress || 0);
              }
            }
            
            // OpenAI 格式可能返回 queued, processing, completed
            // JSON 格式可能返回 pending, processing, video_generating, video_upsampling, completed, succeeded, failed
            const isCompleted = status.status === 'completed' || status.status === 'succeeded';
            const isFailed = status.status === 'failed';
            
            // 如果任务完成或失败，停止轮询
            if (isCompleted || isFailed) {
              const interval = pollingIntervals.current.get(taskId);
              if (interval) {
                clearInterval(interval);
                pollingIntervals.current.delete(taskId);
              }
              // 完成时确保进度为100%
              if (isCompleted) {
                newProgress = 100;
              }
            }
            
            console.log(`📈 更新任务进度: ${taskId} - 状态: ${status.status}, 进度: ${newProgress}%`);
            
            return {
              ...task,
              status: status.status,
              progress: newProgress,
              videoUrl: status.video_url || task.videoUrl,
              error: status.error || task.error,
            };
          }
          return task;
        });
        saveVeo3Tasks(updated);
        return updated;
      });
    } catch (error: any) {
      console.error(`❌ 查询任务状态失败 (${taskId}):`, error);
      
      // 如果是网络错误或超时，不更新任务状态，继续轮询
      if (error.message && (error.message.includes('超时') || error.message.includes('网络'))) {
        return;
      }
      
      // 其他错误，更新任务状态（仅在组件挂载时）
      if (isMountedRef.current) {
        setVideoTasks((prev) => {
          if (!isMountedRef.current) {
            return prev;
          }
          const updated = prev.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                status: 'failed',
                error: error.message || '查询任务状态失败',
              };
            }
            return task;
          });
          saveVeo3Tasks(updated);
          return updated;
        });
      }
      
      // 停止轮询
      const interval = pollingIntervals.current.get(taskId);
      if (interval) {
        clearInterval(interval);
        pollingIntervals.current.delete(taskId);
      }
    }
  };

  // 开始轮询
  const startPolling = (taskId: string) => {
    // 检查组件是否仍然挂载
    if (!isMountedRef.current) {
      return;
    }
    // 立即查询一次
    pollTaskStatus(taskId);
    
    // 每3秒轮询一次
    const interval = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(interval);
        pollingIntervals.current.delete(taskId);
        return;
      }
      pollTaskStatus(taskId);
    }, 3000);
    
    pollingIntervals.current.set(taskId, interval);
  };

  // 加载保存的任务
  useEffect(() => {
    const savedTasks = getVeo3Tasks();
    if (savedTasks.length > 0 && isMountedRef.current) {
      setVideoTasks(savedTasks);
      // 恢复未完成任务的状态轮询
      savedTasks.forEach((task) => {
        if (task.status === 'pending' || task.status === 'processing' || task.status === 'queued' || task.status === 'in_progress') {
          console.log('🔄 恢复任务轮询:', task.id);
          startPolling(task.id);
        }
      });
    }
  }, []);

  // 当选择 veo3、veo3.1 或 veo3.1-pro 模型时，自动开启提示词优化和分辨率提升
  // 当选择 veo_3_1 或 veo_3_1-fast 模型时，自动关闭提示词优化和分辨率提升
  useEffect(() => {
    if (model === 'veo3' || model === 'veo3.1' || model === 'veo3.1-pro') {
      setPromptOptOn(true);
      setResolutionOn(true);
    } else if (model === 'veo_3_1' || model === 'veo_3_1-fast') {
      setPromptOptOn(false);
      setResolutionOn(false);
    }
  }, [model]);

  const handleUpload = (
    e: ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setter(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 将 base64 转换为 URL（上传到图床）
  const convertBase64ToUrl = async (base64: string): Promise<string> => {
    console.log('📤 开始上传图片到图床...');
    
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const result = await response.json();
      
      if (result.success && result.url) {
        console.log('✅ 图片上传成功:', result.url);
        return result.url;
      } else {
        throw new Error(result.error || '图片上传失败');
      }
    } catch (error: any) {
      console.error('❌ 图片上传失败:', error);
      throw new Error(`图片上传失败: ${error.message || error.toString()}`);
    }
  };


  // 将 base64 转换为 File 对象
  const base64ToFile = (base64: string, filename: string): File => {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // 获取图片格式
    let mimeType = 'image/png';
    if (base64.startsWith('data:image/')) {
      const match = base64.match(/data:image\/([^;]+)/);
      if (match) {
        mimeType = `image/${match[1]}`;
      }
    }
    
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  };

  // 检测是否包含中文字符
  const containsChinese = (text: string): boolean => {
    return /[\u4e00-\u9fa5]/.test(text);
  };

  // 处理生成视频
  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    // 如果输入了中文提示词，自动开启提示词优化（统一格式接口支持）
    const useOpenAIFormat = shouldUseOpenAIFormat(model);
    if (!useOpenAIFormat && containsChinese(prompt)) {
      if (!promptOptOn) {
        setPromptOptOn(true);
        console.log('🔧 检测到中文提示词，已自动开启提示词优化');
      }
    }

    // 判断使用哪个接口
    
    // OpenAI 格式接口需要 input_reference（File 对象）
    if (useOpenAIFormat && !refImageA) {
      // 创建失败任务到任务列表
      const errorTask: Veo3Task = {
        id: `error_${Date.now()}`,
        status: 'failed',
        title: prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt,
        progress: 0,
        prompt: prompt,
        model: model,
        createdAt: Date.now(),
        error: 'veo_3_1 和 veo_3_1-fast 模型需要上传参考图片',
      };
      setVideoTasks((prev) => {
        const updated = [errorTask, ...prev];
        saveVeo3Tasks(updated);
        return updated;
      });
      return;
    }

    setIsGenerating(true);
    
    // 先创建一个 pending 状态的任务，显示在任务列表中
    const tempTaskId = `temp_${Date.now()}`;
    const initialTask: Veo3Task = {
      id: tempTaskId,
      status: 'pending',
      title: prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt,
      progress: 0,
      prompt: prompt,
      model: model,
      createdAt: Date.now(),
    };

    setVideoTasks((prev) => {
      const updated = [initialTask, ...prev];
      saveVeo3Tasks(updated);
      return updated;
    });
    
    try {
      let result: any;
      
      if (useOpenAIFormat) {
        // 使用 OpenAI 格式接口：/v1/videos
        console.log('🎨 使用 OpenAI 格式接口 (/v1/videos)...');
        
        // 将宽高比从 "16:9" 转换为 "16x9"
        const size = aspect.replace(':', 'x');
        
        // 将 base64 转换为 File 对象
        const imageFile = base64ToFile(refImageA!, 'reference.jpg');
        
        console.log('📝 提示词:', prompt);
        console.log('🤖 模型:', model);
        console.log('📐 尺寸:', size);
        console.log('⏱️ 时长: 8秒');
        
        // 调用 OpenAI 格式接口
        const openAIResult = await createVeo3VideoOpenAI({
          model: model,
          prompt: prompt,
          seconds: '8', // 默认 8 秒
          input_reference: imageFile,
          size: size,
          watermark: 'false',
        });
        
        result = {
          id: openAIResult.id,
          status: openAIResult.status,
          progress: openAIResult.progress,
        };
        
        console.log('✅ 视频生成任务已创建!');
        console.log('📋 任务ID:', result.id);
        console.log('📊 初始状态:', result.status);
        console.log('📈 初始进度:', result.progress || 0, '%');
      } else {
        // 使用 JSON 格式接口：/v1/video/create
        console.log('🎨 使用 JSON 格式接口 (/v1/video/create)...');
        
        // 处理图片上传（如果需要）
        const images: string[] = [];
        
        if (refImageA || refImageB) {
          // 有参考图片，进行图生视频
          if (refImageA) {
            try {
              const urlA = await convertBase64ToUrl(refImageA);
              images.push(urlA);
            } catch (error: any) {
              console.error('❌ 首帧图片上传失败:', error);
              const errorMsg = `首帧图片上传失败: ${error.message || error.toString()}`;
              // 更新任务状态为失败（仅在组件挂载时）
              if (isMountedRef.current) {
                setVideoTasks((prev) => {
                  if (!isMountedRef.current) {
                    return prev;
                  }
                  const updated = prev.map((task) => 
                    task.id === tempTaskId 
                      ? { ...task, status: 'failed' as const, error: errorMsg }
                      : task
                  );
                  saveVeo3Tasks(updated);
                  return updated;
                });
                setIsGenerating(false);
              }
              return;
            }
          }
          
          if (refImageB) {
            try {
              const urlB = await convertBase64ToUrl(refImageB);
              images.push(urlB);
            } catch (error: any) {
              console.error('❌ 尾帧图片上传失败:', error);
              const errorMsg = `尾帧图片上传失败: ${error.message || error.toString()}`;
              // 更新任务状态为失败（仅在组件挂载时）
              if (isMountedRef.current) {
                setVideoTasks((prev) => {
                  if (!isMountedRef.current) {
                    return prev;
                  }
                  const updated = prev.map((task) => 
                    task.id === tempTaskId 
                      ? { ...task, status: 'failed' as const, error: errorMsg }
                      : task
                  );
                  saveVeo3Tasks(updated);
                  return updated;
                });
                setIsGenerating(false);
              }
              return;
            }
          }
        }

        // 构建请求参数
        // 注意：根据 API 文档，enhance_prompt、enable_upsample、aspect_ratio 都是必需字段
        // 如果包含中文，确保提示词优化开启（veo模型只支持英文提示词）
        const shouldEnhancePrompt = promptOptOn || containsChinese(prompt);
        
        const requestParams: any = {
          model: model,
          prompt: prompt,
          enhance_prompt: shouldEnhancePrompt, // 必需字段：布尔值（中文自动开启）
          enable_upsample: resolutionOn, // 必需字段：布尔值（不是字符串）
          aspect_ratio: aspect || '16:9', // 必需字段：字符串类型，默认 16:9
        };

        // 添加图片（如果有）
        if (images.length > 0) {
          requestParams.images = images;
        }

        console.log('📝 提示词:', prompt);
        console.log('🤖 模型:', model);
        console.log('🖼️ 图片数量:', images.length);
        console.log('📐 宽高比:', aspect);
        console.log('🔍 调用前 enable_upsample 类型:', typeof requestParams.enable_upsample, '值:', requestParams.enable_upsample);
        console.log('🔍 调用前 enhance_prompt 类型:', typeof requestParams.enhance_prompt, '值:', requestParams.enhance_prompt);
        
        // 调用 JSON 格式接口
        result = await createVeo3Video(requestParams);
        
        console.log('✅ 视频生成任务已创建!');
        console.log('📋 任务ID:', result.id);
        console.log('📊 初始状态:', result.status);
      }

      // 用真实的任务ID替换临时任务
      const newTask: Veo3Task = {
        id: result.id,
        status: result.status || 'pending',
        title: prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt,
        progress: result.progress || 0,
        prompt: prompt,
        model: model,
        createdAt: Date.now(),
      };

      // 只在组件挂载时更新状态
      if (isMountedRef.current) {
        setVideoTasks((prev) => {
          if (!isMountedRef.current) {
            return prev;
          }
          const updated = prev.map((task) => 
            task.id === tempTaskId ? newTask : task
          );
          saveVeo3Tasks(updated);
          return updated;
        });

        // 开始轮询任务状态
        console.log('🔄 开始轮询任务状态...');
        startPolling(result.id);
      }
    } catch (error: any) {
      console.error('❌ 生成视频失败:', error);
      const errorMsg = error.message || '生成视频失败，请重试';
      
      // 只在组件挂载时更新状态
      if (isMountedRef.current) {
        setVideoTasks((prev) => {
          if (!isMountedRef.current) {
            return prev;
          }
          const updated = prev.map((task) => 
            task.id === tempTaskId 
              ? { ...task, status: 'failed' as const, error: errorMsg }
              : task
          );
          saveVeo3Tasks(updated);
          return updated;
        });
      }
    } finally {
      // 只在组件挂载时更新状态
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  return (
    <div className={`min-h-screen ${bgClass} overflow-y-auto flex flex-col transition-colors duration-300`}>
      <main
        className="w-full flex-1 grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-4 px-4 sm:px-6 md:px-8 lg:px-[35px] py-4 sm:py-6 md:py-8 lg:py-[35px] pb-16 sm:pb-24 md:pb-32 lg:pb-[166px]"
        style={{
          boxSizing: "border-box",
          maxHeight: "calc(100vh - 180px)",
          overflow: "hidden",
        }}
      >
        <section className={`${cardBgClass} border rounded-2xl shadow-xl p-5 space-y-4 transition-colors duration-300 overflow-y-auto`} style={{ maxHeight: "calc(100vh - 220px)", height: "calc(100vh - 220px)" }}>
          <div className="space-y-1">
            <div className={`text-sm ${secondaryTextClass}`}>模型选择</div>
            <div className="relative">
              <select
                className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300 pr-24`}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="veo3">veo3</option>
                <option value="veo3.1">veo3.1</option>
                <option value="veo3.1-pro">veo3.1-pro</option>
                <option value="veo_3_1">veo_3_1</option>
                <option value="veo_3_1-fast">veo_3_1-fast</option>
              </select>
              <button
                onClick={() => setShowPriceModal(true)}
                className={`absolute px-3 py-1.5 rounded-lg text-sm font-medium transition ${buttonBgClass} border ${theme === "dark" ? "border-neutral-700" : "border-neutral-300"}`}
                style={{ top: '-39px', right: '17px' }}
              >
                价格说明
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className={`text-sm ${secondaryTextClass}`}>
              {(model === 'veo_3_1' || model === 'veo_3_1-fast') ? '必须上传一张图像' : '参考图片'}
            </div>
            <div className={`grid gap-3 ${(model === 'veo_3_1' || model === 'veo_3_1-fast') ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              <UploadBox
                label={(model === 'veo_3_1' || model === 'veo_3_1-fast') ? '上传图像' : '首帧'}
                fileUrl={refImageA}
                onChange={(e) => handleUpload(e, setRefImageA)}
                onDelete={() => setRefImageA(null)}
                theme={theme}
              />
              {!(model === 'veo_3_1' || model === 'veo_3_1-fast') && (
                <UploadBox
                  label="尾帧"
                  fileUrl={refImageB}
                  onChange={(e) => handleUpload(e, setRefImageB)}
                  onDelete={() => setRefImageB(null)}
                  theme={theme}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className={`text-sm ${secondaryTextClass}`}>提示词</label>
              <button className={`text-xs ${mutedTextClass} border ${theme === "dark" ? "border-neutral-800" : "border-neutral-300"} rounded-lg px-2 py-1 hover:border-purple-500 transition-colors duration-300`}>
                智能指令
              </button>
            </div>
            <textarea
              className={`w-full h-36 ${inputBgClass} border rounded-xl px-3 py-3 text-sm focus:border-purple-500 focus:outline-none transition-colors duration-300`}
              placeholder="未来的赛博朋克城市，霓虹灯，电影质感，4K..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            {(model === 'veo_3_1' || model === 'veo_3_1-fast') && (
              <div className={`text-xs ${theme === "dark" ? "text-amber-400" : "text-amber-600"} mt-1 flex items-center gap-1`}>
                <span>⚠️</span>
                <span>提示词请使用英文</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className={`text-sm ${secondaryTextClass}`}>宽高比</div>
              <select
                className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300`}
                value={aspect}
                onChange={(e) => setAspect(e.target.value)}
              >
                {aspects.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className={`text-sm ${secondaryTextClass}`}>分辨率提升 (1080p)</div>
              <button
                onClick={() => {
                  if (model !== 'veo_3_1' && model !== 'veo_3_1-fast') {
                    setResolutionOn(!resolutionOn);
                  }
                }}
                disabled={model === 'veo_3_1' || model === 'veo_3_1-fast'}
                className={`w-full h-[38px] rounded-lg border text-sm transition-colors duration-300 ${
                  resolutionOn
                    ? "bg-purple-600 border-purple-500 text-white"
                    : `${inputBgClass} border ${mutedTextClass} hover:border-purple-500`
                } ${(model === 'veo_3_1' || model === 'veo_3_1-fast') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {resolutionOn ? "On" : "Off"}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className={`text-sm ${secondaryTextClass}`}>提示词优化</div>
            <button
              onClick={() => {
                if (model !== 'veo_3_1' && model !== 'veo_3_1-fast') {
                  setPromptOptOn(!promptOptOn);
                }
              }}
              disabled={model === 'veo_3_1' || model === 'veo_3_1-fast'}
              className={`w-full h-[38px] rounded-lg border text-sm transition-colors duration-300 flex items-center gap-2 px-3 ${
                promptOptOn
                  ? "bg-purple-600 border-purple-500 text-white"
                  : `${inputBgClass} border ${mutedTextClass} hover:border-purple-500`
              } ${(model === 'veo_3_1' || model === 'veo_3_1-fast') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-lg">🖋</span>
              <span>{promptOptOn ? "Enabled" : "Disabled"}</span>
            </button>
          </div>

          <button 
            onClick={handleGenerateVideo}
            disabled={isGenerating}
            className={`w-full py-3 rounded-xl transition text-sm font-semibold flex items-center justify-center gap-2 ${
              isGenerating
                ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>生成中...</span>
              </>
            ) : (
              <span>生成视频</span>
            )}
          </button>
        </section>

        <section className={`${cardBgClass} border rounded-2xl shadow-xl p-4 flex flex-col transition-colors duration-300 overflow-hidden`} style={{ maxHeight: "calc(100vh - 220px)", height: "calc(100vh - 220px)" }}>
          <div className={`text-sm ${mutedTextClass} mb-4 flex-shrink-0`}>
            任务列表 {videoTasks.length ? `(${videoTasks.length})` : "(0)"}
          </div>
          {videoTasks.length === 0 ? (
            <div className={`flex flex-1 items-center justify-center ${theme === "dark" ? "text-neutral-600" : "text-neutral-400"}`}>
              暂无生成任务
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: theme === 'dark' ? 'rgb(115 115 115) rgb(38 38 38)' : 'rgb(212 212 212) rgb(245 245 245)' }}>
              {videoTasks.map((t) => (
                <div
                  key={t.id}
                  className={`border ${theme === "dark" ? "border-neutral-800" : "border-neutral-200"} rounded-lg px-3 py-2 transition-colors duration-300 relative`}
                >
                  {/* 删除按钮 */}
                  <button
                    onClick={() => setDeleteConfirmTask(t)}
                    className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full ${theme === "dark" ? "bg-neutral-800 hover:bg-red-600" : "bg-neutral-100 hover:bg-red-500"} text-red-500 hover:text-white transition-colors duration-200 text-sm`}
                    title="删除任务"
                  >
                    ×
                  </button>
                  <div className="flex justify-between items-start mb-2 pr-8">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${textClass} truncate`}>{t.title}</div>
                      <div className={`text-xs ${mutedTextClass} mt-1`}>
                        状态: {t.status === 'pending' ? '等待中' : 
                               t.status === 'processing' || t.status === 'in_progress' || t.status === 'video_generating' ? '生成中' :
                               t.status === 'video_upsampling' ? '超分辨率处理中' :
                               t.status === 'queued' ? '队列中' :
                               t.status === 'completed' || t.status === 'succeeded' ? '已完成' :
                               t.status === 'failed' ? '失败' : 
                               // 不显示内部状态（如 image_downloading），统一显示为"处理中"
                               (typeof t.status === 'string' && (t.status.includes('image') || t.status.includes('download'))) ? '处理中' : 
                               (t.status === 'completed' || t.status === 'succeeded' || t.status === 'failed') ? t.status : '处理中'}
                      </div>
                      {/* 进度条显示 - 显示所有未完成状态（包括内部状态） */}
                      {(t.status === 'pending' || 
                        t.status === 'processing' || 
                        t.status === 'in_progress' || 
                        t.status === 'queued' || 
                        t.status === 'video_generating' || 
                        t.status === 'video_upsampling' ||
                        t.status === 'image_downloading' ||
                        (t.status !== 'completed' && t.status !== 'succeeded' && t.status !== 'failed')) && (
                        <div className="mt-2">
                          <div className={`w-full ${theme === "dark" ? "bg-neutral-700" : "bg-neutral-200"} rounded-full h-2`}>
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.max(0, Math.min(100, t.progress || 0))}%` }}
                            ></div>
                          </div>
                          <div className={`text-xs ${mutedTextClass} mt-1 flex justify-between items-center`}>
                            <span>进度: {t.progress !== undefined && t.progress !== null ? `${t.progress}%` : '处理中...'}</span>
                            {(t.status === 'video_generating' || t.status === 'video_upsampling') && (
                              <span className="text-purple-400">●</span>
                            )}
                          </div>
                        </div>
                      )}
                      {/* 已完成但进度未满100%时也显示进度 */}
                      {(t.status === 'completed' || t.status === 'succeeded') && t.progress !== undefined && t.progress !== 100 && (
                        <div className="mt-1">
                          <div className={`text-xs text-green-500`}>✅ 完成 ({t.progress}%)</div>
                        </div>
                      )}
                      {/* 错误信息显示 */}
                      {t.error && (
                        <div className={`text-xs text-red-500 mt-1 break-words`}>
                          <span className="font-medium">❌ 错误：</span>
                          {t.error}
                        </div>
                      )}
                    </div>
                  </div>
                  {t.videoUrl && (
                    <div className="mt-2">
                      <video 
                        src={t.videoUrl} 
                        controls 
                        className="w-full rounded-lg max-h-48"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 价格说明弹窗 */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h2 className="text-xl font-semibold text-white">价格说明</h2>
              <button
                onClick={() => setShowPriceModal(false)}
                className="text-neutral-400 hover:text-white transition-colors"
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
                >
                  <path d="M18 6L6 18"></path>
                  <path d="M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4 text-sm text-neutral-300">
                {/* 模型价格列表 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">模型价格列表</h3>
                  <div className="bg-neutral-950 rounded-lg p-3 space-y-1 font-mono text-xs text-neutral-300">
                    <div>veo3 - ¥0.747 - default</div>
                    <div>veo3.1 - ¥0.581 - default</div>
                    <div>veo3.1-pro - ¥1.743 - <span className="text-amber-400">限时特价</span></div>
                    <div>veo3.1-pro - ¥2.905 - default</div>
                    <div>veo_3_1 - ¥0.249 - <span className="text-amber-400">限时特价</span></div>
                    <div>veo_3_1 - ¥0.415 - default</div>
                    <div>veo_3_1-fast - ¥0.100 - <span className="text-amber-400">限时特价</span></div>
                    <div>veo_3_1-fast - ¥0.166 - default</div>
                  </div>
                </div>

                {/* 计算方式说明 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">计算方式：实际花费说明</h3>
                  <p className="ml-4 text-neutral-300">
                    例如：<span className="text-indigo-400">sora-2 模型</span>，<span className="text-indigo-400">default 分组</span>，<span className="text-amber-400">0.166 元</span>就是你的花费
                  </p>
                </div>

                {/* 使用日志看到的花费说明 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">5、使用日志看到的花费说明</h3>
                  <ul className="space-y-2 ml-4 text-neutral-300">
                    <li>• 使用日志看到的花费 <span className="text-amber-400">0.2 元</span>，原因是你充值是 <span className="text-indigo-400">0.83 的折扣</span></li>
                    <li>• 充值 <span className="text-indigo-400">0.83 元</span> = 到手 <span className="text-amber-400">1 元额度</span></li>
                    <li>• 所以你扣了 <span className="text-amber-400">0.2 元</span> 就是：<span className="text-indigo-400">0.2 × 0.83 = 0.166</span>，你的实际花费是 <span className="text-amber-400">0.166 元</span></li>
                    <li>• 以后在使用日志看到的花费都乘以 <span className="text-indigo-400">0.83</span>，就是你的真实扣除的金额</li>
                  </ul>
                </div>

                {/* 添加令牌后使用说明 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">6、添加令牌后使用说明</h3>
                  <ul className="space-y-2 ml-4 text-neutral-300">
                    <li>• 如果在当前网页端生成视频，需要复制令牌密钥到底部导航栏的密钥输入框，记得点<span className="text-indigo-400">保存设置</span>按钮</li>
                    <li>• 在 API 中转站令牌界面，可以点击聊天旁的下拉菜单选择不同 AI 应用进行对话和图像或视频生成</li>
                    <li>• 下拉菜单推荐选择：<span className="text-indigo-400">Cherry Studio (openAI)</span> 会自动调整 Cherry Studio，自动完成配置 API 参数</li>
                    <li>• 你只需要添加对应的模型即可进行交互，<span className="text-indigo-400">Cherry Studio</span> 现支持 <span className="text-amber-400">sora 视频生成</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="p-6 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowPriceModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`${cardBgClass} border rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 transition-colors duration-300`}>
            <div className={`text-lg font-medium ${textClass} mb-4`}>
              确认删除
            </div>
            <div className={`text-sm ${secondaryTextClass} mb-6`}>
              确定要删除任务 "{deleteConfirmTask.title}" 吗？此操作不可恢复。
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmTask(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === "dark" ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"} transition-colors duration-200`}
              >
                取消
              </button>
              <button
                onClick={() => {
                  // 停止轮询
                  const interval = pollingIntervals.current.get(deleteConfirmTask.id);
                  if (interval) {
                    clearInterval(interval);
                    pollingIntervals.current.delete(deleteConfirmTask.id);
                  }
                  // 删除任务（仅在组件挂载时）
                  if (isMountedRef.current) {
                    setVideoTasks((prev) => {
                      if (!isMountedRef.current) {
                        return prev;
                      }
                      const updated = prev.filter((task) => task.id !== deleteConfirmTask.id);
                      saveVeo3Tasks(updated);
                      return updated;
                    });
                  }
                  setDeleteConfirmTask(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type UploadBoxProps = {
  label: string;
  fileUrl: string | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDelete?: () => void;
  theme?: "light" | "dark";
};

function UploadBox({ label, fileUrl, onChange, onDelete, theme = "dark" }: UploadBoxProps) {
  const inputBgClass = theme === "dark" ? "bg-neutral-950 border-neutral-700" : "bg-neutral-50 border-neutral-300";
  const mutedTextClass = theme === "dark" ? "text-neutral-500" : "text-neutral-400";
  
  return (
    <div className="relative">
      <label className={`flex items-center justify-center border border-dashed ${inputBgClass} border rounded-xl h-32 cursor-pointer hover:border-purple-500 transition-colors duration-300 relative`}>
        {fileUrl ? (
          <img src={fileUrl} alt={label} className="max-h-28 object-contain rounded-lg" />
        ) : (
          <div className={`text-center ${mutedTextClass} text-sm space-y-1`}>
            <div className="text-xl">⭱</div>
            <div>{label}</div>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
      {/* 删除按钮 - 仅在有图片时显示 */}
      {fileUrl && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={`absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full ${theme === "dark" ? "bg-neutral-800 hover:bg-red-600" : "bg-neutral-100 hover:bg-red-500"} text-red-500 hover:text-white transition-colors duration-200 text-sm z-10`}
          title="删除图片"
        >
          ×
        </button>
      )}
    </div>
  );
}

