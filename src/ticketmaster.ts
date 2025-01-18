import puppeteer, { Page } from 'puppeteer'
import scrapeIt from 'scrape-it'
import { getLogger } from './logger'
import { sendDiscordAlert } from './discord'
import { Logger } from 'winston'

async function acceptCookiesFromPopup(
  page: Page,
  popupSelector: string,
  acceptButtonSelector: string,
) {
  try {
    logger.info('Waiting for the cookie consent popup to appear')
    await page.waitForSelector(popupSelector)

    logger.info('Clicking the "Accept" button')
    await page.click(acceptButtonSelector)

    logger.info('Cookies accepted successfully')
    return true
  } catch (error) {
    logger.error('Error handling the cookie popup: ' + error)
    return false
  }
}

type scrapObject = {
  tickets: {
    title: string
    price: string
    content: string
  }[]
}

async function doScreenshot({ fileName, logger, page }: {
  fileName: string,
  page: Page,
  logger: Logger
}) {
  const screenShotEnabled = process.env['SCREENSHOT_ENABLED'] === 'true'

  if (!screenShotEnabled) {
    return
  }

  const screenshotPath = process.env['SCREENSHOT_FOLDER'] ?? __dirname + '/data/'
  const path = `${screenshotPath}/${fileName}`

  logger.info(`Taking screenshot in ${path}`)
  await page.screenshot({
    path,
  })
}

async function run(logger: Logger) {
  const link = process.env['TICKET_MASTER_LINK'] ?? ''
  if (link.length === 0) {
    logger.error('No ticketmaster link provided')
    return
  }


  logger.info('Starting the Puppeteer scraper')

  const browser = await puppeteer.launch({
    slowMo: 250,
  })
  const page = await browser.newPage()

  logger.info('Setting viewport')
  await page.setViewport({
    // iPhone 16 pro res
    width: 1206,
    height: 2622,
    hasTouch: true,
    isMobile: true,
  })

  logger.info('Navigating to URL: ' + link)
  await page.goto(link)

  await acceptCookiesFromPopup(
    page,
    '.banner-content',
    '#onetrust-accept-btn-handler',
  )

  await doScreenshot({ fileName: 'after_cookie.png', logger, page })

  await page.screenshot({
    path: __dirname + '/after_cookie.png',
  })

  // CLick on the "Quick choice by price button if it shows"
  const searchResultSelector = 'button.btn.event-choice-map-fast-btn'
  await page.waitForSelector(searchResultSelector, {
    visible: true, // Ensures the element is not only in the DOM but also visible
  })
  await page.click(searchResultSelector)

  await doScreenshot({ fileName: 'after_wait_map.png', logger, page })

  logger.info('Scraping content from the page')
  const pageContent = await page.content()

  const { tickets } = scrapeIt.scrapeHTML<scrapObject>(pageContent, {
    tickets: {
      listItem: '.session-price-item',
      data: {
        title: {
          selector:
            '.session-price-cat-item-txt',
        },
        price: {
          selector:
            '.session-price-cat-item-price',
        },
        quantityAvailable: {
          selector: '.event-ticket-qty-num',
        },
        content: { selector: 'li.session-price-cat-item' },
      },
    },
  })

  await browser.close()
  logger.info('Browser closed')

  logger.info('Tickets scrappet', { tickets })
  const availableTickets = tickets.filter((ticket) => ticket.content.length > 0)

  if (!availableTickets.length) {
    logger.info('No available tickets found')
    return
  }

  logger.info('Available tickets found: ' + availableTickets.length)

  const discordMessage = `TicketMaster ticket found! ${availableTickets.length} AVAILABLE!
See: ${link}
Tickets: ${availableTickets.map((ticket) => {
    return `  - Title: ${ticket.title}
  - Price: ${ticket.price}
`
  })}
`

  await sendDiscordAlert(discordMessage, logger)
}

const logger = getLogger()
run(logger).then(() => logger.info('Done'))
