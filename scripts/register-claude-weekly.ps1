param(
  [string]$TaskName='AI Opportunity Monitor Weekly',
  [string]$At='06:00',
  [string]$Repository=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference='Stop'
$script=Join-Path $Repository 'scripts\update-with-claude.ps1'
if(-not (Test-Path -LiteralPath $script)){throw "Updater not found: $script"}
if(-not (Get-Command claude -ErrorAction SilentlyContinue)){throw 'Claude Code command was not found.'}
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -Repository `"$Repository`""
$trigger=New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At $At
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Updates AI Opportunity Monitor with the signed-in Claude Code subscription.' | Out-Null
Write-Output "Registered: $TaskName (Monday $At)"
