import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Plus } from 'lucide-react';
import { CreateBOQModal } from '@/components/boq/CreateBOQModal';

export default function BOQs() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bill of Quantities</h1>
          <p className="text-muted-foreground">Create BOQs and download branded PDFs</p>
        </div>
        <Button variant="default" size="lg" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New BOQ
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Click "New BOQ" to build a BOQ with sections and items, then download a PDF. BOQs are generated on demand and not stored in the database.</p>
        </CardContent>
      </Card>

      <CreateBOQModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
