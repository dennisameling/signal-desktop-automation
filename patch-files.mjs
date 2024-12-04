import {readFileSync, writeFileSync} from 'fs'
import path from 'path'

if (!process.env.SIGNAL_DIR) {
    throw new Error(`SIGNAL_DIR environment variable not set`)
}

// Note: this assumes that this script is running in the directory where Signal Desktop files are checked out
const signalRoot = process.env.SIGNAL_DIR;
console.log(`Signal root dir is ${signalRoot}`)

const assertAndReplaceStringInFile = (filePath, stringToMatch, replacement) => {
    const file = readFileSync(filePath, {encoding: 'utf-8'})
    if (!file.includes(stringToMatch)) {
        throw new Error(`Pattern not found in ${filePath}: ${stringToMatch}`)
    }
    writeFileSync(filePath, file.replace(stringToMatch, replacement), {encoding: 'utf-8'})
}

const overwritePackageJson = () => {
    console.log('🔎 Ensuring that the package.json has our custom name, appId, etc. ...')
    const filePath = path.join(signalRoot, '/package.json')
    const file = readFileSync(filePath, {encoding: 'utf-8'})
    const parsedConfig = JSON.parse(file)

    if (!parsedConfig.name || !parsedConfig.build.appId) {
        throw new Error(`name or build.appId missing in ${filePath}`)
    }

    parsedConfig.name = 'signal-desktop-unofficial'
    parsedConfig.productName = 'Signal Unofficial'
    parsedConfig.description = 'Private messaging from your desktop (UNOFFICIAL)'
    parsedConfig.desktopName = 'signal.desktop.unofficial'
    
    parsedConfig.build.appId = 'com.dennisameling.signal-desktop'

    writeFileSync(filePath, JSON.stringify(parsedConfig, null, 2), {encoding: 'utf-8'})
}

const run = () => {
    overwritePackageJson()
}

run()
