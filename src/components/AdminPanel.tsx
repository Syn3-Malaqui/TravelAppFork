import React, { useState, useEffect } from 'react';
import { ArrowLeft, Crown, User, Search, Check, X, Settings, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { LazyAvatar } from './ui/LazyAvatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguageStore } from '../store/useLanguageStore';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  verified: boolean;
  role: 'user' | 'moderator' | 'admin';
  followers_count: number;
  following_count: number;
  created_at: string;
}

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, isRTL } = useLanguageStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    const channel = supabase
      .channel('admin_profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('🔄 Real-time profile update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updatedProfile = payload.new as UserProfile;
            setUsers(prev => prev.map(user => 
              user.id === updatedProfile.id 
                ? { ...user, ...updatedProfile }
                : user
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.display_name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.bio.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching users from database...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
      }
      
      console.log('✅ Fetched users:', data?.length || 0);
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentRole: 'user' | 'moderator' | 'admin') => {
    try {
      setUpdating(userId);
      console.log(`🔄 Updating role for user ${userId} from ${currentRole}`);
      
      // Cycle through roles: user -> moderator -> admin -> user
      let newRole: 'user' | 'moderator' | 'admin';
      if (currentRole === 'user') {
        newRole = 'moderator';
      } else if (currentRole === 'moderator') {
        newRole = 'admin';
      } else {
        newRole = 'user';
      }
      
      console.log(`➡️ Setting new role to: ${newRole}`);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Role updated successfully:', data);

      // Update local state immediately
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole }
          : user
      ));

      // Verify the update by re-fetching the specific user
      setTimeout(async () => {
        try {
          const { data: verifyData, error: verifyError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
          
          if (!verifyError && verifyData) {
            console.log('🔍 Verification check - role in database:', verifyData.role);
            if (verifyData.role !== newRole) {
              console.warn('⚠️ Role mismatch detected, refreshing data...');
              await fetchUsers();
            }
          }
        } catch (verifyErr) {
          console.error('❌ Verification failed:', verifyErr);
        }
      }, 1000);

    } catch (error: any) {
      console.error('❌ Error updating user role:', error);
      
      // Show user-friendly error message
      alert(`Failed to update role: ${error.message || 'Unknown error'}`);
      
      // Refresh data to show current state
      await fetchUsers();
    } finally {
      setUpdating(null);
    }
  };

  const toggleVerifiedStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdating(userId);
      console.log(`🔄 Updating verification for user ${userId} from ${currentStatus}`);
      
      const newVerifiedStatus = !currentStatus;
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          verified: newVerifiedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log(`✅ Verification updated successfully:`, data);

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, verified: newVerifiedStatus }
          : user
      ));

    } catch (error: any) {
      console.error('❌ Error updating verified status:', error);
      alert(`Failed to update verification: ${error.message || 'Unknown error'}`);
      await fetchUsers();
    } finally {
      setUpdating(null);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Manual refresh triggered');
      await fetchUsers();
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{language === 'en' ? 'Loading users...' : 'جاري تحميل المستخدمين...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen bg-white flex flex-col ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="flex items-center justify-between p-4">
          <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="p-2"
            >
              <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center">
                <Crown className={`h-5 w-5 text-yellow-500 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'en' ? 'Control Panel' : 'لوحة التحكم'}
              </h1>
              <p className="text-sm text-gray-500">
                {language === 'en' ? 'Manage users and permissions' : 'إدارة المستخدمين والصلاحيات'}
              </p>
            </div>
          </div>
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search users...' : 'البحث عن المستخدمين...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-gray-100 rounded-full py-2 text-sm text-gray-900 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Users List */}
        <div className="p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery 
                  ? (language === 'en' ? 'No users found' : 'لم يتم العثور على مستخدمين')
                  : (language === 'en' ? 'No users available' : 'لا يوجد مستخدمون متاحون')
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((userProfile) => (
                <div key={userProfile.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    {isRTL ? (
                      <>
                        {/* Action Buttons on left */}
                        {user?.id !== userProfile.id && (
                          <div className="flex items-center space-x-reverse space-x-2">
                            {/* Verify/Unverify */}
                            <Button
                              variant={userProfile.verified ? "outline" : "default"}
                              size="sm"
                              onClick={() => toggleVerifiedStatus(userProfile.id, userProfile.verified)}
                              disabled={updating === userProfile.id}
                              className={`text-xs ${userProfile.verified ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                            >
                              {updating === userProfile.id
                                ? '...'
                                : userProfile.verified
                                ? (<><X className="w-3 h-3 ml-1" />{language === 'en' ? 'Unverify' : 'إلغاء التوثيق'}</>)
                                : (<><Check className="w-3 h-3 ml-1" />{language === 'en' ? 'Verify' : 'توثيق'}</>)
                              }
                            </Button>
                            {/* Role Toggle */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAdminStatus(userProfile.id, userProfile.role)}
                              disabled={updating === userProfile.id}
                              className={`text-xs ${userProfile.role === 'admin' ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : userProfile.role === 'moderator' ? 'border-orange-300 text-orange-700 hover:bg-orange-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                              {updating === userProfile.id
                                ? '...'
                                : userProfile.role === 'admin'
                                ? (<><Crown className="w-3 h-3 ml-1" />{language === 'en' ? 'Admin' : 'مدير'}</>)
                                : userProfile.role === 'moderator'
                                ? (<><Settings className="w-3 h-3 ml-1" />{language === 'en' ? 'Moderator' : 'مشرف'}</>)
                                : (<><User className="w-3 h-3 ml-1" />{language === 'en' ? 'User' : 'مستخدم'}</>)
                              }
                            </Button>
                          </div>
                        )}
                        <div className="mr-auto" />
                        {/* Profile Group on right */}
                        <div className="flex items-center space-x-reverse space-x-3">
                          <LazyAvatar
                            src={userProfile.avatar_url}
                            fallback={userProfile.display_name[0]?.toUpperCase() || 'U'}
                            className="w-12 h-12"
                            size={96}
                          />
                          <div className="text-right">
                            <div className="flex items-center justify-end space-x-reverse space-x-2">
                              <h3 className="font-semibold text-gray-900">{userProfile.display_name}</h3>
                              {userProfile.verified && (<div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>)}
                              {userProfile.role === 'admin' && (<Crown className="w-4 h-4 text-yellow-500" />)}
                              {userProfile.role === 'moderator' && (<div className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">{language === 'en' ? 'Mod' : 'مشرف'}</div>)}
                            </div>
                            <p className="text-sm text-gray-500">@{userProfile.username}</p>
                            {userProfile.bio && (<p className="text-sm text-gray-600 mt-1 line-clamp-2">{userProfile.bio}</p>)}
                            <p className="text-xs text-gray-400 mt-1">{userProfile.followers_count} {language === 'en' ? 'followers' : 'متابع'} • {language === 'en' ? 'Joined' : 'انضم'} {new Date(userProfile.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Profile Group on left */}
                        <div className="flex items-center space-x-3">
                          <LazyAvatar
                            src={userProfile.avatar_url}
                            fallback={userProfile.display_name[0]?.toUpperCase() || 'U'}
                            className="w-12 h-12"
                            size={96}
                          />
                          <div className="text-left">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">{userProfile.display_name}</h3>
                              {userProfile.verified && (<div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>)}
                              {userProfile.role === 'admin' && (<Crown className="w-4 h-4 text-yellow-500" />)}
                              {userProfile.role === 'moderator' && (<div className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">{language === 'en' ? 'Mod' : 'مشرف'}</div>)}
                            </div>
                            <p className="text-sm text-gray-500">@{userProfile.username}</p>
                            {userProfile.bio && (<p className="text-sm text-gray-600 mt-1 line-clamp-2">{userProfile.bio}</p>)}
                            <p className="text-xs text-gray-400 mt-1">{userProfile.followers_count} {language === 'en' ? 'followers' : 'متابع'} • {language === 'en' ? 'Joined' : 'انضم'} {new Date(userProfile.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="ml-auto" />
                        {/* Action Buttons on right */}
                        {user?.id !== userProfile.id && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant={userProfile.verified ? "outline" : "default"}
                              size="sm"
                              onClick={() => toggleVerifiedStatus(userProfile.id, userProfile.verified)}
                              disabled={updating === userProfile.id}
                              className={`text-xs ${userProfile.verified ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                            >
                              {updating === userProfile.id
                                ? '...'
                                : userProfile.verified
                                ? (<><X className="w-3 h-3 mr-1" />{language === 'en' ? 'Unverify' : 'إلغاء التوثيق'}</>)
                                : (<><Check className="w-3 h-3 mr-1" />{language === 'en' ? 'Verify' : 'توثيق'}</>)
                              }
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAdminStatus(userProfile.id, userProfile.role)}
                              disabled={updating === userProfile.id}
                              className={`text-xs ${userProfile.role === 'admin' ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : userProfile.role === 'moderator' ? 'border-orange-300 text-orange-700 hover:bg-orange-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                              {updating === userProfile.id
                                ? '...'
                                : userProfile.role === 'admin'
                                ? (<><Crown className="w-3 h-3 mr-1" />{language === 'en' ? 'Admin' : 'مدير'}</>)
                                : userProfile.role === 'moderator'
                                ? (<><Settings className="w-3 h-3 mr-1" />{language === 'en' ? 'Moderator' : 'مشرف'}</>)
                                : (<><User className="w-3 h-3 mr-1" />{language === 'en' ? 'User' : 'مستخدم'}</>)
                              }
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}; 