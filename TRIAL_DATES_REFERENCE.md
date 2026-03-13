# Trial Dates Reference

## Current Date for Demo
**March 7, 2026** (Saturday)

## Date Distribution Strategy

### Demonstration Trials (High Priority)
These trials are strategically dated to showcase all calendar features:

| Trial ID | Title | Start Date | Days from Today | Purpose |
|----------|-------|------------|-----------------|---------|
| DEMO-90-PERFECT | Advanced Immunotherapy Stage III Lung | 2026-03-07 | **Today** | Show "Active Today" |
| DEMO-70-GOOD | Targeted Therapy Advanced Lung | 2026-03-12 | +5 days | Show near-future |
| DEMO-40-FAIR | Chemotherapy Early Stage Lung | 2026-03-21 | +14 days | Show 2-week future |
| DEMO-65-DISTANT | Combination Immunotherapy Metastatic | 2026-04-07 | +31 days | Show next month |
| DEMO-20-LIMITED | Novel Therapy Breast Cancer | 2026-01-07 | -59 days | Show past/closed |

### Regular Trials (Updated Dates)
Selected trials updated to realistic 2026-2028 timeframes:

| Trial ID | Title | Start Date | Status |
|----------|-------|------------|--------|
| 25-5444.0 | Cognitive Stepped Care Brain Metastases | 2026-03-07 | Active Today |
| ONC-2024-107 | Pembrolizumab Plus Chemo NSCLC | 2026-03-15 | Upcoming |
| BRC-2024-055 | Trastuzumab Deruxtecan HER2-Low | 2026-03-20 | Upcoming |
| CRC-2024-088 | FOLFOX Plus Bevacizumab Colorectal | 2026-03-25 | Upcoming |
| PRO-2024-022 | Enzalutamide Plus Talazoparib Prostate | 2026-04-01 | Upcoming |
| BGB-11417-304 | Sonrotoclax Plus Zanubrutinib CLL | 2026-03-10 | Upcoming |
| OVR-2024-019 | Mirvetuximab Soravtansine Ovarian | 2026-04-15 | Upcoming |
| MEL-2024-041 | Nivolumab Plus Relatlimab Melanoma | 2026-04-10 | Upcoming |

## Date Range Logic

### Typical Trial Duration
- **Phase 1**: 1-2 years
- **Phase 2**: 2-3 years  
- **Phase 3**: 3-4 years
- **Supportive Care**: 2-3 years

### Start Date Distribution
- **Past (Closed)**: 1 trial - January 2026
- **Active Today**: 2 trials - March 7, 2026
- **This Week**: 1 trial - March 10, 2026
- **Next Week**: 2 trials - March 12, 15, 2026
- **This Month**: 3 trials - March 20, 21, 25, 2026
- **Next Month**: 3 trials - April 1, 7, 10, 15, 2026

### End Date Calculation
- Start date + typical duration for phase
- All end dates are 2027-2028 to show realistic ongoing trials

## Calendar Visualization

### March 2026
```
Sun Mon Tue Wed Thu Fri Sat
                        1
2   3   4   5   6   🔵7  8
9   🔵10 11  🔵12 13  14  🔵15
16  17  18  19  🔵20 🔵21 22
23  24  🔵25 26  27  28  29
30  31
```

### April 2026
```
Sun Mon Tue Wed Thu Fri Sat
            🔵1  2   3   4
5   6   🔵7  8   9   🔵10 11
12  13  14  🔵15 16  17  18
19  20  21  22  23  24  25
26  27  28  29  30
```

🔵 = Trial start date (highlighted in blue on calendar)

## Why These Dates?

### Today (March 7)
- Shows "Active Today" feature
- Demonstrates current recruiting trials
- User can see immediate opportunities

### Near Future (March 10-15)
- Shows upcoming trials within 1-2 weeks
- Realistic planning timeframe
- Demonstrates "Upcoming" count

### Mid-Range (March 20-25)
- Shows trials starting in 2-3 weeks
- Allows for preparation time
- Multiple trials on different dates

### Next Month (April)
- Shows longer-term planning
- Demonstrates calendar navigation
- Multiple trials spread across the month

### Past (January 7)
- Shows closed trial
- Demonstrates historical tracking
- Explains why some trials aren't recruiting

## Usage in Demo

1. **Start with today**: Click March 7 to show active trials
2. **Show near future**: Click March 12 (5 days away)
3. **Show planning ahead**: Click April 7 (1 month away)
4. **Show past**: Click January 7 (closed trial)
5. **Navigate months**: Scroll between March and April to show distribution

## Technical Notes

- All dates use ISO 8601 format: `YYYY-MM-DD`
- Parsed using `date-fns` library
- Compared using `startOfDay()` to ignore time
- Calendar highlights using `isSameDay()` comparison
- Filtering uses `isAfter()` and `isBefore()` for status

## Maintenance

When updating for future demos:
1. Set "current date" in system (March 7, 2026)
2. Adjust trial dates relative to current date
3. Keep distribution: 1 past, 2 today, 8-10 upcoming
4. Spread upcoming across 1-2 months
5. Maintain realistic durations (2-4 years)
