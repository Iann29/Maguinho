# Script para fazer backup do arquivo original antes da refatoração
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$originalFile = "index.ts"
$backupFile = "index.ts.backup_$timestamp"

# Copiar arquivo original para backup
Copy-Item -Path $originalFile -Destination $backupFile

Write-Host "Backup do arquivo original criado: $backupFile"
