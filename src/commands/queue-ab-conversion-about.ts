import { AuthLinkType } from "@dcl/schemas"
import arg from "arg"
import { assert } from "../helpers/assert"
import { queueConversions } from "../helpers/asset-bundles"
import { fetch } from "undici"
import { CliError } from "../bin"
import { parseEntityUrn } from "../helpers/parseEntityUrn"

export default async () => {
  const args = arg({
    "--about-url": String,
    "--ab-server": String,
    "--token": String,
    "--force": Boolean,
    "--crossplatform": Boolean,
    "--prioritize": Boolean
  })

  const aboutUrl = args["--about-url"]!
  const token = args["--token"]!
  const abServer = args["--ab-server"] || "https://asset-bundle-converter.decentraland.org"
  const force = args["--force"] || false

  const crossplatform = args["--crossplatform"] || false
  const shouldPrioritize = !!args["--prioritize"]

  const abServers = crossplatform
    ? [
        "https://asset-bundle-converter.decentraland.org",
        "https://asset-bundle-converter-windows.decentraland.org",
        "https://asset-bundle-converter-mac.decentraland.org",
      ]
    : [abServer]

  assert(!!token, "--token is missing")

  console.log(`>                 Parameters:`)
  console.log(`         Asset bundle server: ${JSON.stringify(abServers)}`)
  console.log(`               Force rebuild: ${force}`)

  const aboutReq = await fetch(aboutUrl)
  if (!aboutReq.ok) throw new CliError(`Invalid response from ${aboutUrl}`)
  const aboutJson = (await aboutReq.json()) as any
  if (!aboutJson.configurations.scenesUrn) throw new CliError(`Json has invalid format`)

  for (const urn of aboutJson.configurations.scenesUrn) {
    const parsed = parseEntityUrn(urn)
    console.log(`> Scheduling conversion of entity ${parsed.entityId}`)
    const result = await queueConversions(
      abServers,
      {
        entity: {
          entityId: parsed.entityId,
          authChain: [
            {
              type: AuthLinkType.SIGNER,
              payload: "0x0000000000000000000000000000000000000000",
              signature: "",
            },
          ],
        },
        contentServerUrls: [parsed.baseUrl || "https://peer.decentraland.org/content"],
        force,
      },
      token,
      shouldPrioritize
    )
    console.log(`  Result: ${JSON.stringify(result)}`)
  }

  console.log(`Finished!`)
}
