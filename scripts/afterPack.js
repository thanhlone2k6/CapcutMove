const { execSync } = require('child_process')
const path = require('path')

module.exports = async function (context) {
  // Only sign for macOS targets
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  // macOS signing command requires a macOS host machine
  if (process.platform !== 'darwin') {
    console.warn('Skipping macOS ad-hoc signing: building on non-macOS platform.')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)

  console.log(`Running macOS post-build ad-hoc signing for: ${appPath}`)

  try {
    const scriptPath = path.join(__dirname, 'post-build-mac.sh')
    // Run the shell script, passing the packed .app directory as an argument
    execSync(`bash "${scriptPath}" "${appPath}"`, {
      stdio: 'inherit'
    })
  } catch (error) {
    console.error('Error executing macOS post-build ad-hoc signing script:', error)
    throw error // Fail the build if signing fails
  }
}
