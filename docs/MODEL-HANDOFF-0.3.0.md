# 秧秧玄翎 0.3.0 模型与运行时交接

2026-10-16。当前可编辑源 `art/source/YangyangXuanling-v10-rig.cmo3`；分层源 `art/source/YangyangXuanling-Separated-v10.psd`；官方导出入口 `public/models/yangyang-v10/YangyangXuanling.model3.json`。1536×1360，13个独立ArtMesh，4096×2048贴图。保留原图比例与v4灰蓝瞳色。

源CMO3 SHA256：`28d9ae9bf9f2050569fc242e5f42462e21182ccaed70eca9504d01c8df19367b`。

MOC3 SHA256：`2f9b253711c608d74d4ee6868298668829dd196961521c3455039695add7a83a`。

贴图 SHA256：`9d15c30627e8bb77e3f5053e5e739befb15dbf1b74918b78ee7ae578e0245ca1`。

## 源模型中已有的绑定

| 语义 | 网格ID | 参数/内容 |
| --- | --- | --- |
| 屏幕右键盘手掌 | ArtMesh | ParamBodyAngleX -10/0/10，正向按下 |
| 屏幕左鼠标手掌 | ArtMesh0 | ParamBodyAngleY -10/0/10，正向按下 |
| 袖根 | ArtMesh1 | 独立透明裁片；只保留衣料和毛边，脸与头发属于固定头层 |
| 双闭眼皮肤补片 | ArtMesh3 / ArtMesh2 | 完整隐藏皮肤和连续细弧；EyeLOpen/ROpen 0时显示 |
| 双虹膜 | ArtMesh5 / ArtMesh4 | 原始可见RGB与隐藏周边补全，EyeLOpen/ROpen透明度；EyeBallX -1/0/1横向几何键 |
| 双眼底 | ArtMesh7 / ArtMesh6 | EyeLOpen/ROpen 1时显示，绘制顺序501，固定眼眶遮住移动瞳孔边界 |
| 头身 / 玄翎雀 | ArtMesh8 / bird | 原生分层，运行时运动 |
| 设备 | keyboard / mouse | 完整遮挡底层，键盘静止 |

其余标准参数可能仍存在但没有几何绑定，不将创建参数说成制作完成。眨眼为独立开眼/闭眼图层切换，没有连续眼皮几何闭合；尚无独立口形与发丝物理。

## 运行时中的效果

`src/cubism.ts` 加载官方Core/Framework，设置原生手掌、眨眼及水平视线参数；`src/model-motion.ts` 在每帧Core输出上执行有界顶点变形，下帧精确恢复，不修改CMO3/MOC3。

- 单手四个物理键区与独立Space，左右镜像和前后映射位于 `src/key-target.mjs` / `src-tauri/src/key_target.rs`。Space松开回当前仍按住的键；短按不丢失，系统重复不重新弹头。
- 袖口以肩侧锚定的连续线性权重随手掌伸出；脸与头发不进入移动袖口。角色右手/屏幕左手与鼠标共享23px横向、10px纵向源图范围。
- 精确阻尼弹簧提供按压、快速跨区、头部压缩与回弹；冲量有界，长按会稳定，桌边袖根减弱头部弹动。
- 水平视线为原生几何键，垂直视线为独立瞳孔顶点位移，均经过阻尼平滑。关闭鼠标按压反馈不关闭视线。
- 小鸟独立呼吸、跳跃、倾斜和尾部波动，也能由互动菜单触发；部分眼形和瞳孔缩放为运行时表情。17种情绪仍有SVG装饰，不宣称17套原生脸部绑定。

## 图像与来源边界

`scripts/refine_layers_v7.py` 保留原像素拆层，只在旧遮挡下使用冻结的AI补绘。外缘纸白清理5698像素，左发尖66个可见像素；全部未授权RGBA差异为0。`build_closed_lids_v8.py` 只提取两条新闭眼墨线；`refine_hidden_v9.py` 仅补完整键盘/鼠标原遮挡内像素，静止合成与v8相同。源布局、提示词、PNG和报告均保留。

v10 进一步重抠双掌，修复粗遮罩漏掉的原手掌红色外轮廓；从角色左袖排除蓝白头发和脸部碎片。用户红圈的飘带/发环间隙清为透明，白色发梢和羽饰保留。仅在明确掌部、眼部、袖口与间隙遮罩内修补，未授权RGBA差异0，见 `palms-eyes-v10.json`。原生贴图100%不旋转、48px间距，重叠检查无选中项。

## 验证与恢复

最终源通过Cubism 5.4.00 alpha2保存、关闭并从磁盘重开；新UID `8facf3ade83c41f191f2e5ba258bed3b`。官方导出 `ui-b5a258f32abc4cb3aef8a6c837ed84dd`；官方Core/WebGL `runtime-e535e19969a74703a711fff80f2852e4` 全部用例通过。最终SDK和浏览器证据见 `docs/evidence/runtime-v10` / `refinement-browser-v10`；Windows与物理输入的精确结果见 `validation-0.3.0.json`。

旧0.2.0模型说明完整保存在 `MODEL-HANDOFF-0.2.0.md`。本地v7/v8施工源保留但不重复上传大二进制；Git保留旧v6和当前v10以恢复。新交付与旧交付独立，不移动历史标签。仓库保持Private，未创建公开Release。
