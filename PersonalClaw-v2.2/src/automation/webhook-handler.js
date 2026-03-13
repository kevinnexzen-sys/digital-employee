import { createLogger } from '../utils/logger.js';
import express from 'express';
import crypto from 'crypto';

const logger = createLogger('WebhookHandler');

class WebhookHandler {
  constructor() {
    this.app = express();
    this.server = null;
    this.webhooks = new Map();
    this.app.use(express.json());
  }

  start(port = 3001) {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', webhooks: this.webhooks.size });
    });

    this.app.post('/webhook/:id', async (req, res) => {
      const { id } = req.params;
      const webhook = this.webhooks.get(id);

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      // Verify signature if secret is set
      if (webhook.secret) {
        const signature = req.headers['x-webhook-signature'];
        const expectedSignature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (signature !== expectedSignature) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      try {
        await webhook.handler(req.body, req.headers);
        res.json({ success: true });
      } catch (error) {
        logger.error(`Webhook ${id} error:`, error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });

    this.server = this.app.listen(port, () => {
      logger.info(`Webhook server listening on port ${port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      logger.info('Webhook server stopped');
    }
  }

  registerWebhook(id, handler, secret = null) {
    this.webhooks.set(id, { handler, secret });
    logger.info(`Registered webhook: ${id}`);
  }

  unregisterWebhook(id) {
    this.webhooks.delete(id);
    logger.info(`Unregistered webhook: ${id}`);
  }

  listWebhooks() {
    return Array.from(this.webhooks.keys());
  }
}

export default new WebhookHandler();
