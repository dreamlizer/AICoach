"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "zh" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  zh: {
    settings: "设置",
    appearance: "界面配色",
    typography: "正文字号",
    light: "浅色",
    dark: "深色",
    auto: "自动",
    standard: "标准",
    medium: "舒适",
    large: "特大",
    newChat: "发起新对话",
    recentChats: "近期对话",
    loading: "加载中...",
    enterQuestion: "输入你的问题...",
    image: "图片",
    document: "文档",
    selectModel: "选择模型",
    language: "语言设置",
    partnerPersona: "伙伴风格",
    rational: "理性参谋",
    rationalDesc: "冷静、客观、逻辑优先。适合决策分析与战略规划。",
    empathetic: "感性伙伴",
    empatheticDesc: "温暖、包容、情绪支持。适合复盘回顾与倾诉交流。",
    toolLibrary: "高管思维工具库",
    tool: "工具",
    safeSpace: "这里是你的安全思考空间",
    preview: "预览",
    code: "代码",
    canvasPreview: "画布预览",
    analyzing: "分析中",
    thinking: "思考中",
    replying: "回复中",
    done: "完成",
    pin: "固定",
    rename: "重命名",
    delete: "删除",
    // Search
    search: "搜索",
    searchPlaceholder: "搜索对话内容...",
    searching: "正在搜索...",
    noResults: "未找到相关结果",
    resultsFound: "条与“{query}”相符的搜索结果",
    // Auth
    login: "登录",
    register: "注册",
    forgotPassword: "找回密码",
    back: "返回",
    welcomeBack: "欢迎回来",
    createAccount: "创建新账户",
    resetPassword: "重置密码",
    loginDesc: "登录 AICoach，继续您的高管思维训练之旅",
    registerDesc: "加入 AICoach，解锁全套高管思维工具与个性化教练服务",
    resetDesc: "请通过邮箱验证来设置您的新密码",
    emailLabel: "电子邮箱",
    passwordLabel: "账户密码",
    newPasswordLabel: "新密码",
    confirmPasswordLabel: "确认新密码",
    verifyCodeLabel: "安全验证码",
    getCode: "获取验证码",
    usernameLabel: "用户昵称",
    usernamePlaceholder: "请输入您的称呼（支持中英文）",
    processing: "正在处理...",
    loginButton: "立即登录",
    registerButton: "立即注册",
    resetButton: "确认重置",
    noAccount: "还没有账户？",
    registerLink: "立即注册",
    hasAccount: "已有账户？",
    loginLink: "立即登录",
    useCodeLogin: "验证码快捷登录",
    usePasswordLogin: "账号密码登录",
    passwordLengthError: "密码长度需至少 6 位",
    passwordComplexityError: "密码需包含大写字母、小写字母、数字或符号中的至少两种",
    passwordMismatch: "两次输入的密码不一致",
    fillAllFields: "请完整填写所有必填项",
    enterEmailPassword: "请输入邮箱和密码",
    enterEmailCode: "请输入邮箱和验证码",
    enterEmail: "请输入有效的邮箱地址",
    resetSuccess: "密码重置成功，请使用新密码登录",
    avatarSizeError: "图片大小不能超过 2MB",
    // User Menu
    changeAvatar: "更改头像",
    changeUsername: "更改用户名",
    logout: "退出登录",
    notSetNickname: "未设置昵称",
    guest: "访客"
  },
  en: {
    settings: "Settings",
    appearance: "Appearance",
    typography: "Typography",
    light: "Light",
    dark: "Dark",
    auto: "Auto",
    standard: "Standard",
    medium: "Medium",
    large: "Large",
    newChat: "New Chat",
    recentChats: "Recent Chats",
    loading: "Loading...",
    enterQuestion: "Enter your question...",
    image: "Image",
    document: "Document",
    selectModel: "Select Model",
    language: "Language",
    partnerPersona: "Partner Persona",
    rational: "Rational",
    rationalDesc: "Calm, objective, logic-first. Best for decision analysis and strategic planning.",
    empathetic: "Empathetic",
    empatheticDesc: "Warm, inclusive, emotional support. Best for reflection and conversation.",
    toolLibrary: "Executive Tools",
    tool: "Tool",
    safeSpace: "This is your safe thinking space",
    preview: "Preview",
    code: "Code",
    canvasPreview: "Canvas Preview",
    analyzing: "Analyzing",
    thinking: "Thinking",
    replying: "Replying",
    done: "Done",
    pin: "Pin",
    rename: "Rename",
    delete: "Delete",
    // Search
    search: "Search",
    searchPlaceholder: "Search conversation content...",
    searching: "Searching...",
    noResults: "No results found",
    resultsFound: "results found for \"{query}\"",
    // Auth
    login: "Login",
    register: "Sign Up",
    forgotPassword: "Forgot Password?",
    back: "Back",
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    resetPassword: "Reset Password",
    loginDesc: "Log in to continue your executive coaching journey.",
    registerDesc: "Join AICoach to unlock full executive tools and personalized coaching.",
    resetDesc: "Verify your email to securely reset your password.",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    newPasswordLabel: "New Password",
    confirmPasswordLabel: "Confirm New Password",
    verifyCodeLabel: "Verification Code",
    getCode: "Get Code",
    usernameLabel: "Display Name",
    usernamePlaceholder: "How should we call you?",
    processing: "Processing...",
    loginButton: "Sign In",
    registerButton: "Create Account",
    resetButton: "Reset Password",
    noAccount: "Don't have an account?",
    registerLink: "Sign up now",
    hasAccount: "Already have an account?",
    loginLink: "Sign in now",
    useCodeLogin: "Login with Code",
    usePasswordLogin: "Login with Password",
    passwordLengthError: "Password must be at least 6 characters",
    passwordComplexityError: "Password must contain at least 2 types: uppercase, lowercase, numbers, or symbols",
    passwordMismatch: "Passwords do not match",
    fillAllFields: "All fields are required",
    enterEmailPassword: "Please enter email and password",
    enterEmailCode: "Please enter email and verification code",
    enterEmail: "Please enter a valid email address",
    resetSuccess: "Password reset successful, please login",
    avatarSizeError: "Image size cannot exceed 2MB",
    // User Menu
    changeAvatar: "Change Avatar",
    changeUsername: "Change Username",
    logout: "Logout",
    notSetNickname: "Nickname not set",
    guest: "Guest"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("zh");

  // Load from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem("app-language") as Language;
    if (saved && (saved === "zh" || saved === "en")) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("app-language", lang);
  };

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['zh']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
