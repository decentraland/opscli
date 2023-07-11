#!/usr/bin/env node

export class CliError extends Error { }

const commands = {
  "query-rollout": "./commands/query-rollout",
  "wearables-consistency": "./commands/wearables-consistency",
  "pointer-consistency": "./commands/pointer-consistency",
  "update-renderer-upm": "./commands/update-renderer-upm",
  "secret-manager": "./commands/secret-manager",
  "parameters-manager": "./commands/parameters-manager",
  "download-entity": "./commands/download-entity",
  "deploy-entity": "./commands/deploy-entity",
  "queue-ab-conversion": "./commands/queue-ab-conversion",
  "check-ab-conversion": "./commands/check-ab-conversion",
  "queue-ab-conversion-snapshot": "./commands/queue-ab-conversion-snapshot",
  "queue-ab-conversion-about": "./commands/queue-ab-conversion-about",
  "circleci": "./commands/circleci",
  "concat-snapshots": "./commands/concat-snapshots",
}

async function main() {
  const commandName = process.argv[2] as keyof typeof commands

  if (!commandName || !commands[commandName]) {
    throw new CliError(
      "Invalid command. Possible are:\n" +
      Object.keys(commands)
        .map(($) => "  npx @dcl/opscli " + $ + "\n")
        .join("")
    )
  }

  const fn = require(commands[commandName]).default

  await fn()
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.log(err.message)
  } else {
    console.error(err)
  }
  process.exit(1)
})
