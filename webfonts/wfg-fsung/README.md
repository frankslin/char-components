# WFG FSung Webfonts

Chunked woff2 webfonts for 全宋體 (WFG FSung), the private-use-area-supplemented
Song-style font maintained by the author of [部件檢索](https://fgwang.blogspot.com/2015/12/blog-post_30.html).
See [`../../doc/04-開發理解與重構指引.md`](../../doc/04-開發理解與重構指引.md) section 5 for why this
project depends on this specific font rather than any generic CJK font or
the official Taiwan CNS11643「全字庫正宋體」.

**⚠️ Non-commercial use only.** Unlike the other `@free-fonts/*` packages in the
sibling `free-fonts` repository (which use permissive OFL/MIT/CC0 licenses), 全宋體 is
shared by its author for academic, educational, and personal use only —
commercial use of any kind is explicitly prohibited. See [`LICENSE`](./LICENSE)
for the full terms. This package is intentionally **not published to npm**
and **not listed** in `free-fonts`' README/index.html.

```html
<link rel="stylesheet" href="./wfg-fsung.css">
```

```css
body {
  font-family: 'WFG FSung', serif;
}
```

The CSS uses 256-codepoint `unicode-range` chunks (same convention as
`jigmo-webfonts` / `free-fonts`), so browsers only download the blocks a
page actually needs.

## Source composition

全宋體 is distributed by its author as seven whole TTF files (see
`../../deps/fonts/`). This package combines six of them into one CSS family,
first-seen (priority-order) deduplicated for the small set of Basic Latin
codepoints every shard happens to carry, with a superset check so no
codepoint is silently dropped:

| Source file | Codepoints contributed | Notes |
|---|---:|---|
| `FSung-2.ttf` | highest priority for shared ASCII | |
| `FSung-m.ttf` | | superset-owns the Basic Latin chunk (U+0000–00FF) |
| `FSung-3.ttf` | | |
| `FSung-F.ttf` | largest shard | |
| `FSung-X.ttf` | | |
| `FSung-1.ttf` | | |
| `FSung-p.ttf` | **excluded** | cmap is an exact duplicate of `FSung-m` (both 40,582 codepoints) and it is not referenced by `部件檢索.htm`'s own CSS `font-family` stack |

Regenerate from source with:

```sh
python3 ../build-wfg-fsung.py
```

The script documents the chunk-assignment algorithm (including the one
Basic Latin chunk that needed a "does one source's coverage superset the
union?" check rather than plain first-seen dedup — see its module
docstring and `assign_chunks()`).

- Upstream: https://fgwang.blogspot.com/2025/09/unicode-17.html
- Upstream version: 2025/09/24 build (matches `部件檢索.htm` core version `0.9.8.4` in this repo)
- Upstream font license: non-commercial share only — see [`LICENSE`](./LICENSE)
- Package scripts and metadata: same license as the rest of this repo (non-commercial, per [`../../LICENSE`](../../LICENSE))
