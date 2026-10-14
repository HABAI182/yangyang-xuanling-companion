# 官方瞳色局部修正

用户于 2026-10-14 指出瞳色太蓝，要求参考官方。参考来自库洛官方网站的 [秧秧·玄翎档案](https://wutheringwaves.kurogames.com/en/main/news/detail/5007)，原生页面脚本引用的公开 article/5007.json 指向项目 `art/references/official-profile-5007-1.png`。没有以普通秧秧或其他角色替代。

美术观察：虹膜上半偏灰蓝，下半浅青，瞳孔下缘淡金色。这里是对官方图的配色解读，不是官方公布的十六进制色值规范。用本地可重跑的原像素色彩映射，仅修改两眼虹膜中的蓝色像素。保留眼形、白色高光、睫毛、皮肤、头发、服饰、手、键鼠和配角。输出尺寸与透明度保持原样，没有整图重绘。

检查 `iris-correction-v3.json`：20540 个虹膜色彩像素变化；虹膜掩码外变化 0；透明度变化 0。`pixel-preservation-v3.json` 的静止合成检查是相对修正后的 v3 输入，不能误读为 v3 虹膜与 v2 相同。10 层 PSD 已导入真正的 Cubism Editor 5.3.04，绑定和正式导出仍需继续。

原始 v2 PNG、PSD 和首次保存的 CMO3 均保留，可以回退。程序预览的 `public/assets/layers.json` 当前指向 v3；预览裁片不能冒充完成的 Live2D 模型。
