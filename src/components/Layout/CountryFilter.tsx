import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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

  const getMobileDisplayText = () => {
    if (selectedCountryData.code === 'ALL') return 'Countries';
    // Truncate long country names for mobile
    const text = selectedCountryData.name;
    return text.length > 10 ? text.substring(0, 10) + '...' : text;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2 px-3 md:px-4 py-2 border-gray-300 hover:bg-gray-50 rounded-full text-xs md:text-sm min-w-0"
        >
          {/* Desktop version */}
          <div className="hidden md:flex items-center space-x-2">
            <span className="font-medium">{selectedCountryData.name}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>

          {/* Mobile version - text only */}
          <div className="md:hidden flex items-center space-x-1">
            <span className="font-medium text-xs">{getMobileDisplayText()}</span>
            <ChevronDown className="h-3 w-3 text-gray-500" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-72 max-h-96 overflow-y-auto rounded-xl"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={8}
      >
        <div className="max-h-80 overflow-y-auto">
          {FILTER_COUNTRIES.map((country) => (
            <DropdownMenuItem
              key={country.code}
              onClick={() => handleCountrySelect(country.code)}
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-lg mx-1"
            >
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