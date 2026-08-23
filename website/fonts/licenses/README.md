# AstroPrecise self-hosted webfonts — licence map

Verified: 2026-08-23

All WOFF2 files in `website/fonts/` map to families distributed under the SIL Open Font License 1.1. The common licence and relevant copyright notices are in `OFL-1.1.txt`.

## Verification method

The mapping below uses three pieces of evidence:

1. the CSS family/file mapping in `website/css/fonts.css`;
2. each WOFF2 binary's OpenType `name` table (family, full-name, copyright and licence URL fields), inspected locally on 2026-08-23; and
3. the official upstream/Google Fonts family repositories and licence files linked below.

The files are self-hosted web subsets/variants. No exact upstream commit was recorded when they were originally downloaded, so this document does not invent one.

## File-to-family map

| Local file(s) | Embedded family/copyright evidence | Licence/source |
|---|---|---|
| `astro-glyphs.woff2` | **Noto Sans Symbols**; Copyright 2022 The Noto Project Authors; OFL URL embedded. CSS exposes it locally as `AstroGlyph`. | [Google Fonts family](https://github.com/google/fonts/tree/main/ofl/notosanssymbols) · [Noto source](https://github.com/notofonts/symbols) |
| `cinzel-hero-700.woff2`, `cinzel-normal-400.woff2`, `cinzel-normal-600.woff2`, `cinzel-normal-700.woff2` | **Cinzel**; Copyright 2020 The Cinzel Project Authors. The normal files embed the OFL URL; the hero subset retains the same family/project copyright. | [Google Fonts family and OFL](https://github.com/google/fonts/tree/main/ofl/cinzel) · [upstream](https://github.com/NDISCOVER/Cinzel) |
| `cormorant-garamond-italic-400.woff2`, `cormorant-garamond-italic-500.woff2`, `cormorant-garamond-normal-400.woff2`, `cormorant-garamond-normal-500.woff2`, `cormorant-garamond-normal-600.woff2` | **Cormorant Garamond**; Copyright 2015 The Cormorant Project Authors; Open Font License URL embedded. | [Google Fonts family and OFL](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) · [upstream](https://github.com/CatharsisFonts/Cormorant) |
| `inter-normal-300.woff2`, `inter-normal-400.woff2`, `inter-normal-500.woff2`, `inter-normal-600.woff2` | **Inter**; Copyright 2016 The Inter Project Authors; Open Font License URL embedded. | [Google Fonts family and OFL](https://github.com/google/fonts/tree/main/ofl/inter) · [upstream](https://github.com/rsms/inter) |
| `ibm-plex-mono-normal-400.woff2` | **IBM Plex Mono**; Copyright 2017 IBM Corp.; OFL URL embedded. Upstream reserves the font name “Plex”. | [IBM Plex source and licence](https://github.com/IBM/plex) |
| `schibsted-grotesk-latin-var.woff2` | **Schibsted Grotesk**; Copyright 2023 The Schibsted-Grotesk Project Authors; OFL URL embedded. | [upstream and OFL](https://github.com/schibsted/schibsted-grotesk) · [Google Fonts family](https://github.com/google/fonts/tree/main/ofl/schibstedgrotesk) |

### Noto naming correction

The shipped `astro-glyphs.woff2` binary identifies itself as **Noto Sans Symbols**, not Noto Sans Symbols 2. The local `AstroGlyph` name is only a CSS alias. Licence and attribution therefore follow the actual embedded Noto Sans Symbols family. Do not relabel it as Noto Sans Symbols 2 unless the binary is deliberately replaced and reverified.

## SHA-256 inventory

```text
4407ceeb0fd23cc7bec5a72a993b024c8572cd95658886d3a1727ab1e80af7d5  astro-glyphs.woff2
ddefd1febc346dbff8ef9d084bc51a1d07baaaa3a56c548fcdb3304e771dc610  cinzel-hero-700.woff2
09941fb1c169c38fd414536b37690057fc01b3117a5c63dd6571186540c8f370  cinzel-normal-400.woff2
09941fb1c169c38fd414536b37690057fc01b3117a5c63dd6571186540c8f370  cinzel-normal-600.woff2
09941fb1c169c38fd414536b37690057fc01b3117a5c63dd6571186540c8f370  cinzel-normal-700.woff2
6f2f5c3b1abc3d0bb035a927f66a90ca873f94fc31c4966c8d024142c2036e55  cormorant-garamond-italic-400.woff2
6f2f5c3b1abc3d0bb035a927f66a90ca873f94fc31c4966c8d024142c2036e55  cormorant-garamond-italic-500.woff2
d80df8ff5aecd299a61549f9e29ab1ed0b9b05f4ea71d50fe978e07d5240b235  cormorant-garamond-normal-400.woff2
d80df8ff5aecd299a61549f9e29ab1ed0b9b05f4ea71d50fe978e07d5240b235  cormorant-garamond-normal-500.woff2
d80df8ff5aecd299a61549f9e29ab1ed0b9b05f4ea71d50fe978e07d5240b235  cormorant-garamond-normal-600.woff2
08949f728dc52d528e69b1667d15c89a5686a4ee9a296ff90983985f99c380f7  ibm-plex-mono-normal-400.woff2
3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62  inter-normal-300.woff2
3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62  inter-normal-400.woff2
3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62  inter-normal-500.woff2
3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62  inter-normal-600.woff2
4c8b93f431d462c696e12b9d6a033feb3394d36e66e781357c496b95d8a75e05  schibsted-grotesk-latin-var.woff2
```

Several CSS weight aliases currently point to byte-identical WOFF2 files, as the hashes show. That fact is recorded rather than hidden; it does not change the OFL family mapping.

## Redistribution rule

Keep `OFL-1.1.txt` and this map with redistributed webfont binaries. The OFL permits embedding and bundling subject to its conditions, including retaining the copyright notice and licence and respecting reserved font names for modified versions.
