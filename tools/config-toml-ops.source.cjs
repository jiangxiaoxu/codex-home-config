'use strict'

const { mkdirSync, readFileSync, writeFileSync, existsSync } = require('node:fs')
const { dirname, resolve } = require('node:path')
const process = require('node:process')
const TOML = require('@iarna/toml')

const minimumNodeMajorVersion = 18
const preferredTopLevelKeyOrder = [
  'model',
  'model_reasoning_effort'
]
const installPreservedTopLevelKeys = new Set([
  'service_tier',
  'plan_mode_reasoning_effort'
])
const partiallyManagedTopLevelTables = new Set([
  'mcp_servers'
])
const syncExcludedTopLevelKeys = new Set([
  'agents',
  'model',
  'model_reasoning_effort',
  'service_tier',
  'plan_mode_reasoning_effort'
])
const installRemovedTopLevelKeys = new Set([
  'agents'
])
const installRemovedNestedPaths = [
  ['notice', 'model_migrations']
]
const syncExcludedNestedPaths = [
  ['notice', 'model_migrations']
]

function hasOwn (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function ensureSupportedNodeVersion () {
  const majorVersion = Number.parseInt(process.versions.node.split('.')[0], 10)
  if (Number.isNaN(majorVersion) || majorVersion < minimumNodeMajorVersion) {
    throw new Error(`Node.js ${minimumNodeMajorVersion}+ is required. Found ${process.version}.`)
  }
}

function parseArguments (argv) {
  if (argv.length === 0) {
    throw new Error('Missing command. Expected merge-install or publish-sync.')
  }

  const [command, ...rest] = argv
  const options = {}
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`)
    }

    const key = token.slice(2)
    const value = rest[index + 1]
    if (typeof value === 'undefined' || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }

    options[key] = value
    index += 1
  }

  return { command, options }
}

function readTomlFile (filePath, { allowMissing = false } = {}) {
  const resolvedPath = resolve(filePath)
  if (!existsSync(resolvedPath)) {
    if (allowMissing) {
      return {}
    }

    throw new Error(`TOML file was not found: ${resolvedPath}`)
  }

  const content = readFileSync(resolvedPath, 'utf8')
  try {
    return TOML.parse(content)
  } catch (error) {
    throw new Error(`Failed to parse TOML from ${resolvedPath}: ${error.message}`)
  }
}

function writeTomlFile (filePath, value) {
  const resolvedPath = resolve(filePath)
  mkdirSync(dirname(resolvedPath), { recursive: true })
  const content = TOML.stringify(orderTopLevelKeys(value))
  writeFileSync(resolvedPath, content, 'utf8')
}

function orderTopLevelKeys (config) {
  const orderedConfig = {}

  for (const key of preferredTopLevelKeyOrder) {
    if (hasOwn(config, key)) {
      orderedConfig[key] = config[key]
    }
  }

  for (const key of Object.keys(config)) {
    if (hasOwn(orderedConfig, key)) {
      continue
    }

    orderedConfig[key] = config[key]
  }

  return orderedConfig
}

function isTomlObject (value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function mergeNamedChildEntries (preferredValue, fallbackValue) {
  if (!isTomlObject(preferredValue) || !isTomlObject(fallbackValue)) {
    return preferredValue
  }

  const mergedValue = {}
  for (const key of Object.keys(preferredValue)) {
    mergedValue[key] = preferredValue[key]
  }

  for (const key of Object.keys(fallbackValue)) {
    if (hasOwn(preferredValue, key)) {
      continue
    }

    mergedValue[key] = fallbackValue[key]
  }

  return mergedValue
}

function pickNamedChildEntriesByAllowlist (candidateValue, allowlistValue) {
  if (!isTomlObject(candidateValue) || !isTomlObject(allowlistValue)) {
    return candidateValue
  }

  const filteredValue = {}
  for (const key of Object.keys(allowlistValue)) {
    if (!hasOwn(candidateValue, key)) {
      continue
    }

    filteredValue[key] = candidateValue[key]
  }

  return filteredValue
}

function buildMergeInstallConfig (sourceConfig, targetConfig) {
  const mergedConfig = {}

  for (const key of Object.keys(sourceConfig)) {
    if (key === 'projects' || installRemovedTopLevelKeys.has(key) || installPreservedTopLevelKeys.has(key)) {
      continue
    }

    if (partiallyManagedTopLevelTables.has(key) && hasOwn(targetConfig, key)) {
      mergedConfig[key] = mergeNamedChildEntries(sourceConfig[key], targetConfig[key])
      continue
    }

    mergedConfig[key] = sourceConfig[key]
  }

  for (const key of Object.keys(targetConfig)) {
    if (key === 'projects' || installRemovedTopLevelKeys.has(key)) {
      continue
    }

    if (installPreservedTopLevelKeys.has(key)) {
      mergedConfig[key] = targetConfig[key]
      continue
    }

    if (hasOwn(sourceConfig, key)) {
      continue
    }

    mergedConfig[key] = targetConfig[key]
  }

  if (hasOwn(targetConfig, 'projects')) {
    mergedConfig.projects = targetConfig.projects
  }

  removeNestedPaths(mergedConfig, installRemovedNestedPaths)
  return mergedConfig
}

function buildPublishedSyncConfig (localConfig, managedConfig) {
  const publishedConfig = {}

  for (const key of Object.keys(managedConfig)) {
    if (key === 'projects' || syncExcludedTopLevelKeys.has(key) || !hasOwn(localConfig, key)) {
      continue
    }

    if (partiallyManagedTopLevelTables.has(key)) {
      publishedConfig[key] = pickNamedChildEntriesByAllowlist(localConfig[key], managedConfig[key])
      continue
    }

    publishedConfig[key] = localConfig[key]
  }

  removeNestedPaths(publishedConfig, syncExcludedNestedPaths)
  return publishedConfig
}

function removeNestedPaths (config, nestedPaths) {
  for (const pathSegments of nestedPaths) {
    removeNestedPath(config, pathSegments)
  }
}

function removeNestedPath (config, pathSegments) {
  if (pathSegments.length === 0) {
    return
  }

  const [topLevelKey, ...restPath] = pathSegments
  if (!hasOwn(config, topLevelKey) || restPath.length === 0) {
    return
  }

  if (config[topLevelKey] === null || typeof config[topLevelKey] !== 'object') {
    return
  }

  removeNestedPathFromObject(config, config[topLevelKey], topLevelKey, restPath)
}

function removeNestedPathFromObject (rootConfig, currentValue, currentKey, remainingPath) {
  if (remainingPath.length === 0) {
    return
  }

  const [nextKey, ...restPath] = remainingPath
  if (!hasOwn(currentValue, nextKey)) {
    return
  }

  if (restPath.length === 0) {
    delete currentValue[nextKey]
  } else {
    const nextValue = currentValue[nextKey]
    if (nextValue === null || typeof nextValue !== 'object') {
      return
    }

    removeNestedPathFromObject(rootConfig, nextValue, nextKey, restPath)
    if (Object.keys(nextValue).length === 0) {
      delete currentValue[nextKey]
    }
  }

  if (Object.keys(currentValue).length === 0) {
    delete rootConfig[currentKey]
  }
}

function mergeInstallConfig ({ sourcePath, targetPath, outputPath }) {
  const sourceConfig = readTomlFile(sourcePath)
  const targetConfig = readTomlFile(targetPath, { allowMissing: true })
  const mergedConfig = buildMergeInstallConfig(sourceConfig, targetConfig)
  writeTomlFile(outputPath, mergedConfig)
}

function publishSyncConfig ({ localPath, managedPath, outputPath }) {
  const localConfig = readTomlFile(localPath)
  const managedConfig = readTomlFile(managedPath)
  const publishedConfig = buildPublishedSyncConfig(localConfig, managedConfig)
  writeTomlFile(outputPath, publishedConfig)
}

function runCli () {
  ensureSupportedNodeVersion()
  const { command, options } = parseArguments(process.argv.slice(2))

  switch (command) {
    case 'merge-install':
      if (!options.source || !options.target || !options.output) {
        throw new Error('merge-install requires --source, --target, and --output.')
      }

      mergeInstallConfig({
        sourcePath: options.source,
        targetPath: options.target,
        outputPath: options.output
      })
      break
    case 'publish-sync':
      if (!options.local || !options.managed || !options.output) {
        throw new Error('publish-sync requires --local, --managed, and --output.')
      }

      publishSyncConfig({
        localPath: options.local,
        managedPath: options.managed,
        outputPath: options.output
      })
      break
    default:
      throw new Error(`Unsupported command: ${command}`)
  }
}

module.exports = {
  buildMergeInstallConfig,
  buildPublishedSyncConfig,
  ensureSupportedNodeVersion,
  mergeInstallConfig,
  orderTopLevelKeys,
  parseArguments,
  publishSyncConfig,
  installRemovedTopLevelKeys,
  installRemovedNestedPaths,
  syncExcludedNestedPaths,
  syncExcludedTopLevelKeys,
  installPreservedTopLevelKeys
}

if (require.main === module) {
  try {
    runCli()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
