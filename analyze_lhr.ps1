$json = Get-Content ".lighthouseci\lhr-1778783599445.json" -Raw | ConvertFrom-Json
$results = @()
foreach ($a in $json.audits.PSObject.Properties) {
    if ($a.Value.score -ne $null -and $a.Value.score -lt 0.9 -and $a.Value.scoreDisplayMode -ne "notApplicable" -and $a.Value.scoreDisplayMode -ne "informative") {
        $results += [PSCustomObject]@{ id = $a.Value.id; title = $a.Value.title; score = $a.Value.score; displayValue = $a.Value.displayValue }
    }
}
$results | Sort-Object score | Format-Table -AutoSize
Write-Host "=== CATEGORIES ==="
foreach ($cat in $json.categories.PSObject.Properties) { Write-Host "$($cat.Name): $($cat.Value.score * 100)" }
Write-Host "=== LCP ==="
$json.audits."largest-contentful-paint".displayValue
$json.audits."largest-contentful-paint".numericValue
Write-Host "=== OPPORTUNITIES ==="
foreach ($a in $json.audits.PSObject.Properties) {
    if ($a.Value.details -and $a.Value.details.type -eq "opportunity" -and $a.Value.details.overallSavingsMs -gt 100) {
        Write-Host "$($a.Value.id): savings $($a.Value.details.overallSavingsMs)ms, display: $($a.Value.displayValue)"
    }
}
