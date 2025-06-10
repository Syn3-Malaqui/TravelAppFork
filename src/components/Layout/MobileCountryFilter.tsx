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
    <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-between px-4 py-3 border-gray-300 hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <Globe className="h-4 w-4 text-gray-500" />
              <span className="text-lg">{selectedCountryData.flag}</span>
              <span className="text-sm font-medium">{selectedCountryData.name}</span>
            </div>
            <span className="text-xs text-gray-400">Tap to change</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="w-[95vw] max-w-md h-[80vh] p-0">
          <DialogHeader className="p-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold">Select Country</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-full">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-100">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search countries..."
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Selected Country Display */}
            {selectedCountryData.code !== 'ALL' && (
              <div className="p-4 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{selectedCountryData.flag}</span>
                  <div className="flex-1">
                    <span className="font-medium text-blue-900">{selectedCountryData.name}</span>
                    <p className="text-xs text-blue-600">Currently selected</p>
                  </div>
                  <Check className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            )}

            {/* Country List */}
            <div className="flex-1 overflow-y-auto">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country.code)}
                  className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                    selectedCountry === country.code ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-gray-900">{country.name}</span>
                    <p className="text-xs text-gray-500">{country.code}</p>
                  </div>
                  {selectedCountry === country.code && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full"
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