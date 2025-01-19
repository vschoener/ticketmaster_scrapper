import { Page } from 'puppeteer'
import { Logger } from 'winston'

export async function doScreenshot({
  fileName,
  logger,
  page,
  force = false,
}: {
  fileName: string
  page: Page
  logger: Logger
  force?: boolean
}) {
  const screenshotEnabled =
    force || process.env['SCREENSHOT_ENABLED'] === 'true'

  // Log and exit if screenshots are disabled
  if (!screenshotEnabled) {
    logger.info(
      `Screenshot disabled. SCREENSHOT_ENABLED: ${process.env['SCREENSHOT_ENABLED']}, Force: ${force}`
    )
    return
  }

  const screenshotPath =
    process.env['SCREENSHOT_FOLDER'] ?? process.cwd() + '/data'
  const path = `${screenshotPath}/${fileName}`

  logger.info(`Taking screenshot at ${path}`)
  await page.screenshot({
    path,
  })

  return path
}
