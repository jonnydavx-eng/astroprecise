# Fulfilment repair - 20 September 2026

Public website release remains v911, main 2e9e353e24ae7980e96b9fa27cabc898b072aa0e, Pages run35475724678 succeeded. This branch is a separate private fulfilment candidate based on canonical ccd2070b, with the tested v911 website overlaid. Do not merge its legacy workflow over GitHub main; the public deployment already retains the correct Pages workflow.

## Fixed

Responsive Home returned a 4800x2643 capture, while product watermark/provenance expected4800x3600. Sharp rejected the oversized overlay. The private capture now uses an explicit4:3 render surface and fixed4800x3600 delivery canvas. Its crop keeps the aspect ratio, and print exposure makes the computed scene legible. Public camera behavior is unchanged. Existing visual thresholds were not relaxed. The packaging directory guard from the public release is also preserved.

## Evidence

- Initial direct error: Observatory capture failed: Image to composite must have same dimensions or smaller.
- Direct PDF rendering passed four PDFs for both the Aurora template and the product-test chart, including restricted child environment. The earlier PDF failure was not reproducible; no speculative renderer patch was made.
- Corrected direct Observatory captures:4800x3600. Existing artwork metrics pass for two fictional charts: luma deviation12.82/12.88 (minimum10), edge1.475/1.731 (minimum1.4), active cells7/8 (minimum6).
- `node test-fulfil-products.mjs`: exit0, PASS Studio fulfilment: UTC, payment gating, rendered PDFs, escaping, packaging and private filenames. Local log product-final-proof.log. Fictional retained output C:/Users/jonny/AppData/Local/Temp/ap-fulfil-v901-cpSOy1.
- `node --test test-package-studio-args.mjs`:5/5 passed after preserving the directory guard. Local log packaging-final-proof.log.

## Still required for paid sales

The catalogue has checkoutVerified:false and null checkout URLs. Its declared gates require a real legal operator/geographic address, monitored direct contact, owner-confirmed service levels/prices, signed-in Gumroad Commission eligibility and charge/file-release/refund behavior, authenticated provider field mapping and fresh payment/revocation retrieval, tax/fee totals, durable contract confirmation, private storage/encryption/purge evidence, and an end-to-end order/refund/deletion check. The provider retrieval adapter is deliberately disabled and unimplemented pending an authenticated provider contract. Local fictional proofs are not those account or customer-flow proofs.

No purchase, payment activation, seller listing publication, marketing message or new public deployment was performed for this private-tool repair. Original canonical source is preserved. The technical product regression passes; paid-market readiness is not claimed.
