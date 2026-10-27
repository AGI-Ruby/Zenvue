param([Parameter(Mandatory = $true)][string]$AppPath)
$ErrorActionPreference = 'Stop'
$resolvedApp = (Resolve-Path -LiteralPath $AppPath).Path
if ((Split-Path -Leaf $resolvedApp) -ne 'Zenvue.exe') { throw 'Expected a Zenvue.exe target.' }
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$shortcutShell = New-Object -ComObject WScript.Shell
$shortcutPaths = @(Get-ChildItem -LiteralPath $desktopFolder -Filter *.lnk | Where-Object {
	$existing = $shortcutShell.CreateShortcut($_.FullName)
	$_.BaseName -match 'Zenvue' -or ($existing.TargetPath -and (Split-Path -Leaf $existing.TargetPath) -eq 'Zenvue.exe')
} | ForEach-Object FullName)
if ($shortcutPaths.Count -eq 0) { $shortcutPaths = @(Join-Path $desktopFolder 'Zenvue.lnk') }
foreach ($shortcutPath in $shortcutPaths) {
	$shortcut = $shortcutShell.CreateShortcut($shortcutPath)
	$shortcut.TargetPath = $resolvedApp
	$shortcut.Arguments = ''
	$shortcut.WorkingDirectory = Split-Path -Parent $resolvedApp
	$shortcut.IconLocation = "$resolvedApp,0"
	$shortcut.Description = 'Zenvue 录屏与编辑'
	$shortcut.Save()
	$verified = $shortcutShell.CreateShortcut($shortcutPath)
	if ($verified.TargetPath -ne $resolvedApp) { throw "Shortcut verification failed: $shortcutPath" }
	[pscustomobject]@{ Shortcut = $shortcutPath; Target = $verified.TargetPath }
}
