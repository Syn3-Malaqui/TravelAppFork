import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  Repeat2, 
  MessageCircle, 
  UserPlus,
  MoreHorizontal,
  Check,
  CheckCheck,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationsPageSkeleton } from './NotificationSkeleton';
import { Notification } from '../../types';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../../lib/storage';
import { useLanguageStore } from '../../store/useLanguageStore';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguageStore();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-6 h-6 text-red-500 fill-current" />;
      case 'retweet':
        return <Repeat2 className="w-6 h-6 text-green-500" />;
      case 'reply':
        return <MessageCircle className="w-6 h-6 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-6 h-6 text-purple-500" />;
      default:
        return <Heart className="w-6 h-6 text-gray-500" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return isRTL ? 'أعجب بتغريدتك' : 'liked your tweet';
      case 'retweet':
        return isRTL ? 'أعاد تغريد تغريدتك' : 'retweeted your tweet';
      case 'reply':
        return isRTL ? 'رد على تغريدتك' : 'replied to your tweet';
      case 'follow':
        return isRTL ? 'بدأ بمتابعتك' : 'started following you';
      default:
        return isRTL ? 'تفاعل مع محتواك' : 'interacted with your content';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'follow') {
      navigate(`/profile/${notification.actor.username}`);
    } else if (notification.tweet) {
      // For tweet-related notifications, we could navigate to the tweet detail
      // For now, navigate to the author's profile
      navigate(`/profile/${notification.tweet.author.username}`);
    }
  };

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  if (loading) {
    return <NotificationsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="h-full bg-white flex flex-col overflow-hidden">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 z-10 flex-shrink-0">
          <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="p-2 md:hidden"
            >
              <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <h1 className="text-xl font-bold">{isRTL ? 'الإشعارات' : 'Notifications'}</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center py-12 px-4">
          <div className="text-red-500 text-center">
            <p className="text-lg font-semibold mb-2">{isRTL ? 'خطأ في تحميل الإشعارات' : 'Error loading notifications'}</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="p-2 md:hidden"
            >
              <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <h1 className="text-xl font-bold">{isRTL ? 'الإشعارات' : 'Notifications'}</h1>
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          {notifications.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end"
                avoidCollisions={true}
                collisionPadding={8}
                sideOffset={4}
              >
                <DropdownMenuItem onClick={markAllAsRead} disabled={unreadCount === 0}>
                  <CheckCheck className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                  {isRTL ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <div className="flex">
          <Button
            variant="ghost"
            onClick={() => setFilter('all')}
            className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-blue-500 text-black'
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            {isRTL ? 'الكل' : 'All'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setFilter('unread')}
            className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
              filter === 'unread'
                ? 'border-blue-500 text-black'
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            {isRTL ? 'غير مقروء' : 'Unread'} {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>
      </div>

      {/* Notifications List - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg mb-2">
              {filter === 'unread' ? 
                (isRTL ? 'لا توجد إشعارات غير مقروءة' : 'No unread notifications') : 
                (isRTL ? 'لا توجد إشعارات بعد' : 'No notifications yet')
              }
            </p>
            <p className="text-sm text-gray-400">
              {filter === 'unread' 
                ? (isRTL ? 'كل شيء محدث! تحقق مرة أخرى لاحقاً للنشاط الجديد.' : 'All caught up! Check back later for new activity.')
                : (isRTL ? 'عندما يعجب شخص ما أو يعيد تغريد أو يرد على تغريداتك، ستراه هنا.' : 'When someone likes, retweets, or replies to your tweets, you\'ll see it here.')
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className={`flex ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                  {/* Notification Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Actor Avatar */}
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage 
                      src={notification.actor.avatar ? storageService.getOptimizedImageUrl(notification.actor.avatar, { width: 80, quality: 80 }) : undefined} 
                    />
                    <AvatarFallback>{notification.actor.displayName[0]}</AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-bold">{notification.actor.displayName}</span>
                          {' '}
                          <span className="text-gray-600">{getNotificationText(notification)}</span>
                        </p>
                        
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </p>

                        {/* Tweet content preview for tweet-related notifications */}
                        {notification.tweet && notification.type !== 'follow' && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {notification.tweet.content}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2 mr-2' : 'space-x-2 ml-2'}`}>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 hover:bg-blue-100"
                            title={isRTL ? 'تحديد كمقروء' : 'Mark as read'}
                          >
                            <Check className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                          className="p-1 hover:bg-red-100"
                          title={isRTL ? 'حذف الإشعار' : 'Delete notification'}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};