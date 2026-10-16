# 秧秧玄翎 0.3.1 模型交接

当前运行入口为 `/models/yangyang-v11/YangyangXuanling.model3.json`，对应真实 `art/source/YangyangXuanling-v11-rig.cmo3` 和 `art/source/YangyangXuanling-Separated-v11.psd`。Cubism 5.4.00 alpha2 / API 1.1.0 保存、重开、官方导出已核对；源文件和导出哈希见 `native-eye-v11.json`、`validation-0.3.1.json`。

13 网格保留原先 ID。双瞳孔使用固定眼白的原生剪贴遮罩，睫毛/眼缘/头发位于头部。原生双手按压和开闭眼绑定保留；水平与垂直视线均由 SDK 运行时统一驱动。视觉差异限定在双眼矩形内；其余裁片可见 RGB 和 alpha 不变。

画面左侧（角色右手）控制鼠标，画面右侧（角色左手）控制键盘，四区加独立 Space。形变每帧从 Core 顶点还原后计算，输入自动重复不重启动作。按下压缩、松开拉伸和小鸟响应增强；浮显高度保留，文字气泡与其对齐并向左移动。

开发和构建方法见 README。具体改动与验证见 `refinement-0.3.1.md`；Windows 文件在 `deliveries/20261016-windows-0.3.1`，恢复点见 `handoff.json`。用户仍需视觉评价新眼睛，不能把 SDK 通过视为美术接受。0.3.1 没有新做物理长按、安装和游戏内验收，详见验收 JSON。
