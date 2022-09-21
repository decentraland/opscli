export function tldFromEnv(env: string) {
  switch (env) {
    case "prd":
      return "org"
    case "stg":
      return "today"
    case "dev":
      return "zone"
    case "biz":
      return "systems"
  }
  throw new Error("Unknown environment " + env)
}
