import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "sonner";
import {
  faLock,
  faEye,
  faEyeSlash,
  faEnvelope,
  faShieldAlt,
  faArrowLeft,
  faClock,
  faKey,
} from "@fortawesome/free-solid-svg-icons";

function ForgotPassword() {
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  const navigate = useNavigate();
  const otpRefs = useRef([]);

  // Timer for resend OTP
  useEffect(() => {
    if (currentStep === 2 && resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResendOtp(true);
    }
  }, [currentStep, resendTimer]);

  // Step 1: Send reset code to email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.includes("@gmail.com")) {
      toast.error("Please enter a valid Gmail address.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "password_reset" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || data.error || "Failed to send reset code. Please try again.");
        return;
      }

      setCurrentStep(2);
      setResendTimer(60);
      setCanResendOtp(false);
      toast.success("Reset code sent to your email");
    } catch (error) {
      console.error("Error sending reset code:", error);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      toast.error("Please enter the complete 6-digit code.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, purpose: "password_reset" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || data.message || "Invalid code. Please try again.");
        return;
      }

      setCurrentStep(3);
      toast.success("Code verified successfully");
    } catch (error) {
      console.error("Error verifying code:", error);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "password_reset" }),
      });

      if (response.ok) {
        setOtp(["", "", "", "", "", ""]);
        setResendTimer(60);
        setCanResendOtp(false);
        otpRefs.current[0]?.focus();
        toast.success("New reset code sent");
      } else {
        toast.error("Failed to resend code. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp.join(""), newPassword }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || data.message || "Failed to reset password. Please try again.");
        return;
      }

      toast.success("Password reset successful! Please log in.");
      navigate("/login");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to previous step
  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
                Gmail Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faEnvelope} className="text-muted-foreground text-sm" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-financial w-full pl-10 pr-4 py-3 text-sm font-medium"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="btn-primary-expense w-full cursor-pointer py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending Code...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faEnvelope} />
                  Send Reset Code
                </span>
              )}
            </button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-4">
                Enter the 6-digit code sent to {email}
              </label>
              <div className="flex gap-3 justify-center mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-12 text-center text-lg font-bold input-financial border-2 focus:border-primary"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            <div className="text-center space-y-3">
              {!canResendOtp ? (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faClock} className="text-xs" />
                  Resend code in {resendTimer}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200"
                >
                  Resend reset code
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.some(digit => !digit)}
              className="btn-primary-expense w-full cursor-pointer py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faShieldAlt} />
                  Verify Code
                </span>
              )}
            </button>
          </form>
        );

      case 3:
        return (
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-muted-foreground mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-muted-foreground text-sm" />
                </div>
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="input-financial w-full pl-10 pr-10 py-3 text-sm font-medium"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <FontAwesomeIcon
                    icon={showPassword ? faEyeSlash : faEye}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200"
                  />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-muted-foreground text-sm" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input-financial w-full pl-10 pr-10 py-3 text-sm font-medium"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  <FontAwesomeIcon
                    icon={showConfirmPassword ? faEyeSlash : faEye}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200"
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="btn-primary-expense w-full cursor-pointer py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Resetting Password...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faKey} />
                  Reset Password
                </span>
              )}
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  // Get step title and description
  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return {
          title: "Forgot Password",
          description: "Enter your email to receive a reset code"
        };
      case 2:
        return {
          title: "Verify Code",
          description: "Enter the code sent to your email"
        };
      case 3:
        return {
          title: "New Password",
          description: "Choose a new password for your account"
        };
      default:
        return { title: "", description: "" };
    }
  };

  const { title, description } = getStepInfo();

  return (
    <div className="min-h-screen page-shell flex items-center justify-center px-4 py-12">
      <div className="page-shell-content w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <FontAwesomeIcon icon={faKey} className="text-primary-foreground text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {/* Forgot Password Form */}
        <div className="expense-form p-8">
        {/* Back Button */}
        {currentStep > 1 && (
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 mb-6"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            Back
          </button>
        )}

        {/* Step Content */}
        {renderStepContent()}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <button
              onClick={() => navigate("/login")}
              type="button"
              className="text-primary hover:text-primary/80 font-medium transition-colors duration-200"
            >
              Sign in
            </button>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
