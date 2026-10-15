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
    if destination.exists() and digest(source) != digest(destination):
        raise RuntimeError(f"Existing delivery differs; choose a new directory: {destination}")
    shutil.copy2(source, destination)
    assert digest(source) == digest(destination)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, required=True)
    parser.add_argument("--installer", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    copy_unchanged(args.exe, out / "秧秧玄翎.exe")
    copy_unchanged(args.installer, out / args.installer.name)
    source_files = [
        ROOT / "art/source/YangyangXuanling-v5-rig.cmo3",
        ROOT / "art/source/YangyangXuanling-OfficialIris-v4.psd",
        ROOT / "public/assets/model-config.json",
        ROOT / "docs/MODEL-HANDOFF.md",
        ROOT / "LICENSE.txt",
    ]
    source_files += sorted((ROOT / "public/models/yangyang-v5").rglob("*"))
    source_files += sorted((ROOT / "public/vendor/live2d").glob("*LICENSE*"))
    source_files = [p for p in source_files if p.is_file()]
    archive = out / "秧秧玄翎-模型源文件-v5.zip"
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED) as bundle:
        for p in source_files:
            bundle.write(p, p.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        for p in source_files:
            assert hashlib.sha256(bundle.read(p.relative_to(ROOT).as_posix())).hexdigest() == digest(p)
    readme = """秧秧玄翎 0.1.0 / Windows x64 基础预览

双击“秧秧玄翎.exe”即可运行；带 setup 的文件为安装程序。
右键桌宠或点击托盘打开设置，拖动手柄移动，托盘菜单可退出。
默认大小420、按键显示开、置顶开、鼠标穿透关、自动眨眼开。

本版已有真实 Cubism 模型、左右手独立按压和短眨眼。
文件/Core/WebGL/浏览器检查通过；Windows 原生可见渲染、鼠标、设置保存恢复已检查。
真实物理键盘、托盘全部路径、穿透恢复热键与安装流程尚待实测。
有少量透明白边及闭眼肤色接缝；发丝物理、转头和小鸟独立动作未制作。

模型源文件压缩包保留项目内目录结构，包含真实 CMO3、分层 PSD 和官方 model3/MOC3/贴图。
展开后参阅 docs/MODEL-HANDOFF.md；manifest.json 和 SHA256SUMS.txt 可用于核对版本。
本交付供用户私有开发测试，未公开发布。
"""
    (out / "使用说明.txt").write_text(readme, encoding="utf-8")
    checks = json.loads((ROOT / "docs/validation-20261015.json").read_text(encoding="utf-8"))
    manifest = {
        "date": "2026-10-15", "version": "0.1.0", "stage": "basic-preview",
        "repository": "https://github.com/HABAI182/yangyang-xuanling-companion",
        "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "palette": "v4-muted-gray-blue", "rig": "v5", "verification": checks,
        "modelFiles": {p.relative_to(ROOT).as_posix(): digest(p) for p in source_files},
        "deliverables": {p.name: {"bytes": p.stat().st_size, "sha256": digest(p)} for p in sorted(out.iterdir()) if p.is_file()},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    files = sorted(p for p in out.iterdir() if p.is_file() and p.name != "SHA256SUMS.txt")
    (out / "SHA256SUMS.txt").write_text("\n".join(f"{digest(p)}  {p.name}" for p in files) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(out), "files": len(files) + 1, "sourceCommit": manifest["sourceCommit"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
