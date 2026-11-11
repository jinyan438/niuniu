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
- 场景生图：支持本地 ComfyUI、Nano Banana Pro/Gemini，以及返回 `data[].url` 的 OpenAI 兼容第三方图像接口。
- 听书：支持 GPT-SoVITS、IndexTTS 和 Fish Speech，可配置主音色、对白音色及合成参数；Fish Speech 支持参考音色缓存、提前合成和连续音频调度。
- 搜索下载：可搜索并导入 TXT/EPUB 小说；此功能依赖第三方接口，其可用性可能发生变化。
- Legado 书源：兼容导入 JSON、TXT、JS、GZIP、远程地址、`sourceUrls` 清单和 Legado 分享链接，支持发现分类、多源搜索、详情、目录、正文缓存与书源管理。

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
3. 按需配置提示词、场景生图和 TTS 服务；第三方生图请选择“第三方供应商”，填写完整的图像生成接口地址、API Key 和模型名称。
4. 保存后，从阅读页的“AI数据库”菜单使用总结、翻译、续写、人物提取或场景生图。

项目不内置 API Key。AI、图像和 TTS 功能均使用你自行配置的服务，相关费用、速率限制和内容政策由对应服务商决定。

Fish Speech 使用官方 `/v1/tts` 和 `/v1/references/list` 接口，API 地址可以填写服务根地址或以 `/v1` 结尾的地址。将参考录音及同名 UTF-8 `.lab` 逐字稿放在服务端 `references/音色ID/` 中，例如 `references/muxiaoyu/sample.wav` 和 `sample.lab`，再在阅读器刷新音色；音色 ID 使用英文字母、数字、下划线或短横线。也可通过官方 `/v1/references/add` 接口保存音色；当前 WebUI 的参考上传仅用于当次合成。没有参考音色时可选择“默认音色”。本机启动脚本为 fish-speech 目录下的 `运行API.bat`，默认端口 9882，同时监听 IPv4/IPv6；外网访问需放行该端口。脚本优先使用已下载的 S2-Pro，安装了匹配的 Triton 时自动启用编译加速；`--no-compile` 可关闭编译，`--model drama-3-int4` 可切回 Drama 3。S2-Pro 默认使用 4096 上下文以减少显存，首次编译和预热需要较长时间。

Fish Speech 播放前预缓冲两批文本，随后最多提前合成六批，使用同一个 Web Audio 时钟衔接已准备好的音频；不支持 Web Audio 的设备使用现有音频播放器。暂停会保留当前播放位置。平稳连续播放要求服务平均生成速度快于播放速度，预缓冲不能弥补持续慢于实时的推理。本机 RTX 4090、32 GB 内存实测：Drama 3 INT4 生成 3.16 秒音频耗时 33.82 秒；S2-Pro 编译模式生成 27.68 秒音频耗时 18.15 秒，中长文本已快于实时，16 字短句则接近实时。S2-Pro 的编译优化和 Drama 3 的 SGLang-Omni/Marlin 是不同部署路径，详见 [Fish Speech 推理说明](https://speech.fish.audio/inference/) 与 [Drama 3 INT4 模型说明](https://huggingface.co/fishaudio/drama-3-int4)。

听书音频保留原始段落边界，长段落可拆成多个片段；高亮和自动翻页按实际音频播放时钟推进，支持尚未显示的页面。界面短暂卡顿后会追到当前播放位置，旧播放任务的延迟回调不会覆盖新的高亮。

听书模式下，点击正文中的章节标题可从标题开始连续朗读，点击顶部当前章节名可从本章标题重新开始；听书点击优先于焦点和沉浸阅读。标题使用主音色朗读，例如“第一章，护仙观”。段落间停顿 0.7 秒，同段对白与旁白切换停顿 0.44 秒，进入下一章前停顿 3 秒，标题读完停顿 1.4 秒。长段落内部的合成片段保持连续；等待合成的时间会计入停顿，高亮和翻页等到实际发声时再切换。长按菜单中的“朗读”只读选中的段落。

## 书源

从书架打开“书源”，可在右上角导入本地文件、粘贴书源内容或网络地址。声明式书源支持常用 JSONPath、XPath、CSS/JSoup、正则、内嵌 JavaScript、GET/POST、请求头和分页规则；纯 JavaScript 单文件书源支持 `search`、`explore`、`getBookInfo`、`getChapters` 与 `getContent` 流程。

在线书籍会按章节缓存为本地 TXT 并写入现有书架，之后沿用本项目的排版、目录、搜索、听书与 AI 阅读功能。Android 版本通过原生 HTTP 桥接处理跨域、Cookie、自定义请求头及 HTTP 站点；直接在桌面浏览器打开时，目标站点自身的 CORS 策略仍可能阻止请求。

书源规则可以包含并执行 JavaScript，也可以访问任意网络地址。只导入来源可信、内容可审计的书源，并自行确认内容授权、站点条款和当地法律要求。

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

每次修改完成并通过相关验证后，主动提交并推送到当前分支的远程仓库，无需再次提醒；用户明确要求暂不推送时除外。此约定同时记录在 [AGENTS.md](AGENTS.md) 中。

修改 `www/` 后，重新同步到 Android 工程：

```powershell
npx cap sync android
```

提交前可检查 JavaScript 语法：

```powershell
Get-ChildItem www\js\*.js | ForEach-Object { node --check $_.FullName }
```
