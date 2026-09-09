import { DeploymentToSqs } from '@dcl/schemas/dist/misc/deployments-to-sqs'
import { fetch } from 'undici'
import { CliError } from '../bin'

export const productionAbAdmin = 'https://ab-admin.decentraland.org'

export enum Platform {
  WINDOWS = 'windows',
  MAC = 'mac',
  // Not an OS: routes the job to the abgen generator's queue instead of a Unity
  // converter queue (one abgen job converts every platform it supports).
  ABGEN = 'abgen'
}

// Used when --platform is omitted. abgen is deliberately excluded so default and
// mass reconversions don't feed it until explicitly requested with --platform abgen.
export const DEFAULT_PLATFORMS = [Platform.WINDOWS, Platform.MAC]

export async function queueConversions(
  customABConverterServer: string,
  entity: DeploymentToSqs,
  token: string,
  prioritize: boolean,
  platforms: Platform[]
): Promise<Array<{ id: string }>> {
  const ids: Array<{ id: string }> = []

  ids.push(await queueConversion(customABConverterServer, entity, token, prioritize, platforms))

  return ids
}

async function queueConversion(
  assetConverterServer: string,
  body: DeploymentToSqs,
  token: string,
  prioritize: boolean,
  platforms: Platform[]
): Promise<{ id: string }> {
  const url = new URL(`${assetConverterServer}/enqueue-task`)
  platforms.forEach((platform) => url.searchParams.append('platform', platform))

  if (prioritize) {
    ;(body as any).prioritize = true
  }
  console.log(`> Enqueueing task to ${url}`, JSON.stringify([body]))

  const res = await fetch(url, {
    method: 'post',
    body: JSON.stringify([body]),
    headers: {
      'content-type': 'application/json',
      Authorization: token
    }
  })

  if (!res.ok) {
    throw new CliError(`! Error publishing asset bundle job. StatusCode=${res.status} Text=${await res.text()}`)
  }

  return (await res.json()) as { id: string }
}
