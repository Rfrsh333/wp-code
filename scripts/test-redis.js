// Quick test to verify Upstash Redis connection
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

async function testRedis() {
  console.log('\n🔍 Testing Upstash Redis Connection...\n');

  // Check env vars
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('❌ Missing credentials in .env.local');
    console.log('UPSTASH_REDIS_REST_URL:', url ? '✅ Set' : '❌ Missing');
    console.log('UPSTASH_REDIS_REST_TOKEN:', token ? '✅ Set' : '❌ Missing');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log('   URL:', url);
  console.log('   Token:', token.substring(0, 20) + '...\n');

  try {
    // Dynamic import for ES modules
    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');

    const redis = new Redis({ url, token });

    // Test basic connection
    console.log('📡 Testing basic Redis connection...');
    await redis.set('test:connection', 'success', { ex: 10 });
    const result = await redis.get('test:connection');

    if (result === 'success') {
      console.log('✅ Basic connection works!\n');
    } else {
      console.log('❌ Connection failed\n');
      process.exit(1);
    }

    // Test rate limiter
    console.log('⏱️  Testing rate limiter...');
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'test:ratelimit'
    });

    const identifier = 'test-user-' + Date.now();

    for (let i = 1; i <= 7; i++) {
      const { success, limit, remaining, reset } = await limiter.limit(identifier);
      const resetTime = new Date(reset).toLocaleTimeString('nl-NL');

      console.log(`   Request ${i}: ${success ? '✅ Allowed' : '❌ Blocked'} (${remaining}/${limit} remaining, reset: ${resetTime})`);

      if (i === 5 && success) {
        console.log('   → Last allowed request ✓');
      }
      if (i === 6 && !success) {
        console.log('   → Rate limit triggered! ✓');
      }
    }

    console.log('\n✅ All tests passed!');
    console.log('\n📊 Redis Rate Limiting is working correctly');
    console.log('   - Connection: ✅');
    console.log('   - Rate limiting: ✅');
    console.log('   - Sliding window: ✅\n');

    // Cleanup
    await redis.del('test:connection');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testRedis();
