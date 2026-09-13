import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logoutUser, loading } = useAuth(); // Added 'loading' here

  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [joinLinkInput, setJoinLinkInput] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Wait until loading is false before evaluating user session
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
    setRecentRooms(savedRooms);
  }, [user, loading, navigate]);

  const extractRoomId = (input) => {
    let cleanInput = input.trim();
    if (cleanInput.includes('/room/')) {
      const parts = cleanInput.split('/room/');
      return parts[1].trim();
    }
    return cleanInput;
  };

  const removeRecentRoom = async (targetRoomId) => {
    try {
      await axios.delete(`https://devcode-backend.onrender.com/api/rooms/${targetRoomId}`);
    } catch (err) {
      console.error('Error deleting room from DB', err);
    }

    const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
    const filtered = savedRooms.filter(r => r.roomId !== targetRoomId);
    localStorage.setItem('recentRooms', JSON.stringify(filtered));
    setRecentRooms(filtered);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomId.trim()) return;

    const roomId = extractRoomId(newRoomId);
    if (!roomId) return;

    const defaultLanguage = 'javascript';

    try {
      await axios.post('https://devcode-backend.onrender.com/api/rooms/join', {
        roomId,
        roomName: newRoomName.trim() || `Room ${roomId}`,
        language: defaultLanguage,
        userId: user?._id || user?.id
      });
    } catch (err) {
      console.error('Error creating room in DB', err);
    }

    const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
    const filtered = savedRooms.filter(r => r.roomId !== roomId);
    localStorage.setItem('recentRooms', JSON.stringify([{ roomId, language: defaultLanguage }, ...filtered]));

    navigate(`/room/${roomId}`);
  };

  const handleJoinByLink = async (e) => {
    e.preventDefault();
    if (!joinLinkInput.trim() || isJoining) return;

    const roomId = extractRoomId(joinLinkInput);
    if (!roomId) return;

    setIsJoining(true);

    try {
      const response = await axios.get(`https://devcode-backend.onrender.com/api/rooms/${roomId}`);
      
      if (response.data) {
        const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
        const existing = savedRooms.find(r => r.roomId === roomId);
        const lang = response.data.language || (existing ? existing.language : 'javascript');

        const filtered = savedRooms.filter(r => r.roomId !== roomId);
        localStorage.setItem('recentRooms', JSON.stringify([{ roomId, language: lang }, ...filtered]));

        navigate(`/room/${roomId}`);
      }
    } catch (err) {
      console.error('Room verification failed:', err);
      alert('This active session does not exist or has already ended. Please check the Room ID or URL.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  // Show a loading placeholder while checking the session token/localStorage
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-cream font-bold text-peri-dark text-sm">
        Loading workspace...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen flex-col bg-cream text-gray-800 overflow-hidden font-sans">
      
      {/* Sleek Top Navigation Bar */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-peri-mid shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-peri-dark text-white font-black shadow-md">
            <span>⚡</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-peri-dark leading-tight">DevCode Workspace</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Development Environment</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-cream border border-peri-mid rounded-xl">
            <span className="w-2 h-2 rounded-full bg-peri-dark animate-pulse"></span>
            <span className="text-xs font-bold text-peri-dark">{user?.username || user?.name}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-cream hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-peri-dark border border-peri-mid rounded-xl text-xs font-bold transition shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Hero Control Grid */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Action Panels (Span 7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Create Room Master Panel */}
            <div className="bg-white p-7 rounded-3xl border border-peri-mid shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-peri-light/40 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-peri-light text-peri-dark border border-peri-mid rounded-full text-[10px] font-black uppercase tracking-wider">
                  New Session
                </span>
              </div>

              <h2 className="text-xl font-black text-peri-dark mb-1">Create Collaborative Room</h2>
              <p className="text-xs text-gray-500 mb-5">Establish a live environment featuring a code editor, real-time synchronization, and an execution console.</p>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-peri-dark uppercase tracking-wider mb-1.5">Room ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 01" 
                      value={newRoomId}
                      onChange={(e) => setNewRoomId(e.target.value)}
                      className="w-full p-3 bg-cream rounded-2xl border border-peri-mid text-xs font-medium focus:outline-none focus:ring-2 focus:ring-peri-dark text-gray-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-peri-dark uppercase tracking-wider mb-1.5">Display Label <span className="text-gray-400 font-normal">(Opt.)</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. Core Logic Build" 
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full p-3 bg-cream rounded-2xl border border-peri-mid text-xs font-medium focus:outline-none focus:ring-2 focus:ring-peri-dark text-gray-800 transition"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-peri-dark hover:bg-peri-mid text-white rounded-2xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
                >
                  <span>Initialize & Enter Room</span>
                  <span>&rarr;</span>
                </button>
              </form>
            </div>

            {/* Join via Link Panel */}
            <div className="bg-white p-7 rounded-3xl border border-peri-mid shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Direct Link
                </span>
              </div>

              <h2 className="text-xl font-black text-peri-dark mb-1">Join Active Session</h2>
              <p className="text-xs text-gray-500 mb-5">Enter a room URL or a unique identification code to connect to an ongoing session.</p>

              <form onSubmit={handleJoinByLink} className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="Paste URL or Room ID..." 
                  value={joinLinkInput}
                  onChange={(e) => setJoinLinkInput(e.target.value)}
                  disabled={isJoining}
                  className="flex-1 p-3 bg-cream rounded-2xl border border-peri-mid text-xs font-medium focus:outline-none focus:ring-2 focus:ring-peri-dark text-gray-800 transition"
                />
                <button 
                  type="submit"
                  disabled={isJoining}
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-md shrink-0 disabled:opacity-50"
                >
                  {isJoining ? 'Verifying...' : 'Connect Now'}
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Recent Activity Feed & Status (Span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="bg-white p-7 rounded-3xl border border-peri-mid shadow-sm flex flex-col h-full min-h-[460px]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-peri-dark tracking-tight">Recent Sessions</h3>
                  <p className="text-xs text-gray-400">Quick-access session history</p>
                </div>
                <span className="px-3 py-1 bg-peri-light text-peri-dark rounded-full text-xs font-bold border border-peri-mid">
                  {recentRooms.length} Saved
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
                {recentRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-peri-mid rounded-2xl text-center p-8">
                    <div className="w-10 h-10 rounded-xl bg-peri-light flex items-center justify-center text-peri-dark font-bold mb-3 shadow-sm">
                      📂
                    </div>
                    <p className="text-xs text-gray-600 font-bold">No history available</p>
                    <p className="text-[11px] text-gray-400 mt-1">Your created or joined rooms will appear here automatically.</p>
                  </div>
                ) : (
                  recentRooms.map((room, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-cream rounded-2xl border border-peri-mid hover:border-peri-dark transition group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-white border border-peri-mid flex items-center justify-center font-black text-peri-dark text-xs shadow-sm shrink-0">
                          #{index + 1}
                        </div>
                        <div className="overflow-hidden">
                          <span className="font-extrabold text-peri-dark text-sm block truncate">{room.roomId}</span>
                          <span className="inline-block px-2 py-0.5 bg-white border border-peri-mid rounded text-[9px] font-black uppercase text-peri-dark tracking-wider mt-1">
                            {room.language || 'javascript'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link 
                          to={`/room/${room.roomId}`}
                          onClick={() => {
                            const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
                            const filtered = savedRooms.filter(r => r.roomId !== room.roomId);
                            localStorage.setItem('recentRooms', JSON.stringify([room, ...filtered]));
                          }}
                          className="px-3.5 py-2 bg-peri-dark text-white rounded-xl text-xs font-bold hover:bg-peri-mid transition shadow-sm"
                        >
                          Open &rarr;
                        </Link>
                        <button 
                          onClick={() => removeRecentRoom(room.roomId)}
                          className="p-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition shadow-sm"
                          title="Remove from history"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))
                )}
                </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}