# VibeLink API - Test Data Setup (PowerShell)
# Run this script to automatically create test data

Write-Host "================================" -ForegroundColor Cyan
Write-Host "VibeLink API - Test Data Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost:5000"

# Step 1: Register User 1
Write-Host "📝 Registering User 1..." -ForegroundColor Yellow

$User1Body = @{
    email = "user1@vibelink.com"
    username = "user1"
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $User1Response = Invoke-WebRequest -Uri "$BaseUrl/api/auth/register" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $User1Body -ErrorAction Stop
    
    $User1Data = $User1Response.Content | ConvertFrom-Json
    $User1Id = $User1Data.user.id
    $Token = $User1Data.token
    
    Write-Host "✅ User 1 Created: $User1Id" -ForegroundColor Green
    Write-Host "✅ Token: $($Token.Substring(0, 30))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create User 1" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 2: Register User 2
Write-Host ""
Write-Host "📝 Registering User 2..." -ForegroundColor Yellow

$User2Body = @{
    email = "user2@vibelink.com"
    username = "user2"
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $User2Response = Invoke-WebRequest -Uri "$BaseUrl/api/auth/register" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $User2Body -ErrorAction Stop
    
    $User2Data = $User2Response.Content | ConvertFrom-Json
    $User2Id = $User2Data.user.id
    
    Write-Host "✅ User 2 Created: $User2Id" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create User 2" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 3: Get Rooms
Write-Host ""
Write-Host "🏠 Fetching Rooms..." -ForegroundColor Yellow

try {
    $RoomsResponse = Invoke-WebRequest -Uri "$BaseUrl/api/rooms" `
        -Method GET -ErrorAction Stop
    
    $RoomsData = $RoomsResponse.Content | ConvertFrom-Json
    $RoomId = $RoomsData.data[0].id
    
    Write-Host "✅ Room ID: $RoomId" -ForegroundColor Green
} catch {
    Write-Host "❌ No rooms found or error fetching rooms" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 4: Create Game Session
Write-Host ""
Write-Host "🎮 Creating Game Session..." -ForegroundColor Yellow

$SessionBody = @{
    roomId = $RoomId
    participantIds = @($User1Id, $User2Id)
} | ConvertTo-Json

try {
    $SessionResponse = Invoke-WebRequest -Uri "$BaseUrl/api/games/session" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $Token"
        } `
        -Body $SessionBody -ErrorAction Stop
    
    $SessionData = $SessionResponse.Content | ConvertFrom-Json
    $SessionId = $SessionData.data.session.id
    
    Write-Host "✅ Game Session Created: $SessionId" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create Game Session" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Create Postman Environment File
Write-Host ""
Write-Host "💾 Saving to postman_environment.json..." -ForegroundColor Yellow

$PostmanEnv = @{
    id = "vibelink-local"
    name = "VibeLink Local"
    values = @(
        @{ key = "baseUrl"; value = "http://localhost:5000"; type = "string" },
        @{ key = "token"; value = $Token; type = "string" },
        @{ key = "user1_id"; value = $User1Id; type = "string" },
        @{ key = "user2_id"; value = $User2Id; type = "string" },
        @{ key = "room_id"; value = $RoomId; type = "string" },
        @{ key = "session_id"; value = $SessionId; type = "string" }
    )
    _postman_variable_scope = "environment"
} | ConvertTo-Json -Depth 10

$PostmanEnv | Out-File -FilePath "postman_environment.json" -Encoding UTF8
Write-Host "✅ Environment saved to postman_environment.json" -ForegroundColor Green

# Print Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Save these for your tests:" -ForegroundColor Yellow
Write-Host "———————————————————————————" -ForegroundColor Gray
Write-Host "Token:      $Token"
Write-Host "User 1 ID:  $User1Id"
Write-Host "User 2 ID:  $User2Id"
Write-Host "Room ID:    $RoomId"
Write-Host "Session ID: $SessionId"
Write-Host ""
Write-Host "📁 Postman Environment: postman_environment.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "To use in Postman:" -ForegroundColor Yellow
Write-Host "  1. Download Postman: https://www.postman.com/apps"
Write-Host "  2. Click 'Import' → Select 'postman_environment.json'"
Write-Host "  3. Click 'Import' → Select 'VibeLink-API.postman_collection.json'"
Write-Host "  4. Select 'VibeLink Local' environment (top right dropdown)"
Write-Host "  5. Now use {{token}}, {{user1_id}}, {{room_id}}, {{session_id}} in requests"
Write-Host ""

# Optional: Open Postman
$PostmanPath = "C:\Users\$env:USERNAME\AppData\Local\Postman\Postman\Postman.exe"
if (Test-Path $PostmanPath) {
    Write-Host ""
    Write-Host "Would you like to open Postman now? (y/n)" -ForegroundColor Cyan
    $response = Read-Host
    if ($response -eq "y" -or $response -eq "yes") {
        & $PostmanPath
    }
}
