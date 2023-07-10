import { AuthLinkType, IPFSv1, IPFSv2 } from "@dcl/schemas"
import arg from "arg"
import { assert } from "../helpers/assert"
import { queueConversion } from "../helpers/asset-bundles"
import { getActiveEntities } from "../helpers/downloads"
import * as fs from 'fs';
import csv from 'csv-parser'
import { exit } from "process"

export default async () => {
  const args = arg({
    "--file": String,
    "--content-server": String,
    "--ab-server": String,
    "--token": String,
    "--start-position": String
  })

  const fileName = args["--file"]!
  const token = args["--token"]!
  const abServer = args["--ab-server"] || "https://asset-bundle-converter.decentraland.org"

  assert(!!token, "--token is missing")
  assert(fileName != "", "--file is required")

  console.log(`>                 Parameters:`)
  console.log(`                    File: ${fileName}`)
  const contentUrl = (args["--content-server"] || "https://peer.decentraland.org/content").replace(/\/$/, "")
  console.log(`              Content server: ${contentUrl}`)
  console.log(`         Asset bundle server: ${abServer}`)

  let argStartPosition = args['--start-position']
  let skip = argStartPosition != null

  await readCSVFile(fileName)
  .then(async (data: any[]) => {
    let len = data.length
    for (let id = 0; id < len; id++) {
      const element = data[id];
      const hash = element.hash
      const version = element.version[1]
      const percent = (100 * (id / len)).toFixed(2)

      if (skip)
      {
        if (hash == argStartPosition)
        {
          skip = false
        } else {
          continue
        }
      }

      if (!hash.includes("_failed"))
      {
        console.log(`> [${percent}%] ${hash} v${version}`)

        await tryRetryQueueConversion(abServer, hash, contentUrl, token)
        
      }
    }
  })
  .catch((error: Error) => {
    console.error('Error reading CSV file:', error);
  });
  
  console.log(`Finished!`)
}


const tryRetryQueueConversion = async(abServer:string, entityId:string, contentUrl: string, token:string, retryCount:number = 0 ) => {
  if (retryCount > 3)
  {
    console.log(`> ${abServer} ${entityId} retry count exceeded, please check your connection.`)
    exit(1)
  }
  try {
    await queueConversion(abServer, {
      entity: {
        entityId: entityId, authChain: [
          {
            type: AuthLinkType.SIGNER,
            payload: '0x0000000000000000000000000000000000000000',
            signature: ''
          }
        ]
      }, contentServerUrls: [contentUrl]
    }, token)
  } catch (error)
  {
    console.log(`> Unexpected error, retrying in 5 seconds...`)
    await new Promise(f => setTimeout(f, 5000));
    tryRetryQueueConversion(abServer, entityId, contentUrl, token, retryCount+1);
  }
}

function readCSVFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
  
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }