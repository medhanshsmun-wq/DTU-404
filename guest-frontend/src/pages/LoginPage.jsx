import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, DoorOpen, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../App';
import { API_BASE_URL } from '../config';

function LoginPage() {
  const [room, setRoom] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!room.trim() || !lastName.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/guest/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: room.trim(), lastName: lastName.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        login(data.token, data.guest);
        navigate('/', { replace: true });
      } else {
        setError(data.error || 'Login failed. Please check your room and name.');
      }
    } catch (err) {
      setError('Unable to connect to hotel services. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-10"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#a88b2a] flex items-center justify-center shadow-lg shadow-[#d4af37]/20">
          <Shield className="w-8 h-8 text-black" />
        </div>
        <h1 className="font-display text-3xl font-bold text-[#f5f0e8] tracking-tight">
          Taj Hotel
        </h1>
        <p className="text-sm text-[#666] mt-1">Guest Portal</p>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="login-card"
      >
        <h2 className="text-lg font-semibold text-[#f5f0e8] mb-1">Welcome</h2>
        <p className="text-xs text-[#666] mb-6">Enter your room details to access guest services</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#888] block mb-1.5">Room Number</label>
            <div className="relative">
              <DoorOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. 100"
                className="input pl-10"
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#888] block mb-1.5">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Guest"
              className="input"
              disabled={isLoading}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-xs text-red-400"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <button type="submit" disabled={!room.trim() || !lastName.trim() || isLoading} className="btn-primary mt-2">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#222]">
          <p className="text-[10px] text-[#555] text-center">
            Demo: Room <span className="text-[#d4af37]">100</span>, Last Name <span className="text-[#d4af37]">Guest</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPage;
