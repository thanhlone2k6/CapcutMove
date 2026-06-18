const { exec } = require('child_process');

const psScript = `
$shell = New-Object -ComObject Shell.Application
foreach ($window in $shell.Windows()) {
  $path = $window.Document.Folder.Self.Path
  if ($path) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($path)
    $b64 = [Convert]::ToBase64String($bytes)
    Write-Output $b64
  }
}
`

const b64 = Buffer.from(psScript, 'utf16le').toString('base64')

exec(`powershell.exe -NoProfile -EncodedCommand ${b64}`, (err, stdout, stderr) => {
  const lines = stdout.trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      const decoded = Buffer.from(line.trim(), 'base64').toString('utf8');
      console.log('DECODED:', decoded);
    }
  });
});
