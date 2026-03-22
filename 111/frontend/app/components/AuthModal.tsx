"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/auth-context";
import { X, Mail, Lock, User, KeyRound, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { apiClient } from "@/lib/api-client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  floatingHint?: string;
}

type AuthMode = "login" | "register" | "forgot-password";
type LoginMethod = "password" | "code";

export function AuthModal({ isOpen, onClose, floatingHint }: AuthModalProps) {
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
  
  // Register flow step: 1 (Email+Code) -> 2 (Name+Password)
  const [step, setStep] = useState(1);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
      setStep(1);
    }
  }, [isOpen]);

  useEffect(() => {
    setError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setStep(1);
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
      
      await apiClient.auth.sendCode(email, requestType);

      setCountdown(60);
      setToastMessage(t('codeSentCheckEmail') || "Verification code sent! Please check your email.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      setError(t('enterEmailCode') || "Please enter email and verification code");
      return;
    }
    setError("");
    setStep(2);
    // Ensure password fields are empty when entering step 2
    setPassword("");
    setConfirmPassword("");
    setName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // In register mode, if step 1, go to next step
    if (mode === "register" && step === 1) {
       handleNextStep(e);
       return;
    }

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
        setToastMessage(t('resetSuccess')); 
        return; // Don't close modal immediately, let user login
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Floating Hint */}
      {floatingHint && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-full shadow-lg text-sm font-medium transform transition-all animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2">
          <span>✨</span>
          {floatingHint}
        </div>
      )}

      <div className="w-full max-w-md bg-white dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-materialize transition-all">
            {toastMessage}
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-primary z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header / Tabs */}
        {mode !== "forgot-password" ? (
          <div className="flex border-b border-gray-100 dark:border-dark-border">
            <button
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                mode === "login"
                  ? "text-[#060E9F] dark:text-blue-400 border-b-2 border-[#060E9F] dark:border-blue-400"
                  : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary"
              }`}
              onClick={() => setMode("login")}
            >
              {t('login')}
            </button>
            <button
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                mode === "register"
                  ? "text-[#060E9F] dark:text-blue-400 border-b-2 border-[#060E9F] dark:border-blue-400"
                  : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary"
              }`}
              onClick={() => setMode("register")}
            >
              {t('register')}
            </button>
          </div>
        ) : (
          <div className="py-3 border-b border-gray-100 dark:border-dark-border text-center relative">
            <button 
               onClick={() => setMode("login")}
               className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-800 dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
            >
              &larr; {t('back')}
            </button>
            <span className="font-bold text-gray-900 dark:text-dark-text-primary">{t('forgotPassword')}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Welcome Text */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {mode === "login" ? t('welcomeBack') : mode === "register" ? t('createAccount') : t('resetPassword')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[80%] mx-auto leading-relaxed">
              {mode === "login" 
                ? t('loginDesc')
                : mode === "register" ? t('registerDesc') : t('resetDesc')}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Email Field - Always visible EXCEPT in Register Step 2 */}
            {(mode !== "register" || step === 1) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="email"
                  required={mode !== "register" || step === 1}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#2C2C2C] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            )}

            {/* Login Method Toggle (Only in Login mode) */}
            {mode === "login" && (
              <div className="flex justify-end items-center gap-4">
                 <button
                   type="button"
                   onClick={() => setMode("forgot-password")}
                   className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                 >
                   {t('forgotPassword')}?
                 </button>
                 <button
                   type="button"
                   onClick={() => setLoginMethod(loginMethod === "password" ? "code" : "password")}
                   className="text-sm text-[#060E9F] dark:text-blue-400 hover:underline"
                 >
                   {loginMethod === "password" ? t('useCodeLogin') : t('usePasswordLogin')}
                 </button>
              </div>
            )}

            {/* Password Field */}
            {((mode === "register" && step === 2) || mode === "forgot-password" || (mode === "login" && loginMethod === "password")) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {mode === "login" ? t('passwordLabel') : t('newPasswordLabel')}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    onBlur={handlePasswordBlur}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-[#2C2C2C] text-gray-900 dark:text-white ${
                      passwordError ? "border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30" : "border-gray-200 dark:border-[#333333]"
                    }`}
                    placeholder={t('passwordLabel')}
                    autoComplete="new-password"
                  />
                </div>
                {(mode === "register" || mode === "forgot-password") && (
                   <p className={`text-xs mt-1 ${passwordError ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
                     {passwordError || t('passwordComplexityError')}
                   </p>
                )}
              </div>
            )}

            {/* Confirm Password Field (Register Step 2 or Forgot Password) */}
            {((mode === "register" && step === 2) || mode === "forgot-password") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError("");
                    }}
                    onBlur={handleConfirmPasswordBlur}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-[#2C2C2C] text-gray-900 dark:text-white ${
                      confirmPasswordError ? "border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30" : "border-gray-200 dark:border-[#333333]"
                    }`}
                    placeholder={t('confirmPasswordLabel')}
                    autoComplete="new-password"
                  />
                </div>
                {confirmPasswordError && (
                  <p className="text-xs text-red-500 mt-1">{confirmPasswordError}</p>
                )}
              </div>
            )}

            {/* Verification Code Field (Register Step 1 OR Login with Code OR Forgot Password) */}
            {((mode === "register" && step === 1) || mode === "forgot-password" || (mode === "login" && loginMethod === "code")) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('verifyCodeLabel')}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#2C2C2C] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all tracking-widest text-gray-900 dark:text-white"
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading || countdown > 0}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-[#333333] text-gray-700 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                  >
                    {countdown > 0 ? `${countdown}s` : t('getCode')}
                  </button>
                </div>
              </div>
            )}

            {/* Name Field (Only in Register Step 2) */}
            {mode === "register" && step === 2 && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('usernameLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#2C2C2C] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                    placeholder={t('usernameLabel')}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#060E9F] dark:bg-blue-600 text-white py-3 rounded-xl hover:bg-[#060E9F]/90 dark:hover:bg-blue-700 transition-all font-medium text-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('processing')}</span>
                </>
              ) : (
                mode === "register" ? (step === 1 ? t('nextStep') : t('registerButton')) : mode === "login" ? t('loginButton') : t('resetButton')
              )}
            </button>

          </form>
          
          {/* Footer Switch */}
          {mode !== "forgot-password" && (
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {mode === "login" ? (
                <p>
                  {t('noAccount')}{" "}
                  <button 
                    onClick={() => setMode("register")}
                    className="text-[#060E9F] dark:text-blue-400 hover:underline font-medium"
                  >
                    {t('registerLink')}
                  </button>
                </p>
              ) : (
                <p>
                  {t('hasAccount')}{" "}
                  <button 
                    onClick={() => setMode("login")}
                    className="text-[#060E9F] dark:text-blue-400 hover:underline font-medium"
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
