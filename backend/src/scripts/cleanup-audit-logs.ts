import { prisma } from '../db/client';

async function cleanupAuditLogs() {
  try {
    console.log('🗑️  Starting audit logs cleanup...');
    
    // Count total logs before cleanup
    const totalBefore = await prisma.auditLog.count();
    console.log(`📊 Total audit logs before cleanup: ${totalBefore}`);
    
    // Delete all audit logs
    const result = await prisma.auditLog.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} audit log entries`);
    
    // Verify cleanup
    const totalAfter = await prisma.auditLog.count();
    console.log(`📊 Total audit logs after cleanup: ${totalAfter}`);
    
    console.log('✨ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupAuditLogs()
  .then(() => {
    console.log('👋 Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
