"use client";

import { useState, useRef, ChangeEvent } from "react";

interface ExtractCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    characterName: string;
    description: string;
    avatar: File | null;
    duration: string;
    line: 1 | 2; // 线路选择
  }) => void;
  videoUrl: string;
}

export default function ExtractCharacterModal({
  isOpen,
  onClose,
  onConfirm,
  videoUrl,
}: ExtractCharacterModalProps) {
  const [characterName, setCharacterName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [startSecond, setStartSecond] = useState("0");
  const [endSecond, setEndSecond] = useState("3");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<1 | 2>(2); // 默认开启线路1按钮
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成5位随机字符
  const generateRandomSuffix = () => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  // 处理角色名输入（限制10个字符）
  const handleCharacterNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 10) {
      setCharacterName(value);
    }
  };

  // 处理描述词输入（限制500个字符）
  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setDescription(value);
    }
  };

  // 处理头像上传
  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件类型
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("仅支持 JPG、PNG、WebP 格式");
        return;
      }
      // 检查文件大小（10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert("文件大小不能超过 10MB");
        return;
      }
      setAvatar(file);
      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理确认
  const handleConfirm = () => {
    if (!characterName.trim()) {
      alert("请输入角色名");
      return;
    }
    if (!description.trim()) {
      alert("请输入人物描述词");
      return;
    }
    // 验证时长输入
    const start = parseInt(startSecond);
    const end = parseInt(endSecond);
    if (isNaN(start) || isNaN(end)) {
      alert("请输入有效的秒数");
      return;
    }
    if (start < 0 || end < 0) {
      alert("秒数不能为负数");
      return;
    }
    if (start >= end) {
      alert("起始秒必须小于结束秒");
      return;
    }
    const durationSeconds = end - start;
    if (durationSeconds < 1) {
      alert("截取时长不能少于1秒");
      return;
    }
    if (durationSeconds > 3) {
      alert("截取时长不能超过3秒");
      return;
    }
    // 自动添加5位随机字符到角色名
    const finalCharacterName = `${characterName.trim()}_${generateRandomSuffix()}`;
    // 将起始秒和结束秒组合成时间戳格式（例如："0,3"）
    const duration = `${start},${end}`;
    onConfirm({
      characterName: finalCharacterName,
      description: description.trim(),
      avatar,
      duration,
      line: selectedLine, // 传递线路选择
    });
    // 重置表单
    handleClose();
  };

  // 处理关闭
  const handleClose = () => {
    setCharacterName("");
    setDescription("");
    setAvatar(null);
    setAvatarPreview(null);
    setStartSecond("0");
    setEndSecond("3");
    setSelectedLine(2); // 重置为默认开启线路1按钮
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[calc(63vh+200px)] overflow-y-auto scrollbar-visible">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">生成角色</h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* 角色名 */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-sm font-medium text-neutral-200">
                角色名 <span className="text-red-400">*</span>
              </label>
              <span className="text-xs text-neutral-500">
                (限制10个字符,系统会自动在后面添加5位随机字符)
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={characterName}
                onChange={handleCharacterNameChange}
                placeholder="请输入角色名 (最多10个字符)..."
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                {characterName.length}/10
              </div>
            </div>
            <div className="flex items-start gap-2 mt-1.5">
              <svg
                className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-neutral-400 leading-tight">
                角色名将作为角色的唯一标识,系统会自动在后面添加5位随机字符避免重复
              </p>
            </div>
          </div>

          {/* 人物描述词 */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-sm font-medium text-neutral-200">
                人物描述词 <span className="text-red-400">*</span>
              </label>
            </div>
            <div className="relative">
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                placeholder="请输入人物描述词..."
                rows={3}
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm resize-none"
              />
              <div className="absolute right-3 bottom-3 text-xs text-neutral-400">
                {description.length}/500
              </div>
            </div>
            <div className="flex items-start gap-2 mt-1.5">
              <svg
                className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-neutral-400 leading-tight">
                描述越详细,生成效果越好
              </p>
            </div>
          </div>

          {/* 角色头像 */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-sm font-medium text-neutral-200">
                角色头像
              </label>
              <span className="text-xs text-neutral-500">
                (仅用于自己好识别哪个角色,不会传到sora2,跟生成角色无关)
              </span>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-neutral-950"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {avatarPreview ? (
                <div className="space-y-1.5">
                  <img
                    src={avatarPreview}
                    alt="头像预览"
                    className="w-16 h-16 mx-auto object-cover rounded-lg"
                  />
                  <p className="text-xs text-neutral-400">点击更换图片</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <svg
                    className="w-10 h-10 mx-auto text-neutral-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-xs text-neutral-300">上传角色图片</p>
                  <p className="text-xs text-neutral-500">
                    支持JPG、PNG、WebP
                  </p>
                  <p className="text-xs text-neutral-500">最大10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* 视频截取时长 */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-sm font-medium text-neutral-200">
                视频截取时长 <span className="text-red-400">*</span>
              </label>
              <div className="flex items-start gap-1">
                <svg
                  className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-xs text-neutral-400 leading-tight">
                  (最长选3秒,请选择该视频中你需要生成角色的那几秒钟,AI将会根据这几秒视频来创建个专属角色)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-neutral-400 mb-1 block">起始秒</label>
                <input
                  type="number"
                  value={startSecond}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
                      setStartSecond(value);
                    }
                  }}
                  min="0"
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                />
              </div>
              <div className="text-neutral-500 text-base pt-5">-</div>
              <div className="flex-1">
                <label className="text-xs text-neutral-400 mb-1 block">结束秒</label>
                <input
                  type="number"
                  value={endSecond}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
                      setEndSecond(value);
                    }
                  }}
                  min="0"
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedLine(2)}
              className={`px-4 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                selectedLine === 2
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              线路1
            </button>
            <button
              onClick={() => setSelectedLine(1)}
              className={`px-4 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                selectedLine === 1
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              线路2
            </button>
          </div>
          <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
              className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
              className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            确认生成
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

