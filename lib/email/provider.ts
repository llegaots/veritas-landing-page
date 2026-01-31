// Email Provider Abstraction
// Supports multiple providers (Resend, Gmail/SMTP, SendGrid, etc.) with a unified interface

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text fallback
  from?: string; // From email address
  replyTo?: string; // Reply-to email address
  metadata?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  status?: string;
  messageId?: string;
  error?: string;
}

/**
 * Send email via configured provider
 * Supports: 'resend', 'gmail' (SMTP), 'smtp', 'mock'
 */
export async function sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
  const provider = process.env.EMAIL_PROVIDER || 'resend';

  switch (provider) {
    case 'resend':
      return sendViaResend(options);
    case 'gmail':
    case 'smtp':
      return sendViaSmtp(options);
    case 'mock':
      return sendViaMock(options);
    default:
      throw new Error(`Unsupported email provider: ${provider}`);
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(options: EmailSendOptions): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = options.from || process.env.EMAIL_FROM || 'alex@veritasequitypartners.com';

  if (!apiKey) {
    return {
      success: false,
      error: 'Resend API key not configured',
    };
  }

  // TEST MODE: Only send emails to test email addresses (if enabled)
  // Default to true for safety - only send to test addresses unless explicitly disabled
  const testMode = process.env.EMAIL_TEST_MODE !== 'false'; // Default to true
  const TEST_EMAILS = (process.env.EMAIL_TEST_ADDRESSES || 'lucaslegatos123@gmail.com').split(',').map(e => e.trim());
  
  if (testMode) {
    const isTestEmail = TEST_EMAILS.some(testEmail => 
      options.to.toLowerCase().includes(testEmail.toLowerCase())
    );
    
    if (!isTestEmail) {
      console.log(`[EMAIL] Skipping email to ${options.to} - only sending to test emails ${TEST_EMAILS.join(', ')} during testing`);
      return {
        success: false,
        error: `Email blocked: Only test email addresses (${TEST_EMAILS.join(', ')}) allowed during testing. Set EMAIL_TEST_MODE=false to allow all emails.`,
      };
    }
  }

  try {
    // Dynamic import to avoid bundling Resend in client
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    console.log('[Resend] Sending email:', {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      htmlLength: options.html.length,
    });

    // Ensure proper UTF-8 encoding for subject line
    const encodeSubject = (subject: string): string => {
      // Resend handles UTF-8 automatically, but ensure it's a valid string
      return subject;
    };
    
    const emailOptions: any = {
      from: fromEmail,
      to: options.to,
      subject: encodeSubject(options.subject),
      html: options.html,
    };
    
    if (options.text) {
      emailOptions.text = options.text;
    }
    
    if (options.replyTo) {
      emailOptions.replyTo = options.replyTo;
    }
    
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('[Resend] Error sending email:', error);
      return {
        success: false,
        error: error.message || 'Unknown Resend error',
      };
    }

    console.log('[Resend] Email sent:', {
      id: data?.id,
      to: options.to,
    });

    return {
      success: true,
      status: 'sent',
      messageId: data?.id,
    };
  } catch (error) {
    console.error('[Resend] Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Resend error',
    };
  }
}

/**
 * Send email via SMTP (Gmail or other SMTP servers)
 */
async function sendViaSmtp(options: EmailSendOptions): Promise<EmailSendResult> {
  try {
    // Dynamic import to avoid bundling nodemailer in client
    const nodemailer = await import('nodemailer');

    // Check if using OAuth2 (refresh token provided)
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    let accessToken: string | undefined;
    let smtpUser: string | undefined;
    let smtpPassword: string | undefined;

    if (refreshToken) {
      // Use OAuth2 with Gmail API (more reliable than SMTP with OAuth2)
      try {
        const { getValidAccessToken, getUserEmail, getOAuth2Client } = await import('./oauth');
        const { google } = await import('googleapis');
        
        accessToken = await getValidAccessToken(refreshToken);
        smtpUser = await getUserEmail(accessToken);
        
        // Use Gmail API instead of SMTP for OAuth2
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
          refresh_token: refreshToken,
          access_token: accessToken,
        });
        
        const gmail = google.gmail({
          version: 'v1',
          auth: oauth2Client,
        });
        
        const fromEmail = options.from || process.env.EMAIL_FROM || 'alex@veritasequitypartners.com';
        
        // TEST MODE: Only send emails to test email addresses (if enabled)
        // Default to true for safety - only send to test addresses unless explicitly disabled
        const testMode = process.env.EMAIL_TEST_MODE !== 'false'; // Default to true
        const TEST_EMAILS = (process.env.EMAIL_TEST_ADDRESSES || 'lucaslegatos123@gmail.com').split(',').map(e => e.trim());
        
        if (testMode) {
          const isTestEmail = TEST_EMAILS.some(testEmail => 
            options.to.toLowerCase().includes(testEmail.toLowerCase())
          );
          
          if (!isTestEmail) {
            console.log(`[EMAIL] Skipping email to ${options.to} - only sending to test emails ${TEST_EMAILS.join(', ')} during testing`);
            return {
              success: false,
              error: `Email blocked: Only test email addresses (${TEST_EMAILS.join(', ')}) allowed during testing. Set EMAIL_TEST_MODE=false to allow all emails.`,
            };
          }
        }
        
        // Create email message in RFC 2822 format
        // Encode subject line properly for UTF-8 special characters
        const encodeSubject = (subject: string): string => {
          // Check if subject contains non-ASCII characters
          const hasNonAscii = /[^\x00-\x7F]/.test(subject);
          if (hasNonAscii) {
            // Use RFC 2047 encoding for non-ASCII characters
            return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
          }
          return subject;
        };
        
        // Ensure HTML content is complete and not truncated
        let htmlContent = options.html || '';
        
        // Validate HTML structure
        const hasOpeningTable = htmlContent.includes('<table');
        const hasClosingTable = htmlContent.includes('</table>');
        const tableCount = (htmlContent.match(/<table/g) || []).length;
        const closingTableCount = (htmlContent.match(/<\/table>/g) || []).length;
        
        console.log(`[Gmail API] HTML validation:`, {
          length: htmlContent.length,
          hasOpeningTable,
          hasClosingTable,
          tableCount,
          closingTableCount,
          firstChars: htmlContent.substring(0, 100),
          lastChars: htmlContent.substring(Math.max(0, htmlContent.length - 100)),
        });
        
        // Check if HTML appears truncated (missing closing tags)
        if (tableCount > closingTableCount) {
          console.warn(`[Gmail API] WARNING: HTML appears incomplete - ${tableCount} opening <table> tags but only ${closingTableCount} closing </table> tags`);
        }
        
        // Wrap HTML in proper email structure if it's not already wrapped
        // Some email clients require full HTML document structure
        if (!htmlContent.trim().toLowerCase().startsWith('<!doctype') && !htmlContent.trim().toLowerCase().startsWith('<html')) {
          // Ensure the HTML is wrapped in a proper document structure
          htmlContent = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
${htmlContent}
</body>
</html>`;
        }
        
        console.log(`[Gmail API] Final HTML content length: ${htmlContent.length} chars`);
        console.log(`[Gmail API] HTML preview (first 300 chars): ${htmlContent.substring(0, 300)}`);
        console.log(`[Gmail API] HTML preview (last 300 chars): ${htmlContent.substring(Math.max(0, htmlContent.length - 300))}`);
        
        // Construct email message - use simple HTML format for better compatibility
        // Gmail API works best with simple, direct HTML emails
        const emailContent = [
          `From: ${fromEmail}`,
          `To: ${options.to}`,
          `Subject: ${encodeSubject(options.subject)}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          options.replyTo ? `Reply-To: ${options.replyTo}` : '',
          '',
          htmlContent,
        ].filter(Boolean).join('\r\n');
        
        // Verify email content length before encoding
        console.log(`[Gmail API] Full email content length: ${emailContent.length} chars`);
        console.log(`[Gmail API] Email content starts with: ${emailContent.substring(0, 150)}`);
        console.log(`[Gmail API] Email content ends with: ${emailContent.substring(Math.max(0, emailContent.length - 150))}`);
        
        // Encode message in base64url format (Gmail API requirement)
        // Use UTF-8 encoding to preserve all characters
        const emailBuffer = Buffer.from(emailContent, 'utf-8');
        console.log(`[Gmail API] Email buffer length: ${emailBuffer.length} bytes`);
        
        const encodedMessage = emailBuffer
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        console.log(`[Gmail API] Encoded message length: ${encodedMessage.length} chars`);
        
        // Verify the encoded message can be decoded back correctly
        try {
          const decodedTest = Buffer.from(encodedMessage.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
          console.log(`[Gmail API] Decode test: original=${emailContent.length} chars, decoded=${decodedTest.length} chars, match=${emailContent === decodedTest}`);
          if (emailContent !== decodedTest) {
            console.error(`[Gmail API] WARNING: Encoded message does not decode correctly!`);
          }
        } catch (e) {
          console.error(`[Gmail API] Error testing decode:`, e);
        }
        
        console.log('[Gmail API] Sending email:', {
          to: options.to,
          from: fromEmail,
          subject: options.subject,
          htmlLength: options.html.length,
        });
        
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });
        
        console.log('[Gmail API] Email sent:', {
          messageId: response.data.id,
          to: options.to,
        });
        
        return {
          success: true,
          status: 'sent',
          messageId: response.data.id || undefined,
        };
      } catch (error) {
        console.error('[Gmail API] OAuth2 error:', error);
        return {
          success: false,
          error: `OAuth2 authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    } else {
      // Use password-based auth
      smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
      smtpPassword = process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
    }

    // Get SMTP configuration from environment variables
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465; // Use TLS for port 587, SSL for 465
    
    // For OAuth2, you can send from any email address your account has permission to send from
    // This includes custom domain emails (like lucas@neptaai.com) if they're set up in Google Workspace
    // or configured as "Send mail as" in Gmail
    const fromEmail = options.from || process.env.EMAIL_FROM || 'alex@veritasequitypartners.com';

    if (!smtpUser || (!smtpPassword && !accessToken)) {
      return {
        success: false,
        error: 'SMTP credentials not configured. Set GMAIL_REFRESH_TOKEN (for OAuth2) or SMTP_USER/SMTP_PASSWORD (for password auth)',
      };
    }

    // TEST MODE: Only send emails to test email addresses (if enabled)
    // Default to true for safety - only send to test addresses unless explicitly disabled
    const testMode = process.env.EMAIL_TEST_MODE !== 'false'; // Default to true
    const TEST_EMAILS = (process.env.EMAIL_TEST_ADDRESSES || 'lucaslegatos123@gmail.com').split(',').map(e => e.trim());
    
    if (testMode) {
      const isTestEmail = TEST_EMAILS.some(testEmail => 
        options.to.toLowerCase().includes(testEmail.toLowerCase())
      );
      
      if (!isTestEmail) {
        console.log(`[EMAIL] Skipping email to ${options.to} - only sending to test emails ${TEST_EMAILS.join(', ')} during testing`);
        return {
          success: false,
          error: `Email blocked: Only test email addresses (${TEST_EMAILS.join(', ')}) allowed during testing. Set EMAIL_TEST_MODE=false to allow all emails.`,
        };
      }
    }

    // Create transporter
    const transporterConfig: any = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
    };

    if (accessToken) {
      // OAuth2 authentication
      transporterConfig.auth = {
        type: 'OAuth2',
        user: smtpUser,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: refreshToken,
        accessToken: accessToken,
      };
    } else {
      // Password authentication
      transporterConfig.auth = {
        user: smtpUser,
        pass: smtpPassword,
      };
    }

    // Gmail-specific settings
    if (smtpHost.includes('gmail.com')) {
      transporterConfig.service = 'gmail';
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    console.log('[SMTP] Sending email:', {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      htmlLength: options.html.length,
      host: smtpHost,
      port: smtpPort,
    });

    // Ensure proper UTF-8 encoding for subject line
    const encodeSubject = (subject: string): string => {
      // Nodemailer handles UTF-8 automatically, but ensure it's a valid string
      return subject;
    };
    
    // Send email
    const info = await transporter.sendMail({
      from: fromEmail,
      to: options.to,
      subject: encodeSubject(options.subject),
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      encoding: 'utf-8', // Explicitly set UTF-8 encoding
    });

    console.log('[SMTP] Email sent:', {
      messageId: info.messageId,
      to: options.to,
    });

    return {
      success: true,
      status: 'sent',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[SMTP] Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SMTP error',
    };
  }
}

/**
 * Mock email provider for testing
 */
async function sendViaMock(options: EmailSendOptions): Promise<EmailSendResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In mock mode, always succeed
  console.log('[MOCK EMAIL]', {
    to: options.to,
    subject: options.subject,
    htmlLength: options.html.length,
    metadata: options.metadata,
  });

  return {
    success: true,
    status: 'sent',
    messageId: `mock_email_${Date.now()}`,
  };
}

