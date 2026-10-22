import React from 'react';
import { CalendarRange, RotateCcw } from 'lucide-react';
import {
  FILTER_START_YEAR,
  MONTH_NAMES,
  filterYearOptions,
  monthYearLabel,
} from '../../utils/datetime.ts';

interface MonthYearFilterProps {
  month: string;
  year: string;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  latestYear?: number;
}

export const MonthYearFilter: React.FC<MonthYearFilterProps> = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  latestYear,
}) => {
  const years = filterYearOptions(latestYear).filter((value) => value >= FILTER_START_YEAR);
  const isFiltered = month !== 'all' || year !== 'all';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <CalendarRange className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <div className="grid grid-cols-2 gap-2 flex-1">
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            aria-label="Filter by month"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Months</option>
            {MONTH_NAMES.map((name, index) => {
              const value = String(index + 1).padStart(2, '0');
              return (
                <option key={value} value={value}>
                  {name}
                </option>
              );
            })}
          </select>

          <select
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            aria-label="Filter by year"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-700 font-mono"
          >
            <option value="all">All Years</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pl-6">
        <span className="text-[11px] text-slate-400">
          Period: <span className="font-semibold text-slate-600">{monthYearLabel(month, year)}</span>
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              onMonthChange('all');
              onYearChange('all');
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
