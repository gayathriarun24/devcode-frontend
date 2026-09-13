import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';

export default function EditorRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getUsername = useCallback(() => {
    if (user?.username) return user.username;
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser?.username) return storedUser.username;
    } catch (e) {}
    return 'Developer';
  }, [user]);

  const username = getUsername();

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const remoteDecorationsRef = useRef({});

  const [code, setCode] = useState('// Start typing your collaborative code here...');
  const [language, setLanguage] = useState('javascript');
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [roomHost, setRoomHost] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

  // Output console, preview & whiteboard state
  const [output, setOutput] = useState('// Output console ready...');
  const [outputTab, setOutputTab] = useState('console');

  // Whiteboard drawing tools state
  const canvasRef = useRef(null);
  const savedCanvasDataRef = useRef(null);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('pen');

  // Copy Link state
  const [copied, setCopied] = useState(false);

  const updateRecentRoomStorage = useCallback((id, lang) => {
    const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
    const filtered = savedRooms.filter((r) => r.roomId !== id);
    localStorage.setItem('recentRooms', JSON.stringify([{ roomId: id, language: lang }, ...filtered]));
  }, []);

  const drawLine = useCallback((ctx, x0, y0, x1, y1, color, size, isEraser) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }

    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }, []);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io('https://devcode-backend.onrender.com');
    }
    const socket = socketRef.current;

    const fetchSavedRoom = async () => {
      try {
        const res = await axios.get(`https://devcode-backend.onrender.com/api/rooms/${roomId}`);
        if (res.data) {
          if (res.data.codeContent) {
            setCode(res.data.codeContent);
            if (editorRef.current) {
              editorRef.current.setValue(res.data.codeContent);
            }
          }
          if (res.data.language) {
            setLanguage(res.data.language);
            updateRecentRoomStorage(roomId, res.data.language);
          }
          if (res.data.hostUsername || res.data.host || res.data.createdBy) {
            setRoomHost(res.data.hostUsername || res.data.host || res.data.createdBy);
          }
        }
      } catch (err) {
        console.error('Could not load saved room data from database', err);
      }
    };

    fetchSavedRoom();
    socket.emit('join-room', { roomId, username });

    const handleLoadMessages = (history) => setMessages(history);

    const handleUpdateCode = (newCode) => {
      if (editorRef.current && editorRef.current.getValue() !== newCode) {
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(newCode);
        setCode(newCode);
        if (position) {
          editorRef.current.setPosition(position);
        }
      }
    };

    const handleUpdateLanguage = (newLang) => {
      setLanguage(newLang);
      updateRecentRoomStorage(roomId, newLang);
    };

    const handleRoomUsers = (activeUsers) => {
      const normalizedUsers = activeUsers.map((u) =>
        typeof u === 'object' && u !== null ? u.username || u.name || String(u) : u
      );
      setUsers(normalizedUsers);
    };

    const handleReceiveMessage = (data) => setMessages((prev) => [...prev, data]);

    const handleDrawStroke = ({ x0, y0, x1, y1, color, size, isEraser }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      drawLine(ctx, x0, y0, x1, y1, color, size, isEraser);
    };

    const handleClearWhiteboard = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      savedCanvasDataRef.current = null;
    };

    const handleUpdateCursor = ({ socketId, position, username: remoteUser }) => {
      if (!editorRef.current || !monacoRef.current) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1);
      const decoration = {
        range,
        options: { className: 'remote-cursor-line', hoverMessage: { value: `User: ${remoteUser}` } }
      };
      const prevDecorations = remoteDecorationsRef.current[socketId] || [];
      remoteDecorationsRef.current[socketId] = editor.deltaDecorations(prevDecorations, [decoration]);
    };

    const handleUserDisconnected = (socketId) => {
      if (editorRef.current && remoteDecorationsRef.current[socketId]) {
        editorRef.current.deltaDecorations(remoteDecorationsRef.current[socketId], []);
        delete remoteDecorationsRef.current[socketId];
      }
    };

    const handleSessionEnded = () => {
      const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
      const filtered = savedRooms.filter((r) => r.roomId !== roomId);
      localStorage.setItem('recentRooms', JSON.stringify(filtered));
      setSessionEnded(true);
    };

    socket.on('load-messages', handleLoadMessages);
    socket.on('update-code', handleUpdateCode);
    socket.on('update-language', handleUpdateLanguage);
    socket.on('room-users', handleRoomUsers);
    socket.on('receive-message', handleReceiveMessage);
    socket.on('draw-stroke', handleDrawStroke);
    socket.on('clear-whiteboard', handleClearWhiteboard);
    socket.on('update-cursor', handleUpdateCursor);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('session-ended', handleSessionEnded);

    return () => {
      socket.emit('leave-room', { roomId, username });
      socket.off('load-messages', handleLoadMessages);
      socket.off('update-code', handleUpdateCode);
      socket.off('update-language', handleUpdateLanguage);
      socket.off('room-users', handleRoomUsers);
      socket.off('receive-message', handleReceiveMessage);
      socket.off('draw-stroke', handleDrawStroke);
      socket.off('clear-whiteboard', handleClearWhiteboard);
      socket.off('update-cursor', handleUpdateCursor);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('session-ended', handleSessionEnded);
    };
  }, [roomId, username, updateRecentRoomStorage, drawLine]);

  // Preserve canvas drawing data across resizing / tab switching
  useEffect(() => {
    if (outputTab === 'whiteboard' && canvasRef.current) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      const prevDataUrl = savedCanvasDataRef.current;

      const newWidth = parent.clientWidth;
      const newHeight = parent.clientHeight - 50;

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        if (canvas.width > 0 && canvas.height > 0) {
          savedCanvasDataRef.current = canvas.toDataURL();
        }
        canvas.width = newWidth;
        canvas.height = newHeight;

        if (savedCanvasDataRef.current || prevDataUrl) {
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.src = savedCanvasDataRef.current || prevDataUrl;
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
        }
      }
    }
  }, [outputTab]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition((e) => {
      socketRef.current?.emit('cursor-move', {
        roomId,
        position: { lineNumber: e.position.lineNumber, column: e.position.column },
        username
      });
    });
  };

  const handleCodeChange = (value) => {
    const updatedCode = value || '';
    setCode(updatedCode);
    socketRef.current?.emit('code-change', { roomId, code: updatedCode });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    updateRecentRoomStorage(roomId, newLang);
    socketRef.current?.emit('language-change', { roomId, language: newLang });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    socketRef.current?.emit('send-message', { roomId, message: inputMessage, username });
    setInputMessage('');
  };

  // Helper to extract client coordinates from mouse or touch event
  const getEventCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const { x, y } = getEventCoordinates(e);
    lastPosRef.current = { x, y };
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getEventCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isEraser = tool === 'eraser';
    drawLine(ctx, lastPosRef.current.x, lastPosRef.current.y, x, y, brushColor, brushSize, isEraser);

    socketRef.current?.emit('draw-stroke', {
      roomId,
      x0: lastPosRef.current.x,
      y0: lastPosRef.current.y,
      x1: x,
      y1: y,
      color: brushColor,
      size: brushSize,
      isEraser
    });

    lastPosRef.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      savedCanvasDataRef.current = canvasRef.current.toDataURL();
    }
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    savedCanvasDataRef.current = null;
    socketRef.current?.emit('clear-whiteboard', { roomId });
  };

  const runCode = async () => {
    if (language === 'html' || language === 'css') {
      setOutputTab('preview');
    } else {
      setOutputTab('console');
      setOutput('Running code...');
      try {
        if (language === 'javascript') {
          let logs = [];
          const originalLog = console.log;
          console.log = (...args) =>
            logs.push(args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
          new Function(code)();
          console.log = originalLog;
          setOutput(logs.length > 0 ? logs.join('\n') : 'Code executed successfully (no console output).');
        } else if (language === 'python') {
          const response = await axios.post('https://devcode-backend.onrender.com/api/execute', {
            language: 'python',
            code
          });
          setOutput(response.data.output || 'Program executed successfully (no output).');
        }
      } catch (err) {
        setOutput(`Error: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      await axios.put(`https://devcode-backend.onrender.com/api/rooms/save/${roomId}`, { codeContent: code, language });
      alert('Code saved successfully!');
    } catch (err) {
      alert('Failed to save code');
    } finally {
      setSaving(false);
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndSession = async () => {
    try {
      socketRef.current?.emit('end-session', { roomId });
      await axios.delete(`https://devcode-backend.onrender.com/api/rooms/${roomId}`);

      const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
      const filtered = savedRooms.filter((r) => r.roomId !== roomId);
      localStorage.setItem('recentRooms', JSON.stringify(filtered));

      navigate('/dashboard', { state: { refresh: true } });
    } catch (err) {
      console.error('Failed to end and delete session:', err);
    }
  };

  const effectiveHost = roomHost || (users.length > 0 ? users[0] : null);

  return (
    <div className="flex h-screen w-screen flex-col bg-cream text-gray-800 overflow-hidden relative">
      {sessionEnded && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-peri-mid">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-black">
              🛑
            </div>
            <h2 className="text-xl font-black text-peri-dark mb-2">Session Has Been Ended</h2>
            <p className="text-sm text-gray-600 mb-6">This collaborative session has been terminated by a participant.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-peri-dark text-white rounded-xl font-bold hover:bg-peri-mid transition shadow-sm"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      <header className="flex flex-col lg:flex-row items-center justify-between px-4 py-3 bg-peri-light border-b border-peri-mid shadow-sm z-10 gap-3">
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 bg-peri-dark text-white rounded-lg text-xs font-semibold hover:bg-peri-mid transition"
            >
              &larr; Dashboard
            </button>
            <span className="font-bold text-peri-dark text-sm truncate max-w-[120px] sm:max-w-xs">Room: {roomId}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-xs">
            <span className="text-xs font-semibold text-gray-600">Online:</span>
            {users.map((u, index) => {
              const isHost = u === effectiveHost;
              return (
                <span
                  key={index}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 shadow-sm whitespace-nowrap ${
                    isHost ? 'bg-peri-dark text-white' : 'bg-peri-light text-peri-dark border border-peri-mid'
                  }`}
                >
                  <span>{u}</span>
                  {isHost && <span className="bg-white/20 text-white px-1 rounded text-[8px] uppercase font-extrabold">Host</span>}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center flex-wrap justify-end gap-2 w-full lg:w-auto">
          <button
            onClick={copyRoomLink}
            className="px-3 py-1.5 bg-white border border-peri-mid text-peri-dark rounded-lg text-xs font-semibold hover:bg-peri-light transition shadow-sm"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          <select
            value={language}
            onChange={handleLanguageChange}
            className="px-3 py-1.5 bg-white border border-peri-mid rounded-lg text-xs sm:text-sm font-medium focus:outline-none text-gray-800"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
          </select>

          <button
            onClick={runCode}
            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            Run
          </button>

          <button
            onClick={saveChanges}
            disabled={saving}
            className="px-3.5 py-1.5 bg-peri-dark hover:bg-peri-mid text-white rounded-lg text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className="px-3 py-1.5 bg-white border border-peri-mid text-peri-dark rounded-lg text-xs font-semibold hover:bg-peri-light transition"
          >
            {showChat ? 'Hide Chat' : 'Chat'}
          </button>

          {username === effectiveHost && (
            <button
              onClick={handleEndSession}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              End Session
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-col flex-1 p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden">
          <div className="w-full h-1/2 sm:h-3/5 rounded-xl overflow-hidden border border-peri-mid shadow-inner transition-all duration-300">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onMount={handleEditorMount}
              onChange={handleCodeChange}
              options={{
                fontSize: 13,
                fontFamily: 'monospace',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                minimap: { enabled: window.innerWidth > 768 }
              }}
            />
          </div>

          <div className="h-1/2 sm:h-2/5 bg-gray-900 text-green-400 font-mono rounded-xl border border-peri-mid flex flex-col shadow-inner overflow-hidden">
            <div className="flex flex-wrap justify-between items-center px-3 sm:px-4 py-2 bg-gray-800 border-b border-gray-700 gap-2">
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={() => setOutputTab('console')}
                  className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider pb-0.5 border-b-2 transition ${
                    outputTab === 'console' ? 'text-white border-green-400' : 'text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  Console
                </button>
                <button
                  onClick={() => setOutputTab('preview')}
                  className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider pb-0.5 border-b-2 transition ${
                    outputTab === 'preview' ? 'text-white border-green-400' : 'text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setOutputTab('whiteboard')}
                  className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider pb-0.5 border-b-2 transition ${
                    outputTab === 'whiteboard' ? 'text-white border-green-400' : 'text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  Whiteboard
                </button>
              </div>

              {outputTab === 'whiteboard' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTool('pen')}
                      className={`px-2 py-0.5 rounded text-[11px] ${tool === 'pen' ? 'bg-peri-dark text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      Pen
                    </button>
                    <button
                      onClick={() => setTool('eraser')}
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        tool === 'eraser' ? 'bg-peri-dark text-white' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      Eraser
                    </button>
                  </div>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <select
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="bg-gray-700 text-white text-[11px] px-1 py-0.5 rounded"
                  >
                    <option value={2}>Small</option>
                    <option value={5}>Med</option>
                    <option value={10}>Large</option>
                  </select>
                  <button onClick={clearBoard} className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px]">
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden relative bg-white">
              {outputTab === 'console' && (
                <pre className="w-full h-full bg-gray-900 text-green-400 p-3 sm:p-4 overflow-y-auto text-xs sm:text-sm whitespace-pre-wrap">
                  {output}
                </pre>
              )}
              {outputTab === 'preview' && (
                <iframe
                  title="HTML Preview"
                  srcDoc={
                    language === 'html'
                      ? code
                      : `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>CSS Preview Window</h1><p>Type your CSS styles above to see elements style live!</p><div class="sample-box">Sample Element</div></body></html>`
                  }
                  className="w-full h-full border-none bg-white"
                />
              )}
              {outputTab === 'whiteboard' && (
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair bg-white block touch-none"
                />
              )}
            </div>
          </div>
        </div>

        {showChat && (
          <div className="absolute right-0 top-0 bottom-0 w-72 sm:w-80 bg-peri-light border-l border-peri-mid flex flex-col shadow-2xl z-20">
            <div className="p-3 bg-white border-b border-peri-mid font-bold text-peri-dark text-sm flex justify-between items-center">
              <span>Room Chat</span>
              <button onClick={() => setShowChat(false)} className="text-base text-gray-500 hover:text-gray-800 px-2">
                &times;
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2">
              {messages.length === 0 ? (
                <p className="text-xs text-gray-500 text-center mt-4">No messages yet. Say hello!</p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-lg text-xs max-w-[85%] ${
                      msg.username === username
                        ? 'bg-peri-dark text-white self-end'
                        : 'bg-white text-gray-800 border border-peri-mid self-start'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2 mb-1 opacity-75 text-[10px]">
                      <span className="font-bold">{msg.username}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="break-words">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-peri-mid flex gap-2">
              <input
                type="text"
                placeholder="Type message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 p-2 bg-cream rounded-lg border border-peri-mid text-xs focus:outline-none focus:ring-1 focus:ring-peri-dark text-gray-800"
              />
              <button type="submit" className="px-3 py-2 bg-peri-dark text-white rounded-lg text-xs font-semibold hover:bg-peri-mid transition">
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}