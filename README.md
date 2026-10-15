# 秧秧玄翎桌面伴侣

本仓库为 HABAI182 的私有开发仓库，使用 [live2d-desktop-pet v3.1.0](https://github.com/HABAI182/live2d-desktop-pet-skill) 与新增的 [live2d-automation v0.1.0](https://github.com/HABAI182/live2d-automation-skill) 制作 Windows Q 版桌宠。

当前版本为 0.1.2 基础预览：v6 模型补绘眼睛后的隐藏底层，改善闭眼色块，保留 v4 灰蓝瞳色、原比例与可见底稿像素。真实 CMO3 已保存重开并由 Cubism 导出；绑定属性及 MOC3 与 v5 一致，2048 贴图已更新。官方 SDK 与浏览器检查通过。用户物理输入已在 0.1.1 通过独立两手、3.56 秒稳定长按、1 秒 5 次快速敲击及鼠标→键盘切换；本版输入逻辑未改，见 [native-input-20261015.json](docs/native-input-20261015.json)。闭眼线、透明边缘及高级动作仍待精修。

当前 Windows 文件在 `deliveries/20261015-windows-0.1.2`，包括便携 EXE、NSIS 安装程序与模型源文件压缩包；旧版目录保留。交付目录不进入 Git，开发源和检查记录进入私有仓库。安装流程未执行。详细模型入口和验证边界见 [MODEL-HANDOFF.md](docs/MODEL-HANDOFF.md) 与 [validation-0.1.2.json](docs/validation-0.1.2.json)。

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
- 右键桌宠或点击托盘打开设置；Ctrl + Alt + Y 找回窗口并解除穿透。

## 模型接入与证据

`public/assets/model-config.json` 当前入口为 `/models/yangyang-v6/YangyangXuanling.model3.json`，源文件为 `art/source/YangyangXuanling-v6-rig.cmo3`，PSD 为 `art/source/YangyangXuanling-EyeUnderpaint-v6.psd`。模型加载失败会报告错误。旧 PNG 和 PSD 检查点保留用于追溯，当前运行路径采用真实 MOC3。

PSD、CMO3、官方导出、运行时处理和文件/Core/浏览器/Windows 原生验证分别保存。源图、AI 提示词、锁区、测试结果、剩余问题和下一步随阶段保存。

供应商文件见 `public/vendor/live2d` 的 Core/Framework 许可。这里只复用长离工程中的通用官方 SDK，不复用长离的角色模型或贴图。用户仅授权私有开发管理，公开发行另行决定。
