/**
 * SMS Provider - Stub implementation
 * SMS functionality has been removed, but this stub exists to maintain compatibility
 * with existing cron jobs and database records.
 */

export interface SendSmsOptions {
  to: string;
  body: string;
  metadata?: {
    job_id?: string;
    run_id?: string;
    node_id?: string;
  };
}

export interface SendSmsResult {
  success: boolean;
  status: string;
  error?: string;
  messageId?: string;
}

/**
 * Stub SMS provider - does not actually send SMS messages
 * Returns success to prevent cron job failures
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  // Log for debugging but don't actually send
  console.log('[SMS Stub] Would send SMS:', {
    to: options.to,
    body: options.body.substring(0, 50) + '...',
    metadata: options.metadata,
  });

  // Return success to prevent job failures
  return {
    success: true,
    status: 'stub_success',
    messageId: `stub_${Date.now()}`,
  };
}

