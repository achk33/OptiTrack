# Asset Category Tracking & Maintenance Periodicity - Implementation Guide

## 📋 Overview

This document describes the implementation of asset counting by category and maintenance periodicity normalization in the SBS Maintenance system.

---

## ✅ Data Model Updates

### 1. PMPlan Model Enhancement

**Location**: `backend/prisma/schema.prisma`

```prisma
model PMPlan {
  id         String   @id @default(cuid())
  name       String
  scopeType  String
  scopeValue String
  periodicite String  @default("MIS")  // ✨ Updated: Normalized values
  lastRunAt  DateTime?                 // ✨ New field
  nextRunAt  DateTime?
  taches     Json
  ownerRole  Role
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  workOrders WorkOrder[]
}
```

### Periodicite Normalization

The `periodicite` field now uses normalized codes:

| Code | Label | Period (months) | Description |
|------|-------|-----------------|-------------|
| **MIS** | Mensuel | 1 | Monthly maintenance |
| **TRI** | Trimestriel | 3 | Quarterly maintenance |
| **SEMESTRE** | Semestriel | 6 | Semi-annual maintenance |
| **ANNUEL** | Annuel | 12 | Annual maintenance |

### 2. Asset Categories Tracked

The system now tracks counts for:
- 💻 **Laptop**
- 🖨️ **Imprimante**
- 🖥️ **Serveur**
- 🖥️ **Micro_ordinateur**

---

## ⚙️ Backend Implementation

### 1. Dashboard KPIs Endpoint (`/api/dashboard/kpis`)

**Enhancement**: Added category-based asset counts

```typescript
GET /api/dashboard/kpis
```

**Response**:
```json
{
  "woOuverts": 5,
  "woEnRetard": 2,
  "actifsTotal": 120,
  "actifsOK": 95,
  "actifsAVerifier": 15,
  "actifsNonConformes": 10,
  "assetsByCategory": {
    "Laptop": 45,
    "Imprimante": 30,
    "Serveur": 15,
    "Micro_ordinateur": 30
  }
}
```

**Implementation**:
```typescript
const [laptopCount, imprimanteCount, serveurCount, microCount] = await Promise.all([
  prisma.asset.count({ where: { deletedAt: null, Categorie: 'Laptop' } }),
  prisma.asset.count({ where: { deletedAt: null, Categorie: 'Imprimante' } }),
  prisma.asset.count({ where: { deletedAt: null, Categorie: 'Serveur' } }),
  prisma.asset.count({ where: { deletedAt: null, Categorie: 'Micro_ordinateur' } }),
]);
```

### 2. PM Statistics Endpoint (`/api/dashboard/pm-stats`)

**New Endpoint**: Get PM plan statistics grouped by periodicity

```typescript
GET /api/dashboard/pm-stats
```

**Response**:
```json
{
  "totalActivePlans": 12,
  "byPeriodicity": {
    "MIS": { 
      "count": 4, 
      "plans": [...],
      "totalWorkOrders": 24,
      "months": 1 
    },
    "TRI": { 
      "count": 5, 
      "plans": [...],
      "totalWorkOrders": 15,
      "months": 3 
    },
    "SEMESTRE": { 
      "count": 2, 
      "plans": [...],
      "totalWorkOrders": 6,
      "months": 6 
    },
    "ANNUEL": { 
      "count": 1, 
      "plans": [...],
      "totalWorkOrders": 1,
      "months": 12 
    }
  },
  "upcomingMaintenance": [
    {
      "id": "plan-123",
      "name": "PM Serveurs",
      "periodicite": "TRI",
      "nextRunAt": "2025-10-20T00:00:00.000Z",
      "daysUntil": 6
    }
  ]
}
```

### 3. Period Calculation Utility

**Location**: `backend/src/utils/periodicite.ts`

```typescript
/**
 * Calculate next maintenance date based on periodicity
 */
export function calculateNextMaintenanceDate(
  lastDate: Date,
  periodicite: string
): Date {
  const months = getMonthsFromPeriodicite(periodicite);
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}
```

**Example Usage**:
```typescript
import { calculateNextMaintenanceDate } from './utils/periodicite';

const lastMaintenance = new Date('2025-01-15');
const nextDate = calculateNextMaintenanceDate(lastMaintenance, 'TRI');
// Result: 2025-04-15 (3 months later)
```

### 4. Scheduler Update

**Location**: `backend/src/scheduler/pm.ts`

Updated to support both old and new periodicite formats:

```typescript
function addPeriod(date: Date, periodicite: string) {
  const d = dayjs(date);
  switch (periodicite) {
    case 'MIS': return d.add(1, 'month').toDate();
    case 'TRI': return d.add(3, 'month').toDate();
    case 'SEMESTRE': return d.add(6, 'month').toDate();
    case 'ANNUEL': return d.add(1, 'year').toDate();
    // Backward compatibility
    case 'mensuel': return d.add(1, 'month').toDate();
    case 'trimestriel': return d.add(3, 'month').toDate();
    case 'semestriel': return d.add(6, 'month').toDate();
    case 'annuel': return d.add(1, 'year').toDate();
    default: return d.add(1, 'month').toDate();
  }
}
```

---

## 💻 Frontend Changes

### 1. Dashboard Enhancements

**Location**: `frontend/app/dashboard/page.tsx`

#### Asset Category Cards

Displays asset counts by category with icons:

```tsx
{kpis?.assetsByCategory && (
  <Card>
    <CardHeader>
      <CardTitle>Comptage des actifs par catégorie</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Laptop, Imprimante, Serveur, Micro_ordinateur */}
      </div>
    </CardContent>
  </Card>
)}
```

**Visual Features**:
- 💻 Laptops (Blue)
- 🖨️ Imprimantes (Purple)
- 🖥️ Serveurs (Green)
- 🖥️ Micro-ordinateurs (Orange)

#### PM Periodicity Breakdown

Shows maintenance plans grouped by frequency:

```tsx
{pmStats && (
  <Card>
    <CardHeader>
      <CardTitle>Périodicité des plans de maintenance (PM)</CardTitle>
      <p>{pmStats.totalActivePlans} plans actifs</p>
    </CardHeader>
    <CardContent>
      {/* 4 cards: MIS, TRI, SEMESTRE, ANNUEL */}
      {/* Upcoming maintenance list */}
    </CardContent>
  </Card>
)}
```

**Visual Features**:
- Color-coded cards per period (Blue, Green, Purple, Orange)
- Work order count per period
- Upcoming maintenance list with countdown
- Badge coloring based on urgency (≤7 days: red, ≤14 days: yellow, >14: blue)

### 2. Type Definitions

```typescript
type PMStatsData = {
  totalActivePlans: number;
  byPeriodicity: {
    MIS: { count: number; plans: any[]; totalWorkOrders: number; months: number };
    TRI: { count: number; plans: any[]; totalWorkOrders: number; months: number };
    SEMESTRE: { count: number; plans: any[]; totalWorkOrders: number; months: number };
    ANNUEL: { count: number; plans: any[]; totalWorkOrders: number; months: number };
  };
  upcomingMaintenance: Array<{
    id: string;
    name: string;
    periodicite: string;
    nextRunAt: string;
    daysUntil: number;
  }>;
};
```

---

## 📊 Dashboard Integration

### New Dashboard Sections

1. **Asset Category Counts** (after Health Score)
   - 4 cards displaying Laptop, Imprimante, Serveur, Micro_ordinateur counts
   - Color-coded with category-specific icons
   - Real-time counts from database

2. **PM Plan Periodicity Breakdown** (after Asset Categories)
   - Summary of active plans by period
   - Total work orders generated per period
   - Upcoming maintenance schedule (30 days)
   - Visual indicators for maintenance urgency

### Data Flow

```
Database (PostgreSQL)
    ↓
Prisma ORM
    ↓
Dashboard API Endpoints
    ↓
Frontend Dashboard Component
    ↓
Visual Charts & Cards
```

---

## 🧩 Testing & Validation

### Backend Tests

1. **Test Category Counts**:
```bash
curl http://localhost:5000/api/dashboard/kpis
```

2. **Test PM Statistics**:
```bash
curl http://localhost:5000/api/dashboard/pm-stats
```

### Frontend Tests

1. Navigate to dashboard: `http://localhost:3000/dashboard`
2. Verify asset category cards display correct counts
3. Verify PM periodicity section shows:
   - Plan counts per period
   - Work order totals
   - Upcoming maintenance list

### Data Validation

**Asset Category Totals**:
```sql
SELECT Categorie, COUNT(*) as count 
FROM "Asset" 
WHERE "deletedAt" IS NULL 
GROUP BY Categorie;
```

**PM Plan Counts**:
```sql
SELECT periodicite, COUNT(*) as count 
FROM "PMPlan" 
WHERE active = true 
GROUP BY periodicite;
```

---

## 🚀 Migration Guide

### For Existing Data

If you have existing PM plans with old periodicite values:

```sql
-- Convert old values to new normalized codes
UPDATE "PMPlan" 
SET periodicite = 
  CASE 
    WHEN periodicite = 'mensuel' THEN 'MIS'
    WHEN periodicite = 'trimestriel' THEN 'TRI'
    WHEN periodicite = 'semestriel' THEN 'SEMESTRE'
    WHEN periodicite = 'annuel' THEN 'ANNUEL'
    ELSE 'MIS'
  END
WHERE periodicite IN ('mensuel', 'trimestriel', 'semestriel', 'annuel');
```

### Deployment Steps

1. **Stop backend server**
2. **Pull latest code**
3. **Update database schema**:
   ```bash
   cd backend
   npx prisma db push
   npx prisma generate
   ```
4. **Run data migration** (if needed - see SQL above)
5. **Restart backend**:
   ```bash
   npm run dev
   ```
6. **Build and deploy frontend**:
   ```bash
   cd frontend
   npm run build
   ```

---

## 📝 Example: Creating a PM Plan with New Periodicity

```typescript
// POST /api/pmplans
{
  "name": "Maintenance trimestrielle serveurs",
  "scopeType": "Categorie",
  "scopeValue": "Serveur",
  "periodicite": "TRI",  // ✨ Use new normalized code
  "taches": [
    { "label": "Vérifier disques", "done": false },
    { "label": "Mettre à jour firmware", "done": false }
  ],
  "ownerRole": "Technicien",
  "nextRunAt": "2025-11-01T00:00:00.000Z",
  "active": true
}
```

**Automatic Next Run Calculation**:
- Current nextRunAt: 2025-11-01
- Periodicite: TRI (3 months)
- **Next calculated run**: 2026-02-01

---

## 🔮 Future Enhancements

1. **Custom Periodicities**: Allow custom intervals (e.g., every 45 days)
2. **Asset Category Analytics**: Trend charts for category-specific KPIs
3. **PM Plan Templates**: Pre-defined plans per asset category
4. **Maintenance Cost Tracking**: Cost per category and period
5. **Alert System**: Notifications for upcoming maintenance
6. **Historical Trends**: Compare PM completion rates by period

---

## 📚 API Reference Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/kpis` | GET | Get KPIs including asset category counts |
| `/api/dashboard/pm-stats` | GET | Get PM plan statistics by periodicity |
| `/api/pmplans` | GET | List all PM plans |
| `/api/pmplans` | POST | Create new PM plan (use normalized periodicite) |
| `/api/pmplans/:id` | PATCH | Update PM plan |
| `/api/pmplans/:id` | DELETE | Delete PM plan |

---

## 🎯 Key Benefits

1. **✅ Better Visibility**: Clear breakdown of assets by category
2. **📊 Improved Planning**: Understand maintenance frequency distribution
3. **⏰ Proactive Scheduling**: See upcoming maintenance at a glance
4. **📈 Data-Driven Decisions**: Analyze patterns by asset type and period
5. **🔧 Standardized Periods**: Consistent periodicite codes across system
6. **🚀 Scalable**: Easy to add new categories or periods

---

*Last Updated: October 14, 2025*
*Version: 1.0*
