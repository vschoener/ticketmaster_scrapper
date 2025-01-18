import winston from 'winston'
import { getLogger } from '../src/logger'

jest.mock('winston', () => {
  const originalWinston = jest.requireActual('winston') // Keep the original implementation
  return {
    ...originalWinston,
    createLogger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    })),
    transports: originalWinston.transports, // Preserve real transport implementations
    format: originalWinston.format,         // Preserve real format implementations
  }
})

describe('logger', () => {
  it('should create a logger with the correct configuration', () => {
    getLogger()

    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        format: expect.any(Object),
        transports: expect.arrayContaining([
          expect.any(winston.transports.Console),
        ]),
      }),
    )
  })
})
