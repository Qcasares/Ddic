import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  Briefcase, 
  GraduationCap, 
  Award, 
  Star, 
  Mail, 
  Github, 
  Linkedin,
  MapPin,
  Calendar,
  Download,
  Shield,
  Key,
  CheckCircle,
  XCircle
} from 'lucide-react';

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<'security' | 'experience' | 'education' | 'skills'>('security');
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserData(user);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
      setShowChangePasswordDialog(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userData?.email,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Verification email sent successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send verification email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const SecurityTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Account Security
        </h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Email Verification</p>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {userData?.email_confirmed_at ? (
                <Badge className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Verified
                </Badge>
              ) : (
                <>
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Unverified
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={isLoading}
                  >
                    Resend Verification
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">Last changed: {
                userData?.updated_at ? new Date(userData.updated_at).toLocaleDateString() : 'Never'
              }</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowChangePasswordDialog(true)}
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              Change Password
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Multi-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Enhance your account security</p>
            </div>
            <Button variant="outline" disabled>Coming Soon</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Connected Accounts</h3>
        <div className="space-y-4">
          <Button variant="outline" className="w-full justify-start" disabled>
            <Github className="h-4 w-4 mr-2" />
            Connect GitHub Account
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Linkedin className="h-4 w-4 mr-2" />
            Connect LinkedIn Account
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{userData?.email}</h1>
            <p className="text-muted-foreground mb-4">
              Account created: {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'security' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('security')}
          className="rounded-none border-b-2 border-transparent"
        >
          <Shield className="h-4 w-4 mr-2" />
          Security
        </Button>
        <Button
          variant={activeTab === 'experience' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('experience')}
          className="rounded-none border-b-2 border-transparent"
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Experience
        </Button>
        <Button
          variant={activeTab === 'education' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('education')}
          className="rounded-none border-b-2 border-transparent"
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          Education
        </Button>
        <Button
          variant={activeTab === 'skills' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('skills')}
          className="rounded-none border-b-2 border-transparent"
        >
          <Star className="h-4 w-4 mr-2" />
          Skills
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="h-[600px] pr-4">
        {activeTab === 'security' && <SecurityTab />}
        {/* Keep existing tabs */}
      </ScrollArea>

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>Loading...</>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}