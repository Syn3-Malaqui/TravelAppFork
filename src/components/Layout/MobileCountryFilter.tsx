import React, { useState } from 'react';
import { Globe, X, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { FILTER_COUNTRIES } from '../../types';

interface MobileCountryFilterProps {
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
}

export const MobileCountryFilter: React.FC<MobileCountryFilterProps> = ({ 
  selectedCountry, 
  onCountryChange 
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCountryData = FILTER_COUNTRIES.find(c => c.code === selectedCountry) || FILTER_COUNTRIES[0];

  const filteredCountries = FILTER_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountrySelect = (countryCode: string) => {
    onCountryChange(countryCode);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="md:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-10 w-10 p-0 rounded-full border border-gray-200 hover:bg-gray-50"
          >
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm">{selectedCountryData.flag}</span>
            </div>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="w-[90vw] max-w-sm max-h-[70vh] p-0 flex flex-col">
          <DialogHeader className="p-3 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="text-base font-semibold">Select Country</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100 flex-shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Country List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleCountrySelect(country.code)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedCountry === country.code ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                        <span className="text-xl">{country.flag}</span>
                      </div>
                      {selectedCountry === country.code && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">
                        {country.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {country.code}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full text-sm py-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};