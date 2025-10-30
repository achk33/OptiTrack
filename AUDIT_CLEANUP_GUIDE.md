# Audit Log Cleanup System

This system provides multiple ways to clean up old audit log entries from the database.

## ✅ Implementation Complete

### Backend
- ✅ Admin API routes (`/api/admin/audit-logs`)
- ✅ Statistics endpoint (`/api/admin/audit-logs/stats`)
- ✅ Command-line cleanup script
- ✅ Integrated into main server

### Frontend
- ✅ Cleanup button in Admin Audit Logs page
- ✅ Statistics display
- ✅ Confirmation modal with stats
- ✅ Two cleanup options (all logs or > 30 days)

## 🎯 Three Ways to Clean Up

### 1. Admin UI (Recommended)
1. Login as Admin
2. Navigate to **"Modifications Actifs"** page
3. Click **"Nettoyer"** button in top-right
4. View statistics:
   - Total logs
   - Last 7 days
   - Last 30 days
   - Oldest entry date
5. Choose cleanup option:
   - **"Supprimer logs > 30 jours"** - Remove old logs (keeps recent data)
   - **"Supprimer TOUS les logs"** - Complete cleanup (⚠️ irreversible!)

### 2. Command Line Script
```bash
cd backend
npm run cleanup:audit-logs
```

This will:
- Show total count before cleanup
- Delete ALL audit logs
- Show count after cleanup
- Exit cleanly

### 3. API Endpoint (Advanced)
Delete all logs:
```bash
curl -X DELETE http://localhost:4000/api/admin/audit-logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Delete logs older than specific date:
```bash
curl -X DELETE "http://localhost:4000/api/admin/audit-logs?olderThan=2025-09-28T00:00:00.000Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Get statistics:
```bash
curl http://localhost:4000/api/admin/audit-logs/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 API Response Examples

### DELETE /api/admin/audit-logs
```json
{
  "message": "Audit logs supprimés avec succès",
  "deletedCount": 156,
  "countBefore": 156
}
```

### GET /api/admin/audit-logs/stats
```json
{
  "total": 156,
  "last30Days": 89,
  "last7Days": 34,
  "oldestEntry": "2025-10-01T10:30:00.000Z",
  "newestEntry": "2025-10-28T20:08:00.000Z"
}
```

## 🔒 Security

- All endpoints require Admin role
- Rate limited (1000 requests per 15 minutes)
- Confirmation required in UI before deletion
- Action is logged in system logs

## ⚠️ Important Notes

1. **Irreversible Action**: Once deleted, audit logs cannot be recovered
2. **No Undo**: There is no undo functionality
3. **Best Practice**: Use "delete > 30 days" option to maintain recent audit trail
4. **Backup**: Consider backing up database before large cleanup operations

## 🛠️ Maintenance Recommendations

### Suggested Retention Policies

- **Production**: Keep last 90 days
- **Development**: Clean up weekly
- **Compliance**: Check legal requirements for audit log retention

### Automated Cleanup (Optional)

You could set up a cron job to automatically clean old logs:

```bash
# Example: Daily cleanup at 2 AM
0 2 * * * cd /path/to/backend && npm run cleanup:audit-logs:old
```

Or use a scheduled task in your deployment platform.

## 📝 Files Modified

### Backend
- `src/routes/admin.ts` - New admin routes for cleanup
- `src/scripts/cleanup-audit-logs.ts` - CLI cleanup script
- `src/server.ts` - Registered admin routes
- `package.json` - Added cleanup script command

### Frontend
- `app/admin/audit-logs/page.tsx` - Added cleanup UI and modal

## 🚀 Usage Example

```typescript
// Frontend code example
const handleCleanup = async () => {
  const response = await api.delete('/admin/audit-logs');
  console.log(`Deleted ${response.data.deletedCount} logs`);
};
```

## 🎉 Ready to Use!

The cleanup system is now fully functional and ready to use. The easiest way is through the Admin UI where you can see statistics before making any decisions.
