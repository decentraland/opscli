import arg from "arg"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { fetch } from "undici"
import { exec } from "child_process"
import { assert } from "../helpers/assert"

export default async function () {
  const args = arg({
    "--env": String,
    "--name": String,
    "--secretFile": String,
    "--secret": String,
    "--update": Boolean,
  })

  let env = assert(args["--env"], "--env is missing")
  let name = assert(args["--name"], "--name is missing")
  const hasSecretValue = !!args["--secret"]
  const hasSecretFile = !!args["--secretFile"]

  if (hasSecretValue && hasSecretFile) throw new Error("--secretFile and --secret cannot be used at the same time")
  if (!hasSecretValue && !hasSecretFile) throw new Error("You must provide either --secretFile or --secret")

  const secretContent = hasSecretValue || (await fs.readFile(args["--secretFile"]!)).toString()

  const update = !!args["--update"]
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "secret"))
  const filename = path.join(tmpDir, "tmp.txt")
  const fileContent = [env, name, secretContent].join("\n")

  try {
    await fs.writeFile(filename, fileContent)
    console.log("Signing secrets with GPG, if you are using a Yubikey, please press it")
    await new Promise((resolve, reject) => {
      exec(`gpg --clearsign ${filename}`, {}, (err, stdout, stderr) => {
        if (err === null) resolve(undefined)
        if (stderr) reject(stderr)
        else reject("Error while signing the secrets")
      })
    })
    console.log("Uploading the secrets...")

    const signed = await fs.readFile(path.join(tmpDir, "tmp.txt.asc"))
    const envDomain = env == "prd" ? "org" : env == "stg" ? "today" : "zone"
    const res = await fetch(`https://ops-lambdas.decentraland.${envDomain}/secrets-manager`, {
      method: update ? "PUT" : "POST",
      body: signed.toString(),
    })

    const response = await res.text()
    if (res.status != 200) {
      if (response.includes("ResourceExistsException")) {
        throw new Error("That secret already exist, please use '--update' if you want to update it")
      }
      throw new Error(`An error has occured while uploading the secret: ${response}`)
    }
    console.log(response)
  } catch (e) {
    console.log(e)

    console.error(`An error has occured while creating the temp folder`)
  } finally {
    try {
      if (tmpDir) {
        await fs.rm(tmpDir, { recursive: true })
      }
    } catch (e) {
      console.error(
        `An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`
      )
    }
  }
}
