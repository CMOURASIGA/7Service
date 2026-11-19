import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Access Management Service',
    short_name: 'Access',
    description: 'Gestão centralizada de identidades, licenças e acessos',
    start_url: '/entrar',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#003B73',
    icons: [{ src: '/icon', sizes: '192x192', type: 'image/png', purpose: 'any' }],
  };
}
