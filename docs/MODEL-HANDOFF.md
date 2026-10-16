# 秧秧玄翎 0.3.3 模型交接

真实原生入口仍为 `/models/yangyang-v11/YangyangXuanling.model3.json`，CMO3为 `art/source/YangyangXuanling-v11-rig.cmo3`，原生分层PSD为 `YangyangXuanling-Separated-v11.psd`。本轮没有重新导入或导出Cubism；CMO3、MOC3和图集哈希不变。此前保存重开和官方导出证据见 `native-eye-v11.json`。

0.3.3以本项目冻结的v8闭眼补绘，在明确的局部眼区掩码内覆盖旧睁眼轮廓及眼角。掩码外RGB变化0，alpha变化0，中性源文件哈希不变。新增 `art/source/YangyangXuanling-Details-v13.psd` 和 `public/assets/detail-v13`，包含延续的v12发梢、嘴部及本轮闭眼补片；通过缓存重心坐标跟随真实原生头部三角形。它们是可编辑运行时补充素材，不是新CMO3。连续眼皮几何、完整原生口形和独立发丝物理仍未制作。

Q版情绪符号在 `src/emotion-badges.ts`，嘴形仍在 `src/face-art.ts`。按键与文字框共享 `public/assets/ui/xuanling-crest.svg` 和CSS装饰，顶端位置均保持20%，各自可缩放。互动菜单使用实际DOM高度，经仅限菜单自身的原生命令调整窗口。

视线默认210%、上限320%，原生眼白遮罩继续裁剪虹膜。`src/gaze-controller.mjs`提供1–15秒静止后回正，默认3秒，随后850ms平滑过渡；实际鼠标移动或点击恢复，原始指针独立驱动鼠标/手掌。

`src/hit-testing.ts`在当前渲染帧之后每65ms采样一次alpha轮廓，以不超过480列的行程编码送本机原生端，不发送色彩。`src-tauri/src/hit_test.rs`只保留最新轮廓，原生8ms输入循环决定鼠标穿透；无图像保存或联网。主体、细发边缘约一个采样点容差和三个工具按钮保留点击，透明内孔、下方留白穿透。按住鼠标或拖动时保持捕获，整只穿透优先。

本版交付 `deliveries/20261017-windows-0.3.3`，源码恢复点 `v0.3.3`；验收见 `validation-0.3.3.json`，效果见 `art/mood-review-0.3.3.png`。本轮Windows点击测试为合成输入，不冒充用户物理输入或游戏验收。
