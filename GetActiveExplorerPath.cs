using System;
using System.Runtime.InteropServices;

public class Program {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [STAThread]
    public static void Main() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return;
        
        Type type = Type.GetTypeFromProgID("Shell.Application");
        if (type == null) return;
        
        dynamic shell = Activator.CreateInstance(type);
        var windows = shell.Windows();
        
        for (int i = 0; i < windows.Count; i++) {
            var window = windows.Item(i);
            if ((IntPtr)window.HWND == hwnd) {
                try {
                    string path = window.Document.Folder.Self.Path;
                    if (!string.IsNullOrEmpty(path)) {
                        Console.WriteLine(path);
                        return;
                    }
                } catch {}
            }
        }
    }
}
