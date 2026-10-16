# 软件与素材来源

本轮功能以 [HABAI182/changli-companion](https://github.com/HABAI182/changli-companion) 0.7.15 / `c083f86e42de83430f451e1d02973f7ba987e771` 为对照，参考其临时按键浮显、桌面可见性、工作区布局、设置分类及独立全屏验收窗口设计。相关原创程序采用 MIT 许可，完整声明见 `LICENSE-CHANG-LI-MIT.txt`。没有复制长离角色图像、模型、语音或个人数据库；长离工程与既有发行保持原样。

秧秧使用本项目 v11 模型和灰蓝瞳色，画面左手鼠标、右手键盘。运行时情绪装饰与微动作属于程序效果，未写入 CMO3/MOC3。

Live2D Core / Framework 保留原供应商许可，位于 `public/vendor/live2d` 与 `vendor/live2d`。Tauri、serde、windows-sys 按各自 MIT/Apache-2.0 许可使用，Vite 使用 MIT、TypeScript 使用 Apache-2.0。没有添加下载式更新器或外部输入数据传输。

0.3.3 对照同一长离提交中的 `FaceEffects.ts`、`UnderpaintMesh.ts`，参考完整局部底层覆盖、附着原生三角形及描边符号的处理原则。闭眼素材来自本项目已冻结的 `closed-lids-ai-v8.png`，Q版矢量符号与羽毛金花装饰为本次编写；没有复制长离的美术。Windows穿透按微软层叠窗口机制实现，参考 [Layered Windows](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features#layered-windows)。
