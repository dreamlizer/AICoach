"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/auth-context";
import { X, Mail, Lock, User, KeyRound } from "lucide-react";
import { useLanguage } from "@/context/language-context";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "register" | "forgot-password";
type LoginMethod = "password" | "code";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register, loginWithPassword, resetPassword } = useAuth();
  const { t } = useLanguage();
  
  // Mode state
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setMode("login");
      setLoginMethod("password");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setCode("");
      setName("");
      setError("");
      setPasswordError("");
      setConfirmPasswordError("");
      setCountdown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setError("");
    setPasswordError("");
    setConfirmPasswordError("");
  }, [mode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) return t('passwordLengthError');
    
    let types = 0;
    if (/[a-z]/.test(pwd)) types++;
    if (/[A-Z]/.test(pwd)) types++;
    if (/[0-9]/.test(pwd)) types++;
    if (/[^a-zA-Z0-9]/.test(pwd)) types++;
    
    if (types < 2) return t('passwordComplexityError');
    return null;
  };

  const handlePasswordBlur = () => {
    if (mode === "register" || mode === "forgot-password") {
      const err = validatePassword(password);
      setPasswordError(err || "");
      
      // Also re-check consistency if confirm password is populated
      if (confirmPassword) {
        if (password !== confirmPassword) {
          setConfirmPasswordError(t('passwordMismatch'));
        } else {
          setConfirmPasswordError("");
        }
      }
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (mode === "register" || mode === "forgot-password") {
       if (password !== confirmPassword) {
         setConfirmPasswordError(t('passwordMismatch'));
       } else {
         setConfirmPasswordError("");
       }
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t('enterEmail'));
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // If we are in forgot-password mode, use 'reset' type, otherwise use mode (login/register)
      const requestType = mode === "forgot-password" ? "reset" : mode;
      
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: requestType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCountdown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        if (loginMethod === "password") {
           if (!email || !password) throw new Error(t('enterEmailPassword'));
           await loginWithPassword(email, password);
        } else {
           if (!email || !code) throw new Error(t('enterEmailCode'));
           await login(email, code); 
        }
      } else if (mode === "register") {
        if (!email || !code || !password || !confirmPassword || !name) throw new Error(t('fillAllFields'));
        
        if (password !== confirmPassword) throw new Error(t('passwordMismatch'));
        
        const pwdError = validatePassword(password);
        if (pwdError) throw new Error(pwdError);
        
        await register(email, code, password, name);
      } else if (mode === "forgot-password") {
        if (!email || !code || !password || !confirmPassword) throw new Error(t('fillAllFields'));
        
        if (password !== confirmPassword) throw new Error(t('passwordMismatch'));

        const pwdError = validatePassword(password);
        if (pwdError) throw new Error(pwdError);

        await resetPassword(email, code, password);
        // After reset, switch to login
        setMode("login");
        setLoginMethod("password");
        setPassword("");
        setConfirmPassword("");
        setCode("");
        // Optional: Show success message? 
        alert(t('resetSuccess')); // Simple alert for now
        return; // Don't close modal immediately, let user login
      }
      
      if (mode !== "forgot-password") {
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header / Tabs */}
        {mode !== "forgot-password" ? (
          <div className="flex border-b border-gray-100">
            <button
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                mode === "login"
                  ? "text-[#060E9F] border-b-2 border-[#060E9F]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setMode("login")}
            >
              {t('login')}
            </button>
            <button
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                mode === "register"
                  ? "text-[#060E9F] border-b-2 border-[#060E9F]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setMode("register")}
            >
              {t('register')}
            </button>
          </div>
        ) : (
          <div className="py-3 border-b border-gray-100 text-center relative">
            <button 
               onClick={() => setMode("login")}
               className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-800"
            >
              &larr; {t('back')}
            </button>
            <span className="font-bold text-gray-900">{t('forgotPassword')}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === "login" ? t('welcomeBack') : mode === "register" ? t('createAccount') : t('resetPassword')}
            </h2>
            <p className="text-gray-500 mt-1">
              {mode === "login" 
                ? t('loginDesc')
                : mode === "register" ? t('registerDesc') : t('resetDesc')}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Email Field - Always visible */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Login Method Toggle (Only in Login mode) */}
            {mode === "login" && (
              <div className="flex justify-end items-center gap-4">
                 <button
                   type="button"
                   onClick={() => setMode("forgot-password")}
                   className="text-sm text-gray-500 hover:text-gray-800"
                 >
                   {t('forgotPassword')}?
                 </button>
                 <button
                   type="button"
                   onClick={() => setLoginMethod(loginMethod === "password" ? "code" : "password")}
                   className="text-sm text-[#060E9F] hover:underline"
                 >
                   {loginMethod === "password" ? t('useCodeLogin') : t('usePasswordLogin')}
                 </button>
              </div>
            )}

            {/* Password Field */}
            {(mode === "register" || mode === "forgot-password" || (mode === "login" && loginMethod === "password")) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {mode === "login" ? t('passwordLabel') : t('newPasswordLabel')}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    onBlur={handlePasswordBlur}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                      passwordError ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                    placeholder={t('passwordLabel')}
                  />
                </div>
                {(mode === "register" || mode === "forgot-password") && (
                   <p className={`text-xs mt-1 ${passwordError ? "text-red-500" : "text-gray-400"}`}>
                     {passwordError || t('passwordComplexityError')}
                   </p>
                )}
              </div>
            )}

            {/* Confirm Password Field (Register or Forgot Password) */}
            {(mode === "register" || mode === "forgot-password") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError("");
                    }}
                    onBlur={handleConfirmPasswordBlur}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                      confirmPasswordError ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                    placeholder={t('confirmPasswordLabel')}
                  />
                </div>
                {confirmPasswordError && (
                  <p className="text-xs text-red-500 mt-1">{confirmPasswordError}</p>
                )}
              </div>
            )}

            {/* Verification Code Field (Register OR Login with Code OR Forgot Password) */}
            {(mode === "register" || mode === "forgot-password" || (mode === "login" && loginMethod === "code")) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('verifyCodeLabel')}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all tracking-widest"
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading || countdown > 0}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                  >
                    {countdown > 0 ? `${countdown}s` : t('getCode')}
                  </button>
                </div>
              </div>
            )}

            {/* Name Field (Only in Register mode) */}
            {mode === "register" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('usernameLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder={t('usernamePlaceholder')}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#060E9F] text-white rounded-xl font-medium hover:bg-[#060E9F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading 
                ? t('processing')
                : mode === "login" ? t('loginButton') : mode === "register" ? t('registerButton') : t('resetButton')}
            </button>

          </form>
          
          {/* Footer Switch */}
          {mode !== "forgot-password" && (
            <div className="mt-4 text-center text-sm text-gray-500">
              {mode === "login" ? (
                <p>
                  {t('noAccount')}{" "}
                  <button 
                    onClick={() => setMode("register")}
                    className="text-[#060E9F] hover:underline font-medium"
                  >
                    {t('registerLink')}
                  </button>
                </p>
              ) : (
                <p>
                  {t('hasAccount')}{" "}
                  <button 
                    onClick={() => setMode("login")}
                    className="text-[#060E9F] hover:underline font-medium"
                  >
                    {t('loginLink')}
                  </button>
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
