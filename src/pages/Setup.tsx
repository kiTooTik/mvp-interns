import { Loader2 } from 'lucide-react';
import { useAdminSetup } from '@/hooks/useAdminSetup';
import { AdminSetupHeader } from '@/components/auth/AdminSetupHeader';
import { AdminSetupCard } from '@/components/auth/AdminSetupCard';
import { AdminSetupForm } from '@/components/auth/AdminSetupForm';
import { PageContainer } from '@/components/ui/MotionContainer';

export default function Setup() {
  const { checking } = useAdminSetup();

  if (checking) {
    return (
      <PageContainer>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="w-full max-w-md">
        <AdminSetupHeader />
        <AdminSetupCard>
          <AdminSetupForm />
        </AdminSetupCard>
      </div>
    </PageContainer>
  );
}
