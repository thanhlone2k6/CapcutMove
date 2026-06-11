const { app, BrowserWindow, session } = require('electron')

app.whenReady().then(async () => {
    const hiddenWin = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:douyin',
        javascript: true,
        backgroundThrottling: false
      }
    })

    hiddenWin.webContents.setAudioMuted(true)
    hiddenWin.webContents.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

    hiddenWin.webContents.session.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      if (!details.url.startsWith('http://') && !details.url.startsWith('https://') && !details.url.startsWith('devtools://')) {
        callback({ cancel: true })
      } else {
        callback({})
      }
    })

    hiddenWin.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' }
    })

    hiddenWin.webContents.on('will-navigate', (e, navUrl) => {
      if (!navUrl.startsWith('http://') && !navUrl.startsWith('https://')) {
        e.preventDefault()
      }
    })

    let maxQualityUrl = null

    hiddenWin.webContents.on('did-finish-load', async () => {
      try {
        const bestUrl = await hiddenWin.webContents.executeJavaScript(`
          (function() {
            try {
              const el = document.getElementById('RENDER_DATA');
              if (!el) {
                  return 'NO_RENDER_DATA: ' + Array.from(document.querySelectorAll('script')).map(s => s.id).filter(id => id).join(', ');
              }
              const renderData = decodeURIComponent(el.innerText);
              return 'RAW_DATA:' + renderData;
            } catch (e) {
              return 'ERR_JS: ' + e.message;
            }
          })()
        `)
        
        console.log('BEST URL EXTRACTED: ' + bestUrl)
        if (bestUrl && bestUrl.startsWith('RAW_DATA:')) {
            require('fs').writeFileSync('render_data.json', bestUrl.substring(9))
            console.log('Saved render_data.json')
            app.quit()
        } else if (bestUrl && bestUrl !== 'NO_RENDER_DATA' && !bestUrl.startsWith('ERR_JS')) {
            require('child_process').exec('ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "' + bestUrl + '"', (err, stdout, stderr) => {
                console.log('RESOLUTION: ' + stdout.trim())
                app.quit()
            })
        } else {
            console.log('Failed to extract best URL')
            app.quit()
        }

      } catch (err) {
        console.error(err)
        app.quit()
      }
    })

    console.log('Loading URL...')
    hiddenWin.loadURL('https://v.douyin.com/Np7cLXaSkaU/')
})
