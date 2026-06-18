const { exec } = require('child_process');

const psScript = `
Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\`"user32.dll\`")] public static extern IntPtr GetForegroundWindow(); }"
$hwnd = [Win32]::GetForegroundWindow()
$shell = New-Object -ComObject Shell.Application
foreach ($window in $shell.Windows()) {
  if ($window.HWND -eq $hwnd) {
    $path = $window.Document.Folder.Self.Path
    if ($path) {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($path)
      $b64 = [Convert]::ToBase64String($bytes)
      Write-Output $b64
    }
    break
  }
}
`

const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
const start = Date.now();
exec(`powershell.exe -NoProfile -EncodedCommand ${b64}`, (err, stdout) => {
    console.log("Original Time:", Date.now() - start);
});
