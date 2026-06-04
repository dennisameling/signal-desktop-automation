import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

if (!process.env.SIGNAL_DIR) {
    throw new Error(`SIGNAL_DIR environment variable not set`)
}

const signalRoot = process.env.SIGNAL_DIR;
console.log(`Signal root dir is ${signalRoot}`)

const EXTRA_PATCHES = {
    // arm64 Linux on Raspberry Pi devices.
    'fs-extra@11.3.4': 'patches/fs-extra+11.3.4.patch',
}

// We keep branding mutations (name, productName, appId, …) in package.json,
// but move `patchedDependencies` to pnpm-workspace.yaml so we don't have to
// touch Signal's `pnpm` block. Returns Signal's existing patches so the
// caller can merge them with ours.
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

    const signalPatches = parsedConfig.pnpm?.patchedDependencies ?? {}
    if (parsedConfig.pnpm?.patchedDependencies) {
        delete parsedConfig.pnpm.patchedDependencies
    }

    writeFileSync(filePath, JSON.stringify(parsedConfig, null, 2), {encoding: 'utf-8'})
    return signalPatches
}

// pnpm v10 reads `patchedDependencies` from pnpm-workspace.yaml. We consolidate
// Signal's patches + ours there to avoid any precedence ambiguity with the
// `pnpm.patchedDependencies` field in package.json. If Signal ever ships its
// own `patchedDependencies:` key in the workspace file, we bail loudly rather
// than silently overwriting.
const writePatchesToWorkspaceYaml = (signalPatches) => {
    const filePath = path.join(signalRoot, 'pnpm-workspace.yaml')
    if (!existsSync(filePath)) {
        throw new Error(`Expected ${filePath} to exist. Has upstream's layout changed?`)
    }
    const original = readFileSync(filePath, {encoding: 'utf-8'})
    if (/^patchedDependencies\s*:/m.test(original)) {
        throw new Error(`pnpm-workspace.yaml already declares patchedDependencies. Update this script to merge instead of append.`)
    }

    const allPatches = {...signalPatches, ...EXTRA_PATCHES}
    const yamlEntries = Object.entries(allPatches)
        .map(([key, value]) => `  '${key}': '${value}'`)
        .join('\n')
    const appended = `${original.trimEnd()}\n\npatchedDependencies:\n${yamlEntries}\n`

    writeFileSync(filePath, appended, {encoding: 'utf-8'})
    console.log(`✅ Wrote ${Object.keys(allPatches).length} patch entries to pnpm-workspace.yaml`)
    console.log(JSON.stringify(allPatches, null, 2))
}

const run = () => {
    const signalPatches = overwritePackageJson()
    writePatchesToWorkspaceYaml(signalPatches)
}

run()
