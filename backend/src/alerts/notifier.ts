/**
 * Notification channels for alerts
 */

export type NotificationChannel = 'email' | 'in_app' | 'push';

export interface Notification {
  userId: string;
  channel: NotificationChannel;
  subject?: string;
  message: string;
  severity: 'info' | 'warn' | 'critical';
  metadata?: any;
}

/**
 * Notification service interface
 */
export interface NotificationService {
  send(notification: Notification): Promise<boolean>;
}

/**
 * Email notification service (stub implementation)
 */
export class EmailNotificationService implements NotificationService {
  async send(notification: Notification): Promise<boolean> {
    // TODO: Implement email sending (SMTP, SendGrid, etc.)
    console.log(`[EMAIL] To: ${notification.userId}, Subject: ${notification.subject}, Message: ${notification.message}`);
    return true;
  }
}

/**
 * In-app notification service (stores in database)
 */
export class InAppNotificationService implements NotificationService {
  async send(notification: Notification): Promise<boolean> {
    // In-app notifications are stored in alerts table
    // They will be retrieved via API
    console.log(`[IN-APP] User: ${notification.userId}, Message: ${notification.message}`);
    return true;
  }
}

/**
 * Push notification service (stub implementation)
 */
export class PushNotificationService implements NotificationService {
  async send(notification: Notification): Promise<boolean> {
    // TODO: Implement push notifications (FCM, APNs, etc.)
    console.log(`[PUSH] User: ${notification.userId}, Message: ${notification.message}`);
    return true;
  }
}

/**
 * Multi-channel notification service
 */
export class NotificationServiceManager {
  private services: Map<NotificationChannel, NotificationService>;

  constructor() {
    this.services = new Map();
    this.services.set('email', new EmailNotificationService());
    this.services.set('in_app', new InAppNotificationService());
    this.services.set('push', new PushNotificationService());
  }

  async send(notification: Notification): Promise<boolean> {
    const service = this.services.get(notification.channel);
    if (!service) {
      console.error(`No notification service for channel: ${notification.channel}`);
      return false;
    }

    try {
      return await service.send(notification);
    } catch (error) {
      console.error(`Error sending notification:`, error);
      return false;
    }
  }

  async sendToMultipleChannels(
    notification: Omit<Notification, 'channel'>,
    channels: NotificationChannel[]
  ): Promise<boolean[]> {
    const results = await Promise.all(
      channels.map(channel => this.send({ ...notification, channel }))
    );
    return results;
  }
}

// Singleton instance
export const notificationManager = new NotificationServiceManager();

/**
 * Create notification from alert
 */
export function createNotificationFromAlert(
  alert: any,
  channels: NotificationChannel[] = ['in_app']
): Notification {
  return {
    userId: alert.user_id,
    channel: channels[0], // Will be sent to multiple channels
    subject: `Alert: ${alert.message}`,
    message: alert.message,
    severity: alert.severity,
    metadata: alert.metadata
  };
}

