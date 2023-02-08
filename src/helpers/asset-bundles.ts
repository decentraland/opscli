import { DeploymentToSqs } from "@dcl/schemas/dist/misc/deployments-to-sqs"
import { fetch } from "undici"
import { CliError } from "../bin"

export async function queueConversion(assetConverterServer: string, entity: DeploymentToSqs, token: string): Promise<{ id: string }> {
  const url = `${assetConverterServer}/queue-task`
  const res = await fetch(url, {
    method: "post",
    body: JSON.stringify(entity),
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