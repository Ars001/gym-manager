// Stripe wrapper.
// WHY: isolates all Stripe SDK usage so the rest of the app calls small helpers.
// If STRIPE_SECRET_KEY is not set (common in early dev), we export a null client
// and the payment routes fall back to recording payments without charging.

const Stripe = require('stripe');
const config = require('../config');

const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

// True when Stripe is configured; routes use this to decide real vs. stub behaviour.
function isEnabled() {
  return Boolean(stripe);
}

// --- One-off charges -------------------------------------------------------

// Create a one-off PaymentIntent (card charge). Amount is in cents.
async function createPaymentIntent({ amountCents, currency, description, metadata }) {
  if (!stripe) throw new Error('Stripe is not configured');
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    description,
    metadata,
    automatic_payment_methods: { enabled: true },
  });
}

// --- Recurring subscriptions ----------------------------------------------

// Create a Product + recurring Price and return the Price id (stored on a plan).
async function createPrice({ amountCents, currency, interval, productName }) {
  if (!stripe) throw new Error('Stripe is not configured');
  const product = await stripe.products.create({ name: productName });
  const price = await stripe.prices.create({
    unit_amount: amountCents,
    currency: currency.toLowerCase(),
    recurring: { interval }, // 'week' | 'month' | 'year'
    product: product.id,
  });
  return price.id;
}

// Reuse an existing customer id or create a new Stripe customer for a member.
async function getOrCreateCustomer({ existingId, email, name }) {
  if (!stripe) throw new Error('Stripe is not configured');
  if (existingId) return existingId;
  const customer = await stripe.customers.create({ email: email || undefined, name });
  return customer.id;
}

// Create a subscription. default_incomplete means the first invoice needs the
// customer to confirm payment; we return the client secret for that.
async function createSubscription({ customerId, priceId, metadata }) {
  if (!stripe) throw new Error('Stripe is not configured');
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    metadata,
    expand: ['latest_invoice.payment_intent'],
  });
}

// Verify + parse a webhook payload using the signing secret.
function constructEvent(rawBody, signature) {
  if (!stripe) throw new Error('Stripe is not configured');
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

module.exports = {
  stripe,
  isEnabled,
  createPaymentIntent,
  createPrice,
  getOrCreateCustomer,
  createSubscription,
  constructEvent,
};
