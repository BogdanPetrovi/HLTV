<h1 align="center">
  <img src="https://www.hltv.org/img/static/TopLogo2x.png" alt="HLTV logo" width="200">
  <br>
  The unofficial HLTV Node.js API
  <br>
</h1>

> **IMPORTANT** \
> This project is a fork of [gigobyte/HLTV](https://github.com/gigobyte/HLTV), originally created by [gigobyte](https://github.com/gigobyte).
> The original package is no longer maintained. This fork uses **Playwright** with stealth plugin instead of `got-scraping` to bypass Cloudflare bot protection. Only a subset of the original API is currently exposed. These are the endpoints that were required for my use case, but I'm open to adding more endpoints if there is interest or a need for them.

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

By default, the library uses **Playwright** (Chromium + stealth plugin) to load pages and bypass Cloudflare protection. It retries up to 3 times with exponential backoff.

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
