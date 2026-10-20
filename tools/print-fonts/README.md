# Print-only static fonts (`tools/print-fonts/`)

Written 2026-10-20. These eight TrueType files exist for one reason: the Natal Sky Print Pack
PDFs. `website/fonts/` ships Cinzel and Cormorant Garamond as variable WOFF2 instances, and
Chromium cannot embed a variable instance as a font program, so it writes those runs into
`page.pdf()` output as Type3 outline fonts (no real font, no text extraction, no print-shop
font check). `tools/fulfil-shared.mjs` (`printFontCss`) declares these static files under the
same family names, inlined as `data:` URLs, so print HTML needs no CSS change and Chromium
embeds TrueType / CIDFontType2 subsets instead. `test-sample-print-pack.mjs` fails if a Type3
font dictionary reappears.

They are **not** served by the website and must not be moved under `website/`.

## Source and derivation

- Cinzel: github.com/google/fonts, `ofl/cinzel` (variable `Cinzel[wght].ttf`).
- Cormorant Garamond: github.com/google/fonts, `ofl/cormorantgaramond` (variable
  `CormorantGaramond[wght].ttf` and `CormorantGaramond-Italic[wght].ttf`).
- Instanced at the listed weights with fontTools `varLib.instancer`, then subset to Latin,
  punctuation and arrows with fontTools `subset`, on 20 October 2026.
- Family names in the binaries are **"Cinzel Print"** and **"Cormorant Garamond Print"** (name
  IDs 1 and 16), so the modified versions are not passed off as the originals. `fsType` is 0
  (installable embedding) in all eight. No `fvar` table remains: they are static.

## Licence

SIL Open Font License 1.1 for both families; the full texts, with each project's copyright
line, are `OFL-Cinzel.txt` (Copyright 2020 The Cinzel Project Authors) and
`OFL-CormorantGaramond.txt` (Copyright 2015 the Cormorant Project Authors). Neither copyright
line declares a Reserved Font Name, so the renamed instances need no further renaming under
OFL section 3. Keep these two licence files with the binaries wherever they are copied; the
fonts may be embedded in the PDFs and bundled, but may not be sold on their own.

## SHA-256 (measured 2026-10-20 after copying into the repo; `SHA256SUMS.txt` holds the same list)

```text
e18fef360c76a27765c2de3af80d22a501be056239db39a93628484de2b26160  cinzel-static-400.ttf
d4e2dff07b23f278b72fde9620a4037ad2226d54c58813aef91924ed3c448da4  cinzel-static-600.ttf
889d4c0aa16edade63c8cbe49290fdc580a4f32bc105c69d553e25fdfbb1d6be  cinzel-static-700.ttf
b35c81f7cd775766fc9ee6992c6ee00ebf418ad650d7168565c4481d0f93452a  cormorant-garamond-static-400.ttf
98873ea1e19161ce8a3eeaae1ebe309e253023a4f16c55be3e3f21758350b839  cormorant-garamond-static-500.ttf
dcfb84c0e18af9499e62aef9b180a4a776eb19b1721b4f968fc8379ca64d3771  cormorant-garamond-static-600.ttf
86a56700d9903cc3d1d2a0806cc9c9ca9927e1313deb912acd5f588ab213d88b  cormorant-garamond-static-italic-400.ttf
538658e3d599a3bd29a5758da8d1aa031f3a8894efb24058a58a826e7ca75ff4  cormorant-garamond-static-italic-500.ttf
f2b3029aba64c378bf0963b62945eee15e564fe4330b934c8f2eb058282b5e83  OFL-Cinzel.txt
60700d351cac4650c51f3f9db318d2a420f8b45052dba2715eb5fec41f0f6956  OFL-CormorantGaramond.txt
```

## Weight / style map (matches `PRINT_FONT_FACES` in `tools/fulfil-shared.mjs`)

| CSS family | style | weight | file |
|---|---|---|---|
| Cinzel | normal | 400 | `cinzel-static-400.ttf` |
| Cinzel | normal | 600 | `cinzel-static-600.ttf` |
| Cinzel | normal | 700 | `cinzel-static-700.ttf` |
| Cormorant Garamond | normal | 400 | `cormorant-garamond-static-400.ttf` |
| Cormorant Garamond | normal | 500 | `cormorant-garamond-static-500.ttf` |
| Cormorant Garamond | normal | 600 | `cormorant-garamond-static-600.ttf` |
| Cormorant Garamond | italic | 400 | `cormorant-garamond-static-italic-400.ttf` |
| Cormorant Garamond | italic | 500 | `cormorant-garamond-static-italic-500.ttf` |

The zodiac and planet glyphs still come from `website/fonts/astro-glyphs.woff2` (Noto Sans
Symbols, OFL), which is already static and embeds as a CID font; `printFontCss` inlines it too.
