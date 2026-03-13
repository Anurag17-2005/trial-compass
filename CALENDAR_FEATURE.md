# Trial Calendar Feature

## Overview
A calendar component has been added to the map section that displays trial start dates and allows filtering trials by date.

## Features

### 1. **Toggle Visibility**
- Click the `<` / `>` button on the right side of the map to show/hide the calendar
- Calendar slides in/out smoothly from the right side

### 2. **Trial Date Highlighting**
- Dates with trial start dates are highlighted in **blue**
- Click any highlighted date to see which trials start on that day
- The map automatically zooms to show those trials

### 3. **Statistics Dashboard**
- **Active Today**: Shows trials that are currently recruiting (started before or on today)
- **Upcoming**: Shows trials that will start in the future

### 4. **Date Selection**
- Click any date to see trial details for that day
- Selected date shows trial cards with:
  - Trial title
  - Hospital and location
  - Recruitment status

### 5. **Legend**
- Blue circle: Trial start date
- Outlined circle: Selected date

## Demo Trial Dates (for Presentation)

The trial dates have been strategically set to showcase different scenarios:

### **Today (March 7, 2026)**
- **DEMO-90-PERFECT**: Advanced Immunotherapy for Stage III Lung Cancer
  - 90% match, Toronto General Hospital
  - Perfect for demonstrating "Active Today" feature

- **25-5444.0**: Cognitive Stepped Care Program for Brain Metastases
  - PMH - Princess Margaret Cancer Center

### **In 5 Days (March 12, 2026)**
- **DEMO-70-GOOD**: Targeted Therapy for Advanced Lung Cancer
  - 70% match, Sunnybrook Health Sciences Centre

### **In 1 Week (March 15, 2026)**
- **ONC-2024-107**: Pembrolizumab Plus Chemotherapy in NSCLC
  - BC Cancer - Vancouver Centre

### **In 2 Weeks (March 21, 2026)**
- **DEMO-40-FAIR**: Chemotherapy Combination for Early Stage Lung Cancer
  - 40% match, Mount Sinai Hospital

### **In 1 Month (April 7, 2026)**
- **DEMO-65-DISTANT**: Combination Immunotherapy for Metastatic Lung Cancer
  - 65% match, Trillium Health Partners (Mississauga)

### **Past Trial (January 7, 2026)**
- **DEMO-20-LIMITED**: Novel Therapy for Advanced Breast Cancer
  - Closed status, started 2 months ago

## How to Use for Demo

1. **Show Active Trials**:
   - Open the calendar
   - Point out "Active Today" count
   - Click on today's date (March 7) to see trials starting today

2. **Show Upcoming Trials**:
   - Point out "Upcoming" count
   - Click on March 12 to see trial starting in 5 days
   - Click on March 21 to see trial starting in 2 weeks
   - Click on April 7 to see trial starting next month

3. **Show Map Integration**:
   - When you click a date, the map automatically zooms to show those trials
   - Demonstrates the connection between calendar and map

4. **Show Date Highlighting**:
   - Scroll through the calendar months
   - Blue dates indicate when trials begin
   - Easy visual identification of trial availability

## Technical Details

### Components
- **TrialCalendar.tsx**: Main calendar component
- **MapPanel.tsx**: Updated to include calendar and handle date selection

### Dependencies
- `date-fns`: For date manipulation and formatting
- `react-day-picker`: Calendar UI component (via shadcn/ui)
- `lucide-react`: Icons for toggle button

### State Management
- Calendar visibility state (open/closed)
- Selected date state
- Trial filtering by date

### Integration
- Calendar is positioned absolutely on the right side of the map
- Slides in/out with smooth animation
- Communicates with map to zoom to selected trials
- Uses existing trial data structure (start_date field)

## Trial Date Format
All trials use ISO date format: `YYYY-MM-DD`
- Example: `"2026-03-07"` for March 7, 2026
- Ensures consistent parsing and comparison
