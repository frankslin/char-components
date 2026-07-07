# WFG FSung Webfonts

Chunked woff2 webfonts for 全宋體 (WFG FSung), a large private-use-area-supplemented
Song-style (宋體/明朝體) font covering over 200,000 Han characters, maintained by its
author WFG at https://fgwang.blogspot.com/2015/12/blog-post_30.html. It is **not**
the official Taiwan CNS11643「全字庫正宋體」— that is a separate, much smaller,
officially-standardized font; 全宋體 is an independent personal project that happens
to also cover the CNS-standard characters as a subset.

**⚠️ Non-commercial use only.** Unlike many permissively-licensed CJK webfont
packages (OFL/MIT/CC0), 全宋體 is shared by its author for academic, educational,
and personal use only — commercial use of any kind is explicitly prohibited.
See [`LICENSE`](./LICENSE) for the full terms.

```html
<link rel="stylesheet" href="./wfg-fsung.css">
```

Once published to npm, it can also be loaded from unpkg:

```html
<link rel="stylesheet" href="https://unpkg.com/wfg-fsung-webfonts@1.0.0/wfg-fsung.css">
```

Note: jsDelivr's npm mode enforces a 150MB *total package* size limit — since this
package bundles every codepoint chunk (~163MB combined), jsDelivr rejects every file
in it with 403, not just the oversized ones. unpkg has no such limit and serves the
package correctly, so use unpkg instead.

```css
body {
  font-family: 'WFG FSung', serif;
}
```

The CSS uses 256-codepoint `unicode-range` chunks (the same convention used by
CJK webfont projects like `jigmo-webfonts`), so browsers only download the
blocks a page actually needs.

## Source composition

全宋體 is distributed by its author as seven whole TTF files (`FSung-1.ttf`,
`FSung-2.ttf`, `FSung-3.ttf`, `FSung-F.ttf`, `FSung-X.ttf`, `FSung-m.ttf`,
`FSung-p.ttf`). This package combines six of them into one CSS family,
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
| `FSung-p.ttf` | **excluded** | cmap is an exact duplicate of `FSung-m` (both 40,582 codepoints) and it is not referenced by the original 部件檢索 tool's own CSS `font-family` stack |

The chunk-assignment algorithm (including the one Basic Latin chunk that
needed a "does one source's coverage superset the union?" check rather than
plain first-seen dedup) is documented alongside the build tooling that
produced this package; this directory ships only the generated CSS and
WOFF2 output, not that tooling, so it can be published standalone.

- Upstream: https://fgwang.blogspot.com/2025/09/unicode-17.html
- Upstream version: 2025/09/24 build
- Font license: non-commercial share only — see [`LICENSE`](./LICENSE)
- Package metadata (this README, package.json): same non-commercial terms as the font itself, see [`LICENSE`](./LICENSE)
