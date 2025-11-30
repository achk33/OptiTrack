# Health Check & Monitoring Endpoints

OptiTrack provides several endpoints for monitoring the health and performance of the application.

## Health Check Endpoint

### GET `/api/health`

Basic health check endpoint that returns the server status.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2025-11-28T20:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Service is healthy
- `500 Internal Server Error` - Service is unhealthy

**Usage:**
```bash
curl http://localhost:8000/api/health
```

**Docker Healthcheck:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## Performance Metrics Endpoint

### GET `/api/performance`

Returns detailed performance metrics about API response times and slow queries.

**Authentication:** None (add auth in production)

**Response:**
```json
{
  "slowQueriesCount": 15,
  "averageResponseTime": 1250,
  "threshold": 1000,
  "recentSlowQueries": [
    {
      "path": "/api/assets",
      "method": "GET",
      "statusCode": 200,
      "responseTime": 1450,
      "timestamp": "2025-11-28T20:00:00.000Z",
      "userId": "user-123"
    }
  ],
  "endpointStats": [
    {
      "endpoint": "GET /api/assets",
      "count": 45,
      "avgTime": 850,
      "maxTime": 1450
    }
  ]
}
```

**Fields:**
- `slowQueriesCount` - Total number of slow queries captured
- `averageResponseTime` - Average response time of slow queries (ms)
- `threshold` - Threshold for considering a query slow (default: 1000ms)
- `recentSlowQueries` - Last 10 slow queries
- `endpointStats` - Aggregated statistics per endpoint, sorted by average time

**Usage:**
```bash
curl http://localhost:8000/api/performance
```

---

## Monitoring Best Practices

### 1. Regular Health Checks
Set up automated health checks using:
- Docker healthcheck (recommended)
- Kubernetes liveness/readiness probes
- External monitoring services (UptimeRobot, Pingdom)

### 2. Performance Monitoring
- Review `/api/performance` endpoint regularly
- Optimize endpoints with `avgTime > 500ms`
- Add database indexes for slow queries
- Enable query caching where appropriate

### 3. Log Monitoring
Logs are stored in `backend/logs/`:
- `combined.log` - All logs
- `error.log` - Errors only

Use log aggregation tools:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana Loki
- Datadog

### 4. Alerting
Set up alerts for:
- Health check failures (> 3 consecutive)
- High response times (> 2000ms)
- Error rate spikes (> 5% of requests)
- Database connection issues

---

## Production Checklist

- [ ] Enable authentication on `/api/performance` endpoint
- [ ] Set up external health check monitoring
- [ ] Configure log rotation (done via Winston)
- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Enable APM (Application Performance Monitoring)
- [ ] Configure database query logging
- [ ] Set up real-time alerting
- [ ] Document SLA targets

---

## Example Monitoring Stack

### Docker Compose with Monitoring
```yaml
services:
  backend:
    # ... existing config
    
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
```

### Prometheus Scrape Config
```yaml
scrape_configs:
  - job_name: 'optitrack-backend'
    metrics_path: '/api/performance'
    static_configs:
      - targets: ['backend:8000']
```
