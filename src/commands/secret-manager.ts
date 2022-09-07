import arg from "arg"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { request } from "undici"
import { exec } from "child_process"
import { assert } from "../helpers/assert"

export default async function () {
  const args = arg({
    "--env": String,
    "--name": String,
    "--secretFile": String,
    "--update": Boolean,
  })

  let env = assert(args["--env"], "--env is missing")
  let name = assert(args["--name"], "--name is missing")
  let secretFile = assert(args["--secretFile"], "--secretFile is missing")
  let update = !!args["--update"]
  
  let tmpDir: string = "";
  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "secret"));
    let fileContent = `${env}\n${name}\n${await fs.readFile(secretFile).then(a => a.toString())}`
    await fs.writeFile(path.join(tmpDir, "tmp.txt"), fileContent)
    console.log("Signing secrets with GPG, if you are using a Yubikey, please press it");
    await new Promise((resolve, reject) => {
      exec(`gpg --clearsign ${path.join(tmpDir, "tmp.txt")}`, {}, (err, stdout, stderr) => {
        if (err === null) resolve(undefined)
        if (stderr) reject(stderr);
        else reject("Error while signing the secrets")
      })
    })
    console.log("Uploading the secrets...");
    
    const signed = await fs.readFile(path.join(tmpDir, "tmp.txt.asc"))
    const envDomain = env == "prd" ? "org" : env == "stg" ? "today" : "zone"
    const {
      statusCode,
      body
    } = await request(`https://ops-lambdas.decentraland.${envDomain}/secrets-manager`, { method: update ? "PUT" : "POST", body: signed.toString() })
    
    let response = ""
    for await (const data of body) {
      response += data.toString()
    }
    if (statusCode != 200) {
      if (response == "Signature could not be verified, ResourceExistsException: The operation failed because the secret test already exists.") {
        return console.error("That secret already exist, please use '--update' if you want to update it");        
      }
      return console.error(`An error has occured while uploading the secret: ${response}`);
    }
    console.log(response);
  }
  catch (e){
    console.log(e);
    
    console.error(`An error has occured while creating the temp folder`);
    
    
  }
  finally {
    try {
      if (tmpDir) {
        await fs.rm(tmpDir, { recursive: true });
      }
    }
    catch (e) {
      console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
    }
  }
}
