# 秧秧玄翎 0.3.2 模型交接

原生入口 `/models/yangyang-v11/YangyangXuanling.model3.json` 对应真实 `art/source/YangyangXuanling-v11-rig.cmo3` 和 `art/source/YangyangXuanling-Separated-v11.psd`。原生保存、重开、导出及SDK证据在 `native-eye-v11.json`、`validation-0.3.1.json`。0.3.2未修改这些原生文件。

13个原生网格与ID保留，双虹膜使用眼白原生剪贴遮罩，原生手部按压与开闭眼保留。画面左手鼠标、右手键盘；四键区加Space、二维视线、弹簧及小鸟由运行时驱动。

0.3.2补齐左发梢直切轮廓，左右各24像素透明余量，重合的中性源图像素不变；默认视线幅度165%，设置可调50–250%。文字泡/按键框同一高度、分别缩放，按键默认130%。

右键菜单17种表情加入不同嘴形、局部眼睑/睫毛形变、单侧闭眼及泪光。新增补充素材为 `art/source/YangyangXuanling-Details-v12.psd`；它未导入原生CMO3。`public/assets/detail-v12`、`src/mesh-details.ts`、`src/face-art.ts` 与 `src/face-pose.mjs` 必须随工程保留，发梢和嘴部补片通过缓存的重心坐标附着真实原生头部三角形。连续眼皮闭合及完整原生口形参数仍未制作。

本版交付在 `deliveries/20261016-windows-0.3.2`，源码恢复点 `v0.3.2`；旧版保留。详见 `refinement-0.3.2.md` 和 `validation-0.3.2.json`。本版单元、真实WebGL、像素遮罩、Windows打包程序和用户观感分别记录，不将程序检查称为美术接受。键鼠钩子未改动，不把旧版物理长按验收冒充本轮新测试。
