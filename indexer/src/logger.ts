import pino from 'pino'
import { CONFIG } from './config'

export const logger = pino({
  level: CONFIG.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
})
