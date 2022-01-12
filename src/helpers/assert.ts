export function assert<T>(cond: T | undefined | null | false | 0 | "", message: string): T | never {
  if (!cond) throw new Error(message)
  return cond!
}
