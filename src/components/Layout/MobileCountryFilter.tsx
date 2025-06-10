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
            <span className="text-lg">{selectedCountryData.flag}</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="w-[90vw] max-w-sm h-[60vh] p-0">
          <DialogHeader className="p-3 border-b border-gray-200">
            <DialogTitle className="text-base font-semibold">Select Country</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-full">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Country Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-4 gap-2">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleCountrySelect(country.code)}
                    className={`relative flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedCountry === country.code ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                    }`}
                    title={country.name}
                  >
                    <span className="text-2xl mb-1">{country.flag}</span>
                    <span className="text-xs text-gray-600 text-center leading-tight">
                      {country.code}
                    </span>
                    {selectedCountry === country.code && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
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