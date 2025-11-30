type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  userAgent?: string
  url?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private apiUrl = process.env.NEXT_PUBLIC_API_URL

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    // Always log to console in development
    if (this.isDevelopment) {
      const style = {
        info: 'color: #3b82f6',
        warn: 'color: #f59e0b',
        error: 'color: #ef4444',
        debug: 'color: #8b5cf6',
      }
      console.log(`%c[${level.toUpperCase()}] ${message}`, style[level], data || '')
    }

    // Send errors to backend for logging (production only)
    if (level === 'error' && !this.isDevelopment && typeof window !== 'undefined') {
      this.sendToBackend(entry).catch(() => {
        // Silently fail if backend logging fails
      })
    }
  }

  private async sendToBackend(entry: LogEntry) {
    try {
      await fetch(`${this.apiUrl}/client-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      // Silently fail - don't create infinite error loops
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  error(message: string, data?: any) {
    this.log('error', message, data)
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      this.log('debug', message, data)
    }
  }
}

export const logger = new Logger()
