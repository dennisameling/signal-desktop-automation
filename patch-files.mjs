import {readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

if (!process.env.SIGNAL_DIR) {
    throw new Error(`SIGNAL_DIR environment variable not set`)
}

const signalRoot = process.env.SIGNAL_DIR;
console.log(`Signal root dir is ${signalRoot}`)

// npm deprecations are retroactive: a version that was fine when Signal tagged
// a release can be deprecated afterwards. Signal's .pnpmfile.mjs then fails
// `pnpm install` unless the version is listed in allowedDeprecatedVersions.
// Their own CI never trips over this (a frozen-lockfile install skips the
// hook), but ours re-resolves — see the --no-frozen-lockfile note in
// release.yml — so we hit it on tags upstream has already moved past.
// Versions here are unioned with whatever the tag allows; drop an entry once
// every tag we still build allows it upstream.
const EXTRA_ALLOWED_DEPRECATED = {
    // Deprecated 2026-08-12; upstream allowed the same two versions on main
    // (v8.24.0-beta.1) right after tagging v8.23.0.
    '@xmldom/xmldom': '0.8.13 || 0.9.10',
}

// Rewrite Signal's branding fields (name, productName, appId, …) so the build
// is clearly an unofficial fork.
const overwritePackageJson = () => {
    console.log('🔎 Rewriting package.json branding fields...')
    const filePath = path.join(signalRoot, 'package.json')
    const file = readFileSync(filePath, {encoding: 'utf-8'})
    const parsedConfig = JSON.parse(file)

    if (!parsedConfig.name || !parsedConfig.build?.appId) {
        throw new Error(`name or build.appId missing in ${filePath}`)
    }

    parsedConfig.name = 'signal-desktop-unofficial'
    parsedConfig.productName = 'Signal Unofficial'
    parsedConfig.description = 'Private messaging from your desktop (UNOFFICIAL)'
    parsedConfig.desktopName = 'signal.desktop.unofficial'
    parsedConfig.build.appId = 'com.dennisameling.signal-desktop'

    writeFileSync(filePath, JSON.stringify(parsedConfig, null, 2), {encoding: 'utf-8'})
}

// Where a top-level YAML block ends: at the first line that isn't indented.
const blockEnd = (yaml, blockStart) => {
    const next = yaml.slice(blockStart).match(/\n(?=\S)/)
    return next ? blockStart + next.index + 1 : yaml.length
}

const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// '0.8.10' + '0.8.13 || 0.9.10' -> '0.8.10 || 0.8.13 || 0.9.10'. Signal's
// check does exact-version matching on the `||`-separated parts, no ranges.
const unionVersions = (...ranges) => {
    const versions = ranges.flatMap((range) => range.split('||').map((version) => version.trim())).filter(Boolean)
    return [...new Set(versions)].join(' || ')
}

// Merge EXTRA_ALLOWED_DEPRECATED into the tag's allowedDeprecatedVersions,
// keeping the versions upstream already allows.
const allowDeprecatedVersions = () => {
    const filePath = path.join(signalRoot, 'pnpm-workspace.yaml')
    let yaml = readFileSync(filePath, {encoding: 'utf-8'})

    const headerPattern = /^allowedDeprecatedVersions[ \t]*:[ \t]*$/m
    // Upstream would only drop the block along with the check that reads it,
    // so re-adding it is harmless either way.
    if (!headerPattern.test(yaml)) {
        yaml = `${yaml.trimEnd()}\n\nallowedDeprecatedVersions:\n`
    }
    const header = yaml.match(headerPattern)
    const blockStart = header.index + header[0].length
    const end = blockEnd(yaml, blockStart)
    let block = yaml.slice(blockStart, end)

    for (const [name, versions] of Object.entries(EXTRA_ALLOWED_DEPRECATED)) {
        const entry = new RegExp(`^([ \\t]+)'?${escapeForRegExp(name)}'?[ \\t]*:[ \\t]*'?([^'\\n]*?)'?[ \\t]*$`, 'm')
        const existing = block.match(entry)
        block = existing
            ? block.replace(entry, `${existing[1]}'${name}': '${unionVersions(existing[2], versions)}'`)
            : `\n  '${name}': '${versions}'${block}`
    }

    writeFileSync(filePath, `${yaml.slice(0, blockStart)}${block}${yaml.slice(end)}`, {encoding: 'utf-8'})
    console.log('✅ Merged deprecation allowances into pnpm-workspace.yaml')
    console.log(JSON.stringify(EXTRA_ALLOWED_DEPRECATED, null, 2))
}

const run = () => {
    overwritePackageJson()
    allowDeprecatedVersions()
}

run()
