'use strict'

const { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } = require('node:fs')
const { createHash, randomUUID } = require('node:crypto')
const { dirname, resolve } = require('node:path')
const process = require('node:process')
const TOML = require('@iarna/toml')
const { parseTOML } = require('toml-eslint-parser')

const minimumNodeMajorVersion = 18
const preferredTopLevelKeyOrder = [
  'model',
  'model_reasoning_effort'
]
const configTomlPolicy = {
  syncExcludedInstallPreservedNestedPaths: [
    ['features', 'workspace_dependencies'],
    ['features', 'apps']
  ],
  sync: {
    topLevelAllowlistSource: 'managed/config.toml',
    excludedTopLevelKeys: [
      'projects',
      'model',
      'model_context_window',
      'model_reasoning_effort',
      'model_catalog_json',
      'service_tier',
      'plan_mode_reasoning_effort',
      'apps'
    ],
    excludedNestedPaths: [
      ['notice', 'model_migrations'],
      ['sandbox_workspace_write', 'writable_roots'],
      ['tui', 'model_availability_nux']
    ],
    childAllowlistedTables: [
      'mcp_servers'
    ]
  },
  install: {
    defaultTopLevelMerge: {
      sourceDefinedAction: 'replace',
      targetOnlyAction: 'preserve'
    },
    preservedTopLevelKeys: [
      'service_tier',
      'plan_mode_reasoning_effort'
    ],
    preservedTopLevelTables: [
      'projects'
    ],
    preservedNestedPaths: [
      ['sandbox_workspace_write', 'writable_roots']
    ],
    removedTopLevelKeys: [
      'model_context_window'
    ],
    removedNestedPaths: [
      ['notice', 'model_migrations']
    ],
    namedChildMergedTables: [
      'mcp_servers'
    ]
  }
}

configTomlPolicy.sync.excludedNestedPaths.push(...configTomlPolicy.syncExcludedInstallPreservedNestedPaths)
configTomlPolicy.install.preservedNestedPaths.push(...configTomlPolicy.syncExcludedInstallPreservedNestedPaths)

const installPreservedTopLevelKeys = new Set(configTomlPolicy.install.preservedTopLevelKeys)
const installPreservedTopLevelTables = new Set(configTomlPolicy.install.preservedTopLevelTables)
const partiallyManagedTopLevelTables = new Set(configTomlPolicy.install.namedChildMergedTables)
const syncAllowlistedChildTables = new Set(configTomlPolicy.sync.childAllowlistedTables)
const syncExcludedTopLevelKeys = new Set(configTomlPolicy.sync.excludedTopLevelKeys)
const installRemovedTopLevelKeys = new Set(configTomlPolicy.install.removedTopLevelKeys)
const installRemovedNestedPaths = configTomlPolicy.install.removedNestedPaths
const syncExcludedInstallPreservedNestedPaths = configTomlPolicy.syncExcludedInstallPreservedNestedPaths
const installPreservedNestedPaths = configTomlPolicy.install.preservedNestedPaths
const syncExcludedNestedPaths = configTomlPolicy.sync.excludedNestedPaths

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
  return readTomlSnapshot(filePath, { allowMissing }).config
}

function readTomlSnapshot (filePath, { allowMissing = false } = {}) {
  const resolvedPath = resolve(filePath)
  if (!existsSync(resolvedPath)) {
    if (allowMissing) {
      return {
        config: {},
        exists: false,
        fingerprint: null,
        resolvedPath,
        text: null
      }
    }

    throw new Error(`TOML file was not found: ${resolvedPath}`)
  }

  const contentBytes = readFileSync(resolvedPath)
  const content = contentBytes.toString('utf8')
  try {
    return {
      config: normalizeDeveloperInstructionNewlines(TOML.parse(content)),
      exists: true,
      fingerprint: getTomlContentFingerprint(contentBytes),
      resolvedPath,
      text: content
    }
  } catch (error) {
    throw new Error(`Failed to parse TOML from ${resolvedPath}: ${error.message}`)
  }
}

function normalizeDeveloperInstructionNewlines (value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      normalizeDeveloperInstructionNewlines(item)
    }

    return value
  }

  if (!isTomlObject(value)) {
    return value
  }

  for (const key of Object.keys(value)) {
    if (key === 'developer_instructions' && typeof value[key] === 'string') {
      value[key] = value[key].replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      continue
    }

    normalizeDeveloperInstructionNewlines(value[key])
  }

  return value
}

function writeTomlFile (filePath, value, { expectedSnapshot = null } = {}) {
  const content = TOML.stringify(orderTopLevelKeys(value))
  const generatedConfig = parseGeneratedTomlContent(filePath, content)
  if (!tomlValuesEqual(generatedConfig, value)) {
    throw new Error(`Refusing to write generated TOML with unexpected semantics to ${resolve(filePath)}.`)
  }

  writeValidatedTomlContent(filePath, content, { expectedSnapshot, generatedConfig })
}

function writeMergeInstallTomlFile ({ outputPath, sourceConfig, targetSnapshot }) {
  const { config: targetConfig, text: targetText } = targetSnapshot
  const mergedConfig = buildMergeInstallConfig(sourceConfig, targetConfig)
  const content = buildMergeInstallTomlContent({
    sourceConfig,
    mergedConfig,
    targetConfig,
    targetText
  })

  const generatedConfig = parseGeneratedTomlContent(outputPath, content)
  if (!tomlValuesEqual(generatedConfig, mergedConfig)) {
    throw new Error(`Refusing to write generated TOML with unexpected semantics to ${resolve(outputPath)}.`)
  }

  const expectedSnapshot = resolve(outputPath) === targetSnapshot.resolvedPath ? targetSnapshot : null
  writeValidatedTomlContent(outputPath, content, { expectedSnapshot, generatedConfig })
}

function parseGeneratedTomlContent (filePath, content) {
  const resolvedPath = resolve(filePath)
  try {
    return normalizeDeveloperInstructionNewlines(TOML.parse(content))
  } catch (error) {
    throw new Error(`Refusing to write invalid generated TOML to ${resolvedPath}: ${error.message}`)
  }
}

function writeValidatedTomlContent (filePath, content, { expectedSnapshot = null, generatedConfig = null } = {}) {
  const resolvedPath = resolve(filePath)
  if (generatedConfig === null) {
    parseGeneratedTomlContent(resolvedPath, content)
  }

  mkdirSync(dirname(resolvedPath), { recursive: true })
  const temporaryPath = `${resolvedPath}.${process.pid}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporaryPath, content, 'utf8')
    if (expectedSnapshot !== null) {
      assertTomlSnapshotUnchanged(resolvedPath, expectedSnapshot)
    }
    renameSync(temporaryPath, resolvedPath)
  } finally {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath)
    }
  }
}

function getTomlContentFingerprint (contentBytes) {
  return createHash('sha256').update(contentBytes).digest('hex')
}

function assertTomlSnapshotUnchanged (filePath, expectedSnapshot) {
  const resolvedPath = resolve(filePath)
  const currentSnapshot = readTomlSnapshot(resolvedPath, { allowMissing: true })
  if (currentSnapshot.exists !== expectedSnapshot.exists || currentSnapshot.fingerprint !== expectedSnapshot.fingerprint) {
    throw new Error(`Refusing to replace ${resolvedPath} because it changed while TOML output was being generated.`)
  }
}

function buildMergeInstallTomlContent ({ sourceConfig, mergedConfig, targetConfig = {}, targetText }) {
  const preservedTargetSections = targetText === null || targetText.length === 0
    ? { nestedKeyValueContent: new Map(), preferredRoot: '', preservedNodePaths: new Set(), root: '', tables: '' }
    : collectPreservedTargetTomlSections(targetText, sourceConfig, targetConfig, mergedConfig)
  const sourceContribution = buildMergeInstallSourceContribution(sourceConfig, mergedConfig, targetConfig, preservedTargetSections.preservedNodePaths)
  const managedContent = insertPreservedNestedKeyValueContent(
    TOML.stringify(orderTopLevelKeys(sourceContribution)),
    preservedTargetSections.nestedKeyValueContent
  )

  if (targetText === null || targetText.length === 0) {
    return managedContent
  }

  if (preservedTargetSections.preferredRoot.length === 0 && preservedTargetSections.root.length === 0 && preservedTargetSections.tables.length === 0) {
    return managedContent
  }

  const managedSections = splitTomlRootAndTableContent(managedContent)
  const preservedRootContent = `${preservedTargetSections.preferredRoot}${preservedTargetSections.root}`
  const rootContent = preservedRootContent.length === 0
    ? managedSections.root
    : `${preservedTargetSections.preferredRoot}${removeTrailingBlankLines(managedSections.root)}${preservedTargetSections.root}`
  const tableContent = joinTomlFragments(managedSections.tables, preservedTargetSections.tables)

  if (rootContent.length === 0) {
    return tableContent
  }

  if (tableContent.length === 0) {
    return rootContent
  }

  return joinTomlFragments(rootContent, tableContent)
}

function joinTomlFragments (leftContent, rightContent) {
  if (leftContent.length === 0) {
    return rightContent
  }

  if (rightContent.length === 0) {
    return leftContent
  }

  const normalizedLeft = leftContent.replace(/(?:\r?\n)+$/, '\n')
  const normalizedRight = rightContent.replace(/^(?:\r?\n)+/, '')
  return `${normalizedLeft}\n${normalizedRight}`
}

function buildMergeInstallSourceContribution (sourceConfig, mergedConfig, targetConfig = {}, preservedNodePaths = new Set()) {
  const contribution = {}

  for (const key of Object.keys(sourceConfig)) {
    if (canPreserveTomlValue(targetConfig, mergedConfig, key)) {
      continue
    }

    if (installPreservedTopLevelTables.has(key) || installRemovedTopLevelKeys.has(key) || installPreservedTopLevelKeys.has(key)) {
      continue
    }

    if (partiallyManagedTopLevelTables.has(key) && isTomlObject(sourceConfig[key])) {
      const managedChildren = {}
      for (const childKey of Object.keys(sourceConfig[key])) {
        if (!isTomlObject(mergedConfig[key]) || !hasOwn(mergedConfig[key], childKey)) {
          continue
        }

        managedChildren[childKey] = cloneTomlValue(mergedConfig[key][childKey])
      }

      contribution[key] = managedChildren
      continue
    }

    if (hasOwn(mergedConfig, key)) {
      contribution[key] = cloneTomlValue(mergedConfig[key])
    }
  }

  for (const key of preferredTopLevelKeyOrder) {
    if (!hasOwn(contribution, key) && hasOwn(mergedConfig, key) && !canPreserveTomlValue(targetConfig, mergedConfig, key)) {
      contribution[key] = cloneTomlValue(mergedConfig[key])
    }
  }

  removePreservedTargetPaths(contribution, preservedNodePaths)
  return contribution
}

function cloneTomlValue (value) {
  if (Array.isArray(value)) {
    return value.map((item) => cloneTomlValue(item))
  }

  if (!isTomlObject(value) || value instanceof Date) {
    return value
  }

  const clone = {}
  for (const key of Object.keys(value)) {
    clone[key] = cloneTomlValue(value[key])
  }

  return clone
}

function removePreservedTargetPaths (contribution, preservedNodePaths) {
  for (const pathKey of preservedNodePaths) {
    removeNestedPath(contribution, JSON.parse(pathKey))
  }
}

function getTomlPathKey (pathSegments) {
  return JSON.stringify(pathSegments)
}

function canPreserveTomlValue (targetConfig, mergedConfig, pathSegment) {
  return hasOwn(targetConfig, pathSegment) && hasOwn(mergedConfig, pathSegment) && tomlValuesEqual(targetConfig[pathSegment], mergedConfig[pathSegment])
}

function collectPreservedTargetTomlContent (targetText, sourceConfig, targetConfig = {}, mergedConfig = targetConfig) {
  const sections = collectPreservedTargetTomlSections(targetText, sourceConfig, targetConfig, mergedConfig)
  return `${sections.preferredRoot}${sections.root}${sections.tables}`
}

function collectPreservedTargetTomlSections (targetText, sourceConfig, targetConfig, mergedConfig) {
  let targetAst
  try {
    targetAst = parseTOML(targetText)
  } catch (error) {
    throw new Error(`Failed to parse target TOML syntax for syntax-preserving merge: ${error.message}`)
  }

  const nodes = targetAst.body[0].body
  const preservedNodes = nodes.map((node) => shouldPreserveTargetTomlNode(node, sourceConfig, targetConfig, mergedConfig))
  const nestedKeyValueContent = new Map()
  const preservedNodePaths = new Set()
  let rootContent = ''
  let preferredRootContent = ''
  let tableContent = ''
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (preservedNodes[index] && node.type === 'TOMLTable') {
      preservedNodePaths.add(getTomlPathKey(getTomlNodePath(node)))
    }

    if (node.type === 'TOMLKeyValue' && preservedNodes[index]) {
      preservedNodePaths.add(getTomlPathKey(getTomlNodePath(node)))
    }

    if (node.type === 'TOMLTable' && !preservedNodes[index]) {
      const tablePath = getTomlNodePath(node)
      for (let childIndex = 0; childIndex < node.body.length; childIndex += 1) {
        const childNode = node.body[childIndex]
        const childPath = [...tablePath, ...getTomlNodePath(childNode)]
        if (!shouldPreserveTargetTomlPath(childPath, sourceConfig, targetConfig, mergedConfig)) {
          continue
        }

        preservedNodePaths.add(getTomlPathKey(childPath))
        const childContent = `${getTomlNodeLeadingComment(targetText, node.body[childIndex - 1], childNode, findTomlLineEnd(targetText, node.range[1]))}${targetText.slice(childNode.range[0], findTomlLineEnd(targetText, childNode.range[1]))}`
        const tablePathKey = getTomlPathKey(tablePath)
        const existingEntry = nestedKeyValueContent.get(tablePathKey)
        nestedKeyValueContent.set(tablePathKey, {
          content: `${existingEntry?.content ?? ''}${childContent}`,
          headerContent: existingEntry?.headerContent ?? targetText.slice(node.range[0], findTomlLineEnd(targetText, node.key.range[1])),
          pathSegments: existingEntry?.pathSegments ?? tablePath
        })
      }
    }

    if (!preservedNodes[index] || node.type !== 'TOMLKeyValue') {
      continue
    }

    const nodeContent = `${getTomlNodeLeadingComment(targetText, nodes[index - 1], node)}${targetText.slice(node.range[0], findTomlLineEnd(targetText, node.range[1]))}`
    if (preferredTopLevelKeyOrder.includes(getTomlNodePath(node)[0])) {
      preferredRootContent += nodeContent
    } else {
      rootContent += nodeContent
    }
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (!preservedNodes[index] || node.type !== 'TOMLTable' || (nodes[index - 1] && nodes[index - 1].type === 'TOMLTable' && preservedNodes[index - 1])) {
      continue
    }

    let lastPreservedIndex = index
    while (nodes[lastPreservedIndex + 1] && nodes[lastPreservedIndex + 1].type === 'TOMLTable' && preservedNodes[lastPreservedIndex + 1]) {
      lastPreservedIndex += 1
    }

    const previousNode = nodes[index - 1]
    const nextNode = nodes[lastPreservedIndex + 1]
    const start = previousNode ? findTomlLineEnd(targetText, previousNode.range[1]) : 0
    const end = nextNode ? nextNode.range[0] : targetText.length
    tableContent += targetText.slice(start, end)
  }

  return { nestedKeyValueContent, preferredRoot: preferredRootContent, preservedNodePaths, root: rootContent, tables: tableContent }
}

function splitTomlRootAndTableContent (content) {
  if (content.length === 0) {
    return { root: '', tables: '' }
  }

  const ast = parseTOML(content)
  const firstTable = ast.body[0].body.find((node) => node.type === 'TOMLTable')
  if (!firstTable) {
    return { root: content, tables: '' }
  }

  return {
    root: content.slice(0, firstTable.range[0]),
    tables: content.slice(firstTable.range[0])
  }
}

function insertPreservedNestedKeyValueContent (managedContent, nestedKeyValueContent) {
  if (managedContent.length === 0 || nestedKeyValueContent.size === 0) {
    return managedContent
  }

  const managedAst = parseTOML(managedContent)
  const managedTableNodes = managedAst.body[0].body.filter((node) => node.type === 'TOMLTable')
  const insertions = []
  const matchedTablePaths = new Set()
  for (const node of managedTableNodes) {
    const tablePathKey = getTomlPathKey(getTomlNodePath(node))
    const preservedEntry = nestedKeyValueContent.get(tablePathKey)
    if (typeof preservedEntry === 'undefined') {
      continue
    }

    matchedTablePaths.add(tablePathKey)
    insertions.push({ content: preservedEntry.content, offset: findTomlLineEnd(managedContent, node.range[1]) })
  }

  for (const [tablePathKey, preservedEntry] of nestedKeyValueContent) {
    if (matchedTablePaths.has(tablePathKey)) {
      continue
    }

    const firstDescendantTable = managedTableNodes.find((node) => isTomlPathPrefix(preservedEntry.pathSegments, getTomlNodePath(node)) && preservedEntry.pathSegments.length < getTomlNodePath(node).length)
    const offset = firstDescendantTable ? firstDescendantTable.range[0] : managedContent.length
    insertions.push({
      content: `${offset === managedContent.length && managedContent.length > 0 && !managedContent.endsWith('\n') ? '\n' : ''}${preservedEntry.headerContent}${preservedEntry.content}${preservedEntry.content.endsWith('\n\n') ? '' : '\n'}`,
      offset
    })
  }

  let content = managedContent
  for (const insertion of insertions.sort((left, right) => right.offset - left.offset)) {
    content = `${content.slice(0, insertion.offset)}${insertion.content}${content.slice(insertion.offset)}`
  }

  return content
}

function isTomlPathPrefix (prefix, candidate) {
  return prefix.length <= candidate.length && prefix.every((segment, index) => segment === candidate[index])
}

function removeTrailingBlankLines (content) {
  return content.replace(/(?:\r?\n){2,}$/, '\n')
}

function findTomlLineEnd (content, offset) {
  const lineBreak = /\r?\n/.exec(content.slice(offset))
  return lineBreak ? offset + lineBreak.index + lineBreak[0].length : content.length
}

function getTomlNodeLeadingComment (content, previousNode, node, fallbackStart = 0) {
  const start = previousNode ? findTomlLineEnd(content, previousNode.range[1]) : fallbackStart
  const trivia = content.slice(start, node.range[0])
  return /#[^\r\n]*/.test(trivia) ? trivia : ''
}

function shouldPreserveTargetTomlNode (node, sourceConfig, targetConfig, mergedConfig) {
  const pathSegments = getTomlNodePath(node)
  return shouldPreserveTargetTomlPath(pathSegments, sourceConfig, targetConfig, mergedConfig)
}

function shouldPreserveTargetTomlPath (pathSegments, sourceConfig, targetConfig, mergedConfig) {
  if (pathSegments.length === 0) {
    return false
  }

  const [topLevelKey, childKey] = pathSegments
  if (isRemovedTomlPath(pathSegments)) {
    return false
  }

  const targetValue = getTomlPathValue(targetConfig, pathSegments)
  const mergedValue = getTomlPathValue(mergedConfig, pathSegments)
  if (typeof targetValue !== 'undefined' && typeof mergedValue !== 'undefined' && tomlValuesEqual(targetValue, mergedValue)) {
    return true
  }

  if (installRemovedTopLevelKeys.has(topLevelKey)) {
    return false
  }

  if (installPreservedTopLevelKeys.has(topLevelKey) || installPreservedTopLevelTables.has(topLevelKey)) {
    return true
  }

  if (!hasOwn(sourceConfig, topLevelKey)) {
    return true
  }

  if (!partiallyManagedTopLevelTables.has(topLevelKey)) {
    return false
  }

  if (typeof childKey === 'undefined') {
    return false
  }

  return !isTomlObject(sourceConfig[topLevelKey]) || !hasOwn(sourceConfig[topLevelKey], childKey)
}

function isRemovedTomlPath (pathSegments) {
  return installRemovedNestedPaths.some((removedPath) => {
    if (pathSegments.length < removedPath.length) {
      return false
    }

    return removedPath.every((segment, index) => pathSegments[index] === segment)
  })
}

function getTomlPathValue (config, pathSegments) {
  let currentValue = config
  for (const segment of pathSegments) {
    if (currentValue === null || typeof currentValue !== 'object' || !hasOwn(currentValue, segment)) {
      return undefined
    }

    currentValue = currentValue[segment]
  }

  return currentValue
}

function tomlValuesEqual (leftValue, rightValue) {
  if (leftValue === rightValue) {
    return true
  }

  if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
    if (!Array.isArray(leftValue) || !Array.isArray(rightValue) || leftValue.length !== rightValue.length) {
      return false
    }

    return leftValue.every((value, index) => tomlValuesEqual(value, rightValue[index]))
  }

  if (isTomlObject(leftValue) || isTomlObject(rightValue)) {
    if (!isTomlObject(leftValue) || !isTomlObject(rightValue)) {
      return false
    }

    const leftKeys = Object.keys(leftValue).sort()
    const rightKeys = Object.keys(rightValue).sort()
    if (leftKeys.length !== rightKeys.length || leftKeys.some((key, index) => key !== rightKeys[index])) {
      return false
    }

    return leftKeys.every((key) => tomlValuesEqual(leftValue[key], rightValue[key]))
  }

  return false
}

function getTomlNodePath (node) {
  if (node.type === 'TOMLTable') {
    return node.resolvedKey.filter((segment) => typeof segment === 'string')
  }

  if (node.type === 'TOMLKeyValue') {
    return node.key.keys.map((key) => key.type === 'TOMLQuoted' ? key.value : key.name)
  }

  return []
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
  for (const key of Object.keys(candidateValue)) {
    if (!hasOwn(allowlistValue, key)) {
      continue
    }

    filteredValue[key] = candidateValue[key]
  }

  return filteredValue
}

function buildMergeInstallConfig (sourceConfig, targetConfig) {
  const mergedConfig = {}

  for (const key of Object.keys(sourceConfig)) {
    if (installPreservedTopLevelTables.has(key) || installRemovedTopLevelKeys.has(key) || installPreservedTopLevelKeys.has(key)) {
      continue
    }

    if (partiallyManagedTopLevelTables.has(key) && hasOwn(targetConfig, key)) {
      mergedConfig[key] = mergeNamedChildEntries(sourceConfig[key], targetConfig[key])
      continue
    }

    mergedConfig[key] = sourceConfig[key]
  }

  for (const key of Object.keys(targetConfig)) {
    if (installPreservedTopLevelTables.has(key) || installRemovedTopLevelKeys.has(key)) {
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

  for (const tableName of installPreservedTopLevelTables) {
    if (hasOwn(targetConfig, tableName)) {
      mergedConfig[tableName] = targetConfig[tableName]
    }
  }

  preserveNestedPaths(mergedConfig, targetConfig, installPreservedNestedPaths)
  removeNestedPaths(mergedConfig, installRemovedNestedPaths)
  return mergedConfig
}

function buildPublishedSyncConfig (localConfig, managedConfig) {
  const publishedConfig = {}
  const managedTopLevelKeys = new Set(Object.keys(managedConfig))

  for (const key of Object.keys(localConfig)) {
    if (!managedTopLevelKeys.has(key) || syncExcludedTopLevelKeys.has(key)) {
      continue
    }

    if (syncAllowlistedChildTables.has(key)) {
      const managedAllowlist = isTomlObject(managedConfig[key]) ? managedConfig[key] : {}
      publishedConfig[key] = pickNamedChildEntriesByAllowlist(localConfig[key], managedAllowlist)
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

function preserveNestedPaths (destinationConfig, sourceConfig, nestedPaths) {
  for (const pathSegments of nestedPaths) {
    preserveNestedPath(destinationConfig, sourceConfig, pathSegments)
  }
}

function preserveNestedPath (destinationConfig, sourceConfig, pathSegments) {
  if (pathSegments.length < 2) {
    return
  }

  const sourceValue = readNestedPath(sourceConfig, pathSegments)
  if (typeof sourceValue === 'undefined') {
    removeNestedPath(destinationConfig, pathSegments)
    return
  }

  writeNestedPath(destinationConfig, pathSegments, sourceValue)
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

function readNestedPath (config, pathSegments) {
  let currentValue = config

  for (const pathSegment of pathSegments) {
    if (!isTomlObject(currentValue) || !hasOwn(currentValue, pathSegment)) {
      return undefined
    }

    currentValue = currentValue[pathSegment]
  }

  return currentValue
}

function writeNestedPath (config, pathSegments, value) {
  let currentValue = config

  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const pathSegment = pathSegments[index]
    if (!isTomlObject(currentValue[pathSegment])) {
      currentValue[pathSegment] = {}
    }

    currentValue = currentValue[pathSegment]
  }

  currentValue[pathSegments[pathSegments.length - 1]] = value
}

function mergeInstallConfig ({ sourcePath, targetPath, outputPath }) {
  const sourceConfig = readTomlFile(sourcePath)
  const targetSnapshot = readTomlSnapshot(targetPath, { allowMissing: true })
  writeMergeInstallTomlFile({
    outputPath,
    sourceConfig,
    targetSnapshot
  })
}

function publishSyncConfig ({ localPath, managedPath, outputPath }) {
  const localConfig = readTomlFile(localPath)
  const managedSnapshot = readTomlSnapshot(managedPath)
  const managedConfig = managedSnapshot.config
  const publishedConfig = buildPublishedSyncConfig(localConfig, managedConfig)
  const expectedSnapshot = resolve(outputPath) === managedSnapshot.resolvedPath ? managedSnapshot : null
  writeTomlFile(outputPath, publishedConfig, { expectedSnapshot })
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
  buildMergeInstallTomlContent,
  buildPublishedSyncConfig,
  collectPreservedTargetTomlContent,
  configTomlPolicy,
  ensureSupportedNodeVersion,
  mergeInstallConfig,
  orderTopLevelKeys,
  parseArguments,
  publishSyncConfig,
  readTomlSnapshot,
  writeValidatedTomlContent,
  installRemovedTopLevelKeys,
  installRemovedNestedPaths,
  syncExcludedNestedPaths,
  syncExcludedTopLevelKeys,
  syncAllowlistedChildTables,
  installPreservedTopLevelKeys,
  syncExcludedInstallPreservedNestedPaths
}

if (require.main === module) {
  try {
    runCli()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
