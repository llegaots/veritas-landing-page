'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Mail, Loader2, ExternalLink, RefreshCw, LogOut } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EmailStatus {
  connected: boolean;
  authenticatedEmail?: string;
  sendFromEmail?: string;
  message?: string;
  error?: string;
}

function EmailSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const password = searchParams.get('key') || 'veritas2024admin';
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error' | 'checking'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [customFromEmail, setCustomFromEmail] = useState<string>('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);

  // Check if email is already connected
  useEffect(() => {
    const checkEmailStatus = async () => {
      try {
        const response = await fetch('/api/admin/email-status');
        const data: EmailStatus = await response.json();
        setEmailStatus(data);
        
        if (data.connected) {
          setStatus('idle');
          if (data.authenticatedEmail) setUserEmail(data.authenticatedEmail);
          if (data.sendFromEmail) setCustomFromEmail(data.sendFromEmail);
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.error('Error checking email status:', err);
        setStatus('idle');
      }
    };

    // Check for OAuth callback results first
    const oauthSuccess = searchParams.get('oauth_success');
    const oauthError = searchParams.get('oauth_error');
    const email = searchParams.get('email');
    const token = searchParams.get('refresh_token');

    if (oauthSuccess === '1') {
      setStatus('success');
      if (email) {
        setUserEmail(email);
        setCustomFromEmail(email);
      }
      if (token) setRefreshToken(token);
      // Refresh status after OAuth success
      setTimeout(checkEmailStatus, 1000);
    } else if (oauthError) {
      setStatus('error');
      setError(decodeURIComponent(oauthError));
    } else {
      // Check existing connection
      checkEmailStatus();
    }
  }, [searchParams]);

  const handleConnectGoogle = () => {
    setStatus('connecting');
    // Redirect to OAuth flow
    window.location.href = `/api/auth/google?key=${encodeURIComponent(password)}`;
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect? You will need to reconnect and update your environment variables.')) {
      setEmailStatus(null);
      setUserEmail(null);
      setCustomFromEmail('');
      setRefreshToken(null);
      setStatus('idle');
    }
  };

  const handleSaveToken = () => {
    if (!refreshToken) return;
    
    // Show instructions to save token
    alert(`Copy this refresh token and add it to your .env.local file:\n\nGMAIL_REFRESH_TOKEN=${refreshToken}\n\nAlso make sure to set:\nEMAIL_PROVIDER=gmail\nEMAIL_FROM=${userEmail || 'your-email@gmail.com'}`);
  };

  return (
    <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex">
      <AdminSidebar password={password} />
      
      <div className="flex-1 ml-64 transition-all duration-300">
        <div className="px-4 lg:px-8 py-6">
          <Card className="bg-white border-0 shadow-sm max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Email Setup</CardTitle>
                  <CardDescription>
                    Connect your Google account to send emails (just like N8N!)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {status === 'checking' && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Checking email connection...</p>
                </div>
              )}

              {status === 'idle' && emailStatus?.connected && (
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-green-900 mb-2">
                          ✅ Email Account Connected
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600">Authenticated as:</p>
                            <p className="text-base font-medium text-gray-900">{emailStatus.authenticatedEmail}</p>
                          </div>
                          {emailStatus.sendFromEmail && emailStatus.sendFromEmail !== emailStatus.authenticatedEmail && (
                            <div>
                              <p className="text-sm text-gray-600">Sending from:</p>
                              <p className="text-base font-medium text-purple-700">{emailStatus.sendFromEmail}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>✨ All set!</strong> Your email account is connected and ready to send emails.
                      <br />
                      No re-authentication needed - it will work automatically forever.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleConnectGoogle}
                      variant="outline"
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Change Account
                    </Button>
                    <Button
                      onClick={handleDisconnect}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}

              {status === 'idle' && !emailStatus?.connected && (
                <>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-5 w-5 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900">No Email Account Connected</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Connect your Google account to start sending emails from your sequences.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">How it works:</h3>
                      <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                        <li>Click "Connect Google" below</li>
                        <li>Sign in with your Google account</li>
                        <li>Grant email sending permissions</li>
                        <li>Copy the refresh token to your environment variables</li>
                        <li>Done! No passwords needed 🎉</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Make sure you've set up Google OAuth2 credentials first.
                        See <code className="bg-blue-100 px-1 rounded">GOOGLE_OAUTH_SETUP.md</code> for instructions.
                      </p>
                    </div>

                    <Button
                      onClick={handleConnectGoogle}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                      size="lg"
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      Connect Google Account
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {status === 'connecting' && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Redirecting to Google...</p>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-green-900 mb-1">
                          Successfully Connected!
                        </h3>
                        {userEmail && (
                          <p className="text-sm text-green-700">
                            Connected as: <strong>{userEmail}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {refreshToken && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Refresh Token (save this to .env.local):
                        </label>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs break-all">
                          {refreshToken}
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 mb-2">
                          <strong>Next steps:</strong>
                        </p>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                          <li>Add to your <code className="bg-blue-100 px-1 rounded">.env.local</code> file:</li>
                        </ol>
                        <div className="mt-2 p-2 bg-white border border-blue-200 rounded font-mono text-xs">
                          GMAIL_REFRESH_TOKEN={refreshToken}<br />
                          EMAIL_PROVIDER=gmail<br />
                          EMAIL_FROM={customFromEmail || userEmail || 'your-email@gmail.com'}
                        </div>
                        {customFromEmail && customFromEmail !== userEmail && (
                          <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-xs text-purple-800">
                              <strong>✨ Custom Domain Setup:</strong> Make sure <code className="bg-purple-100 px-1 rounded">{customFromEmail}</code> is:
                              <br />
                              • A Google Workspace account, OR
                              <br />
                              • Set up as "Send mail as" in your Gmail account
                              <br />
                              <br />
                              Once configured, you can send from {customFromEmail} just like N8N! 🎉
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-blue-700 mt-2">
                          <strong>For Vercel:</strong> Add these same variables in Vercel Dashboard → Settings → Environment Variables
                        </p>
                      </div>

                      <Button
                        onClick={handleSaveToken}
                        variant="outline"
                        className="w-full"
                      >
                        Copy Instructions
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {status === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-900 mb-1">
                        Connection Failed
                      </h3>
                      <p className="text-sm text-red-700">
                        {error || 'Unknown error occurred'}
                      </p>
                      {error?.includes('redirect_uri') && (
                        <p className="text-sm text-red-600 mt-2">
                          💡 Make sure the redirect URI in Google Cloud Console matches: <br />
                          <code className="bg-red-100 px-1 rounded">
                            {typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/google/callback
                          </code>
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleConnectGoogle}
                    variant="outline"
                    className="mt-4 w-full"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EmailSetupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailSetupContent />
    </Suspense>
  );
}

