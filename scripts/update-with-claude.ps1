param([string]$Repository=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $Repository
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
& npm.cmd run doctor
if($LASTEXITCODE -ne 0){throw 'AI Opportunity Monitor doctor failed.'}
$prompt='Use the repository skill update-ai-opportunity-monitor to refresh the board with current, source-verified information. Complete the import validation before reporting success.'
& claude -p $prompt --output-format json --max-turns 24
if($LASTEXITCODE -ne 0){throw 'Claude Code update failed.'}
