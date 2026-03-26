import { verifyWebhook } from "@clerk/express/webhooks";
import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

const clerkWebhooks = async (req: Request, res: Response) => {
  try {
    console.log("👉 Webhook route hit");

    const evt = await verifyWebhook(req);

    console.log("✅ Verified event:", evt.type);
    const { data, type } = evt;

    switch (type) {
      case "user.created": {
        await prisma.user.create({
          data: {
            id: data.id,
            email: data.email_addresses[0]?.email_address,
            name: data?.first_name + " " + data?.last_name,
            image: data?.image_url,
          },
        });
        break;
      }

      case "user.updated": {
        await prisma.user.update({
          where: {
            id: data.id,
          },
          data: {
            email: data.email_addresses[0]?.email_address,
            name: data?.first_name + " " + data?.last_name,
            image: data?.image_url,
          },
        });
        break;
      }

      case "user.deleted": {
        await prisma.user.deleteMany({
          where: {
            id: data.id,
          },
        });
        break;
      }

      case "paymentAttempt.updated": {
        if (
          (data.charge_type === "recurring" ||
            data.charge_type === "checkout") &&
          data.status === "paid"
        ) {
          const credits = { pro: 80, premium: 240 };

          const clerkUserId = data?.payer?.user_id;
          const planId = data?.subscription_items?.[0]?.plan?.slug;

          if (!clerkUserId) {
            return res.status(400).json({ message: "missing user id" });
          }

          if (!planId || !(planId in credits)) {
            return res.status(400).json({ message: "invalid plan" });
          }

          const validPlanId = planId as keyof typeof credits;

          await prisma.user.update({
            where: { id: clerkUserId },
            data: {
              credits: {
                increment: credits[validPlanId],
              },
            },
          });
        }
        break;
      }
      default:
        break;
    }
    res.json({ message: "webhook recieved: " + type });
  } catch (error: any) {
    console.error("❌ FULL ERROR:", error); // ADD THIS
    res.status(500).json({ message: error.message });
  }
};

export default clerkWebhooks;
