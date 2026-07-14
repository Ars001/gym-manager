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

module.exports = { stripe, isEnabled, createPaymentIntent };
