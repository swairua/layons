import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  Mail,
  Clock,
  Users,
  UserX,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, UserProfile } from '@/contexts/AuthContext';
import useUserManagement from '@/hooks/useUserManagement';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { InviteUserModal } from '@/components/users/InviteUserModal';
import { AdminDiagnostics } from '@/components/AdminDiagnostics';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function getRoleColor(role: string) {
  switch (role) {
    case 'admin':
      return 'bg-destructive-light text-destructive border-destructive/20';
    case 'accountant':
      return 'bg-primary-light text-primary border-primary/20';
    case 'stock_manager':
      return 'bg-warning-light text-warning border-warning/20';
    case 'user':
      return 'bg-success-light text-success border-success/20';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-success-light text-success border-success/20';
    case 'inactive':
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
    case 'pending':
      return 'bg-warning-light text-warning border-warning/20';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { isAdmin, profile: currentUser, refreshProfile } = useAuth();
  const {
    users,
    invitations,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    inviteUser,
    revokeInvitation,
    getUserStats,
  } = useUserManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalState, setModalState] = useState<{
    type: 'create' | 'edit' | 'invite' | null;
    user?: UserProfile | null;
  }>({ type: null, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user?: UserProfile | null;
  }>({ open: false, user: null });

  const stats = getUserStats();

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async (userData: any) => {
    return await createUser(userData);
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    return await updateUser(userId, userData);
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    
    const result = await deleteUser(deleteDialog.user.id);
    if (result.success) {
      setDeleteDialog({ open: false, user: null });
    }
    return result;
  };

  const handleInviteUser = async (email: string, role: any) => {
    return await inviteUser(email, role);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    const result = await revokeInvitation(invitationId);
    if (result.success) {
      toast.success('Invitation revoked successfully');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setModalState({ type: 'invite' })}
            disabled={!isAdmin}
            title={!isAdmin ? "Only administrators can invite users" : ""}
          >
            <Mail className="h-4 w-4 mr-2" />
            Invite User
          </Button>
          <Button
            variant="primary-gradient"
            size="lg"
            onClick={() => setModalState({ type: 'create' })}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-blue-900">How to Add Users</p>
              <p className="text-sm text-blue-800">
                Use the <span className="font-semibold">"Invite User"</span> button to send invitation emails to new team members.
                They'll receive an email with a link to accept the invitation and create their account.
              </p>
              <p className="text-sm text-blue-800">
                Once users are invited, you can manage their roles and permissions from the table below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-success">{stats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Administrators</p>
                <p className="text-2xl font-bold text-destructive">{stats.adminUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold text-warning">{stats.pendingInvitations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Users & Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                            {user.full_name ? getInitials(user.full_name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.position || 'No position'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleColor(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {user.department || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.last_login ? (
                        new Date(user.last_login).toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setModalState({ type: 'edit', user })}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          {user.id !== currentUser?.id && (
                            <DropdownMenuItem
                              className="text-destructive opacity-50 cursor-not-allowed"
                              disabled
                              title="User deletion requires backend setup"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <UserX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No users found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleColor(invitation.role)}>
                        {invitation.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.invited_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(invitation.status)}>
                        {invitation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invitation.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Implementation Guide */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">Need Full User Management?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-amber-900 mb-2">Currently Available</h4>
              <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                <li>Invite users via email</li>
                <li>Edit user roles and status</li>
                <li>View pending invitations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-amber-900 mb-2">Requires Backend Setup</h4>
              <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                <li>Direct user creation (requires Supabase admin API)</li>
                <li>User deletion (requires Supabase admin API)</li>
                <li>Email invitations (requires email service integration)</li>
              </ul>
            </div>
            <div className="pt-2">
              <p className="text-sm text-amber-800">
                To enable these features, you'll need to set up Supabase Edge Functions with admin privileges or integrate with a backend API.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateUserModal
        open={modalState.type === 'create'}
        onOpenChange={(open) => !open && setModalState({ type: null })}
        onCreateUser={handleCreateUser}
        loading={loading}
      />

      <EditUserModal
        open={modalState.type === 'edit'}
        onOpenChange={(open) => !open && setModalState({ type: null })}
        user={modalState.user}
        onUpdateUser={handleUpdateUser}
        loading={loading}
      />

      <InviteUserModal
        open={modalState.type === 'invite'}
        onOpenChange={(open) => !open && setModalState({ type: null })}
        onInviteUser={handleInviteUser}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: deleteDialog.user })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteDialog.user?.full_name || deleteDialog.user?.email}? 
              This action cannot be undone and will permanently remove the user's access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
