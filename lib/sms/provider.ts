// SMS Provider Abstraction
// Supports multiple providers (Twilio, etc.) with a unified interface

export interface SmsSendOptions {
  to: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface SmsSendResult {
  success: boolean;
  status?: string;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS via configured provider
 * Currently supports Twilio, but designed to be extensible
 */
export async function sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
  const provider = process.env.SMS_PROVIDER || 'twilio';

  switch (provider) {
    case 'twilio':
      return sendViaTwilio(options);
    case 'mock':
      return sendViaMock(options);
    default:
      throw new Error(`Unsupported SMS provider: ${provider}`);
  }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(options: SmsSendOptions): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: 'Twilio credentials not configured',
    };
  }

  try {
    // Dynamic import to avoid bundling Twilio in client
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);

    const message = await client.messages.create({
      body: options.body,
      from: fromNumber,
      to: options.to,
    });

    return {
      success: message.status !== 'failed',
      status: message.status,
      messageId: message.sid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Twilio error',
    };
  }
}

/**
 * Mock SMS provider for testing
 */
async function sendViaMock(options: SmsSendOptions): Promise<SmsSendResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In mock mode, always succeed
  console.log('[MOCK SMS]', {
    to: options.to,
    body: options.body.substring(0, 50) + '...',
    metadata: options.metadata,
  });

  return {
    success: true,
    status: 'sent',
    messageId: `mock_${Date.now()}`,
  };
}

