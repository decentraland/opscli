import * as fs from "fs"

export const manifestPath = `unity-renderer-desktop/Packages/manifest.json`

export const packagesLockPath = `unity-renderer-desktop/Packages/packages-lock.json`

export const isRendererPath = (path: string): boolean => {
  const packagePath = `${path}package.json`
  if (fs.existsSync(packagePath)) {
    const content = JSON.parse(fs.readFileSync(packagePath, "utf8"))
    return content["name"] === `com.decentraland.unity-renderer`
  } else {
    return false
  }
}

export const getUPMRendererPath = (initialPath: string): string | undefined => {
  if (!initialPath.endsWith("/")) initialPath += "/"

  const extraPaths = ["", "Assets/", "unity-renderer/Assets/"]
  for (const extraPath of extraPaths) {
    const path = initialPath + extraPath
    if (isRendererPath(path)) {
      return path
    }
  }

  return undefined
}

export const changeJSONFile = (path: string, changeFunction: (content: any) => any) => {
  let content = JSON.parse(fs.readFileSync(path, "utf8"))
  changeFunction(content)
  fs.writeFileSync(path, JSON.stringify(content, null, 2))
}

export const validDesktopLocation = (): boolean => {
  return fs.existsSync(`${process.cwd()}/${manifestPath}`)
}