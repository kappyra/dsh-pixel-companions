#!/usr/bin/env node
/**
 * Documentation checks for every shipped language.
 *
 *   node tools/check-docs.mjs
 *
 * 1. Every relative Markdown link resolves to a file in the repository.
 * 2. Every translation keeps the structure of its English source: identical
 *    heading levels in order, byte-identical fenced code blocks, the same table
 *    row counts per table, and the same inline-code tokens.
 *
 * No dependencies; Node 20+.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/** Languages whose documentation mirrors the English set. */
const LANGUAGES = ['zh', 'ru', 'vi', 'ja', 'ko']
/** The canonical English documents. */
const DOCUMENT_NAMES = ['installation', 'usage', 'compatibility', 'scenes', 'development', 'troubleshooting', 'desktop']

const problems = []
const fail = (message) => problems.push(message)

/** All Markdown files under a directory, recursively. */
function markdownFiles(directory) {
  const found = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...markdownFiles(path))
    else if (entry.name.endsWith('.md')) found.push(path)
  }
  return found
}

/** Check every relative link and image target in one file. */
function checkLinks(file) {
  const text = readFileSync(file, 'utf8')
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  for (const match of text.matchAll(pattern)) {
    const target = match[1]
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue
    const withoutAnchor = target.split('#')[0]
    if (withoutAnchor === '') continue
    const decoded = decodeURIComponent(withoutAnchor)
    const path = resolve(dirname(file), decoded)
    if (!existsSync(path)) fail(`${relative(ROOT, file)}: broken link -> ${target}`)
  }
}

/** Structural summary of one Markdown document. */
function structure(file) {
  const lines = readFileSync(file, 'utf8').split('\n')
  const headings = []
  const fences = []
  const tables = []
  const inlineCode = []
  let fence = null
  let fenceLines = []
  let tableRows = 0
  const flushTable = () => {
    if (tableRows > 0) tables.push(tableRows)
    tableRows = 0
  }
  for (const line of lines) {
    if (fence !== null) {
      if (line.trimStart().startsWith('```')) {
        fences.push([fence, ...fenceLines].join('\n'))
        fence = null
        fenceLines = []
      } else {
        fenceLines.push(line)
      }
      continue
    }
    const opened = line.match(/^\s*```(.*)$/)
    if (opened !== null) {
      flushTable()
      fence = opened[1].trim()
      fenceLines = []
      continue
    }
    const heading = line.match(/^(#{1,6})\s+/)
    if (heading !== null) {
      flushTable()
      headings.push(heading[1].length)
      continue
    }
    if (line.trimStart().startsWith('|')) tableRows += 1
    else flushTable()
    for (const code of line.matchAll(/`([^`\n]+)`/g)) inlineCode.push(code[1])
  }
  flushTable()
  return { headings, fences, tables, inlineCode: inlineCode.sort() }
}

/** Compare a translation with its English source. */
function checkParity(sourceFile, translationFile) {
  const source = structure(sourceFile)
  const translation = structure(translationFile)
  const label = relative(ROOT, translationFile)
  const same =
    (left, right) => JSON.stringify(left) === JSON.stringify(right)
  if (!same(source.headings, translation.headings)) fail(`${label}: heading outline differs from ${relative(ROOT, sourceFile)}`)
  if (!same(source.fences, translation.fences)) fail(`${label}: fenced code blocks differ from ${relative(ROOT, sourceFile)}`)
  if (!same(source.tables, translation.tables)) fail(`${label}: table row counts differ from ${relative(ROOT, sourceFile)}`)
  if (!same(source.inlineCode, translation.inlineCode)) fail(`${label}: inline-code tokens differ from ${relative(ROOT, sourceFile)}`)
}

function main() {
  const files = markdownFiles(ROOT)
  for (const file of files) checkLinks(file)

  const readme = join(ROOT, 'README.md')
  for (const language of LANGUAGES) {
    const translated = join(ROOT, `README.${language}.md`)
    if (!existsSync(translated)) {
      fail(`missing README.${language}.md`)
      continue
    }
    checkParity(readme, translated)
    for (const name of DOCUMENT_NAMES) {
      const source = join(ROOT, 'docs', `${name}.md`)
      const target = join(ROOT, 'docs', language, `${name}.md`)
      if (!existsSync(target)) {
        fail(`missing docs/${language}/${name}.md`)
        continue
      }
      checkParity(source, target)
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`error: ${problem}`)
    console.error(`\n${problems.length} documentation problem(s) found.`)
    process.exit(1)
  }
  const languages = LANGUAGES.join(', ')
  console.log(`ok: ${files.length} Markdown files, links resolve; ${languages} mirror the English structure (${DOCUMENT_NAMES.length} docs + README each)`)
}

main()
