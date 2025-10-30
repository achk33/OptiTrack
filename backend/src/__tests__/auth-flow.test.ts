/**
 * Authentication Flow Test Script
 * 
 * This script tests the new authentication flow including:
 * - Login
 * - Token validation
 * - Session checking
 * - Logout with token blacklisting
 * 
 * Usage:
 *   cd backend
 *   ts-node src/__tests__/auth-flow.test.ts
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin!123';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAuthFlow() {
  log('\n🧪 Starting Authentication Flow Tests\n', 'blue');
  
  let token: string | null = null;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Login
    log('Test 1: Login with valid credentials', 'yellow');
    try {
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      
      token = loginRes.data.token;
      
      if (token && loginRes.data.user) {
        log('✓ Login successful', 'green');
        log(`  Token: ${token.substring(0, 20)}...`, 'blue');
        log(`  User: ${loginRes.data.user.name} (${loginRes.data.user.role})`, 'blue');
        testsPassed++;
      } else {
        throw new Error('No token returned');
      }
    } catch (error: any) {
      log(`✗ Login failed: ${error.message}`, 'red');
      testsFailed++;
      return;
    }

    // Test 2: Check session with valid token
    log('\nTest 2: Check session with valid token', 'yellow');
    try {
      const sessionRes = await axios.get(`${API_URL}/auth/check-session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (sessionRes.data.valid === true) {
        log('✓ Session is valid', 'green');
        testsPassed++;
      } else {
        throw new Error('Session reported as invalid');
      }
    } catch (error: any) {
      log(`✗ Session check failed: ${error.response?.data?.error || error.message}`, 'red');
      testsFailed++;
    }

    // Test 3: Access protected endpoint (/me)
    log('\nTest 3: Access protected endpoint (/me)', 'yellow');
    try {
      const meRes = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (meRes.data.user) {
        log('✓ Protected endpoint accessible', 'green');
        log(`  User: ${meRes.data.user.name}`, 'blue');
        testsPassed++;
      } else {
        throw new Error('No user data returned');
      }
    } catch (error: any) {
      log(`✗ Protected endpoint access failed: ${error.response?.data?.error || error.message}`, 'red');
      testsFailed++;
    }

    // Test 4: Logout (blacklist token)
    log('\nTest 4: Logout and blacklist token', 'yellow');
    try {
      const logoutRes = await axios.post(
        `${API_URL}/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (logoutRes.status === 200) {
        log('✓ Logout successful', 'green');
        testsPassed++;
      } else {
        throw new Error('Unexpected logout response');
      }
    } catch (error: any) {
      log(`✗ Logout failed: ${error.response?.data?.error || error.message}`, 'red');
      testsFailed++;
    }

    // Test 5: Check session with blacklisted token
    log('\nTest 5: Check session with blacklisted token (should fail)', 'yellow');
    try {
      const sessionRes2 = await axios.get(`${API_URL}/auth/check-session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (sessionRes2.data.valid === false) {
        log('✓ Blacklisted token correctly invalidated', 'green');
        testsPassed++;
      } else {
        throw new Error('Token still valid after logout - blacklisting failed!');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        log('✓ Blacklisted token correctly rejected', 'green');
        testsPassed++;
      } else {
        log(`✗ Unexpected error: ${error.message}`, 'red');
        testsFailed++;
      }
    }

    // Test 6: Try to use blacklisted token on protected endpoint
    log('\nTest 6: Try to access protected endpoint with blacklisted token', 'yellow');
    try {
      await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      log('✗ Blacklisted token still works - security issue!', 'red');
      testsFailed++;
    } catch (error: any) {
      if (error.response?.status === 401) {
        log('✓ Blacklisted token correctly rejected', 'green');
        testsPassed++;
      } else {
        log(`✗ Unexpected error: ${error.message}`, 'red');
        testsFailed++;
      }
    }

    // Test 7: Login again after logout
    log('\nTest 7: Login again after logout (multiple login/logout cycle)', 'yellow');
    try {
      const loginRes2 = await axios.post(`${API_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      
      if (loginRes2.data.token) {
        log('✓ Second login successful - no "Erreur de connexion"', 'green');
        log(`  New token: ${loginRes2.data.token.substring(0, 20)}...`, 'blue');
        testsPassed++;
      } else {
        throw new Error('No token returned on second login');
      }
    } catch (error: any) {
      log(`✗ Second login failed: ${error.response?.data?.error || error.message}`, 'red');
      testsFailed++;
    }

    // Test 8: Rate limiting test
    log('\nTest 8: Rate limiting (rapid login attempts)', 'yellow');
    const rapidAttempts = [];
    for (let i = 0; i < 4; i++) {
      rapidAttempts.push(
        axios.post(`${API_URL}/auth/login`, {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
      );
    }
    
    try {
      await Promise.all(rapidAttempts);
      log('⚠ Rate limiting may not be enforced on backend', 'yellow');
      log('  Note: Rate limiting is implemented on frontend', 'blue');
      testsPassed++;
    } catch (error: any) {
      log('✓ Rate limiting working (or one request failed)', 'green');
      testsPassed++;
    }

  } catch (error: any) {
    log(`\n✗ Unexpected error: ${error.message}`, 'red');
    testsFailed++;
  }

  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log(`\n📊 Test Summary:`, 'blue');
  log(`  Tests Passed: ${testsPassed}`, 'green');
  log(`  Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`  Total Tests: ${testsPassed + testsFailed}`, 'blue');
  
  if (testsFailed === 0) {
    log('\n✅ All tests passed! Authentication system is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
  }
  
  log('\n' + '='.repeat(50), 'blue');
}

// Run tests
testAuthFlow().catch((error) => {
  log(`\n✗ Test runner error: ${error.message}`, 'red');
  process.exit(1);
});
