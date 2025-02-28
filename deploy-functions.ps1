# Script para implantar as Edge Functions no Supabase

# Carrega as variáveis de ambiente do arquivo .env.local
function Get-EnvValue {
    param (
        [string]$Key,
        [string]$FilePath = ".env.local"
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath
        foreach ($line in $content) {
            if ($line -match "^\s*$Key=(.*)$") {
                return $matches[1]
            }
        }
    }
    
    return $null
}

# Defina as variáveis de ambiente para as funções
$env:SUPABASE_URL = Get-EnvValue "SUPABASE_URL"
$env:SUPABASE_ANON_KEY = Get-EnvValue "SUPABASE_ANON_KEY"
$env:MP_TEST_PUBLIC_KEY = Get-EnvValue "MP_TEST_PUBLIC_KEY"
$env:MP_TEST_ACCESS_TOKEN = Get-EnvValue "MP_TEST_ACCESS_TOKEN"
$env:MP_TEST_CLIENT_ID = Get-EnvValue "MP_TEST_CLIENT_ID"
$env:MP_TEST_CLIENT_SECRET = Get-EnvValue "MP_TEST_CLIENT_SECRET"
$env:MP_ENVIRONMENT = Get-EnvValue "MP_ENVIRONMENT"
$env:MP_WEBHOOK_URL = Get-EnvValue "MP_WEBHOOK_URL"
$env:MP_WEBHOOK_SECRET = Get-EnvValue "MP_WEBHOOK_SECRET"

# Navegue para o diretório do projeto
Set-Location -Path "f:\projects\maguinho"

# Implante as Edge Functions
Write-Host "Implantando a função create-payment-preference..."
npx supabase functions deploy create-payment-preference

Write-Host "Implantando a função payment-webhook..."
npx supabase functions deploy payment-webhook

Write-Host "Funções implantadas com sucesso!"

# Exiba as URLs das funções
$supabaseFunctionsUrl = Get-EnvValue "VITE_SUPABASE_FUNCTIONS_URL"
Write-Host "URLs das funções:"
Write-Host "create-payment-preference: $supabaseFunctionsUrl/create-payment-preference"
Write-Host "payment-webhook: $supabaseFunctionsUrl/payment-webhook"

Write-Host "Lembre-se de configurar o webhook no Mercado Pago para apontar para a URL do payment-webhook!"
