import axios from 'axios';
const API = axios.create({ baseURL: 'https://devcode-backend.onrender.com/api' });

export const registerUser = (userData) => API.post('/auth/register', userData);
export const loginUser = (userData) => API.post('/auth/login', userData);
export const joinRoom = (roomData) => API.post('/rooms/join', roomData);