# Finora AI - backend smoke test (Windows PowerShell 5.1+ / PowerShell 7)
#
# Exercises the REAL Spring Boot endpoints the React app uses.
# Start the backend first (dev profile = in-memory H2, never touches Neon):
#     cd backend
#     .\mvnw.cmd spring-boot:run
# Then, in a second PowerShell window, from the project root (Finora_AI):
#     powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1
#
# It registers a throw-away user (random email) and creates/deletes a few records.
# Run it against the dev profile only.

param([string]$BaseUrl = "http://localhost:8080")

$ErrorActionPreference = "Stop"
$script:pass = 0; $script:fail = 0

function Check($name, [scriptblock]$test) {
    try {
        $ok = & $test
        if ($ok) { Write-Host "PASS  $name" -ForegroundColor Green; $script:pass++ }
        else     { Write-Host "FAIL  $name" -ForegroundColor Red;   $script:fail++ }
    } catch {
        $msg = $_.Exception.Message
        Write-Host "FAIL  $name -> $msg" -ForegroundColor Red; $script:fail++
    }
}

function Api($method, $path, $body = $null, $token = $null) {
    $headers = @{ Accept = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    $params = @{ Method = $method; Uri = "$BaseUrl$path"; Headers = $headers }
    if ($null -ne $body) { $params["Body"] = ($body | ConvertTo-Json -Depth 5); $params["ContentType"] = "application/json" }
    return Invoke-RestMethod @params
}

function StatusOf($method, $path, $body = $null, $token = $null) {
    try { Api $method $path $body $token | Out-Null; return 200 }
    catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { return 0 } }
}

$email = "smoke$(Get-Random -Maximum 999999)@example.com"
$password = "Smoke2026pass"
$today = (Get-Date).ToString("yyyy-MM-dd")
$future = (Get-Date).AddMonths(6).ToString("yyyy-MM-dd")

Write-Host "Finora smoke test against $BaseUrl (user $email)`n" -ForegroundColor Cyan

Check "health endpoint is UP"            { (Api GET "/actuator/health").status -eq "UP" }
Check "protected endpoint without token -> 401" { (StatusOf GET "/api/transactions") -eq 401 }

$auth = $null
Check "register"                          { $script:auth = Api POST "/api/auth/register" @{ full_name = "Smoke Test"; email = $email; password = $password }; $script:auth.token.Length -gt 20 }
Check "register response is snake_case"   { $null -ne $auth.user_id -and $auth.full_name -eq "Smoke Test" }
Check "duplicate register -> 409"         { (StatusOf POST "/api/auth/register" @{ full_name = "Smoke Test"; email = $email; password = $password }) -eq 409 }
Check "login wrong password -> 401"       { (StatusOf POST "/api/auth/login" @{ email = $email; password = "wrong-password" }) -eq 401 }
Check "login"                             { $script:auth = Api POST "/api/auth/login" @{ email = $email; password = $password }; $script:auth.token.Length -gt 20 }
$t = $auth.token

$tx = $null
Check "create transaction"                { $script:tx = Api POST "/api/transactions" @{ title = "Smoke groceries"; amount = 1234.5; type = "EXPENSE"; category = "FOOD"; transaction_date = $today; payment_method = "UPI" } $t; $script:tx.id -gt 0 }
Check "list transactions (paged)"         { $p = Api GET "/api/transactions?page=0&size=200&sortBy=transactionDate&direction=DESC" $null $t; ($p.content | Where-Object { $_.id -eq $tx.id }).Count -eq 1 }
Check "update transaction (PUT)"          { (Api PUT "/api/transactions/$($tx.id)" @{ title = "Smoke groceries"; amount = 1500; type = "EXPENSE"; category = "SHOPPING"; transaction_date = $today } $t).category -eq "SHOPPING" }
Check "validation error -> 400"           { (StatusOf POST "/api/transactions" @{ title = ""; amount = 0; type = "EXPENSE"; category = "FOOD"; transaction_date = $today } $t) -eq 400 }
Check "bad enum -> 400"                   { (StatusOf POST "/api/transactions" @{ title = "x"; amount = 1; type = "EXPENSE"; category = "NOPE"; transaction_date = $today } $t) -eq 400 }
Check "unknown id -> 404"                 { (StatusOf GET "/api/transactions/99999999" $null $t) -eq 404 }

$sub = $null
Check "create subscription"               { $script:sub = Api POST "/api/subscriptions" @{ name = "Smoke Stream"; amount = 199; billing_cycle = "MONTHLY"; category = "ENTERTAINMENT"; start_date = $today; next_billing_date = $today; status = "ACTIVE" } $t; $script:sub.id -gt 0 }
Check "list subscriptions"                { (Api GET "/api/subscriptions?page=0&size=200" $null $t).content.Count -ge 1 }

$goal = $null
Check "create goal"                       { $script:goal = Api POST "/api/goals" @{ title = "Smoke laptop"; target_amount = 80000; current_amount = 0; category = "OTHER"; target_date = $future; status = "ACTIVE" } $t; $script:goal.id -gt 0 }
Check "contribute to goal"                { [double](Api POST "/api/goals/$($goal.id)/contribute" @{ amount = 5000 } $t).current_amount -eq 5000 }

Check "money profile 404 before creation" { (StatusOf GET "/api/profile" $null $t) -eq 404 }
Check "save money profile"                { (Api POST "/api/profile" @{ monthly_income = 65000; monthly_fixed_expenses = 25000; monthly_variable_expenses = 15000; savings_amount = 100000; existing_debt = 0; preferred_currency = "INR" } $t).monthly_income -eq 65000 }
Check "update account name"               { (Api PUT "/api/users/profile" @{ full_name = "Smoke Tester"; currency = "INR" } $t).full_name -eq "Smoke Tester" }
Check "AI chat answers (or says disabled)" { (Api POST "/api/ai/chat" @{ message = "Where does my money go?" } $t).response.Length -gt 0 }
Check "social login is disabled -> 400"   { (StatusOf POST "/api/auth/oauth2/callback" @{ provider = "GOOGLE"; id_token = "fake" }) -eq 400 }

Check "delete transaction"                { (StatusOf DELETE "/api/transactions/$($tx.id)" $null $t) -eq 200 }
Check "delete subscription"               { (StatusOf DELETE "/api/subscriptions/$($sub.id)" $null $t) -eq 200 }
Check "delete goal"                       { (StatusOf DELETE "/api/goals/$($goal.id)" $null $t) -eq 200 }

Write-Host "`n$($script:pass) passed, $($script:fail) failed" -ForegroundColor Cyan
if ($script:fail -gt 0) { exit 1 }
