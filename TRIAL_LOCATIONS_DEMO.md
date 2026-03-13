# Trial Locations for Demo - Toronto, Ontario

## User Profile (Default)
- **Name**: User
- **Age**: 45
- **Location**: Toronto, Ontario
- **Coordinates**: 43.6629°N, 79.3957°W
- **Cancer Type**: Lung
- **Stage**: Stage III
- **Biomarkers**: PD-L1, EGFR (if needed)

## Trial Distribution by Distance and Match

### 🔵 NEAR TORONTO - FAIR MATCH (40-45%)
These trials are very close but have lower match scores due to different stages or missing biomarkers.

| Trial ID | Hospital | Distance | Match % | Reason for Fair Match |
|----------|----------|----------|---------|----------------------|
| DEMO-FAIR-1 | Mount Sinai Hospital | ~3 km | 40% | Stage I-II (not Stage III), no biomarkers |
| DEMO-FAIR-2 | St. Michael's Hospital | ~5 km | 42% | Stage II-III, Radiation (not Immunotherapy), no biomarkers |
| DEMO-FAIR-3 | Sunnybrook Health Sciences | ~8 km | 43% | Supportive Care (not treatment), Stage II-IV |

**Map Appearance**: Blue pins (fair match 25-49%)

### 🟠 MODERATE DISTANCE - GOOD MATCH (60%)
These trials are farther away but have better match scores due to partial biomarker matches.

| Trial ID | Hospital | Distance | Match % | Reason for Good Match |
|----------|----------|----------|---------|----------------------|
| DEMO-GOOD-2 | Trillium Health Partners, Mississauga | ~30 km | 60% | Stage III ✓, PD-L1 biomarker ✓, Drug Combination |
| DEMO-GOOD-1 | Juravinski Cancer Centre, Hamilton | ~65 km | 60% | Stage III ✓, EGFR biomarker ✓, Targeted Therapy |

**Map Appearance**: Orange pins (good match 50-74%)

### 🟢 FAR DISTANCE - EXCELLENT MATCH (75%)
This trial is far away but has the best match score with full biomarker compatibility.

| Trial ID | Hospital | Distance | Match % | Reason for Excellent Match |
|----------|----------|----------|---------|---------------------------|
| DEMO-EXCELLENT-1 | The Ottawa Hospital Cancer Centre, Ottawa | ~450 km | 75% | Stage III ✓, PD-L1 ✓, EGFR ✓, Immunotherapy ✓ |

**Map Appearance**: Green pin (excellent match >75%)

### ⭐ BACKUP - PERFECT MATCH (90%)
Very close with perfect match (for comparison).

| Trial ID | Hospital | Distance | Match % | Reason for Perfect Match |
|----------|----------|----------|---------|-------------------------|
| DEMO-90-PERFECT | Toronto General Hospital | ~0.7 km | 90% | Stage III ✓, PD-L1 ✓, EGFR ✓, Immunotherapy ✓, Very close |

**Map Appearance**: Green pin (excellent match >75%)

## Geographic Distribution

```
                    Ottawa (450 km)
                        🟢 75%
                         |
                         |
                         |
    Hamilton (65 km)     |
         🟠 60%          |
            \            |
             \           |
              \          |
    Mississauga (30 km)  |
         🟠 60%          |
               \         |
                \        |
                 \       |
              TORONTO (User Location) 🔴
                  /  |  \
                 /   |   \
                /    |    \
               /     |     \
              /      |      \
         🔵 40%  🔵 42%  🔵 43%
         3 km    5 km    8 km
    Mount Sinai  St.Michael's  Sunnybrook
```

## Demonstration Strategy

### 1. Show Distance vs Match Trade-off
- **Near but Fair**: "These 3 trials are very close (3-8 km) but only 40-43% match"
- **Moderate and Good**: "These 2 trials are farther (30-65 km) but 60% match"
- **Far but Excellent**: "This trial is 450 km away but 75% match - best biomarker compatibility"

### 2. Sorting Demonstrations

#### "Best Matches" Sort
Shows trials by match score first:
1. 🟢 Ottawa - 75% (450 km)
2. 🟠 Mississauga - 60% (30 km)
3. 🟠 Hamilton - 60% (65 km)
4. 🔵 Sunnybrook - 43% (8 km)
5. 🔵 St. Michael's - 42% (5 km)
6. 🔵 Mount Sinai - 40% (3 km)

#### "Nearest Trials" Sort
Shows trials by distance first:
1. 🔵 Mount Sinai - 40% (3 km)
2. 🔵 St. Michael's - 42% (5 km)
3. 🔵 Sunnybrook - 43% (8 km)
4. 🟠 Mississauga - 60% (30 km)
5. 🟠 Hamilton - 60% (65 km)
6. 🟢 Ottawa - 75% (450 km)

### 3. Map Visualization
- **Zoom levels adjust** based on distance
- **Color coding** shows match quality at a glance
- **Routes** show actual driving distance
- **Popups** display both match % and distance

### 4. Decision Making
Demonstrates real patient decision-making:
- "Do I go to a nearby trial with lower match?"
- "Or travel farther for better biomarker compatibility?"
- "What's the right balance for me?"

## Match Score Breakdown

### Fair Match (40-45%) - Near Toronto
- **Cancer Type**: 30 pts ✓ (Lung matches)
- **Stage**: 0-15 pts ✗ (Stage I-II or II-IV, not exact Stage III)
- **Biomarkers**: 0 pts ✗ (No biomarker match)
- **Status**: 10 pts ✓ (Recruiting)
- **Location**: 10 pts ✓ (Same province)
- **Total**: ~40-45%

### Good Match (60%) - Moderate Distance
- **Cancer Type**: 30 pts ✓ (Lung matches)
- **Stage**: 25 pts ✓ (Stage III matches)
- **Biomarkers**: 12-13 pts ✓ (1 of 2 biomarkers match)
- **Status**: 10 pts ✓ (Recruiting)
- **Location**: 5-8 pts ✓ (Same province, farther)
- **Total**: ~60%

### Excellent Match (75%) - Far Distance
- **Cancer Type**: 30 pts ✓ (Lung matches)
- **Stage**: 25 pts ✓ (Stage III matches)
- **Biomarkers**: 25 pts ✓ (Both PD-L1 and EGFR match)
- **Status**: 10 pts ✓ (Recruiting)
- **Location**: 3 pts ✓ (Same province, very far)
- **Total**: ~75%

## Key Talking Points for Demo

1. **"Notice the trade-off"**: Closest trials aren't always the best match
2. **"Biomarkers matter"**: The Ottawa trial is worth the distance for full biomarker compatibility
3. **"Smart sorting"**: System helps you decide between distance and match quality
4. **"Visual clarity"**: Color-coded pins make it easy to see match quality at a glance
5. **"Real distances"**: Actual driving routes, not straight-line distance
6. **"Patient choice"**: Platform empowers informed decision-making

## Calendar Integration

All trials have strategic start dates:
- **Today (March 7)**: DEMO-EXCELLENT-1 (Ottawa)
- **March 10**: DEMO-GOOD-1 (Hamilton)
- **March 15**: DEMO-FAIR-2 (St. Michael's)
- **March 18**: DEMO-FAIR-3 (Sunnybrook)
- **March 21**: DEMO-FAIR-1 (Mount Sinai)
- **April 7**: DEMO-GOOD-2 (Mississauga)

This allows demonstrating both location filtering AND date filtering together!
