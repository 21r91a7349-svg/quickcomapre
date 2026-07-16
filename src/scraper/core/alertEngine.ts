import { prisma } from './db';

// Mock Notification Providers
async function sendEmailAlert(address: string, message: string) {
  console.log(`[EMAIL ALERT] To: ${address} | Message: ${message}`);
}

async function sendPushAlert(address: string, message: string) {
  console.log(`[PUSH ALERT] To: ${address} | Message: ${message}`);
}

async function sendWhatsAppAlert(address: string, message: string) {
  console.log(`[WHATSAPP ALERT] To: ${address} | Message: ${message}`);
}

/**
 * Evaluates alerts for a given product after its listings are updated.
 */
export async function evaluateAlertsForProduct(productId: string) {
  try {
    // 1. Fetch product with active alerts
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        alerts: {
          where: { isActive: true }
        },
        listings: {
          where: { inStock: true }
        }
      }
    });

    if (!product || product.alerts.length === 0 || product.listings.length === 0) {
      return;
    }

    // 2. Determine current best price
    let currentBestPrice = Infinity;
    for (const listing of product.listings) {
      const price = Number(listing.currentPrice);
      if (price < currentBestPrice) {
        currentBestPrice = price;
      }
    }

    if (currentBestPrice === Infinity) return;

    // 3. Evaluate each alert
    for (const alert of product.alerts) {
      const targetPrice = Number(alert.targetPrice);
      let conditionMet = false;

      if (alert.condition === 'BELOW' && currentBestPrice < targetPrice) {
        conditionMet = true;
      } else if (alert.condition === 'ABOVE' && currentBestPrice > targetPrice) {
        conditionMet = true;
      }

      // Prevent duplicate notifications: 
      // 24-hour cooldown
      const COOLDOWN_MS = 24 * 60 * 60 * 1000;
      const now = new Date();
      
      const isOnCooldown = alert.lastTriggeredAt 
        ? (now.getTime() - alert.lastTriggeredAt.getTime() < COOLDOWN_MS)
        : false;

      if (conditionMet && !isOnCooldown) {
        // Prepare Message
        const conditionText = alert.condition === 'BELOW' ? 'dropped below' : 'risen above';
        const message = `Alert! ${product.display_name} has ${conditionText} ₹${targetPrice}. Current best price is ₹${currentBestPrice}.`;

        // Send Mock Notification
        if (alert.contactMethod === 'EMAIL') {
          await sendEmailAlert(alert.contactAddress, message);
        } else if (alert.contactMethod === 'PUSH') {
          await sendPushAlert(alert.contactAddress, message);
        } else if (alert.contactMethod === 'WHATSAPP') {
          await sendWhatsAppAlert(alert.contactAddress, message);
        }

        // 4. Update the alert to mark as triggered
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: now }
        });
      }
    }
  } catch (error) {
    console.error(`Error evaluating alerts for product ${productId}:`, error);
  }
}
