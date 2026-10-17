# 秧秧玄翎桌面伴侣

本仓库为 HABAI182 的私有开发仓库，使用 [live2d-desktop-pet v3.1.0](https://github.com/HABAI182/live2d-desktop-pet-skill) 与新增的 [live2d-automation v0.1.0](https://github.com/HABAI182/live2d-automation-skill) 制作 Windows Q 版桌宠。

当前版本为 **0.3.3 精修预览**，保留[长离 0.7.15](https://github.com/HABAI182/changli-companion/tree/c083f86e42de83430f451e1d02973f7ba987e771) 的通用功能设计及秧秧原比例、灰蓝瞳色。重新拆分纯手掌、袖根与双瞳孔，清理外缘纸白，仅极小修剪左发尖；加入四键区与独立 Space、手和鼠标联动、阻尼回弹、独立玄翎雀及二维视线。原生模型与运行时效果分别记录。

0.3.1 修复两眼圆形切口露白与眼缘随表情缩放：固定眼白遮罩、完整瞳孔、固定原图睫毛和头发。增强按下压缩及松开拉伸回弹，长按保持稳定。按键浮显高度不变，文字气泡移到相同高度并向左移动；脸红改为渐隐晕染与细笔触并随脸部弹动。

当前 Windows 文件目录为 `deliveries/20261017-windows-0.3.3`，包括便携 EXE、NSIS 安装程序、模型与运行时效果源码压缩包和校验清单；旧版保留。开发源和证据进入私有仓库。详见[精修说明](docs/refinement-0.3.3.md)、[模型交接](docs/MODEL-HANDOFF.md)和[验收记录](docs/validation-0.3.3.json)。

0.3.2 补齐左侧发梢的连续轮廓，保留原图重合区域RGBA；文字泡与按键浮显加细框、各自独立缩放，按键默认130%。视线默认165%，最大250%。右键菜单17种情绪细化嘴形、眼睑、眨眼和泪光，补片跟随实际原生网格。补充PSD与运行时效果分别记录。

0.3.3 扩大视线默认幅度到210%、上限320%，加入1–15秒可调的鼠标静止回正（默认3秒），移动或点击恢复。独立鼠标和手掌不随眼睛回正；鼠标在角色外移动也会重置计时。透明轮廓、内孔和底部空白自动穿透，保留主体与三个按钮的点击；整只穿透仍是单独开关。

闭眼时补上原眼眶/外眼角，符号改为更大的Q版描边；消息与按键采用相同的雾蓝粗边框、羽毛金花红绳元素。菜单高度跟随内容，不再留大片底部空白。效果见 [表情预览](art/mood-review-0.3.3.png)。

## 下载与历史版本

Windows程序和模型源文件在私有仓库的 [GitHub Releases](https://github.com/HABAI182/yangyang-xuanling-companion/releases) 附件区，需使用有仓库权限的账号登录。当前推荐 [v0.3.3 Windows x64 精修预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.3.3)。

| 版本 | 主要变化 | 下载 |
| --- | --- | --- |
| 0.3.3 | 透明空白穿透、可调静止回正、闭眼及统一气泡修整 | [推荐预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.3.3) |
| 0.3.2 | 发梢补齐、菜单表情、气泡独立缩放 | [历史预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.3.2) |
| 0.3.1 | 双眼原生剪贴遮罩、增强按下和松开回弹 | [历史预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.3.1) |
| 0.3.0 | 独立手掌、四键区和Space、鼠标联动及鸟动作 | [历史预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.3.0) |
| 0.2.0 | 设置和互动功能对齐长离通用设计 | [历史预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.2.0) |
| 0.1.2 | v6眼部隐藏底层和贴图 | [历史预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.1.2) |
| 0.1.1 | 主体显示与设置窗口位置修复 | [历史预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.1.1) |
| 0.1.0 | 首个Windows基础预览 | [历史预览](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.1.0) |

每版附件包括便携EXE、安装程序、模型源文件ZIP、使用说明、manifest、原校验单和下载名对应的校验单；保留原文件与原源码标签，不重新打包旧版本。便携运行下载 `Yangyang-Xuanling-版本号-Windows-x64.exe`，需要安装则下载相应 `setup.exe`。各版实际验收范围见其manifest，历史预览不代表当时问题已全部修复。

## 本版功能

- 外观/互动/桌面/高级四分页设置，系统/深浅主题、强调色、密度、字号和50%–200%大小；动效、手速、独立键鼠幅度可调。
- 独立互动菜单，17种情绪反馈、3段小动作、36条本地气泡，点击回应、空闲回应与小憩。
- 单/多键浮显，上限1–6个，长按重复独立开关；全局反馈开关、仅键盘模式，输入自己的设置时不触发动作。
- 置顶、拖动、鼠标穿透与找回、手动显隐、同屏全屏避让和程序例外、磁吸、3个常用位置、靠近淡化。
- 25个可编辑动作快捷键槽、手柄与轻音反馈、30/60帧、登录启动、高权限兼容手动重启、固定项目/版本链接。

四区、Space、眼睛跟随、鼠标联动、闭眼、小鸟及弹簧复位已经过真实 Core/WebGL 检查。本版 Windows 和物理输入的精确构建与测试范围以验收 JSON 为准；旧版用户4.33秒长按记录只属于0.2.0。

原生双手按压、眨眼、双眼剪贴遮罩已制作，闭眼线为连续独立图层。四区伸手、二维视线、弹性、小鸟和部分眼形为 SDK 顶点效果；17种情绪包含运行时口形与SVG装饰，尚未制作17套原生脸部、连续眼皮几何闭合、完整原生口形参数与发丝物理。手柄实机、游戏内输入、UAC重启、登录启动、安装及完整拖拽/多屏/音频人工验收仍有未测项。

2026-10-14 用户指出第一版重绘偏窄、偏艳，已选择“原图像素抠图、拆层，仅补绘隐藏区域”。第一版生成的头部、设备和组合图作为 rejected visual candidate 保留；后续以可读取的同构图参考副本的原始像素为准，保留比例与 RGB，不整体重绘。用户消息中的桌面原文件当前不可读取，同构图 skill 副本为 1536×1536，来源在 `docs/character-contract.json` 中区分记录。

维护验收与隐私边界见 [ACCEPTANCE-STATUS.md](docs/ACCEPTANCE-STATUS.md)；CI 不发布模型、截图或 Release。

## 开发

```powershell
npm ci
npm run dev
npm test
npm run build
npm run desktop
npm run package:windows
```

Windows 需要 Rust、Microsoft C++ Build Tools 和 WebView2。美术打包依赖 `scripts/art-requirements.txt`。浏览器只预览页面输入，Windows 程序以原生状态采样驱动全局键鼠反馈。

## 角色与输入

- 保留原图的蓝黑渐变发色、额纹、羽饰金花红穗与蓝白小鸟；瞳色依用户反馈改成低饱和灰蓝，去除过蓝、过青效果。
- 画面左侧手（角色右手）负责鼠标，画面右侧手（角色左手）负责键盘。
- Q/A/U/H代表四个物理区域，数字、标点、功能、修饰、方向及小键盘按物理位置归区；Space有单独落点。松开Space会回到仍按住的键。
- 长按保持落点，不反复弹头；真正再次按下才启动新的弹动。
- 默认显示最近一个按键，短暂显示后消失；不保存输入文本或历史，不联网传输输入。
- 右键桌宠或点击托盘打开互动菜单，再进入设置；Ctrl + Alt + Y 找回窗口并解除穿透。

## 模型接入与证据

`public/assets/model-config.json` 当前入口为 `/models/yangyang-v11/YangyangXuanling.model3.json`，源文件为 `art/source/YangyangXuanling-v11-rig.cmo3`，PSD 为 `art/source/YangyangXuanling-Separated-v11.psd`。模型加载失败会报告错误。旧 PNG、PSD 和 CMO3 检查点保留，当前路径采用真实官方导出的 MOC3。分层构建脚本按 v7 → v8 → v9 → v10 → v11 顺序使用本地冻结的底图/隐藏补绘素材；不会再次调用生成模型。

PSD、CMO3、官方导出、运行时处理和文件/Core/浏览器/Windows 原生验证分别保存。源图、AI 提示词、锁区、测试结果、剩余问题和下一步随阶段保存。

供应商文件见 `public/vendor/live2d` 的 Core/Framework 许可。这里只复用长离工程中的通用官方 SDK，不复用长离的角色模型或贴图。用户仅授权私有开发管理，公开发行另行决定。
