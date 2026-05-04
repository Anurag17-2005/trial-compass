import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Trial } from "@/data/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, isSameDay, parseISO, isAfter, isBefore, startOfDay } from "date-fns";

interface TrialCalendarProps {
  trials: Trial[];
  onDateSelect?: (date: Date, trials: Trial[]) => void;
}

const TrialCalendar = ({ trials, onDateSelect }: TrialCalendarProps) => {
  const [isOpen, setIsOpen] = useState(false); // Start closed so button is visible
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get all trial start dates
  const trialDates = trials.map(t => startOfDay(parseISO(t.start_date)));
  const uniqueDates = Array.from(new Set(trialDates.map(d => d.getTime()))).map(t => new Date(t));

  // Check if a date has trials starting
  const hasTrialsOnDate = (date: Date) => {
    return trialDates.some(trialDate => isSameDay(trialDate, date));
  };

  // Get trials for a specific date
  const getTrialsForDate = (date: Date) => {
    return trials.filter(t => isSameDay(startOfDay(parseISO(t.start_date)), date));
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const trialsOnDate = getTrialsForDate(date);
    if (trialsOnDate.length > 0 && onDateSelect) {
      onDateSelect(date, trialsOnDate);
    }
  };

  // Count trials by status relative to today
  const today = startOfDay(new Date());
  const activeTrials = trials.filter(t => {
    const start = startOfDay(parseISO(t.start_date));
    const end = startOfDay(parseISO(t.end_date));
    return !isAfter(start, today) && !isBefore(end, today);
  });
  const upcomingTrials = trials.filter(t => isAfter(startOfDay(parseISO(t.start_date)), today));

  return (
    <div className="absolute top-0 right-0 h-full z-[1001]">
      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute top-4 z-[1003] bg-primary text-primary-foreground border-2 border-primary rounded-l-lg p-3 shadow-lg hover:bg-primary/90 transition-all ${
          isOpen ? "right-[320px]" : "right-0"
        }`}
        aria-label={isOpen ? "Hide calendar" : "Show calendar"}
        title={isOpen ? "Hide calendar" : "Show calendar"}
      >
        {isOpen ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
      </button>

      {/* Calendar Panel */}
      <div
        className={`absolute top-0 right-0 bg-white border-l border-border shadow-lg transition-transform duration-300 ease-in-out z-[1002] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "320px", height: "100%" }}
      >
        <div className="p-4 h-full overflow-y-auto">
          <h3 className="font-semibold text-lg mb-2">Trial Calendar</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Highlighted dates show when trials begin
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="text-xs text-green-600 font-medium">Active Today</div>
              <div className="text-2xl font-bold text-green-700">{activeTrials.length}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="text-xs text-blue-600 font-medium">Upcoming</div>
              <div className="text-2xl font-bold text-blue-700">{upcomingTrials.length}</div>
            </div>
          </div>

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            modifiers={{
              hasTrials: (date) => hasTrialsOnDate(date),
            }}
            modifiersStyles={{
              hasTrials: {
                backgroundColor: "#3b82f6",
                color: "white",
                fontWeight: "bold",
                borderRadius: "50%",
              },
            }}
          />

          {/* Selected Date Info */}
          {selectedDate && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">
                {format(selectedDate, "MMMM d, yyyy")}
              </h4>
              {hasTrialsOnDate(selectedDate) ? (
                <div className="space-y-2">
                  {getTrialsForDate(selectedDate).map((trial) => (
                    <div
                      key={trial.trial_id}
                      className="bg-secondary rounded-lg p-2 text-xs"
                    >
                      <div className="font-medium line-clamp-2">{trial.title}</div>
                      <div className="text-muted-foreground mt-1">
                        {trial.hospital}, {trial.city}
                      </div>
                      <div className="text-primary mt-1">
                        {trial.recruitment_status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No trials starting on this date
                </p>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold text-xs mb-2">Legend</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span>Trial start date</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                <span>Selected date</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialCalendar;
