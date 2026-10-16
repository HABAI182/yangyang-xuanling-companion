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
    parser.add_argument("--validation", type=Path, default=ROOT / "docs/validation-0.3.0.json")
    parser.add_argument("--source-ref", default="HEAD")
    args = parser.parse_args()
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    copy_unchanged(args.exe, out / "秧秧玄翎.exe")
    copy_unchanged(args.installer, out / args.installer.name)
    source_files = [
        ROOT / "art/source/YangyangXuanling-v10-rig.cmo3",
        ROOT / "art/source/YangyangXuanling-Separated-v10.psd",
        ROOT / "art/source/layers-v10.json",
        ROOT / "public/assets/model-config.json",
        ROOT / "docs/MODEL-HANDOFF.md",
        ROOT / "docs/art-refinement-v7.json",
        ROOT / "docs/hidden-devices-v9.json",
        ROOT / "docs/palms-eyes-v10.json",
        ROOT / "docs/refinement-0.3.0.md",
        ROOT / "LICENSE.txt",
        ROOT / "LICENSE-CHANG-LI-MIT.txt",
        ROOT / "THIRD-PARTY-NOTICES.md",
        ROOT / "docs/changli-parity.md",
    ]
    source_files += sorted((ROOT / "src").rglob("*"))
    source_files += sorted((ROOT / "src-tauri/src").rglob("*.rs"))
    source_files += sorted((ROOT / "public/models/yangyang-v10").rglob("*"))
    source_files += sorted((ROOT / "public/assets/v10").rglob("*"))
    source_files += sorted((ROOT / "public/vendor/live2d").glob("*LICENSE*"))
    source_files = [p for p in source_files if p.is_file()]
    archive = out / "秧秧玄翎-模型源文件-v10.zip"
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED) as bundle:
        for p in source_files:
            bundle.write(p, p.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        for p in source_files:
            assert hashlib.sha256(bundle.read(p.relative_to(ROOT).as_posix())).hexdigest() == digest(p)
    readme = f"""秧秧玄翎 {version} / Windows x64 精修预览

双击“秧秧玄翎.exe”即可运行；带 setup 的文件为安装程序。
右键桌宠或点击托盘打开设置，拖动手柄移动，托盘菜单可退出。
默认大小420、按键显示开、置顶开、鼠标穿透关、自动眨眼开。
启动位于屏幕右下角，设置窗口会放在主体旁边；旧版已交付文件保留。

本版按长离0.7.15补齐设置和互动功能，保留画面左手鼠标、右手键盘。
右键或点击托盘打开独立互动菜单：17种情绪反馈、3段小动作与36条气泡。
设置分外观/互动/桌面/高级；支持主题、字号、动效、手速、1至6个浮显及长按重复开关。
桌面功能包括全屏避让及程序例外、磁吸、3个常用位置、靠近淡化、穿透与找回。
支持可编辑动作快捷键、手柄反馈、轻音、登录启动及高权限兼容手动重启。
本版重新拆出纯手掌、固定袖根和独立双瞳孔，清理外缘纸白，仅微修左发尖。
键盘四区加独立Space；鼠标和手掌有界联动；头部强弹簧、小鸟跳跃摆尾、二维视线持续跟随。
静止画面保留比例及低饱和灰蓝瞳色，未授权区域RGBA差异为零。
原生模型含双手按压、眨眼、水平视线绑定及连续闭眼线；二维伸手、垂直视线、弹性、
小鸟和部分眼形/情绪装饰属于SDK运行时效果，未冒充原生绑定。
实际Windows及物理输入验收范围以manifest.json中的verification为准。
连续眼皮几何闭合、独立口形和发丝物理尚未制作。
手柄实机、游戏输入、UAC兼容重启、Windows登录启动及安装流程未验收。

模型源文件压缩包保留项目内目录结构，包含真实CMO3、分层PSD、官方模型和运行时效果源码。
完整可构建工程及依赖锁文件在私有GitHub仓库。
展开后参阅 docs/MODEL-HANDOFF.md；manifest.json 和 SHA256SUMS.txt 可用于核对版本。
本交付供用户私有开发测试，未公开发布。
"""
    (out / "使用说明.txt").write_text(readme, encoding="utf-8")
    checks = json.loads(args.validation.read_text(encoding="utf-8"))
    manifest = {
        "date": "2026-10-16", "version": version, "stage": "refinement-preview",
        "repository": "https://github.com/HABAI182/yangyang-xuanling-companion",
        "sourceCommit": subprocess.check_output(["git", "rev-parse", f"{args.source_ref}^{{commit}}"], cwd=ROOT, text=True).strip(),
        "sourceRef": args.source_ref,
        "packagingCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "palette": "v4-muted-gray-blue", "rig": "v10-traced-palms-fixed-rims-clean-cuff", "runtimeEffectsSeparateFromCmo": True, "verification": checks,
        "modelFiles": {p.relative_to(ROOT).as_posix(): digest(p) for p in source_files},
        "deliverables": {p.name: {"bytes": p.stat().st_size, "sha256": digest(p)} for p in sorted(out.iterdir()) if p.is_file()},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    files = sorted(p for p in out.iterdir() if p.is_file() and p.name != "SHA256SUMS.txt")
    (out / "SHA256SUMS.txt").write_text("\n".join(f"{digest(p)}  {p.name}" for p in files) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(out), "files": len(files) + 1, "sourceCommit": manifest["sourceCommit"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
