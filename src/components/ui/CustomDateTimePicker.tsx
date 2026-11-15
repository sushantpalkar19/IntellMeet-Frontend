import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

export interface CustomDateTimePickerProps {
  value: string; // ISO format string 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: string; // 'YYYY-MM-DD'
  className?: string;
  id?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');

export default function CustomDateTimePicker({
  value,
  onChange,
  placeholder = 'Select date & time',
  required,
  minDate,
  className = '',
  id,
}: CustomDateTimePickerProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; position: 'bottom' | 'top' }>({
    top: 0,
    left: 0,
    width: 320,
    position: 'bottom',
  });

  // Parse current value
  const parsed = (() => {
    if (!value) return null;
    const parts = value.split('T');
    if (parts.length < 2) return null;
    const [y, m, d] = parts[0].split('-').map(Number);
    const [hh, mm] = parts[1].split(':').map(Number);
    if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return null;
    return { year: y, month: m - 1, date: d, hour: hh, minute: mm };
  })();

  const now = new Date();
  const [viewYear, setViewYear] = useState(() => parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsed?.month ?? now.getMonth());

  // Sync view when opening
  useEffect(() => {
    if (isOpen && parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [isOpen, parsed]);

  // Positioning
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupHeight = 360;
    const popupWidth = Math.max(rect.width, 320);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let position: 'bottom' | 'top' = 'bottom';
    let top = rect.bottom + 6;

    if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
      position = 'top';
      top = Math.max(10, rect.top - popupHeight - 6);
    }

    // Horizontal clamping
    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 12) {
      left = window.innerWidth - popupWidth - 12;
    }
    if (left < 12) left = 12;

    setCoords({
      top: top + window.scrollY,
      left: left + window.scrollX,
      width: popupWidth,
      position,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Calendar matrix calculation
  const calendarDays = (() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      date: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
      key: string;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`;
      days.push({
        date: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday: false,
        isSelected: Boolean(parsed && parsed.year === y && parsed.month === m && parsed.date === d),
        isDisabled: Boolean(minDate && dateStr < minDate),
        key: `prev-${d}`,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const isToday =
        now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === d;
      const isSelected = Boolean(
        parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.date === d
      );
      const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      days.push({
        date: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isDisabled: Boolean(minDate && dateStr < minDate),
        key: `curr-${d}`,
      });
    }

    // Next month padding to reach 42 cells (6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`;
      days.push({
        date: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday: false,
        isSelected: Boolean(parsed && parsed.year === y && parsed.month === m && parsed.date === d),
        isDisabled: Boolean(minDate && dateStr < minDate),
        key: `next-${d}`,
      });
    }

    return days;
  })();

  const handleSelectDay = (year: number, month: number, date: number) => {
    const currentHour = parsed ? parsed.hour : 12;
    const currentMinute = parsed ? parsed.minute : 0;
    const formatted = `${year}-${pad(month + 1)}-${pad(date)}T${pad(currentHour)}:${pad(currentMinute)}`;
    onChange(formatted);
  };

  const handleSelectHour = (newHour: number) => {
    const y = parsed?.year ?? viewYear;
    const m = parsed?.month ?? viewMonth;
    const d = parsed?.date ?? now.getDate();
    const min = parsed?.minute ?? 0;
    onChange(`${y}-${pad(m + 1)}-${pad(d)}T${pad(newHour)}:${pad(min)}`);
  };

  const handleSelectMinute = (newMinute: number) => {
    const y = parsed?.year ?? viewYear;
    const m = parsed?.month ?? viewMonth;
    const d = parsed?.date ?? now.getDate();
    const h = parsed?.hour ?? 12;
    onChange(`${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(newMinute)}`);
  };

  const handleSetToday = () => {
    const t = new Date();
    const formatted = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
    onChange(formatted);
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const displayString = parsed
    ? `${MONTH_NAMES[parsed.month].slice(0, 3)} ${parsed.date}, ${parsed.year} at ${pad(parsed.hour)}:${pad(parsed.minute)}`
    : '';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={inputId}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`w-full flex items-center justify-between rounded-xl border border-slate-800 bg-[#12111E] px-3.5 py-2.5 text-sm text-left transition-all ${
          isOpen
            ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/25 text-white'
            : 'text-white hover:border-slate-700'
        } ${className}`}
      >
        <span className={displayString ? 'text-white font-medium' : 'text-slate-500'}>
          {displayString || placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-colors shrink-0 ${isOpen ? 'text-[#C4B5FD]' : 'text-slate-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Hidden input to satisfy form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute', pointerEvents: 'none' }}
          value={value}
          onChange={() => {}}
          required={required}
        />
      )}

      {/* Dropdown Popup Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Date and time picker"
            style={{
              position: 'absolute',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="rounded-2xl border border-purple-900/40 bg-[#171525] p-4 text-white shadow-2xl backdrop-blur-md animate-card-entrance"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Calendar Section */}
              <div className="flex-1 min-w-[210px]">
                {/* Month/Year Nav */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white tracking-wide">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={prevMonth}
                      aria-label="Previous month"
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      aria-label="Next month"
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Day Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  {DAYS_SHORT.map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell) => (
                    <button
                      key={cell.key}
                      type="button"
                      disabled={cell.isDisabled}
                      onClick={() => handleSelectDay(cell.year, cell.month, cell.date)}
                      className={`h-7 w-7 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                        cell.isSelected
                          ? 'bg-[#7C3AED] text-white font-bold shadow-md shadow-purple-950 ring-1 ring-purple-400'
                          : cell.isToday
                          ? 'border border-[#7C3AED] text-[#C4B5FD] font-semibold'
                          : cell.isCurrentMonth
                          ? 'text-slate-200 hover:bg-white/10'
                          : 'text-slate-600 hover:bg-white/5'
                      } ${cell.isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}`}
                    >
                      {cell.date}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Section (24H) */}
              <div className="border-t sm:border-t-0 sm:border-l border-purple-900/30 pt-3 sm:pt-0 sm:pl-3 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Time (24h)
                  </span>
                  <div className="flex gap-2">
                    {/* Hours */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 text-center mb-1">HH</span>
                      <div className="h-44 w-12 overflow-y-auto space-y-1 rounded-xl bg-[#12111E] border border-slate-800 p-1">
                        {Array.from({ length: 24 }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectHour(i)}
                            className={`w-full py-1 text-xs rounded-lg text-center transition-colors ${
                              parsed?.hour === i
                                ? 'bg-[#7C3AED] text-white font-bold'
                                : 'text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {pad(i)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Minutes (step 5) */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 text-center mb-1">MM</span>
                      <div className="h-44 w-12 overflow-y-auto space-y-1 rounded-xl bg-[#12111E] border border-slate-800 p-1">
                        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleSelectMinute(m)}
                            className={`w-full py-1 text-xs rounded-lg text-center transition-colors ${
                              parsed && Math.abs(parsed.minute - m) < 3
                                ? 'bg-[#7C3AED] text-white font-bold'
                                : 'text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {pad(m)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Time Display Pill */}
                <div className="mt-2 text-center py-1.5 px-2 bg-[#12111E] border border-slate-800 rounded-xl text-xs font-mono text-[#C4B5FD]">
                  {pad(parsed?.hour ?? 12)}:{pad(parsed?.minute ?? 0)}
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="mt-3.5 pt-3 border-t border-purple-900/30 flex items-center justify-between text-xs">
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-purple-300 hover:bg-purple-950/60 hover:text-white transition-colors"
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-xl shadow-md transition-all"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
