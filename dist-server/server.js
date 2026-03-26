import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));
// Initialize Firebase Admin
const adminApp = admin.initializeApp({
    projectId: firebaseConfig.projectId,
});
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}
else {
    console.warn("STRIPE_SECRET_KEY is not set. Stripe features will not work.");
}
async function startServer() {
    const app = express();
    const PORT = 3000;
    // Stripe Webhook (Must be before bodyParser.json())
    app.post("/api/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
        const sig = req.headers["stripe-signature"];
        let event;
        if (!stripe) {
            return res.status(500).send("Stripe is not configured.");
        }
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
        }
        catch (err) {
            console.error(`Webhook Error: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.metadata?.userId;
            if (userId) {
                try {
                    await db.collection("users").doc(userId).update({
                        isPremium: true,
                    });
                    console.log(`User ${userId} upgraded to Premium!`);
                }
                catch (error) {
                    console.error(`Error updating user ${userId}:`, error);
                }
            }
        }
        res.json({ received: true });
    });
    app.use(express.json());
    // Create Checkout Session
    app.post("/api/create-checkout-session", async (req, res) => {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }
        if (!stripe) {
            return res.status(500).json({ error: "Stripe is not configured." });
        }
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: "eur",
                            product_data: {
                                name: "NutriSnap Premium",
                                description: "Unlimited scans, weekly trends, and no ads!",
                            },
                            unit_amount: 299, // 2.99 EUR
                        },
                        quantity: 1,
                    },
                ],
                mode: "payment",
                metadata: { userId },
                success_url: `${process.env.APP_URL}/?payment=success`,
                cancel_url: `${process.env.APP_URL}/?payment=cancel`,
            });
            res.json({ url: session.url });
        }
        catch (error) {
            console.error("Stripe Error:", error);
            res.status(500).json({ error: error.message });
        }
    });
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
startServer();
