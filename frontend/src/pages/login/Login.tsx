import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { login } from '../../api/auth'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setIsAuthenticated } = useAuth()

  // Get redirect URL from search params
  const encodedRedirect = searchParams.get('redirect')
  const redirectUrl = encodedRedirect ? decodeURIComponent(encodedRedirect) : null

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login({ username, password, keepSignedIn })
      // Update auth context immediately after successful login
      setIsAuthenticated(true)
      toast.success('Welcome back!')
      // Redirect to the stored URL or rooms if no redirect was provided
      navigate(redirectUrl || '/rooms')
    } catch (error) {
      console.error('Error logging in:', error)
      toast.error(error instanceof Error ? error.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen page-shell flex items-center justify-center px-4 py-12">
      <div className="page-shell-content w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <LogIn className="text-primary-foreground" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome Back
          </h1>
          <p className="text-muted-foreground">
            Sign in to your expense tracker account
          </p>
        </div>

        {/* Login Form */}
        <div className="expense-form p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-muted-foreground mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-muted-foreground" size={14} />
                </div>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="input-financial w-full pl-10 pr-4 py-3 text-sm font-medium"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-muted-foreground mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-muted-foreground" size={14} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  {showPassword ? (
                    <EyeOff className="text-muted-foreground hover:text-foreground transition-colors duration-200" size={14} />
                  ) : (
                    <Eye className="text-muted-foreground hover:text-foreground transition-colors duration-200" size={14} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between  mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Dont have an account?</p>
                <button
                  onClick={() => {
                    // Preserve redirect parameters when navigating to signup
                    const signupParams = new URLSearchParams()
                    if (redirectUrl) {
                      signupParams.set('redirect', encodeURIComponent(redirectUrl))
                    }
                    const signupUrl = signupParams.toString() ? `/signup?${signupParams.toString()}` : '/signup'
                    navigate(signupUrl)
                  }}
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200 mt-2"
                >
                  Create an account
                </button>
              </div>
              <div className="">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="btn-primary-expense w-full cursor-pointer py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing In...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn size={14} />
                  Sign In
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Secure login for your expense tracking platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
