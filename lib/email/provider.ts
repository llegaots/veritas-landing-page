// Email Provider Abstraction
// Supports Gmail/SMTP with a unified interface

/**
 * Remove unwanted <br> tags that are between text (not intentional line breaks)
 * This fixes the issue where every line has a <br> tag after it
 */
function removeUnwantedBrTags(html: string): string {
  // Remove <br> tags that are between non-whitespace characters
  // These are likely from textarea wrapping, not intentional line breaks
  let cleaned = html.replace(/([^\s>])\s*<br\s*\/?>\s*([^\s<])/gi, '$1 $2');
  
  // Remove <br> tags that are followed immediately by another <br> (double breaks)
  cleaned = cleaned.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>');
  
  // Remove <br> tags at the start of paragraphs (they're redundant)
  cleaned = cleaned.replace(/<p([^>]*)>\s*<br\s*\/?>\s*/gi, '<p$1>');
  
  console.log('[removeUnwantedBrTags] Removed unwanted <br> tags');
  return cleaned;
}

/**
 * Preserve line breaks in HTML content by converting newlines to <br> tags
 * This ensures that when users press Enter in the editor, it shows as a line break in the email
 * 
 * Rules:
 * - If content has block elements (<p>, <div>, <table>, etc.), preserve as-is (already formatted)
 * - If content is plain text or only has inline tags, convert newlines to <br> or <p> tags
 * - Double newlines (\n\n) create paragraph breaks
 * - Single newlines (\n) are collapsed to spaces (NOT converted to <br>)
 */
function preserveLineBreaks(html: string): string {
  console.log('[preserveLineBreaks] INPUT HTML length:', html.length);
  console.log('[preserveLineBreaks] INPUT HTML preview (first 500):', html.substring(0, 500));
  console.log('[preserveLineBreaks] INPUT HTML has <br> tags:', /<br\s*\/?>/i.test(html));
  console.log('[preserveLineBreaks] INPUT HTML has <p> tags:', /<p[\s>]/i.test(html));
  
  // Check if content already has block-level HTML elements
  // If it does, assume the user has already formatted it correctly
  const hasBlockElements = /<(p|div|table|tr|td|th|section|article|header|footer|h[1-6]|ul|ol|li|blockquote|pre)[\s>]/i.test(html);
  
  console.log('[preserveLineBreaks] Has block elements:', hasBlockElements);
  
  if (hasBlockElements) {
    // Already has block elements - preserve structure, but still convert newlines within text nodes
    // This handles cases where user types text with line breaks inside existing HTML
    // However, we need to be careful not to break existing structure
    // For now, if it has block elements, we'll preserve as-is to avoid breaking structure
    
    // BUT: Remove any unwanted <br> tags that might have been added
    // Check if there are <br> tags that shouldn't be there
    const brCount = (html.match(/<br\s*\/?>/gi) || []).length;
    console.log('[preserveLineBreaks] Found', brCount, '<br> tags in HTML with block elements');
    
    if (brCount > 0) {
      // Remove <br> tags that are between text (likely from textarea wrapping)
      // Keep <br> tags that are at the end of lines or in specific contexts
      const cleaned = html.replace(/([^\s>])\s*<br\s*\/?>\s*([^\s<])/gi, '$1 $2');
      console.log('[preserveLineBreaks] Removed <br> tags between text, cleaned length:', cleaned.length);
      return cleaned;
    }
    
    return html;
  }
  
  // No block elements - safe to convert newlines
  // Normalize line endings first
  let normalized = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Check if there are any HTML tags at all
  const hasAnyTags = /<[a-z][\s\S]*>/i.test(normalized);
  
  if (!hasAnyTags) {
    // Pure plain text - convert newlines
    // Double newlines (\n\n) = paragraph break
    // Single newlines (\n) = collapse to space (don't create <br>)
    // This prevents textarea word-wrapping or copy-paste from creating unwanted line breaks
    // Users can press Enter twice for a paragraph break, or use <br> in HTML if they need a line break
    return normalized
      .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
      .split('\n\n') // Split on double newlines (paragraphs)
      .map(para => {
        const trimmed = para.trim();
        if (!trimmed) return '';
        // Replace single newlines with spaces - this prevents unwanted <br> tags
        // Only double newlines create paragraph breaks
        const cleaned = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' '); // Collapse multiple spaces
        console.log('[preserveLineBreaks] Processed paragraph, original length:', trimmed.length, 'cleaned length:', cleaned.length);
        // Ensure paragraph fills full width of container (no max-width constraint)
        return `<p style="margin: 0 0 1em 0; line-height: 1.5; width: 100%; max-width: 100%;">${cleaned}</p>`;
      })
      .filter(Boolean)
      .join('\n');
  }
  
  // Has some HTML tags but no block elements (might be inline tags like <a>, <strong>, etc.)
  // We need to preserve the tags but convert newlines
  // Split on double newlines first, then process each part
  const parts = normalized
    .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
    .split('\n\n'); // Split on double newlines (paragraphs)
  
  return parts
    .map(para => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      // Replace single newlines with spaces - this prevents unwanted <br> tags
      // Only double newlines create paragraph breaks
      const cleaned = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' '); // Collapse multiple spaces
      // Wrap in paragraph if not already wrapped
      // Ensure paragraph fills full width of container (no max-width constraint)
      if (!/^<p[\s>]/i.test(cleaned)) {
        return `<p style="margin: 0 0 1em 0; line-height: 1.5; width: 100%; max-width: 100%;">${cleaned}</p>`;
      }
      // If already wrapped in <p>, ensure it has width styles
      return cleaned.replace(/<p([^>]*)>/i, (match, attrs) => {
        if (!/style\s*=\s*["']/.test(attrs)) {
          return `<p style="width: 100%; max-width: 100%;"${attrs}>`;
        }
        // Add width to existing style if not present
        return match.replace(/style\s*=\s*["']([^"']+)["']/i, (m, style) => {
          if (!style.includes('width')) {
            return `style="${style}; width: 100%; max-width: 100%;"`;
          }
          return m;
        });
      });
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Convert buttons and links in HTML to email-friendly inline-styled versions
 * Email clients strip CSS classes and <style> tags, so buttons need inline styles
 * 
 * IMPORTANT: This function should only process links that don't already have button styling
 * to avoid double-processing or breaking properly formatted links.
 */
function convertButtonsToEmailFriendly(html: string): string {
  // Track processed links to avoid double-processing
  const processedLinks = new Set<string>();
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
      // Create a unique key for this link to avoid double-processing
      const linkKey = `${href}|${content.substring(0, 50)}`;
      if (processedLinks.has(linkKey)) {
        return match; // Already processed, skip
      }
      
      // Check if it already has button-like inline styles (background-color is the key indicator)
      const allAttrs = attrsBefore + attrsAfter;
      if (/style=["'][^"']*background-color[^"']*["']/.test(allAttrs)) {
        processedLinks.add(linkKey);
        return match; // Already styled as button, don't modify
      }
      
      // Check if content looks like a CTA
      const cleanContent = content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();
      
      const isCTA = /schedule|book|click|sign.?up|register|get.?started|learn.?more|view|see|try|call|meeting|next.?step/i.test(cleanContent) ||
                    /calendly/i.test(href);
      
      if (!isCTA) {
        processedLinks.add(linkKey);
        return match; // Don't convert if not a CTA
      }
      
      // Mark as processed
      processedLinks.add(linkKey);
      
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
      
      // Combine styles (existing styles take precedence for conflicting properties)
      const combinedStyles = existingStyles 
        ? `${buttonStyles}; ${existingStyles}`
        : buttonStyles;
      
      // Remove existing style and class attributes, keep other attributes (like target, rel, etc.)
      const cleanedAttrs = allAttrs
        .replace(/style=["'][^"']*["']/gi, '')
        .replace(/class=["'][^"']*["']/gi, '')
        .trim();
      
      // Preserve the original content (remove markdown bold but keep everything else)
      const preservedContent = content.replace(/\*\*(.*?)\*\*/g, '$1');
      
      // Ensure href is properly escaped and preserved
      const escapedHref = href.replace(/"/g, '&quot;');
      
      return `<a href="${escapedHref}" style="${combinedStyles}"${cleanedAttrs ? ' ' + cleanedAttrs : ''}>${preservedContent}</a>`;
    }
  );
  
  // Ensure images are preserved and have proper attributes for email clients
  html = html.replace(
    /<img([^>]*?)>/gi,
    (match, attrs) => {
      // Check if src exists - handle both quoted and unquoted src
      const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/) || attrs.match(/src\s*=\s*([^\s>]+)/);
      if (!srcMatch) {
        console.warn('[Email] Image tag found without src attribute:', match);
        return match; // No src, can't fix
      }
      
      let srcValue = srcMatch[1];
      
      // If src is a relative URL, warn (email clients need absolute URLs)
      if (srcValue && !srcValue.startsWith('http://') && !srcValue.startsWith('https://') && !srcValue.startsWith('data:') && !srcValue.startsWith('cid:')) {
        console.warn('[Email] Image src appears to be relative URL. Email clients require absolute URLs:', srcValue);
        // Don't modify it - let the user fix it, but log the issue
      }
      
      // Ensure src is preserved (don't modify it, just ensure it's properly quoted)
      let newAttrs = attrs;
      
      // Normalize src attribute to use double quotes
      newAttrs = newAttrs.replace(/src\s*=\s*["']?([^"'\s>]+)["']?/gi, `src="${srcValue}"`);
      
      // Ensure alt text exists (required for email clients, helps with accessibility)
      if (!/alt\s*=\s*["']/.test(newAttrs)) {
        // Try to extract meaningful alt from src filename or use generic
        const altText = srcValue.split('/').pop()?.split('.')[0] || 'Image';
        newAttrs += ` alt="${altText}"`;
      }
      
      // Ensure style includes display block and max-width for email compatibility
      if (!/style\s*=\s*["']/.test(newAttrs)) {
        newAttrs += ' style="display: block; max-width: 100%; height: auto;"';
      } else {
        // Add to existing style if not present
        newAttrs = newAttrs.replace(/style\s*=\s*["']([^"']+)["']/gi, (_m: string, existingStyle: string) => {
          let updatedStyle = existingStyle;
          if (!updatedStyle.includes('display')) {
            updatedStyle += '; display: block;';
          }
          if (!updatedStyle.includes('max-width')) {
            updatedStyle += '; max-width: 100%; height: auto;';
          }
          return `style="${updatedStyle}"`;
        });
      }
      
      // Ensure border="0" for email clients (prevents blue borders on linked images)
      if (!/border\s*=\s*["']/.test(newAttrs)) {
        newAttrs += ' border="0"';
      }
      
      console.log('[Email] Processed image tag:', {
        original: match.substring(0, 100),
        src: srcValue,
        hasAlt: /alt\s*=\s*["']/.test(newAttrs),
        hasStyle: /style\s*=\s*["']/.test(newAttrs),
      });
      
      return `<img${newAttrs}>`;
    }
  );
  
  return html;
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  html?: string; // HTML content (required if text is not provided)
  text?: string; // Plain text content (required if html is not provided)
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
        
        // Check if this is a text-only email
        const isTextOnly = !options.html || options.html.trim().length === 0;
        const hasText = options.text && options.text.trim().length > 0;
        
        if (isTextOnly && !hasText) {
          throw new Error('Email must have either HTML or text content');
        }
        
        // Only process HTML if it exists
        let htmlContent: string | undefined;
        
        if (!isTextOnly && options.html) {
          htmlContent = options.html;
          
          // First, remove any unwanted <br> tags that might already be in the HTML
          htmlContent = removeUnwantedBrTags(htmlContent);
          
          // Then, preserve line breaks (convert newlines to <p> tags, NOT <br>)
          // This ensures that when users press Enter in the editor, it shows as a paragraph break
          console.log('[Gmail API] BEFORE preserveLineBreaks - HTML length:', htmlContent.length);
          console.log('[Gmail API] BEFORE preserveLineBreaks - HTML preview:', htmlContent.substring(0, 300));
          console.log('[Gmail API] BEFORE preserveLineBreaks - has <br> tags:', /<br\s*\/?>/i.test(htmlContent));
          htmlContent = preserveLineBreaks(htmlContent);
          console.log('[Gmail API] AFTER preserveLineBreaks - HTML length:', htmlContent.length);
          console.log('[Gmail API] AFTER preserveLineBreaks - HTML preview:', htmlContent.substring(0, 300));
          console.log('[Gmail API] AFTER preserveLineBreaks - has <br> tags:', /<br\s*\/?>/i.test(htmlContent));
          
          // Final cleanup: remove any <br> tags that were added (shouldn't be any, but just in case)
          htmlContent = removeUnwantedBrTags(htmlContent);
          
          // Check if HTML already has proper button styling (background-color in links)
          // If it does, skip conversion entirely to preserve the exact HTML
          const hasStyledButtons = /<a[^>]*style=["'][^"']*background-color[^"']*["'][^>]*>/i.test(htmlContent);
          const isTableBasedEmail = /<table[^>]*role=["']presentation["']/i.test(htmlContent);
          
          // Skip conversion if:
          // 1. HTML already has styled buttons (user has done the work)
          // 2. It's a table-based email template (common professional email format)
          // This preserves user's exact HTML structure
          if (hasStyledButtons || isTableBasedEmail) {
          console.log('[Gmail API] HTML already has styled buttons or is table-based email, skipping conversion to preserve exact formatting');
          // Still process images to ensure they have proper attributes
          htmlContent = htmlContent.replace(
            /<img([^>]*?)>/gi,
            (match, attrs) => {
              const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/) || attrs.match(/src\s*=\s*([^\s>]+)/);
              if (!srcMatch) return match;
              
              let newAttrs = attrs;
              const srcValue = srcMatch[1];
              
              // Normalize src
              newAttrs = newAttrs.replace(/src\s*=\s*["']?([^"'\s>]+)["']?/gi, `src="${srcValue}"`);
              
              // Ensure alt exists
              if (!/alt\s*=\s*["']/.test(newAttrs)) {
                const altText = srcValue.split('/').pop()?.split('.')[0] || 'Image';
                newAttrs += ` alt="${altText}"`;
              }
              
              // Ensure border="0" for email clients
              if (!/border\s*=\s*["']/.test(newAttrs)) {
                newAttrs += ' border="0"';
              }
              
              return `<img${newAttrs}>`;
            }
          );
        } else {
          console.log('[Gmail API] Converting buttons/links to email-friendly format');
          htmlContent = convertButtonsToEmailFriendly(htmlContent);
        }
        
        // Wrap HTML in proper email structure if it's not already wrapped
        // IMPORTANT: Check if it's a table-based email template (common pattern)
        // Table-based emails should be wrapped in body/html but preserve the table structure
        if (htmlContent) {
          const trimmedHtml = htmlContent.trim();
          const hasDoctype = trimmedHtml.toLowerCase().startsWith('<!doctype');
          const hasHtmlTag = /<html[^>]*>/i.test(trimmedHtml);
          const hasBodyTag = /<body[^>]*>/i.test(trimmedHtml);
          const isTableBased = /<table[^>]*role=["']presentation["']/i.test(trimmedHtml);
          
          // If it's already a complete HTML document, check if it has width container
          if (hasDoctype && hasHtmlTag && hasBodyTag) {
            // Check if it already has a width container table
            const hasWidthContainer = /<table[^>]*role=["']presentation["'][^>]*width\s*=\s*["']600["']/i.test(htmlContent);
            if (hasWidthContainer) {
              // Already complete with width container, use as-is
              console.log('[Gmail API] HTML is already a complete document with width container, using as-is');
            } else {
              // Complete document but no width container - need to add it
              // Extract body content and wrap it
              const bodyStart = htmlContent.indexOf('<body');
              const bodyEnd = htmlContent.indexOf('</body>');
              
              if (bodyStart >= 0 && bodyEnd >= 0) {
                const bodyTagEnd = htmlContent.indexOf('>', bodyStart);
                if (bodyTagEnd >= 0) {
                  const bodyContent = htmlContent.substring(bodyTagEnd + 1, bodyEnd).trim();
                  const bodyTag = htmlContent.substring(bodyStart, bodyTagEnd + 1);
                  
                  htmlContent = htmlContent.substring(0, bodyStart) + bodyTag + `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
${bodyContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>` + htmlContent.substring(bodyEnd + 7);
                  
                  console.log('[Gmail API] Added width container to complete HTML document');
                }
              }
            }
          } else if (hasHtmlTag && hasBodyTag) {
            // Has html and body tags but no doctype, add doctype
            if (!hasDoctype) {
              htmlContent = `<!DOCTYPE html>\n${htmlContent}`;
              console.log('[Gmail API] Added DOCTYPE to existing HTML structure');
            }
          } else if (hasBodyTag && !hasHtmlTag) {
            // Has body tag but no html tag, wrap in html with proper email width container
            // Extract body content and wrap it in proper email structure
            const bodyStart = htmlContent.indexOf('<body');
            const bodyEnd = htmlContent.indexOf('</body>');
            
            let bodyContent = htmlContent;
            if (bodyStart >= 0 && bodyEnd >= 0) {
              const bodyTagEnd = htmlContent.indexOf('>', bodyStart);
              if (bodyTagEnd >= 0) {
                bodyContent = htmlContent.substring(bodyTagEnd + 1, bodyEnd).trim();
              }
            }
            
            // Check if body already has width container
            const hasWidthContainer = /<table[^>]*role=["']presentation["'][^>]*width/i.test(bodyContent);
            
            if (hasWidthContainer) {
              // Already has width container, just wrap in html
              htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
${htmlContent}
</html>`;
            } else {
              // Wrap body content in proper email width container
              htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
${bodyContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
            }
            console.log('[Gmail API] Wrapped body content in HTML structure with proper email width');
          } else if (isTableBased) {
            // Table-based email template - wrap in minimal structure, preserve table
            htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
${htmlContent}
</body>
</html>`;
            console.log('[Gmail API] Wrapped table-based email template in HTML structure');
          } else {
            // No structure at all, wrap everything with proper email width container
            // Use table-based layout for email compatibility (standard email width: 600px)
            htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
${htmlContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
            console.log('[Gmail API] Wrapped content in complete HTML structure with proper email width');
          }
          
          // CRITICAL DEBUG: Log final HTML before sending
          console.log('[SendEmail] Final HTML length:', htmlContent.length);
          console.log('[SendEmail] Final HTML starts:', htmlContent.slice(0, 400));
          console.log('[SendEmail] Final HTML ends:', htmlContent.slice(-400));
          
          // Check for common issues in HTML
          const hasHref = /href=["']([^"']+)["']/i.test(htmlContent);
          const hasImg = /<img[^>]*>/i.test(htmlContent);
          const hasUnescapedAmpersand = /href=["'][^"']*&[^a][^m][^p][^;][^"']*["']/i.test(htmlContent);
          const hasPlaceholder = /\{\{[^}]+\}\}/.test(htmlContent);
          
          console.log('[SendEmail] HTML checks:', {
            hasHref,
            hasImg,
            hasUnescapedAmpersand,
            hasPlaceholder,
          });
          
          if (hasUnescapedAmpersand) {
            console.warn('[SendEmail] WARNING: Found unescaped & in href attributes - Gmail may strip these links!');
          }
          if (hasPlaceholder) {
            console.warn('[SendEmail] WARNING: Found unresolved {{placeholders}} in HTML - variables may not have been rendered!');
          }
        }
        } else {
          console.log('[SendEmail] Text-only email - skipping HTML processing');
          console.log('[SendEmail] Text content length:', options.text?.length || 0);
          console.log('[SendEmail] Text preview (first 200):', options.text?.substring(0, 200) || '');
        }
        
        // Use MailComposer to build proper RFC 2822 message (fixes MIME/header issues)
        // This ensures correct Content-Type, multipart boundaries, and encoding
        const MailComposer = (await import('nodemailer/lib/mail-composer')).default;
        
        const mailOptions = {
          from: fromEmail,
          to: options.to,
          subject: encodeSubject(options.subject),
          html: isTextOnly ? undefined : htmlContent, // Explicitly undefined for text-only
          text: options.text || undefined,
          replyTo: options.replyTo || undefined,
        };
        
        console.log('[SendEmail] MailComposer options:', {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          isTextOnly,
          hasHtml: !!mailOptions.html,
          htmlValue: mailOptions.html === undefined ? 'undefined' : (mailOptions.html === null ? 'null' : `string(${mailOptions.html.length})`),
          htmlLength: mailOptions.html?.length || 0,
          hasText: !!mailOptions.text,
          textLength: mailOptions.text?.length || 0,
        });
        
        // CRITICAL: For text-only emails, ensure html is explicitly undefined (not null or empty string)
        if (isTextOnly) {
          if (mailOptions.html !== undefined) {
            console.error('[SendEmail] ERROR: Text-only email but html is not undefined!', {
              htmlType: typeof mailOptions.html,
              htmlValue: mailOptions.html,
            });
            // Force it to undefined
            mailOptions.html = undefined;
          }
          console.log('[SendEmail] CONFIRMED: Text-only email, html is undefined');
        }
        
        const composer = new MailComposer(mailOptions);
        const message = await composer.compile().build();
        
        // Verify the message structure
        const messageStr = message.toString('utf-8');
        
        // Extract headers for debugging
        const headerEnd = messageStr.indexOf('\r\n\r\n');
        const headers = headerEnd > 0 ? messageStr.substring(0, headerEnd) : '';
        const body = headerEnd > 0 ? messageStr.substring(headerEnd + 4) : messageStr;
        
        console.log('[SendEmail] Final headers:', headers);
        console.log('[SendEmail] Final message body starts:', body.slice(0, 400));
        console.log('[SendEmail] Final message body ends:', body.slice(-400));
        
        // Check Content-Type in the built message
        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
        console.log('[SendEmail] Content-Type in message:', contentTypeMatch ? contentTypeMatch[1] : 'NOT FOUND');
        
        // Check if it's multipart
        const isMultipart = /multipart\/alternative/i.test(headers);
        console.log('[SendEmail] Is multipart/alternative:', isMultipart);
        
        // Encode message in base64url format (Gmail API requirement)
        const encodedMessage = message
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        console.log('[Gmail API] Sending email:', {
          to: options.to,
          from: fromEmail,
          subject: options.subject,
          originalHtmlLength: options.html?.length || 0,
          wrappedHtmlLength: htmlContent?.length || 0,
          messageLength: message.length,
          encodedMessageLength: encodedMessage.length,
          contentType: contentTypeMatch ? contentTypeMatch[1] : 'unknown',
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
      htmlLength: options.html?.length || 0,
      textLength: options.text?.length || 0,
      isTextOnly: !options.html,
      host: smtpHost,
      port: smtpPort,
    });

    // Ensure proper UTF-8 encoding for subject line
    const encodeSubject = (subject: string): string => {
      // Nodemailer handles UTF-8 automatically, but ensure it's a valid string
      return subject;
    };
    
    // Convert buttons to email-friendly inline-styled versions (only if HTML exists)
    let htmlContent: string | undefined;
    // Check if this is text-only
    const isTextOnly = !options.html || options.html.trim().length === 0;
    
    if (!isTextOnly && options.html) {
      // HTML email - process it
      // First, remove any unwanted <br> tags
      let processedHtml = removeUnwantedBrTags(options.html);
      // Then, preserve line breaks (convert newlines to <p> tags, NOT <br>)
      processedHtml = preserveLineBreaks(processedHtml);
      // Final cleanup
      processedHtml = removeUnwantedBrTags(processedHtml);
      // Then convert buttons
      htmlContent = convertButtonsToEmailFriendly(processedHtml);
    } else {
      // Text-only email
      console.log('[SMTP] Text-only email - skipping HTML processing');
      console.log('[SMTP] Text content length:', options.text?.length || 0);
      htmlContent = undefined; // Explicitly undefined for text-only
    }
    
    console.log('[SMTP] Email type check:', {
      isTextOnly,
      hasHtml: !!htmlContent,
      htmlLength: htmlContent?.length || 0,
      hasText: !!options.text,
      textLength: options.text?.length || 0,
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: fromEmail,
      to: options.to,
      subject: encodeSubject(options.subject),
      html: isTextOnly ? undefined : htmlContent, // Explicitly undefined for text-only
      text: options.text,
      replyTo: options.replyTo,
      encoding: 'utf-8', // Explicitly set UTF-8 encoding
    });
    
    if (isTextOnly) {
      console.log('[SMTP] CONFIRMED: Text-only email sent, html was undefined');
    }

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
    htmlLength: options.html?.length || 0,
    textLength: options.text?.length || 0,
    isTextOnly: !options.html,
    metadata: options.metadata,
  });

  return {
    success: true,
    status: 'sent',
    messageId: `mock_email_${Date.now()}`,
  };
}

