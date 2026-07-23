#Requires -Version 5.1
<#
.SYNOPSIS
  READ-ONLY-FIRST Mouse Without Borders triage — MINI (DESKTOP-1MN06G4) only.

.NOTES
  - Does NOT restart PowerToys / MWB / Helper / PC
  - Does NOT New Key / rewrite settings.json
  - Locked key: A7K9M2P4Q8R1X5Z3 (Shared may show hash12 1EF5AA1A2C79)
  - Clipboard "connection rejected Unknown from laptop" => laptop-side fix
  - Paste CLAIMS vs REALITY output back to master chat
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$ClaimHost       = 'DESKTOP-1MN06G4'
$ClaimMiniIp     = '192.168.137.1'
$ClaimLaptopName = 'BOOK-T1H4NJ753R'
$ClaimLaptopIp   = '192.168.137.2'
$ClaimKeyPlain   = 'A7K9M2P4Q8R1X5Z3'
$ClaimKeyHash12  = '1EF5AA1A2C79'
$ClaimMwbPorts   = @(15100, 15101)
$SharedRoots     = @('C:\Shared', 'C:\Users\Public\Shared')

$Findings = [System.Collections.Generic.List[object]]::new()
function Add-Finding([string]$Area, [string]$Claim, [string]$Reality, [string]$Verdict, [string]$Next = '') {
    $Findings.Add([pscustomobject]@{ Area=$Area; Claim=$Claim; Reality=$Reality; Verdict=$Verdict; Next=$Next }) | Out-Null
}
function Write-Banner([string]$t) {
    Write-Host ''; Write-Host ('=' * 72) -ForegroundColor DarkCyan
    Write-Host " $t" -ForegroundColor Cyan
    Write-Host ('=' * 72) -ForegroundColor DarkCyan
}
function Get-JsonProp($obj, [string[]]$names) {
    foreach ($n in $names) {
        if ($null -eq $obj) { return $null }
        $p = $obj.PSObject.Properties[$n]
        if ($p) { return $p.Value }
    }
    return $null
}

Write-Banner 'MWB TRIAGE — READ-ONLY-FIRST (MINI)'
Write-Host "Host claim : $ClaimHost ($ClaimMiniIp)"
Write-Host "Peer claim : $ClaimLaptopName ($ClaimLaptopIp)"
Write-Host "Key locked : $ClaimKeyPlain | hash12 claim: $ClaimKeyHash12"
Write-Host 'MODE: OBSERVE ONLY — no restarts, no New Key, no settings writes'

# 1 Host
Write-Banner '1) Host identity'
$thisHost = $env:COMPUTERNAME
$hostOk = ($thisHost -ieq $ClaimHost)
Write-Host "COMPUTERNAME=$thisHost => $(if ($hostOk) {'MATCH'} else {'MISMATCH'})"
Add-Finding 'Host' $ClaimHost $thisHost $(if ($hostOk) {'OK'} else {'FAIL'}) $(if (-not $hostOk) {'Stop — run only on DESKTOP-1MN06G4'} else {''})

# 2 Shared observe-only
Write-Banner '2) Shared (observe-only)'
$sharedHit = $null
foreach ($root in $SharedRoots) { if (Test-Path -LiteralPath $root) { $sharedHit = $root; break } }
if (-not $sharedHit) {
    Write-Host 'Shared root NOT FOUND'
    Add-Finding 'Shared' 'C:\Shared present' 'NOT FOUND' 'WARN' 'Create later — not required to fix MWB mouse'
} else {
    Write-Host "Shared root: $sharedHit"
    Get-ChildItem -LiteralPath $sharedHit -Force -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 25 Name, Length, LastWriteTime |
        Format-Table -AutoSize | Out-String | Write-Host
    Add-Finding 'Shared' 'Observe Shared first' "Root=$sharedHit" 'OK' ''
    # Catch-up files for master chat
    foreach ($f in @('PLAN-TOGETHER.txt','GOING-FORWARD-PLAN.txt','MWB-STATUS.txt','MOUSE-STATUS.txt','AGENT-CATCHUP.txt')) {
        $p = Join-Path $sharedHit $f
        if (Test-Path -LiteralPath $p) {
            Write-Host "CATCHUP_FILE=$p"
            Get-Content -LiteralPath $p -TotalCount 40 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  | $_" }
        }
    }
}

# 3 Network
Write-Banner '3) ICS / ping'
$addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' } |
    Select-Object IPAddress, InterfaceAlias, AddressState
$addrs | Format-Table -AutoSize | Out-String | Write-Host
$hasMiniIp = @($addrs | Where-Object { $_.IPAddress -eq $ClaimMiniIp }).Count -gt 0
Add-Finding 'ICS/IP' $ClaimMiniIp $(if ($hasMiniIp) {'PRESENT'} else {'MISSING'}) $(if ($hasMiniIp) {'OK'} else {'FAIL'}) $(if (-not $hasMiniIp) {'Fix ICS/Ethernet before MWB settings'} else {''})
$ping = Test-Connection -ComputerName $ClaimLaptopIp -Count 2 -Quiet -ErrorAction SilentlyContinue
Write-Host "Ping $ClaimLaptopIp => $ping"
Add-Finding 'L2/L3' "Reach $ClaimLaptopIp" "PingQuiet=$ping" $(if ($ping) {'OK'} else {'FAIL'}) $(if (-not $ping) {'Cable/ICS/laptop IP first'} else {''})

# 4 Ports
Write-Banner '4) Ports 15100/15101'
$listeners = @()
try {
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in $ClaimMwbPorts })
} catch {
    netstat -ano -p tcp 2>$null | ForEach-Object {
        if ($_ -match '^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
            $port = [int]$Matches[2]
            if ($port -in $ClaimMwbPorts) {
                $listeners += [pscustomobject]@{ LocalAddress=$Matches[1]; LocalPort=$port; OwningProcess=[int]$Matches[3]; State='Listen' }
            }
        }
    }
}
if ($listeners.Count) {
    $listeners | ForEach-Object {
        $pn = (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName
        Write-Host ("LISTEN {0}:{1} pid={2} ({3})" -f $_.LocalAddress, $_.LocalPort, $_.OwningProcess, $pn)
    }
} else { Write-Host 'No LISTEN on 15100/15101' -ForegroundColor Yellow }
foreach ($p in $ClaimMwbPorts) {
    $hit = @($listeners | Where-Object { $_.LocalPort -eq $p })
    Add-Finding "Port $p" 'Listening' $(if ($hit.Count) {'YES'} else {'NOT LISTENING'}) $(if ($hit.Count) {'OK'} else {'FAIL'}) $(if (-not $hit.Count) {'OWNER-OK ONLY: restart PowerToys MWB — no New Key'} else {''})
}

# 5 Processes
Write-Banner '5) Processes (observe)'
$procNames = @('PowerToys','PowerToys.MouseWithoutBorders','PowerToys.MouseWithoutBordersHelper','MouseWithoutBorders','MouseWithoutBordersHelper')
$procs = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -in $procNames })
if ($procs.Count) { $procs | Select-Object ProcessName, Id, StartTime | Format-Table -AutoSize | Out-String | Write-Host }
else { Write-Host 'No PowerToys/MWB processes matched' -ForegroundColor Yellow }
$hasMwb = @($procs | Where-Object { $_.ProcessName -match 'MouseWithoutBorders' }).Count -gt 0
Add-Finding 'Process' 'MWB running' "count=$($procs.Count); MWB=$hasMwb" $(if ($hasMwb) {'OK'} else {'FAIL'}) $(if (-not $hasMwb) {'OWNER-OK ONLY: start PowerToys MWB'} else {''})

# 6 Settings observe
Write-Banner '6) settings.json OBSERVE ONLY'
$settingsCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Microsoft\PowerToys\MouseWithoutBorders\Settings.json'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\PowerToys\MouseWithoutBorders\settings.json'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Mouse Without Borders\Settings.json')
)
Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Microsoft\PowerToys') -Recurse -Filter '*MouseWithoutBorders*Settings*.json' -ErrorAction SilentlyContinue |
    Select-Object -First 10 -ExpandProperty FullName | ForEach-Object { $settingsCandidates += $_ }
$settingsPath = ($settingsCandidates | Select-Object -Unique | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1)
if (-not $settingsPath) {
    Add-Finding 'Settings' 'MWB settings.json' 'NOT FOUND' 'FAIL' 'Confirm PowerToys MWB installed for this user'
} else {
    Write-Host "READ: $settingsPath"
    $j = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
    $secKey = Get-JsonProp $j @('SecurityKey','securityKey','Key','key')
    $name2ip = Get-JsonProp $j @('Name2IP','name2IP','Name2Ip','name2ip')
    Write-Host "SecurityKey=$secKey"
    Write-Host "Name2IP=$name2ip"
    $keyReality = if ($null -eq $secKey) { '<missing>' } else { [string]$secKey }
    $keyOk = ($keyReality -eq $ClaimKeyPlain) -or ($keyReality -match [regex]::Escape($ClaimKeyHash12)) -or (($keyReality.Length -ge 12) -and ($keyReality.Substring(0,12).ToUpper() -eq $ClaimKeyHash12))
    Add-Finding 'Key' "Locked $ClaimKeyPlain / hash12 $ClaimKeyHash12" $keyReality $(if ($keyOk) {'OK'} else {'FAIL'}) $(if (-not $keyOk) {'Align key once — NEVER New Key on a timer'} else {''})
    $n2 = if ($null -eq $name2ip) { '' } else { [string]$name2ip }
    $hasLaptopMap = ($n2 -match [regex]::Escape($ClaimLaptopName)) -and ($n2 -match [regex]::Escape($ClaimLaptopIp))
    $hasMiniMap   = ($n2 -match [regex]::Escape($ClaimHost)) -and ($n2 -match [regex]::Escape($ClaimMiniIp))
    Add-Finding 'Name2IP' "$ClaimLaptopName`:$ClaimLaptopIp + $ClaimHost`:$ClaimMiniIp" $(if ($n2) {$n2} else {'<empty>'}) $(if ($hasLaptopMap -and $hasMiniMap) {'OK'} elseif ($n2) {'WARN'} else {'FAIL'}) $(if (-not ($hasLaptopMap -and $hasMiniMap)) {'OWNER-OK: one careful Name2IP edit — no timed rewrite'} else {''})
}

# 7 Firewall
Write-Banner '7) Firewall'
try {
    $fw = @(Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match 'Mouse|PowerToys|Without Borders|15100|15101' })
    if ($fw.Count) {
        $fw | Select-Object DisplayName, Enabled, Direction, Action | Format-Table -AutoSize | Out-String | Write-Host
        $disabled = @($fw | Where-Object { $_.Enabled -eq 'False' -or $_.Enabled -eq $false })
        Add-Finding 'Firewall' 'MWB rules enabled' "rules=$($fw.Count); disabled=$($disabled.Count)" $(if ($disabled.Count -eq 0) {'OK'} else {'WARN'}) ''
    } else {
        Add-Finding 'Firewall' 'Named MWB rules' 'none by name' 'WARN' 'Check Advanced Firewall for 15100/15101 if peer blocked'
    }
} catch { Add-Finding 'Firewall' 'Queryable' $_.Exception.Message 'WARN' '' }

# 8 RDP warn
Write-Banner '8) RDP (do not RDP mini while MWB needed)'
$rdpText = (quser 2>$null | Out-String)
Write-Host $rdpText
$rdpActive = $rdpText -match 'rdp-tcp|rdp'
Add-Finding 'RDP' 'No RDP while needing MWB' $(if ($rdpActive) {'RDP-like session'} else {'No obvious RDP'}) $(if ($rdpActive) {'WARN'} else {'OK'}) $(if ($rdpActive) {'Drop RDP; use local console'} else {''})

# 9 Clipboard reject note + logs
Write-Banner '9) Clipboard reject = LAPTOP fix'
Write-Host 'If "connection rejected Unknown from laptop" => fix BOOK key/Name2IP/IP — do NOT thrash mini.' -ForegroundColor Yellow
try {
    $logHits = @(Get-WinEvent -FilterHashtable @{ LogName='Application'; StartTime=(Get-Date).AddHours(-24) } -ErrorAction SilentlyContinue |
        Where-Object { $_.Message -match 'Mouse Without Borders|MouseWithoutBorders|connection rejected|15100|PowerToys' } |
        Select-Object -First 12 TimeCreated, Id, @{n='Msg';e={ $_.Message.Substring(0, [Math]::Min(140, $_.Message.Length)) }})
    if ($logHits.Count) {
        $logHits | Format-Table -Wrap | Out-String | Write-Host
        if ($logHits | Where-Object { $_.Msg -match 'connection rejected' }) {
            Add-Finding 'Clipboard/Log' 'No mini thrash on reject' 'connection rejected seen' 'LAPTOP-FIX' 'Fix BOOK — leave mini alone'
        } else { Add-Finding 'Clipboard/Log' 'Recent MWB log lines' 'hits, no reject phrase' 'INFO' '' }
    } else { Add-Finding 'Clipboard/Log' 'Recent MWB App log' 'none/limited' 'INFO' '' }
} catch { Add-Finding 'Clipboard/Log' 'Event log' $_.Exception.Message 'INFO' '' }

# 10 Summary + save
Write-Banner 'CLAIMS vs REALITY'
$Findings | Select-Object Verdict, Area, Claim, Reality, Next | Format-Table -AutoSize -Wrap | Out-String | Write-Host
Write-Host 'COUNTS:' -ForegroundColor Cyan
$Findings | Group-Object Verdict | Sort-Object Name | ForEach-Object { Write-Host ("  {0,-12} {1}" -f $_.Name, $_.Count) }

$outDir = if ($sharedHit) { $sharedHit } else { Join-Path $env:USERPROFILE 'Desktop' }
$outPath = Join-Path $outDir 'MWB-TRIAGE-MINI.txt'
$Findings | Format-Table -AutoSize | Out-String | Set-Content -Path $outPath -Encoding UTF8
Write-Host "WROTE $outPath" -ForegroundColor Green
try { Get-Content $outPath -Raw | Set-Clipboard; Write-Host 'Clipboard filled with summary' } catch {}

Write-Host ''
Write-Host 'NEXT: paste this whole output into master chat. Script did nothing destructive.' -ForegroundColor Cyan
Write-Host 'OWNER-OK ONLY (manual): restart PowerToys/MWB/Helper, reboot, or one-time Name2IP/key align — never New Key on a timer.' -ForegroundColor DarkYellow
