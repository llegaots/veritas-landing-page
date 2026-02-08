/**
 * Send a test email using the first email text from the Facebook sequence
 * Usage: node scripts/test/send-facebook-sequence-test-email.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

async function sendFacebookSequenceTestEmail() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not configured!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const nodemailer = require('nodemailer');

  // Check for email credentials (either SMTP or OAuth)
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM || gmailUser;
  const hasSmtpCredentials = gmailUser && gmailPassword;
  const hasOAuthCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

  if (!hasSmtpCredentials && !hasOAuthCredentials) {
    console.error('❌ Email credentials not configured!');
    console.error('   Need either:');
    console.error('   - GMAIL_USER and GMAIL_APP_PASSWORD (for SMTP), or');
    console.error('   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (for OAuth)');
    console.error('\n   Will fetch sequence data but cannot send email.\n');
  }

  console.log('🔍 Finding Facebook sequence...\n');

  try {
    // Get all sequences
    const { data: sequences, error: seqError } = await supabase
      .from('sequences')
      .select('id, name, active_version_id')
      .order('created_at', { ascending: false });

    if (seqError) {
      throw new Error(`Error fetching sequences: ${seqError.message}`);
    }

    if (!sequences || sequences.length === 0) {
      console.error('❌ No sequences found!');
      process.exit(1);
    }

    console.log(`Found ${sequences.length} sequence(s):`);
    sequences.forEach(seq => {
      console.log(`  - ${seq.name} (ID: ${seq.id})`);
    });
    console.log('');

    // Find Facebook sequence (case-insensitive)
    const facebookSeq = sequences.find(seq => 
      seq.name.toLowerCase().includes('facebook') || 
      seq.name.toLowerCase().includes('meta ads') ||
      seq.name.toLowerCase().includes('meta')
    );

    if (!facebookSeq) {
      console.error('❌ No Facebook/Meta Ads sequence found!');
      console.error('Available sequences:', sequences.map(s => s.name).join(', '));
      process.exit(1);
    }

    console.log(`✅ Found Facebook sequence: "${facebookSeq.name}"`);
    console.log(`   ID: ${facebookSeq.id}`);
    console.log(`   Active Version ID: ${facebookSeq.active_version_id || 'NONE'}\n`);

    if (!facebookSeq.active_version_id) {
      console.error('❌ Facebook sequence has no active version!');
      process.exit(1);
    }

    // Get the active version
    const { data: version, error: versionError } = await supabase
      .from('sequence_versions')
      .select('spec_jsonb')
      .eq('id', facebookSeq.active_version_id)
      .single();

    if (versionError) {
      throw new Error(`Error fetching sequence version: ${versionError.message}`);
    }

    if (!version || !version.spec_jsonb) {
      console.error('❌ Sequence version has no spec!');
      process.exit(1);
    }

    const spec = version.spec_jsonb;
    console.log(`✅ Loaded sequence spec with ${spec.nodes?.length || 0} node(s)\n`);

    // Find the first email node
    const emailNodes = (spec.nodes || []).filter(node => node.type === 'send_email');
    
    if (emailNodes.length === 0) {
      console.error('❌ No email nodes found in sequence!');
      process.exit(1);
    }

    const firstEmailNode = emailNodes[0];
    console.log(`✅ Found first email node: ${firstEmailNode.id}`);
    console.log(`   Subject: ${firstEmailNode.subject || '(no subject)'}`);
    console.log(`   Email Type: ${firstEmailNode.email_type || 'html'}\n`);

    // Get the text content
    let emailContent = '';
    let emailSubject = firstEmailNode.subject || 'Test Email';
    const emailType = firstEmailNode.email_type || 'html';

    if (emailType === 'text') {
      emailContent = firstEmailNode.text_content || '';
      console.log(`📝 Text email content (${emailContent.length} chars):`);
      console.log(emailContent.substring(0, 300) + (emailContent.length > 300 ? '...' : ''));
    } else {
      emailContent = firstEmailNode.html_content || '';
      console.log(`📝 HTML email content (${emailContent.length} chars):`);
      console.log(emailContent.substring(0, 300) + (emailContent.length > 300 ? '...' : ''));
    }

    if (!emailContent || emailContent.trim().length === 0) {
      console.error('❌ Email node has no content!');
      process.exit(1);
    }

    // Replace variables with test values
    const testContext = {
      FirstName: 'TEST',
      PropertyName: 'Horizon Park',
      Email: 'lucaslegatos123@gmail.com',
      Phone: '+14385017336',
    };

    let renderedContent = emailContent;
    let renderedSubject = emailSubject;
    
    // Simple variable replacement
    Object.keys(testContext).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedContent = renderedContent.replace(regex, testContext[key]);
      renderedSubject = renderedSubject.replace(regex, testContext[key]);
    });

    console.log('\n📧 Preparing to send test email...\n');
    console.log(`Subject: ${renderedSubject}`);
    console.log(`Type: ${emailType}`);
    console.log(`Content length: ${renderedContent.length} chars\n`);

    // Check for email credentials
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || gmailUser;

    if (!gmailUser || !gmailPassword) {
      console.log('⚠️  Gmail credentials not configured in .env.local');
      console.log('\n📋 Email content that would be sent:');
      console.log('─'.repeat(60));
      console.log(`To: lucaslegatos123@gmail.com`);
      console.log(`Subject: TEST - ${renderedSubject}`);
      console.log(`Type: ${emailType}`);
      console.log('─'.repeat(60));
      if (emailType === 'text') {
        console.log(renderedContent);
      } else {
        console.log(renderedContent.substring(0, 500) + (renderedContent.length > 500 ? '...' : ''));
      }
      console.log('─'.repeat(60));
      console.log('\n💡 To send this email, add to .env.local:');
      console.log('   GMAIL_USER=your-email@gmail.com');
      console.log('   GMAIL_APP_PASSWORD=your-app-password');
      return;
    }

    // Temporarily disable test mode
    const originalTestMode = process.env.EMAIL_TEST_MODE;
    process.env.EMAIL_TEST_MODE = 'false';

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
        service: 'gmail',
      });

      // Remove "TEST -" prefix if already present to avoid duplication
      const cleanSubject = renderedSubject.startsWith('TEST - ') 
        ? renderedSubject 
        : `TEST - ${renderedSubject}`;
      
      const mailOptions = {
        from: emailFrom,
        to: 'lucaslegatos123@gmail.com',
        subject: cleanSubject,
      };

      if (emailType === 'text') {
        mailOptions.text = renderedContent;
      } else {
        mailOptions.html = renderedContent;
      }

      console.log('📤 Sending email...\n');
      const info = await transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`\n📬 Check your inbox at: lucaslegatos123@gmail.com`);
      console.log(`   Sequence: "${facebookSeq.name}"`);
      console.log(`   Node: ${firstEmailNode.id}`);
      console.log(`   Type: ${emailType}`);
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError.message);
      if (emailError.code === 'EAUTH') {
        console.error('\n💡 Authentication failed. Check:');
        console.error('   - Is your Gmail App Password correct?');
        console.error('   - Is 2-Step Verification enabled?');
        console.error('   - Did you use an App Password (not your regular password)?');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

sendFacebookSequenceTestEmail();

