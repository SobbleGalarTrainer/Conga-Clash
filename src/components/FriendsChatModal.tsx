import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DancerSprite } from './DancerSprite';

interface FriendsChatModalProps {
  onClose: () => void;
  defaultTab?: 'friends' | 'requests' | 'add' | 'chat';
}

export const FriendsChatModal: React.FC<FriendsChatModalProps> = ({
  onClose,
  defaultTab = 'friends',
}) => {
  const {
    friends,
    removeFriend,
    registeredUsers,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelOutgoingRequest,
    chatMessages,
    sendChatMessage,
    user,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add' | 'chat'>(defaultTab);
  const [targetIdInput, setTargetIdInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [searchFriend, setSearchFriend] = useState('');
  const [copiedMyId, setCopiedMyId] = useState(false);

  const incomingRequests = friendRequests.filter(
    (r) => r.direction === 'incoming' && r.status === 'pending'
  );
  const outgoingRequests = friendRequests.filter(
    (r) => r.direction === 'outgoing' && r.status === 'pending'
  );

  const quickEmotes = [
    { emoji: '🪇', text: 'Shik-a-shake!' },
    { emoji: '💃', text: '1-2-3-KICK!' },
    { emoji: '🔥', text: 'This conga line is on FIRE!' },
    { emoji: '👑', text: 'Bow to the Conga Emperor!' },
    { emoji: '🕺', text: "Stayin' sharp under the disco ball!" },
    { emoji: '🎉', text: 'GG everyone!' },
    { emoji: '🗺️', text: 'Let’s dance across all 16 maps!' },
  ];

  const handleSendFriendRequest = (idToSend?: string) => {
    const id = idToSend || targetIdInput;
    if (!id.trim()) return;

    setFeedback(null);
    const res = sendFriendRequest(id.trim());
    if (res.success) {
      setFeedback({ text: res.message, isError: false });
      setTargetIdInput('');
    } else {
      setFeedback({ text: res.message, isError: true });
    }
  };

  const handleCopyMyId = () => {
    const id = user.customUserId || user.id;
    navigator.clipboard.writeText(id);
    setCopiedMyId(true);
    setTimeout(() => setCopiedMyId(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchFriend.toLowerCase()) ||
      f.id.toLowerCase().includes(searchFriend.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[640px] max-h-[90vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {activeTab === 'friends' ? '👥' : activeTab === 'requests' ? '📨' : activeTab === 'add' ? '➕' : '💬'}
            </span>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white">
                Carnival Social & Ballroom
              </h2>
              <p className="text-xs text-slate-400">
                Connect with dancers using User IDs, manage friend requests, and chat in the ballroom.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-800 bg-slate-900/60 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('friends');
              setFeedback(null);
            }}
            className={`px-3.5 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'friends'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>👥</span>
            <span>Friends ({friends.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('requests');
              setFeedback(null);
            }}
            className={`px-3.5 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 relative ${
              activeTab === 'requests'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>📨</span>
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="bg-rose-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('add');
              setFeedback(null);
            }}
            className={`px-3.5 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'add'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>➕</span>
            <span>Add Friend</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('chat');
              setFeedback(null);
            }}
            className={`px-3.5 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'chat'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>💬</span>
            <span>Ballroom Chat</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs font-bold border-b flex items-center justify-between ${
              feedback.isError
                ? 'bg-rose-950/80 text-rose-200 border-rose-500/40'
                : 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-75 hover:opacity-100 cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: FRIENDS LIST */}
        {activeTab === 'friends' && (
          <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-hidden">
            {/* Search Friends bar */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search friends by name or ID..."
                value={searchFriend}
                onChange={(e) => setSearchFriend(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => setActiveTab('add')}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs rounded-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <span>➕</span>
                <span>Add Friend</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  {friends.length === 0
                    ? 'No friends yet! Go to the "Add Friend" tab to enter a dancer\'s User ID.'
                    : 'No friends match your search query.'}
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <DancerSprite character={friend.character} size={42} isDancing={false} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-white">
                            {friend.displayName}
                          </span>
                          <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {friend.id}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              friend.status === 'online'
                                ? 'bg-emerald-400'
                                : friend.status === 'in_conga'
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-slate-600'
                            }`}
                            title={`Status: ${friend.status}`}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {friend.lastSeen} · Best Conga: {friend.congaScore}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          sendChatMessage(`Hey ${friend.displayName}, join my conga line! 🎉`);
                          setActiveTab('chat');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Message 💬
                      </button>
                      <button
                        onClick={() => removeFriend(friend.id)}
                        className="px-2 py-1 text-slate-500 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                        title="Remove friend"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FRIEND REQUESTS */}
        {activeTab === 'requests' && (
          <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-y-auto space-y-6 scrollbar-thin">
            {/* Section A: Incoming Requests */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                  <span>📥 Incoming Friend Requests</span>
                  <span className="text-xs text-amber-400 font-mono">
                    ({incomingRequests.length})
                  </span>
                </h3>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-center text-xs text-slate-500">
                  No incoming friend requests right now.
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-slate-950 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <DancerSprite character={req.senderCharacter} size={40} isDancing={false} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">
                              {req.senderDisplayName}
                            </span>
                            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {req.senderId}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Sent you a friend request · {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => acceptFriendRequest(req.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs rounded-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow"
                        >
                          Accept 🤝
                        </button>
                        <button
                          onClick={() => declineFriendRequest(req.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section B: Pending Outgoing Requests */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                  <span>📤 Sent Friend Requests</span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({outgoingRequests.length})
                  </span>
                </h3>
              </div>

              {outgoingRequests.length === 0 ? (
                <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-center text-xs text-slate-500">
                  No outgoing requests pending.
                </div>
              ) : (
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-200">
                            {req.targetDisplayName || req.targetId}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {req.targetId}
                          </span>
                        </div>
                        <span className="text-[11px] text-amber-400/90 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Waiting for dancer response...
                        </span>
                      </div>

                      <button
                        onClick={() => cancelOutgoingRequest(req.id)}
                        className="px-2.5 py-1 text-slate-400 hover:text-rose-300 text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADD FRIEND BY USER ID */}
        {activeTab === 'add' && (
          <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-y-auto space-y-5 scrollbar-thin">
            {/* My User ID Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block mb-0.5">
                  Your Permanent User ID
                </span>
                <span className="font-mono font-black text-base sm:text-lg text-white">
                  {user.customUserId || user.id}
                </span>
              </div>
              <button
                onClick={handleCopyMyId}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs rounded-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap shadow"
              >
                {copiedMyId ? '✓ Copied!' : '📋 Copy ID'}
              </button>
            </div>

            {/* Friend Request Input Form */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <label className="text-xs font-bold text-slate-200 block mb-1.5">
                Send Friend Request by User ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. #CONGA-SOFIA or #CONGA-DAVE"
                  value={targetIdInput}
                  onChange={(e) => setTargetIdInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 font-mono font-bold tracking-wider focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => handleSendFriendRequest()}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-display font-black text-xs rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  Send Request 📨
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                ℹ️ <strong>Validation check:</strong> If the dancer's User ID does not exist, you cannot friend them. If valid, an official friend request is sent!
              </p>
            </div>

            {/* Directory of Active Dancers */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 mb-2.5">
                Active Dancers in the Carnival Network (Click to Request)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {registeredUsers.slice(0, 8).map((dancer) => {
                  const isAlreadyFriend = friends.some((f) => f.id === dancer.id);
                  const isSelf = (user.customUserId || user.id) === dancer.id;

                  return (
                    <div
                      key={dancer.id}
                      className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <DancerSprite character={dancer.character} size={32} isDancing={false} />
                        <div className="truncate">
                          <span className="font-bold text-xs text-white block truncate">
                            {dancer.displayName}
                          </span>
                          <span className="font-mono text-[10px] text-amber-400/90 block">
                            {dancer.id}
                          </span>
                        </div>
                      </div>

                      {isSelf ? (
                        <span className="text-[10px] text-slate-500 font-bold px-2 py-1 bg-slate-900 rounded">
                          You
                        </span>
                      ) : isAlreadyFriend ? (
                        <span className="text-[10px] text-emerald-400 font-bold px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                          Friends ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(dancer.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          + Request
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BALLROOM CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-hidden">
            {/* Quick Emotes Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Quick:
              </span>
              {quickEmotes.map((qe) => (
                <button
                  key={qe.text}
                  onClick={() => sendChatMessage(`${qe.emoji} ${qe.text}`)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 rounded-lg text-xs text-slate-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{qe.emoji}</span>
                  <span className="text-[11px]">{qe.text}</span>
                </button>
              ))}
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3 scrollbar-thin">
              {chatMessages.map((msg) => {
                const myId = user.customUserId || user.id;
                const isMe = msg.senderId === myId || msg.senderId === user.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                      <span className="font-bold text-slate-300">{msg.senderName}</span>
                      <span className="font-mono text-[9px] text-amber-400/80 bg-slate-900 px-1 rounded">
                        {msg.senderId}
                      </span>
                      {msg.isGuest && (
                        <span className="bg-slate-800 text-[9px] px-1 rounded text-slate-400">
                          Guest
                        </span>
                      )}
                      <span>·</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs max-w-[85%] break-words ${
                        isMe
                          ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder={`Chatting as ${user.displayName}...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={140}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-display font-black text-xs rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Send 🚀
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
