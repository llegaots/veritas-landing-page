# Run this from your repo root: team_name-SOEN341_Project_W26
# Usage: cd path\to\team_name-SOEN341_Project_W26; .\setup-sprint-folders.ps1

$sprints = @("Sprint2", "Sprint3", "Sprint4")
foreach ($s in $sprints) {
    New-Item -ItemType Directory -Force -Path "$s\meeting_minutes" | Out-Null
    New-Item -ItemType Directory -Force -Path "$s\activity_logs"   | Out-Null
    New-Item -ItemType File   -Force -Path "$s\meeting_minutes\.gitkeep" | Out-Null
    New-Item -ItemType File   -Force -Path "$s\activity_logs\.gitkeep"  | Out-Null
    New-Item -ItemType File   -Force -Path "$s\sprint_plan.md"          | Out-Null
}
Write-Host "Sprint 2, 3, 4 folders created. Run: git add . ; git commit -m 'Add Sprint 2, 3, 4 folder structure' ; git push"
