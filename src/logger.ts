import winston from 'winston'

export function getLogger() {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(
        ({ timestamp, level, message }) =>
          `${timestamp} [${level.toUpperCase()}]: ${message}`,
      ),
    ),
    transports: [
      new winston.transports.Console(),
    ],
  })
}
