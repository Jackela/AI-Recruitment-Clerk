// Simple NATS listener to capture a single job.resume.submitted event
// Usage: NODE_ENV=development NATS_URL=nats://localhost:4222 node scripts/nats-listener.js

import { connect, StringCodec } from 'nats';

async function main() {
  const url = process.env.NATS_URL || 'nats://localhost:4222';
  const subject = process.env.NATS_SUBJECT || 'job.resume.submitted';
  const timeoutMs = Number(process.env.NATS_LISTEN_TIMEOUT_MS || 15000);
  const sc = StringCodec();

  console.log(`[NATS LISTENER] Connecting to ${url} and waiting for ${subject} ...`);
  const nc = await connect({ servers: url, timeout: 5000 });

  let resolved = false;
  const timer = setTimeout(async () => {
    if (!resolved) {
      console.log('[NATS LISTENER] Timeout reached without receiving event');
      resolved = true;
      await nc.close();
      process.exit(2);
    }
  }, timeoutMs);

  const sub = nc.subscribe(subject, { max: 1 });
  for await (const m of sub) {
    const dataStr = sc.decode(m.data);
    console.log(`[NATS LISTENER] Received on ${m.subject}`);
    console.log(dataStr);
    clearTimeout(timer);
    resolved = true;
    await nc.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[NATS LISTENER] Error:', err);
  process.exit(1);
});

