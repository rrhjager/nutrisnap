import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
let adminApp: admin.app.App;

if (admin.apps.length > 0) {
  admin.app().delete().catch(console.error);
}

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
    console.log("Firebase Admin initialized with Service Account Key.");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin with key:", error);
    adminApp = admin.initializeApp({ projectId: firebaseConfig.projectId });
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK will use Application Default Credentials, which may lack permissions.");
  adminApp = admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
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
      console.error("Webhook Error: Stripe is not configured.");
      return res.status(500).send("Stripe is not configured.");
    }

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error(`Webhook Signature Error: ${err.message}. Secret exists: ${!!process.env.STRIPE_WEBHOOK_SECRET}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Received Stripe event: ${event.type}. Event ID: ${event.id}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      console.log(`Processing checkout.session.completed for user: ${userId}. Session ID: ${session.id}`);

      if (userId) {
        try {
          const userRef = db.collection("users").doc(userId);
          await userRef.set({
            isPremium: true,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
          console.log(`User ${userId} upgraded to Premium via Webhook! Document path: users/${userId}`);
        } catch (error) {
          console.error(`Error updating user ${userId} via Webhook:`, error);
        }
      } else {
        console.error("No userId found in session metadata for checkout.session.completed");
      }
    }
 else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      try {
        const usersRef = db.collection("users");
        const snapshot = await usersRef.where("stripeSubscriptionId", "==", subscription.id).get();
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            isPremium: false,
            stripeSubscriptionId: null,
          });
          console.log(`User ${userDoc.id} subscription cancelled.`);
        }
      } catch (error) {
        console.error(`Error handling subscription cancellation:`, error);
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // Create Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    const { userId } = req.body;
    console.log(`[Stripe] Creating checkout session for user: ${userId}. Body:`, JSON.stringify(req.body));

    if (!userId) {
      console.error("[Stripe] Missing userId in request body");
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
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        metadata: { userId },
        success_url: `${process.env.APP_URL}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/api/payment/cancel`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle Stripe Redirects for Popups
  app.get("/api/payment/success", async (req, res) => {
    const sessionId = req.query.session_id as string;
    console.log(`Payment success redirect hit. Session ID: ${sessionId}`);
    
    let status = "pending";
    if (sessionId && stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log(`Retrieved session: ${session.id}, status: ${session.payment_status}`);
        
        if (session.payment_status === 'paid' || session.status === 'complete') {
          const userId = session.metadata?.userId;
          console.log(`[Stripe Success] Session ${session.id} is paid/complete. Metadata userId: ${userId}`);
          
          if (userId) {
            const userRef = db.collection("users").doc(userId);
            const today = new Date().toLocaleDateString('en-CA');
            
            console.log(`[Stripe Success] Updating Firestore for user ${userId}...`);
            await userRef.set({
              isPremium: true,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              updatedAt: FieldValue.serverTimestamp(),
              lastScanDate: today,
            }, { merge: true });
            
            status = "success";
            console.log(`[Stripe Success] User ${userId} successfully upgraded to Premium!`);
          } else {
            status = "error_no_userid";
            console.error(`[Stripe Success] No userId found in session metadata for session ${session.id}`);
          }
        } else {
          status = "error_not_paid";
          console.warn(`[Stripe Success] Session ${session.id} not paid. Status: ${session.payment_status}. Session status: ${session.status}`);
        }
      } catch (error) {
        status = "error_exception";
        console.error("Error verifying session on success:", error);
      }
    } else {
      status = "error_no_session";
      console.error("No session ID or Stripe not configured");
    }

    res.send(`
      <html>
        <head>
          <title>Payment Successful</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f4f5; }
            .card { background: white; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            h1 { color: #10b981; margin-top: 0; }
            p { color: #71717a; line-height: 1.5; }
            .status { font-size: 0.75rem; color: #a1a1aa; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Success!</h1>
            <p>Your payment was successful and your account is being upgraded. This window will close automatically.</p>
            <div class="status">Status: ${status}</div>
          </div>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'PAYMENT_SUCCESS', status: '${status}' }, '*');
                window.close();
              } else {
                window.location.href = '/?payment=success&status=${status}';
              }
            }, 2000);
          </script>
        </body>
      </html>
    `);
  });

  app.get("/api/payment/cancel", (req, res) => {
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'PAYMENT_CANCEL' }, '*');
              window.close();
            } else {
              window.location.href = '/?payment=cancel';
            }
          </script>
          <p>Payment cancelled. You can close this window.</p>
        </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
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
