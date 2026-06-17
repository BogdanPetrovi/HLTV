import { HLTVConfig } from '../config'
import { HLTVScraper } from '../scraper'
import { fetchPage, generateRandomSuffix } from '../utils'

export interface FullEvent {
  id: number
  name: string
  logo: string
  dateStart?: number
  dateEnd?: number
}

export const getEvent =
  (config: HLTVConfig) =>
  async ({ id }: { id: number }): Promise<FullEvent> => {
    const $ = HLTVScraper(
      await fetchPage(
        `https://www.hltv.org/events/${id}/${generateRandomSuffix()}`,
        config.loadPage
      )
    )

    const name = $('.event-hub-title').text()
    const logo = $('.sidebar-first-level').find('.event-logo').attr('src')

    const dateStart = $('td.eventdate span[data-unix]')
      .first()
      .numFromAttr('data-unix')
    const dateEnd = $('td.eventdate span[data-unix]')
      .last()
      .numFromAttr('data-unix')

    return {
      id,
      name,
      logo,
      dateStart,
      dateEnd
    }
  }
