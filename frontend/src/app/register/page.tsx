"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import api from '@/lib/axios';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/register', {
        employeeId: formData.employeeId,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password
      });

      setSuccess(res.data.message);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="flex justify-center items-center text-white space-x-3 mb-8">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-center text-3xl font-extrabold tracking-tight">Register</h2>
        </div>

        <div className="bg-white/5 backdrop-blur-xl py-8 px-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] sm:rounded-3xl sm:px-10 border border-white/10">
          <form className="space-y-4" onSubmit={handleRegister}>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-emerald-400 text-sm text-center">
                {success}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-neutral-300">Employee ID</label>
              <input name="employeeId" type="text" required value={formData.employeeId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-neutral-700 rounded-xl shadow-sm bg-neutral-900/50 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300">Full Name</label>
              <input name="name" type="text" required value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-neutral-700 rounded-xl shadow-sm bg-neutral-900/50 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300">Email Address</label>
              <input name="email" type="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-neutral-700 rounded-xl shadow-sm bg-neutral-900/50 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300">Mobile Number</label>
              <input name="mobile" type="text" value={formData.mobile} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-neutral-700 rounded-xl shadow-sm bg-neutral-900/50 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300">Password</label>
              <input name="password" type="password" required value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-neutral-700 rounded-xl shadow-sm bg-neutral-900/50 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300">Confirm Password</label>
              <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-neutral-700 rounded-xl shadow-sm bg-neutral-900/50 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
              >
                {isLoading ? 'Registering...' : 'Register Account'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
