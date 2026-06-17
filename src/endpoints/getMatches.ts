import { HLTVConfig } from '../config'
import { HLTVScraper } from '../scraper'
import Team from '../shared/Team'
import Event from '../shared/Event'
import { fetchPage } from '../utils'

export interface GetMatchesArguments {
  eventId: number
}

export interface MatchPreview {
  id: number
  team1?: Team
  team2?: Team
  date?: number
  format?: string
  event?: Event
  live?: boolean
}

export const getMatches = (config: HLTVConfig) => async (eventId: number) => {
  const $ = HLTVScraper(
    await fetchPage(
      `https://www.hltv.org/events/${eventId}/matches`,
      config.loadPage
    )
  )

  const liveMatches = $('.liveMatches > .match-wrapper')
    .toArray()
    .map((el) => {
      const id = el.numFromAttr('data-match-id')!
      const team1 = {
        id: el.numFromAttr('team1'),
        name: el.find('.match-teamname').first().text(),
        logo:
          el
            .find('.match-team')
            .eq(0)
            .find('.match-team-logo-container .night-only')
            .attr('src') ||
          el
            .find('.match-team')
            .eq(0)
            .find('.match-team-logo-container img')
            .attr('src')
      }
      const team2 = {
        id: el.numFromAttr('team2'),
        name: el.find('.match-teamname').second().text(),
        logo:
          el
            .find('.match-team')
            .eq(1)
            .find('.match-team-logo-container .night-only')
            .attr('src') ||
          el
            .find('.match-team')
            .eq(1)
            .find('.match-team-logo-container img')
            .attr('src')
      }
      const event = {
        id: el.numFromAttr('data-event-id')
      }
      const format = el.find('.match-meta:not(.match-meta-live)').text()

      return { id, date: undefined, team1, team2, format, event, live: true }
    })

  const upcomingMatches = $('.matches-event-wrapper')
    .toArray()
    .map((el) => {
      const event = { id: eventId }

      const allMatches = el
        .find('.match-wrapper')
        .toArray()
        .map((matchEl) => {
          const id = matchEl.numFromAttr('data-match-id')!
          const date = matchEl.find('.match-time').numFromAttr('data-unix')
          const team1 = {
            id: matchEl.numFromAttr('team1'),
            name: matchEl.find('.team1 .match-teamname').first().text(),
            logo:
              matchEl.find('.team1 .night-only').attr('src') ||
              matchEl.find('.team1 img').attr('src')
          }
          const team2 = {
            id: matchEl.numFromAttr('team2'),
            name: matchEl.find('.match-teamname').second().text(),
            logo:
              matchEl.find('.team2 .night-only').attr('src') ||
              matchEl.find('.team2 img').attr('src')
          }
          const format = matchEl.find('.match-meta').first().text()

          return { id, date, team1, team2, format, event, live: false }
        })

      // Filter out matches that don't have both teams set yet
      return allMatches.filter((m) => m.team1?.name && m.team2?.name)
    })

  return [...liveMatches, ...upcomingMatches.flat()]
}
