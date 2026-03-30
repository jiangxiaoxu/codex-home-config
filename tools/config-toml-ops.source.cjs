'use strict'

const { mkdirSync, readFileSync, writeFileSync, existsSync } = require('node:fs')
const { dirname, resolve } = require('node:path')
const process = require('node:process')
const TOML = require('@iarna/toml')

const minimumNodeMajorVersion = 18
const syncExcludedTopLevelKeys = new Set([
  'model',
  'model_reasoning_effort'
])

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
  const content = TOML.stringify(value)
  writeFileSync(resolvedPath, content, 'utf8')
}

function buildMergeInstallConfig (sourceConfig, targetConfig) {
  const mergedConfig = {}

  for (const key of Object.keys(sourceConfig)) {
    if (key === 'projects') {
      continue
    }

    mergedConfig[key] = sourceConfig[key]
  }

  for (const key of Object.keys(targetConfig)) {
    if (key === 'projects' || hasOwn(sourceConfig, key)) {
      continue
    }

    mergedConfig[key] = targetConfig[key]
  }

  if (hasOwn(targetConfig, 'projects')) {
    mergedConfig.projects = targetConfig.projects
  }

  return mergedConfig
}

function buildPublishedSyncConfig (localConfig, managedConfig) {
  const publishedConfig = {}

  for (const key of Object.keys(managedConfig)) {
    if (key === 'projects' || syncExcludedTopLevelKeys.has(key) || !hasOwn(localConfig, key)) {
      continue
    }

    publishedConfig[key] = localConfig[key]
  }

  return publishedConfig
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
  parseArguments,
  publishSyncConfig,
  syncExcludedTopLevelKeys
}

if (require.main === module) {
  try {
    runCli()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
