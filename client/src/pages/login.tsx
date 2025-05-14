import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loginAttempted, setLoginAttempted] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoginAttempted(true);
    console.log("Attempting login with:", { username, password });

    try {
      await login(username, password);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (err) {
      console.error("Login form error:", err);
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  };

  // Create admin account for testing
  const setupAdmin = async () => {
    try {
      const res = await fetch("/api/auth/setup-admin", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();
      console.log("Admin setup result:", data);

      toast({
        title: data.message,
        description: "You can now login with admin / admin123",
      });
    } catch (err) {
      console.error("Admin setup error:", err);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password *</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="flex justify-between items-center text-sm text-gray-500 mt-4">
            <p>Default credentials: admin / admin123</p>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={setupAdmin}
            >
              Reset Admin
            </Button>
          </div>

          {loginAttempted && (
            <div className="text-xs text-gray-500 mt-2">
              <p>Login attempts will be logged in the console for debugging.</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
