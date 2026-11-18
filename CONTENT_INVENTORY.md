# CONTENT INVENTORY — what was ingested, what is still missing

Source: `D:/profile/新建文件夹` (read-only, 786 MB, 13,996 files).
Output: `public/content/**` (10.2 MB) + `src/content/media.generated.ts` (typed data).

## What is now on the site

| World | Assets | Where |
|---|---|---|
| **Architecture** | 2 projects, 2 heroes, 17 renders, 17 analysis diagrams, 3 drawings, 4 PDFs | `/architecture`, index + plate + detail sheet |
| **Travel** | 4 photographs (still hero + gallery) | `/travel` |
| **Research** | 1 poster + 1 report PDF | `/research` |
| **About** | 1 avatar (640 px, square) | `/about` |

Everything was downscaled to ≤2600 px (hero) / ≤2200 px (others), converted to WebP q82.
Two PDFs were **skipped for size**: `公共空间.pdf` (44 MB), `风貌品质.pdf` (29 MB).

## What is still CONTENT_PENDING — please supply

### Blocking (page looks unfinished without it)

| # | Item | Detail |
|---|---|---|
| 1 | **About text** | `about/about.txt` is **0 bytes**. Need: 2–3 sentence intro, background (education/practice), interests list, contact line |
| 2 | **Architecture project copy** | For each of the 2 projects: year, one-line description, site/location, programme + area, your role |
| 3 | **Travel context** | 4 photos with no place, date or caption. Need per-photo: place + year (+1 sentence if you want) |
| 4 | **Research copy** | Title, authors/venue/year, 2–3 sentence abstract; and a link if the KG platform is deployed |
| 5 | **Instagram** | URL + handle (the portal currently opens a "not supplied" note) |
| 6 | **Owner name + contact email** | Used in the header wordmark, footer and `/about` |

### Nice to have

| # | Item | Why |
|---|---|---|
| 7 | Travel film (mp4/webm, ≤30 s) | replaces the still hero; `VideoHero` is already wired |
| 8 | Project hero alternates | the auto-pick may not be the shot you want; say which file is the hero for each project |
| 9 | Compressed versions of the two big PDFs | if they must be downloadable |
| 10 | 1–2 sentences per architecture analysis group | the detail sheet currently lists diagrams unlabelled |
| 11 | Instagram/GitHub avatar + OG image (1200×630) | link previews |

## Notes on the automatic classification

- Files with 日照 / 照度 / 采光 / 风玫瑰 / 焓湿 / 风速 / 分析 / 表 → **analysis**
- 流线 / 剖透视 / 平面 / 策划表 / 底图 → **drawings**
- everything else (renders, photos, AI images) → **renders**
- `logo.png`, 红1-3 / 蓝1-3 legend sheets, 1–3.pdf fragments → **dropped**
- the research codebase (`Jiangnan-KG-Platform`, 13.9k files) is **not** copied — it is a
  web project, not an asset. Link it (live URL or GitHub repo) and it becomes a project entry.

If a diagram landed in the wrong group, the mapping lives in one place:
`tools/ingest-content.py` → `DRAWING` / `ANALYSIS` / `KEEP_DOC` regexes.

## Re-running

```bash
python tools/ingest-content.py   # re-reads the source folder, rewrites public/content + the TS data
npm run verify
```

The source folder is never modified.
