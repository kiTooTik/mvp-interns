import { useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || undefined;
  const defaultTab = inviteToken ? 'signup' : 'login';

  return <LoginForm defaultTab={defaultTab as 'login' | 'signup'} inviteToken={inviteToken} />;
}