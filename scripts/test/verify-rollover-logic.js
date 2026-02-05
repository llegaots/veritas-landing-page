/**
 * Verify rollover logic (9 AM - 7 PM Eastern) and show proof from Supabase
 * Usage: node scripts/test/verify-rollover-logic.js
 *
 * 1. Runs unit tests on snapToSendingWindow
 * 2. Fetches message_jobs from Supabase and verifies scheduled_for times
 *    are within 9 AM - 7 PM Eastern
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const EASTERN = 'America/New_York';

function getEasternParts(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

function get9AMEastern(year, month, day) {
  const candidates = [
    new Date(Date.UTC(year, month - 1, day, 14, 0, 0)),
    new Date(Date.UTC(year, month - 1, day, 13, 0, 0)),
  ];
  for (const c of candidates) {
    const p = getEasternParts(c);
    if (p.hour === 9 && p.minute === 0 && p.month === month && p.day === day && p.year === year) return c;
  }
  return candidates[0];
}

function snapToSendingWindow(date) {
  const { year, month, day, hour } = getEasternParts(date);
  if (hour < 9) return get9AMEastern(year, month, day);
  if (hour >= 19) {
    const today9AM = get9AMEastern(year, month, day);
    const tomorrow = new Date(today9AM.getTime() + 24 * 60 * 60 * 1000);
    const p = getEasternParts(tomorrow);
    return get9AMEastern(p.year, p.month, p.day);
  }
  return new Date(date);
}

function formatEastern(isoOrDate) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleString('en-US', {
    timeZone: EASTERN,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

function isWithinWindow(date) {
  const { hour } = getEasternParts(date);
  return hour >= 9 && hour < 19;
}

console.log('═'.repeat(70));
console.log('ROLLOVER LOGIC VERIFICATION (9 AM - 7 PM Eastern)');
console.log('═'.repeat(70));

// Part 1: Unit tests
console.log('\n📋 PART 1: Unit tests on snapToSendingWindow\n');

const tests = [
  // [input UTC iso, expected Eastern hour after snap, description]
  ['2026-02-04T09:00:00.000Z', 9, '4:00 AM EST → snap to 9:00 AM same day'],
  ['2026-02-04T02:00:00.000Z', 9, '9:00 PM EST (Feb 3) → roll to 9:00 AM Feb 4'],
  ['2026-02-04T22:00:00.000Z', 17, '5:00 PM EST → within window, no change'],
  ['2026-02-05T02:00:00.000Z', 9, '9:00 PM EST (Feb 4) → roll to 9:00 AM Feb 5'],
  ['2026-02-04T15:30:00.000Z', 10, '10:30 AM EST → within window, no change'],
  ['2026-02-04T00:00:00.000Z', 9, '7:00 PM EST (Feb 3) → roll to 9:00 AM Feb 4'],
];

let passed = 0;
tests.forEach(([inputIso, expectedHour, desc], i) => {
  const input = new Date(inputIso);
  const result = snapToSendingWindow(input);
  const p = getEasternParts(result);
  const ok = p.hour === expectedHour;
  if (ok) passed++;
  console.log(`  ${ok ? '✅' : '❌'} ${desc}`);
  console.log(`     Input:  ${formatEastern(input)}`);
  console.log(`     Output: ${formatEastern(result)} (hour=${p.hour})`);
});
console.log(`\n  Result: ${passed}/${tests.length} tests passed\n`);

// Part 2: Supabase proof
console.log('═'.repeat(70));
console.log('📋 PART 2: Supabase message_jobs - scheduled_for times');
console.log('═'.repeat(70));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('\n⚠️  No Supabase credentials - skipping Part 2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n');
  process.exit(passed === tests.length ? 0 : 1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: jobs, error } = await supabase
    .from('message_jobs')
    .select('id, run_id, node_id, scheduled_for, sent_at, phone_number, message_text')
    .order('scheduled_for', { ascending: false })
    .limit(50);

  if (error) {
    console.error('\n❌ Supabase error:', error.message);
    process.exit(1);
  }

  console.log(`\nFetched ${jobs.length} message_jobs (most recent first)\n`);
  console.log('Each scheduled_for should be 9 AM - 6:59 PM Eastern:\n');

  let violations = 0;
  jobs.forEach((job, i) => {
    const scheduled = new Date(job.scheduled_for);
    const inWindow = isWithinWindow(scheduled);
    if (!inWindow) violations++;
    const icon = inWindow ? '✅' : '❌';
    console.log(`${i + 1}. ${icon} Job ${job.id.slice(0, 8)}... node=${job.node_id}`);
    console.log(`   scheduled_for (UTC):    ${job.scheduled_for}`);
    console.log(`   Eastern:                ${formatEastern(scheduled)}`);
    console.log(`   In 9AM-7PM window:      ${inWindow ? 'YES' : 'NO'}`);
    if (job.sent_at) console.log(`   sent_at (Eastern):       ${formatEastern(job.sent_at)}`);
    console.log('');
  });

  console.log('═'.repeat(70));
  if (violations === 0) {
    console.log('✅ PROOF: All ' + jobs.length + ' jobs have scheduled_for within 9 AM - 7 PM Eastern');
  } else {
    console.log(`⚠️  ${violations} job(s) have scheduled_for OUTSIDE 9 AM - 7 PM Eastern`);
  }
  console.log('═'.repeat(70));
  process.exit(violations > 0 ? 1 : 0);
}

run();
