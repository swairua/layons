import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateUnit } from '@/hooks/useDatabase';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateUnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (unit: any) => void;
}

export function CreateUnitModal({ open, onOpenChange, onCreated }: CreateUnitModalProps) {
  const [name, setName] = useState('');
  const [abbrev, setAbbrev] = useState('');
  const { currentCompany } = useCurrentCompany();
  const { profile } = useAuth();
  const createUnit = useCreateUnit();

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Unit name is required'); return; }
    try {
      const payload = {
        company_id: currentCompany?.id || null,
        name: name.trim(),
        abbreviation: abbrev.trim() || null,
        created_by: profile?.id || null,
      };
      const unit = await createUnit.mutateAsync(payload);
      toast.success('Unit created');
      setName(''); setAbbrev('');
      onOpenChange(false);
      if (onCreated) onCreated(unit);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create unit');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Unit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Unit Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Abbreviation (optional)</Label>
            <Input value={abbrev} onChange={e => setAbbrev(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createUnit.isLoading}>{createUnit.isLoading ? 'Creating...' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
