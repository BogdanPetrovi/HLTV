import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  Browser,
  BrowserContext,
  chromium,
  LaunchOptions,
  Page
} from 'playwright'
import { sleep } from './utils'

export interface HLTVConfig {
  loadPage: (url: string) => Promise<string>
}

export interface LoadPageOptions {
  /**
   * Browser to launch: 'chrome' (system Google Chrome, install with
   * `npx playwright install chrome`), 'chromium' (Playwright's bundled build
   * in the new headless mode) or 'msedge'. A real Chrome is the most
   * convincing to Cloudflare because its brand shows up in client hints.
   * Env: HLTV_BROWSER_CHANNEL. Default: 'chrome', falling back to 'chromium'
   * and then to the headless shell when the preferred one is not installed.
   */
  channel?: string
  /**
   * Run headless. Headed mode (under Xvfb on a server) has the most natural
   * fingerprint. Env: HLTV_HEADLESS ('false' to run headed). Default: true.
   */
  headless?: boolean
  /**
   * Proxy URL, e.g. `http://user:pass@host:port` or `socks5://host:port`.
   * Env: HLTV_PROXY. Default: none.
   */
  proxy?: string
  /** Browser locale. Env: HLTV_LOCALE. Default: 'de-DE'. */
  locale?: string
  /**
   * IANA timezone, e.g. 'Europe/Berlin'. Env: HLTV_TIMEZONE.
   * Default: the system timezone.
   */
  timezoneId?: string
  /**
   * File in which cookies (including Cloudflare's clearance cookie) are kept
   * between requests and process restarts, so a passed challenge is reused
   * instead of solved again on every request. `false` disables persistence.
   * Env: HLTV_STATE_FILE. Default: <tmpdir>/hltv-scraper/storage-state.json
   */
  stateFile?: string | false
  /**
   * Max time (ms) to wait for a Cloudflare challenge to resolve by itself.
   * Default: 30000.
   */
  challengeTimeout?: number
}

export interface CloudflareBlockDetails {
  url: string
  status?: number
  mitigated?: string
  ray?: string
  marker: string
}

export class CloudflareBlockedError extends Error {
  constructor(public details: CloudflareBlockDetails) {
    super('CF_BLOCKED')
    this.name = 'CloudflareBlockedError'
  }
}

const MAX_RETRIES = 3
const NAVIGATION_TIMEOUT = 60000
const SETTLE_TIME = 5000
const CHALLENGE_TITLE = 'Just a moment...'
const BLOCK_MARKERS = [
  CHALLENGE_TITLE,
  'Enable JavaScript and cookies to continue',
  'Sorry, you have been blocked',
  'Access denied',
  'You are being rate limited'
]

interface ResolvedOptions {
  channel?: string
  headless: boolean
  proxy?: string
  locale: string
  timezoneId?: string
  stateFile: string | false
  challengeTimeout: number
}

interface Session {
  browser: Browser
  context: BrowserContext
}

const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

const resolveOptions = (options: LoadPageOptions): ResolvedOptions => ({
  channel: options.channel ?? env('HLTV_BROWSER_CHANNEL'),
  headless: options.headless ?? env('HLTV_HEADLESS') !== 'false',
  proxy: options.proxy ?? env('HLTV_PROXY'),
  locale: options.locale ?? env('HLTV_LOCALE') ?? 'de-DE',
  timezoneId: options.timezoneId ?? env('HLTV_TIMEZONE'),
  stateFile:
    options.stateFile ??
    env('HLTV_STATE_FILE') ??
    path.join(os.tmpdir(), 'hltv-scraper', 'storage-state.json'),
  challengeTimeout: options.challengeTimeout ?? 30000
})

const parseProxy = (proxy?: string): LaunchOptions['proxy'] => {
  if (!proxy) {
    return undefined
  }

  const url = new URL(proxy)

  return {
    server: `${url.protocol}//${url.host}`,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined
  }
}

const launchArgs = (headless: boolean): string[] => [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--window-size=1920,1080',
  // Headless Chrome reports an 800x600 screen by default, which does not
  // match the window size above.
  ...(headless ? ['--screen-info={1920x1080}'] : [])
]

const firstLine = (message: string): string => message.split('\n')[0]

const launchBrowser = async (options: ResolvedOptions): Promise<Browser> => {
  const channels = options.channel
    ? [options.channel]
    : ['chrome', 'chromium', undefined]
  let lastError: unknown

  for (const channel of channels) {
    try {
      return await chromium.launch({
        channel,
        headless: options.headless,
        args: launchArgs(options.headless),
        // Removes the "controlled by automated test software" mode, which
        // is what sets navigator.webdriver.
        ignoreDefaultArgs: ['--enable-automation'],
        proxy: parseProxy(options.proxy)
      })
    } catch (err: any) {
      lastError = err
      console.warn(
        `Could not launch browser channel "${channel ?? 'default'}": ${firstLine(err.message)}` +
          (channel === 'chrome'
            ? ' Run "npx playwright install chrome" for the best results.'
            : '')
      )
    }
  }

  throw lastError
}

// Headless Chrome advertises itself as "HeadlessChrome". Use the browser's own
// user agent with that removed so version, platform and client hints all stay
// consistent with the real binary.
const detectUserAgent = async (browser: Browser): Promise<string> => {
  const context = await browser.newContext()

  try {
    const page = await context.newPage()
    return await page.evaluate(() => navigator.userAgent)
  } finally {
    await context.close()
  }
}

const createSession = async (options: ResolvedOptions): Promise<Session> => {
  const browser = await launchBrowser(options)

  try {
    const userAgent = options.headless
      ? (await detectUserAgent(browser)).replace('HeadlessChrome/', 'Chrome/')
      : undefined

    const context = await browser.newContext({
      userAgent,
      locale: options.locale,
      timezoneId: options.timezoneId,
      // Use the window size instead of Playwright's telltale 1280x720 default.
      viewport: null,
      storageState:
        options.stateFile && fs.existsSync(options.stateFile)
          ? options.stateFile
          : undefined
    })

    return { browser, context }
  } catch (err) {
    await browser.close().catch(() => {})
    throw err
  }
}

// page.title() throws while the page is navigating (e.g. right after a
// challenge has been passed), which we treat as "unknown".
const readTitle = async (page: Page): Promise<string | null> => {
  try {
    return await page.title()
  } catch (e) {
    return null
  }
}

const isChallenge = (title: string | null): boolean =>
  title !== null && title.includes(CHALLENGE_TITLE)

// Cloudflare's JS challenge resolves on its own in a real browser and then
// navigates to the actual page, so give it time instead of judging the first
// snapshot.
const waitForChallenge = async (page: Page, timeout: number) => {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    await page.waitForTimeout(1000)

    const title = await readTitle(page)

    if (title !== null && !isChallenge(title)) {
      return
    }
  }
}

const describeBlock = (details: CloudflareBlockDetails): string =>
  `status=${details.status ?? '-'}, cf-mitigated=${details.mitigated ?? '-'}, cf-ray=${details.ray ?? '-'}, marker="${details.marker}"`

export const createLoadPage = (loadPageOptions: LoadPageOptions = {}) => {
  const options = resolveOptions(loadPageOptions)
  let session: Promise<Session> | null = null

  const getSession = async (): Promise<Session> => {
    if (session) {
      const current = await session.catch(() => null)

      if (current && current.browser.isConnected()) {
        return current
      }
    }

    const created = createSession(options)
    session = created
    created.catch(() => {
      if (session === created) {
        session = null
      }
    })

    return created
  }

  const resetSession = async () => {
    const current = session
    session = null

    if (!current) {
      return
    }

    try {
      const { browser } = await current
      await browser.close()
    } catch (e) {}
  }

  const saveState = async (context: BrowserContext) => {
    if (!options.stateFile) {
      return
    }

    try {
      fs.mkdirSync(path.dirname(options.stateFile), { recursive: true })
      await context.storageState({ path: options.stateFile })
    } catch (e) {}
  }

  const clearState = () => {
    if (!options.stateFile) {
      return
    }

    try {
      fs.rmSync(options.stateFile, { force: true })
    } catch (e) {}
  }

  const loadOnce = async (url: string): Promise<string> => {
    const { context } = await getSession()
    const page = await context.newPage()

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT
      })
      const status = response?.status()
      const headers = response?.headers() ?? {}

      if (
        headers['cf-mitigated'] === 'challenge' ||
        status === 403 ||
        status === 503 ||
        isChallenge(await readTitle(page))
      ) {
        await waitForChallenge(page, options.challengeTimeout)
      }

      await page.waitForTimeout(SETTLE_TIME)

      const content = await page.content()
      const marker = BLOCK_MARKERS.find((m) => content.includes(m))

      if (marker) {
        throw new CloudflareBlockedError({
          url,
          status,
          mitigated: headers['cf-mitigated'],
          ray: headers['cf-ray'],
          marker
        })
      }

      await saveState(context)

      return content
    } finally {
      await page.close().catch(() => {})
    }
  }

  return async (url: string): Promise<string> => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await loadOnce(url)
      } catch (err: any) {
        const blocked = err instanceof CloudflareBlockedError

        console.log(
          `[Try number ${attempt}] Error while scraping:`,
          blocked
            ? `${err.message} (${describeBlock(err.details)})`
            : err.message
        )

        if (attempt === MAX_RETRIES) throw err

        if (blocked || err.message.includes('Timeout')) {
          // The saved cookies evidently no longer grant access; start the
          // next attempt with a fresh browser and a clean cookie jar.
          clearState()
          await resetSession()
        }

        await sleep(attempt * 4000)
      }
    }

    throw new Error('Failed after max retries')
  }
}

export const defaultConfig: HLTVConfig = {
  loadPage: createLoadPage()
}
