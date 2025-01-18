import { sendDiscordAlert } from '../src/discord'
import { logger } from '../src/logger'

jest.mock('../src/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}))

global.fetch = jest.fn()

describe('sendDiscordAlert', () => {
  const originalEnv = process.env
  const mockFetch = global.fetch as jest.Mock

  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should send a message successfully', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord-webhook-url'
    mockFetch.mockResolvedValueOnce({
      ok: true,
    })

    await sendDiscordAlert('Test message')

    expect(mockFetch).toHaveBeenCalledWith('https://discord-webhook-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Test message' }),
    })
  })

  it('should log an error if DISCORD_WEBHOOK_URL is missing', async () => {
    delete process.env.DISCORD_WEBHOOK_URL

    await sendDiscordAlert('Test message')

    expect(logger.error).toHaveBeenCalledWith('Discord webhook URL is missing')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should log an error if the response is not ok', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord-webhook-url'
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Forbidden',
    })

    await sendDiscordAlert('Test message')

    expect(mockFetch).toHaveBeenCalledWith('https://discord-webhook-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Test message' }),
    })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('should log an error if fetch throws an exception', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord-webhook-url'
    mockFetch.mockRejectedValueOnce(new Error('Network Error'))

    await sendDiscordAlert('Test message')

    expect(mockFetch).toHaveBeenCalledWith('https://discord-webhook-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Test message' }),
    })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
