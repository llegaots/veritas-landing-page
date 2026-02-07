// Email Provider Abstraction
// Supports Gmail/SMTP with a unified interface

/**
 * Convert buttons and links in HTML to email-friendly inline-styled versions
 * Email clients strip CSS classes and <style> tags, so buttons need inline styles
 */
function convertButtonsToEmailFriendly(html: string): string {
  // Convert <button> elements to <a> elements with inline styles (email clients don't support <button> well)
  html = html.replace(
    /<button([^>]*)>(.*?)<\/button>/gi,
    (match, attrs, content) => {
      // Extract href from data-href, onclick, or find first link in content
      let href = '#';
      const dataHrefMatch = attrs.match(/data-href=["']([^"']+)["']/);
      const onclickMatch = attrs.match(/onclick=["'][^"']*["'](https?:\/\/[^\s"']+)/);
      const contentLinkMatch = content.match(/href=["']([^"']+)["']/) || content.match(/(https?:\/\/[^\s<>"']+)/);
      
      if (dataHrefMatch) {
        href = dataHrefMatch[1];
      } else if (onclickMatch) {
        href = onclickMatch[1];
      } else if (contentLinkMatch) {
        href = contentLinkMatch[1];
      }
      
      // Check if button has blue/primary styling (common patterns)
      const isBlue = /bg-blue|bg-primary|blue|primary|btn-primary|button-primary/i.test(attrs);
      
      // Default button styles for email (blue button)
      const buttonStyles = [
        'display: inline-block',
        'padding: 12px 24px',
        'text-decoration: none',
        'border-radius: 6px',
        'font-weight: 600',
        'text-align: center',
        'font-size: 16px',
        'line-height: 1.5',
        'background-color: #2563eb',
        'color: #ffffff',
        'border: none',
      ].join('; ');
      
      // Extract existing inline styles if any
      const existingStyleMatch = attrs.match(/style=["']([^"']+)["']/);
      const existingStyles = existingStyleMatch ? existingStyleMatch[1] : '';
      
      // Combine styles (existing styles take precedence, but we ensure button appearance)
      const combinedStyles = existingStyles 
        ? `${buttonStyles}; ${existingStyles}`
        : buttonStyles;
      
      // Clean content (remove any nested <a> tags since we're converting button to <a>)
      const cleanContent = content.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
      
      return `<a href="${href}" style="${combinedStyles}">${cleanContent}</a>`;
    }
  );
  
  // Convert links that look like buttons (have button-like classes) to inline-styled buttons
  html = html.replace(
    /<a([^>]*class=["'][^"']*(?:button|btn)[^"']*["'][^>]*)>(.*?)<\/a>/gi,
    (match, attrs, content) => {
      // Check if it already has comprehensive inline styles (has background-color)
      if (/style=["'][^"']*background[^"']*["']/.test(attrs)) {
        return match; // Already has button styles, don't modify
      }
      
      // Extract href
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/);
      const href = hrefMatch ? hrefMatch[1] : '#';
      
      // Check if it's a blue/primary button
      const isBlue = /bg-blue|bg-primary|blue|primary|btn-primary|button-primary/i.test(attrs);
      
      const buttonStyles = [
        'display: inline-block',
        'padding: 12px 24px',
        'text-decoration: none',
        'border-radius: 6px',
        'font-weight: 600',
        'text-align: center',
        'font-size: 16px',
        'line-height: 1.5',
        'background-color: #2563eb',
        'color: #ffffff',
      ].join('; ');
      
      // Extract existing inline styles
      const existingStyleMatch = attrs.match(/style=["']([^"']+)["']/);
      const existingStyles = existingStyleMatch ? existingStyleMatch[1] : '';
      
      // Combine styles
      const combinedStyles = existingStyles 
        ? `${buttonStyles}; ${existingStyles}`
        : buttonStyles;
      
      // Remove class attribute and update style
      const newAttrs = attrs
        .replace(/class=["'][^"']*["']/gi, '')
        .replace(/style=["'][^"']*["']/gi, '')
        .trim();
      
      return `<a href="${href}" style="${combinedStyles}"${newAttrs ? ' ' + newAttrs : ''}>${content}</a>`;
    }
  );
  
  // Convert plain links that should be buttons (CTA links to Calendly, scheduling, etc.)
  // Pattern: Links to calendly.com or links with CTA text like "Schedule", "Book", "Click here"
  html = html.replace(
    /<a([^>]*href=["']([^"']*(?:calendly|schedule|book|click|sign.?up|register|get.?started)[^"']*)["'][^>]*)>(.*?)<\/a>/gi,
    (match, attrs, href, content) => {
      // Check if it already has button-like inline styles
      if (/style=["'][^"']*background[^"']*color[^"']*["']/.test(attrs) || 
          /style=["'][^"']*background-color[^"']*["']/.test(attrs)) {
        return match; // Already styled as button
      }
      
      // Clean content (remove markdown bold **text** -> text)
      const cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1').trim();
      
      // Check if content looks like a CTA (Schedule, Book, Click, etc.)
      const isCTA = /schedule|book|click|sign.?up|register|get.?started|learn.?more|view|see|try/i.test(cleanContent);
      
      if (isCTA || /calendly/i.test(href)) {
        const buttonStyles = [
          'display: inline-block',
          'padding: 12px 24px',
          'text-decoration: none',
          'border-radius: 6px',
          'font-weight: 600',
          'text-align: center',
          'font-size: 16px',
          'line-height: 1.5',
          'background-color: #2563eb',
          'color: #ffffff',
        ].join('; ');
        
        // Extract existing inline styles
        const existingStyleMatch = attrs.match(/style=["']([^"']+)["']/);
        const existingStyles = existingStyleMatch ? existingStyleMatch[1] : '';
        
        // Combine styles
        const combinedStyles = existingStyles 
          ? `${buttonStyles}; ${existingStyles}`
          : buttonStyles;
        
        // Remove existing style and add new one
        const newAttrs = attrs
          .replace(/style=["'][^"']*["']/gi, '')
          .trim();
        
        return `<a href="${href}" style="${combinedStyles}"${newAttrs ? ' ' + newAttrs : ''}>${cleanContent}</a>`;
      }
      
      return match; // Don't convert if not a CTA
    }
  );
  
  // Also convert links with bold text that look like CTAs (e.g., **Schedule a Call**)
  html = html.replace(
    /<a([^>]*href=["']([^"']+)["'][^>]*)>(.*?\*\*[^*]+\*\*.*?)<\/a>/gi,
    (match, attrs, href, content) => {
      // Check if it already has button-like inline styles
      if (/style=["'][^"']*background[^"']*color[^"']*["']/.test(attrs) || 
          /style=["'][^"']*background-color[^"']*["']/.test(attrs)) {
        return match; // Already styled as button
      }
      
      // Clean content (remove markdown bold **text** -> text)
      const cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1').trim();
      
      // Check if content looks like a CTA
      const isCTA = /schedule|book|click|sign.?up|register|get.?started|learn.?more|view|see|try|call|meeting/i.test(cleanContent);
      
      if (isCTA) {
        const buttonStyles = [
          'display: inline-block',
          'padding: 12px 24px',
          'text-decoration: none',
          'border-radius: 6px',
          'font-weight: 600',
          'text-align: center',
          'font-size: 16px',
          'line-height: 1.5',
          'background-color: #2563eb',
          'color: #ffffff',
        ].join('; ');
        
        // Extract existing inline styles
        const existingStyleMatch = attrs.match(/style=["']([^"']+)["']/);
        const existingStyles = existingStyleMatch ? existingStyleMatch[1] : '';
        
        // Combine styles
        const combinedStyles = existingStyles 
          ? `${buttonStyles}; ${existingStyles}`
          : buttonStyles;
        
        // Remove existing style and add new one
        const newAttrs = attrs
          .replace(/style=["'][^"']*["']/gi, '')
          .trim();
        
        return `<a href="${href}" style="${combinedStyles}"${newAttrs ? ' ' + newAttrs : ''}>${cleanContent}</a>`;
      }
      
      return match; // Don't convert if not a CTA
    }
  );
  
  // Final pass: Convert ANY link containing common CTA words in its text content
  // This catches cases where the link text itself is a CTA (like "Schedule a Call")
  // Use a more careful regex that preserves the href correctly
  html = html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>((?:[^<]|<(?!\/a>))*?)<\/a>/gi,
    (match, attrsBefore, href, attrsAfter, content) => {
      // Check if it already has button-like inline styles
      const allAttrs = attrsBefore + attrsAfter;
      if (/style=["'][^"']*background[^"']*color[^"']*["']/.test(allAttrs) || 
          /style=["'][^"']*background-color[^"']*["']/.test(allAttrs)) {
        return match; // Already styled as button
      }
      
      // Check if content looks like a CTA
      const cleanContent = content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();
      
      const isCTA = /schedule|book|click|sign.?up|register|get.?started|learn.?more|view|see|try|call|meeting|next.?step/i.test(cleanContent) ||
                    /calendly/i.test(href);
      
      if (!isCTA) {
        return match; // Don't convert if not a CTA
      }
      
      const buttonStyles = [
        'display: inline-block',
        'padding: 12px 24px',
        'text-decoration: none',
        'border-radius: 6px',
        'font-weight: 600',
        'text-align: center',
        'font-size: 16px',
        'line-height: 1.5',
        'background-color: #2563eb',
        'color: #ffffff',
      ].join('; ');
      
      // Extract existing inline styles
      const existingStyleMatch = allAttrs.match(/style=["']([^"']+)["']/);
      const existingStyles = existingStyleMatch ? existingStyleMatch[1] : '';
      
      // Combine styles
      const combinedStyles = existingStyles 
        ? `${buttonStyles}; ${existingStyles}`
        : buttonStyles;
      
      // Remove existing style and class attributes, keep other attributes
      const cleanedAttrs = allAttrs
        .replace(/style=["'][^"']*["']/gi, '')
        .replace(/class=["'][^"']*["']/gi, '')
        .trim();
      
      // Preserve the original content (with markdown if present)
      const preservedContent = content.replace(/\*\*(.*?)\*\*/g, '$1');
      
      return `<a href="${href}" style="${combinedStyles}"${cleanedAttrs ? ' ' + cleanedAttrs : ''}>${preservedContent}</a>`;
    }
  );
  
  // Ensure images are preserved and have proper attributes for email clients
  html = html.replace(
    /<img([^>]*?)>/gi,
    (match, attrs) => {
      // Check if src exists
      const srcMatch = attrs.match(/src=["']([^"']+)["']/);
      if (!srcMatch) {
        return match; // No src, can't fix
      }
      
      // Ensure alt text exists (required for email clients)
      if (!/alt=["']/.test(attrs)) {
        attrs += ' alt=""';
      }
      
      // Ensure style includes display block and max-width for email compatibility
      if (!/style=["']/.test(attrs)) {
        attrs += ' style="display: block; max-width: 100%; height: auto;"';
      } else {
        // Add to existing style if not present
        attrs = attrs.replace(/style=["']([^"']+)["']/, (_m: string, existingStyle: string) => {
          if (!existingStyle.includes('display')) {
            existingStyle += '; display: block;';
          }
          if (!existingStyle.includes('max-width')) {
            existingStyle += '; max-width: 100%; height: auto;';
          }
          return `style="${existingStyle}"`;
        });
      }
      
      return `<img${attrs}>`;
    }
  );
  
  return html;
}

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
 * Supports: 'gmail' (SMTP), 'smtp', 'mock'
 */
export async function sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
  const provider = process.env.EMAIL_PROVIDER || 'gmail';

  switch (provider) {
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
        
        // Convert buttons and links to email-friendly inline-styled versions
        // Email clients strip CSS classes, so we need inline styles for buttons
        htmlContent = convertButtonsToEmailFriendly(htmlContent);
        
        // Wrap HTML in proper email structure if it's not already wrapped
        // Some email clients require full HTML document structure
        if (!htmlContent.trim().toLowerCase().startsWith('<!doctype') && !htmlContent.trim().toLowerCase().startsWith('<html')) {
          htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
${htmlContent}
</body>
</html>`;
        }
        
        console.log(`[Gmail API] HTML content length: ${htmlContent.length} chars`);
        console.log(`[Gmail API] HTML preview (first 200 chars): ${htmlContent.substring(0, 200)}`);
        console.log(`[Gmail API] HTML preview (last 200 chars): ${htmlContent.substring(Math.max(0, htmlContent.length - 200))}`);
        
        // Build email message in RFC 2822 format
        // Ensure proper line breaks and encoding
        const headers = [
          `From: ${fromEmail}`,
          `To: ${options.to}`,
          `Subject: ${encodeSubject(options.subject)}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          options.replyTo ? `Reply-To: ${options.replyTo}` : '',
        ].filter(Boolean);
        
        // Join headers and body with proper line breaks
        // Use \r\n for email format (RFC 2822)
        const emailContent = headers.join('\r\n') + '\r\n\r\n' + htmlContent;
        
        // Verify the full content before encoding
        console.log(`[Gmail API] Full email content length: ${emailContent.length} chars`);
        console.log(`[Gmail API] Email content ends with: ${emailContent.substring(Math.max(0, emailContent.length - 100))}`);
        
        // Encode message in base64url format (Gmail API requirement)
        // Use utf-8 encoding explicitly to ensure no character loss
        const emailBuffer = Buffer.from(emailContent, 'utf-8');
        const encodedMessage = emailBuffer
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        console.log(`[Gmail API] Buffer length: ${emailBuffer.length} bytes`);
        console.log(`[Gmail API] Encoded message length: ${encodedMessage.length} chars`);
        
        console.log('[Gmail API] Sending email:', {
          to: options.to,
          from: fromEmail,
          subject: options.subject,
          originalHtmlLength: options.html.length,
          wrappedHtmlLength: htmlContent.length,
          emailContentLength: emailContent.length,
          encodedMessageLength: encodedMessage.length,
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
    
    // Convert buttons to email-friendly inline-styled versions
    let htmlContent = convertButtonsToEmailFriendly(options.html);
    
    // Send email
    const info = await transporter.sendMail({
      from: fromEmail,
      to: options.to,
      subject: encodeSubject(options.subject),
      html: htmlContent,
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

