import fs from 'node:fs'
import path from 'node:path'

import isGlob from 'is-glob'

import {
  CWD,
  EXTENSIONS,
  cjsRequire,
  SCRIPT_RUNNERS,
  SCRIPT_EXECUTORS,
} from './constants.js'

export const tryPkg = (pkg: string) => {
  try {
    return cjsRequire.resolve(pkg)
  } catch {}
}

export const tryRequirePkg = <T>(pkg: string): T | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cjsRequire(pkg)
  } catch {}
}

export const isPkgAvailable = (pkg: string) => !!tryPkg(pkg)

export const isTsAvailable = isPkgAvailable('typescript')

export const isAngularAvailable = isPkgAvailable('@angular/core/package.json')

export const isMdxAvailable =
  isPkgAvailable('@mdx-js/mdx/package.json') ||
  isPkgAvailable('@mdx-js/react/package.json')

export const isReactAvailable = isPkgAvailable('react')

export const isSvelteAvailable = isPkgAvailable('svelte')

export const isVueAvailable = isPkgAvailable('vue')

export const tryFile = (filePath?: string[] | string, includeDir = false) => {
  if (typeof filePath === 'string') {
    return fs.existsSync(filePath) &&
      (includeDir || fs.statSync(filePath).isFile())
      ? filePath
      : ''
  }

  for (const file of filePath ?? []) {
    if (tryFile(file, includeDir)) {
      return file
    }
  }

  return ''
}

export const tryExtensions = (filepath: string, extensions = EXTENSIONS) => {
  const ext = [...extensions, ''].find(ext => tryFile(filepath + ext))
  return ext == null ? '' : filepath + ext
}

export const tryGlob = (
  paths: string[],
  options:
    | string
    | {
        absolute?: boolean
        baseDir?: string
        ignore?: [string]
      } = {},
) => {
  const {
    absolute = true,
    baseDir = CWD,
    ignore = ['**/node_modules/**'],
  } = typeof options === 'string' ? { baseDir: options } : options
  return paths.reduce<string[]>(
    (acc, pkg) =>
      [
        ...acc,
        ...(isGlob(pkg)
          ? tryRequirePkg<typeof import('fast-glob')>('fast-glob')!.sync(pkg, {
              absolute,
              cwd: baseDir,
              ignore,
              onlyFiles: false,
            })
          : [tryFile(path.resolve(baseDir, pkg), true)]),
      ].filter(Boolean),
    [],
  )
}

export const identify = <T>(
  _: T,
): _ is Exclude<
  T,
  '' | (T extends boolean ? false : boolean) | null | undefined
> => !!_

export const findUp = (searchEntry: string, searchFile = 'package.json') => {
  console.assert(path.isAbsolute(searchEntry))

  if (
    !tryFile(searchEntry, true) ||
    (searchEntry !== CWD && !searchEntry.startsWith(CWD + path.sep))
  ) {
    return ''
  }

  searchEntry = path.resolve(
    fs.statSync(searchEntry).isDirectory()
      ? searchEntry
      : path.resolve(searchEntry, '..'),
  )

  do {
    const searched = tryFile(path.resolve(searchEntry, searchFile))
    if (searched) {
      return searched
    }
    searchEntry = path.resolve(searchEntry, '..')
  } while (searchEntry === CWD || searchEntry.startsWith(CWD + path.sep))

  return ''
}

export const arrayify = <
  T,
  R = T extends Array<infer S> ? NonNullable<S> : NonNullable<T>,
>(
  ...args: Array<R | R[]>
) =>
  args.reduce<R[]>((arr, curr) => {
    arr.push(...(Array.isArray(curr) ? curr : curr == null ? [] : [curr]))
    return arr
  }, [])

export const getPackageManager = () => {
  const execPath = process.env.npm_execpath

  if (!execPath) {
    return
  }

  if (/\byarn\b/.test(execPath)) {
    return 'yarn'
  }

  if (/\bpnpm\b/.test(execPath)) {
    return 'pnpm'
  }

  if (/\bnpm\b/.test(execPath)) {
    return 'npm'
  }

  console.warn('unknown package manager:', execPath)
}

export const getScriptRunner = () => {
  const pm = getPackageManager()

  if (!pm) {
    return
  }

  return SCRIPT_RUNNERS[pm]
}

export const getScriptExecutor = () => {
  const pm = getPackageManager()

  if (!pm) {
    return
  }

  return SCRIPT_EXECUTORS[pm]
}
