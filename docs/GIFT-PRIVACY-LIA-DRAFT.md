# AstroPrecise Studio gift-recipient legitimate-interests assessment

Updated: 2026-08-24

> **WORKING DRAFT — NOT APPROVED, NOT LEGAL ADVICE, NOT AUTHORITY TO PROCESS DATA.** This assessment is a checkout-opening blocker. The data controller must verify the real Gumroad flow, complete the blank decisions, approve and date the assessment, and consider advice for the actual business and territories before accepting a gift order.

## Decision in one sentence

The proposed legitimate interest can support a tightly limited, adult-only birthday-gift commission **only** where the recipient is present, directly supplies their own data after receiving privacy information, affirmatively asks for the commission, receives the files by default and can stop or object without buyer pressure. It does not support surprise gifts, buyer-entered birth data, minor recipients, delayed voucher redemption, marketing reuse or automatic disclosure to the buyer.

## 1. Processing assessed

Exactly three existing Studio SKUs may use `purchaseIntent: gift`; gift mode is not a separate product.

Data proposed for direct collection from the adult recipient:

- display name and recipient delivery email;
- exact recorded birth date, local clock time, city/town and country;
- exact-time acknowledgement;
- derived latitude, longitude, IANA timezone and UTC instant;
- recipient confirmation, privacy-notice version and timestamp;
- generated chart, reading and birthday artwork;
- optional, separate buyer-copy authorisation notice version/hash, affirmative state,
  timestamp and any withdrawal.

Data proposed from the buyer:

- buyer/order/payment details handled for the consumer contract;
- purchase mode;
- optional from-name and short birthday message that the recipient will see, with a
  collection-time warning not to include birth details, health information, religious
  or philosophical beliefs, sexual-life information or other special-category data.

Excluded:

- health, belief, sexual-life or other special-category answers;
- hidden notes about the recipient;
- buyer-supplied recipient birth data;
- children&rsquo;s data;
- marketing, advertising, model training, public examples, compatibility scoring or unrelated profiling.

## 2. Purpose test

Proposed legitimate interests:

1. AstroPrecise&rsquo;s limited commercial interest in fulfilling the commissioned birthday edition the buyer funds.
2. The recipient&rsquo;s interest in receiving the personalised edition they have personally chosen to request.
3. Both parties&rsquo; interest in accurate calculation, private delivery, quality assurance, correction and dispute handling.

These interests are specific and lawful only within the narrow scope above. Payment by a buyer does not itself establish an interest strong enough to override the recipient&rsquo;s choice or privacy.

**Provisional purpose finding:** pass only for recipient-requested fulfilment; fail for surprise or buyer-controlled processing.

## 3. Necessity test

A natal chart cannot be calculated for a specific person without an exact date, local time and place. The display name and delivery email are needed to label and privately deliver the commissioned files. Derived coordinates, timezone and UTC are needed to disambiguate and reproduce the calculation.

Less intrusive design choices adopted:

- the recipient enters the data directly; the buyer never supplies it;
- no recipient account, public form, URL payload, analytics event or marketing record;
- no special-category questions or open-ended reading brief;
- no surprise/voucher path that stores data before the recipient is informed;
- delivery goes to the recipient; buyer copy is separate and optional;
- local raw inputs and working files have a short proposed deletion period;
- the public shop intent toggle stores only `self` or `gift` in tab-scoped sessionStorage.

The commission cannot be produced from anonymous or materially reduced birth inputs. However, if Gumroad cannot keep the recipient&rsquo;s fields and delivery private from the buyer, cannot present the notice before collection, or cannot preserve the required confirmations, the chosen platform is not a necessary/proportionate route and gift checkout must remain closed.

**Provisional necessity finding:** pass only after a platform test proves the safeguards; otherwise fail.

## 4. Balancing test

### Recipient expectations and relationship

The recipient has no ordinary customer/payment relationship with AstroPrecise merely because the buyer pays. Direct self-entry, an immediate plain-English notice and an affirmative request create a clear, limited relationship for fulfilment. A reasonable adult may expect those exact details to be used to calculate and deliver the edition they requested; they would not reasonably expect hidden buyer entry, marketing reuse, indefinite storage or automatic buyer access.

### Nature and impact of the data

Birth date, exact time and place can be identifying and feel intimate even where they are not special-category data. Generated astrological text may be perceived as personal or sensitive. Main risks are:

- an unwanted or coercive gift;
- inaccurate buyer-entered data attributed to the recipient;
- disclosure of birth details or reading content to the buyer;
- opaque profiling or claims of scientific/psychological truth;
- account, email, log, URL or filename leakage;
- retaining raw inputs longer than needed;
- heightened impact on a child.

### Safeguards required

- recipient age 18+ confirmation and hard rejection of minor gifts;
- recipient present and personally entering every birth field;
- separate hash-bound buyer no-entry attestation, never used as a substitute for recipient evidence;
- just-in-time notice before birth/contact collection, with controller, purpose, categories, source, lawful basis, recipients/transfers, retention, rights and contact route;
- explicit recipient statement that they are the person described and want the commission prepared;
- no work if the recipient declines or objects before work starts;
- right-to-object wording presented clearly and separately at collection, with future work paused while an objection is assessed and processing stopped unless the controller documents compelling legitimate grounds overriding the recipient's rights or the processing is needed for legal claims;
- private clarification with the recipient, not through the buyer;
- recipient-default delivery;
- buyer copy only through a separate, specific, informed, initially unticked recipient choice, with exact notice version/hash/state/timestamp, as easy to withdraw as to give and withdrawable at any time without affecting recipient delivery; withdrawal stops every copy or replacement not already sent;
- no public samples or internal testing with real recipient data;
- generic filenames, access-restricted per-order storage and no PII in URLs, command lines, analytics, source control or general logs;
- delete raw inputs and working files within the approved short period; retain only required order/accounting evidence separately;
- symbolic-reflection/entertainment boundary; no scientific personality, diagnosis, prediction or professional-advice claims;
- simple access, correction, objection, erasure/restriction and electronic complaint route, with a 30-day complaint acknowledgement, appropriate enquiries, progress updates and outcome without undue delay;
- halt-and-refund/reject route where the recipient will not proceed.

Children&rsquo;s interests require particular protection and would materially change the balance. They are excluded rather than treated as an edge case.

**Provisional balancing finding:** recipient interests do not override the narrow purpose only if every safeguard is implemented and tested. Any surprise, buyer-entry, minor or automatic buyer-copy path fails this balance.

## 5. Provisional outcome and hard gate

Provisional outcome: **conditional pass, not approved for use**.

Gift checkout must remain disabled until all of the following are evidenced:

- final controller identity, geographic address and direct contact route;
- final public privacy/terms/refunds copy;
- owner approval of this assessment and retention period;
- unpublished end-to-end test proving recipient self-entry and just-in-time notice;
- test proving the buyer cannot view/edit recipient birth fields or receive recipient files by default;
- separate unticked buyer-copy choice, durable wording/state/timestamp and tests for withdrawal before first dispatch and after an earlier copy but before a replacement;
- recipient objection/stopping and rejected-order refund test;
- deletion test covering Gumroad-visible records and local working files;
- verified provider-specific roles, data fields, sub-processors, destinations, international-transfer mechanisms and retention;
- assigned and tested data-protection complaint owner, monitored route and minimal case log;
- data-protection fee/exemption decision;
- independent privacy/security review of the frozen candidate.

If any condition fails, disable gift mode rather than accept the privacy risk. Self orders may be assessed separately; a gift failure does not authorise a weaker workaround.

## 6. Rights and operational response

- **Inform:** provide the recipient notice at collection, not later through the buyer.
- **Access/correction:** authenticate privately and correct before calculation or re-render where required.
- **Object:** pause future work while the controller assesses the objection; stop unless the controller documents compelling legitimate grounds overriding the recipient's rights or the processing is needed for legal claims. Present this right clearly and separately and do not pressure the recipient through the buyer.
- **Erasure/restriction:** separate raw birth working data from records that must be retained by law or for a live dispute.
- **Buyer-copy withdrawal:** make withdrawal as easy as authorisation and honour it at any time without affecting recipient delivery. Withdrawal stops each copy or replacement not already sent. Explain that a file already disclosed cannot be technically recalled, without treating that as permission to disclose early or again.
- **Complaint:** facilitate an electronic complaint that does not require birth details in the first message; acknowledge it within 30 days, make appropriate enquiries, keep the complainant informed about material progress and communicate the outcome without undue delay. A rights request in the same message keeps its own timetable. Preserve the right to complain to the ICO.

## 7. Review triggers

Repeat this assessment before:

- allowing buyer-entered details, vouchers, surprise gifts or minors;
- adding a new platform, processor, analytics, email automation or cloud storage;
- using data for recommendations, compatibility, marketing, research or model training;
- changing delivery defaults, retention or buyer access;
- accepting territories with materially different consumer/privacy rules;
- any breach, recipient complaint or evidence that expectations differ from this assessment.

## 8. Approval record

| Decision | Required entry |
|---|---|
| Controller/legal identity | **Unresolved** |
| LIA owner | **Unresolved** |
| Final purpose approved | **No** |
| Necessity evidence reviewed | **No** |
| Balancing safeguards tested | **No** |
| Retention approved | **No** |
| Data-protection fee/exemption confirmed | **No** |
| Provider roles/transfers/retention verified | **No** |
| Complaint owner/process approved | **No** |
| Adviser/reviewer and scope | **Unresolved** |
| Approval date and next review | **Unresolved** |

## Official guidance checked 2026-08-24

- ICO legitimate interests and three-part test: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/legitimate-interests/>
- ICO contract basis and third-party limitation: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/contract/>
- ICO right to be informed: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/>
- ICO right to object: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-object/>
- ICO data-protection complaints: <https://ico.org.uk/for-organisations/how-to-deal-with-data-protection-complaints/>
- Data (Use and Access) Act 2025: <https://www.legislation.gov.uk/ukpga/2025/18/contents>

Recheck the guidance at launch. This document records product-design reasoning; it is not a solicitor&rsquo;s opinion.
