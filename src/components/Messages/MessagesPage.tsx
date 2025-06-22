import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Search, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useMessages, Conversation, Message } from '../../hooks/useMessages';
import { useAuth } from '../../hooks/useAuth';
import { storageService } from '../../lib/storage';
import { formatDistanceToNow } from 'date-fns';

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    conversations, 
    messages, 
    loading, 
    error, 
    fetchMessages, 
    sendMessage, 
    markAsRead 
  } = useMessages();
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversation]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages, markAsRead]);

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !newMessage.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);
      await sendMessage(selectedConversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherParticipant.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherParticipant.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conversationMessages = selectedConversation ? messages[selectedConversation.id] || [] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold mb-2">Error loading messages</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex h-screen overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="p-2 mr-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Messages</h1>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No conversations yet</p>
                <p className="text-sm mt-2">Start a conversation by messaging someone!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationSelect(conversation)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage 
                            src={conversation.otherParticipant.avatar ? storageService.getOptimizedImageUrl(conversation.otherParticipant.avatar, { width: 96, quality: 80 }) : undefined} 
                          />
                          <AvatarFallback>{conversation.otherParticipant.displayName[0]}</AvatarFallback>
                        </Avatar>
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {conversation.otherParticipant.displayName}
                          </p>
                          {conversation.otherParticipant.verified && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                          <span className="text-gray-500 text-xs">
                            @{conversation.otherParticipant.username}
                          </span>
                        </div>
                        
                        {conversation.lastMessage && (
                          <div className="flex items-center justify-between">
                            <p className="text-gray-600 text-sm truncate">
                              {conversation.lastMessage.senderId === user?.id ? 'You: ' : ''}
                              {conversation.lastMessage.content}
                            </p>
                            <span className="text-gray-400 text-xs ml-2 flex-shrink-0">
                              {formatDistanceToNow(conversation.lastMessage.createdAt, { addSuffix: true }).replace('about ', '')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage 
                      src={selectedConversation.otherParticipant.avatar ? storageService.getOptimizedImageUrl(selectedConversation.otherParticipant.avatar, { width: 80, quality: 80 }) : undefined} 
                    />
                    <AvatarFallback>{selectedConversation.otherParticipant.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-gray-900">
                        {selectedConversation.otherParticipant.displayName}
                      </p>
                      {selectedConversation.otherParticipant.verified && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">@{selectedConversation.otherParticipant.username}</p>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" className="p-2">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.senderId === user?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatDistanceToNow(message.createdAt, { addSuffix: true }).replace('about ', '')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Start a new message"
                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    disabled={sendingMessage}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full flex flex-col h-screen">
        {!selectedConversation ? (
          <>
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="p-2 mr-3"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold">Messages</h1>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations"
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto pb-20">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No conversations yet</p>
                  <p className="text-sm mt-2">Start a conversation by messaging someone!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleConversationSelect(conversation)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage 
                              src={conversation.otherParticipant.avatar ? storageService.getOptimizedImageUrl(conversation.otherParticipant.avatar, { width: 96, quality: 80 }) : undefined} 
                            />
                            <AvatarFallback>{conversation.otherParticipant.displayName[0]}</AvatarFallback>
                          </Avatar>
                          {conversation.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-bold text-gray-900 text-sm truncate">
                              {conversation.otherParticipant.displayName}
                            </p>
                            {conversation.otherParticipant.verified && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          
                          {conversation.lastMessage && (
                            <div className="flex items-center justify-between">
                              <p className="text-gray-600 text-sm truncate">
                                {conversation.lastMessage.senderId === user?.id ? 'You: ' : ''}
                                {conversation.lastMessage.content}
                              </p>
                              <span className="text-gray-400 text-xs ml-2 flex-shrink-0">
                                {formatDistanceToNow(conversation.lastMessage.createdAt, { addSuffix: true }).replace('about ', '')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="p-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="w-8 h-8">
                  <AvatarImage 
                    src={selectedConversation.otherParticipant.avatar ? storageService.getOptimizedImageUrl(selectedConversation.otherParticipant.avatar, { width: 64, quality: 80 }) : undefined} 
                  />
                  <AvatarFallback className="text-xs">{selectedConversation.otherParticipant.displayName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-1">
                    <p className="font-bold text-gray-900 text-sm">
                      {selectedConversation.otherParticipant.displayName}
                    </p>
                    {selectedConversation.otherParticipant.verified && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">@{selectedConversation.otherParticipant.username}</p>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" className="p-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {conversationMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs px-3 py-2 rounded-2xl ${
                    message.senderId === user?.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatDistanceToNow(message.createdAt, { addSuffix: true }).replace('about ', '')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4 pb-8">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Start a new message"
                  className="flex-1 px-3 py-2 bg-gray-100 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                  disabled={sendingMessage}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};