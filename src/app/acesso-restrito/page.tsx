import { RestrictedAccess } from '@/features/auth/components/restricted-access';

export const metadata = {
  title: 'Acesso restrito - Access Management Service',
};

export default function RestrictedPage() {
  return <RestrictedAccess />;
}
