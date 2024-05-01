import { DeploymentToSqs } from "@dcl/schemas/dist/misc/deployments-to-sqs"
import { fetch } from "undici"
import { CliError } from "../bin"

export async function queueConversions(assetConverterServers: string[], entity: DeploymentToSqs, token: string): Promise<Array<{ id: string }>> {
  let ids: Array<{ id: string }> = []
  for (const assetConverterServer of assetConverterServers) {
    ids.push(await queueConversion(assetConverterServer, entity, token))
  }
  return ids
}

export async function queueConversion(assetConverterServer: string, body: DeploymentToSqs, token: string, prioritize: boolean): Promise<{ id: string }> {
  const url = `${assetConverterServer}/queue-task`
  // if prioritize is true add prioritize: true to body
  if (prioritize) {
    body.prioritize = true
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