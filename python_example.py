import requests
import hashlib
import time

# 配置信息（已脱敏，占位图路径需支持本地文件或公网URL）
API_CONFIG = {
    "server_url": "https://ai.604520.top/v1/videos",
    "app_id": "你的app_id",
    "app_secret": "你的app_secret",
    "token": "你的bearer_token",
    # 预设无干扰占位图（建议用纯白图，路径可替换为实际本地路径或公网URL）
    # 注意：请将以下路径替换为实际的占位图路径（相对路径或绝对路径）
    "placeholder_image": "./placeholder.png"  # 相对路径示例，或使用 "file:///path/to/placeholder.png"  
}

def generate_video(params):
    # 1. 智能占位图片机制：判断 input_reference 是否为空
    #    如果用户未上传图片（input_reference 为空/None/空字符串），自动使用占位图
    #    如果用户已上传图片（input_reference 有值），优先使用用户图片
    user_input_reference = params.get("input_reference")
    if not user_input_reference or user_input_reference.strip() == "":
        # 用户未上传图片，使用预设占位图
        input_reference_value = API_CONFIG["placeholder_image"]
        print(f"[智能占位] 用户未上传图片，自动使用占位图: {input_reference_value}")
    else:
        # 用户已上传图片，优先使用用户图片
        input_reference_value = user_input_reference
        print(f"[智能占位] 用户已上传图片，使用用户图片: {input_reference_value}")
    
    # 2. 组装基础参数
    base_params = {
        "appId": API_CONFIG["app_id"],
        "timestamp": str(int(time.time() * 1000)),
        "signType": "MD5",
        "charset": "UTF-8",
        "model": params.get("model", "sora-2"),
        "prompt": params.get("prompt", ""),
        "seconds": params.get("seconds", "10"),
        "input_reference": input_reference_value,  # 使用智能占位后的值
        "size": params.get("size", "16x9"),
        "watermark": params.get("watermark", "false"),
        "private": params.get("private", "true"),
        # 角色复用参数（保留原有逻辑）
        "character_url": params.get("character_url", ""),
        "character_timestamps": params.get("character_timestamps", "")
    }

    # 3. 生成签名（原有逻辑不变）
    sorted_params = sorted(base_params.items(), key=lambda x: x[0])
    sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if v]) + API_CONFIG["app_secret"]
    base_params["sign"] = hashlib.md5(sign_str.encode()).hexdigest().upper()

    # 4. 发起请求（原有逻辑不变）
    headers = {
        "Authorization": f"Bearer {API_CONFIG['token']}",
        "Content-Type": "multipart/form-data"
    }
    response = requests.post(
        API_CONFIG["server_url"],
        data=base_params,
        headers=headers,
        timeout=30
    )
    return response.json()


# 调用示例1：用户未上传图片（input_reference 未传入，需自动用占位图）
# result = generate_video({
#     "model": "sora-2-portrait-hd",
#     "prompt": "生成穿着红色裙子的女孩跳舞的视频",
#     "seconds": "15",
#     "size": "9:16",
#     "character_url": "https://xxx.com/角色视频.mp4",
#     "character_timestamps": "0,5"
#     # 注意：这里没有传入 input_reference，会自动使用占位图
# })

# 调用示例2：用户已上传图片（input_reference 有值，优先使用用户图片）
# result = generate_video({
#     "model": "sora-2-landscape-hd",
#     "prompt": "基于上传图片的场景，生成角色跑步的视频",
#     "seconds": "10",
#     "size": "16x9",
#     "input_reference": "./user-upload.png",  # 相对路径示例，或使用 "file:///path/to/image.png"
#     "watermark": "true"
# })

# 调用示例3：显式传入空值，也会使用占位图
# result = generate_video({
#     "model": "sora-2",
#     "prompt": "测试提示词",
#     "seconds": "10",
#     "input_reference": None  # 或 "" 或 不传此参数，都会使用占位图
# })

