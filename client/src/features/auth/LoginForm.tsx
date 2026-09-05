import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      login(response as any);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-kaizen-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card title="Welcome Back" subtitle="Login to your Kaizen account">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-kaizen-muted">
              Don't have an account? <Link to="/register" className="text-emerald-500 hover:underline">Register</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
