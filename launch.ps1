$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$dataDir = Join-Path $env:LOCALAPPDATA 'BeeDash'
$profileDir = Join-Path $dataDir 'BrowserProfile'
$logPath = Join-Path $dataDir 'launcher.log'
New-Item -ItemType Directory -Path $profileDir -Force | Out-Null

function Write-Log {
    param([string]$Message)
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logPath -Value "[$stamp] $Message" -Encoding UTF8
}

function Show-ErrorPopup {
    param([string]$Message)
    try {
        $ws = New-Object -ComObject WScript.Shell
        $ws.Popup($Message, 0, 'BeeDash Startfehler', 16) | Out-Null
    } catch {}
}

try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class BeeDashWin {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsZoomed(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue
} catch {}

function Set-WindowPlacementMaximized {
    param([object]$Node)
    if ($null -eq $Node -or -not ($Node -is [PSCustomObject])) { return }

    if ($Node.PSObject.Properties['fullscreen']) {
        $Node.PSObject.Properties.Remove('fullscreen')
    }

    $isLeafPlacement = (
        $null -ne $Node.PSObject.Properties['left'] -and
        $null -ne $Node.PSObject.Properties['right'] -and
        $null -ne $Node.PSObject.Properties['top'] -and
        $null -ne $Node.PSObject.Properties['bottom']
    )

    if ($isLeafPlacement) {
        if ($Node.PSObject.Properties['maximized']) {
            $Node.maximized = $true
        } else {
            $Node | Add-Member -NotePropertyName 'maximized' -NotePropertyValue $true
        }
        return
    }

    if ($Node.PSObject.Properties['maximized']) {
        $Node.PSObject.Properties.Remove('maximized')
    }

    foreach ($prop in @($Node.PSObject.Properties)) {
        if ($prop.Value -is [PSCustomObject]) {
            Set-WindowPlacementMaximized -Node $prop.Value
        }
    }
}

function Test-ServerReady {
    try {
        $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 1
        return ($resp.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Find-Browser {
    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
        if ($base) {
            $candidates.Add((Join-Path $base 'Google\Chrome\Application\chrome.exe'))
        }
    }
    if ($env:LOCALAPPDATA) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'))
    }
    foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
        if ($base) {
            $candidates.Add((Join-Path $base 'Microsoft\Edge\Application\msedge.exe'))
        }
    }

    foreach ($p in $candidates) {
        if ($p -and (Test-Path $p)) { return $p }
    }

    foreach ($key in @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe'
    )) {
        try {
            $val = (Get-ItemProperty $key -ErrorAction Stop).'(default)'
            if ($val -and (Test-Path $val)) { return $val }
        } catch {}
    }
    return $null
}

$server = $null

try {
    Write-Log 'BeeDash Launcher gestartet.'

    if (-not (Test-Path (Join-Path $root 'node_modules'))) {
        Write-Log 'Installiere npm Pakete...'
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install fehlgeschlagen (Code $LASTEXITCODE)."
        }
    }

    if (-not (Test-ServerReady)) {
        $nodeCmd = Get-Command node -ErrorAction Stop
        $nodeExe = $nodeCmd.Source
        $viteBin = Join-Path $root 'node_modules\vite\bin\vite.js'
        if (-not (Test-Path $viteBin)) {
            throw "Vite nicht gefunden unter: $viteBin"
        }

        Write-Log "Starte Vite Server auf http://127.0.0.1:5173 ..."
        $server = Start-Process -FilePath $nodeExe `
            -ArgumentList @($viteBin, '--host', '127.0.0.1', '--port', '5173', '--strictPort') `
            -WorkingDirectory $root `
            -WindowStyle Hidden `
            -PassThru

        $ready = $false
        for ($i = 0; $i -lt 75; $i++) {
            if ($server.HasExited) { break }
            if (Test-ServerReady) {
                $ready = $true
                break
            }
            Start-Sleep -Milliseconds 200
        }
        if (-not $ready) {
            throw 'Der lokale Spiel-Server (http://127.0.0.1:5173) hat nicht rechtzeitig geantwortet.'
        }
        Write-Log "Vite Server bereit (PID $($server.Id))."
    } else {
        Write-Log 'Vite Server lief bereits auf http://127.0.0.1:5173.'
    }

    # Ensure Chromium never restores a remembered F11 fullscreen state and opens maximized with titlebar
    $prefsPath = Join-Path $profileDir 'Default\Preferences'
    if (Test-Path $prefsPath) {
        try {
            $prefs = Get-Content -Path $prefsPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($prefs.PSObject.Properties['browser'] -and $prefs.browser) {
                if ($prefs.browser.PSObject.Properties['fullscreen']) {
                    $prefs.browser.PSObject.Properties.Remove('fullscreen')
                }
                foreach ($prop in @($prefs.browser.PSObject.Properties | Where-Object { $_.Name -like '*window_placement*' })) {
                    Set-WindowPlacementMaximized -Node $prop.Value
                }
            }
            $json = $prefs | ConvertTo-Json -Depth 32 -Compress
            [System.IO.File]::WriteAllText($prefsPath, $json, [System.Text.UTF8Encoding]::new($false))
        } catch {
            Write-Log "Hinweis beim Bereinigen der Browser-Preferences: $($_.Exception.Message)"
        }
    }

    $browserExe = Find-Browser
    if ($browserExe) {
        Write-Log "Starte Browser: $browserExe"
        $browserArgs = @(
            "--user-data-dir=`"$profileDir`"",
            '--app=http://127.0.0.1:5173',
            '--start-maximized',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-mode',
            '--disable-extensions'
        )
        $browserProc = Start-Process -FilePath $browserExe -ArgumentList $browserArgs -WindowStyle Maximized -PassThru

        if ($null -ne ('BeeDashWin' -as [type])) {
            $hwnd = [IntPtr]::Zero
            for ($i = 0; $i -lt 50; $i++) {
                if ($browserProc.HasExited) { break }
                $browserProc.Refresh()
                $candidate = $browserProc.MainWindowHandle
                if ($candidate -ne [IntPtr]::Zero -and [BeeDashWin]::IsWindowVisible($candidate)) {
                    $hwnd = $candidate
                    break
                }
                $altProc = Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue |
                    Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero -and $_.MainWindowTitle -like '*BeeDash*' } |
                    Select-Object -First 1
                if ($altProc) {
                    $hwnd = $altProc.MainWindowHandle
                    break
                }
                Start-Sleep -Milliseconds 100
            }

            if ($hwnd -ne [IntPtr]::Zero) {
                [BeeDashWin]::ShowWindow($hwnd, 3) | Out-Null
                [BeeDashWin]::SetForegroundWindow($hwnd) | Out-Null
                Start-Sleep -Milliseconds 300
                if (-not [BeeDashWin]::IsZoomed($hwnd)) {
                    [BeeDashWin]::ShowWindow($hwnd, 3) | Out-Null
                }
                Write-Log "Browser-Fenster maximiert (HWND $hwnd)."
            } else {
                Write-Log 'Hinweis: Konnte Browser-HWND zum Maximieren nicht ermitteln.'
            }
        }

        if (-not $browserProc.HasExited) {
            $browserProc.WaitForExit()
        }
        Write-Log 'Browser-Fenster wurde geschlossen.'
    } else {
        Write-Log 'Kein Chrome/Edge gefunden, öffne Standardbrowser.'
        Start-Process 'http://127.0.0.1:5173'
        while ($server -and -not $server.HasExited) {
            Start-Sleep -Seconds 2
        }
    }
} catch {
    $errMsg = $_.Exception.Message
    Write-Log "FEHLER: $errMsg"
    Show-ErrorPopup "BeeDash konnte nicht gestartet werden:`n$errMsg`n`nDetails siehe: $logPath"
    exit 1
} finally {
    if ($server -and -not $server.HasExited) {
        Write-Log "Beende Vite Server (PID $($server.Id))..."
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
}
