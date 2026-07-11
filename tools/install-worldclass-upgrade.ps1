# =============================================================================
# DO NOT RUN AGAINST PRODUCTION PAGES WITHOUT REVIEW (2026-07-09)
# Previous runs injected UMD three.min.js site-wide and broke the homepage
# ES-module orrery (dual Three.js). My Sky is now a safe standalone page.
# Prefer manual integration via ap-nav-model + mysky.html only.
# =============================================================================
#Requires -Version 5.1
<#
.SYNOPSIS
  Astro Precise — Complete world-class upgrade installer (run anytime)

.DESCRIPTION
  1) Full website/ backup
  2) Downloads Three.js (UMD) + GSAP if missing
  3) Verifies package files (design system, shell, router, cinematic orrery,
     transit explorer, export suite, motion, My Sky)
  4) Patches major HTML heads + export toolbar hosts
  5) Bumps service worker + precache entries

  Does NOT replace production orrery-webgl.js.

.PARAMETER ProjectRoot
  Canonical repo root (folder containing website/).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\install-worldclass-upgrade.ps1
#>
[CmdletBinding()]
param(
  # ============ CHANGE IF YOUR CLONE LIVES ELSEWHERE ============
  [string]$ProjectRoot = "C:\Users\jonny\OneDrive\astroprecise"
)

$ErrorActionPreference = "Stop"
$Website = Join-Path $ProjectRoot "website"
if (-not (Test-Path $Website)) { throw "website/ not found under $ProjectRoot" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot "tools\_backup-worldclass-$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

function Write-Step($m) { Write-Host "[*]" $m -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "[OK]" $m -ForegroundColor Green }
function Write-Warn2($m){ Write-Host "[!!]" $m -ForegroundColor Yellow }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " ASTRO PRECISE — WORLD-CLASS UPGRADE INSTALLER" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " Project: $ProjectRoot"
Write-Host " Backup:  $BackupRoot"
Write-Host ""

# ---- 1) Backup ----
Write-Step "Backing up website/ (full copy)..."
Copy-Item -Path $Website -Destination (Join-Path $BackupRoot "website") -Recurse -Force
Write-Ok "Backup complete"

# ---- 2) Vendor deps ----
$Vendor = Join-Path $Website "js\vendor"
New-Item -ItemType Directory -Force -Path $Vendor | Out-Null

function Get-VendorFile([string]$Name, [string[]]$Urls) {
  $dest = Join-Path $Vendor $Name
  if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 10000) {
    Write-Ok "$Name already present ($([math]::Round((Get-Item $dest).Length/1KB)) KB)"
    return
  }
  Write-Step "Downloading $Name ..."
  foreach ($u in $Urls) {
    try {
      Invoke-WebRequest -Uri $u -OutFile $dest -UseBasicParsing -TimeoutSec 90
      if ((Get-Item $dest).Length -gt 10000) {
        Write-Ok "$Name from $u"
        return
      }
    } catch { Write-Warn2 "fail $u" }
  }
  Write-Warn2 "Could not download $Name — place manually at $dest"
}

Get-VendorFile "three.min.js" @(
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
  "https://unpkg.com/three@0.160.0/build/three.min.js"
)
Get-VendorFile "gsap.min.js" @(
  "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
  "https://unpkg.com/gsap@3.12.5/dist/gsap.min.js"
)

# ---- 3) Verify package source files ----
$required = @(
  "css\ap-design-system.css",
  "js\ap-shell.js",
  "js\ap-router.js",
  "js\orrery-cinematic.js",
  "js\ap-transit-explorer.js",
  "js\ap-export-suite.js",
  "js\ap-motion.js",
  "mysky.html"
)
$missing = @()
foreach ($r in $required) {
  if (-not (Test-Path (Join-Path $Website $r))) { $missing += $r }
}
if ($missing.Count) {
  Write-Warn2 "Missing package files (need agent/git restore):"
  $missing | ForEach-Object { Write-Warn2 "  $_" }
} else {
  Write-Ok "All package source files present"
}

# ---- 4) Patch HTML ----
Write-Step "Patching major HTML pages..."

$HeadBundle = @"
  <!-- World-class shell + 3D + motion + export (additive) -->
  <link rel="stylesheet" href="css/ap-design-system.css" />
  <script src="js/vendor/three.min.js" defer></script>
  <script src="js/orrery-cinematic.js" defer></script>
  <script src="js/vendor/gsap.min.js" defer></script>
  <script src="js/ap-export-suite.js" defer></script>
  <script src="js/ap-motion.js" defer></script>
  <script src="js/ap-router.js" defer></script>
  <script src="js/ap-shell.js" defer></script>
"@

$Pages = @(
  "index.html","chart.html","horoscope.html","ephemeris.html","explore.html",
  "moment.html","shop.html","mysky.html","compatibility.html","transits.html","guides.html"
)
$journeyMap = @{
  "index.html"="cast"; "chart.html"="cast"; "ephemeris.html"="sky"; "explore.html"="sky"
  "moment.html"="keep"; "horoscope.html"="daily"; "shop.html"="shop"; "mysky.html"="mysky"
}

foreach ($name in $Pages) {
  $path = Join-Path $Website $name
  if (-not (Test-Path $path)) { continue }
  $raw = Get-Content -LiteralPath $path -Raw -Encoding UTF8
  $changed = $false

  if ($raw -notmatch 'ap-design-system\.css' -and $raw -match '</head>') {
    $raw = [regex]::Replace($raw, '</head>', ($HeadBundle + "`r`n</head>"), 1)
    $changed = $true
  } else {
    # ensure export/motion/gsap even if design system already present
    if ($raw -notmatch 'ap-export-suite\.js' -and $raw -match '</head>') {
      $extra = "  <script src=`"js/vendor/gsap.min.js`" defer></script>`r`n  <script src=`"js/ap-export-suite.js`" defer></script>`r`n  <script src=`"js/ap-motion.js`" defer></script>`r`n"
      $raw = [regex]::Replace($raw, '</head>', ($extra + '</head>'), 1)
      $changed = $true
    }
  }

  if ($journeyMap.ContainsKey($name) -and $raw -notmatch 'data-journey=') {
    $jid = $journeyMap[$name]
    $raw2 = [regex]::Replace($raw, '<body([^>]*)>', {
      param($m)
      $attrs = $m.Groups[1].Value
      if ($attrs -match 'data-journey=') { return $m.Value }
      return "<body$attrs data-journey=`"$jid`">"
    }, 1)
    if ($raw2 -ne $raw) { $raw = $raw2; $changed = $true }
  }

  if ($name -eq "horoscope.html" -and $raw -notmatch 'ap-transit-explorer\.js' -and $raw -match '</head>') {
    $raw = [regex]::Replace($raw, '</head>', "  <script src=`"js/ap-transit-explorer.js`" defer></script>`r`n</head>", 1)
    $changed = $true
  }

  if ($name -eq "chart.html" -and $raw -notmatch 'ap-export-suite-host' -and $raw -notmatch 'data-export-toolbar') {
    $exportHost = "`r`n<div id=`"ap-export-suite-host`" data-export-toolbar class=`"ap-export-host`" style=`"max-width:720px;margin:1rem auto;padding:0 1rem`"></div>`r`n"
    if ($raw -match '</main>') {
      $raw = [regex]::Replace($raw, '</main>', ($exportHost + '</main>'), 1)
      $changed = $true
    }
  }

  if ($name -eq "mysky.html" -and $raw -notmatch 'data-export-toolbar') {
    $raw = $raw -replace '(<aside class="mysky-side">)', "`$1`r`n        <div data-export-toolbar aria-label=`"Export your sky`"></div>"
    $changed = $true
  }

  if ($changed) {
    Set-Content -LiteralPath $path -Value $raw -Encoding UTF8 -NoNewline
    Write-Ok "patched $name"
  }
}

# sitemap
$sm = Join-Path $Website "sitemap.xml"
if (Test-Path $sm) {
  $s = Get-Content $sm -Raw -Encoding UTF8
  if ($s -notmatch 'mysky\.html') {
    $entry = @"

  <url>
    <loc>https://astroprecise.app/mysky.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
"@
    $s = $s -replace '</urlset>', ($entry + "`r`n</urlset>")
    Set-Content $sm $s -Encoding UTF8 -NoNewline
    Write-Ok "sitemap + mysky.html"
  }
}

# ---- 5) SW ----
$sw = Join-Path $Website "sw.js"
if (Test-Path $sw) {
  $swRaw = Get-Content $sw -Raw -Encoding UTF8
  if ($swRaw -match 'const V = "ap-v(\d+)"') {
    $n = [int]$Matches[1] + 1
    $swRaw = $swRaw -replace 'const V = "ap-v\d+"', "const V = `"ap-v$n`""
    foreach ($asset in @(
      "./mysky.html",
      "./css/ap-design-system.css",
      "./js/ap-shell.js",
      "./js/ap-router.js",
      "./js/orrery-cinematic.js",
      "./js/ap-transit-explorer.js",
      "./js/ap-export-suite.js",
      "./js/ap-motion.js",
      "./js/vendor/three.min.js",
      "./js/vendor/gsap.min.js"
    )) {
      if ($swRaw -notmatch [regex]::Escape($asset)) {
        $swRaw = $swRaw -replace "(const PRECACHE = \[\r?\n)", "`$1  '$asset',`r`n"
      }
    }
    Set-Content $sw $swRaw -Encoding UTF8 -NoNewline
    Write-Ok "Service worker ap-v$n"
  }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " DONE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "TEST IMMEDIATELY" -ForegroundColor Cyan
Write-Host "  cd `"$Website`""
Write-Host "  python -m http.server 8000"
Write-Host "  http://localhost:8000/mysky.html"
Write-Host "  http://localhost:8000/chart.html   (Export toolbar: PNG PDF JSON Wallpaper AR)"
Write-Host "  http://localhost:8000/horoscope.html  (Transit Explorer + GSAP)"
Write-Host "  Atlas machine: use port 8790 if preferred"
Write-Host ""
Write-Host "WHAT CHANGED (summary)" -ForegroundColor Cyan
Write-Host "  + Design system, shell, journey, bottom tabs, theme, onboarding"
Write-Host "  + Hybrid router (opt-in), cinematic orrery, Transit Explorer, My Sky"
Write-Host "  + Export suite: PNG, PDF (print), JSON, Wallpaper, AR-ready JSON"
Write-Host "  + GSAP micro-interactions (respects reduced-motion)"
Write-Host "  + orrery-webgl.js production engine NOT replaced"
Write-Host ""
Write-Host "MANUAL NEXT STEPS" -ForegroundColor Yellow
Write-Host "  1. Hard-refresh / unregister old SW"
Write-Host "  2. Cast a chart then try all Export buttons"
Write-Host "  3. Commit + push website/** for live deploy"
Write-Host "  4. Wire Stripe for real shop checkout (still deferred)"
Write-Host "  5. Optional: enable soft nav -> localStorage.ap_soft_nav='1'"
Write-Host "  6. AR binary USDZ needs native pipeline (JSON is portable scene)"
Write-Host "  Backup: $BackupRoot"
Write-Host ""

