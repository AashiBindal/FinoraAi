# Finora AI Backend Endpoint Test Suite
$BaseUrl = "http://localhost:8080/api/v1/finora"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Testing Finora AI Backend REST Endpoints" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================`n"

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Path,
        [object]$Body = $null
    )
    Write-Host "[$Method] $Path - $Name..." -NoNewline
    try {
        $params = @{
            Uri = "$BaseUrl$Path"
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 5)
        }
        $response = Invoke-RestMethod @params
        Write-Host " SUCCESS" -ForegroundColor Green
        return $response
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 1. Dashboard Overview
Test-Endpoint -Name "Get Financial Dashboard" -Path "/dashboard"

# 2. Living Money Model / Profile
Test-Endpoint -Name "Get Financial Profile" -Path "/profile"
Test-Endpoint -Name "Get Income Sources" -Path "/profile/income-sources"

# 3. AI Finance Coach Chat
$chatPayload = @{
    message = "What happens if my rent increases by ₹3,000?"
    sessionId = "test-session-1"
}
Test-Endpoint -Name "Chat with AI Finance Coach" -Method "POST" -Path "/coach/chat" -Body $chatPayload

# 4. Transactions & Search
Test-Endpoint -Name "List Transactions" -Path "/transactions?page=0&size=5"

# 5. Transaction Category Correction (Learning Rule)
$correctionPayload = @{
    transactionId = 4
    newCategory = "Food & Dining"
    rememberRule = $true
    customMerchantPattern = "dmart"
}
Test-Endpoint -Name "Correct Transaction Category (Learning Rule)" -Method "POST" -Path "/transactions/correct-category" -Body $correctionPayload

# 6. Subscriptions
Test-Endpoint -Name "List Subscriptions" -Path "/subscriptions"
Test-Endpoint -Name "Get Subscription Summary" -Path "/subscriptions/summary"

# 7. Goals
Test-Endpoint -Name "List Financial Goals" -Path "/goals"

# 8. What-If Simulator
$simPayload = @{
    categoryToReduce = "Food & Dining"
    reductionPercentage = 30.0
    monthlyExpenseIncrease = 3000.00
}
Test-Endpoint -Name "Run What-If Simulation" -Method "POST" -Path "/simulation/run" -Body $simPayload

# 9. Spending Analytics
Test-Endpoint -Name "Get Analytics" -Path "/analytics"

# 10. Smart Alerts
Test-Endpoint -Name "List Alerts" -Path "/alerts"
Test-Endpoint -Name "List Unread Alerts" -Path "/alerts/unread"

# 11. Monthly Financial Report
Test-Endpoint -Name "Generate Monthly Report" -Path "/reports/monthly?year=2026&month=10"

Write-Host "`nTest suite execution completed." -ForegroundColor Cyan
