import React from 'react';
import { X } from 'lucide-react';
import { FILTER_COUNTRIES } from '../../types';

interface ActiveFiltersProps {
  categoryFilter: string | null;
  countryFilter: string;
  onClearCategory: () => void;
  onClearCountry: () => void;
  onClearAll: () => void;
  isMobile?: boolean;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  categoryFilter,
  countryFilter,
  onClearCategory,
  onClearCountry,
  onClearAll,
  isMobile = false,
}) => {
  if (!categoryFilter && countryFilter === 'ALL') {
    return null;
  }

  return (
    <div className={`bg-blue-50 border-b border-blue-200 px-4 py-2 ${isMobile ? 'py-1.5' : ''}`}>
      <div className="flex items-center justify-between">
        <div className={`text-blue-700 flex items-center space-x-4 ${isMobile ? 'text-xs space-x-2' : 'text-sm'}`}>
          {categoryFilter && (
            <span className="flex items-center">
              <span>Category: <span className="font-semibold">{categoryFilter}</span></span>
              <button 
                onClick={onClearCategory}
                className="ml-1.5 text-blue-500 hover:text-blue-700 p-0.5 rounded-full hover:bg-blue-100"
              >
                <X className={isMobile ? "h-3 w-3" : "h-3.5 w-3.5"} />
              </button>
            </span>
          )}
          {countryFilter !== 'ALL' && (
            <span className="flex items-center">
              <span>Country: <span className="font-semibold">
                {FILTER_COUNTRIES.find(c => c.code === countryFilter)?.name}
              </span></span>
              <button 
                onClick={onClearCountry}
                className="ml-1.5 text-blue-500 hover:text-blue-700 p-0.5 rounded-full hover:bg-blue-100"
              >
                <X className={isMobile ? "h-3 w-3" : "h-3.5 w-3.5"} />
              </button>
            </span>
          )}
        </div>
        <button 
          onClick={onClearAll}
          className={`text-blue-600 hover:text-blue-800 font-medium flex items-center ${isMobile ? 'text-xs' : 'text-sm'}`}
        >
          <X className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
          Clear all
        </button>
      </div>
    </div>
  );
};