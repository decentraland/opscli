import { AuthLinkType } from '@dcl/schemas'
import arg from 'arg'
import { assert } from '../helpers/assert'
import { defaultAbAdmin, Platform, queueConversions } from '../helpers/asset-bundles'
import { fetch } from 'undici'
import { CliError } from '../bin'
import { parseEntityUrn } from '../helpers/parseEntityUrn'

export default async () => {
  const args = arg({
    '--about-url': String,
    '--ab-server': String,
    '--platform': [String],
    '--token': String,
    '--force': Boolean,
    '--prioritize': Boolean
  })

  const aboutUrl = args['--about-url']!
  const token = args['--token']!
  const abServer = args['--ab-server'] || defaultAbAdmin
  const platforms = (args['--platform'] as Platform[]) || Object.values(Platform)
  const force = args['--force'] || false

  const shouldPrioritize = !!args['--prioritize']

  assert(!!token, '--token is missing')
  platforms.forEach((platform) => assert(Object.values(Platform).includes(platform), `Invalid platform: ${platform}`))

  console.log(`>                 Parameters:`)
  console.log(`                 Platform(s): ${platforms.join(',')}`)
  console.log(`         Asset bundle server: ${abServer}`)
  console.log(`               Force rebuild: ${force}`)

  const aboutReq = await fetch(aboutUrl)
  if (!aboutReq.ok) throw new CliError(`Invalid response from ${aboutUrl}`)
  const aboutJson = (await aboutReq.json()) as any
  if (!aboutJson.configurations.scenesUrn) throw new CliError(`Json has invalid format`)

  for (const urn of aboutJson.configurations.scenesUrn) {
    const parsed = parseEntityUrn(urn)
    console.log(`> Scheduling conversion of entity ${parsed.entityId}`)
    const result = await queueConversions(
      abServer,
      {
        entity: {
          entityId: parsed.entityId,
          authChain: [
            {
              type: AuthLinkType.SIGNER,
              payload: '0x0000000000000000000000000000000000000000',
              signature: ''
            }
          ]
        },
        contentServerUrls: [parsed.baseUrl || 'https://peer.decentraland.org/content'],
        force
      },
      token,
      shouldPrioritize,
      platforms
    )
    console.log(`  Result:`, JSON.stringify(result))
  }

  console.log(`Finished!`)
}
