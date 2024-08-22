import { readFile } from "fs/promises"
import EthCrypto from "eth-crypto"
import { DeploymentBuilder, createContentClient } from "dcl-catalyst-client"
import { Authenticator } from "@dcl/crypto"
import { hexToBytes } from "eth-connect"
import { ethSign, recoverAddressFromEthSignature } from "@dcl/crypto/dist/crypto"
import path from "path"
import { existsSync } from "fs"
import { CliError } from "../bin"
import arg from "arg"
import { assert } from "console"
import { recurseFolder } from "../helpers/recurse-folder"
import { createFetchComponent } from "@well-known-components/fetch-component";
import { DeploymentPreparationData } from "dcl-catalyst-client/dist/client";

export default async () => {
  const args = arg({
    "--folder": String,
    "--private-key": String,
    "--entity-type": String,
    "--pointer": [String],
    "--content-server": String,
    "--dry": Boolean,
  })

  const folder = path.resolve(args["--folder"] || process.cwd())
  const entityType = args["--entity-type"]

  assert(entityType, "An --entity-type must be provided")

  const pointers = args["--pointer"]!

  assert(pointers.length > 0, "--pointer is missing")

  console.log(`> Deploying entity in folder: ${folder}`)
  console.log(`                 Entity type: ${entityType}`)
  console.log(`                    Pointers: ${pointers.join(",")}`)

  const contentUrl = (args["--content-server"] || "https://peer.decentraland.org/content").replace(/\/$/, "")
  console.log(`              Content server: ${contentUrl}`)

  const fetch = createFetchComponent()
  const client = createContentClient({ url: contentUrl, fetcher: fetch })

  const files: Map<string, Uint8Array> = new Map()

  console.log(`               Content files:`)
  for await (const fullPath of recurseFolder(folder)) {
    // NOTE: this may not work on windows machines because of path separators
    let file = path.relative(folder, fullPath)
    if (file.startsWith(".")) continue // ignore dotfiles and git
    console.log(`                              - ${file}`)
    files.set(file, await readFile(fullPath))
  }

  const metadataPath = path.join(folder, ".metadata")

  if (!existsSync(metadataPath)) {
    throw new CliError(`File ${metadataPath} doesn't exist`)
  }

  const metadataFile = await readFile(metadataPath)
  const metadata = JSON.parse(metadataFile.toString())

  const deploymentEntity: DeploymentPreparationData = await DeploymentBuilder.buildEntity({
    type: entityType as any,
    pointers,
    files,
    metadata,
    timestamp: new Date().getTime(),
  })

  console.log(`                    EntityId: ${deploymentEntity.entityId}`)
  console.log(`                      Hashes: ${Array.from(deploymentEntity.files.keys()).join(',')}`)

  const privateKey = args["--private-key"] || process.env.PRIVATE_KEY

  assert(privateKey, "Missing --private-key or PRIVATE_KEY env var")

  const sig = ethSign(hexToBytes(privateKey!), "test")
  const address = recoverAddressFromEthSignature(sig, "test")
  console.log(`              Signer address: ${address}`)

  const messageHash = Authenticator.createEthereumMessageHash(deploymentEntity.entityId)
  const signature = EthCrypto.sign(privateKey!, Buffer.from(messageHash).toString("hex"))
  const authChain = Authenticator.createSimpleAuthChain(deploymentEntity.entityId, address, signature)
  console.log(`                  Auth chain: ${JSON.stringify(authChain)}`)

  if (!args["--dry"]) {
    try {
      const result = await client.deploy({
        entityId: deploymentEntity.entityId,
        authChain: authChain,
        files: deploymentEntity.files,
      })
      console.log("> Done. Result:")
      console.log(result)
    } catch (e) {
      console.error(e)
      throw new CliError(`Error deploying entity ${deploymentEntity.entityId} on ${pointers}`)
    }
  }
}
