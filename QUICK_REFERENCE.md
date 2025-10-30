# 📋 OptiTrack Quick Reference

## 🚀 Common Commands

### Development
```bash
# Start Backend
cd backend
npm run dev              # Development server on port 4000

# Start Frontend
cd frontend
npm run dev              # Development server on port 3000

# Database
cd backend
npx prisma studio        # Open database GUI
npx prisma db push       # Sync schema changes
npx prisma migrate dev   # Create migration

# Build
npm run build            # Compile TypeScript/Next.js
```

### Production
```bash
# Backend
npm run build
pm2 start dist/index.js --name optitrack-api

# Frontend
npm run build
pm2 start npm --name optitrack-frontend -- start

# Monitor
pm2 logs optitrack-api
pm2 monit
pm2 restart all
```

---

## 🔐 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Admin!123 |
| Technicien | tech@example.com | Tech!123 |
| Lecteur | lecteur@example.com | Lecteur!123 |

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/validate-session` - Validate token

### Assets
- `GET /api/assets` - List assets (pagination)
- `GET /api/assets/:id` - Get asset
- `POST /api/assets` - Create asset (Admin)
- `PATCH /api/assets/:id` - Update asset (Admin/Tech)
- `DELETE /api/assets/:id` - Delete asset (Admin)
- `GET /api/assets/export/csv` - Export CSV
- `GET /api/assets/export/excel` - Export Excel
- `POST /api/assets/import` - Import CSV (Admin)

### Work Orders
- `GET /api/workorders` - List work orders (pagination)
- `POST /api/workorders` - Create work order
- `PATCH /api/workorders/:id` - Update work order
- `DELETE /api/workorders/:id` - Delete work order
- `GET /api/workorders/export/csv` - Export CSV
- `GET /api/workorders/export/excel` - Export Excel

### PM Plans
- `GET /api/pmplans` - List PM plans (pagination)
- `POST /api/pmplans` - Create PM plan (Admin)
- `PATCH /api/pmplans/:id` - Update PM plan (Admin)
- `DELETE /api/pmplans/:id` - Delete PM plan (Admin)

### Users
- `GET /api/users` - List users (Admin)
- `POST /api/users` - Create user (Admin)
- `PATCH /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)

### Dashboard
- `GET /api/dashboard/kpis` - Get KPIs
- `GET /api/dashboard/data-quality` - Data quality metrics

### Activity Logs
- `GET /api/activity-logs` - List activity logs (Admin)

### Password Reset
- `POST /api/password-reset/forgot-password` - Request reset
- `GET /api/password-reset/verify-reset-token/:token` - Verify token
- `POST /api/password-reset/reset-password` - Reset password

### Health Check
- `GET /api/health` - Server health status

---

## 🗄️ Database Operations

### Backup
```bash
# Windows
cd backend
.\scripts\backup.ps1

# Linux/Mac
cd backend
./scripts/backup.sh
```

### Restore
```bash
# From backup file
psql $DATABASE_URL < backup_file.sql
```

### Migrations
```bash
# Create new migration
npx prisma migrate dev --name description

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (DANGEROUS - deletes all data)
npx prisma migrate reset
```

---

## 📊 Monitoring

### Logs
```bash
# Application logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log

# PM2 logs
pm2 logs optitrack-api
pm2 logs optitrack-frontend
```

### Performance
```bash
# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check table sizes
psql $DATABASE_URL -c "
SELECT 
  relname as table,
  pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
"
```

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

### Database Connection Failed
```bash
# Check PostgreSQL status
# Windows
Get-Service -Name postgresql*

# Linux
sudo systemctl status postgresql

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Clear Node Modules
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json .next
npm install
```

### Reset Database
```bash
cd backend
npx prisma migrate reset
npm run seed  # Re-seed data
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `backend/.env` | Backend environment variables |
| `frontend/.env.local` | Frontend environment variables |
| `backend/prisma/schema.prisma` | Database schema |
| `backend/logs/` | Application logs |
| `backend/scripts/backup.ps1` | Database backup (Windows) |
| `DEPLOYMENT_GUIDE.md` | Deployment instructions |
| `FIXES_APPLIED.md` | Detailed fix report |
| `ALL_ISSUES_FIXED.md` | Final summary |

---

## 🎨 Frontend Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Login page |
| `/dashboard` | All | Dashboard with KPIs |
| `/assets` | All | Assets list |
| `/assets/:matricule` | All | Asset details |
| `/assets/import` | Admin | CSV import |
| `/users` | Admin | User management |
| `/workorders` | All | Work orders |
| `/pmplans` | All | PM plans |
| `/activity-log` | Admin | Activity logs |
| `/data-quality` | Admin | Data quality |
| `/profile` | All | User profile |
| `/forgot-password` | Public | Password reset request |
| `/reset-password` | Public | Password reset form |

---

## 🔑 Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
PORT=4000
JWT_SECRET=<64-byte-random-string>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=OptiTrack
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NODE_ENV=development
```

---

## 📦 Tech Stack Versions

| Technology | Version |
|------------|---------|
| Node.js | 18+ |
| PostgreSQL | 14+ |
| Next.js | 14.2.4 |
| React | 18 |
| TypeScript | 5+ |
| Prisma | 5+ |
| Express | 4+ |

---

## 🆘 Emergency Contacts

### Critical Issues
1. Check logs: `tail -f backend/logs/error.log`
2. Restart services: `pm2 restart all`
3. Check database: `psql $DATABASE_URL -c "SELECT 1;"`
4. Review documentation: `DEPLOYMENT_GUIDE.md`

### Support Resources
- GitHub Issues: [Your Repo URL]
- Documentation: `docs/` folder
- Deployment Guide: `DEPLOYMENT_GUIDE.md`
- Fix History: `FIXES_APPLIED.md`

---

**Last Updated**: October 27, 2025
**Version**: 2.0
**Status**: ✅ Production Ready
