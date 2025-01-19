import { Logger } from 'winston'
import { WebhookClient } from 'discord.js'

export async function sendDiscordAlert({
                                         message,
                                         logger,
                                         imagePath,
                                       }: {
  message: string
  logger: Logger
  imagePath?: string
}) {
  const webhookUrl = process.env['DISCORD_WEBHOOK_URL']
  if (!webhookUrl) {
    logger.error('Discord webhook URL is missing')
    return
  }

  const embeds: { image: { url: string } }[] = []
  const files: { attachment: string; name: string }[] = []
  if (imagePath) {
    embeds.push({
      image: {
        url: 'attachment://screenshot.jpg',
      },
    })

    files.push({
      attachment: imagePath,
      name: 'screenshot.jpg',
    })
  }

  try {
    const webhookClient = new WebhookClient({ url: webhookUrl })

    // Send the message with or without an embed
    await webhookClient.send({
      content: message,
      embeds,
      files,
    })

    logger.info('Discord message sent successfully!')
  } catch (error) {
    console.log(error)
    logger.error('Error sending Discord message:', (error as Error).message)
  }
}
