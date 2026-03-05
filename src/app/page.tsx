import ClientPage from './client-page';
import SplashWrapper from '@/components/splash-wrapper';
import AuthGuard from '@/components/auth-guard';

export default function Home() {
  return (
    <AuthGuard>
      <SplashWrapper>
        <ClientPage />
      </SplashWrapper>
    </AuthGuard>
  );
}
