/**
 * AstroPrecise Typeform definitions — v2 standards (June 2026)
 *
 * Design principles (Typeform 2025/26 + fulfilment UX):
 * - One form per product (no product dropdown — fewer errors)
 * - Hidden LS params: email, buyer_name, order_id, product_sku
 * - One question per screen (Typeform default)
 * - Name on chart separate from buyer_name
 * - Privacy statements before legal
 * - noindex forms; progress bar on
 * - Blocked products get forms marked draft in catalog but still created for readiness
 */

const BASE_SETTINGS = {
  language: 'en',
  is_public: true,
  progress_bar: 'proportion',
  show_progress_bar: true,
  show_typeform_branding: true,
  meta: {
    allow_indexing: false,
  },
};

const HIDDEN_LS = ['email', 'buyer_name', 'order_id', 'product_sku'];

function welcome(productLabel, extra = '') {
  return {
    ref: 'welcome',
    title: 'AstroPrecise',
    properties: {
      description:
        `Thank you, {{hidden:buyer_name}} — order {{hidden:order_id}}.\n\n` +
        `You're completing details for **${productLabel}**. ` +
        `Your birth data is used only to generate your order and is deleted after delivery. ` +
        `We never store birth data on astroprecise.app. ` +
        `Entertainment only — not medical, financial, or legal advice.` +
        (extra ? `\n\n${extra}` : ''),
      button_text: 'Begin',
    },
  };
}

function thanks(sla = 'Your personalised files will be emailed within 24 hours.') {
  return {
    ref: 'thanks',
    title: 'Received',
    properties: {
      description: `${sla}\n\nIf anything looks wrong, reply to your Lemon Squeezy receipt.`,
      button_text: 'Done',
      share_icons: false,
    },
  };
}

function stmt(ref, title, desc) {
  return {
    ref,
    title,
    type: 'statement',
    properties: { description: desc, button_text: 'Continue' },
  };
}

function legal() {
  return {
    ref: 'legal',
    title: 'I understand this content is for entertainment only and is not medical, financial, or legal advice.',
    type: 'legal',
    validations: { required: true },
    properties: {},
  };
}

function natalCoreFields() {
  return [
    {
      ref: 'chart_name',
      title: 'Name as it should appear on your chart or reading',
      type: 'short_text',
      validations: { required: true, max_length: 80 },
      properties: { description: 'Can differ from the name on your receipt.' },
    },
    {
      ref: 'dob',
      title: 'Date of birth',
      type: 'date',
      validations: { required: true },
      properties: { structure: 'DDMMYYYY', separator: '/' },
    },
    stmt(
      'time_note',
      'Birth time',
      'For the most accurate Moon sign and Rising sign, enter your exact time from a birth certificate if you have it. If unknown, type **unknown** — we will use a solar-chart method and note reduced precision in your deliverable.'
    ),
    {
      ref: 'birth_time',
      title: 'Time of birth',
      type: 'short_text',
      validations: { required: true, max_length: 40 },
      properties: { description: '24-hour format e.g. 14:30, or type unknown' },
    },
    {
      ref: 'birth_place',
      title: 'Place of birth',
      type: 'short_text',
      validations: { required: true, max_length: 120 },
      properties: { description: 'City and country — e.g. Manchester, United Kingdom' },
    },
    stmt(
      'privacy_note',
      'Your data',
      'We use these details only to fulfil this order. Fulfilment data is deleted after your PDF is delivered and any refund window has passed.'
    ),
    legal(),
  ];
}

export function buildNatalSingle({ title, productSku, productLabel, thankYou }) {
  return {
    title,
    type: 'form',
    settings: {
      ...BASE_SETTINGS,
      meta: {
        ...BASE_SETTINGS.meta,
        title: productLabel,
        description: `AstroPrecise fulfilment — ${productSku}`,
      },
    },
    hidden: [...HIDDEN_LS],
    welcome_screens: [welcome(productLabel)],
    thankyou_screens: [thanks(thankYou)],
    fields: natalCoreFields(),
    _meta: { template: 'natal-single', product_sku: productSku },
  };
}

export function buildCouples({ title, productSku, productLabel }) {
  return {
    title,
    type: 'form',
    settings: {
      ...BASE_SETTINGS,
      meta: { ...BASE_SETTINGS.meta, title: productLabel, description: `AstroPrecise couples — ${productSku}` },
    },
    hidden: [...HIDDEN_LS],
    welcome_screens: [
      welcome(
        productLabel,
        'We need birth details for **both** people. Allow about 3 minutes.'
      ),
    ],
    thankyou_screens: [
      thanks('Your Two Skies reading and print files will be emailed within 48 hours.'),
    ],
    fields: [
      stmt('p1_head', 'Person 1', 'First chart — usually yourself or the order recipient.'),
      {
        ref: 'p1_chart_name',
        title: 'Person 1 — name on chart',
        type: 'short_text',
        validations: { required: true, max_length: 80 },
        properties: {},
      },
      {
        ref: 'p1_dob',
        title: 'Person 1 — date of birth',
        type: 'date',
        validations: { required: true },
        properties: { structure: 'DDMMYYYY', separator: '/' },
      },
      {
        ref: 'p1_birth_time',
        title: 'Person 1 — time of birth',
        type: 'short_text',
        validations: { required: true, max_length: 40 },
        properties: { description: '14:30 or unknown' },
      },
      {
        ref: 'p1_birth_place',
        title: 'Person 1 — place of birth',
        type: 'short_text',
        validations: { required: true, max_length: 120 },
        properties: {},
      },
      stmt('p2_head', 'Person 2', 'Second chart — your partner or the second sky.'),
      {
        ref: 'p2_chart_name',
        title: 'Person 2 — name on chart',
        type: 'short_text',
        validations: { required: true, max_length: 80 },
        properties: {},
      },
      {
        ref: 'p2_dob',
        title: 'Person 2 — date of birth',
        type: 'date',
        validations: { required: true },
        properties: { structure: 'DDMMYYYY', separator: '/' },
      },
      {
        ref: 'p2_birth_time',
        title: 'Person 2 — time of birth',
        type: 'short_text',
        validations: { required: true, max_length: 40 },
        properties: { description: '14:30 or unknown' },
      },
      {
        ref: 'p2_birth_place',
        title: 'Person 2 — place of birth',
        type: 'short_text',
        validations: { required: true, max_length: 120 },
        properties: {},
      },
      {
        ref: 'gift_message',
        title: 'Gift message (optional)',
        type: 'long_text',
        validations: { required: false, max_length: 500 },
        properties: { description: 'Printed on the gift card if this is a present.' },
      },
      stmt(
        'privacy_note',
        'Your data',
        'Birth data is used only for this order and deleted after delivery.'
      ),
      legal(),
    ],
    _meta: { template: 'couples', product_sku: productSku },
  };
}

export function buildGiftPurchase({ title, productSku, productLabel }) {
  return {
    title,
    type: 'form',
    settings: {
      ...BASE_SETTINGS,
      meta: { ...BASE_SETTINGS.meta, title: productLabel, description: `AstroPrecise gift — ${productSku}` },
    },
    hidden: [...HIDDEN_LS],
    welcome_screens: [
      welcome(
        productLabel,
        'Tell us who the gift is for. They will receive a private link to submit their own birth details — you never need to know their time of birth.'
      ),
    ],
    thankyou_screens: [
      thanks(
        'We will email the gift voucher within 24 hours. The recipient redeems it with their own birth details.'
      ),
    ],
    fields: [
      {
        ref: 'recipient_name',
        title: "Recipient's name",
        type: 'short_text',
        validations: { required: true, max_length: 80 },
        properties: {},
      },
      {
        ref: 'recipient_email',
        title: "Recipient's email",
        type: 'email',
        validations: { required: true },
        properties: { description: 'Where we send the gift voucher and final reading.' },
      },
      {
        ref: 'gift_message',
        title: 'Your gift message',
        type: 'long_text',
        validations: { required: false, max_length: 600 },
        properties: { description: 'Included in the voucher email.' },
      },
      {
        ref: 'delivery_date',
        title: 'Preferred send date (optional)',
        type: 'date',
        validations: { required: false },
        properties: { structure: 'DDMMYYYY', separator: '/', description: 'Leave blank to send immediately after fulfilment.' },
      },
      stmt('privacy_note', 'Privacy', 'We only collect what is needed to deliver the gift. Recipient birth data is collected by them directly on redemption.'),
      legal(),
    ],
    _meta: { template: 'gift-purchase', product_sku: productSku },
  };
}

export function buildGiftRedeem({ title, productSku, productLabel }) {
  const def = buildNatalSingle({
    title,
    productSku,
    productLabel,
    thankYou: 'Your gifted reading will be emailed within 24 hours.',
  });
  def.hidden = ['email', 'buyer_name', 'order_id', 'product_sku', 'voucher_code'];
  def.welcome_screens = [
    {
      ref: 'welcome',
      title: 'Redeem your gift',
      properties: {
        description:
          `Welcome, {{hidden:buyer_name}}. ` +
          `You're redeeming **${productLabel}**. Voucher: {{hidden:voucher_code}}. ` +
          `Submit your birth details below — entertainment only.`,
        button_text: 'Redeem',
      },
    },
  ];
  def._meta = { template: 'gift-redeem', product_sku: productSku };
  return def;
}

export function buildPodNatal({ title, productSku, productLabel }) {
  const def = buildNatalSingle({
    title,
    productSku,
    productLabel,
    thankYou:
      'Your print file goes to production within 48 hours. You will receive tracking when it ships.',
  });
  def.fields = [
    ...natalCoreFields().slice(0, -2),
    {
      ref: 'shipping_name',
      title: 'Full name for shipping label',
      type: 'short_text',
      validations: { required: true, max_length: 80 },
      properties: {},
    },
    {
      ref: 'shipping_address',
      title: 'Shipping address',
      type: 'short_text',
      validations: { required: true, max_length: 300 },
      properties: { description: 'Street, city, postcode, country — one field is fine.' },
    },
    {
      ref: 'shipping_phone',
      title: 'Phone for courier (optional)',
      type: 'phone_number',
      validations: { required: false },
      properties: { default_country_code: 'GB' },
    },
    stmt('privacy_note', 'Your data', 'Address and birth data are used only to produce and ship your order.'),
    legal(),
  ];
  def._meta = { template: 'pod-natal', product_sku: productSku };
  return def;
}

/** Full product → form spec catalogue */
export const FORM_CATALOG = [
  {
    product_id: 'deep-reading',
    status: 'live',
    generator: 'generate-reading.mjs',
    template: 'natal-single',
    build: () =>
      buildNatalSingle({
        title: 'AstroPrecise — Deep Reading Fulfilment',
        productSku: 'deep-reading',
        productLabel: 'Deep Natal Reading PDF (£12)',
        thankYou: 'Your Deep Reading PDF will be emailed within 24 hours.',
      }),
  },
  {
    product_id: 'natal-poster-pdf',
    status: 'live',
    generator: 'generate-reading.mjs',
    template: 'natal-single',
    build: () =>
      buildNatalSingle({
        title: 'AstroPrecise — Poster PDF Fulfilment',
        productSku: 'natal-poster-pdf',
        productLabel: 'Print-at-Home Natal Poster PDF (£6)',
        thankYou: 'Your print-ready poster PDF will be emailed within 24 hours.',
      }),
  },
  {
    product_id: 'reading-poster-bundle',
    status: 'live',
    generator: 'generate-reading.mjs',
    template: 'natal-single',
    build: () =>
      buildNatalSingle({
        title: 'AstroPrecise — Reading + Poster Bundle Fulfilment',
        productSku: 'reading-poster-bundle',
        productLabel: 'Deep Reading + Poster Bundle (£16)',
        thankYou: 'Both PDFs will be emailed within 24 hours from one chart.',
      }),
  },
  {
    product_id: 'two-skies-map',
    status: 'ready',
    generator: 'generate-couples.mjs',
    template: 'couples',
    build: () =>
      buildCouples({
        title: 'AstroPrecise — Two Skies Couples Fulfilment',
        productSku: 'two-skies-map',
        productLabel: 'Two Skies — Couples Star Map (£24)',
      }),
  },
  {
    product_id: 'gift-reading',
    status: 'ready',
    generator: 'generate-reading.mjs + voucher',
    template: 'gift-purchase',
    build: () =>
      buildGiftPurchase({
        title: 'AstroPrecise — Gift a Reading Purchase',
        productSku: 'gift-reading',
        productLabel: 'Gift a Deep Reading (£15)',
      }),
  },
  {
    product_id: 'gift-reading-redeem',
    status: 'ready',
    generator: 'generate-reading.mjs',
    template: 'gift-redeem',
    build: () =>
      buildGiftRedeem({
        title: 'AstroPrecise — Redeem Gift Reading',
        productSku: 'gift-reading',
        productLabel: 'Gift Deep Reading — Redemption',
      }),
  },
  {
    product_id: 'gift-box-whole-sky',
    status: 'ready',
    generator: 'generate-reading.mjs + POD',
    template: 'gift-purchase',
    build: () =>
      buildGiftPurchase({
        title: 'AstroPrecise — Whole Sky Gift Box Purchase',
        productSku: 'gift-box-whole-sky',
        productLabel: 'The Whole Sky — Gift Box (£35)',
      }),
  },
  {
    product_id: 'natal-poster',
    status: 'ready',
    generator: 'generate-reading.mjs + POD',
    template: 'pod-natal',
    build: () =>
      buildPodNatal({
        title: 'AstroPrecise — Physical Natal Poster',
        productSku: 'natal-poster',
        productLabel: 'Your Natal Sky — Art Poster (print)',
      }),
  },
  {
    product_id: 'big-three-print',
    status: 'ready',
    generator: 'POD',
    template: 'pod-natal',
    build: () =>
      buildPodNatal({
        title: 'AstroPrecise — Big Three Mini Print',
        productSku: 'big-three-print',
        productLabel: 'Big Three — Mini Print',
      }),
  },
  {
    product_id: 'sky-tee',
    status: 'ready',
    generator: 'POD',
    template: 'pod-natal',
    build: () =>
      buildPodNatal({
        title: 'AstroPrecise — Sky Tee',
        productSku: 'sky-tee',
        productLabel: 'Your Sky — Tee',
      }),
  },
  {
    product_id: 'sky-hoodie',
    status: 'ready',
    generator: 'POD',
    template: 'pod-natal',
    build: () =>
      buildPodNatal({
        title: 'AstroPrecise — Sky Hoodie',
        productSku: 'sky-hoodie',
        productLabel: 'Your Sky — Hoodie',
      }),
  },
  {
    product_id: 'constellation-mug',
    status: 'ready',
    generator: 'POD',
    template: 'pod-natal',
    build: () =>
      buildPodNatal({
        title: 'AstroPrecise — Star Map Mug',
        productSku: 'constellation-mug',
        productLabel: 'Your Star Map — Mug',
      }),
  },
  {
    product_id: 'year-ahead',
    status: 'ready',
    generator: 'fulfil-order.mjs → generate-year-ahead.mjs',
    template: 'natal-single',
    build: () =>
      buildNatalSingle({
        title: 'AstroPrecise — Year Ahead Fulfilment',
        productSku: 'year-ahead',
        productLabel: 'Year Ahead Transit Report PDF',
        thankYou: 'Your Year Ahead transit report will be emailed within 24 hours.',
      }),
  },
  {
    product_id: 'solar-return',
    status: 'ready',
    generator: 'fulfil-order.mjs → generate-solar-return.mjs',
    template: 'natal-single',
    build: () =>
      buildNatalSingle({
        title: 'AstroPrecise — Solar Return Fulfilment',
        productSku: 'solar-return',
        productLabel: 'Solar Return PDF',
        thankYou: 'Your Solar Return PDF will be emailed within 24 hours.',
      }),
  },
];

export function lsButtonLink(formId, productSku) {
  // LS API rejects hash-fragment URLs for receipt_link_url — route via site redirect.
  return (
    `https://astroprecise.app/fulfil-redirect.html?form=${formId}` +
    `&email=[email]&buyer_name=[name]&order_id=[order_id]&product_sku=${productSku}`
  );
}

export function stripMeta(def) {
  const { _meta, ...payload } = def;
  return payload;
}