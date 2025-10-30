/**
 * Token Blacklist Cleanup Script
 * 
 * This script removes expired tokens from the TokenBlacklist table.
 * It should be run periodically (e.g., via cron job) to prevent the table from growing indefinitely.
 * 
 * Usage:
 *   node backend/src/utils/cleanup-tokens.js
 */

import { prisma } from '../db/client';

async function cleanupExpiredTokens() {
  try {
    const now = new Date();
    
    console.log('Starting token cleanup...');
    console.log('Current time:', now.toISOString());
    
    // Delete all tokens that have expired
    const result = await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
    
    console.log(`✓ Cleaned up ${result.count} expired tokens from blacklist`);
    
    // Optional: Get remaining token count
    const remaining = await prisma.tokenBlacklist.count();
    console.log(`Remaining blacklisted tokens: ${remaining}`);
    
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupExpiredTokens();
