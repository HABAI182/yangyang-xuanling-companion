# 秧秧玄翎桌面伴侣

本仓库为 HABAI182 的私有开发仓库，使用 [live2d-desktop-pet v3.1.0](https://github.com/HABAI182/live2d-desktop-pet-skill) 与新增的 [live2d-automation v0.1.0](https://github.com/HABAI182/live2d-automation-skill) 制作 Windows Q 版桌宠。

当前版本为 0.1.1 基础预览：修复测试异常退出后关闭置顶未恢复的问题，启动和找回主体放在屏幕右下角，设置放在旁边。真实桌面已观察到主体，打开设置后依然可见；当前 150% DPI 下两窗重叠面积为 0，测试后偏好已恢复。真实 CMO3、官方 MOC3、2048 贴图与 model3 仍为 v5，程序使用 Cubism Core/Framework。两只手和短眨眼已制作；真实键盘输入仍待实测，完整桌宠验收尚未通过。

当前 Windows 文件在 `deliveries/20261015-windows-0.1.1`，包括便携 EXE、NSIS 安装程序与模型源文件压缩包；0.1.0 原目录保留。交付目录不进入 Git，开发源和检查记录进入私有仓库。安装程序已经生成，安装流程未执行。详细模型入口和美术边界见 [MODEL-HANDOFF.md](docs/MODEL-HANDOFF.md)，本次可见性检查见 [visibility-fix-20261015.json](docs/visibility-fix-20261015.json)。

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

`public/assets/model-config.json` 当前入口为 `/models/yangyang-v5/YangyangXuanling.model3.json`，源文件为 `art/source/YangyangXuanling-v5-rig.cmo3`。模型加载失败会报告错误。旧 PNG 和 PSD 检查点保留用于追溯，当前运行路径采用真实 MOC3。

PSD、CMO3、官方导出、运行时处理和文件/Core/浏览器/Windows 原生验证分别保存。源图、AI 提示词、锁区、测试结果、剩余问题和下一步随阶段保存。

供应商文件见 `public/vendor/live2d` 的 Core/Framework 许可。这里只复用长离工程中的通用官方 SDK，不复用长离的角色模型或贴图。用户仅授权私有开发管理，公开发行另行决定。
