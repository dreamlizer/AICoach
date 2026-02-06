import React, { useState } from "react";
import { X, Lock, Eye, EyeOff } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    if (newPassword.length < 6) {
        setError("新密码至少需要6位");
        return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "修改失败");
      }

      alert("密码修改成功");
      onClose();
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#060E9F]/10 text-[#060E9F]">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">修改密码</h2>
            <p className="mt-1 text-sm text-gray-500">为了安全，建议定期更换密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">当前密码</label>
              <input
                type={showPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-[#060E9F] focus:ring-1 focus:ring-[#060E9F]"
                placeholder="输入当前使用的密码"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">新密码</label>
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-[#060E9F] focus:ring-1 focus:ring-[#060E9F]"
                placeholder="设置新密码（至少6位）"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">确认新密码</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-[#060E9F] focus:ring-1 focus:ring-[#060E9F]"
                placeholder="再次输入新密码"
                required
              />
            </div>

            <div className="flex items-center justify-between py-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPassword ? "隐藏密码" : "显示密码"}
                </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-[#060E9F] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#060E9F]/90 disabled:opacity-50"
            >
              {loading ? "提交中..." : "确认修改"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
