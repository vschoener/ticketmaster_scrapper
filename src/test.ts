import scrapeIt from 'scrape-it'
import * as fs from 'node:fs'

const content = fs.readFileSync(__dirname + '/tmp.html')

const { tickets } = scrapeIt.scrapeHTML(content.toString(), {
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

//console.log(tickets)

const availableTickets = tickets.filter((ticket) => ticket.content.length > 0)

console.log(availableTickets)
