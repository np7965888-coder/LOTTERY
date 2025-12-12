# Lottery Sound Effects Download Script
# Downloads required sound effects for the lottery system

$sfxDir = "public\sfx"
$ErrorActionPreference = "Continue"

# Create directory if it doesn't exist
if (-not (Test-Path $sfxDir)) {
    New-Item -ItemType Directory -Path $sfxDir -Force | Out-Null
    Write-Host "Created directory: $sfxDir" -ForegroundColor Green
}

Write-Host "Starting download of lottery sound effects..." -ForegroundColor Cyan
Write-Host ""

# Sound effect download list
# Note: If links fail, manually download from:
# - Mixkit: https://mixkit.co/free-sound-effects/
# - Pixabay: https://pixabay.com/sound-effects/
# - Freesound: https://freesound.org/

$downloads = @(
    @{
        Name = "spinning.mp3"
        Description = "Spinning wheel sound"
        Url = "https://assets.mixkit.co/sfx/download/mixkit-slot-machine-spin-1109.mp3"
    },
    @{
        Name = "win.mp3"
        Description = "Win sound"
        Url = "https://assets.mixkit.co/sfx/download/mixkit-winning-chimes-2015.mp3"
    },
    @{
        Name = "confetti.mp3"
        Description = "Confetti sound"
        Url = "https://assets.mixkit.co/sfx/download/mixkit-party-pop-confetti-3017.mp3"
    },
    @{
        Name = "drumroll.mp3"
        Description = "Drumroll sound (optional)"
        Url = "https://assets.mixkit.co/sfx/download/mixkit-drum-roll-566.mp3"
    }
)

foreach ($item in $downloads) {
    $filePath = Join-Path $sfxDir $item.Name
    Write-Host "Downloading: $($item.Description) ($($item.Name))..." -ForegroundColor Yellow
    
    $success = $false
    $urls = if ($item.Urls) { $item.Urls } else { @($item.Url) }
    
    foreach ($url in $urls) {
        try {
            # Download using Invoke-WebRequest with User-Agent
            $headers = @{
                "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                "Accept" = "*/*"
                "Referer" = "https://mixkit.co/"
            }
            $response = Invoke-WebRequest -Uri $url -OutFile $filePath -Headers $headers -ErrorAction Stop
            
            if (Test-Path $filePath -and (Get-Item $filePath).Length -gt 0) {
                $fileSize = (Get-Item $filePath).Length / 1KB
                Write-Host "  Success! Size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Green
                $success = $true
                break
            }
        }
        catch {
            # Try next URL
            continue
        }
    }
    
    if (-not $success) {
        Write-Host "  Failed: All download sources failed" -ForegroundColor Red
        Write-Host "    Please download manually from:" -ForegroundColor Yellow
        Write-Host "    - Mixkit: https://mixkit.co/free-sound-effects/" -ForegroundColor Gray
        Write-Host "    - Pixabay: https://pixabay.com/sound-effects/" -ForegroundColor Gray
        Write-Host "    - Freesound: https://freesound.org/" -ForegroundColor Gray
    }
    
    Write-Host ""
}

Write-Host "Download complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "If some files failed to download, please download manually from:" -ForegroundColor Yellow
Write-Host "1. Mixkit: https://mixkit.co/free-sound-effects/" -ForegroundColor White
Write-Host "2. Pixabay: https://pixabay.com/sound-effects/" -ForegroundColor White
Write-Host "3. Freesound: https://freesound.org/" -ForegroundColor White
Write-Host ""
Write-Host "Search keywords:" -ForegroundColor Yellow
Write-Host "- spinning: slot machine, wheel spin, rolling" -ForegroundColor White
Write-Host "- win: win sound, victory, fanfare, celebration" -ForegroundColor White
Write-Host "- confetti: fireworks, party popper, celebration" -ForegroundColor White
Write-Host "- drumroll: drum roll, suspense" -ForegroundColor White
