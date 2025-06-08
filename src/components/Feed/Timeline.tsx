import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { MobileTabs } from '../Layout/MobileTabs';
import { MobileTags } from '../Layout/MobileTags';
import { useStore } from '../../store/useStore';

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const { timeline } = useStore();

  const handleComposeClick = () => {
    navigate('/compose');
  };

  return (
    <div className="min-h-screen w-full flex justify-end">
      <div className="w-full max-w-2xl border-r border-gray-200">
        {/* Desktop Header */}
        <div className="hidden md:block sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
          <h1 className="text-xl font-bold text-right">Home</h1>
        </div>

        {/* Mobile Tabs */}
        <MobileTabs />

        {/* Mobile Tags */}
        <MobileTags />

        {/* Desktop Tweet Composer */}
        <div className="hidden md:block border-b border-gray-200 p-4">
          <div className="flex space-x-4 justify-end">
            <div className="flex-1 max-w-lg">
              <div 
                className="text-xl text-gray-500 py-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 text-right"
                onClick={handleComposeClick}
              >
                What's happening?
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-col items-end pb-20 md:pb-0">
          {timeline.map((tweet) => (
            <div key={tweet.id} className="w-full max-w-2xl">
              {/* Desktop Tweet Card */}
              <div className="hidden md:block">
                <TweetCard tweet={tweet} />
              </div>
              {/* Mobile Tweet Card */}
              <div className="md:hidden">
                <MobileTweetCard tweet={tweet} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};