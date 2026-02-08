/**
 * Send a specific email by subject search
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { sendEmail } = require('../lib/email/provider');

async function sendSpecificEmail() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not configured!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get Facebook sequence
    const { data: sequences } = await supabase
      .from('sequences')
      .select('id, name, active_version_id')
      .ilike('name', '%facebook%');

    if (!sequences || sequences.length === 0) {
      console.error('❌ No Facebook sequence found!');
      process.exit(1);
    }

    const facebookSeq = sequences[0];
    console.log(`✅ Found sequence: ${facebookSeq.name}`);

    // Get version
    const { data: version } = await supabase
      .from('sequence_versions')
      .select('spec_jsonb')
      .eq('id', facebookSeq.active_version_id)
      .single();

    if (!version) {
      console.error('❌ No version found!');
      process.exit(1);
    }

    const spec = version.spec_jsonb;
    const emailNodes = (spec.nodes || []).filter(n => n.type === 'send_email');
    
    // Find email with subject containing "call is"
    const targetEmail = emailNodes.find(node => 
      node.subject && node.subject.toLowerCase().includes('call is')
    );

    if (!targetEmail) {
      console.log('Available email subjects:');
      emailNodes.forEach((node, i) => {
        console.log(`  ${i}: ${node.subject || '(no subject)'}`);
      });
      console.error('❌ Email with "call is" not found!');
      process.exit(1);
    }

    console.log(`✅ Found email: "${targetEmail.subject}"`);
    console.log(`   Type: ${targetEmail.email_type || 'html'}`);
    console.log(`   Node ID: ${targetEmail.id}`);

    const emailType = targetEmail.email_type || 'html';
    let content = emailType === 'text' 
      ? targetEmail.text_content 
      : targetEmail.html_content;

    if (!content) {
      console.error('❌ Email has no content!');
      process.exit(1);
    }

    // Replace variables
    const testContext = {
      FirstName: 'TEST',
      PropertyName: 'Horizon Park',
    };

    let renderedContent = content;
    let renderedSubject = targetEmail.subject || 'Test Email';
    
    Object.keys(testContext).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedContent = renderedContent.replace(regex, testContext[key]);
      renderedSubject = renderedSubject.replace(regex, testContext[key]);
    });

    console.log('\n📧 Sending test email...');
    console.log(`Subject: ${renderedSubject}`);
    console.log(`Type: ${emailType}`);
    console.log(`Content preview (first 200): ${renderedContent.substring(0, 200)}...\n`);

    const emailOptions = {
      to: 'lucaslegatos123@gmail.com',
      subject: `TEST - ${renderedSubject}`,
    };

    if (emailType === 'text') {
      emailOptions.text = renderedContent;
    } else {
      emailOptions.html = renderedContent;
    }

    const result = await sendEmail(emailOptions);

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`\n📬 Check your inbox at: lucaslegatos123@gmail.com`);
    } else {
      console.error('❌ Email failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

sendSpecificEmail();

