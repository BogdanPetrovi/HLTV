import { Browser, BrowserContext } from 'playwright'
import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { sleep } from './utils'

chromium.use(stealth())

export interface HLTVConfig {
  loadPage: (url: string) => Promise<string>
}

let browserInstance: Browser | null = null

const getBrowser = async (): Promise<Browser> => {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    })
  }
  return browserInstance
}

const defaultLoadPage =
  () =>
  async (url: string): Promise<string> => {
    const MAX_RETRIES = 3

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let page
      try {
        const browser = await getBrowser()
        const context: BrowserContext = await browser.newContext({
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          locale: 'de-DE',
          extraHTTPHeaders: {
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'sec-ch-ua':
              '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'Cache-Control': 'max-age=0'
          }
        })

        page = await context.newPage()

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

        await page.waitForTimeout(5000)

        const content = await page.content()

        if (
          content.includes('Access denied') ||
          content.includes('Enable JavaScript and cookies to continue') ||
          content.includes('Just a moment...')
        ) {
          throw new Error('CF_BLOCKED')
        }

        return content
      } catch (err: any) {
        console.log(
          `[Try number ${attempt}] Error while scraping:`,
          err.message
        )

        if (attempt === MAX_RETRIES) throw err

        if (err.message === 'CF_BLOCKED' || err.message.includes('Timeout')) {
          if (browserInstance) {
            try {
              await browserInstance.close()
            } catch (e) {}
            browserInstance = null
          }
        }

        await sleep(attempt * 4000)
      } finally {
        if (page) {
          try {
            await page.close()
          } catch (e) {}
        }
      }
    }

    throw new Error('Failed after max retries')
  }

export const defaultConfig: HLTVConfig = {
  loadPage: defaultLoadPage()
}
