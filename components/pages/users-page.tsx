'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader, StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, Shield, Users, UserCheck } from 'lucide-react';
import { Profile, UserRole, ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function UsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  };

  const updateRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase.rpc('update_member_role', { p_user_id: userId, p_new_role: role });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('User role updated');
      fetchUsers();
    }
  };

  const sendInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviting(true);
    const { error } = await supabase.functions.invoke('invite-user', { body: { full_name: inviteName, email: inviteEmail, role: inviteRole } });
    if (error) toast.error(error.message || 'Unable to send invitation');
    else {
      toast.success('Invitation email sent');
      setInviteName('');
      setInviteEmail('');
      setInviteRole('viewer');
    }
    setInviting(false);
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    const { error } = await supabase.rpc('toggle_member_active', { p_user_id: userId, p_is_active: !isActive });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    }
  };

  if (!profile || !['platform_admin', 'org_owner', 'org_admin'].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm text-muted-foreground">Only organization administrators can manage users.</p>
        </div>
      </div>
    );
  }

  const adminCount = users.filter((u) => ['platform_admin', 'org_owner', 'org_admin'].includes(u.role)).length;
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Manage system users, roles, and permissions" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={users.length} icon={Users} color="primary" />
        <StatCard title="Active Users" value={activeCount} icon={UserCheck} color="success" />
        <StatCard title="Super Admins" value={adminCount} icon={Shield} color="destructive" />
      </div>

      <Card>
        <CardHeader><CardTitle>Invite a team member</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={sendInvitation} className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
            <div className="space-y-2"><Label htmlFor="invite-name">Full name</Label><Input id="invite-name" required value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Team member name" /></div>
            <div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" /></div>
            <div className="space-y-2"><Label htmlFor="invite-role">Role</Label><Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}><SelectTrigger id="invite-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="org_admin">Organization Administrator</SelectItem><SelectItem value="factory_manager">Factory Manager</SelectItem><SelectItem value="production_officer">Production Officer</SelectItem><SelectItem value="warehouse_manager">Warehouse Manager</SelectItem><SelectItem value="warehouse_officer">Warehouse Officer</SelectItem><SelectItem value="sales_manager">Sales Manager</SelectItem><SelectItem value="sales_officer">Sales Officer</SelectItem><SelectItem value="accountant">Accountant</SelectItem><SelectItem value="finance_manager">Finance Manager</SelectItem><SelectItem value="auditor">Auditor</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent></Select></div>
            <Button type="submit" disabled={inviting}>{inviting ? 'Sending...' : 'Send invitation'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Organization users</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
                    <TableHead>Status</TableHead><TableHead>Change Role</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_active ? <Badge className="bg-success/10 text-success">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => updateRole(u.id, v as UserRole)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="org_admin">Organization Administrator</SelectItem>
                            <SelectItem value="factory_manager">Factory Manager</SelectItem>
                            <SelectItem value="production_officer">Production Officer</SelectItem>
                            <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
                            <SelectItem value="warehouse_officer">Warehouse Officer</SelectItem>
                            <SelectItem value="sales_manager">Sales Manager</SelectItem>
                            <SelectItem value="sales_officer">Sales Officer</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="finance_manager">Finance Manager</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => toggleActive(u.id, u.is_active)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Role Permissions Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Organization Admin</TableHead><TableHead>Factory Manager</TableHead>
                  <TableHead>Warehouse Officer</TableHead><TableHead>Sales Officer</TableHead>
                  <TableHead>Accountant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { module: 'Dashboard', perms: [true, true, true, true, true] },
                  { module: 'Production', perms: [true, true, false, false, false] },
                  { module: 'Inventory', perms: [true, true, true, false, false] },
                  { module: 'Warehouse', perms: [true, true, true, false, false] },
                  { module: 'Sales', perms: [true, false, false, true, false] },
                  { module: 'Customers', perms: [true, false, false, true, false] },
                  { module: 'Suppliers', perms: [true, false, false, false, false] },
                  { module: 'Purchases', perms: [true, false, false, false, false] },
                  { module: 'Reports', perms: [true, true, true, true, true] },
                  { module: 'AI Assistant', perms: [true, true, true, true, true] },
                  { module: 'User Management', perms: [true, false, false, false, false] },
                  { module: 'Settings', perms: [true, false, false, false, false] },
                ].map((row) => (
                  <TableRow key={row.module}>
                    <TableCell className="font-medium">{row.module}</TableCell>
                    {row.perms.map((p, i) => (
                      <TableCell key={i}>
                        {p ? <Badge className="bg-success/10 text-success">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
