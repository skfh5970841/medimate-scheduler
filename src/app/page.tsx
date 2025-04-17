'use client';

import {useEffect, useState} from 'react';
import {Toaster} from '@/components/ui/toaster';
import {Login} from '@/components/Login';
import {SchedulePage} from '@/components/SchedulePage';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Simulate authentication check (replace with actual auth logic)
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    // Simulate successful login (replace with actual auth logic)
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      {isAuthenticated ? (
        <SchedulePage onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <Toaster />
    </main>
  );
}
