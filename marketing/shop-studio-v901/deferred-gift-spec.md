# Deferred personalised-gift feature contract

Status: research only — excluded from the first Studio release

Updated: 2026-08-24

## Product intent

AstroPrecise should eventually let one adult buy a genuinely personal birthday commission for another adult, with a dedicated jacket, phone reveal and computed Moon-phase artwork. It must feel designed for the recipient rather than being a generic voucher or a renamed self order.

This document preserves that product direction. It does **not** authorise a public control, listing, checkout field, customer intake, fulfilment email or data flow. The first release is self-order only.

## Non-negotiable privacy boundary

- The buyer must never enter, upload, forward or dictate another person&rsquo;s birth data.
- No surprise gift, child recipient, delayed redemption or guessed/approximate birth time.
- The adult recipient must receive the privacy information before collection and personally enter and verify their own data through a private route.
- Recipient files must be private by default. A buyer copy would require a separate, specific and initially unticked choice by the recipient, checked again before each dispatch.
- A short dedication may not collect health, belief, sexual-life or other special-category information.
- Refusal, objection, withdrawal and deletion must work without pressure through the buyer.

## Required experience

1. Buyer selects a future gift route without entering recipient birth data.
2. The platform privately invites the named adult recipient without exposing their data to the buyer.
3. The recipient sees the current privacy notice, verifies they are 18 or over, enters their own exact recorded time/place and controls delivery.
4. Buyer and recipient receive separate durable records with no cross-disclosure.
5. Production begins only after the contract, cancellation and recipient-data gates have passed.
6. The delivered gift includes the edition&rsquo;s normal files plus a personalised dedication jacket, phone reveal and clearly labelled computed Moon-phase plate.

## Go/no-go evidence

Do not move this feature into active copy until all of the following exist:

- owner-approved UK consumer/privacy analysis and lawful-basis record;
- a real platform test proving private two-person intake and delivery;
- versioned notice, actor, timestamp and wording-hash evidence;
- tested objection, withdrawal, correction, refund and deletion paths;
- accessibility and visual QA for every gift-specific file;
- fulfilment controls that fail closed if recipient evidence is missing or stale;
- a separate controlled release review.

If the selected commerce platform cannot prove these controls, the feature remains deferred. Do not weaken the boundary to make the feature fit the platform.

## Preserved research

- `gift-confirmation-email.txt` is a dormant drafting aid, not a send template.
- `../../docs/GIFT-PRIVACY-LIA-DRAFT.md` is an unapproved research draft, not launch authority.
- `../../tools/adobe/make-shop-gift-kit-v901.jsx` and related fictional artwork may inform later design exploration but must not be presented as a current deliverable.
