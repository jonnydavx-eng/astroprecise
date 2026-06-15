# AstroPrecise — schedule free-traffic posts via Postiz (after one-time auth).
# Run once:  postiz auth:login   (browser opens — connect X, Pinterest, Reddit, etc.)
# Then run:   .\tools\schedule-free-traffic.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Require-Postiz {
    if (-not (Get-Command postiz -ErrorAction SilentlyContinue)) {
        Write-Host 'Installing Postiz CLI...' -ForegroundColor Yellow
        npm install -g postiz
    }
    $status = postiz auth:status 2>&1 | Out-String
    if ($status -match 'Not authenticated') {
        Write-Host ''
        Write-Host 'Postiz is not logged in. Run this first (browser will open):' -ForegroundColor Red
        Write-Host '  postiz auth:login' -ForegroundColor Cyan
        Write-Host ''
        Write-Host 'In Postiz, connect: Pinterest, X, Reddit (r/astrology), TikTok/IG if you have them.'
        exit 1
    }
}

function Upload-Image([string]$Path) {
    if (-not (Test-Path $Path)) { throw "Missing image: $Path" }
    $json = postiz upload $Path 2>&1 | Out-String
    if ($json -match '"path"\s*:\s*"([^"]+)"') { return $Matches[1] }
    throw "Upload failed for $Path : $json"
}

function Get-IntegrationId([string]$NamePattern) {
    $list = postiz integrations:list 2>&1 | Out-String
    foreach ($line in ($list -split "`n")) {
        if ($line -match $NamePattern -and $line -match '([a-f0-9-]{36})') {
            return $Matches[1]
        }
    }
    return $null
}

Require-Postiz

$pinImg = Join-Path $Root 'tools\social-pack\images\pin-birth-chart.jpg'
$squareImg = Join-Path $Root 'tools\social-pack\images\square-your-sky.jpg'

Write-Host 'Uploading images...' -ForegroundColor Green
$pinUrl = Upload-Image $pinImg
$squareUrl = Upload-Image $squareImg

$pinterestId = Get-IntegrationId 'pinterest|Pinterest'
$xId = Get-IntegrationId 'twitter|x\.com|X '
$redditId = Get-IntegrationId 'reddit|Reddit'

$links = 'https://astroprecise.app/links.html'
$chart = 'https://astroprecise.app/chart.html'
$rising = 'https://astroprecise.app/what-is-my-rising-sign.html'

# Schedule: next hour Pinterest, +2h X, +1 day second pin
$now = [DateTime]::UtcNow
$t1 = $now.AddMinutes(30).ToString('yyyy-MM-ddTHH:mm:ssZ')
$t2 = $now.AddHours(2).ToString('yyyy-MM-ddTHH:mm:ssZ')
$t3 = $now.AddDays(1).ToString('yyyy-MM-ddTHH:mm:ssZ')

if ($pinterestId) {
    $pinCap = @"
Free Birth Chart Calculator — accurate natal chart with VSOP87 precision. Sun, Moon, rising, houses — computed in your browser. Birth data never uploaded. $links

#birthchart #natalchart #astrology #risingsign #WearYourSky #AstroPrecise
"@
    postiz posts:create -c $pinCap -m $pinUrl -s $t1 -i $pinterestId
    Write-Host "Scheduled Pinterest pin 1 → $t1" -ForegroundColor Green

    $pinCap2 = "What is my rising sign? Free Ascendant calculator + explainer. $rising #risingsign #ascendant #birthchart"
    postiz posts:create -c $pinCap2 -m $squareUrl -s $t3 -i $pinterestId
    Write-Host "Scheduled Pinterest pin 2 → $t3" -ForegroundColor Green
} else {
    Write-Host 'Pinterest not connected in Postiz — skip or add integration.' -ForegroundColor Yellow
}

if ($xId) {
    $xCap = Get-Content (Join-Path $Root 'outreach-exports\x-posts\x-01.txt') -Raw
    postiz posts:create -c $xCap -s $t2 -i $xId
    Write-Host "Scheduled X post x-01 → $t2" -ForegroundColor Green
} else {
    Write-Host 'X/Twitter not connected in Postiz — skip or add integration.' -ForegroundColor Yellow
}

if ($redditId) {
    $redditBody = Get-Content (Join-Path $Root 'outreach-exports\free-traffic\reddit-value-post.txt') -Raw
    # Extract body after BODY: line for Reddit text post
    $title = 'I built a free birth chart tool that computes everything in-browser — feedback welcome'
    $settings = '{"subreddit":[{"value":{"subreddit":"astrology","title":"' + ($title -replace '"','\"') + '","type":"text"}}]}'
    postiz posts:create -c $redditBody -s ($now.AddDays(3).ToString('yyyy-MM-ddTHH:mm:ssZ')) --settings $settings -i $redditId
    Write-Host 'Scheduled Reddit r/astrology post → +3 days' -ForegroundColor Green
} else {
    Write-Host 'Reddit not connected in Postiz — skip or add integration.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Done. Check: postiz posts:list' -ForegroundColor Cyan