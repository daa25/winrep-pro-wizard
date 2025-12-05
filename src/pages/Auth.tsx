import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { authSchema } from "@/lib/validationSchemas";
import winzerLogo from "@/assets/winzer-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  // Check if this is a password recovery flow
  const isRecoveryMode = searchParams.get('type') === 'recovery';

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If user just completed recovery, don't auto-redirect - let them set new password
      if (event === 'PASSWORD_RECOVERY') {
        return;
      }
      
      // If user successfully signed in and not in recovery mode, redirect
      if (session && !isRecoveryMode) {
        navigate("/");
      }
    });

    // Check for existing session (but not during recovery)
    if (!isRecoveryMode) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate("/");
        }
      });
    }

    return () => subscription.unsubscribe();
  }, [navigate, isRecoveryMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validationData = {
        email,
        password,
        ...(isLogin ? {} : { fullName }),
      };
      
      const result = authSchema.safeParse(validationData);
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Logged in successfully!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;
        toast.success("Account created successfully!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth?type=recovery`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      
      toast.success("Password reset email sent! Check your inbox.");
      setResetDialogOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password updated successfully! You can now sign in.");
      
      // Clear the recovery mode and redirect to login
      navigate("/auth", { replace: true });
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  // Password Recovery Form
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md shadow-elevated animate-scale-in relative z-10 glass-card winzer-stripe">
          <CardHeader className="space-y-4 pt-8">
            <div className="flex justify-center">
              <img 
                src={winzerLogo} 
                alt="Winzer" 
                className="h-16 w-auto drop-shadow-lg hover-scale"
              />
            </div>
            
            <div className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-accent/10">
                  <KeyRound className="h-8 w-8 text-accent" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
              <CardDescription>
                Enter your new password below to complete the reset process
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={100}
                  className="shadow-inner-light"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={100}
                  className="shadow-inner-light"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full glow-button bg-gradient-accent hover:opacity-90 shadow-glow-accent" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => navigate("/auth", { replace: true })}
                className="text-primary hover:text-primary-glow font-medium transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular Login/Signup Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-elevated animate-scale-in relative z-10 glass-card winzer-stripe">
        <CardHeader className="space-y-4 pt-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={winzerLogo} 
              alt="Winzer" 
              className="h-16 w-auto drop-shadow-lg hover-scale"
            />
          </div>
          
          <div className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Sign in to access your sales dashboard"
                : "Sign up to get started with Winzer sales tools"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                  className="shadow-inner-light"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="shadow-inner-light"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={100}
                className="shadow-inner-light"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full glow-button bg-gradient-accent hover:opacity-90 shadow-glow-accent" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          
          {isLogin && (
            <div className="mt-4 text-center">
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </DialogTrigger>
                <DialogContent className="shadow-elevated">
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">Email</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-primary" disabled={resetLoading}>
                      {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send Reset Link
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
          
          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary-glow font-medium transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
