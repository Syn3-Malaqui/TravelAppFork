import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { MobileTabs } from '../Layout/MobileTabs';
import { MobileTags } from '../Layout/MobileTags';
import { useTweets } from '../../hooks/useTweets';
import { User, Tweet } from '../types';

// Mock data for demo purposes
const mockTweets: Tweet[] = [
  {
    id: '1',
    content: 'Daming condom na binigay',
    author: {
      id: '1',
      username: 'mayi',
      displayName: 'Harley Queen',
      avatar: 'https://scontent.fmnl4-3.fna.fbcdn.net/v/t39.30808-1/497914096_122163603392563091_2518584907985062167_n.jpg?stp=dst-jpg_s100x100_tt6&_nc_cat=109&ccb=1-7&_nc_sid=111fe6&_nc_eui2=AeFKv_BErCi0dj_08KxWVqCU2qOH3y0-boXao4ffLT5uhQZRcdgozkF5NfNGng4GaaxQa_I1P_6oA3L1SUwiCaHP&_nc_ohc=Yv98XVcm7dEQ7kNvwEIsHe_&_nc_oc=AdnadbE6wZURq5o7FrX-AlubcGf2uMwZjxrYIaYaKfNILsVOIAcJ3gdwX5nLqU1Sc5BfqHr6NeaeQGuw9txpumNW&_nc_ad=z-m&_nc_cid=0&_nc_zt=24&_nc_ht=scontent.fmnl4-3.fna&_nc_gid=XvrbQgGbm-SmUvf5ip37_A&oh=00_AfONQKSNyGQVGJcd2UIhmje_rcBpeT8PMVpCaRUCrL2V1g&oe=684B954D',
      bio: 'Full-stack developer passionate about React',
      verified: true,
      followers: 1250,
      following: 340,
      joinedDate: new Date('2020-01-15'),
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    likes: 4207641,
    retweets: 1209,
    replies: 80,
    views: 1200,
    images: ['https://ph-test-11.slatic.net/p/69ea93cce082117adbf2f9d81aa7a53b.png'],
    isLiked: false,
    isRetweeted: false,
    isBookmarked: false,
    hashtags: ['coding', 'react', 'typescript'],
    mentions: [],
  },
  {
    id: '2',
    content: 'Beautiful sunset today! Sometimes you need to step away from the code and enjoy nature 🌅',
    author: {
      id: '2',
      username: 'naturelover',
      displayName: 'Sarah Johnson',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
      bio: 'Photographer and nature enthusiast',
      verified: false,
      followers: 890,
      following: 234,
      joinedDate: new Date('2021-03-22'),
    },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    likes: 156,
    retweets: 23,
    replies: 15,
    views: 2100,
    images: ['https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=600'],
    isLiked: true,
    isRetweeted: false,
    isBookmarked: true,
    hashtags: [],
    mentions: [],
  },
  {
    id: '3',
    content: 'Hot take: TypeScript makes JavaScript development so much better. The type safety alone saves hours of debugging! 💯',
    author: {
      id: '3',
      username: 'jsexpert',
      displayName: 'Alex Chen',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
      bio: 'JavaScript enthusiast, TypeScript advocate',
      verified: true,
      followers: 3400,
      following: 567,
      joinedDate: new Date('2019-08-10'),
    },
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    likes: 89,
    retweets: 34,
    replies: 22,
    views: 1800,
    isLiked: false,
    isRetweeted: true,
    isBookmarked: false,
    hashtags: [],
    mentions: [],
  },
];

export const Timeline: React.FC = () => {
  const navigate = useNavigate();

  const handleComposeClick = () => {
    navigate('/compose');
  };

  const handleLike = (tweetId: string) => {
    console.log('Like tweet:', tweetId);
  };

  const handleRetweet = (tweetId: string) => {
    console.log('Retweet:', tweetId);
  };

  const handleBookmark = (tweetId: string) => {
    console.log('Bookmark:', tweetId);
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
          {mockTweets.map((tweet) => (
            <div key={tweet.id} className="w-full max-w-2xl">
              {/* Desktop Tweet Card */}
              <div className="hidden md:block">
                <TweetCard 
                  tweet={tweet} 
                  onLike={() => handleLike(tweet.id)}
                  onRetweet={() => handleRetweet(tweet.id)}
                  onBookmark={() => handleBookmark(tweet.id)}
                  currentUserId="demo-user"
                />
              </div>
              {/* Mobile Tweet Card */}
              <div className="md:hidden">
                <MobileTweetCard 
                  tweet={tweet}
                  onLike={() => handleLike(tweet.id)}
                  onRetweet={() => handleRetweet(tweet.id)}
                  onBookmark={() => handleBookmark(tweet.id)}
                  currentUserId="demo-user"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};