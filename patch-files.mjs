import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

if (!process.env.SIGNAL_DIR) {
    throw new Error(`SIGNAL_DIR environment variable not set`)
}

const signalRoot = process.env.SIGNAL_DIR;
console.log(`Signal root dir is ${signalRoot}`)

// Patches we add on top of Signal's own. Signal declares its patches in
// pnpm-workspace.yaml under `patchedDependencies`; we merge ours into that
// existing block (see addPatchesToWorkspaceYaml).
const EXTRA_PATCHES = {
    // arm64 Linux on Raspberry Pi devices.
    'fs-extra@11.3.4': 'patches/fs-extra+11.3.4.patch',
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

// 'fs-extra@11.3.4' -> 'fs-extra'; '@scope/pkg@1.2.3' -> '@scope/pkg'.
const packageName = (key) => {
    const at = key.lastIndexOf('@')
    return at > 0 ? key.slice(0, at) : key
}

// Collect the package names already declared in the patchedDependencies block:
// every indented entry under the header, up to the next top-level key.
const existingPatchedPackages = (yaml, blockStart) => {
    const packages = new Set()
    for (const line of yaml.slice(blockStart).split('\n')) {
        if (line.trim() === '') continue
        if (!/^\s/.test(line)) break // first unindented line = next top-level key
        const entry = line.match(/^\s+'?([^'":#\s][^'":]*?)'?[ \t]*:/)
        if (entry) packages.add(packageName(entry[1].trim()))
    }
    return packages
}

// pnpm v10 reads `patchedDependencies` from pnpm-workspace.yaml, where Signal
// now declares all of its own patches. We merge ours into that existing block
// rather than maintaining a separate copy of Signal's list. We bail loudly if
// the block is missing (upstream moved it) or already patches one of our
// packages (upstream started patching it too) instead of silently producing a
// broken file.
const addPatchesToWorkspaceYaml = () => {
    const filePath = path.join(signalRoot, 'pnpm-workspace.yaml')
    if (!existsSync(filePath)) {
        throw new Error(`Expected ${filePath} to exist. Has upstream's layout changed?`)
    }
    const original = readFileSync(filePath, {encoding: 'utf-8'})

    const header = original.match(/^patchedDependencies[ \t]*:[ \t]*$/m)
    if (!header) {
        throw new Error(`pnpm-workspace.yaml no longer declares patchedDependencies. Upstream layout changed — update this script.`)
    }
    const blockStart = header.index + header[0].length

    const alreadyPatched = existingPatchedPackages(original, blockStart)
    for (const key of Object.keys(EXTRA_PATCHES)) {
        if (alreadyPatched.has(packageName(key))) {
            throw new Error(`pnpm-workspace.yaml already patches ${packageName(key)}. Update EXTRA_PATCHES to merge with Signal's patch instead of duplicating it.`)
        }
    }

    const yamlEntries = Object.entries(EXTRA_PATCHES)
        .map(([key, value]) => `  '${key}': '${value}'`)
        .join('\n')
    const merged = `${original.slice(0, blockStart)}\n${yamlEntries}${original.slice(blockStart)}`

    writeFileSync(filePath, merged, {encoding: 'utf-8'})
    console.log(`✅ Merged ${Object.keys(EXTRA_PATCHES).length} patch entr${Object.keys(EXTRA_PATCHES).length === 1 ? 'y' : 'ies'} into pnpm-workspace.yaml`)
    console.log(JSON.stringify(EXTRA_PATCHES, null, 2))
}

const run = () => {
    overwritePackageJson()
    addPatchesToWorkspaceYaml()
}

run()
