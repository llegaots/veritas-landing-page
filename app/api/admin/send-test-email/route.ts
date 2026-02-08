import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/provider';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

function checkAuth(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('key') || request.headers.get('x-password');
  return password === ADMIN_PASSWORD;
}

/**
 * POST /api/admin/send-test-email
 * Send a test email using the first email text from the Facebook sequence
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

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
      return NextResponse.json({ error: 'No sequences found' }, { status: 404 });
    }

    // Find Facebook sequence (case-insensitive)
    const facebookSeq = sequences.find(seq => 
      seq.name.toLowerCase().includes('facebook') || 
      seq.name.toLowerCase().includes('meta ads') ||
      seq.name.toLowerCase().includes('meta')
    );

    if (!facebookSeq || !facebookSeq.active_version_id) {
      return NextResponse.json(
        { error: 'Facebook sequence not found or has no active version' },
        { status: 404 }
      );
    }

    // Get the active version
    const { data: version, error: versionError } = await supabase
      .from('sequence_versions')
      .select('spec_jsonb')
      .eq('id', facebookSeq.active_version_id)
      .single();

    if (versionError || !version?.spec_jsonb) {
      throw new Error(`Error fetching sequence version: ${versionError?.message || 'No spec found'}`);
    }

    const spec = version.spec_jsonb;

    // Find the first email node
    const emailNodes = (spec.nodes || []).filter((node: any) => node.type === 'send_email');
    
    if (emailNodes.length === 0) {
      return NextResponse.json({ error: 'No email nodes found in sequence' }, { status: 404 });
    }

    const firstEmailNode = emailNodes[0];
    const emailType = firstEmailNode.email_type || 'html';
    
    // Get the content
    let emailContent = '';
    if (emailType === 'text') {
      emailContent = firstEmailNode.text_content || '';
    } else {
      emailContent = firstEmailNode.html_content || '';
    }

    if (!emailContent || emailContent.trim().length === 0) {
      return NextResponse.json({ error: 'Email node has no content' }, { status: 404 });
    }

    // Replace variables with test values
    const testContext = {
      FirstName: 'TEST',
      PropertyName: 'Horizon Park',
      Email: 'lucaslegatos123@gmail.com',
      Phone: '+14385017336',
    };

    let renderedContent = emailContent;
    let renderedSubject = firstEmailNode.subject || 'Test Email';
    
    // Simple variable replacement
    Object.keys(testContext).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedContent = renderedContent.replace(regex, testContext[key]);
      renderedSubject = renderedSubject.replace(regex, testContext[key]);
    });

    // Send email
    // Remove "TEST -" prefix if already present to avoid duplication
    const cleanSubject = renderedSubject.startsWith('TEST - ') 
      ? renderedSubject 
      : `TEST - ${renderedSubject}`;
    
    const emailOptions: any = {
      to: 'lucaslegatos123@gmail.com',
      subject: cleanSubject,
    };

    if (emailType === 'text') {
      emailOptions.text = renderedContent;
    } else {
      emailOptions.html = renderedContent;
    }

    const result = await sendEmail(emailOptions);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        sequence: facebookSeq.name,
        nodeId: firstEmailNode.id,
        emailType,
        subject: emailOptions.subject,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

