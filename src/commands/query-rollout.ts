import arg from 'arg'
import { assert } from '../helpers/assert'
import { checkRollouts } from '../helpers/rollouts'

export default async () => {
  const args = arg({
    '--domain': String,
    '--rolloutName': String
  })

  const domain = args['--domain']!

  assert(domain, '--domain is missing')

  const rollouts = await checkRollouts(domain)

  console.group(`Current rollouts for domain "${domain}" for this request`)
  console.table(rollouts.rolloutMap)
  console.groupEnd()

  const rolloutName = args['--rolloutName']

  if (rolloutName) {
    console.group(`Raw data for rollout "${rolloutName}" for domain "${domain}"`)

    const rollout = rollouts.records[rolloutName]

    // Simulate the distribution for 1000 sessions
    let totalSessions = 1000.0
    for (let i = 0; i < rollout.length; ++i) {
      rollout[i].each1000sessions = Math.round((totalSessions * rollout[i].percentage) / 100.0)
      totalSessions -= rollout[i].each1000sessions
    }

    console.table(rollout, ['percentage', 'version', 'each1000sessions'])
    console.groupEnd()
  }
}
