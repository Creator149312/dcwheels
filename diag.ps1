$json = Get-Content ".lighthouseci\lhr-1778783599445.json" -Raw | ConvertFrom-Json

Write-Host "=== TBT detail ==="
Write-Host $json.audits."total-blocking-time".displayValue
Write-Host $json.audits."total-blocking-time".description

Write-Host "`n=== LONG TASKS ==="
if ($json.audits."long-tasks") {
    Write-Host $json.audits."long-tasks".displayValue
    foreach ($item in $json.audits."long-tasks".details.items) {
        Write-Host "duration: $($item.duration) startTime: $($item.startTime) url: $($item.url)"
    }
}

Write-Host "`n=== MAIN THREAD WORK ==="
Write-Host $json.audits."mainthread-work-breakdown".displayValue
foreach ($item in $json.audits."mainthread-work-breakdown".details.items) {
    Write-Host "$($item.groupLabel): $($item.duration)"
}

Write-Host "`n=== NETWORK REQUESTS (slow) ==="
foreach ($item in $json.audits."network-requests".details.items | Where-Object { $_.transferSize -gt 50000 }) {
    Write-Host "$($item.url) size:$($item.transferSize) time:$($item.endTime - $item.startTime)"
}

Write-Host "`n=== FULL BOOTUP ITEMS ==="
foreach ($item in $json.audits."bootup-time".details.items) {
    Write-Host "url: $($item.url)"
    Write-Host "  scripting: $($item.scripting) scriptParseCompile: $($item.scriptParseCompile) total: $($item.total)"
}
