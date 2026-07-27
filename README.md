# 牛牛阅读器

一个本地优先、支持 AI 辅助阅读的 TXT/EPUB 小说阅读器。项目以 Web 技术实现，并通过 Capacitor 提供 Android 应用；书籍、阅读进度和生成记录默认保存在当前设备上。

![牛牛阅读器图标](niuniu.png)

## 功能

- 本地书架：导入单个文件或文件夹，支持 TXT、EPUB、标签、排序、阅读进度和书籍导出。
- 阅读体验：章节目录、章节/全文搜索、点击与滑动翻页、沉浸模式、对话高亮。
- 排版定制：亮色、暗色、护眼、蓝色、灰色和墨水屏主题，可调整字体、字号、行距、字距、段距、颜色及背景图。
- AI 阅读：对当前页、章节或指定范围进行总结、翻译和续写，并保存生成历史。
- AI 数据库：提取人物、关系和场景信息，维护人物卡片，为后续生成提供上下文。
- 互动内容：读者人格与段评生成，以及基于小说角色的手机互动模块。
- 场景生图：支持本地 ComfyUI 或兼容的 Nano Banana Pro/Gemini 图像接口。
- 听书：支持 GPT-SoVITS 和 IndexTTS，可配置主音色、对白音色及合成参数。
- 搜索下载：可搜索并导入 TXT/EPUB 小说；此功能依赖第三方接口，其可用性可能发生变化。

## 快速开始

### 浏览器

直接用最新版 Chrome、Edge 或 Firefox 打开 `www/index.html`，然后在书架中导入 TXT 或 EPUB 文件。

部分文件系统、分享、跨域请求和本地服务访问能力受浏览器安全策略限制；需要完整体验时建议使用 Android 版本。

### Android

环境要求：

- Node.js 20 或更高版本
- JDK 17
- Android Studio 与 Android SDK 35

安装依赖并同步项目：

```powershell
npm ci
npx cap sync android
npx cap open android
```

Windows 下也可以运行一键打包脚本：

```powershell
.\build-apk.bat
```

脚本会生成 Debug APK，并复制为项目根目录下的 `牛牛阅读器.apk`。APK、构建缓存和本机 Android 配置均已被 Git 忽略。

## AI 配置

1. 打开“阅读设置” -> “AI 功能设置”。
2. 填写 OpenAI 兼容接口地址、API Key 和模型名称。
3. 按需配置提示词、场景生图和 TTS 服务。
4. 保存后，从阅读页的“AI数据库”菜单使用总结、翻译、续写、人物提取或场景生图。

项目不内置 API Key。AI、图像和 TTS 功能均使用你自行配置的服务，相关费用、速率限制和内容政策由对应服务商决定。

## 数据与隐私

- 书架、阅读进度、设置和生成记录保存在浏览器 WebView 的 `localStorage` 与 IndexedDB 中。
- 导入的书籍默认在本地处理，不会上传到本项目自建服务器。
- 调用在线 AI、图像或 TTS 服务时，所选正文、提示词或相关上下文会直接发送到你配置的服务端。
- API Key 会以明文保存在当前浏览器或 Android WebView 的 `localStorage` 中。请仅在可信设备上使用，不要把真实 Key 写入源码、截图、Issue 或提交记录。
- 搜索下载功能会访问第三方小说接口，请自行确认当地法律、内容授权和接口使用条款。

## 安全说明

当前仓库及其可达 Git 历史已检查常见 API Key、访问令牌、私钥和签名文件格式，未发现已提交的真实凭据。`.gitignore` 已排除 `.env`、私钥、证书、Android 签名文件和 `google-services.json` 等常见敏感文件。

如果 Key 曾经被提交过，仅删除文件并重新提交并不能使其失效；应立即在服务商控制台撤销并重新生成，再根据需要清理 Git 历史。

Android 配置当前允许 HTTP/混合内容并开启 WebView 调试，便于连接局域网内的 AI 与 TTS 服务。发布正式版本前，应根据部署环境关闭 WebView 调试，并尽量使用 HTTPS 和最小化网络权限。

## 项目结构

```text
.
|-- www/                  Web 应用源码与静态资源
|   |-- index.html
|   |-- style.css
|   `-- js/
|-- android/              Capacitor Android 工程
|-- capacitor.config.json Capacitor 配置
|-- build-apk.bat         Windows 一键打包脚本
|-- generate-icons.js     图标生成脚本
|-- package.json          Node.js 依赖
`-- niuniu.png            应用图标源文件
```

## 开发

修改 `www/` 后，重新同步到 Android 工程：

```powershell
npx cap sync android
```

提交前可检查 JavaScript 语法：

```powershell
Get-ChildItem www\js\*.js | ForEach-Object { node --check $_.FullName }
```
