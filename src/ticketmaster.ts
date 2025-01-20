
import puppeteer from 'puppeteer-extra'
import { Page } from 'puppeteer'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import scrapeIt from 'scrape-it'
import { getLogger } from './logger'
import { sendDiscordAlert } from './discord'
import { Logger } from 'winston'
import { doScreenshot } from './imageHelper'
import UserAgent from 'user-agents';
import { sleep } from './helper'

puppeteer.use(StealthPlugin())

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

async function run(logger: Logger) {
  const link = process.env['TICKET_MASTER_LINK'] ?? ''
  if (link.length === 0) {
    logger.error('No ticketmaster link provided')
    return
  }

  logger.info('Starting the Puppeteer scraper')

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  const userAgent = new UserAgent()
  await page.setUserAgent(userAgent.toString())


  logger.info('Setting viewport')
  await page.setViewport({
    width: 1920 + Math.floor(Math.random() * 100),
    height: 3000 + Math.floor(Math.random() * 100),
  })

  logger.info('Navigating to URL: ' + link)
  await page.goto(link, { waitUntil: ['domcontentloaded', 'networkidle2'] })
   // Wait
   sleep(5000)

  const pageLoadedImage = await doScreenshot({
    fileName: 'page_loaded.png',
    logger,
    page,
  })


  try {
    await page.waitForSelector('main#page-main div.error-container', {
      visible: true, // Ensures the element is not only in the DOM but also visible
      timeout: 10000,
    })

    logger.info('Error container present, lets refresh')
    await page.reload({ waitUntil: ['domcontentloaded', 'networkidle2'] })
    // Wait
    sleep(3000)

    await page.waitForSelector('main#page-main div.error-container', {
      visible: true, // Ensures the element is not only in the DOM but also visible
      timeout: 10000,
    })

    logger.info('Error container still present, abort')

    // If still present, exit
    return
  } catch (e) {
    logger.warn(`No error container shows`)
  }

  await acceptCookiesFromPopup(
    page,
    '.banner-content',
    '#onetrust-accept-btn-handler',
  )

  const cookieAcceptedImage = await doScreenshot({
    fileName: 'after_cookie.png',
    logger,
    page,
    force: true,
  })
  sendDiscordAlert({
    message: `Screenshot after cookie accepted`,
    logger,
    imagePath: cookieAcceptedImage,
  })

  const searchResultSelector = 'button.btn.event-choice-map-fast-btn'

  try {
    await page.waitForSelector(searchResultSelector, {
      visible: true, // Ensures the element is not only in the DOM but also visible
      timeout: 3000,
    })

    // CLick on the "Quick choice by price button if it shows"
    await page.click(searchResultSelector)
  } catch (e) {
    const imagePath = await doScreenshot({
      fileName: 'after_wait_map.png',
      logger,
      page,
      force: true,
    })

    sendDiscordAlert({
      message: `${searchResultSelector} seems not available`,
      logger,
      imagePath,
    })
    logger.error(
      `Waited for ${searchResultSelector} but timeout. Maybe the element is already there?`,
      { err: (e as Error).message },
    )

    // No need to keep it without checking the screenshot
    return
  }

  await doScreenshot({
    fileName: 'after_wait_map.png',
    logger,
    page,
  })

  logger.info('Scraping content from the page')
  const pageContent = await page.content()

  const { tickets } = scrapeIt.scrapeHTML<scrapObject>(pageContent, {
    tickets: {
      listItem: '.session-price-item',
      data: {
        title: {
          selector: '.session-price-cat-item-txt',
        },
        price: {
          selector: '.session-price-cat-item-price',
        },
        quantityAvailable: {
          selector: '.event-ticket-qty-num',
        },
        content: { selector: 'li.session-price-cat-item' },
      },
    },
  })

  const imagePath = await doScreenshot({
    fileName: 'last_status.jpg',
    page,
    force: true,
    logger,
  })

  await browser.close()
  logger.info('Browser closed')

  const availableTickets = tickets.filter((ticket) => ticket.content.length > 0)
  if (!availableTickets.length) {
    logger.info('No available tickets found')
    await sendDiscordAlert({
      message: `No ticket for ${link}`,
      logger,
      imagePath,
    })

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

  await sendDiscordAlert({
    message: discordMessage,
    logger,
    imagePath: imagePath,
  })
}

const logger = getLogger()

run(logger).then(() => logger.info('Done'))
