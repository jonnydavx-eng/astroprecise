# AstroPrecise — Cloudflare Email Routing + Gmail setup helper
# Run after clicking the Cloudflare "Verify email address" link in Gmail.
#
# Usage:
#   .\tools\setup-astroprecise-email.ps1           # wait for verify, create rules, open Gmail settings
#   .\tools\setup-astroprecise-email.ps1 -NoWait   # create rules only (destination must already be verified)
#   .\tools\setup-astroprecise-email.ps1 -Status  # print current routing state

param(
    [switch]$NoWait,
    [switch]$Status,
    [switch]$GmailSendAs,
    [int]$WaitSeconds = 600
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$EnvFile = Join-Path $Root 'secrets\.env.local'
$AccountId = 'd6684e6cd24d1f20d2f92bd74bee9303'
$ZoneId = '0b117b494c51a835f52841db29104bf4'
$Domain = 'astroprecise.app'
$Destination = 'jonnydavx@gmail.com'
$ForwardAddresses = @(
    'hello@astroprecise.app',
    'support@astroprecise.app',
    'privacy@astroprecise.app'
)
$GmailAccountsUrl = 'https://mail.google.com/mail/u/0/#settings/accounts'

function Load-Token {
    if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile (CLOUDFLARE_API_TOKEN)" }
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match '^CLOUDFLARE_API_TOKEN=(.+)$') {
            return $matches[1].Trim('"').Trim("'")
        }
    }
    throw 'CLOUDFLARE_API_TOKEN not found in secrets/.env.local'
}

function Cf-Request {
    param([string]$Method = 'GET', [string]$Uri, [object]$Body)
    $headers = @{ Authorization = "Bearer $(Load-Token)" }
    if ($Body) {
        $headers['Content-Type'] = 'application/json'
        return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 6 -Compress)
    }
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
}

function Get-DestinationStatus {
    $r = Cf-Request -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/email/routing/addresses"
    $row = $r.result | Where-Object { $_.email -eq $Destination } | Select-Object -First 1
    if (-not $row) { return @{ found = $false; verified = $false } }
    $verified = [bool]$row.verified -or $row.status -eq 'verified'
    return @{ found = $true; verified = $verified; row = $row }
}

function Ensure-Destination {
    $st = Get-DestinationStatus
    if ($st.found) { return $st }
    Write-Host "Adding destination $Destination ..."
    Cf-Request -Method POST -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/email/routing/addresses" -Body @{ email = $Destination } | Out-Null
    return Get-DestinationStatus
}

function Get-Rules {
    (Cf-Request -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/email/routing/rules").result
}

function Ensure-ForwardRules {
    $existing = Get-Rules
    $prio = 0
    foreach ($addr in $ForwardAddresses) {
        $prio++
        $hit = $existing | Where-Object {
            $_.matchers -and $_.matchers[0].value -eq $addr -and $_.actions[0].type -eq 'forward'
        } | Select-Object -First 1
        if ($hit) {
            Write-Host "OK  rule exists: $addr -> $Destination (enabled=$($hit.enabled))"
            continue
        }
        Write-Host "ADD rule: $addr -> $Destination"
        $body = @{
            name     = "Forward $addr"
            enabled  = $true
            priority = $prio
            matchers = @(@{ type = 'literal'; field = 'to'; value = $addr })
            actions  = @(@{ type = 'forward'; value = @($Destination) })
        }
        Cf-Request -Method POST -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/email/routing/rules" -Body $body | Out-Null
    }
}

function Show-Status {
    $st = Ensure-Destination
    Write-Host "Destination $Destination : verified=$($st.verified)"
    Write-Host "Routing rules on $Domain :"
    foreach ($rule in Get-Rules) {
        $m = $rule.matchers[0]
        $a = $rule.actions[0]
        $match = if ($m.value) { $m.value } else { $m.type }
        $action = if ($a.value) { "$($a.type) $($a.value -join ',')" } else { $a.type }
        Write-Host "  enabled=$($rule.enabled) priority=$($rule.priority) $match -> $action"
    }
}

function Show-GmailSendAsGuide {
    Write-Host '=== Gmail Send-as (the bit we missed) ===' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'RECEIVING is done (Cloudflare -> Gmail). SENDING needs Gmail only — NOT Cloudflare MX.'
    Write-Host ''
    Write-Host 'If hello@astroprecise.app is already listed under Send mail as with an error:'
    Write-Host '  -> Delete it first, then add again.'
    Write-Host ''
    Write-Host 'Step 1: Settings -> Accounts -> Add another email address'
    Write-Host '  Name: AstroPrecise'
    Write-Host '  Email: hello@astroprecise.app'
    Write-Host ''
    Write-Host 'Step 2: Click Send verification (NOT custom SMTP)'
    Write-Host '  - Do NOT use route1.mx.cloudflare.net — that is receive-only.'
    Write-Host '  - If SMTP is forced: smtp.gmail.com, port 587, TLS'
    Write-Host '    Username: jonnydavx@gmail.com'
    Write-Host '    Password: Google App Password (myaccount.google.com/apppasswords)'
    Write-Host ''
    Write-Host 'Step 3: Code arrives in Gmail (forwarded from hello@) — paste it in the popup.'
    Write-Host ''
    Write-Host 'Step 4: Compose -> From dropdown -> hello@astroprecise.app'
}

if ($Status) {
    Show-Status
    exit 0
}

$dest = Ensure-Destination
if (-not $dest.verified) {
    if ($NoWait) {
        throw "Destination $Destination is not verified yet. Open Gmail and click Cloudflare's verification link, then re-run."
    }
    Write-Host "Waiting for Cloudflare to verify $Destination (up to $WaitSeconds s)."
    Write-Host "Check Gmail for 'Verify your email address' from Cloudflare and click the link."
    $deadline = (Get-Date).AddSeconds($WaitSeconds)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 10
        $dest = Get-DestinationStatus
        if ($dest.verified) {
            Write-Host 'Verified!'
            break
        }
        Write-Host '  still waiting...'
    }
    if (-not $dest.verified) {
        throw "Timed out waiting for verification. Click the Cloudflare email in Gmail, then run: .\tools\setup-astroprecise-email.ps1 -NoWait"
    }
}

Ensure-ForwardRules
Show-Status

if ($GmailSendAs) {
    Show-GmailSendAsGuide
    Start-Process $GmailAccountsUrl
    exit 0
}

Write-Host ''
Show-GmailSendAsGuide
Start-Process $GmailAccountsUrl