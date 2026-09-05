import twilio from 'twilio';
import { config } from '../config.js';

const notificationLogs = [];

let twilioClient = null;
if (config.twilio.accountSid && config.twilio.authToken && config.twilio.phoneNumber) {
  try {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
    console.log('[NotificationService] Twilio SMS client initialized.');
  } catch (err) {
    console.error('[NotificationService] Failed to initialize Twilio client:', err.message);
  }
} else {
  console.log('[NotificationService] Twilio credentials not fully set. Running in MOCK SMS mode.');
}

/**
 * Dispatch an emergency SMS alert
 */
export async function sendEmergencyAlert({ requestId, recipientPhone, recipientRole, message, priorityLevel }) {
  const logEntry = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    requestId,
    recipientPhone,
    recipientRole,
    message,
    priorityLevel,
    timestamp: new Date().toISOString(),
    status: 'SENT',
    provider: twilioClient ? 'TWILIO' : 'MOCK_CONSOLE'
  };

  if (twilioClient) {
    try {
      const res = await twilioClient.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: recipientPhone
      });
      logEntry.providerSid = res.sid;
      logEntry.status = res.status || 'SENT';
      console.log(`[Twilio SMS] Alert sent to ${recipientPhone} (SID: ${res.sid})`);
    } catch (err) {
      console.error(`[Twilio SMS Error] Could not send to ${recipientPhone}:`, err.message);
      logEntry.status = 'FAILED';
      logEntry.error = err.message;
    }
  } else {
    // Mock simulation logging
    console.log(`\n================== [EMERGENCY SMS DISPATCH - MOCK] ==================`);
    console.log(`TO: ${recipientPhone} [Role: ${recipientRole}]`);
    console.log(`PRIORITY: [${priorityLevel}]`);
    console.log(`MESSAGE: ${message}`);
    console.log(`====================================================================\n`);
  }

  notificationLogs.unshift(logEntry);
  if (notificationLogs.length > 200) notificationLogs.pop();

  return logEntry;
}

export function getNotificationLogs() {
  return notificationLogs;
}
