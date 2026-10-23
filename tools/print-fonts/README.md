# Print-only static fonts (`tools/print-fonts/`)

Written 2026-10-20. These eight TrueType files exist for one reason: the Natal Sky Print Pack
PDFs. `website/fonts/` ships Cinzel and Cormorant Garamond as variable WOFF2 instances, and
Chromium cannot embed a variable instance as a font program, so it writes those runs into
`page.pdf()` output as Type3 outline fonts (no real font, no text extraction, no print-shop
font check). `tools/fulfil-shared.mjs` (`printFontCss`) declares these static files under the
same family names, inlined as `data:` URLs, so print HTML needs no CSS change and Chromium
embeds TrueType / CIDFontType2 subsets instead. `test-sample-print-pack.mjs` fails if a Type3
font dictionary reappears.

Step 8 of the 2C migration (2026-10-23) added the light specimen faces; see below.

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

## 2C step 8 additions (2026-10-23): the light specimen faces

The sample PDFs now use the site's Paper & Night type (`AP Serif` = Instrument Serif, `AP Sans`
= Inter), so five static text files and three symbol subsets were added. The paid fulfilment
templates still use the Cinzel / Cormorant files above; they were not changed.

| File | Derived from | Name in the binary | Notes |
|---|---|---|---|
| `inter-static-400/500/600.ttf` | `website/fonts/inter-normal-*.woff2` (Inter 4.001, variable `wght`, 518 glyphs), instanced with fontTools `varLib.instancer` | "Inter Print" (InterPrint-Regular / -Medium / -SemiBold) | static, `fsType` 0, no `fvar` |
| `instrument-serif-static-regular.ttf`, `-italic.ttf` | `website/fonts/instrument-serif-*.woff2` (Instrument Serif 1.000, already static), decompressed to TTF | "Instrument Serif Print" | `fsType` 0 |
| `ap-symbols-print-astro.ttf` | google/fonts `ofl/notosanssymbols/NotoSansSymbols[wght].ttf`, instanced at wght 400 | "AP Symbols Print Astro" | U+2190-2193, U+260A-260D, U+263D, U+263F-2653, U+26B3-26B7, U+26B9-26BC |
| `ap-symbols-print-shapes.ttf` | google/fonts `ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf` | "AP Symbols Print Shapes" | □ △ ▽ ◆ ◇ ○ ● ★ ☆ ☉ ✦ ✧ |
| `ap-symbols-print-marks.ttf` | google/fonts `ofl/notosans/NotoSans[wdth,wght].ttf`, instanced at wght 400, wdth 100 | "AP Symbols Print Marks" | ′ ″ ℞ |

Why the symbol subsets: Chromium writes any glyph it has to take from a system fallback font
(or synthesise) as a Type3 font. `printSymbolCss()` in `tools/fulfil-shared.mjs` declares the
three subsets under the AP families with a `unicode-range`, so symbols never fall back. Inter's
own arrows and ′ ″ are kept for `AP Sans`.

Weight map for the AP families (`PRINT_FONT_FACES`): AP Serif normal/italic 400 plus a
`500 900` range on the same files; AP Sans 400, 500, 600 plus `700 900` on the 600 file. The
exact-weight faces are kept because Chromium prefers an exact face over a range face; the
ranges stop bold requests from being synthesised (which would also print as Type3). Font
synthesis is switched off in print CSS.

Licences: `OFL-Inter.txt` (Copyright 2016 The Inter Project Authors), `OFL-InstrumentSerif.txt`
(Copyright 2022 The Instrument Serif Project Authors), `OFL-NotoSansSymbols.txt` (Copyright
2022 The Noto Project Authors, notofonts/symbols). The Marks subset comes from Noto Sans, whose
embedded copyright line is "Copyright 2022 The Noto Project Authors
(https://github.com/notofonts/latin-greek-cyrillic)"; same authors, same OFL 1.1 text. No
Reserved Font Names are declared; the renamed families keep OFL section 3 satisfied anyway.

## SHA-256 (measured 2026-10-23; `SHA256SUMS.txt` holds the same list)

```text
399e9ce7fa8acbf274f78146f0f95f19f72ac7a44bb831713fcfbb5b32311afc  ap-symbols-print-astro.ttf
311d16949a088a574617c180b9e9b8bf8e780c7efe4c5037f01cba778cd2a7eb  ap-symbols-print-marks.ttf
e23333354771a6c1c86c93ea910f872fbfb393271b0df5df053aa01d2ad4c535  ap-symbols-print-shapes.ttf
e18fef360c76a27765c2de3af80d22a501be056239db39a93628484de2b26160  cinzel-static-400.ttf
d4e2dff07b23f278b72fde9620a4037ad2226d54c58813aef91924ed3c448da4  cinzel-static-600.ttf
889d4c0aa16edade63c8cbe49290fdc580a4f32bc105c69d553e25fdfbb1d6be  cinzel-static-700.ttf
b35c81f7cd775766fc9ee6992c6ee00ebf418ad650d7168565c4481d0f93452a  cormorant-garamond-static-400.ttf
98873ea1e19161ce8a3eeaae1ebe309e253023a4f16c55be3e3f21758350b839  cormorant-garamond-static-500.ttf
dcfb84c0e18af9499e62aef9b180a4a776eb19b1721b4f968fc8379ca64d3771  cormorant-garamond-static-600.ttf
86a56700d9903cc3d1d2a0806cc9c9ca9927e1313deb912acd5f588ab213d88b  cormorant-garamond-static-italic-400.ttf
538658e3d599a3bd29a5758da8d1aa031f3a8894efb24058a58a826e7ca75ff4  cormorant-garamond-static-italic-500.ttf
dd53f28b585fb5b1fcfa9ae42f7466a040600ca350aa473525112df12274c4de  instrument-serif-static-italic.ttf
09966204b1c6f55a72059f8973c97a49cfaa9ec90ee56031989ef8201693cbe4  instrument-serif-static-regular.ttf
11096d16278d0c6e996c6be7355497a94d8f60b77b7ad243eb5d83c915747d47  inter-static-400.ttf
8e66f8d1c88849995623dd04ede3375aee7706f84ec893defa16457f1596b3da  inter-static-500.ttf
7684877760c9fff4e74cb37441276981b3d79a7918a8c4ad8e73de54f95d4157  inter-static-600.ttf
f2b3029aba64c378bf0963b62945eee15e564fe4330b934c8f2eb058282b5e83  OFL-Cinzel.txt
60700d351cac4650c51f3f9db318d2a420f8b45052dba2715eb5fec41f0f6956  OFL-CormorantGaramond.txt
129ed7618959716959f2941fdd5b49e0ad6e6c1d78726761786a00253d865521  OFL-InstrumentSerif.txt
d36c5ba933a06d967511899c1985c93638bf797924dacf202a1943ccbea87294  OFL-Inter.txt
b118dd41337806a5d4797052c77caf3bd096aed783e5eb21b4d11154351e1ac0  OFL-NotoSansSymbols.txt
```

## Cinzel / Cormorant weight map (paid path; matches `PRINT_FONT_FACES` in `tools/fulfil-shared.mjs`)

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
