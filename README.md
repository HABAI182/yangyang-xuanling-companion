# 秧秧玄翎桌面伴侣

本仓库为 HABAI182 的私有开发仓库，按照 [live2d-desktop-pet v3.1.0](https://github.com/HABAI182/live2d-desktop-pet-skill) 制作 Windows Q 版桌宠。

当前阶段：原图像素拆层、遮挡底层补绘和 Cubism 原生模型制作。Windows 原生程序骨架、系统输入、托盘、拖动、大小/动作幅度/置顶/穿透设置已实现；首次构建和分层预览的浏览器检查已通过。正式模型和原生实机验收仍在进行，当前 PNG 动作预览不等于已完成的 Live2D。

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

- 保留原图的蓝黑渐变发色、蓝眼、额纹、羽饰金花红穗与蓝白小鸟。
- 画面左侧手（角色右手）负责鼠标，画面右侧手（角色左手）负责键盘。
- 长按保持落点，不反复弹头；真正再次按下才启动新的弹动。
- 默认显示最近一个按键，短暂显示后消失；不保存输入文本或历史，不联网传输输入。
- 右键桌宠或点击托盘打开设置；Ctrl + Alt + Y 找回窗口并解除穿透。

## 模型接入与证据

`public/assets/model-config.json` 的 `entry=null` 表示图层预览。只有实际经 Cubism 保存、导出的 MOC3/model3 通过验证后，才启用官方 Core/Framework 运行路径。模型加载失败会报告错误，不静默宣称 Live2D 成功。

PSD、CMO3、官方导出、运行时处理和文件/Core/浏览器/Windows 原生验证分别保存。源图、AI 提示词、锁区、测试结果、剩余问题和下一步随阶段保存。

供应商文件见 `public/vendor/live2d` 的 Core/Framework 许可。这里只复用长离工程中的通用官方 SDK，不复用长离的角色模型或贴图。用户仅授权私有开发管理，公开发行另行决定。
