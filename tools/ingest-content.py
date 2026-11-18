"""ingest-content.py - turn the raw content folder into site-ready assets.

    python tools/ingest-content.py

Reads  D:/profile/新建文件夹  (read-only, never modified)
Writes public/content/**            web-optimised webp + a few small pdfs
       src/content/media.generated.ts   typed, ready-to-render data

Rules
  - nothing is invented: every caption/description stays CONTENT_PENDING
  - very large source images are downscaled (long edge <= 2200, hero <= 2600)
  - huge pdfs (> 8 MB) are skipped and reported
  - the research codebase is not copied: only its poster and report are assets
"""

import json
import pathlib
import re
import sys

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True
Image.MAX_IMAGE_PIXELS = 400_000_000

SRC = pathlib.Path(r"D:\profile\新建文件夹")
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "content"
GEN = ROOT / "src" / "content" / "media.generated.ts"

MAX_EDGE = 2200
HERO_MAX_EDGE = 2600
QUALITY = 82
PDF_LIMIT = 8 * 1024 * 1024

ARCH = [
    ("alumni-hall", 'architecture/东南大学中大校友会堂“净零碳 ”改造'),
    ("diaoyutai", "architecture/钓鱼台城市研究"),
]

# ---- classification -------------------------------------------------------
DRAWING = re.compile(r"流线|剖透视|平面|策划表|底图")
ANALYSIS = re.compile(
    r"焓湿|风玫瑰|温湿度|日照|照度|采光|风速风向|气候|环境建筑分析|碳|机理图|分析|表\d|^红|^蓝"
)
SKIP = re.compile(r"^logo\.png$", re.IGNORECASE)


def role_of(name: str) -> str:
    if SKIP.search(name):
        return "skip"
    if name.lower().endswith(".pdf"):
        return "pdf"
    if DRAWING.search(name):
        return "drawings"
    if ANALYSIS.search(name):
        return "analysis"
    return "renders"


def slug(text: str, fallback: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or fallback


def convert(src: pathlib.Path, dst: pathlib.Path, max_edge: int) -> tuple[int, int, int]:
    with Image.open(src) as im:
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        w, h = im.size
        scale = min(1.0, max_edge / max(w, h))
        if scale < 1.0:
            im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "WEBP", quality=QUALITY, method=6)
        return im.width, im.height, dst.stat().st_size


def main() -> int:
    if not SRC.is_dir():
        print(f"source folder missing: {SRC}")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)

    report = {"converted": 0, "skipped": [], "bytes_out": 0}
    projects = []

    for pid, folder in ARCH:
        files = sorted(p for p in (SRC / folder).rglob("*") if p.is_file())
        buckets = {"renders": [], "analysis": [], "drawings": [], "pdf": [], "skip": []}
        for f in files:
            buckets[role_of(f.name)].append(f)

        # hero: the widest landscape render that is not a tiny table
        # A portfolio hero should read as a building shot: prefer names that say
        # so, then the largest wide image. Interior snapshots are demoted.
        HERO_NAME = re.compile(r"场景|渲染|透视|鸟瞰|外观|宏观")
        DEMOTE = re.compile(r"微信图片|建筑学长|logo|表")

        def hero_score(f: pathlib.Path) -> float:
            try:
                with Image.open(f) as im:
                    r = im.width / im.height
                    if r < 1.3 or r > 2.8:
                        return -1
                    score = im.width * im.height
                    if HERO_NAME.search(f.name):
                        score *= 3
                    if DEMOTE.search(f.name):
                        score *= 0.15
                    return score
            except Exception:
                return -1

        hero = max(buckets["renders"] or files, key=hero_score)
        groups = {}
        title = "Alumni Hall" if pid == "alumni-hall" else "Diaoyutai Urban Study"
        project_title = '东南大学中大校友会堂“净零碳”改造' if pid == "alumni-hall" else "钓鱼台城市研究"

        for group in ("renders", "analysis", "drawings"):
            picked = [f for f in buckets[group] if f != hero][:9]
            items = []
            for i, f in enumerate(picked, 1):
                dst = OUT / "architecture" / pid / group / f"{i:02d}.webp"
                w, h, size = convert(f, dst, MAX_EDGE)
                report["converted"] += 1
                report["bytes_out"] += size
                items.append({"src": f"/content/architecture/{pid}/{group}/{i:02d}.webp",
                              "w": w, "h": h, "source": f.name})
            groups[group] = items

        hero_dst = OUT / "architecture" / pid / "hero.webp"
        hw, hh, hs = convert(hero, hero_dst, HERO_MAX_EDGE)
        report["converted"] += 1
        report["bytes_out"] += hs

        # legend sheets (红/蓝) and numbered fragments are not portfolio documents
        KEEP_DOC = re.compile(r"一层|二层|三层|策划表")
        docs = []
        for f in [x for x in buckets["pdf"] if KEEP_DOC.search(x.stem)]:
            if f.stat().st_size > PDF_LIMIT:
                report["skipped"].append(f"{f.name} ({f.stat().st_size/1048576:.0f} MB pdf)")
                continue
            dst = OUT / "architecture" / pid / "documents" / f.name
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(f.read_bytes())
            report["bytes_out"] += dst.stat().st_size
            docs.append({"src": f"/content/architecture/{pid}/documents/{f.name}", "label": f.stem})

        projects.append({
            "id": pid,
            "title": project_title,
            "hero": {"src": f"/content/architecture/{pid}/hero.webp", "w": hw, "h": hh, "source": hero.name},
            "groups": groups,
            "documents": docs,
        })

    # ---- travel ------------------------------------------------------------
    travel = []
    for i, f in enumerate(sorted((SRC / "travel").glob("*.*")), 1):
        dst = OUT / "travel" / f"{i:02d}.webp"
        w, h, size = convert(f, dst, MAX_EDGE)
        report["converted"] += 1
        report["bytes_out"] += size
        travel.append({"src": f"/content/travel/{i:02d}.webp", "w": w, "h": h, "source": f.name})

    # ---- about -------------------------------------------------------------
    avatar_src = SRC / "about" / "头像.png"
    avatar = None
    if avatar_src.is_file():
        with Image.open(avatar_src) as im:
            im = im.convert("RGB")
            side = min(im.size)
            im = im.crop(((im.width - side) // 2, (im.height - side) // 2,
                          (im.width + side) // 2, (im.height + side) // 2))
            im = im.resize((640, 640), Image.LANCZOS)
            dst = OUT / "avatar.webp"
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst, "WEBP", quality=88, method=6)
            report["converted"] += 1
            report["bytes_out"] += dst.stat().st_size
            avatar = "/content/avatar.webp"

    # ---- research ----------------------------------------------------------
    research = {}
    poster_src = SRC / "research" / "展板.jpg"
    if poster_src.is_file():
        dst = OUT / "research" / "poster.webp"
        w, h, size = convert(poster_src, dst, HERO_MAX_EDGE)
        report["converted"] += 1
        report["bytes_out"] += size
        research["poster"] = {"src": "/content/research/poster.webp", "w": w, "h": h}
    report_src = SRC / "research" / "结题报告.pdf"
    if report_src.is_file() and report_src.stat().st_size <= PDF_LIMIT:
        dst = OUT / "research" / "jiangnan-report.pdf"
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(report_src.read_bytes())
        report["bytes_out"] += dst.stat().st_size
        research["report"] = {"src": "/content/research/jiangnan-report.pdf", "label": "结题报告"}

    # ---- emit typed data ---------------------------------------------------
    def ts_items(items):
        return ",\n".join(
            f"    {{ src: '{it['src']}', width: {it.get('w', 0)}, height: {it.get('h', 0)}, source: {json.dumps(it.get('source', ''), ensure_ascii=False)} }}"
            for it in items
        )

    lines = [
        "/* AUTO-GENERATED by tools/ingest-content.py - do not edit by hand.",
        "   Source: D:/profile/新建文件夹 (read-only). Re-run the script to refresh. */",
        "",
        "export interface IngestedMedia {",
        "  src: string;",
        "  width: number;",
        "  height: number;",
        "  /** original file name, kept for traceability */",
        "  source: string;",
        "}",
        "",
        f"export const avatar = {json.dumps(avatar)};",
        "",
        "export const architectureProjects = [",
    ]
    for p in projects:
        lines.append("  {")
        lines.append(f"    id: {json.dumps(p['id'])},")
        lines.append(f"    title: {json.dumps(p['title'], ensure_ascii=False)},")
        lines.append(f"    hero: {{ src: '{p['hero']['src']}', width: {p['hero']['w']}, height: {p['hero']['h']}, source: {json.dumps(p['hero']['source'], ensure_ascii=False)} }},")
        for group in ("renders", "analysis", "drawings"):
            lines.append(f"    {group}: [")
            if p["groups"][group]:
                lines.append(ts_items(p["groups"][group]) + ",")
            lines.append("    ],")
        lines.append("    documents: [")
        for d in p["documents"]:
            lines.append(f"      {{ src: '{d['src']}', label: {json.dumps(d['label'], ensure_ascii=False)} }},")
        lines.append("    ],")
        lines.append("  },")
    lines.append("] as const;")
    lines.append("")
    lines.append("export const travelPhotos: IngestedMedia[] = [")
    if travel:
        lines.append(ts_items(travel) + ",")
    lines.append("];")
    lines.append("")
    lines.append("export const researchMedia = {")
    if "poster" in research:
        p = research["poster"]
        lines.append(f"  poster: {{ src: '{p['src']}', width: {p['w']}, height: {p['h']} }},")
    else:
        lines.append("  poster: null,")
    if "report" in research:
        r = research["report"]
        lines.append(f"  report: {{ src: '{r['src']}', label: {json.dumps(r['label'], ensure_ascii=False)} }},")
    else:
        lines.append("  report: null,")
    lines.append("} as const;")
    lines.append("")
    GEN.write_text("\n".join(lines), encoding="utf-8")

    print(f"converted {report['converted']} images -> {report['bytes_out']/1048576:.1f} MB")
    for pid, folder in ARCH:
        print(f"  {pid}: hero + groups written")
    print(f"  travel: {len(travel)} photos")
    print(f"  avatar: {'yes' if avatar else 'no'}")
    print(f"  research: poster={'yes' if 'poster' in research else 'no'} report={'yes' if 'report' in research else 'no'}")
    if report["skipped"]:
        print("skipped (too large):")
        for s in report["skipped"]:
            print("  -", s)
    print(f"wrote {GEN.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
