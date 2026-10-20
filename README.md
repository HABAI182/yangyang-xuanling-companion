# 秧秧玄翎桌面伴侣

Windows x64 Q版桌面伴侣。当前发行仅保留**表情完整版0.3.6**，包含键鼠互动、视线跟随、情绪、小动作、台词与桌面设置。

2026-10-20按作者要求，静态版和无表情互动版从本仓库Release移除，转存[另一私有仓库](https://github.com/HABAI182/repository-history-archive-private/releases/tag/yangyang-retired-editions-20261020)并完成原字节、SHA256和独立下载回读核验。三档价格和爱发电引导已撤出当前发行资料，改用[B站投稿草稿](docs/distribution/bilibili-post.md)。仓库仍为Private，开发源码、可编辑源、Tag和其他历史版本保留。

[当前版本说明](docs/distribution/full-edition.md) · [0.3.6验证范围](docs/distribution/0.3.6.md)

## 下载与使用

- [直接运行表情完整版EXE](https://github.com/HABAI182/yangyang-xuanling-companion/releases/download/v0.3.6/YangyangXuanling-0.3.6-full-win-x64-portable.exe)
- [便携ZIP与安装包备份](https://github.com/HABAI182/yangyang-xuanling-companion/releases/tag/v0.3.6)
- [其他历史版本](https://github.com/HABAI182/yangyang-xuanling-companion/releases)

系统需要WebView2。私有GitHub下载需要仓库访问权限；B站观众领取需另设公开可访问的文件地址，不分发仓库凭据。

复用0.3.6原始完整版，实际构建源码为`988d4a3889f60046b4ecd5924fd2a56c33d6430a`。本次不重建软件、修改模型或重渲染视频；完整版EXE、便携ZIP和安装包的原字节及校验值不变。

右键角色或托盘打开互动菜单与设置；`Ctrl + Alt + Y` 找回窗口并解除穿透。画面左侧手（角色右手）控制鼠标，画面右侧手（角色左手）控制键盘。Q/A/U/H 表示四个物理键区，Space 使用独立落点；长按保持姿态，真正再次按下才弹动。

- 16 种情绪与日常状态、3 段小动作、36 条本地气泡，独立玄翎雀、二维视线与阻尼回弹。
- 可调静止后视线回正、透明空白自动穿透、置顶、拖动、全屏避让与常用位置。
- 外观/互动/桌面/高级设置，50%–200% 大小、独立气泡和按键缩放、主题与动作幅度。
- 默认仅短暂显示最近一个按键，可选最多 6 个；不保存输入文本或按键历史，不联网传输输入。

## 开发

Windows 需要 Node.js、Rust、Microsoft C++ Build Tools 和 WebView2。

```powershell
npm ci
npm run dev
npm test
npm run build
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm run desktop
npm run package:windows
```

浏览器预览只处理页面输入；全局输入由 Windows 原生层提供。[CI](.github/workflows/ci.yml) 仅在当前仓库确认为私有时运行真实单元测试与构建，不发布模型、截图或 Release。

## 当前模型与源稿

入口为 `public/assets/model-config.json`，加载 `public/models/yangyang-v11/YangyangXuanling.model3.json`。保留当前可编辑源：

- `art/source/YangyangXuanling-v11-rig.cmo3`
- `art/source/YangyangXuanling-Separated-v11.psd`
- `art/source/YangyangXuanling-Details-v13.psd`
- `art/source/YangyangXuanling-Sleepy-v14.psd`

`art/source/composition-neutral-v11.png` 为当前像素构图；`skill-layout-reference.png` 为同构图参考副本，并非用户桌面原图的相同字节。保留原比例、蓝黑至蓝白发梢、灰蓝瞳色、额纹、羽饰金花红穗和蓝白小鸟；只补绘隐藏区与指定局部，不整体重绘。官方身份参考位于 `art/references/`。旧源稿、过程脚本、提示词、交接和截图移至完整私有镜像归档。

0.3.4 为困倦增加独立的低垂眼睑、短睫毛与放松嘴形，保留其他表情。原生按压、眨眼和双眼剪贴遮罩与运行时顶点/SVG 效果分别维护。四区伸手、视线、弹性及部分眼形属于运行时效果，不代表 17 套完整原生脸部或新的 CMO3 导出。

本版仍待人工美术认可、安装器执行和物理输入复测；游戏、手柄、登录启动、多屏与音频也未完成全面人工验收。单元与构建 CI 不代表这些项目已通过。

通用功能参考长离 MIT 代码，原许可和来源保留于 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)；不复用其角色模型或贴图。Core/Framework 使用各自官方许可，不因私有保存而获得额外角色权利。
