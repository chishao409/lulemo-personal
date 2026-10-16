$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$signingDirectory = if ($env:LULEMO_SIGNING_DIR) { $env:LULEMO_SIGNING_DIR } else { Join-Path $env:USERPROFILE '.lulemo-private-signing' }
$configPath = Join-Path $signingDirectory 'signing.json'
$keystorePath = Join-Path $signingDirectory 'lulemo-private.jks'
New-Item -ItemType Directory -Force -Path $signingDirectory | Out-Null

if (Test-Path -LiteralPath $configPath) {
    $signingConfig = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    if (-not (Test-Path -LiteralPath $signingConfig.storeFile)) { throw 'Signing keystore is missing. Restore your signing backup instead of generating a replacement.' }
} else {
    if (Test-Path -LiteralPath $keystorePath) { throw 'An existing keystore has no signing.json. Restore its matching configuration; it will not be replaced.' }
    $randomBytes = New-Object byte[] 32
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    $randomGenerator.GetBytes($randomBytes)
    $randomGenerator.Dispose()
    $storePassword = [BitConverter]::ToString($randomBytes).Replace('-', '').ToLowerInvariant()
    $keytoolPath = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\keytool.exe' } else { (Get-Command keytool.exe).Source }
    try {
        $env:LULEMO_KEYSTORE_PASSWORD = $storePassword
        & $keytoolPath -genkeypair -keystore $keystorePath -storetype JKS -alias lulemo-private -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Lulemo Private, O=Personal' -storepass:env LULEMO_KEYSTORE_PASSWORD -keypass:env LULEMO_KEYSTORE_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Private keystore generation failed.' }
    } finally { Remove-Item Env:LULEMO_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue }
    $signingConfig = [PSCustomObject]@{ storeFile = $keystorePath; storePassword = $storePassword; keyAlias = 'lulemo-private'; keyPassword = $storePassword }
    $signingConfig | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding utf8
}

$propertiesPath = Join-Path $projectDirectory 'android\keystore.properties'
$escapedPath = $signingConfig.storeFile.Replace('\', '/')
@("storeFile=$escapedPath", "storePassword=$($signingConfig.storePassword)", "keyAlias=$($signingConfig.keyAlias)", "keyPassword=$($signingConfig.keyPassword)") | Set-Content -LiteralPath $propertiesPath -Encoding ascii
Write-Output "Private signing configured. Keep a backup of: $signingDirectory"
