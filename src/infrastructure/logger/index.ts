import winston from 'winston';
import { config } from '../config/index.js';

const logLevel = config.NODE_ENV === 'production' ? 'info' : 'debug';

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'MM-DD-YYYY HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
});
