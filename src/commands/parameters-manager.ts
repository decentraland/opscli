import arg from "arg"
import fs from "fs/promises"
import { fetch } from "undici"
import { assert } from "../helpers/assert"
import { signGpgCleartext } from "../helpers/sign-gpg"

export default async function () {
  const args = arg({
    "--env": String,
    "--name": String,
    "--value": String,
    "--update": Boolean
  })

  const env = assert(args["--env"], "--env is missing")
  const name = assert(args["--name"], "--name is missing")
  const value = assert(args["--value"], "--value is missing")
  const update = !!args['--update']

  const fileContent = [env, name, value].join("\n")

  const envDomain = env == "prd" ? "org" : env == "stg" ? "today" : "zone"

  const signed = await signGpgCleartext(fileContent)

  console.log("> Uploading the parameter...")
  const res = await fetch(`https://ops-lambdas.decentraland.${envDomain}/parameters-manager`, {
    method: update ? "PUT" : "POST",
    body: signed.toString(),
  })

  const response = await res.text()

  if (res.status != 200) {
    throw new Error(`An error has occured while uploading the secret: ${response}`)
  }

  console.log("  OK! Response:")

  console.log(response)
}
