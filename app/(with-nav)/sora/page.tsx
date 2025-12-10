"use client";

import { ChangeEvent, useMemo, useState, useEffect, useRef } from "react";
import { generateVideo, generateVideoUnified, getTaskStatus, extractCharacter, createCharacter } from "@/lib/api/sora2";
import type { TaskStatusResponse, CreateCharacterResponse, ExtractCharacterResponse } from "@/lib/api/sora2";
import { 
  saveCharacter, 
  getCharacters, 
  deleteCharacter, 
  type Character,
  saveVideoTasks,
  getVideoTasks,
  saveCharacterTasks,
  getCharacterTasks,
  type VideoTask as StorageVideoTask,
  type CharacterTask as StorageCharacterTask,
} from "@/lib/storage";
import ExtractCharacterModal from "@/components/ExtractCharacterModal";
import ConfirmModal from "@/components/ConfirmModal";
import { useTheme } from "@/contexts/ThemeContext";

type Aspect = { label: string; value: string };
type Duration = { label: string; value: string };

type VideoTask = {
  id: string;
  status: string;
  title: string;
  progress?: number;
  videoUrl?: string | null;
  error?: string;
  progress100Timestamp?: number; // 进度达到100%时的时间戳
  prompt?: string; // 保存完整的提示词，用于判断是否使用了角色
};

type CharacterTask = {
  id: string;
  status: string;
  title: string;
  progress?: number;
  videoUrl?: string;
  error?: string;
  characterName?: string;
  characterAvatar?: string;
  userAvatarBase64?: string; // 用户上传的头像（base64）
  userCharacterName?: string; // 用户输入的角色名
};

export default function SoraPage() {
  const { theme } = useTheme();
  const aspects: Aspect[] = useMemo(
    () => [
      { label: "16:9（横屏）", value: "16:9" },
      { label: "9:16（竖屏）", value: "9:16" },
      { label: "1:1（方形）", value: "1:1" },
      { label: "21:9（电影）", value: "21:9" },
    ],
    []
  );

  const durations: Duration[] = useMemo(
    () => [
      { label: "10秒", value: "10" },
      { label: "15秒", value: "15" },
    ],
    []
  );

  const [tab, setTab] = useState<"single" | "smart">("single");
  const [videoMode, setVideoMode] = useState<"text-to-video" | "image-to-video">("text-to-video"); // 文生视频/图生视频模式
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("sora-2");
  const [aspect, setAspect] = useState(aspects[0]?.value ?? "16:9");
  const [duration, setDuration] = useState(durations[0]?.value ?? "10");
  const [hd, setHd] = useState(false); // sora-2 默认关闭 HD
  const [watermark, setWatermark] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refImageFile, setRefImageFile] = useState<File | null>(null);
  const [videoTasks, setVideoTasks] = useState<VideoTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [useCharacterMode, setUseCharacterMode] = useState(false); // 是否使用角色生成模式
  const [extractingCharacterId, setExtractingCharacterId] = useState<string | null>(null);
  const [characterTasks, setCharacterTasks] = useState<CharacterTask[]>([]);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extractModalVideoUrl, setExtractModalVideoUrl] = useState<string>("");
  const [extractModalTaskId, setExtractModalTaskId] = useState<string>("");
  
  // 修复任务ID弹窗状态
  const [fixTaskIdModal, setFixTaskIdModal] = useState<{
    isOpen: boolean;
    taskId: string;
    currentId: string;
  }>({
    isOpen: false,
    taskId: "",
    currentId: "",
  });
  
  // 确认弹窗状态
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
  
  // 价格说明弹窗状态
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const characterPollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isMountedRef = useRef(true);

  // 组件卸载标记
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 清理所有轮询
      pollingIntervals.current.forEach((interval) => clearInterval(interval));
      pollingIntervals.current.clear();
      characterPollingIntervals.current.forEach((interval) => clearInterval(interval));
      characterPollingIntervals.current.clear();
    };
  }, []);

  // 根据模型选择自动设置时长和HD状态
  useEffect(() => {
    if (model === "sora-2-pro") {
      // sora-2-pro 默认选择15秒，默认开启HD
      setDuration("15");
      setHd(true);
    } else if (model === "sora-2") {
      // sora-2 默认关闭HD
      setHd(false);
    }
  }, [model]);

  // 加载已保存的角色和任务
  useEffect(() => {
    // 加载角色
    const characters = getCharacters();
    setMyCharacters(characters);
    
    // 加载视频任务
    const savedVideoTasks = getVideoTasks();
    if (savedVideoTasks.length > 0) {
      setVideoTasks(savedVideoTasks);
      console.log('📋 已加载保存的视频任务:', savedVideoTasks.length, '个');
      
      // 恢复未完成任务的状态轮询
      savedVideoTasks.forEach((task) => {
        if (task.status === 'processing' || task.status === 'pending' || task.status === 'queued' || task.status === 'in_progress') {
          console.log('🔄 恢复任务轮询:', task.id);
          startPolling(task.id);
        }
      });
    }
    
    // 加载角色提取任务
    const savedCharacterTasks = getCharacterTasks();
    if (savedCharacterTasks.length > 0) {
      setCharacterTasks(savedCharacterTasks);
      console.log('📋 已加载保存的角色提取任务:', savedCharacterTasks.length, '个');
      
      // 恢复未完成任务的状态轮询
      savedCharacterTasks.forEach((task) => {
        if ((task.status === 'processing' || task.status === 'pending' || task.status === 'queued' || task.status === 'in_progress') && task.videoUrl) {
          console.log('🔄 恢复角色提取任务轮询:', task.id);
          startPollingCharacterExtraction(task.id, task.videoUrl);
        }
      });
    }
  }, []);


  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isMountedRef.current) return;
    setRefImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (isMountedRef.current) {
      setRefImage(ev.target?.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    try {
      console.log(`🔄 查询任务状态: ${taskId}`);
      const status = await getTaskStatus(taskId);
      
      console.log(`📊 任务状态更新:`, {
        id: taskId,
        status: status.status,
        progress: status.progress || 0,
        videoUrl: status.video_url ? '已生成' : '未生成',
      });
      
      if (!isMountedRef.current) return;
      
      setVideoTasks((prev) => {
        if (!isMountedRef.current) return prev;
        const updated = prev.map((task) => {
          if (task.id === taskId) {
            const newProgress = status.progress !== undefined ? status.progress : task.progress;
            const isProgress100 = newProgress !== undefined && newProgress >= 100;
            const wasProgress100 = task.progress !== undefined && task.progress >= 100;
            
            // 如果进度刚达到100%，记录时间戳
            let progress100Timestamp = task.progress100Timestamp;
            if (isProgress100 && !wasProgress100) {
              progress100Timestamp = Date.now();
              console.log(`📊 任务 ${taskId} 进度达到100%，记录时间戳:`, progress100Timestamp);
            }
            
            // 如果任务完成，清除时间戳
            if (status.status === 'completed' || status.status === 'succeeded') {
              progress100Timestamp = undefined;
            }
            
            return {
              ...task,
              status: status.status,
              progress: newProgress,
              videoUrl: status.video_url,
              error: status.error,
              progress100Timestamp,
            };
          }
          return task;
        });
        // 自动保存到 localStorage
        saveVideoTasks(updated);
        return updated;
      });

      // 如果任务完成或失败，停止轮询
      if (status.status === 'completed' || status.status === 'succeeded') {
        console.log(`✅ 任务完成: ${taskId}`);
        console.log(`🎬 视频URL: ${status.video_url}`);
        const interval = pollingIntervals.current.get(taskId);
        if (interval) {
          clearInterval(interval);
          pollingIntervals.current.delete(taskId);
        }
      } else if (status.status === 'failed') {
        console.error(`❌ 任务失败: ${taskId}`, status.error);
        const interval = pollingIntervals.current.get(taskId);
        if (interval) {
          clearInterval(interval);
          pollingIntervals.current.delete(taskId);
        }
      }
    } catch (error: any) {
      console.error('❌ 查询任务状态失败:', taskId, error);
      
      // 获取错误信息
      const errorMessage = error?.message || '查询状态失败';
      
      // 更新任务状态，但不标记为失败（继续重试）
      // 只在连续多次失败时才标记为失败
      if (!isMountedRef.current) return;
      
      setVideoTasks((prev) => {
        if (!isMountedRef.current) return prev;
        const currentTask = prev.find(t => t.id === taskId);
        const failureCount = (currentTask as any)?.failureCount || 0;
        
        // 如果连续失败5次，才标记为失败并停止轮询
        if (failureCount >= 5) {
          const interval = pollingIntervals.current.get(taskId);
          if (interval) {
            clearInterval(interval);
            pollingIntervals.current.delete(taskId);
          }
          return prev.map((task) =>
            task.id === taskId
              ? { ...task, status: 'failed', error: errorMessage }
              : task
          );
        }
        
        // 否则增加失败计数，继续重试
        return prev.map((task) =>
          task.id === taskId
            ? { ...task, error: `查询失败 (${failureCount + 1}/5): ${errorMessage}`, failureCount: failureCount + 1 } as any
            : task
        );
      });
    }
  };

  // 开始轮询任务状态
  const startPolling = (taskId: string) => {
    // 立即查询一次
    pollTaskStatus(taskId);
    
    // 每3秒轮询一次
    const interval = setInterval(() => {
      pollTaskStatus(taskId);
    }, 3000);
    
    pollingIntervals.current.set(taskId, interval);
  };


  // 处理提取角色（显示弹窗）
  const handleExtractCharacter = (videoUrl: string, taskId: string) => {
    if (!videoUrl) {
      alert('视频URL不存在');
      return;
    }
    if (!isMountedRef.current) return;
    setExtractModalVideoUrl(videoUrl);
    setExtractModalTaskId(taskId);
    setIsExtractModalOpen(true);
  };

  // 确认提取角色（弹窗确认后调用）
  const handleConfirmExtractCharacter = async (data: {
    characterName: string;
    description: string;
    avatar: File | null;
    duration: string;
    line: 1 | 2; // 线路选择
  }) => {
    const videoUrl = extractModalVideoUrl;
    const taskId = extractModalTaskId;
    
    if (!videoUrl) {
      alert('视频URL不存在');
      return;
    }

    if (!isMountedRef.current) return;

    setIsExtractModalOpen(false);
    setExtractingCharacterId(taskId);
    console.log('🎭 开始提取角色...');
    console.log('🎬 视频URL:', videoUrl);
    console.log('📝 角色名:', data.characterName);
    console.log('📄 描述词:', data.description);
    console.log('⏱️ 截取时长:', data.duration);

    try {
      // 先处理用户上传的头像（转换为 base64）
      let avatarBase64 = '';
      if (data.avatar) {
        const reader = new FileReader();
        avatarBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(data.avatar!);
        });
      }

      // duration 已经是 "起始秒,结束秒" 格式（例如："0,3"）
      const timestamps = data.duration;
      
      // 根据线路选择调用不同的接口
      if (data.line === 2) {
        // 线路2：使用新的创建角色接口
        console.log('🎭 使用线路2创建角色...');
        console.log('📋 请求参数:', { videoUrl, timestamps });
        
        // 线路2开始时，先创建角色提取任务（用于显示进度和错误）
        const tempTaskId = `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newCharacterTask: CharacterTask = {
          id: tempTaskId,
          status: 'processing',
          title: `角色提取 - ${new Date().toLocaleTimeString()}`,
          progress: 0,
          videoUrl: videoUrl,
          userAvatarBase64: avatarBase64,
          userCharacterName: data.characterName,
        };
        
        if (!isMountedRef.current) return;
        
        setCharacterTasks((prev) => {
          if (!isMountedRef.current) return prev;
          const updated = [newCharacterTask, ...prev];
          saveCharacterTasks(updated);
          return updated;
        });
        
        let result: CreateCharacterResponse;
        try {
          result = await createCharacter(videoUrl, timestamps);
          
          console.log('✅ 角色创建成功!');
          console.log('📋 角色ID:', result.id);
          console.log('🎭 角色信息:', {
            username: result.username,
            profile_picture_url: result.profile_picture_url,
            permalink: result.permalink,
          });
          
          // 线路2接口直接返回角色信息，不需要轮询
          const character: Character = {
            id: `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            // 优先使用用户输入的角色名（已经包含5位随机字符），用于显示
            name: data.characterName || '未命名角色',
            // 保存API返回的角色名，用于生成视频时匹配
            apiCharacterName: result.username,
            // 优先使用用户上传的头像，如果没有则使用API返回的头像
            avatar: avatarBase64 || result.profile_picture_url || '',
            videoUrl: videoUrl,
            characterUrl: result.permalink, // 使用 permalink 作为角色URL
            timestamps: timestamps,
            createdAt: Date.now(),
          };

          saveCharacter(character);
          
          if (!isMountedRef.current) return;
          
          setMyCharacters((prev) => {
            if (!isMountedRef.current) return prev;
            // 检查是否已存在相同角色，避免重复添加
            let foundIndex = -1;
            const exists = prev.some((c, index) => {
              if (c.characterUrl && character.characterUrl && c.characterUrl === character.characterUrl) {
                foundIndex = index;
                return true;
              }
              if (c.videoUrl === character.videoUrl && c.name === character.name) {
                foundIndex = index;
                return true;
              }
              if (c.videoUrl === character.videoUrl && 
                  c.timestamps && character.timestamps && 
                  c.timestamps === character.timestamps) {
                foundIndex = index;
                return true;
              }
              return false;
            });
            if (exists && foundIndex >= 0) {
              const existingCharacter = prev[foundIndex];
              if (!existingCharacter.avatar && character.avatar) {
                console.log('🔄 更新已存在角色的头像:', {
                  name: character.name,
                  oldAvatar: existingCharacter.avatar,
                  newAvatar: character.avatar
                });
                const updatedCharacter = { ...existingCharacter, avatar: character.avatar };
                saveCharacter(updatedCharacter);
                const updated = [...prev];
                updated[foundIndex] = updatedCharacter;
                return updated;
              }
              console.log('⚠️ 角色已存在，跳过添加');
              return prev;
            }
            console.log('✅ 角色已添加到列表');
            return [...prev, character];
          });
          
          // 更新任务状态为已完成
          if (!isMountedRef.current) return;
          
          setCharacterTasks((prev) => {
            if (!isMountedRef.current) return prev;
            const updated = prev.map((task) =>
              task.id === tempTaskId
                ? { ...task, status: 'completed', characterName: character.name, characterAvatar: character.avatar }
                : task
            );
            saveCharacterTasks(updated);
            return updated;
          });
          
          if (isMountedRef.current) {
          setExtractingCharacterId(null);
          }
          return;
        } catch (error: any) {
          console.error('❌ 线路2创建角色接口调用失败:', error);
          
          // 检查是否是超时错误
          const isTimeoutError = error.message && (
            error.message.includes('请求超时') || 
            error.message.includes('超时') ||
            error.name === 'AbortError' ||
            error.name === 'TimeoutError'
          );
          
          if (isTimeoutError) {
            // 线路2超时，自动切换到线路1重试
            console.log('🔄 线路2超时，自动切换到线路1重试...');
            if (!isMountedRef.current) return;
            
            setCharacterTasks((prev) => {
              if (!isMountedRef.current) return prev;
              const updated = prev.map((task) =>
                task.id === tempTaskId
                  ? { ...task, status: 'processing', error: '线路2超时，正在切换到线路1重试...' }
                  : task
              );
              saveCharacterTasks(updated);
              return updated;
            });
            
            // 切换到线路1重试
            try {
              const line1Result = await extractCharacter(videoUrl, timestamps, {
                characterName: data.characterName,
                description: data.description,
              });
              
              console.log('✅ 线路1重试成功!');
              console.log('📋 任务ID:', line1Result.id);
              
              // 更新任务ID为线路1的任务ID
              if (!isMountedRef.current) return;
              
              setCharacterTasks((prev) => {
                if (!isMountedRef.current) return prev;
                const updated = prev.map((task) =>
                  task.id === tempTaskId
                    ? { ...task, id: line1Result.id, status: line1Result.status || 'pending', error: undefined }
                    : task
                );
                saveCharacterTasks(updated);
                return updated;
              });
              
              // 继续处理线路1的结果（复用线路1的处理逻辑）
              // 如果立即返回了角色信息，直接保存
              if (line1Result.character_name || line1Result.character_avatar || line1Result.character_url) {
                const character: Character = {
                  id: `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: data.characterName || '未命名角色',
                  apiCharacterName: line1Result.character_name,
                  avatar: avatarBase64 || line1Result.character_avatar || '',
                  videoUrl: videoUrl,
                  characterUrl: line1Result.character_url,
                  timestamps: line1Result.character_timestamps || timestamps,
                  createdAt: Date.now(),
                };

                saveCharacter(character);
                
                if (!isMountedRef.current) return;
                
                setMyCharacters((prev) => {
                  if (!isMountedRef.current) return prev;
                  let foundIndex = -1;
                  const exists = prev.some((c, index) => {
                    if (c.characterUrl && character.characterUrl && c.characterUrl === character.characterUrl) {
                      foundIndex = index;
                      return true;
                    }
                    if (c.videoUrl === character.videoUrl && c.name === character.name) {
                      foundIndex = index;
                      return true;
                    }
                    if (c.videoUrl === character.videoUrl && 
                        c.timestamps && character.timestamps && 
                        c.timestamps === character.timestamps) {
                      foundIndex = index;
                      return true;
                    }
                    return false;
                  });
                  if (exists && foundIndex >= 0) {
                    const existingCharacter = prev[foundIndex];
                    if (!existingCharacter.avatar && character.avatar) {
                      const updatedCharacter = { ...existingCharacter, avatar: character.avatar };
                      saveCharacter(updatedCharacter);
                      const updated = [...prev];
                      updated[foundIndex] = updatedCharacter;
                      return updated;
                    }
                    return prev;
                  }
                  return [...prev, character];
                });
                
                if (!isMountedRef.current) return;
                
                setCharacterTasks((prev) => {
                  if (!isMountedRef.current) return prev;
                  const updated = prev.map((task) =>
                    task.id === line1Result.id
                      ? { ...task, status: 'completed', characterName: character.name, characterAvatar: character.avatar }
                      : task
                  );
                  saveCharacterTasks(updated);
                  return updated;
                });
                
                if (isMountedRef.current) {
                setExtractingCharacterId(null);
                }
                return;
              } else if (line1Result.status === 'completed' || line1Result.status === 'succeeded') {
                // 如果任务状态是已完成，立即查询一次状态获取完整信息
                console.log('✅ 任务已完成，但初始响应缺少角色信息，立即查询完整状态...');
                try {
                  const status = await getTaskStatus(line1Result.id);
                  if (status.character_url || status.character_name || status.character_avatar || data.characterName) {
                    const character: Character = {
                      id: `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      name: data.characterName || '未命名角色',
                      apiCharacterName: status.character_name,
                      avatar: avatarBase64 || status.character_avatar || '',
                      videoUrl: videoUrl,
                      characterUrl: status.character_url || '',
                      timestamps: status.character_timestamps || timestamps,
                      createdAt: Date.now(),
                    };

                    saveCharacter(character);
                    
                    if (!isMountedRef.current) return;
                    
                    setMyCharacters((prev) => {
                      if (!isMountedRef.current) return prev;
                      let foundIndex = -1;
                      const exists = prev.some((c, index) => {
                        if (c.characterUrl && character.characterUrl && c.characterUrl === character.characterUrl) {
                          foundIndex = index;
                          return true;
                        }
                        if (c.videoUrl === character.videoUrl && c.name === character.name) {
                          foundIndex = index;
                          return true;
                        }
                        if (c.videoUrl === character.videoUrl && 
                            c.timestamps && character.timestamps && 
                            c.timestamps === character.timestamps) {
                          foundIndex = index;
                          return true;
                        }
                        return false;
                      });
                      if (exists && foundIndex >= 0) {
                        const existingCharacter = prev[foundIndex];
                        if (!existingCharacter.avatar && character.avatar) {
                          const updatedCharacter = { ...existingCharacter, avatar: character.avatar };
                          saveCharacter(updatedCharacter);
                          const updated = [...prev];
                          updated[foundIndex] = updatedCharacter;
                          return updated;
                        }
                        return prev;
                      }
                      return [...prev, character];
                    });
                    
                    if (!isMountedRef.current) return;
                    
                    setCharacterTasks((prev) => {
                      if (!isMountedRef.current) return prev;
                      const updated = prev.map((task) =>
                        task.id === line1Result.id
                          ? { 
                              ...task, 
                              status: status.status, 
                              characterName: character.name, 
                              characterAvatar: character.avatar 
                            }
                          : task
                      );
                      saveCharacterTasks(updated);
                      return updated;
                    });
                    
                    if (isMountedRef.current) {
                    setExtractingCharacterId(null);
                    }
                    return;
                  }
                } catch (queryError) {
                  console.error('❌ 查询完整状态失败:', queryError);
                  startPollingCharacterExtraction(line1Result.id, videoUrl);
                }
              } else {
                // 如果角色提取是异步的，需要轮询任务状态
                console.log('🔄 角色提取任务处理中，开始轮询...');
                startPollingCharacterExtraction(line1Result.id, videoUrl);
                return;
              }
            } catch (retryError: any) {
              // 线路1重试也失败，更新任务状态为失败
              console.error('❌ 线路1重试也失败:', retryError);
              if (isMountedRef.current) {
              setCharacterTasks((prev) => {
                  if (!isMountedRef.current) return prev;
                const updated = prev.map((task) =>
                  task.id === tempTaskId
                    ? { ...task, status: 'failed', error: `线路2超时，线路1重试也失败: ${retryError.message || retryError.toString()}` }
                    : task
                );
                saveCharacterTasks(updated);
                return updated;
              });
              setExtractingCharacterId(null);
              }
              throw new Error(`线路2超时，线路1重试也失败: ${retryError.message || retryError.toString()}`);
            }
          } else {
            // 非超时错误，直接失败
            if (isMountedRef.current) {
            setCharacterTasks((prev) => {
                if (!isMountedRef.current) return prev;
              const updated = prev.map((task) =>
                task.id === tempTaskId
                  ? { ...task, status: 'failed', error: error.message || error.toString() || '创建角色失败' }
                  : task
              );
              saveCharacterTasks(updated);
              return updated;
            });
            setExtractingCharacterId(null);
            }
            throw new Error(error.message || `创建角色失败: ${error.toString()}`);
          }
        }
      }
      
      // 线路1：使用原有的提取角色接口
      console.log('🎭 使用线路1提取角色...');
      
      // 线路1开始时，先创建角色提取任务（用于显示进度和错误）
      const tempTaskIdLine1 = `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newCharacterTask: CharacterTask = {
        id: tempTaskIdLine1,
        status: 'processing',
        title: `角色提取 - ${new Date().toLocaleTimeString()}`,
        progress: 0,
        videoUrl: videoUrl,
        userAvatarBase64: avatarBase64,
        userCharacterName: data.characterName,
      };

      setCharacterTasks((prev) => {
        const updated = [newCharacterTask, ...prev];
        saveCharacterTasks(updated);
        return updated;
      });
      
      let result: ExtractCharacterResponse;
      try {
        result = await extractCharacter(videoUrl, timestamps, {
          characterName: data.characterName,
          description: data.description,
        });
        
        // 更新任务ID为线路1的任务ID
        if (!isMountedRef.current) return;
        
        setCharacterTasks((prev) => {
          if (!isMountedRef.current) return prev;
          const updated = prev.map((task) =>
            task.id === tempTaskIdLine1
              ? { ...task, id: result.id, status: result.status || 'pending', progress: result.progress || 0 }
              : task
          );
          saveCharacterTasks(updated);
          return updated;
        });
      } catch (error: any) {
        console.error('❌ 线路1提取角色接口调用失败:', error);
        
        // 检查是否是超时错误
        const isTimeoutError = error.message && (
          error.message.includes('请求超时') || 
          error.message.includes('超时') ||
          error.name === 'AbortError' ||
          error.name === 'TimeoutError'
        );
        
        if (isTimeoutError) {
          // 线路1超时，自动切换到线路2重试
          console.log('🔄 线路1超时，自动切换到线路2重试...');
          if (!isMountedRef.current) return;
          
          setCharacterTasks((prev) => {
            if (!isMountedRef.current) return prev;
            const updated = prev.map((task) =>
              task.id === tempTaskIdLine1
                ? { ...task, status: 'processing', error: '线路1超时，正在切换到线路2重试...' }
                : task
            );
            saveCharacterTasks(updated);
            return updated;
          });
          
          // 切换到线路2重试
          try {
            const line2Result = await createCharacter(videoUrl, timestamps);
            
            console.log('✅ 线路2重试成功!');
            console.log('📋 角色ID:', line2Result.id);
            console.log('🎭 角色信息:', {
              username: line2Result.username,
              profile_picture_url: line2Result.profile_picture_url,
              permalink: line2Result.permalink,
            });
            
            // 创建角色并保存
            const character: Character = {
              id: `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: data.characterName || '未命名角色',
              apiCharacterName: line2Result.username,
              avatar: avatarBase64 || line2Result.profile_picture_url || '',
              videoUrl: videoUrl,
              characterUrl: line2Result.permalink,
              timestamps: timestamps,
              createdAt: Date.now(),
            };

            saveCharacter(character);
            setMyCharacters((prev) => {
              let foundIndex = -1;
              const exists = prev.some((c, index) => {
                if (c.characterUrl && character.characterUrl && c.characterUrl === character.characterUrl) {
                  foundIndex = index;
                  return true;
                }
                if (c.videoUrl === character.videoUrl && c.name === character.name) {
                  foundIndex = index;
                  return true;
                }
                if (c.videoUrl === character.videoUrl && 
                    c.timestamps && character.timestamps && 
                    c.timestamps === character.timestamps) {
                  foundIndex = index;
                  return true;
                }
                return false;
              });
              if (exists && foundIndex >= 0) {
                const existingCharacter = prev[foundIndex];
                if (!existingCharacter.avatar && character.avatar) {
                  const updatedCharacter = { ...existingCharacter, avatar: character.avatar };
                  saveCharacter(updatedCharacter);
                  const updated = [...prev];
                  updated[foundIndex] = updatedCharacter;
                  return updated;
                }
                return prev;
              }
              return [...prev, character];
            });
            
            // 更新任务状态为已完成
            setCharacterTasks((prev) => {
              const updated = prev.map((task) =>
                task.id === tempTaskIdLine1
                  ? { ...task, status: 'completed', characterName: character.name, characterAvatar: character.avatar }
                  : task
              );
              saveCharacterTasks(updated);
              return updated;
            });
            
            setExtractingCharacterId(null);
            return;
          } catch (retryError: any) {
            // 线路2重试也失败，更新任务状态为失败
            console.error('❌ 线路2重试也失败:', retryError);
            setCharacterTasks((prev) => {
              const updated = prev.map((task) =>
                task.id === tempTaskIdLine1
                  ? { ...task, status: 'failed', error: `线路1超时，线路2重试也失败: ${retryError.message || retryError.toString()}` }
                  : task
              );
              saveCharacterTasks(updated);
              return updated;
            });
            setExtractingCharacterId(null);
            throw new Error(`线路1超时，线路2重试也失败: ${retryError.message || retryError.toString()}`);
          }
        } else {
          // 非超时错误，直接失败
          setCharacterTasks((prev) => {
            const updated = prev.map((task) =>
              task.id === tempTaskIdLine1
                ? { ...task, status: 'failed', error: error.message || error.toString() || '提取角色失败' }
                : task
            );
            saveCharacterTasks(updated);
            return updated;
          });
          setExtractingCharacterId(null);
          throw new Error(error.message || `提取角色失败: ${error.toString()}`);
        }
      }
      
      // 如果立即返回了角色信息，直接保存（优先处理）
      // 必须要有 API 返回的 character_name，否则无法正确匹配角色
      if (!result.character_name) {
        console.warn('⚠️ 线路1初始响应缺少角色名 (character_name)，等待轮询获取完整信息...');
        // 即使没有角色名，也要开始轮询，因为可能异步返回
        console.log('🔄 角色提取任务处理中，开始轮询...');
        startPollingCharacterExtraction(result.id, videoUrl);
        return;
      }
      
      if (result.character_name || result.character_avatar || result.character_url) {
        console.log('✅ 角色提取任务已创建!');
        console.log('📋 任务ID:', result.id);
        console.log('📊 任务状态:', result.status);
        console.log('🎭 角色信息:', {
          character_name: result.character_name,
          character_avatar: result.character_avatar,
          character_url: result.character_url,
        });
        const character: Character = {
          id: `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          // 优先使用用户输入的角色名（已经包含5位随机字符），用于显示
          name: data.characterName || '未命名角色',
          // 必须使用API返回的角色名，用于生成视频时匹配（关键！）
          apiCharacterName: result.character_name,
          // 优先使用用户上传的头像，如果没有则使用API返回的头像
          avatar: avatarBase64 || result.character_avatar || '',
          videoUrl: videoUrl,
          characterUrl: result.character_url,
          timestamps: result.character_timestamps || timestamps,
          createdAt: Date.now(),
        };

        console.log('💾 保存角色，API返回的角色名:', character.apiCharacterName);
        saveCharacter(character);
        setMyCharacters((prev) => {
          // 检查是否已存在相同角色，避免重复添加
          let foundIndex = -1;
          const exists = prev.some((c, index) => {
            // 如果两个角色都有 characterUrl 且相同，认为是同一个角色
            if (c.characterUrl && character.characterUrl && c.characterUrl === character.characterUrl) {
              foundIndex = index;
              return true;
            }
            // 如果 videoUrl 和 name 都相同，认为是同一个角色
            if (c.videoUrl === character.videoUrl && c.name === character.name) {
              foundIndex = index;
              return true;
            }
            // 如果 videoUrl 和 timestamps 都相同且都不为空，认为是同一个角色
            if (c.videoUrl === character.videoUrl && 
                c.timestamps && character.timestamps && 
                c.timestamps === character.timestamps) {
              foundIndex = index;
              return true;
            }
            return false;
          });
          if (exists && foundIndex >= 0) {
            // 如果角色已存在，更新头像和 apiCharacterName（关键修复）
            const existingCharacter = prev[foundIndex];
            const needsUpdate = 
              (!existingCharacter.avatar && character.avatar) ||
              (!existingCharacter.apiCharacterName && character.apiCharacterName) ||
              (existingCharacter.apiCharacterName !== character.apiCharacterName);
            
            if (needsUpdate) {
              console.log('🔄 更新已存在角色的信息:', {
                name: character.name,
                oldAvatar: existingCharacter.avatar,
                newAvatar: character.avatar,
                oldApiCharacterName: existingCharacter.apiCharacterName,
                newApiCharacterName: character.apiCharacterName
              });
              const updatedCharacter = { 
                ...existingCharacter, 
                avatar: character.avatar || existingCharacter.avatar,
                apiCharacterName: character.apiCharacterName || existingCharacter.apiCharacterName
              };
              // 更新 localStorage
              saveCharacter(updatedCharacter);
              // 更新状态
              const updated = [...prev];
              updated[foundIndex] = updatedCharacter;
              return updated;
            }
            console.log('⚠️ 角色已存在，跳过添加。检查的角色:', {
              name: character.name,
              videoUrl: character.videoUrl,
              characterUrl: character.characterUrl,
              timestamps: character.timestamps,
              apiCharacterName: character.apiCharacterName
            });
            return prev;
          }
          console.log('✅ 角色已添加到列表');
          return [...prev, character];
        });
        
        // 更新任务状态为已完成
        setCharacterTasks((prev) => {
          const updated = prev.map((task) =>
            task.id === result.id
              ? { ...task, status: 'completed', characterName: character.name, characterAvatar: character.avatar }
              : task
          );
          // 自动保存到 localStorage
          saveCharacterTasks(updated);
          return updated;
        });
        
        // 清除提取状态
        setExtractingCharacterId(null);
      } else if (result.status === 'completed' || result.status === 'succeeded') {
        // 如果任务状态是已完成或成功，但初始响应中没有角色信息，立即查询一次状态获取完整信息
        console.log('✅ 任务已完成，但初始响应缺少角色信息，立即查询完整状态...');
        try {
          const status = await getTaskStatus(result.id);
          console.log('📊 完整状态信息:', {
            status: status.status,
            character_name: status.character_name,
            character_avatar: status.character_avatar,
            character_url: status.character_url,
          });
          
          // 使用查询到的完整信息保存角色
          // 必须要有 API 返回的 character_name，否则无法正确匹配角色
          if (!status.character_name) {
            console.warn('⚠️ 线路1查询完整状态后仍缺少角色名 (character_name)，开始轮询等待...');
            // 继续轮询等待角色名
            startPollingCharacterExtraction(result.id, videoUrl);
            return;
          }
          
          if (status.character_url || status.character_name || status.character_avatar) {
            const character: Character = {
              id: `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              // 优先使用用户输入的角色名（已经包含5位随机字符），用于显示
              name: data.characterName || '未命名角色',
              // 必须使用API返回的角色名，用于生成视频时匹配（关键！）
              apiCharacterName: status.character_name,
              avatar: avatarBase64 || status.character_avatar || '',
              videoUrl: videoUrl,
              characterUrl: status.character_url || '',
              timestamps: status.character_timestamps || timestamps,
              createdAt: Date.now(),
            };
            
            console.log('💾 保存角色，API返回的角色名:', character.apiCharacterName);

            saveCharacter(character);
            setMyCharacters((prev) => {
              let foundIndex = -1;
              const exists = prev.some((c, index) => {
                if (c.characterUrl && character.characterUrl && c.characterUrl === character.characterUrl) {
                  foundIndex = index;
                  return true;
                }
                if (c.videoUrl === character.videoUrl && c.name === character.name) {
                  foundIndex = index;
                  return true;
                }
                if (c.videoUrl === character.videoUrl && 
                    c.timestamps && character.timestamps && 
                    c.timestamps === character.timestamps) {
                  foundIndex = index;
                  return true;
                }
                return false;
              });
              if (exists && foundIndex >= 0) {
                // 如果角色已存在，更新头像和 apiCharacterName（关键修复）
                const existingCharacter = prev[foundIndex];
                const needsUpdate = 
                  (!existingCharacter.avatar && character.avatar) ||
                  (!existingCharacter.apiCharacterName && character.apiCharacterName) ||
                  (existingCharacter.apiCharacterName !== character.apiCharacterName);
                
                if (needsUpdate) {
                  console.log('🔄 更新已存在角色的信息:', {
                    name: character.name,
                    oldAvatar: existingCharacter.avatar,
                    newAvatar: character.avatar,
                    oldApiCharacterName: existingCharacter.apiCharacterName,
                    newApiCharacterName: character.apiCharacterName
                  });
                  const updatedCharacter = { 
                    ...existingCharacter, 
                    avatar: character.avatar || existingCharacter.avatar,
                    apiCharacterName: character.apiCharacterName || existingCharacter.apiCharacterName
                  };
                  // 更新 localStorage
                  saveCharacter(updatedCharacter);
                  // 更新状态
                  const updated = [...prev];
                  updated[foundIndex] = updatedCharacter;
                  return updated;
                }
                console.log('⚠️ 角色已存在，跳过添加');
                return prev;
              }
              console.log('✅ 角色已添加到列表');
              return [...prev, character];
            });
            
            // 更新任务状态
            setCharacterTasks((prev) => {
              const updated = prev.map((task) =>
                task.id === result.id
                  ? { 
                      ...task, 
                      status: status.status, 
                      characterName: character.name, 
                      characterAvatar: character.avatar 
                    }
                  : task
              );
              saveCharacterTasks(updated);
              return updated;
            });
            
            // 清除提取状态
            setExtractingCharacterId(null);
          } else {
            console.warn('⚠️ 任务已完成，但未获取到角色信息');
            // 即使没有角色信息，也要清除提取状态
            setExtractingCharacterId(null);
          }
        } catch (error) {
          console.error('❌ 查询完整状态失败:', error);
          // 如果查询失败，开始轮询作为备选方案
          console.log('🔄 查询失败，开始轮询作为备选方案...');
          startPollingCharacterExtraction(result!.id, videoUrl);
        }
      } else if (result) {
        // 如果角色提取是异步的，需要轮询任务状态
        console.log('🔄 角色提取任务处理中，开始轮询...');
        console.log('✅ 角色提取任务已创建!');
        console.log('📋 任务ID:', result.id);
        console.log('📊 任务状态:', result.status);
        // 开始轮询任务状态
        startPollingCharacterExtraction(result.id, videoUrl);
      }
    } catch (error: any) {
      console.error('❌ 提取角色失败:', error);
      console.error('❌ 错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        toString: error.toString(),
      });
      
      // 更新任务状态为失败
      // 查找最近创建的、状态为pending或processing的任务（可能是线路2的tempTaskId或线路1的result.id）
      setCharacterTasks((prev) => {
        // 优先查找状态为processing的任务（线路2）
        let foundTask = prev.find(task => 
          task.videoUrl === videoUrl && (task.status === 'processing' || task.status === 'pending')
        );
        
        if (foundTask) {
          const updated = prev.map((task) =>
            task.id === foundTask!.id
              ? { ...task, status: 'failed', error: error.message || error.toString() || '提取失败' }
              : task
          );
          saveCharacterTasks(updated);
          return updated;
        }
        
        // 如果没有找到，返回原列表
        return prev;
      });
      
      const errorMessage = error.message || error.toString() || '提取角色失败，请重试';
      alert(errorMessage);
    } finally {
      setExtractingCharacterId(null);
    }
  };

  // 轮询角色提取任务状态
  const pollCharacterTaskStatus = async (taskId: string) => {
    try {
      if (!isMountedRef.current) return;
      
      console.log(`🔄 查询角色提取任务状态: ${taskId}`);
      const status = await getTaskStatus(taskId);
      
      if (!isMountedRef.current) return;
      
      console.log(`📊 角色提取状态更新:`, {
        id: taskId,
        status: status.status,
        progress: status.progress || 0,
      });
      
      // 更新角色提取任务状态
      setCharacterTasks((prev) => {
        if (!isMountedRef.current) return prev;
        const updated = prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: status.status,
                progress: status.progress,
                error: status.error,
              }
            : task
        );
        // 自动保存到 localStorage
        saveCharacterTasks(updated);
        return updated;
      });

      // 如果任务完成，尝试保存角色信息
      if (status.status === 'completed' || status.status === 'succeeded') {
        console.log(`✅ 角色提取任务完成: ${taskId}`);
        console.log('🎭 角色信息:', {
          name: status.character_name,
          avatar: status.character_avatar,
          url: status.character_url,
          timestamps: status.character_timestamps,
        });
        
        // 从当前任务列表中获取任务对应的视频URL和用户输入的数据
        // 先获取任务数据，然后处理角色保存
        if (!isMountedRef.current) return;
        
        setCharacterTasks((prevTasks) => {
          if (!isMountedRef.current) return prevTasks;
          const currentTask = prevTasks.find(t => t.id === taskId);
          const videoUrl = currentTask?.videoUrl || '';
          const userAvatarBase64 = currentTask?.userAvatarBase64 || '';
          const userCharacterName = currentTask?.userCharacterName || '';
          
          console.log('📋 当前任务数据:', {
            videoUrl,
            userCharacterName,
            hasUserAvatar: !!userAvatarBase64,
            apiCharacterName: status.character_name,
            apiCharacterAvatar: status.character_avatar,
            apiCharacterUrl: status.character_url,
          });
          
          // 任务完成时，尝试保存角色信息
          // 必须要有 API 返回的 character_name，否则无法正确匹配角色
          if (!status.character_name) {
            console.warn('⚠️ 无法保存角色：API 未返回角色名 (character_name)，角色提取可能未完成');
            // 即使没有角色名，也要更新任务状态
            return prevTasks.map((task) =>
              task.id === taskId
                ? { ...task, status: status.status, error: 'API 未返回角色名，请稍后重试或重新提取' }
                : task
            );
          }
          
          // 有 character_name 才保存角色
          if (status.character_url || status.character_name || status.character_avatar) {
            const character: Character = {
              id: `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              // 优先使用用户输入的角色名（已经包含5位随机字符），用于显示
              name: userCharacterName || '未命名角色',
              // 必须使用API返回的角色名，用于生成视频时匹配（关键！）
              apiCharacterName: status.character_name,
              // 优先使用用户上传的头像，如果没有则使用API返回的头像
              avatar: userAvatarBase64 || status.character_avatar || '',
              videoUrl: videoUrl,
              characterUrl: status.character_url || '',
              timestamps: status.character_timestamps || '',
              createdAt: Date.now(),
            };

            console.log('💾 准备保存角色:', character);
            console.log('✅ API返回的角色名:', character.apiCharacterName);
            
            // 保存角色到 localStorage
            saveCharacter(character);
            console.log('💾 角色已保存到 localStorage');
            
            // 更新角色列表状态
            if (!isMountedRef.current) return prevTasks;
            
            setMyCharacters((prev) => {
              if (!isMountedRef.current) return prev;
              // 检查是否已存在相同角色，避免重复添加
              // 检查条件：相同的 videoUrl + name 组合，或者相同的 characterUrl（如果存在）
              let foundIndex = -1;
              const exists = prev.some((c, index) => {
                // 如果两个角色都有 characterUrl 且相同，认为是同一个角色
                if (c.characterUrl && character.characterUrl && c.characterUrl === character.characterUrl) {
                  foundIndex = index;
                  return true;
                }
                // 如果 videoUrl 和 name 都相同，认为是同一个角色（避免同一视频提取的相同角色名重复添加）
                if (c.videoUrl === character.videoUrl && c.name === character.name) {
                  foundIndex = index;
                  return true;
                }
                // 如果 videoUrl 和 timestamps 都相同且都不为空，认为是同一个角色
                if (c.videoUrl === character.videoUrl && 
                    c.timestamps && character.timestamps && 
                    c.timestamps === character.timestamps) {
                  foundIndex = index;
                  return true;
                }
                return false;
              });
              if (exists && foundIndex >= 0) {
                // 如果角色已存在，更新头像和 apiCharacterName（关键修复）
                const existingCharacter = prev[foundIndex];
                const needsUpdate = 
                  (!existingCharacter.avatar && character.avatar) ||
                  (!existingCharacter.apiCharacterName && character.apiCharacterName) ||
                  (existingCharacter.apiCharacterName !== character.apiCharacterName);
                
                if (needsUpdate) {
                  console.log('🔄 更新已存在角色的信息:', {
                    name: character.name,
                    oldAvatar: existingCharacter.avatar,
                    newAvatar: character.avatar,
                    oldApiCharacterName: existingCharacter.apiCharacterName,
                    newApiCharacterName: character.apiCharacterName
                  });
                  const updatedCharacter = { 
                    ...existingCharacter, 
                    avatar: character.avatar || existingCharacter.avatar,
                    apiCharacterName: character.apiCharacterName || existingCharacter.apiCharacterName
                  };
                  // 更新 localStorage
                  saveCharacter(updatedCharacter);
                  // 更新状态
                  const updated = [...prev];
                  updated[foundIndex] = updatedCharacter;
                  return updated;
                }
                console.log('⚠️ 角色已存在，跳过添加。检查的角色:', {
                  name: character.name,
                  videoUrl: character.videoUrl,
                  characterUrl: character.characterUrl,
                  timestamps: character.timestamps,
                  apiCharacterName: character.apiCharacterName
                });
                return prev;
              }
              console.log('✅ 角色已添加到列表，当前角色数量:', prev.length + 1);
              return [...prev, character];
            });
            
            // 更新任务状态，包含角色信息
            const updated = prevTasks.map((task) =>
              task.id === taskId
                ? { 
                    ...task, 
                    status: status.status, 
                    characterName: character.name, 
                    characterAvatar: character.avatar 
                  }
                : task
            );
            // 自动保存到 localStorage
            saveCharacterTasks(updated);
            console.log('✅ 任务状态已更新');
            return updated;
          } else {
            console.warn('⚠️ 无法保存角色：缺少必要的角色信息');
            // 即使没有角色信息，也要更新任务状态
            return prevTasks.map((task) =>
              task.id === taskId
                ? { ...task, status: status.status }
                : task
            );
          }
        });
        
        // 清除提取状态
        if (extractingCharacterId === taskId) {
          setExtractingCharacterId(null);
        }
        
        // 停止轮询
        const interval = characterPollingIntervals.current.get(taskId);
        if (interval) {
          clearInterval(interval);
          characterPollingIntervals.current.delete(taskId);
        }
      } else if (status.status === 'failed') {
        console.error(`❌ 角色提取失败: ${taskId}`, status.error);
        
        // 清除提取状态
        if (extractingCharacterId === taskId) {
          setExtractingCharacterId(null);
        }
        
        // 停止轮询
        const interval = characterPollingIntervals.current.get(taskId);
        if (interval) {
          clearInterval(interval);
          characterPollingIntervals.current.delete(taskId);
        }
      }
    } catch (error) {
      console.error('❌ 查询角色提取状态失败:', taskId, error);
      setCharacterTasks((prev) => {
        const updated = prev.map((task) =>
          task.id === taskId
            ? { ...task, status: 'failed', error: '查询状态失败' }
            : task
        );
        // 自动保存到 localStorage
        saveCharacterTasks(updated);
        return updated;
      });
      
      // 停止轮询
      const interval = characterPollingIntervals.current.get(taskId);
      if (interval) {
        clearInterval(interval);
        characterPollingIntervals.current.delete(taskId);
      }
    }
  };

  // 开始轮询角色提取任务状态
  const startPollingCharacterExtraction = (taskId: string, videoUrl: string) => {
    // 立即查询一次
    pollCharacterTaskStatus(taskId);
    
    // 每3秒轮询一次
    const interval = setInterval(() => {
      pollCharacterTaskStatus(taskId);
    }, 3000);
    
    characterPollingIntervals.current.set(taskId, interval);
  };

  // 格式化角色名（去掉下划线，用于显示和输入）
  const formatCharacterName = (name: string): string => {
    // 角色名格式：角色名_XXXXX，去掉下划线变成：角色名XXXXX
    return name.replace(/_/g, '');
  };

  // 处理选择角色（角色复用）
  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    console.log('✅ 已选择角色:', character.name);
    console.log('🎬 角色视频URL:', character.characterUrl);
    console.log('⏱️ 角色时间戳:', character.timestamps);
    
    // 自动切换到sora2文生视频模式
    setVideoMode("text-to-video");
    setUseCharacterMode(false);
    
    // 自动将角色名输入到提示词输入框
    // 必须使用API返回的角色名（apiCharacterName），否则生成的视频角色会不一致
    if (!character.apiCharacterName) {
      console.error('❌ 错误：角色缺少 API 返回的角色名 (apiCharacterName)，无法自动填充');
      alert('⚠️ 该角色缺少系统返回的角色名，可能无法正确生成视频。请重新提取角色。');
      return;
    }
    
    const characterNameWithSpace = `@${character.apiCharacterName} `;
    console.log('✅ 使用系统返回的角色名自动填充:', character.apiCharacterName);
    setPrompt(characterNameWithSpace);
  };

  // 删除角色
  const handleDeleteCharacter = (characterId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发选择角色
    setConfirmModal({
      isOpen: true,
      title: "删除角色",
      message: "确定要删除这个角色吗？",
      onConfirm: () => {
        // 从 localStorage 删除
        deleteCharacter(characterId);
        // 从状态中删除
        setMyCharacters((prev) => prev.filter(c => c.id !== characterId));
        // 如果删除的是当前选中的角色，清除选择
        if (selectedCharacter?.id === characterId) {
          setSelectedCharacter(null);
          setPrompt(''); // 清空提示词
        }
        setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  };

  // 修复任务ID（用于修复错误的任务ID，如使用了平台ID而不是Sora任务ID）
  const handleFixTaskId = (currentId: string) => {
    setFixTaskIdModal({
      isOpen: true,
      taskId: "",
      currentId: currentId,
    });
  };

  // 确认修复任务ID
  const handleConfirmFixTaskId = async () => {
    const { taskId, currentId } = fixTaskIdModal;
    if (!taskId.trim()) {
      alert("请输入正确的任务ID");
      return;
    }

    // 停止旧的轮询
    const oldInterval = pollingIntervals.current.get(currentId);
    if (oldInterval) {
      clearInterval(oldInterval);
      pollingIntervals.current.delete(currentId);
    }

    // 更新任务ID
    setVideoTasks((prev) => {
      const updated = prev.map((task) => {
        if (task.id === currentId) {
          return { ...task, id: taskId.trim() };
        }
        return task;
      });
      saveVideoTasks(updated);
      return updated;
    });

    // 使用新的任务ID开始轮询
    startPolling(taskId.trim());

    // 关闭弹窗
    setFixTaskIdModal({ isOpen: false, taskId: "", currentId: "" });
    alert("任务ID已修复，正在重新查询状态...");
  };

  // 删除视频任务
  const handleDeleteVideoTask = (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "删除任务",
      message: "⚠️ 注意：删除任务仅从前端移除，不会影响已扣费的订单。服务器端的任务仍会继续处理。确定要删除吗？",
      onConfirm: () => {
        setVideoTasks((prev) => {
          const updated = prev.filter((task) => task.id !== taskId);
          // 自动保存到 localStorage
          saveVideoTasks(updated);
          // 停止该任务的轮询
          const interval = pollingIntervals.current.get(taskId);
          if (interval) {
            clearInterval(interval);
            pollingIntervals.current.delete(taskId);
          }
          return updated;
        });
        setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  };

  // 删除角色提取任务
  const handleDeleteCharacterTask = (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "删除任务",
      message: "确定要删除这个角色提取任务吗？",
      onConfirm: () => {
        setCharacterTasks((prev) => {
          const updated = prev.filter((task) => task.id !== taskId);
          // 自动保存到 localStorage
          saveCharacterTasks(updated);
          // 停止该任务的轮询
          const interval = characterPollingIntervals.current.get(taskId);
          if (interval) {
            clearInterval(interval);
            characterPollingIntervals.current.delete(taskId);
          }
          return updated;
        });
        setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  };

  // 创建占位图片（用于文生视频模式）
  const createPlaceholderImage = (): File => {
    // 创建一个1x1像素的纯白色PNG图片
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const byteCharacters = atob(pngBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    return new File([blob], 'placeholder.png', { type: 'image/png' });
  };

  // 将 File 转换为 base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 处理生成视频
  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    // 图生视频模式需要参考图片
    if (videoMode === "image-to-video" && !refImageFile) {
      alert('请上传参考图片');
      return;
    }

    console.log('🚀 开始生成视频...');
    console.log('📝 模式:', videoMode === "text-to-video" ? "文生视频" : "图生视频");
    console.log('📝 提示词:', prompt);
    console.log('🎨 模型:', model);
    console.log('📐 宽高比:', aspect);
    console.log('⏱️ 时长:', duration, '秒');
    
    // 确定使用的图片文件
    let imageFile: File;
    if (videoMode === "image-to-video" && refImageFile) {
      // 图生视频模式：使用用户上传的图片
      imageFile = refImageFile;
      console.log('🖼️ 参考图片:', refImageFile.name, `(${(refImageFile.size / 1024).toFixed(2)} KB)`);
    } else {
      // 文生视频模式：使用占位图片
      imageFile = createPlaceholderImage();
      console.log('🖼️ 使用占位图片（文生视频模式）');
    }
    
    if (selectedCharacter) {
      console.log('👤 使用角色:', selectedCharacter.name);
      console.log('🎬 角色视频URL:', selectedCharacter.characterUrl);
      console.log('⏱️ 角色时间戳:', selectedCharacter.timestamps);
    }

    if (!isMountedRef.current) return;

    setIsGenerating(true);

    try {
      // 转换宽高比格式：16:9 -> 16x9
      const size = aspect.replace(':', 'x');
      
      console.log('📡 正在调用生成视频API...');
      
      // 检查提示词是否包含角色名，决定是否使用角色参数
      // 只有提示词以 @角色名 开头时，才使用角色参数
      let characterUrl: string | undefined;
      let characterTimestamps: string | undefined;
      let finalPrompt = prompt.trim(); // 最终使用的提示词
      
      // 检查提示词是否以 @ 开头（表示使用角色）
      const promptStartsWithAt = finalPrompt.startsWith('@');
      
      if (selectedCharacter && promptStartsWithAt) {
        // 提示词以 @ 开头，检查是否匹配当前选择的角色
        const formattedCharacterName = formatCharacterName(selectedCharacter.name);
        const expectedCharacterName = `@${formattedCharacterName}`;
        
        // 如果提示词以当前角色名开头，使用角色参数
        if (finalPrompt.startsWith(expectedCharacterName)) {
          // 如果 characterUrl 存在且不为空，使用它
          // 否则使用原始视频URL（videoUrl）和时间戳（timestamps）
          characterUrl = selectedCharacter.characterUrl && selectedCharacter.characterUrl.trim() 
            ? selectedCharacter.characterUrl 
            : selectedCharacter.videoUrl;
          characterTimestamps = selectedCharacter.timestamps && selectedCharacter.timestamps.trim()
            ? selectedCharacter.timestamps
            : undefined;
          
          // 验证角色参数
          if (!characterUrl || characterUrl.trim() === '') {
            console.error('❌ 角色URL为空，无法使用角色生成视频');
            alert('角色视频URL为空，无法使用该角色生成视频。请重新提取角色。');
            if (isMountedRef.current) {
            setIsGenerating(false);
            }
            return;
          }
          
          // 如果API返回了角色名，将提示词中的用户输入角色名替换为API返回的角色名
          if (selectedCharacter.apiCharacterName) {
            // 将提示词中的 @用户输入角色名 替换为 @API返回角色名
            finalPrompt = finalPrompt.replace(
              new RegExp(`^@${formattedCharacterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`),
              `@${selectedCharacter.apiCharacterName} `
            );
            console.log('🔄 已将提示词中的角色名替换为API返回的角色名:', {
              用户输入角色名: formattedCharacterName,
              API返回角色名: selectedCharacter.apiCharacterName,
              替换后提示词: finalPrompt,
            });
          }
          
          console.log('✅ 使用角色生成视频:', {
            selectedCharacterId: selectedCharacter.id,
            selectedCharacterName: selectedCharacter.name,
            apiCharacterName: selectedCharacter.apiCharacterName,
            characterUrl,
            characterTimestamps,
            formattedCharacterName: expectedCharacterName,
            prompt: finalPrompt,
          });
        } else {
          // 提示词以 @ 开头但不是当前角色，清除角色选择
          console.log('⚠️ 提示词中的角色名与选择的角色不匹配，不使用角色参数');
          characterUrl = undefined;
          characterTimestamps = undefined;
        }
      } else {
        // 提示词不以 @ 开头，不使用角色参数（普通生成）
        console.log('ℹ️ 提示词不包含角色名，不使用角色参数，按提示词生成');
        characterUrl = undefined;
        characterTimestamps = undefined;
      }
      
      // 判断使用哪个接口
      // sora2文生视频模式（text-to-video && !useCharacterMode）使用统一视频接口
      // sora-2-pro 使用 OpenAI 官方接口（/v1/videos）
      // 其他模式（图生视频、角色生成视频）使用 OpenAI 接口
      const isUnifiedVideoMode = videoMode === "text-to-video" && !useCharacterMode && model !== "sora-2-pro";
      
      let result: any;
      
      if (isUnifiedVideoMode) {
        // 使用统一视频接口（/v1/video/create）
        console.log('📡 使用统一视频接口（/v1/video/create）');
        
        // 转换宽高比到 orientation
        let orientation: 'portrait' | 'landscape' | undefined;
        if (aspect === '9:16') {
          orientation = 'portrait';
        } else if (aspect === '16:9' || aspect === '21:9') {
          orientation = 'landscape';
        }
        // 1:1 不设置 orientation
        
        // 转换时长到整数
        const durationInt = parseInt(duration, 10);
        
        // 统一视频接口使用 large/small，默认使用 large
        const sizeUnified: 'large' | 'small' = 'large';
        
        result = await generateVideoUnified({
          prompt: finalPrompt,
          model,
          orientation,
          duration: durationInt,
          size: sizeUnified,
          images: [], // 文生视频不需要图片
        });
        
        console.log('✅ 统一视频接口调用成功!');
        console.log('📋 任务ID:', result.id);
        console.log('📊 初始状态:', result.status);
      } else {
        // 使用 OpenAI 接口（/v1/videos）
        // 用于 sora-2-pro、图生视频、角色生成视频等模式
        console.log('📡 使用 OpenAI 接口（/v1/videos）');
        if (model === "sora-2-pro") {
          console.log('🎬 sora-2-pro 使用 OpenAI 官方视频格式接口');
        }
        
        result = await generateVideo({
          prompt: finalPrompt,
          model,
          size,
          seconds: duration,
          input_reference: imageFile, // 使用确定的图片文件（用户上传的或占位图）
          watermark: watermark ? 'true' : 'false',
          private: privateMode ? 'true' : 'false',
          // 如果选择了角色，自动携带角色参数
          character_url: characterUrl,
          character_timestamps: characterTimestamps,
        });
        
        // 处理API响应结构：sora-2-pro可能返回包装的响应格式
        // 优先使用 task_id 或 data.id，否则使用顶层 id
        let taskId = (result as any).task_id || (result as any).data?.id || result.id;
        let taskStatus = (result as any).data?.status || result.status || 'pending';
        let taskProgress = (result as any).data?.progress ? 
          parseInt(String((result as any).data.progress).replace('%', '')) : 
          (typeof result.progress === 'number' ? result.progress : 
           typeof result.progress === 'string' ? parseInt(result.progress.replace('%', '')) : 0);
        
        console.log('✅ OpenAI 接口调用成功!');
        console.log('📋 原始响应:', result);
        console.log('📋 提取的任务ID:', taskId);
        console.log('📊 初始状态:', taskStatus);
        console.log('📈 初始进度:', taskProgress, '%');
        
        // 更新result对象，使用提取的任务ID和状态
        result = { ...result, id: taskId, status: taskStatus, progress: taskProgress };
      }

      // 添加到任务列表
      const newTask: VideoTask = {
        id: result.id,
        status: result.status || 'pending',
        title: finalPrompt.length > 30 ? finalPrompt.substring(0, 30) + '...' : finalPrompt,
        progress: result.progress || 0,
        prompt: finalPrompt, // 保存完整提示词，用于判断是否使用了角色
      };

      if (!isMountedRef.current) return;

      setVideoTasks((prev) => {
        if (!isMountedRef.current) return prev;
        const updated = [newTask, ...prev];
        // 自动保存到 localStorage
        saveVideoTasks(updated);
        return updated;
      });

      // 开始轮询任务状态
      console.log('🔄 开始轮询任务状态...');
      startPolling(result.id);
    } catch (error: any) {
      console.error('❌ 生成视频失败:', error);
      console.error('错误详情:', error.message || error);
      alert(error.message || '生成视频失败，请重试');
    } finally {
      if (isMountedRef.current) {
      setIsGenerating(false);
    }
    }
  };

  const bgClass = theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-neutral-900";
  const cardBgClass = theme === "dark" ? "bg-neutral-900/60 border-neutral-800" : "bg-neutral-50 border-neutral-200";
  const textClass = theme === "dark" ? "text-white" : "text-neutral-900";
  const secondaryTextClass = theme === "dark" ? "text-neutral-300" : "text-neutral-700";
  const mutedTextClass = theme === "dark" ? "text-neutral-400" : "text-neutral-500";
  const inputBgClass = theme === "dark" ? "bg-neutral-950 border-neutral-800 text-white" : "bg-white border-neutral-300 text-neutral-900";
  const buttonBgClass = theme === "dark" ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200";

  return (
    <div className={`min-h-screen ${bgClass} overflow-y-auto flex flex-col transition-colors duration-300`}>
      <main
        className="w-full flex-1 grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-4 px-4 sm:px-6 md:px-8 lg:px-[35px] py-4 sm:py-6 md:py-8 lg:py-[35px] pb-16 sm:pb-24 md:pb-32 lg:pb-[166px]"
        style={{
          boxSizing: "border-box",
        }}
      >
        <section className={`${cardBgClass} border rounded-2xl shadow-xl p-4 space-y-4 relative transition-colors duration-300`}>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setVideoMode("text-to-video");
                setUseCharacterMode(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                videoMode === "text-to-video" && !useCharacterMode
                  ? "bg-indigo-600 text-white"
                  : `${buttonBgClass}`
              }`}
            >
              sora2文生视频
            </button>
            <button
              onClick={() => {
                setVideoMode("image-to-video");
                setUseCharacterMode(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                videoMode === "image-to-video"
                  ? "bg-indigo-600 text-white"
                  : `${buttonBgClass}`
              }`}
            >
              sora2图生视频
            </button>
            <button
              onClick={() => setIsPriceModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${buttonBgClass} border ${theme === "dark" ? "border-neutral-700" : "border-neutral-300"}`}
            >
              价格说明
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 sm:gap-[50px] relative flex-wrap">
              <label className={`text-sm ${secondaryTextClass}`}>提示词</label>
            </div>
            <textarea
              className={`w-full h-36 ${inputBgClass} border rounded-xl px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none transition-colors duration-300`}
              placeholder="未来的赛博朋克城市，霓虹灯，电影质感，4K..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* 图生视频模式才显示参考图片上传 */}
          {videoMode === "image-to-video" && (
            <div className="space-y-2">
              <label className={`text-sm ${secondaryTextClass}`}>参考图片</label>
              <label className={`flex items-center justify-center border border-dashed ${theme === "dark" ? "border-neutral-700" : "border-neutral-300"} rounded-xl h-36 ${theme === "dark" ? "bg-neutral-950" : "bg-neutral-50"} cursor-pointer hover:border-indigo-500 transition-colors duration-300`}>
                {refImage ? (
                  <img
                    src={refImage}
                    alt="ref"
                    className="max-h-32 object-contain rounded-lg"
                  />
                ) : (
                  <div className={`${mutedTextClass} text-sm`}>上传图片</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className={`text-sm ${secondaryTextClass}`}>模型</div>
              <select
                className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300`}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option>sora-2</option>
                <option>sora-2-pro</option>
              </select>
            </div>
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
              <div className={`text-sm ${secondaryTextClass}`}>时长</div>
              <select
                className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300`}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {durations.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Toggle 
              label="高清 (HD)" 
              checked={hd} 
              onChange={setHd} 
              disabled={model === "sora-2"}
              theme={theme}
            />
            <Toggle label="水印" checked={watermark} onChange={setWatermark} theme={theme} />
            <Toggle label="私密模式" checked={privateMode} onChange={setPrivateMode} theme={theme} />
          </div>

          <button 
            onClick={handleGenerateVideo}
            disabled={isGenerating}
            className={`w-full py-3 rounded-xl transition text-sm font-semibold ${
              isGenerating
                ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isGenerating ? '生成中...' : '生成视频'}
          </button>
        </section>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-[100px] h-full lg:pr-[11px] overflow-visible">
          {/* 视频任务列表卡片 */}
          <section className={`${cardBgClass} border rounded-2xl shadow-xl p-4 flex flex-col min-h-[400px] lg:min-h-[620px] max-h-[400px] lg:max-h-[620px] overflow-hidden w-full lg:w-[800px] lg:translate-x-[50px] transition-colors duration-300`}>
            <div className={`text-sm ${mutedTextClass} mb-4 flex-shrink-0`}>
              视频任务列表 {videoTasks.length ? `(${videoTasks.length})` : "(0)"}
            </div>
            {videoTasks.length === 0 ? (
              <div className={`flex flex-1 items-center justify-center ${theme === "dark" ? "text-neutral-600" : "text-neutral-400"} text-sm`}>
                暂无生成任务
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1 min-h-0 scrollbar-visible" style={{ maxHeight: 'calc(100% - 2rem)' }}>
                {videoTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`border ${theme === "dark" ? "border-neutral-800" : "border-neutral-200"} rounded-lg px-3 py-2 transition-colors duration-300`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${textClass} mb-1`}>{t.title}</div>
                        <div className={`text-xs ${mutedTextClass}`}>
                          {t.status === 'pending' && '生成中--视频真实进度稍候显示'}
                          {t.status === 'processing' && '处理中'}
                          {t.status === 'completed' && '已完成'}
                          {t.status === 'failed' && '失败'}
                          {t.status === 'queued' && '生成中--视频真实进度稍候显示'}
                          {t.error && ` - ${t.error}`}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {/* 提取角色按钮 - 只有提示词不包含角色名时才显示 */}
                        {(t.status === 'completed' || t.status === 'succeeded') && t.videoUrl && 
                         (!t.prompt || !t.prompt.trim().startsWith('@')) && (
                          <button
                            onClick={() => handleExtractCharacter(t.videoUrl!, t.id)}
                            disabled={extractingCharacterId === t.id}
                            className={`flex items-center gap-1 text-xs font-medium transition-colors px-2 py-1 rounded ${
                              extractingCharacterId === t.id
                                ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                            title="提取角色"
                          >
                            {extractingCharacterId === t.id ? '提取中...' : '提取角色'}
                          </button>
                        )}
                        {(t.status === 'completed' || t.status === 'succeeded') && t.videoUrl && (
                          <a
                            href={t.videoUrl}
                            download
                            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded"
                            title="下载视频"
                          >
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
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            下载视频
                          </a>
                        )}
                        {/* 修复任务ID按钮（仅当任务ID看起来是数字ID时显示，可能是错误的平台ID） */}
                        {/^\d+$/.test(t.id) && (
                          <button
                            onClick={() => handleFixTaskId(t.id)}
                            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors px-2 py-1 rounded border border-yellow-400/30"
                            title="修复任务ID（任务ID是数字格式，可能是错误的平台ID。点击输入正确的Sora任务ID）"
                          >
                            🔧 修复ID
                          </button>
                        )}
                        {/* 删除按钮 */}
                        <button
                          onClick={() => handleDeleteVideoTask(t.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors p-1"
                          title="删除任务（仅从前端删除，不影响已扣费订单）"
                        >
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
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* 进度条 */}
                    {(t.status === 'processing' || t.status === 'pending' || t.status === 'queued' || t.status === 'in_progress') && (
                      <>
                        <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${t.progress !== undefined ? Math.min(t.progress, 100) : 0}%` }}
                          />
                        </div>
                        <div className={`text-xs ${mutedTextClass} mt-1 text-right`}>
                          {(() => {
                            const progress = t.progress !== undefined ? Math.round(t.progress) : 0;
                            const isProgress100 = progress >= 100;
                            const progress100Timestamp = t.progress100Timestamp;
                            const hasProgress100Timestamp = progress100Timestamp !== undefined;
                            const timeSince100 = hasProgress100Timestamp && progress100Timestamp ? Date.now() - progress100Timestamp : 0;
                            const shouldShowComposing = isProgress100 && hasProgress100Timestamp && timeSince100 >= 10000;
                            
                            if (shouldShowComposing) {
                              return `${progress}% 视频合成中`;
                            }
                            return `${progress}%`;
                          })()}
                        </div>
                      </>
                    )}
                    {/* 视频播放器 */}
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

          {/* 右侧两个独立卡片容器 */}
          <div className="flex flex-col flex-shrink-0 w-full lg:w-[400px]" style={{ gap: '20px' }}>
            {/* 角色提取列表卡片 */}
            <section className={`${cardBgClass} border rounded-2xl shadow-xl p-4 flex flex-col overflow-hidden transition-colors duration-300`} style={{ flex: '1 1 0%', minHeight: '300px', maxHeight: '300px' }}>
              <div className={`text-sm ${mutedTextClass} mb-4 flex-shrink-0`}>
                角色提取列表 {characterTasks.length ? `(${characterTasks.length})` : "(0)"}
              </div>
              {characterTasks.length === 0 ? (
                <div className={`flex flex-1 items-center justify-center ${theme === "dark" ? "text-neutral-600" : "text-neutral-400"} text-sm`}>
                  暂无提取任务
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto flex-1 min-h-0 scrollbar-visible" style={{ maxHeight: 'calc(100% - 2rem)' }}>
                  {characterTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`border ${theme === "dark" ? "border-neutral-800" : "border-neutral-200"} rounded-lg px-3 py-2 transition-colors duration-300`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white mb-1">{t.title}</div>
                          <div className="text-xs text-neutral-500">
                            {t.status === 'pending' && '生成中--视频真实进度稍候显示'}
                            {t.status === 'processing' && '处理中'}
                            {t.status === 'completed' && '已完成'}
                            {t.status === 'failed' && '失败'}
                            {t.status === 'queued' && '生成中--视频真实进度稍候显示'}
                            {t.error && ` - ${t.error}`}
                          </div>
                          {t.characterName && (
                            <div className="text-xs text-indigo-400 mt-1">
                              角色: {t.characterName}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {(t.status === 'completed' || t.status === 'succeeded') && t.characterAvatar && (
                            <img
                              src={t.characterAvatar}
                              alt={t.characterName || '角色头像'}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          {/* 删除按钮 */}
                          <button
                            onClick={() => handleDeleteCharacterTask(t.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors p-1"
                            title="删除任务"
                          >
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
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* 进度条 */}
                      {(t.status === 'processing' || t.status === 'pending' || t.status === 'queued' || t.status === 'in_progress') && (
                        <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${t.progress || 0}%` }}
                          />
                        </div>
                      )}
                      {t.progress !== undefined && (t.status === 'processing' || t.status === 'pending' || t.status === 'queued' || t.status === 'in_progress') && (
                        <div className={`text-xs ${mutedTextClass} mt-1 text-right`}>
                          {Math.round(t.progress)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 我的角色列表卡片 */}
            <section className={`${cardBgClass} border rounded-2xl shadow-xl p-4 flex flex-col overflow-hidden transition-colors duration-300`} style={{ flex: '1 1 0%', minHeight: '300px', maxHeight: '300px' }}>
              <div className={`text-sm ${mutedTextClass} mb-4 flex-shrink-0`}>
                我的角色列表 {myCharacters.length ? `(${myCharacters.length})` : "(0)"}
              </div>
              {myCharacters.length === 0 ? (
                <div className={`flex flex-1 items-center justify-center ${theme === "dark" ? "text-neutral-600" : "text-neutral-400"} text-sm`}>
                  暂无角色
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto flex-1 min-h-0 scrollbar-visible" style={{ maxHeight: 'calc(100% - 2rem)' }}>
                  {myCharacters.map((character) => (
                    <button
                      key={character.id}
                      onClick={() => handleSelectCharacter(character)}
                      className={`w-full border rounded-lg px-3 py-2 flex items-center gap-3 transition-colors duration-300 ${
                        selectedCharacter?.id === character.id
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : theme === "dark" 
                            ? 'border-neutral-800 hover:border-neutral-700'
                            : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {/* 角色头像 */}
                      {character.avatar ? (
                        <img
                          src={character.avatar}
                          alt={character.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            // 如果头像加载失败，显示占位符
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="16"%3E%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full ${theme === "dark" ? "bg-neutral-700" : "bg-neutral-200"} flex items-center justify-center flex-shrink-0 transition-colors duration-300`}>
                          <span className={`text-xs ${mutedTextClass}`}>
                            {character.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* 角色名 */}
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-medium ${textClass}`}>@{formatCharacterName(character.name)}</div>
                        {selectedCharacter?.id === character.id && (
                          <div className="text-xs text-indigo-400 mt-0.5">已选择</div>
                        )}
                      </div>
                      {/* 删除按钮 */}
                      <button
                        onClick={(e) => handleDeleteCharacter(character.id, e)}
                        className={`${mutedTextClass} hover:text-red-400 transition-colors p-1 flex-shrink-0`}
                        title="删除角色"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* 角色提取弹窗 */}
      <ExtractCharacterModal
        isOpen={isExtractModalOpen}
        onClose={() => setIsExtractModalOpen(false)}
        onConfirm={handleConfirmExtractCharacter}
        videoUrl={extractModalVideoUrl}
      />

      {/* 确认弹窗 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
        confirmText="确认"
        cancelText="取消"
      />

      {/* 修复任务ID弹窗 */}
      {fixTaskIdModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`${cardBgClass} rounded-xl border shadow-2xl max-w-md w-full mx-4`}>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">修复任务ID</h2>
              <p className={`text-sm ${secondaryTextClass} mb-4`}>
                当前任务ID可能是错误的平台ID。请输入正确的Sora任务ID（格式如：sora-2-pro:task_xxx）来恢复任务查询。
              </p>
              <div className="space-y-3">
                <div>
                  <label className={`block text-sm ${secondaryTextClass} mb-1`}>当前任务ID</label>
                  <input
                    type="text"
                    value={fixTaskIdModal.currentId}
                    disabled
                    className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm`}
                  />
                </div>
                <div>
                  <label className={`block text-sm ${secondaryTextClass} mb-1`}>正确的任务ID</label>
                  <input
                    type="text"
                    value={fixTaskIdModal.taskId}
                    onChange={(e) => setFixTaskIdModal({ ...fixTaskIdModal, taskId: e.target.value })}
                    placeholder="例如：sora-2-pro:task_01kc1bydrnekb9dwewa472zcrf"
                    className={`w-full ${inputBgClass} border rounded-lg px-3 py-2 text-sm`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setFixTaskIdModal({ isOpen: false, taskId: "", currentId: "" })}
                  className={`flex-1 ${buttonBgClass} px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200`}
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmFixTaskId}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  确认修复
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 价格说明弹窗 */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h2 className="text-xl font-semibold text-white">价格说明</h2>
              <button
                onClick={() => setIsPriceModalOpen(false)}
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
                {/* 1. 视频生成 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">1、视频生成</h3>
                  <ul className="space-y-1 ml-4 text-neutral-300">
                    <li>• Sora-2: 令牌选 <span className="text-indigo-400">default 分组</span>，<span className="text-amber-400">0.166 元</span>按次计费</li>
                    <li>• Sora-2: 限时特价分组 <span className="text-amber-400">0.1 元</span>按次计费</li>
                    <li>• Sora-2-pro: <span className="text-indigo-400">default 分组</span>，<span className="text-amber-400">2.988 元</span>按次计费</li>
                  </ul>
                </div>

                {/* 2. 角色提取 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">2、角色提取</h3>
                  <ul className="space-y-1 ml-4 text-neutral-300">
                    <li>• 令牌选 <span className="text-indigo-400">default 分组</span>，<span className="text-amber-400">0.008 元</span>按次计费</li>
                    <li>• 限时特价分组 <span className="text-amber-400">0.005 元</span>按次计费</li>
                  </ul>
                </div>

                {/* 3. 提取角色建议 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">3、提取角色建议</h3>
                  <ul className="space-y-1 ml-4 text-neutral-300">
                    <li>• 建议选择 <span className="text-indigo-400">default 分组</span>，避免不稳定而报错</li>
                    <li>• 提取视频不能有真人出现</li>
                    <li>• 如果未上传头像，会自动使用系统返回的头像</li>
                  </ul>
                </div>

                {/* 4. 计算方式 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">4、计算方式：实际花费说明</h3>
                  <p className="ml-4 text-neutral-300">
                    例如：<span className="text-indigo-400">sora-2 模型</span>，<span className="text-indigo-400">default 分组</span>，<span className="text-amber-400">0.166 元</span>就是你的花费
                  </p>
                </div>

                {/* 5. 使用日志花费说明 */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">5、使用日志看到的花费说明</h3>
                  <ul className="space-y-2 ml-4 text-neutral-300">
                    <li>• 使用日志看到的花费 <span className="text-amber-400">0.2 元</span>，原因是你充值是 <span className="text-indigo-400">0.83 的折扣</span></li>
                    <li>• 充值 <span className="text-indigo-400">0.83 元</span> = 到手 <span className="text-amber-400">1 元额度</span></li>
                    <li>• 所以你扣了 <span className="text-amber-400">0.2 元</span> 就是：<span className="text-indigo-400">0.2 × 0.83 = 0.166</span>，你的实际花费是 <span className="text-amber-400">0.166 元</span></li>
                    <li>• 以后在使用日志看到的花费都乘以 <span className="text-indigo-400">0.83</span>，就是你的真实扣除的金额</li>
                  </ul>
                </div>

                {/* 6. 添加令牌说明 */}
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
                onClick={() => setIsPriceModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  theme?: "light" | "dark";
};

function Toggle({ label, checked, onChange, disabled = false, theme = "dark" }: ToggleProps) {
  const bgClass = theme === "dark" ? "bg-neutral-950 border-neutral-800 text-neutral-200" : "bg-white border-neutral-300 text-neutral-900";
  const toggleBgClass = theme === "dark" ? "bg-neutral-700" : "bg-neutral-300";
  const disabledBgClass = theme === "dark" ? "bg-neutral-600" : "bg-neutral-400";
  const disabledTextClass = theme === "dark" ? "text-neutral-500" : "text-neutral-400";
  
  return (
    <label className={`flex items-center justify-between ${bgClass} border rounded-lg px-3 py-2 text-sm transition-colors duration-300 ${
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    }`}>
      <span className={disabled ? disabledTextClass : ""}>{label}</span>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`w-10 h-5 rounded-full transition relative ${
          disabled 
            ? `${disabledBgClass} cursor-not-allowed` 
            : checked 
            ? "bg-indigo-500" 
            : toggleBgClass
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition ${
            checked ? "left-5" : "left-1"
          }`}
        />
      </div>
    </label>
  );
}

