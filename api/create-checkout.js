// api/create-checkout.js
// Deploy this to Vercel as a serverless function

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { email, name, company } = req.body;

        // Create Stripe customer
        const customer = await stripe.customers.create({
            email: email,
            name: name,
            metadata: {
                company: company || ''
            }
        });

        // Create checkout session with 7-day trial
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [{
                price: process.env.STRIPE_PRICE_ID, // Your InboxAI price ID
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${req.headers.origin || 'https://yourdomain.com'}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'https://yourdomain.com'}/?cancelled=true`,
            subscription_data: {
                trial_period_days: 7, // 7-day free trial
                metadata: {
                    product: 'InboxAI Pro'
                }
            },
            allow_promotion_codes: true, // Allow discount codes
            billing_address_collection: 'required',
        });

        res.status(200).json({ 
            sessionId: session.id,
            url: session.url 
        });

    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ 
            error: error.message 
        });
    }
}
