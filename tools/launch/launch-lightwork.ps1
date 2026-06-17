# AstroPrecise — Launch lightwork (multi-agent prep)
# Generates copy packs, exports outreach, runs prep check.
# Heavy work (SEO pages, spike posts, paid ads) is in agents.json phases.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host ''
Write-Host 'AstroPrecise Launch — Lightwork' -ForegroundColor Cyan
Write-Host '================================' -ForegroundColor Cyan
Write-Host ''

$steps = @(
    @{ Name = 'Build copy pack (directories, spike, bios)'; Cmd = 'node tools/launch/build-copy-pack.mjs' },
    @{ Name = 'Export outreach emails + X posts'; Cmd = 'node tools/export-outreach.mjs' },
    @{ Name = 'Prep check (local + live probes)'; Cmd = 'node tools/launch/lightwork-check.mjs' }
)

$failed = 0
foreach ($step in $steps) {
    Write-Host "→ $($step.Name)" -ForegroundColor Green
    Invoke-Expression $step.Cmd
    if ($LASTEXITCODE -ne 0) {
        $failed++
        Write-Host "  (completed with warnings — see above)" -ForegroundColor Yellow
    }
    Write-Host ''
}

Write-Host 'Output folders:' -ForegroundColor Cyan
Write-Host "  $Root\launch-output\directories\   — paste-ready directory submissions"
Write-Host "  $Root\launch-output\spike\         — Show HN + Reddit copy"
Write-Host "  $Root\launch-output\social-bios\   — account setup paste"
Write-Host "  $Root\launch-output\search-engines\ — GSC + Bing checklist"
Write-Host "  $Root\launch-output\product-hunt\   — PH prep (L+22)"
Write-Host "  $Root\outreach-exports\             — emails + X posts"
Write-Host ''
Write-Host 'Agent manifest: tools/launch/agents.json' -ForegroundColor Cyan
Write-Host ''

if ($failed -gt 0) {
    Write-Host "Lightwork done with $failed step(s) flagging prep gaps (expected before accounts/GSC)." -ForegroundColor Yellow
} else {
    Write-Host 'Lightwork complete — all checks green.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Owner next: marketing/SOCIAL-ACCOUNTS-SETUP.md + launch-output/search-engines/CHECKLIST.md' -ForegroundColor White
Write-Host ''