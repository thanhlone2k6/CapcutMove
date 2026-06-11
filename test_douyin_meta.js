const { app, BrowserWindow, session } = require('electron')

app.whenReady().then(async () => {
    const hiddenWin = new BrowserWindow({
      show: true,
      width: 1920,
      height: 1080,
      webPreferences: {
        partition: 'persist:douyin',
        javascript: true,
        backgroundThrottling: false
      }
    })

    hiddenWin.webContents.setAudioMuted(true)
    
    hiddenWin.webContents.on('did-finish-load', () => {
        setTimeout(async () => {
             const meta = await hiddenWin.webContents.executeJavaScript(`
              (function() {
                let title = document.title || 'Douyin Video';
                if (title.includes(' - 抖音')) title = title.replace(' - 抖音', '');
                let poster = '';
                const video = document.querySelector('video');
                if (video && video.poster) {
                   poster = video.poster;
                }
                return { title, poster, html: document.body.innerHTML.substring(0, 500) };
              })()
            `)
            console.log("META:", meta)
            app.quit()
        }, 3000)
    })

    hiddenWin.loadURL('https://v.douyin.com/fNi_LkZODgM/').catch(console.error)
})
