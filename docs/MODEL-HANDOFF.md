# 秧秧玄翎 0.1.2 基础模型交接

2026-10-15。美术沿用 v4 灰蓝瞳色，当前源与导出为 v6。仅眼睛后的隐藏皮肤底层补绘；10 层名称、位置、alpha 保留，睁眼原始图层合成的 RGBA 变化为 0。没有整体缩窄或提高饱和度。详见 `eye-underpaint-v6.json`。

0.1.1 修复主体可见性：测试恢复偏好后再等待输入，启动/找回时移到当前显示器工作区右下角，设置根据主体位置放在旁边。已在 150% DPI 的真实桌面观察到主体与设置同时可见、无重叠；旧包保留。详见 `visibility-fix-20261015.json`。本次没有修改美术、CMO3 或 MOC3。

用户实际操作的 0.1.1 已通过键盘、鼠标独立、鼠标→键盘、稳定长按 3561 ms 及 1 秒 5 次新敲击检查，见 `native-input-20261015.json`。0.1.2 输入逻辑相同；新版桌面显示单独检查，不冒充再次完成物理输入。v6 已完成 PSD 替换、CMO3 保存重开、官方导出及 SDK 用例，见 `native-authoring-v6.json`。

## 当前入口

- 分层 PSD：`art/source/YangyangXuanling-EyeUnderpaint-v6.psd`，1536×1360，10 层。
- 真实 Cubism 源：`art/source/YangyangXuanling-v6-rig.cmo3`。
- 官方运行模型：`public/models/yangyang-v6/YangyangXuanling.model3.json`，配套 MOC3、CDI3 和 2048×2048 贴图。
- 程序配置：`public/assets/model-config.json`。运行中使用官方 Core/Framework。
- 自动化证据：`automation-integration-20261015.json`，记录新增 skill、17 个 MCP 工具、绑定、保存重开、导出与 SDK 检查。

用户桌面附件的原始字节当前不可读取；输入像素来自已记录的同构图 1536 方图副本。没有把该副本冒充为原附件文件。可见区域使用原图像素拆层，AI 只补遮挡底层；虹膜是按用户要求局部重新调色，掩码外 RGB、alpha 和图像比例不变。源像素报告与提示词分别位于 `pixel-preservation-v4.json`、`iris-correction-v4.json` 和 `image-prompts.json`。

## 已制作的绑定

| 行为 | 原生参数 | 网格 | 范围与用途 |
| --- | --- | --- | --- |
| 键盘，画面右手 | ParamBodyAngleX | ArtMesh / keyboard-hand | -10..10；程序将 0..1 按压映射为 0..10 |
| 鼠标，画面左手 | ParamBodyAngleY | ArtMesh0 / mouse-hand | -10..10；与键盘独立 |
| 左眼闭合 | ParamEyeLOpen | ArtMesh4 + ArtMesh2 | 0 为眼睛隐藏、闭眼线显示；1 相反 |
| 右眼闭合 | ParamEyeROpen | ArtMesh3 + ArtMesh1 | 与左眼同理 |

BodyAngleX/Y 的显示名称已改为键鼠按压用途，ID 保留。这里没有把它们当成真正的身体转动。手部顶点在编辑器内制作；新 skill 的 API 完成透明度眨眼绑定、参数名称、保存与原生导出。纹理图集和闭眼线压缩通过编辑器完成。

半闭眼透明度插值会重影，因此程序使用 130 ms 的短闭眼状态切换。该版本尚无精细眼皮形变、转头、视线跟随、呼吸、发丝物理或小鸟独立弹动。小鸟保持静止，避免未补全的遮挡区域露出。

## 检查边界

- 输入状态单元检查通过：独立键鼠、长按不重启弹动、再次按下、多个键部分松开。
- Rust 按键边沿检查通过：同一次采样间隔内的按下/松开仍保留一次事件，自动重复不重触发。
- Cubism 保存重开及官方导出通过。Core 6.0.1 检查 MOC 一致性、27 参数、10 drawable、WebGL 渲染通过。键盘、鼠标、同时按下及闭眼用例均改变实际顶点/画面。
- 浏览器检查通过：真实 Cubism 渲染、持续绘制、独立两手、长按、按键提示及设置页，无页面错误。浏览器语义输入不能证明 Windows 全局键盘正常。
- Windows 实机检查已确认真实 MOC3 可见渲染、持续绘制、设置显示与保存恢复。用户物理操作已通过独立键鼠、稳定长按 3561 ms、1 秒 5 次新敲击及鼠标→键盘切换；以 `native-input-20261015.json` 为准。早期工具模拟键未被观测的记录保留为历史失败证据，不能覆盖这次实际用户输入结果。
- Windows 设置创建白屏已修复：WebView2 创建移到后台任务，重复打开通过锁串行处理。依据 [Tauri WebviewWindowBuilder 文档](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html)。快速键事件由独立线程的低级键盘回调保留；回调只更新原子状态并转交输入，不拦截、不保存文本。依据 [Microsoft LowLevelKeyboardProc](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc)。

测试时改变的偏好会恢复为大小 420、幅度 1、置顶开、穿透关、按键显示开、眨眼开。自动化没有输入历史，诊断只记录计数和语义状态。

## 待精修与待验收

抠图有少量白边；闭眼底层平涂色块已改善，闭眼线仍是压缩的基础形状，可见细碎睫毛；手部按压目前为基础网格位移。下一轮可精修透明边缘与闭眼线、制作连续眼皮变形。发丝、转头及小鸟动作需另行制作真实形变与遮挡补全，不能仅添加空参数后宣称已绑定。

物理多键/键鼠同时、穿透恢复热键、托盘菜单全路径及安装流程仍需实测。独立物理键盘、鼠标、长按与快速输入已在 0.1.1 通过。当前作为可运行制作预览交付，保留其余未验收项。

## 操作

双击便携 EXE 运行；右键桌宠或点托盘打开设置，拖动手柄移动。穿透后可通过托盘“找回桌宠 / 关闭穿透”恢复；快捷键 Ctrl + Alt + Y 已实现但未在本次自动化中完成原生验收。托盘“退出”关闭程序。
