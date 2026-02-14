# =====================================
# VibeLink E2E Test Suite - PowerShell
# =====================================

$BaseURL = "http://localhost:5000"
$FrontendURL = "http://localhost:3000"

# Test Configuration
$testConfig = @{
    BackendHealthy = $false
    TestsPassed = 0
    TestsFailed = 0
    Errors = @()
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

# Test Data
$testData = @{
    Email = "test$(Get-Date -UFormat %s)@vibelink.dev"
    Username = "testuser_$(Get-Date -UFormat %s)"
    Password = "TestPass123!"
    Token = $null
    UserId = $null
    RoomId = $null
    SessionId = $null
}

# Color helper
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO", "PASS", "FAIL", "ERROR", "TEST")][string]$Type = "INFO"
    )
    
    $colors = @{
        "INFO"  = "Cyan"
        "PASS"  = "Green"
        "FAIL"  = "Red"
        "ERROR" = "Red"
        "TEST"  = "Yellow"
    }
    
    Write-Host "[$Type] " -ForegroundColor $colors[$Type] -NoNewline
    Write-Host $Message
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n===== $Message =====" -ForegroundColor Cyan -BackgroundColor Black
}

# HTTP Request Helper
function Invoke-APIRequest {
    param(
        [string]$Method = "GET",
        [string]$Endpoint = "",
        [object]$Body = $null,
        [string]$Token = $null
    )
    
    $url = $BaseURL + $Endpoint
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        $params = @{
            Uri     = $url
            Method  = $Method
            Headers = $headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params["Body"] = $Body | ConvertTo-Json -Compress
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        
        $content = $response.Content | ConvertFrom-Json
        
        return @{
            Status = $response.StatusCode
            Data   = $content
            Success = $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
        }
    }
    catch {
        return @{
            Status  = $_.Exception.Response.StatusCode.Value__
            Data    = $null
            Success = $false
            Error   = $_.Exception.Message
        }
    }
}

# ===================== TEST FUNCTIONS =====================

function Test-HealthCheck {
    Write-Step "HEALTH CHECK - Verify Backend is Running"
    
    $response = Invoke-APIRequest -Method GET -Endpoint "/api/rooms"
    
    if ($response.Success) {
        Write-Log "Backend is responding on port 5000" "PASS"
        $testConfig.BackendHealthy = $true
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Backend connection failed: $($response.Error)" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-UserRegistration {
    Write-Step "TEST 1: USER REGISTRATION"
    Write-Log "Creating user: $($testData.Email)" "TEST"
    
    $body = @{
        email    = $testData.Email
        username = $testData.Username
        password = $testData.Password
    }
    
    $response = Invoke-APIRequest -Method POST -Endpoint "/api/auth/register" -Body $body
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success -and $response.Data.token) {
        $testData.Token = $response.Data.token
        $testData.UserId = $response.Data.user.id
        
        Write-Log "User registered successfully" "PASS"
        Write-Log "User ID: $($testData.UserId)" "TEST"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Registration failed: $($response.Data.message)" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-UserLogin {
    Write-Step "TEST 2: USER LOGIN"
    Write-Log "Logging in user: $($testData.Email)" "TEST"
    
    $body = @{
        email    = $testData.Email
        password = $testData.Password
    }
    
    $response = Invoke-APIRequest -Method POST -Endpoint "/api/auth/login" -Body $body
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success -and $response.Data.token) {
        $testData.Token = $response.Data.token
        Write-Log "User logged in successfully" "PASS"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Login failed: $($response.Data.message)" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-GetCurrentUser {
    Write-Step "TEST 3: GET CURRENT USER"
    
    $response = Invoke-APIRequest -Method GET -Endpoint "/api/users/me" -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success) {
        Write-Log "Current user retrieved: $($response.Data.username)" "PASS"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Failed to get current user" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-UpdateProfile {
    Write-Step "TEST 4: UPDATE USER PROFILE (ONBOARDING)"
    
    $body = @{
        avatar    = "🎮"
        interests = @("Gaming", "Music", "Movies")
        vibeCharacteristics = @{
            nightOwl = $true
            texter   = $false
        }
    }
    
    $response = Invoke-APIRequest -Method PUT -Endpoint "/api/users/profile" -Body $body -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success) {
        Write-Log "Profile updated successfully" "PASS"
        Write-Log "Avatar: $($response.Data.avatar) | Interests: $($response.Data.interests -join ', ')" "TEST"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Profile update failed" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-ListRooms {
    Write-Step "TEST 5: LIST AVAILABLE ROOMS"
    
    $response = Invoke-APIRequest -Method GET -Endpoint "/api/rooms" -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success -and $response.Data -is [array]) {
        Write-Log "Rooms fetched successfully - Total: $($response.Data.Count)" "PASS"
        
        if ($response.Data.Count -gt 0) {
            $testData.RoomId = $response.Data[0].id
            Write-Log "First room: $($response.Data[0].name) (ID: $($testData.RoomId))" "TEST"
        }
        
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Failed to list rooms" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-CreateRoom {
    Write-Step "TEST 6: CREATE GAME ROOM"
    
    $timestamp = Get-Date -UFormat %s
    $body = @{
        name             = "Test Room $timestamp"
        gameType         = "Vibe Link Challenge"
        maxParticipants  = 4
        isPublic         = $true
    }
    
    $response = Invoke-APIRequest -Method POST -Endpoint "/api/rooms" -Body $body -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success) {
        $testData.RoomId = $response.Data.id
        Write-Log "Room created successfully - ID: $($testData.RoomId)" "PASS"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Room creation failed" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-JoinRoom {
    Write-Step "TEST 7: JOIN GAME ROOM"
    
    if (-not $testData.RoomId) {
        Write-Log "No room ID available" "ERROR"
        return $false
    }
    
    $endpoint = "/api/rooms/$($testData.RoomId)/join"
    $response = Invoke-APIRequest -Method POST -Endpoint $endpoint -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success) {
        Write-Log "Successfully joined room - Participants: $($response.Data.users.Count)" "PASS"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Join room failed: $($response.Data.message)" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-CreateGameSession {
    Write-Step "TEST 8: CREATE GAME SESSION"
    
    $body = @{
        roomId         = $testData.RoomId
        participantIds = @($testData.UserId)
    }
    
    $response = Invoke-APIRequest -Method POST -Endpoint "/api/games/session" -Body $body -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success -or $response.Status -eq 201) {
        $testData.SessionId = $response.Data.id
        Write-Log "Game session created - ID: $($testData.SessionId)" "PASS"
        Write-Log "Game State: $($response.Data.gameState)" "TEST"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Game session creation failed" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-GetGameSession {
    Write-Step "TEST 9: GET GAME SESSION DETAILS"
    
    if (-not $testData.SessionId) {
        Write-Log "No session ID available" "ERROR"
        return $false
    }
    
    $endpoint = "/api/games/session/$($testData.SessionId)"
    $response = Invoke-APIRequest -Method GET -Endpoint $endpoint -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success) {
        Write-Log "Game session retrieved successfully" "PASS"
        Write-Log "Game State: $($response.Data.gameState) | Round: $($response.Data.currentRound)" "TEST"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Failed to get game session" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-LeaveRoom {
    Write-Step "TEST 10: LEAVE ROOM"
    
    if (-not $testData.RoomId) {
        Write-Log "No room ID available" "ERROR"
        return $false
    }
    
    $endpoint = "/api/rooms/$($testData.RoomId)/leave"
    $response = Invoke-APIRequest -Method POST -Endpoint $endpoint -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success) {
        Write-Log "Successfully left room" "PASS"
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Leave room failed" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

function Test-GetLeaderboard {
    Write-Step "TEST 11: GET LEADERBOARD"
    
    $response = Invoke-APIRequest -Method GET -Endpoint "/api/leaderboard" -Token $testData.Token
    
    Write-Log "Response Status: $($response.Status)" "TEST"
    
    if ($response.Success -and $response.Data -is [array]) {
        Write-Log "Leaderboard fetched - Total users: $($response.Data.Count)" "PASS"
        
        if ($response.Data.Count -gt 0) {
            $topPlayer = $response.Data[0]
            Write-Log "Top player: $($topPlayer.username) - Score: $($topPlayer.vibeScore)" "TEST"
        }
        
        $testConfig.TestsPassed++
        return $true
    } else {
        Write-Log "Failed to get leaderboard" "FAIL"
        $testConfig.TestsFailed++
        return $false
    }
}

# ===================== MAIN EXECUTION =====================

Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       VIBELINK END-TO-END TEST SUITE (PowerShell)       ║" -ForegroundColor Cyan
Write-Host "║       Testing Full Authentication & Game Flow          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Log "Backend URL: $BaseURL" "INFO"
Write-Log "Frontend URL: $FrontendURL" "INFO"
Write-Log "Test Timestamp: $($testConfig.Timestamp)" "INFO"
Write-Log "Waiting 2 seconds before starting tests..." "TEST"
Start-Sleep -Seconds 2

# Run health check first
if (-not (Test-HealthCheck)) {
    Write-Log "Backend is not running. Aborting tests." "ERROR"
    exit 1
}

# Run all tests
Test-UserRegistration
Test-UserLogin
Test-GetCurrentUser
Test-UpdateProfile
Test-ListRooms

if (-not $testData.RoomId) {
    Test-CreateRoom
}

Test-JoinRoom
Test-CreateGameSession
Test-GetGameSession
Test-LeaveRoom
Test-GetLeaderboard

# Print Summary
Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    TEST SUMMARY                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$total = $testConfig.TestsPassed + $testConfig.TestsFailed
$successRate = if ($total -gt 0) { [math]::Round(($testConfig.TestsPassed / $total) * 100, 2) } else { 0 }

Write-Host "Results:" -ForegroundColor White -BackgroundColor Black
Write-Host "  ✓ Passed: $($testConfig.TestsPassed)" -ForegroundColor Green
Write-Host "  ✗ Failed: $($testConfig.TestsFailed)" -ForegroundColor Red
Write-Host "  Total: $total"
Write-Host "  Success Rate: $successRate%"
Write-Host ""

if ($testConfig.TestsFailed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! 🎉" -ForegroundColor Green -BackgroundColor Black
} else {
    Write-Host "⚠️  SOME TESTS FAILED" -ForegroundColor Red -BackgroundColor Black
}

Write-Host ""
