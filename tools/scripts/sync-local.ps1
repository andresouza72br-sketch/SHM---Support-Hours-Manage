<#
.SYNOPSIS
    SHM Local Governance Vault & Worktree Sync / Diff / Restore Tool
.DESCRIPTION
    Gerencia backups incrementais externos (100% fora do Git) e sincronizacao bidirecional
    de especificacoes do Reversa e Skills entre Worktrees e a Main local.
#>

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [ValidateSet("sync", "diff", "backups", "status", "restore")]
    [string]$Action = "sync",

    [Parameter(Position=1)]
    [string]$BackupId = "",

    [Parameter(Position=2)]
    [string]$TargetItem = "",

    [switch]$VsCode = $false
)

$ErrorActionPreference = "Continue"

$defaultVault = Join-Path $HOME "orca\backups-locais\projeto-SHM"
$VAULT_ROOT = if ($env:SHM_VAULT_ROOT) { $env:SHM_VAULT_ROOT } else { $defaultVault }
$ITEMS_TO_MANAGE = @(
    "_reversa_forward",
    "_reversa_refactor",
    "_reversa_bugs",
    "_reversa_docs",
    ".reversa",
    ".agents",
    ".claude",
    ".worktree-copy"
)

$currentDir = (Get-Location).Path
$mainRepo = $null

try {
    $wtList = git worktree list --porcelain 2>$null
    if ($wtList) {
        $firstLine = ($wtList -split "`n")[0]
        if ($firstLine -match '^worktree\s+(.+)$') {
            $mainRepo = $matches[1].Trim().Replace('/', '\')
        }
    }
} catch {}

if (-not $mainRepo -or -not (Test-Path $mainRepo)) {
    $fallbackMain = Join-Path $HOME "mkt-dnb\dev\Antigravity\projeto-SHM"
    if (Test-Path $fallbackMain) {
        $mainRepo = $fallbackMain
    } else {
        $mainRepo = $currentDir
    }
}

$currentBranch = "unknown-branch"
try {
    $branchName = (git rev-parse --abbrev-ref HEAD 2>$null)
    if ($branchName) {
        $currentBranch = $branchName.Trim()
    }
} catch {}
$branchClean = ($currentBranch -replace '[^a-zA-Z0-9_\-\.]', '_')

if (-not (Test-Path $VAULT_ROOT)) {
    New-Item -ItemType Directory -Path $VAULT_ROOT -Force | Out-Null
}

function Copy-SmartFolder {
    param([string]$Src, [string]$Dest)
    if (-not (Test-Path $Src)) { return }

    if (Test-Path -PathType Container $Src) {
        if (-not (Test-Path $Dest)) {
            New-Item -ItemType Directory -Path $Dest -Force | Out-Null
        }
        robocopy "$Src" "$Dest" /E /NFL /NDL /NJH /NJS /nc /ns /np 2>$null | Out-Null
    } else {
        $destP = Split-Path $Dest -Parent
        if (-not (Test-Path $destP)) { New-Item -ItemType Directory -Path $destP -Force | Out-Null }
        Copy-Item -Path $Src -Destination $Dest -Force
    }
}

switch ($Action) {
    "sync" {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $snapshotName = $timestamp + "__" + $branchClean
        $snapshotDir = Join-Path $VAULT_ROOT $snapshotName

        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host " [SHM Governance Vault] Sincronizacao e Backup Incremental" -ForegroundColor Cyan
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host " Worktree Atual : $currentDir" -ForegroundColor Gray
        Write-Host " Repositorio Main: $mainRepo" -ForegroundColor Gray
        Write-Host " Branch         : $currentBranch" -ForegroundColor Gray
        Write-Host " Backup Vault   : $snapshotDir" -ForegroundColor Yellow
        Write-Host "----------------------------------------------------------------" -ForegroundColor Gray

        New-Item -ItemType Directory -Path $snapshotDir -Force | Out-Null

        $backedUpCount = 0
        $syncedCount = 0

        Write-Host " 1. Gerando snapshot incremental seguro no Vault externo..." -ForegroundColor Cyan
        foreach ($item in $ITEMS_TO_MANAGE) {
            $srcPath = Join-Path $currentDir $item
            if (Test-Path $srcPath) {
                $destPath = Join-Path $snapshotDir $item
                Copy-SmartFolder -Src $srcPath -Dest $destPath
                Write-Host "    [OK] Snapshot salvo: $item" -ForegroundColor DarkGreen
                $backedUpCount++
            }
        }

        $manifest = @{
            timestamp = (Get-Date).ToString("o")
            branch = $currentBranch
            source_worktree = $currentDir
            main_repo = $mainRepo
            items_backed_up = $backedUpCount
        }
        $manifest | ConvertTo-Json -Depth 3 | Set-Content -Path (Join-Path $snapshotDir "manifest.json") -Encoding utf8

        $isSecondary = ($currentDir.TrimEnd('\') -ne $mainRepo.TrimEnd('\'))
        if ($isSecondary -and (Test-Path $mainRepo)) {
            Write-Host " 2. Propagando alteracoes locais para o repositorio Main..." -ForegroundColor Cyan
            foreach ($item in $ITEMS_TO_MANAGE) {
                $srcPath = Join-Path $currentDir $item
                if (Test-Path $srcPath) {
                    $mainDest = Join-Path $mainRepo $item
                    Copy-SmartFolder -Src $srcPath -Dest $mainDest
                    Write-Host "    [OK] Sincronizado para a Main: $item" -ForegroundColor Green
                    $syncedCount++
                }
            }

            # Garante que o hook post-checkout esteja ativo em .git/hooks da Main
            $mainHooksDir = Join-Path $mainRepo ".git\hooks"
            $hookSrc = Join-Path $currentDir "tools\scripts\git-hooks\post-checkout"
            if ((Test-Path $mainHooksDir) -and (Test-Path $hookSrc)) {
                Copy-Item -Path $hookSrc -Destination (Join-Path $mainHooksDir "post-checkout") -Force
                Write-Host "    [OK] Git hook post-checkout atualizado na Main." -ForegroundColor Green
            }
        } else {
            Write-Host " 2. Executando direto na base principal (sync dispensado)." -ForegroundColor Gray
        }

        Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
        Write-Host " Concluido com sucesso! Vault localizado fora do Git." -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host ""
    }

    "restore" {
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host " [SHM Governance Vault] Restaurador de Snapshots Locais" -ForegroundColor Cyan
        Write-Host "================================================================" -ForegroundColor Cyan

        $targetBackup = $null
        if ($BackupId) {
            $candidate = Join-Path $VAULT_ROOT $BackupId
            if (Test-Path $candidate) {
                $targetBackup = $candidate
            } else {
                Write-Host " Backup '$BackupId' nao encontrado no Vault." -ForegroundColor Yellow
            }
        }

        if (-not $targetBackup) {
            $allBackups = Get-ChildItem -Path $VAULT_ROOT -Directory | Sort-Object CreationTime -Descending
            if ($allBackups.Count -gt 0) {
                $targetBackup = $allBackups[0].FullName
            }
        }

        if (-not $targetBackup) {
            Write-Host " Nenhum snapshot encontrado em $VAULT_ROOT para restaurar." -ForegroundColor Red
            return
        }

        $targetLeaf = Split-Path $targetBackup -Leaf
        Write-Host " Destino da Restauracao: $currentDir" -ForegroundColor Gray
        Write-Host " Snapshot de Origem    : $targetLeaf" -ForegroundColor Yellow
        Write-Host "----------------------------------------------------------------" -ForegroundColor Gray

        $restoredCount = 0
        foreach ($item in $ITEMS_TO_MANAGE) {
            if ($TargetItem -and ($item -notlike "*$TargetItem*")) { continue }

            $srcPath = Join-Path $targetBackup $item
            if (Test-Path $srcPath) {
                $destPath = Join-Path $currentDir $item
                Copy-SmartFolder -Src $srcPath -Dest $destPath
                Write-Host "    [OK] Restaurado: $item" -ForegroundColor Green
                $restoredCount++
            }
        }

        Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
        Write-Host " Restauracao concluida ($restoredCount itens restaurados com sucesso)." -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host ""
    }

    "diff" {
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host " [SHM Governance Diff] Comparador de Versoes Locais" -ForegroundColor Cyan
        Write-Host "================================================================" -ForegroundColor Cyan

        $targetBackup = $null
        if ($BackupId) {
            $candidate = Join-Path $VAULT_ROOT $BackupId
            if (Test-Path $candidate) {
                $targetBackup = $candidate
            } else {
                Write-Host " Backup '$BackupId' nao encontrado no Vault." -ForegroundColor Yellow
            }
        }

        if (-not $targetBackup) {
            $allBackups = Get-ChildItem -Path $VAULT_ROOT -Directory | Sort-Object CreationTime -Descending
            if ($allBackups.Count -gt 0) {
                $targetBackup = $allBackups[0].FullName
            }
        }

        if (-not $targetBackup) {
            Write-Host " Nenhum snapshot encontrado em $VAULT_ROOT para comparar." -ForegroundColor Red
            return
        }

        $targetLeaf = Split-Path $targetBackup -Leaf
        Write-Host " Base de Trabalho Atual : $currentDir" -ForegroundColor Gray
        Write-Host " Snapshot de Referencia : $targetLeaf" -ForegroundColor Yellow
        Write-Host "----------------------------------------------------------------" -ForegroundColor Gray

        $hasDiff = $false

        foreach ($item in $ITEMS_TO_MANAGE) {
            if ($TargetItem -and ($item -notlike "*$TargetItem*")) { continue }

            $curPath = Join-Path $currentDir $item
            $bakPath = Join-Path $targetBackup $item

            if ((Test-Path $curPath) -or (Test-Path $bakPath)) {
                try {
                    $diffOutput = git diff --no-index --stat "$bakPath" "$curPath" 2>$null
                    if ($diffOutput) {
                        $hasDiff = $true
                        Write-Host " Alteracoes detectadas em: $item" -ForegroundColor Magenta
                        $diffOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
                        
                        if ($VsCode -and (Get-Command code -ErrorAction SilentlyContinue)) {
                            Write-Host " Abrindo diff no VS Code..." -ForegroundColor Cyan
                            code --diff "$bakPath" "$curPath"
                        }
                    }
                } catch {}
            }
        }

        if (-not $hasDiff) {
            Write-Host " OK: Nenhuma diferenca detectada entre o estado atual e o snapshot de referencia." -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host " Dica: Para ver o diff detalhado no console, execute:" -ForegroundColor Cyan
            Write-Host " git diff --no-index `"$targetBackup\_reversa_forward`" `"$currentDir\_reversa_forward`"" -ForegroundColor Yellow
            Write-Host " Ou com VS Code: .\tools\scripts\sync-local.ps1 -Action diff -VsCode" -ForegroundColor Cyan
        }
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host ""
    }

    "backups" {
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host " [SHM Governance Vault] Historico de Snapshots Disponiveis" -ForegroundColor Cyan
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host " Local do Vault: $VAULT_ROOT" -ForegroundColor Gray
        Write-Host "----------------------------------------------------------------" -ForegroundColor Gray

        $snapshots = Get-ChildItem -Path $VAULT_ROOT -Directory | Sort-Object CreationTime -Descending

        if ($snapshots.Count -eq 0) {
            Write-Host " Nenhum backup encontrado no Vault." -ForegroundColor Yellow
        } else {
            foreach ($snap in $snapshots) {
                $manifestPath = Join-Path $snap.FullName "manifest.json"
                $branchInfo = "N/A"
                if (Test-Path $manifestPath) {
                    try {
                        $m = Get-Content $manifestPath -Raw | ConvertFrom-Json
                        $branchInfo = $m.branch
                    } catch {}
                }
                
                $files = Get-ChildItem -Path $snap.FullName -Recurse -File -ErrorAction SilentlyContinue
                $fileCount = if ($files) { $files.Count } else { 0 }
                $totalSizeKb = if ($files) { [math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1KB, 1) } else { 0 }

                Write-Host " $($snap.Name)" -ForegroundColor Green
                Write-Host "    Criado em : $($snap.CreationTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor Gray
                Write-Host "    Branch    : $branchInfo" -ForegroundColor Cyan
                Write-Host "    Conteudo  : $fileCount arquivos ($totalSizeKb KB)" -ForegroundColor DarkGray
            }
        }
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host ""
    }

    "status" {
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host " [SHM Governance Status] Estado das Pastas Locais" -ForegroundColor Cyan
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host " Repositorio Main: $mainRepo" -ForegroundColor Gray
        Write-Host " Worktree Atual  : $currentDir" -ForegroundColor Gray
        Write-Host " Branch          : $currentBranch" -ForegroundColor Gray
        Write-Host "----------------------------------------------------------------" -ForegroundColor Gray

        foreach ($item in $ITEMS_TO_MANAGE) {
            $cur = Join-Path $currentDir $item
            $curExists = Test-Path $cur
            $mainP = Join-Path $mainRepo $item
            $mainExists = Test-Path $mainP

            $curStatus = if ($curExists) { "Presente" } else { "Ausente" }
            $mainStatus = if ($mainExists) { "Presente" } else { "Ausente" }

            Write-Host " $item" -ForegroundColor Yellow
            Write-Host "    Worktree: $curStatus | Main: $mainStatus" -ForegroundColor Gray
        }
        Write-Host "================================================================" -ForegroundColor Cyan
        Write-Host ""
    }
}
