'use client';

import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import { registerUser, readUsers } from '@/lib/user-actions'; // Import server actions


interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({onLogin}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear any previous errors

    const users = await readUsers();

    const user = users.find((u) => u.username === username && u.password === password);

    if (user) {
      onLogin();
    }
    
    else if (users.length === 0 && username === '' && password === '') {
      setError('Please register.');
    }
     else if (users.length === 0 && (username !== '' || password !== '')) {
      onLogin();
    } else {
      setError('Invalid credentials');
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const users = await readUsers();
    if (users.some((u) => u.username === username)) {
      setError('Username already exists.');
      return;
    }

    try {
        await registerUser(username, password);
        setIsRegistering(false); // Switch back to login
        alert('Registration successful. Please login.');

    } catch (err: any) {
        console.error('Registration failed:', err);
        setError('Registration failed. Please try again.');
    }

    
  };

  const toggleForm = () => {
    setIsRegistering(!isRegistering);
    setError(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>{isRegistering ? 'Register' : 'Login'}</CardTitle>
        <CardDescription>
          {isRegistering
            ? 'Create an account to manage your schedule.'
            : 'Enter username and password to access your schedule.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={isRegistering ? handleRegistration : handleLogin} className="space-y-4">
          {error && <div className="text-red-500">{error}</div>}
          <div>
            <label htmlFor="username" className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Username
            </label>
            <Input
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {isRegistering && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit">{isRegistering ? 'Register' : 'Sign In'}</Button>
        </form>
        <Button type="button" variant="link" onClick={toggleForm}>
          {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
        </Button>
      </CardContent>
    </Card>
  );
};

