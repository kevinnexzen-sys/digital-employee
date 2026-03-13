import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, '../../logs');

export function createLogger(module) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}] [${module}] ${message}`;
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        return log;
      })
    ),
    defaultMeta: { module },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'), 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log') 
      })
    ]
  });
}

export default createLogger;
