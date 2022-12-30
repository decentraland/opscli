import arg from "arg"
import fs from "fs/promises"
import { fetch } from "undici"
import { assert } from "../helpers/assert"
import { tldFromEnv } from "../helpers/env-domains"
import { signGpgCleartext } from "../helpers/sign-gpg"

export default async function () {
  const args = arg({
    "--repo": String,
    "--branch": String,
  })

  let repo = assert(args["--repo"], "--repo is missing")
  let branch = assert(args["--branch"], "--branch is missing")
  const envDomain = tldFromEnv("prd")

  const signed = await signGpgCleartext(`${repo}\n${branch}`)

  console.log("> Starting the pipeline...")
  const res = await fetch(`https://ops-lambdas.decentraland.${envDomain}/circleci`, {
    method: "POST",
    body: signed.toString(),
  })

  const response = await res.text()

  if (res.status != 200) {
    throw new Error(`An error has occured while uploading the secret: ${response}`)
  }

  console.log("  OK! Response:")

  console.log(response)
}
