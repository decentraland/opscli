import arg from "arg"
import fs from "fs/promises"
import { fetch } from "undici"
import { assert } from "../helpers/assert"
import { tldFromEnv } from "../helpers/env-domains"
import { signGpgCleartext } from "../helpers/sign-gpg"

export default async function () {
  const args = arg({
    "--env": String,
    "--name": String,
    "--secretFile": String,
    "--secret": String,
    "--update": Boolean,
    "--delete": Boolean,
  })

  let env = assert(args["--env"], "--env is missing")
  let name = assert(args["--name"], "--name is missing")
  const deleteArgs = !!args["--delete"]
  const hasSecretValue = !!args["--secret"]
  const hasSecretFile = !!args["--secretFile"]

  if (hasSecretValue && hasSecretFile) throw new Error("--secretFile and --secret cannot be used at the same time")
  if (!deleteArgs && !hasSecretValue && !hasSecretFile)
    throw new Error("You must provide either --secretFile or --secret")

  const secretContent = (deleteArgs && "") || hasSecretValue || (await fs.readFile(args["--secretFile"]!)).toString()

  const update = !!args["--update"]

  const fileContent = [env, name, secretContent].join("\n")

  const envDomain = tldFromEnv(env)

  const signed = await signGpgCleartext(fileContent)

  if (deleteArgs) console.log("> Deleting the secrets...")
  else console.log("> Uploading the secrets...")
  const res = await fetch(`https://ops-lambdas.decentraland.${envDomain}/secrets-manager`, {
    method: deleteArgs ? "DELETE" : update ? "PUT" : "POST",
    body: signed.toString(),
  })

  const response = await res.text()

  if (res.status != 200) {
    if (response.includes("ResourceExistsException")) {
      throw new Error("That secret already exists, please use '--update' if you want to update it")
    }
    throw new Error(`An error has occured while uploading the secret: ${response}`)
  }

  console.log("  OK! Response:")

  console.log(response)
}
