// Client-side logger for frontend
// Uses console in browser, can be extended for remote logging

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  meta?: Record<string, any>
}

class Logger {
  private logLevel: LogLevel

  constructor() {
    // In production, only log errors and warnings
    this.logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug']
    return levels.indexOf(level) <= levels.indexOf(this.logLevel)
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString()
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    if (meta && Object.keys(meta).length > 0) {
      formatted += ` ${JSON.stringify(meta)}`
    }
    return formatted
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>) {
    if (!this.shouldLog('error')) return

    const logEntry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      meta: {
        ...meta,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      },
    }

    console.error(this.formatMessage('error', message, logEntry.meta))
    
    // In production, you could send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // this.sendToErrorTracking(logEntry)
    }
  }

  warn(message: string, meta?: Record<string, any>) {
    if (!this.shouldLog('warn')) return
    console.warn(this.formatMessage('warn', message, meta))
  }

  info(message: string, meta?: Record<string, any>) {
    if (!this.shouldLog('info')) return
    console.info(this.formatMessage('info', message, meta))
  }

  debug(message: string, meta?: Record<string, any>) {
    if (!this.shouldLog('debug')) return
    console.debug(this.formatMessage('debug', message, meta))
  }
}

export const logger = new Logger()






