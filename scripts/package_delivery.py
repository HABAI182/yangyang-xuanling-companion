"""Archive a tested Windows build and its matching real Cubism source files."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def copy_unchanged(source, destination):
    if destination.exists():
        if digest(source) != digest(destination):
            raise RuntimeError(f"Existing delivery differs; choose a new directory: {destination}")
        return  # A running, identical EXE must not be opened for writing.
    shutil.copy2(source, destination)
    assert digest(source) == digest(destination)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, required=True)
    parser.add_argument("--installer", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--validation", type=Path)
    parser.add_argument("--source-ref", default="HEAD")
    args = parser.parse_args()
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    config = json.loads((ROOT / "public/assets/model-config.json").read_text(encoding="utf-8"))
    revision = Path(config["entry"]).parent.name.rsplit("-", 1)[-1]
    assert revision.startswith("v") and revision[1:].isdigit(), revision
    validation = args.validation or ROOT / f"docs/validation-{version}.json"
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    copy_unchanged(args.exe, out / "秧秧玄翎.exe")
    copy_unchanged(args.installer, out / args.installer.name)
    source_files = [
        ROOT / f"art/source/YangyangXuanling-{revision}-rig.cmo3",
        ROOT / f"art/source/YangyangXuanling-Separated-{revision}.psd",
        ROOT / f"art/source/layers-{revision}.json",
        ROOT / "public/assets/model-config.json",
        ROOT / "docs/MODEL-HANDOFF.md",
        ROOT / "docs/art-refinement-v7.json",
        ROOT / "docs/hidden-devices-v9.json",
        ROOT / "docs/palms-eyes-v10.json",
        ROOT / "docs/eye-masks-v11.json",
        ROOT / "docs/detail-patches-v12.json",
        ROOT / "art/source/YangyangXuanling-Details-v12.psd",
        ROOT / "art/source/YangyangXuanling-Details-v13.psd",
        ROOT / "art/source/closed-lids-ai-v8.png",
        ROOT / "docs/closed-eyes-v13.json",
        ROOT / "scripts/build_closed_eyes_v13.py",
        ROOT / f"docs/refinement-{version}.md",
        ROOT / "LICENSE.txt",
        ROOT / "LICENSE-CHANG-LI-MIT.txt",
        ROOT / "THIRD-PARTY-NOTICES.md",
        ROOT / "docs/changli-parity.md",
    ]
    source_files += sorted((ROOT / "public/assets/detail-v12").rglob("*"))
    source_files += sorted((ROOT / "public/assets/detail-v13").rglob("*"))
    source_files += sorted((ROOT / "public/assets/ui").rglob("*"))
    source_files += sorted((ROOT / "src").rglob("*"))
    source_files += sorted((ROOT / "src-tauri/src").rglob("*.rs"))
    source_files += sorted((ROOT / f"public/models/yangyang-{revision}").rglob("*"))
    source_files += sorted((ROOT / f"public/assets/{revision}").rglob("*"))
    source_files += sorted((ROOT / "public/vendor/live2d").glob("*LICENSE*"))
    source_files = [p for p in source_files if p.is_file()]
    archive = out / f"秧秧玄翎-模型源文件-{version}.zip"
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED) as bundle:
        for p in source_files:
            bundle.write(p, p.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        for p in source_files:
            assert hashlib.sha256(bundle.read(p.relative_to(ROOT).as_posix())).hexdigest() == digest(p)
    readme = f"""秧秧玄翎 {version} / Windows x64 精修预览

双击“秧秧玄翎.exe”运行；setup 为安装程序。右键角色或点击托盘打开互动菜单。
底部六点按钮拖动，星形按钮互动，齿轮进入设置。Ctrl + Alt + Y 找回桌宠。
画面左手控制鼠标，右手操作键盘四区和独立Space；长按保持，不重复弹头。

本版改动：
- 眼睛幅度默认210%，可调50%–320%；保持低饱和灰蓝瞳色和原生眼白剪贴遮罩。
- 外观设置中可开关“鼠标静止后视线回正”，等待1–15秒，默认3秒；平滑回正后，移动或点击重新跟随。
- 鼠标在角色外移动也算活动；回正不会带动独立鼠标和手掌。
- 可见角色轮廓接收点击，透明洞与下方留白自动穿透；三个工具按钮保留，拖动过程中保持鼠标捕获。
- 桌面设置中的“整只桌宠鼠标穿透”会让角色和按钮也穿透，可从托盘关闭或使用找回快捷键。
- 困倦、大笑和单眼闭合补片盖住完整原睁眼轮廓；Q版描边符号加大。
- 文字泡和按键框使用相同的加粗雾蓝边框、羽毛金花红绳装饰，大小仍可独立调节；高度保持原位置。
- 互动菜单随内容收高，展开“更多情绪”才增加高度；17种情绪、3段动作及原功能保留。

原生模型仍为v11，CMO3和MOC3未修改。Details-v13.psd及SDK网格附着闭眼/口形补片、
矢量情绪、二维视线和弹性为运行时效果，不冒充新原生绑定。闭眼仍是开闭图层切换。
静止中性画面保留原图比例与颜色，旧版交付保留。现有用户设置仅按本次要求更新视线相关值。

模型源文件ZIP保留项目内目录，包含真实CMO3、分层PSD、官方模型与运行时源码。
完整可构建工程在私有GitHub仓库。查看docs/MODEL-HANDOFF.md、manifest.json和SHA256SUMS.txt。
验收范围以manifest.json内verification为准；本次Windows穿透测试为本机合成输入，非用户物理输入记录。
安装流程、游戏/手柄、UAC兼容重启、登录启动和完整多屏DPI未重新验收。
本交付仅供用户私有开发测试，未公开发布。
"""
    (out / "使用说明.txt").write_text(readme, encoding="utf-8")
    checks = json.loads(validation.read_text(encoding="utf-8"))
    manifest = {
        "date": checks["date"], "version": version, "stage": "refinement-preview",
        "repository": "https://github.com/HABAI182/yangyang-xuanling-companion",
        "sourceCommit": subprocess.check_output(["git", "rev-parse", f"{args.source_ref}^{{commit}}"], cwd=ROOT, text=True).strip(),
        "sourceRef": args.source_ref,
        "packagingCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "palette": "v4-muted-gray-blue", "rig": f"{revision}-native-sclera-masks-complete-irises", "runtimeEffectsSeparateFromCmo": True, "verification": checks,
        "modelFiles": {p.relative_to(ROOT).as_posix(): digest(p) for p in source_files},
        "deliverables": {p.name: {"bytes": p.stat().st_size, "sha256": digest(p)} for p in sorted(out.iterdir()) if p.is_file()},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    files = sorted(p for p in out.iterdir() if p.is_file() and p.name != "SHA256SUMS.txt")
    (out / "SHA256SUMS.txt").write_text("\n".join(f"{digest(p)}  {p.name}" for p in files) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(out), "files": len(files) + 1, "sourceCommit": manifest["sourceCommit"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
