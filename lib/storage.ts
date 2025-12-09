/**
 * 本地存储工具
 * 用于保存和读取 API 配置
 */

const STORAGE_KEYS = {
  API_KEY: 'sora2_api_key',
  API_BASE_URL: 'sora2_api_base_url',
  CHARACTERS: 'sora2_characters',
  VIDEO_TASKS: 'sora2_video_tasks',
  CHARACTER_TASKS: 'sora2_character_tasks',
  NANOBANANA_TASKS: 'nanobanana_tasks',
  VEO_TASKS: 'veo3_video_tasks',
  THEME: 'app_theme',
} as const;

/**
 * 保存 API Key 到本地存储
 */
export function saveApiKey(apiKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
  }
}

/**
 * 从本地存储读取 API Key
 */
export function getApiKey(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEYS.API_KEY);
  }
  return null;
}

/**
 * 保存 API 基础地址到本地存储
 */
export function saveApiBaseUrl(baseUrl: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.API_BASE_URL, baseUrl);
  }
}

/**
 * 从本地存储读取 API 基础地址
 */
export function getApiBaseUrl(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEYS.API_BASE_URL);
  }
  return null;
}

/**
 * 清除所有配置
 */
export function clearAllConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    localStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
  }
}

/**
 * 清除任务历史记录和临时数据
 */
export function clearTaskHistory(): void {
  if (typeof window !== 'undefined') {
    // 清除所有以 'task_' 或 'video_' 开头的键
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('task_') || key.startsWith('video_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

/**
 * 角色数据接口
 */
export interface Character {
  id: string;
  name: string; // 用户输入的角色名（显示用）
  apiCharacterName?: string; // API返回的角色名（用于生成视频时匹配）
  avatar: string; // 角色头像URL
  videoUrl: string; // 原始视频URL
  characterUrl?: string; // 角色视频URL（提取后的）
  timestamps?: string; // 角色时间戳
  createdAt: number; // 创建时间戳
}

/**
 * 保存角色到本地存储
 */
export function saveCharacter(character: Character): void {
  if (typeof window !== 'undefined') {
    const characters = getCharacters();
    const existingIndex = characters.findIndex(c => c.id === character.id);
    if (existingIndex >= 0) {
      characters[existingIndex] = character;
    } else {
      characters.push(character);
    }
    localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
  }
}

/**
 * 从本地存储读取所有角色
 */
export function getCharacters(): Character[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

/**
 * 删除角色
 */
export function deleteCharacter(characterId: string): void {
  if (typeof window !== 'undefined') {
    const characters = getCharacters();
    const filtered = characters.filter(c => c.id !== characterId);
    localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(filtered));
  }
}

/**
 * 视频任务数据接口
 */
export interface VideoTask {
  id: string;
  status: string;
  title: string;
  progress?: number;
  videoUrl?: string | null;
  error?: string;
  progress100Timestamp?: number; // 进度达到100%时的时间戳
  prompt?: string; // 保存完整的提示词，用于判断是否使用了角色
}

/**
 * 角色提取任务数据接口
 */
export interface CharacterTask {
  id: string;
  status: string;
  title: string;
  progress?: number;
  videoUrl?: string;
  error?: string;
  characterName?: string;
  characterAvatar?: string;
}

/**
 * 保存视频任务列表到本地存储
 */
export function saveVideoTasks(tasks: VideoTask[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.VIDEO_TASKS, JSON.stringify(tasks));
  }
}

/**
 * 从本地存储读取视频任务列表
 */
export function getVideoTasks(): VideoTask[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.VIDEO_TASKS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

/**
 * 保存角色提取任务列表到本地存储
 */
export function saveCharacterTasks(tasks: CharacterTask[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CHARACTER_TASKS, JSON.stringify(tasks));
  }
}

/**
 * 从本地存储读取角色提取任务列表
 */
export function getCharacterTasks(): CharacterTask[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.CHARACTER_TASKS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

/**
 * Nanobanana 图片生成任务数据接口
 */
export interface NanobananaTask {
  id: string;
  requestId: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | string;
  title: string;
  prompt: string;
  imageUrls: string[];
  numImages?: number;
  statusUrl: string;
  responseUrl?: string;
  cancelUrl?: string;
  progress?: number;
  resultImages?: Array<{
    url: string;
    content_type: string;
    width: number;
    height: number;
  }>;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

/**
 * 保存 Nanobanana 任务列表到本地存储
 */
export function saveNanobananaTasks(tasks: NanobananaTask[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.NANOBANANA_TASKS, JSON.stringify(tasks));
  }
}

/**
 * 从本地存储读取 Nanobanana 任务列表
 */
export function getNanobananaTasks(): NanobananaTask[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.NANOBANANA_TASKS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

/**
 * 保存主题到本地存储
 */
export function saveTheme(theme: "light" | "dark"): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
}

/**
 * 从本地存储读取主题
 */
export function getTheme(): "light" | "dark" {
  if (typeof window !== 'undefined') {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (theme === 'light' || theme === 'dark') {
      return theme;
    }
  }
  return 'dark'; // 默认暗色主题
}

/**
 * Veo3 视频任务数据接口
 */
export interface Veo3Task {
  id: string;
  status: string;
  title: string;
  progress?: number;
  videoUrl?: string | null;
  error?: string;
  prompt?: string;
  model?: string;
  createdAt: number;
}

/**
 * 保存 Veo3 视频任务列表到本地存储
 */
export function saveVeo3Tasks(tasks: Veo3Task[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.VEO_TASKS, JSON.stringify(tasks));
  }
}

/**
 * 从本地存储读取 Veo3 视频任务列表
 */
export function getVeo3Tasks(): Veo3Task[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.VEO_TASKS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

