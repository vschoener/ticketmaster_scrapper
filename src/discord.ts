import { Logger } from 'winston'

export async function sendDiscordAlert(message: string, logger: Logger) {
  const webhookUrl = process.env['DISCORD_WEBHOOK_URL']
  if (!webhookUrl) {
    logger.error('Discord webhook URL is missing')
    return
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
      }),
    })

    if (response.ok) {
      logger.info('Discord message sent successfully!')
    } else {
      logger.error('Failed to send Discord message:', response.statusText)
    }
  } catch (error) {
    logger.error('Error sending Discord message:', (error as Error).message)
  }
}
