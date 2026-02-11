#!/usr/bin/env pwsh
<#
.SYNOPSIS
    KKR Portfolio Scraper CLI - Direct invocation wrapper
.DESCRIPTION
    This script bypasses npm's argument mangling by calling Node.js directly.
    Use this for production deployments or when npm run strips your flags.
.EXAMPLE
    .\kkr-cli.ps1 query --region "Americas" --limit 5 --format json
.EXAMPLE
    .\kkr-cli.ps1 ingest
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DistPath = Join-Path $ScriptDir "dist\main.js"

# Check if dist exists
if (-not (Test-Path $DistPath)) {
    Write-Host "Build not found. Running npm run build..." -ForegroundColor Yellow
    & npm run build --prefix $ScriptDir
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
}

# Run the compiled CLI with all arguments preserved
& node $DistPath $args
exit $LASTEXITCODE
