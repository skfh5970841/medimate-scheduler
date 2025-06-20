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
      localStorage.setItem('username', username); // 여기!
      onLogin();
    }

    else if (users.length === 0 && username === '' && password === '') {
      setError('등록된 사용자가 없습니다. 회원가입을 진행해주세요.');
    }
     else if (users.length === 0 && (username !== '' || password !== '')) {
       // First user login scenario (treat as valid if no users exist)
       localStorage.setItem('username', username);
      onLogin();
    } else {
      setError('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    const users = await readUsers();
    if (users.some((u) => u.username === username)) {
      setError('이미 존재하는 아이디입니다.');
      return;
    }

    try {
        await registerUser(username, password);
        setIsRegistering(false); // Switch back to login
        alert('회원가입이 완료되었습니다. 로그인해주세요.');

    } catch (err: any) {
        console.error('Registration failed:', err);
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
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
    // Adjust width for mobile and center
    <Card className="w-full max-w-md sm:w-96 mx-auto">
      <CardHeader className="text-center">
        <CardTitle>{isRegistering ? '회원가입' : '로그인'}</CardTitle>
        <CardDescription>
          {isRegistering
            ? '계정을 생성하여 스케줄을 관리하세요'
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={isRegistering ? handleRegistration : handleLogin} className="space-y-4">
          {error && <div className="text-red-500 text-center sm:text-left">{error}</div>}
          <div>
            {/* Use block display for labels on mobile */}
            <label htmlFor="username" className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1">
              아이디
            </label>
            <Input
              id="username"
              type="text"
              placeholder="아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full" // Ensure input takes full width
            />
          </div>
          <div>
             <label htmlFor="password" className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
               className="w-full"
            />
          </div>
          {isRegistering && (
            <div>
               <label htmlFor="confirmPassword" className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1">
                비밀번호 확인
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                 className="w-full"
              />
            </div>
          )}
          {/* Center buttons on mobile */}
          <div className="flex flex-col sm:flex-row sm:justify-start space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
            <Button type="submit" className="w-full sm:w-auto">{isRegistering ? '회원가입' : '로그인'}</Button>
             <Button type="button" variant="link" onClick={toggleForm} className="w-full sm:w-auto text-center">
                {isRegistering ? '계정이 이미 있으신가요? 로그인' : "계정이 없으신가요? 회원가입"}
             </Button>
          </div>
        </form>

      </CardContent>
    </Card>
  );
};

