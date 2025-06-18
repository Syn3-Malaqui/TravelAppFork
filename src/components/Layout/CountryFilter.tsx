import React, { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { FILTER_COUNTRIES, FilterCountry } from '../../types';

interface CountryFilterProps {
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
}

export const CountryFilter: React.FC<CountryFilterProps> = ({ 
  selectedCountry, 
  onCountryChange 
}) => {
  const [open, setOpen] = useState(false);

  const selectedCountryData = FILTER_COUNTRIES.find(c => c.code === selectedCountry) || FILTER_COUNTRIES[0];

  const handleCountrySelect = (countryCode: string) => {
    onCountryChange(countryCode);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2 px-3 md:px-4 py-2 border-gray-300 hover:bg-gray-50 rounded-full text-xs md:text-sm"
        >
          <Globe className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
          <div className="relative">
            <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xs md:text-sm">{selectedCountryData.flag}</span>
            </div>
          </div>
          <span className="font-medium hidden sm:inline">{selectedCountryData.name}</span>
          <span className="font-medium sm:hidden">Countries</span>
          <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-72 max-h-96 overflow-y-auto rounded-xl"
        sideOffset={4}
      >
        <div className="max-h-80 overflow-y-auto">
          {FILTER_COUNTRIES.map((country) => (
            <DropdownMenuItem
              key={country.code}
              onClick={() => handleCountrySelect(country.code)}
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-lg mx-1"
            >
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <span className="text-lg">{country.flag}</span>
                </div>
              </div>
              <span className="flex-1 text-sm font-medium truncate">{country.name}</span>
              {selectedCountry === country.code && (
                <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};