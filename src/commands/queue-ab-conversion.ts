import { AuthLinkType, IPFSv1, IPFSv2 } from '@dcl/schemas'
import arg from 'arg'
import { assert } from '../helpers/assert'
import { productionAbAdmin, Platform, queueConversions } from '../helpers/asset-bundles'
import { getActiveEntities } from '../helpers/downloads'

export default async () => {
  const args = arg({
    '--cid': [String],
    '--pointer': [String],
    '--content-server': String,
    '--ab-server': String,
    '--platform': [String],
    '--token': String,
    '--prioritize': Boolean,
    '--animation': String
  })

  const pointers = args['--pointer'] || []
  const cids = args['--cid'] || []
  const token = args['--token']!
  const abServer = args['--ab-server'] || productionAbAdmin
  const platforms = (args['--platform'] as Platform[]) || Object.values(Platform)
  const contentUrl = (args['--content-server'] || 'https://peer.decentraland.org/content').replace(/\/$/, '')
  const shouldPrioritize = !!args['--prioritize']
  const animation = args['--animation'] || 'legacy'

  assert(!!token, '--token is missing')
  assert(pointers.length > 0 || cids.length > 0, '--pointer or --cid are required')
  platforms.forEach((platform) => assert(Object.values(Platform).includes(platform), `Invalid platform: ${platform}`))

  console.log(`>                 Parameters:`)
  pointers.length && console.log(`                    Pointers: ${pointers.join(',')}`)
  cids.length && console.log(`                        CIDs: ${cids.join(', ')}`)
  console.log(`                 Platform(s): ${platforms.join(',')}`)
  console.log(`              Content server: ${contentUrl}`)
  console.log(`         Asset bundle server: ${abServer}`)

  const entityIdsToConvert: string[] = []

  if (pointers.length) {
    for (const entity of await getActiveEntities(pointers, contentUrl)) {
      console.log(`> CID: ${entity.id} for ${JSON.stringify(entity.pointers)}`)
      entityIdsToConvert.push(entity.id)
    }
  }

  for (const cid of cids) {
    if (IPFSv1.validate(cid) || IPFSv2.validate(cid)) {
      entityIdsToConvert.push(cid)
    } else {
      console.log(`! Invalid CID: ${cid}. It will be ignored`)
    }
  }

  for (const entity of entityIdsToConvert) {
    console.log(`> Scheduling conversion of entity ${entity}`)
    const result = await queueConversions(
      abServer,
      {
        entity: {
          entityId: entity,
          authChain: [
            {
              type: AuthLinkType.SIGNER,
              payload: '0x0000000000000000000000000000000000000000',
              signature: ''
            }
          ]
        },
        contentServerUrls: [contentUrl],
        animation: animation
      },
      token,
      shouldPrioritize,
      platforms
    )
    console.log(`  Result:`, JSON.stringify(result))
  }

  console.log(`Finished!`)
}
