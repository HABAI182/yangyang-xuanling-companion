# 秧秧玄翎桌面伴侣

本仓库为 HABAI182 的私有开发仓库，使用 [live2d-desktop-pet v3.1.0](https://github.com/HABAI182/live2d-desktop-pet-skill) 与新增的 [live2d-automation v0.1.0](https://github.com/HABAI182/live2d-automation-skill) 制作 Windows Q 版桌宠。

当前版本为 **0.2.0 功能对齐预览**，以用户指定的[长离 0.7.15](https://github.com/HABAI182/changli-companion/tree/c083f86e42de83430f451e1d02973f7ba987e771) 为功能基准，保留秧秧当前的比例、灰蓝瞳色及“画面左手鼠标、右手键盘”。v6 CMO3、MOC3、贴图没有改动；新增情绪与小动作由现有参数和运行时效果共同实现。

当前 Windows 文件在 `deliveries/20261015-windows-0.2.0`，包括便携 EXE、NSIS 安装程序、模型与运行时效果源码压缩包和校验清单；旧版保留。开发源和证据进入私有仓库。详见[功能对齐记录](docs/changli-parity.md)、[模型交接](docs/MODEL-HANDOFF.md)和[验收记录](docs/validation-0.2.0.json)。

## 本版功能

- 外观/互动/桌面/高级四分页设置，系统/深浅主题、强调色、密度、字号和50%–200%大小；动效、手速、独立键鼠幅度可调。
- 独立互动菜单，17种情绪反馈、3段小动作、36条本地气泡，点击回应、空闲回应与小憩。
- 单/多键浮显，上限1–6个，长按重复独立开关；全局反馈开关、仅键盘模式，输入自己的设置时不触发动作。
- 置顶、拖动、鼠标穿透与找回、手动显隐、同屏全屏避让和程序例外、磁吸、3个常用位置、靠近淡化。
- 25个可编辑动作快捷键槽、手柄与轻音反馈、30/60帧、登录启动、高权限兼容手动重启、固定项目/版本链接。

浏览器和 Windows 软件功能检查通过；用户真实输入已记录4.33秒稳定长按、1秒4次新敲击和独立键鼠切换。最终包的两项非默认输入过滤修正与物理测试候选版本的关系在验收 JSON 中明确记录。

精细原生表情、连续眼皮与发丝物理尚未制作。手柄实机、游戏内输入、UAC重启、登录启动、安装及完整拖拽/多屏/音频人工验收仍有未测项。没有加入长离当前未启用的专注/待办，也没有将 Windows 构建称为 macOS 适配。

2026-10-14 用户指出第一版重绘偏窄、偏艳，已选择“原图像素抠图、拆层，仅补绘隐藏区域”。第一版生成的头部、设备和组合图作为 rejected visual candidate 保留；后续以可读取的同构图参考副本的原始像素为准，保留比例与 RGB，不整体重绘。用户消息中的桌面原文件当前不可读取，同构图 skill 副本为 1536×1536，来源在 `docs/character-contract.json` 中区分记录。

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
- 长按保持落点，不反复弹头；真正再次按下才启动新的弹动。
- 默认显示最近一个按键，短暂显示后消失；不保存输入文本或历史，不联网传输输入。
- 右键桌宠或点击托盘打开互动菜单，再进入设置；Ctrl + Alt + Y 找回窗口并解除穿透。

## 模型接入与证据

`public/assets/model-config.json` 当前入口为 `/models/yangyang-v6/YangyangXuanling.model3.json`，源文件为 `art/source/YangyangXuanling-v6-rig.cmo3`，PSD 为 `art/source/YangyangXuanling-EyeUnderpaint-v6.psd`。模型加载失败会报告错误。旧 PNG 和 PSD 检查点保留用于追溯，当前运行路径采用真实 MOC3。

PSD、CMO3、官方导出、运行时处理和文件/Core/浏览器/Windows 原生验证分别保存。源图、AI 提示词、锁区、测试结果、剩余问题和下一步随阶段保存。

供应商文件见 `public/vendor/live2d` 的 Core/Framework 许可。这里只复用长离工程中的通用官方 SDK，不复用长离的角色模型或贴图。用户仅授权私有开发管理，公开发行另行决定。
