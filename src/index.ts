import { defaultConfig, HLTVConfig } from './config'
import { getMatches } from './endpoints/getMatches'
import { getEvent } from './endpoints/getEvent'
import { getResults } from './endpoints/getResults'

export class Hltv {
  getEvent: ReturnType<typeof getEvent>
  getMatches: ReturnType<typeof getMatches>
  getResults: ReturnType<typeof getResults>

  constructor(private config: Partial<HLTVConfig> = {}) {
    if (!config.loadPage) {
      config.loadPage = defaultConfig.loadPage
    }

    this.getEvent = getEvent(this.config as HLTVConfig)
    this.getMatches = getMatches(this.config as HLTVConfig)
    this.getResults = getResults(this.config as HLTVConfig)
  }

  public createInstance(config: Partial<HLTVConfig>) {
    return new Hltv(config)
  }

  public TEAM_PLACEHOLDER_IMAGE =
    'https://www.hltv.org/img/static/team/placeholder.svg'

  public PLAYER_PLACEHOLDER_IMAGE =
    'https://static.hltv.org/images/playerprofile/bodyshot/unknown.png'
}

const hltv = new Hltv()

export default hltv
export { hltv as HLTV }

// getEvent
export type { FullEvent } from './endpoints/getEvent'

// getMatches
export type { MatchPreview, GetMatchesArguments } from './endpoints/getMatches'

// getResults
export type { FullMatchResult } from './endpoints/getResults'

// shared
export type { default as Team } from './shared/Team'
export type { default as Event } from './shared/Event'
export { GameMap } from './shared/GameMap'
export { MatchType } from './shared/MatchType'
export { RankingFilter } from './shared/RankingFilter'
