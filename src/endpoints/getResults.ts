import { HLTVConfig } from '../config'
import { HLTVPage, HLTVScraper } from '../scraper'
import { fetchPage, getIdAt } from '../utils'

export enum ResultsMatchType {
  LAN = 'Lan',
  Online = 'Online'
}

export enum ContentFilter {
  HasHighlights = 'highlights',
  HasDemo = 'demo',
  HadVOD = 'vod',
  HasStats = 'stats'
}

export enum GameType {
  CSGO = 'CSGO',
  CS16 = 'CS16',
  CS2 = 'CS2'
}

export interface ResultTeam {
  name: string
  logo: string
}

export interface ResultEvent {
  name: string
  logo: string
}

export interface FullMatchResult {
  id: number
  result: {
    team1: number
    team2: number
  }
}

export const getResults =
  (config: HLTVConfig) =>
  async (eventId: number): Promise<FullMatchResult[]> => {
    let page = 0
    let $: HLTVPage
    let results: FullMatchResult[] = []

    do {
      $ = HLTVScraper(
        await fetchPage(
          `https://www.hltv.org/results?event=${eventId}`,
          config.loadPage
        )
      )

      page++

      $('.result-con:not(.big-results .result-con)').each((i, el) => {
        const id = el.find('a').first().attrThen('href', getIdAt(2))!

        const [team1Result, team2Result] = el
          .find('.result-score')
          .text()
          .split(' - ')
          .map(Number)

        results.push({
          id,
          result: { team1: team1Result, team2: team2Result }
        })
      })
    } while ($('.result-con:not(.big-results .result-con)').exists())

    return results
  }
