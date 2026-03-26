import bodyParser from "body-parser";
import express from "express";
import admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import Stripe from "stripe";

type FirebaseConfig = {
  projectId?: string;
  firestoreDatabaseId?: string;
};

function loadFirebaseConfig(): FirebaseConfig {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");

  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf8")) as FirebaseConfig;
    } catch (error) {
      console.error("Failed to parse firebase-applet-config.json:", error);
    }
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
    firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID,
  };
}

const firebaseConfig = loadFirebaseConfig();

const adminApp =
  admin.apps.length > 0
    ? admin.app()
    : (() => {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            return admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: firebaseConfig.projectId,
            });
          } catch (error) {
            console.error("Failed to initialize Firebase Admin with key:", error);
          }
        }

        return admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      })();

const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(adminApp);

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn("STRIPE_SECRET_KEY is not set. Stripe features will not work.");
}

const app = express();

app.post("/api/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  if (!stripe) {
    return res.status(500).send("Stripe is not configured.");
  }

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId) {
      try {
        const userRef = db.collection("users").doc(userId);
        await userRef.set(
          {
            isPremium: true,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error(`Error updating user ${userId} via webhook:`, error);
      }
    }
  } else if (event.type === "customer.subscription.deleted") {
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
      }
    } catch (error) {
      console.error("Error handling subscription cancellation:", error);
    }
  }

  return res.json({ received: true });
});

app.use(express.json());

app.post("/api/create-checkout-session", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  if (!stripe) {
    return res.status(500).json({ error: "Stripe is not configured." });
  }

  try {
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = req.headers.host;
    const appUrl = process.env.APP_URL || `${proto}://${host}`;

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
            unit_amount: 299,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: { userId },
      success_url: `${appUrl}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/api/payment/cancel`,
    });

    return res.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/payment/success", async (req, res) => {
  const sessionId = req.query.session_id as string;
  let status = "pending";

  if (sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid" || session.status === "complete") {
        const userId = session.metadata?.userId;

        if (userId) {
          const userRef = db.collection("users").doc(userId);
          const today = new Date().toLocaleDateString("en-CA");

          await userRef.set(
            {
              isPremium: true,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              updatedAt: FieldValue.serverTimestamp(),
              lastScanDate: today,
            },
            { merge: true }
          );

          status = "success";
        } else {
          status = "error_no_userid";
        }
      } else {
        status = "error_not_paid";
      }
    } catch (error) {
      console.error("Error verifying session on success:", error);
      status = "error_exception";
    }
  } else {
    status = "error_no_session";
  }

  return res.send(`
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

app.get("/api/payment/cancel", (_req, res) => {
  return res.send(`
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

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default app;
