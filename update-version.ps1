# Berry Framework Version Management Script
# This script helps manage versioning for the Berry framework

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("patch", "minor", "major", "set")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$Version
)

$buildPropsPath = Join-Path $PSScriptRoot "Directory.Build.props"

function Get-CurrentVersion {
    $content = Get-Content $buildPropsPath -Raw
    if ($content -match '<Version>([^<]+)</Version>') {
        return $matches[1]
    }
    throw "Could not find version in $buildPropsPath"
}

function Set-Version {
    param([string]$newVersion)

    $content = Get-Content $buildPropsPath -Raw

    # Update Version
    $content = $content -replace '<Version>[^<]+</Version>', "<Version>$newVersion</Version>"

    # Update AssemblyVersion and FileVersion
    $content = $content -replace '<AssemblyVersion>[^<]+</AssemblyVersion>', "<AssemblyVersion>$newVersion.0</AssemblyVersion>"
    $content = $content -replace '<FileVersion>[^<]+</FileVersion>', "<FileVersion>$newVersion.0</FileVersion>"

    Set-Content $buildPropsPath $content
    Write-Host "Version updated to $newVersion"
}

function Increment-Version {
    param([string]$currentVersion, [string]$type)

    $parts = $currentVersion -split '\.'
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]

    switch ($type) {
        "major" {
            $major++
            $minor = 0
            $patch = 0
        }
        "minor" {
            $minor++
            $patch = 0
        }
        "patch" {
            $patch++
        }
    }

    return "$major.$minor.$patch"
}

try {
    $currentVersion = Get-CurrentVersion
    Write-Host "Current version: $currentVersion"

    switch ($Action) {
        "set" {
            if (-not $Version) {
                throw "Version parameter is required when using 'set' action"
            }
            Set-Version $Version
        }
        "patch" {
            $newVersion = Increment-Version $currentVersion "patch"
            Set-Version $newVersion
        }
        "minor" {
            $newVersion = Increment-Version $currentVersion "minor"
            Set-Version $newVersion
        }
        "major" {
            $newVersion = Increment-Version $currentVersion "major"
            Set-Version $newVersion
        }
    }

    Write-Host "Version management completed successfully"
}
catch {
    Write-Error "Error: $_"
    exit 1
}