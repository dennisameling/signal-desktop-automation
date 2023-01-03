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

const overwriteConfigJson = () => {
    console.log('🔎 Ensuring that our custom update URL and public key are in place...')
    const filePath = path.join(signalRoot, '/config/default.json')
    const file = readFileSync(filePath, {encoding: 'utf-8'})
    const parsedConfig = JSON.parse(file)

    // Ensure that the official, existing updatesUrl and updatesPublicKey properties are in place
    if (!parsedConfig.updatesUrl || !parsedConfig.updatesPublicKey) {
        throw new Error(`updatesUrl or updatesPublicKey missing in ${filePath}`)
    }

    if (!process.env.PUBLIC_KEY) {
        throw new Error(`PUBLIC_KEY environment variable not set`)
    }

    parsedConfig.updatesUrl = 'https://signal2.dennisameling.com'
    parsedConfig.updatesPublicKey = process.env.PUBLIC_KEY
    parsedConfig.certificateAuthorityUpdates = "-----BEGIN CERTIFICATE-----\nMIIF6TCCA9GgAwIBAgIUEvVKTvYsY9XabKlSFMYeDjGQIFAwDQYJKoZIhvcNAQEL\nBQAwgYMxCzAJBgNVBAYTAk5MMRUwEwYDVQQIDAxadWlkLUhvbGxhbmQxEjAQBgNV\nBAcMCURvcmRyZWNodDEXMBUGA1UECgwORGVubmlzIEFtZWxpbmcxFzAVBgNVBAsM\nDkRlbm5pcyBBbWVsaW5nMRcwFQYDVQQDDA5EZW5uaXMgQW1lbGluZzAeFw0yMTA2\nMDUxMTI5MTFaFw0yNDAzMjUxMTI5MTFaMIGDMQswCQYDVQQGEwJOTDEVMBMGA1UE\nCAwMWnVpZC1Ib2xsYW5kMRIwEAYDVQQHDAlEb3JkcmVjaHQxFzAVBgNVBAoMDkRl\nbm5pcyBBbWVsaW5nMRcwFQYDVQQLDA5EZW5uaXMgQW1lbGluZzEXMBUGA1UEAwwO\nRGVubmlzIEFtZWxpbmcwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDG\nu/Vxt00o/l3r6eiNDpvhm9Z9hsvOmPz2B3sr5N/pIul3gySRDkk5fNtZxg5IiscS\n/LefzeIKBWkcrIm0B50yq8Ly2jsDexYMheeFlCyw/fdtf357j2GfjCRng5MuoVeu\niqOrekp2CmqkpjpYD10vBcljFzDiMo0TfbV9/o6O5woAcMB9OCP235LmUSHomQ2Y\nua/NC/qEkI/2cMA4fhBGbSPXe6e2U4xCMbIee0nNEQV1Daz52H+koG5nFetpmOU8\n/GajLwK7bP5EsvcTiImeqdl5pmd4lgWLG0njXlMwAtjK6FNjJerYeXAWFofIVewm\n/TAJZyOjP2wOCnFysqeWflUvPViKqHG15uZpBHlkW5sR/5cSuHBt8RsJFDgDwtaG\nfKGnM0qcb53Ysg0sLjkrer4KzSR/s6CbGUPB5ODBCBYe/ATwpAXRO4VwESk9oePA\ni0lF5DLqJYw3cPmd6kIJk/ggWv+fDDd2KL+f9Cp/NSSq7NcL8Lj1T6l86N377hqt\ndAi+7IxIFPtvWSPmZU1mShgiKLUPpTrCKvE6q9u/7ADoBMKDijXd4Sa9HVIuoV+j\nek2hDPTqRxr5KoME6y5tGPcehAxLKv4YShsH7O0JV1RnvKS+4u7M9DFWPG/vxavd\n4ifSK9eI19L/hUP4XwJdJlIoGegu2kk8h+vjutjnuQIDAQABo1MwUTAdBgNVHQ4E\nFgQUM91q0TBKOsROHbaBP0aKGBXmdkEwHwYDVR0jBBgwFoAUM91q0TBKOsROHbaB\nP0aKGBXmdkEwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAgEAw0UO\nxfI1JXrTDf81QBY/Ga1CJNseVHaJAbTvCoMVfqTvOuiLhevzWhmZsCyWqeF186wq\nm8+xCLX07gKqwssg+lVpOA+NXI083YKzhefE3RePXye9XOXSfWk9w7RDqeS79ZZC\n1AFxVt5Qz9Vi6oDbfO2GFT7H3GHFoNlrx+Fy1EhzRxBV6WUYOtnYM3rTraUCchhr\nkIJptrxXpRIiYdrqoikxuhUe/XH7NMGGXEt0MSE6Ce41QZQWYTCtWWXunoiY4cGa\nev6H9OlxAByf+7CG0PBGWDPa3qm3Gfh1VLuZLxG3Y1+GYRsCFJdZp2gKxizUPS6M\n53LoXxN+DZpt0WfnjLc7fhGIS5qqTRcp7Xix7iX1UPG8oyBdRvMnggyAxbAUQjDt\nETZMpt7iRn8BAXrhltnj9HjWBHMNH83zMNmx8RW+4I/tosaDGCUaTB95Akcekqsr\nadc0fcWW3vbZK6rjUy6RhbGAX5hNWdUx7v6ntA6fTsTfKFg4UTsbGvYDRtswLdKn\n2PIjB+CtvRRissAgL9C/cDR5JDCgPJEuB4vEIyIKiV29vM7nFGnkkNDNDtblKM0G\n2ix12AhsCkDFkg188Sh5kHV0sAcgu8thleV7vNewKrRA2Mb7IcJ61GpkIGu1GR0X\nDCgUkOKamjy5bDa5UJySzFviRNwJIsbkKgHHdak=\n-----END CERTIFICATE-----"

    writeFileSync(filePath, JSON.stringify(parsedConfig, null, 2), {encoding: 'utf-8'})
}

const overwritePackageJson = () => {
    console.log('🔎 Ensuring that the package.json has our custom name, appId, etc. ...')
    const filePath = path.join(signalRoot, '/package.json')
    const file = readFileSync(filePath, {encoding: 'utf-8'})
    const parsedConfig = JSON.parse(file)

    // Ensure that the official, existing updatesUrl and updatesPublicKey properties are in place
    if (!parsedConfig.name || !parsedConfig.build.appId || !parsedConfig.build.win.artifactName) {
        throw new Error(`name, build.appId or build.win.artifactName missing in ${filePath}`)
    }

    parsedConfig.name = 'signal-desktop-unofficial'
    parsedConfig.productName = 'Signal Unofficial'
    parsedConfig.description = 'Private messaging from your desktop (UNOFFICIAL)'
    parsedConfig.desktopName = 'signal.desktop.unofficial'
    
    parsedConfig.build.appId = 'com.dennisameling.signal-desktop'
    parsedConfig.build.win.artifactName = '${name}-win-${arch}-${version}.${ext}'
    parsedConfig.build.win.target = [
        {
            target: "nsis",
            arch: [
                "arm64"
            ]
        }
    ]
    delete parsedConfig.build.win.certificateSubjectName
    delete parsedConfig.build.win.certificateSha1
    delete parsedConfig.build.win.signingHashAlgorithms

    writeFileSync(filePath, JSON.stringify(parsedConfig, null, 2), {encoding: 'utf-8'})
}

const overwriteCertificateAuthority = () => {
    console.log('🔎 Ensuring that we use our custom certificate authority...')
    assertAndReplaceStringInFile(
        path.join(signalRoot, '/ts/updater/got.ts'),
        "config.get('certificateAuthority')",
        "config.get('certificateAuthorityUpdates')"
    )
}

const skipUpdaterKeyVerificationTest = () => {
    console.log('🔎 Ensuring that we skip the updater key verification...')
    assertAndReplaceStringInFile(
        path.join(signalRoot, '/ts/test-node/updater/curve_test.ts'),
        "it('verifies with our own key'",
        "it.skip('verifies with our own key'"
    )
}

const run = () => {
    overwriteConfigJson()
    overwritePackageJson()
    overwriteCertificateAuthority()
    skipUpdaterKeyVerificationTest()
}

run()
