<h1 align="center">
  <img src="https://www.hltv.org/img/static/TopLogo2x.png" alt="HLTV logo" width="200">
  <br>
  The unofficial HLTV Node.js API
  <br>
</h1>

> **IMPORTANT** \
> This project is a fork of [gigobyte/HLTV](https://github.com/gigobyte/HLTV), originally created by [gigobyte](https://github.com/gigobyte).
> The original package is no longer maintained. This fork uses **Playwright** driving a real Google Chrome instead of `got-scraping` to get past Cloudflare bot protection. Only a subset of the original API is currently exposed. These are the endpoints that were required for my use case, but I'm open to adding more endpoints if there is interest or a need for them.

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [getEvent](#getevent)
  - [getMatches](#getmatches)
  - [getResults](#getresults)

## Installation

```bash
npm install @bogdanpet/hltv
npx playwright install chrome   # Google Chrome stable; the most reliable against Cloudflare
```

If Google Chrome can't be installed (no root on the machine), install Playwright's bundled Chromium instead — the library falls back to it automatically:

```bash
npx playwright install --with-deps chromium
```

> **WARNING** \
> Abusing this library will likely result in an IP ban from HLTV due to Cloudflare bot protection. Use with caution and limit the rate of your requests.

## Usage

```javascript
// ESM
import HLTV from '@bogdanpet/hltv'

// CommonJS
const { HLTV } = require('@bogdanpet/hltv')
```

### Custom configuration

You can create a custom instance if you want to provide your own page loader:

```javascript
const myHLTV = HLTV.createInstance({
  loadPage: async (url) => {
    // your custom fetch logic
  }
})
```

By default, the library uses **Playwright** with the system Google Chrome (falling back to Playwright's bundled Chromium) to load pages. Cookies — including Cloudflare's `cf_clearance` — are persisted to disk and reused across requests and restarts, a Cloudflare challenge is given up to 30s to resolve on its own, and every request is retried up to 3 times with backoff.

The browser can be tuned through `createLoadPage` or through environment variables (useful when the app itself can't be changed):

```javascript
import HLTV, { createLoadPage } from '@bogdanpet/hltv'

const myHLTV = HLTV.createInstance({
  loadPage: createLoadPage({
    channel: 'chrome', // 'chrome' | 'chromium' | 'msedge'
    headless: false, // run headed
    proxy: 'http://user:pass@host:port', // or socks5://host:port
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    stateFile: '/var/lib/myapp/hltv-state.json', // false to disable cookie persistence
    challengeTimeout: 30000
  })
})
```

| Option             | Env variable           | Default                                      |
| ------------------ | ---------------------- | -------------------------------------------- |
| `channel`          | `HLTV_BROWSER_CHANNEL` | `chrome` → `chromium` → headless shell       |
| `headless`         | `HLTV_HEADLESS`        | `true` (`false` to run headed)               |
| `proxy`            | `HLTV_PROXY`           | none                                         |
| `locale`           | `HLTV_LOCALE`          | `de-DE`                                      |
| `timezoneId`       | `HLTV_TIMEZONE`        | system timezone                              |
| `stateFile`        | `HLTV_STATE_FILE`      | `<tmpdir>/hltv-scraper/storage-state.json`   |
| `challengeTimeout` | –                      | `30000`                                      |

When a request is blocked the library throws a `CloudflareBlockedError` (message `CF_BLOCKED`) whose `details` carry the HTTP status, the `cf-mitigated` / `cf-ray` headers and the text that was matched, so you can tell a challenge (`cf-mitigated=challenge`) from a hard WAF block.

## API

---

### getEvent

Parses info from the `hltv.org/events/*` page. (1 request)

| Option | Type   | Description  |
| ------ | ------ | ------------ |
| id     | number | The event ID |

```javascript
const event = await HLTV.getEvent({ id: 7033 })
```

**Returns:**

```typescript
{
  id: number
  name: string
  logo: string
  dateStart?: number  // unix timestamp
  dateEnd?: number    // unix timestamp
}
```

---

### getMatches

Parses all upcoming and live matches for a given event from `hltv.org/events/:id/matches`. (1 request)

| Option  | Type   | Description  |
| ------- | ------ | ------------ |
| eventId | number | The event ID |

```javascript
const matches = await HLTV.getMatches(7033)
```

**Returns** an array of:

```typescript
{
  id: number
  date?: number       // unix timestamp, undefined for live matches
  team1?: {
    id?: number
    name: string
    logo?: string
  }
  team2?: {
    id?: number
    name: string
    logo?: string
  }
  format?: string     // e.g. "Bo3"
  event?: {
    id: number
  }
  live: boolean
}
```

---

### getResults

Parses match results for a given event from `hltv.org/results?event=:id`. (1 request per page)

| Option  | Type   | Description  |
| ------- | ------ | ------------ |
| eventId | number | The event ID |

```javascript
const results = await HLTV.getResults(7033)
```

**Returns** an array of:

```typescript
{
  id: number
  result: {
    team1: number // maps won
    team2: number // maps won
  }
}
```

---

## Credits

Original package by [gigobyte](https://github.com/gigobyte/HLTV). This fork adds Playwright-based scraping to work around Cloudflare restrictions that broke the original implementation.

## License

MIT
