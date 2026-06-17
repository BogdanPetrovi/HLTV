import { HLTV } from './index'

const log = (promise: Promise<any>) =>
  promise
    .then((res) => console.dir(res, { depth: null }))
    .catch((err) => console.log(err))

// log(HLTV.getMatch({ id: 2386845 }))
log(HLTV.getMatches(8575))
// log(HLTV.getEvent({ id: 8046 }))
// log(HLTV.getEvents())
// log(HLTV.getMatchMapStats({ id: 147749 }))
// log(HLTV.getMatchStats({ id: 79924 }))
// log(HLTV.getMatchesStats()
// log(HLTV.getMatch({id: 2360906}))
// log(HLTV.getPlayer({ id: 7998 }))
// log(HLTV.getPlayerRanking())
// log(HLTV.getPlayerStats({ id: 1122 }))
// log(HLTV.getRecentThreads())
// log(HLTV.getStreams())
// log(HLTV.getTeam({ id: 7020 }))
// log(HLTV.getTeamStats({ id: 10566 }))
// log(HLTV.getPastEvents({ startDate: '2019-03-01', endDate: '2019-03-29' }))
// log(HLTV.getTeamRanking())
// log(HLTV.getResults(8067))
// log(HLTV.getNews())
console.log('testing...')
// log(HLTV.getRssNews())
