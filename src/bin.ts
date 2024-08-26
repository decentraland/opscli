#!/usr/bin/env node

import queryRollout from './commands/query-rollout'
import wearablesConsistency from './commands/wearables-consistency'
import pointerConsistency from './commands/pointer-consistency'
import updateRendererUpm from './commands/update-renderer-upm'
import secretManager from './commands/secret-manager'
import parametersManager from './commands/parameters-manager'
import downloadEntity from './commands/download-entity'
import deployEntity from './commands/deploy-entity'
import queueAbConversion from './commands/queue-ab-conversion'
import queueAbConversionSnapshot from './commands/queue-ab-conversion-snapshot'
import queueAbConversionAbout from './commands/queue-ab-conversion-about'
import checkAbConversion from './commands/check-ab-conversion'
import circleci from './commands/circleci'
import concatSnapshots from './commands/concat-snapshots'

export class CliError extends Error {}

const commands = {
  'query-rollout': queryRollout,
  'wearables-consistency': wearablesConsistency,
  'pointer-consistency': pointerConsistency,
  'update-renderer-upm': updateRendererUpm,
  'secret-manager': secretManager,
  'parameters-manager': parametersManager,
  'download-entity': downloadEntity,
  'deploy-entity': deployEntity,
  'queue-ab-conversion': queueAbConversion,
  'queue-ab-conversion-snapshot': queueAbConversionSnapshot,
  'queue-ab-conversion-about': queueAbConversionAbout,
  'check-ab-conversion': checkAbConversion,
  circleci: circleci,
  'concat-snapshots': concatSnapshots
}

async function main() {
  const commandName = process.argv[2] as keyof typeof commands

  if (!commandName || !commands[commandName]) {
    throw new CliError(
      'Invalid command. Possible are:\n' +
        Object.keys(commands)
          .map(($) => '  npx @dcl/opscli ' + $ + '\n')
          .join('')
    )
  }

  await commands[commandName]()
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.log(err.message)
  } else {
    console.error(err)
  }
  process.exit(1)
})
