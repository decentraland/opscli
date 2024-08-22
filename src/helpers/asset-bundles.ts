import { DeploymentToSqs } from '@dcl/schemas/dist/misc/deployments-to-sqs'
import { fetch } from 'undici'
import { CliError } from '../bin'

export const defaultAbAdmin = 'https://ab-admin.decentraland.org'

export enum Platform {
  WEBGL = 'webgl',
  WINDOWS = 'windows',
  MAC = 'mac'
}

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
