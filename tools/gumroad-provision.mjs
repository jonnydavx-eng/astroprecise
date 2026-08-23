#!/usr/bin/env node
/**
 * RETIRED — fail-closed guard for the obsolete 13-product Gumroad provisioner.
 *
 * AstroPrecise v901 has exactly three personalised Commission drafts. Gumroad
 * Commission setup and signed-in test purchases use seller-only dashboard
 * controls that this repository cannot safely reproduce through the legacy
 * ordinary-product API. This filename remains only to stop old commands,
 * handoffs, or shell history from silently creating the wrong catalogue.
 */

const message = [
  'RETIRED: tools/gumroad-provision.mjs cannot create or change products.',
  'AstroPrecise v901 uses exactly three Gumroad Commission drafts defined in',
  'website/data/products-v901.json. Create drafts in the signed-in seller UI,',
  'verify the Commission deposit/completion flow with Gumroad test purchase,',
  'and add checkout URLs only through the governed launch process.',
].join(' ')

process.stderr.write(`${message}\n`)
process.exitCode = 2
