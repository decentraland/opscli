import { DeploymentToSqs } from "@dcl/schemas/dist/misc/deployments-to-sqs"
import { fetch } from "undici"
import { CliError } from "../bin"

export const multiPlatformFlag = "MultiPlatform"

const abServers =  [
  "https://asset-bundle-converter.decentraland.org",
  "https://asset-bundle-converter-windows.decentraland.org",
  "https://asset-bundle-converter-mac.decentraland.org",
]
export async function queueConversions(customABConverterServer: string, entity: DeploymentToSqs, token: string, prioritize: boolean): Promise<Array<{ id: string }>> {
  let ids: Array<{ id: string }> = []

  if (customABConverterServer === multiPlatformFlag) {
    for (const assetConverterServer of abServers) {
      ids.push(await queueConversion(assetConverterServer, entity, token, prioritize))
    }
  }else{
    ids.push(await queueConversion(customABConverterServer, entity, token, prioritize))
  }
  return ids
}

export async function queueConversion(assetConverterServer: string, body: DeploymentToSqs, token: string, prioritize: boolean): Promise<{ id: string }> {
  const url = `${assetConverterServer}/queue-task`

  if (prioritize) {
    (body as any).prioritize = true
  }

  const res = await fetch(url, {
    method: "post",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      Authorization: token
    },
  })


  if (!res.ok) {
    throw new CliError(`! Error publishing asset bundle job. StatusCode=${res.status} Text=${await res.text()}`)
  }

  return await res.json() as { id: string }
}