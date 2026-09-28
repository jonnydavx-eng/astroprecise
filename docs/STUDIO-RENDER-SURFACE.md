# Private Studio render surface

The product renderer uses the chart form and five export controls captured in `tools/studio-render/manifest.json`. It is separate from the visitor-facing chart journey, so a website redesign cannot silently change the artwork.

`tools/studio-render-surface.mjs` reads changed assets from `snapshot/` and unchanged assets from `website/`. Each read checks the inventory, containment, length and SHA-256. Declared text assets allow CRLF/LF normalization only; binary assets remain byte-exact. Changed shared assets stop rendering until reviewed and repinned. These files are local operator tooling and are excluded from the website build.

The snapshot and baseline fixtures retain their original bytes through `.gitattributes`. Do not format them, modify a baseline to make a test pass, or repin the manifest without reviewing the resulting artwork. The fixture and sample are fictional.

Run the bounded source checks without producing a new pack:

```text
npm run test:fulfil:source
node tools/build.mjs
node tools/verify-studio-render-surface.mjs
node tools/verify-studio-candidate.mjs
node tools/verify-opening-offline.mjs
```

The render-surface check loads the fictional chart, verifies its Julian date and export controls, then closes its browser/server without exporting. The Studio and opening checks use the built website and verify mobile geometry, exact sample bytes and offline access. Their evidence is generated under `output/playwright/`.

Full fixture rendering is a separate operation and requires a new output directory:

```text
node tools/fulfil-order.mjs --in tools/order-template-natal.json --proof --fictional-fixture natal-sky-print-pack-v1 --out <new-private-directory>
```

The final order route requires consent, private storage and fresh authenticated full-payment evidence. The Gumroad adapter is deliberately disabled until an authenticated provider contract is implemented and tested. A fixture proof is not a paid delivery test.
