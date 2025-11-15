import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileSpreadsheet,
  Users,
  DollarSign
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'success' | 'primary-gradient' | 'warning';
  to: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'Add Customer',
    description: 'Register a new customer',
    icon: Users,
    variant: 'default',
    to: '/customers'
  },
  {
    title: 'New BOQ',
    description: 'Create a new bill of quantities',
    icon: FileSpreadsheet,
    variant: 'primary-gradient',
    to: '/boqs'
  },
  {
    title: 'Record Payment',
    description: 'Log customer payment',
    icon: DollarSign,
    variant: 'success',
    to: '/payments'
  }
];

export function QuickActions() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
        {quickActions.map((action) => (
          <Button
            key={action.title}
            variant={action.variant}
            className="flex items-center justify-start space-x-3 h-auto p-4 text-left"
            asChild
          >
            <Link to={action.to}>
              <action.icon className="h-5 w-5" />
              <div className="flex-1">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
