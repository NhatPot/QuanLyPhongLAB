/** @type {import('next').NextConfig} */
const nextConfig = {
  logging:{incomingRequests:{ignore:[/\/api\/auth\/sso\/callback/]}},
  outputFileTracingIncludes: {
    '/api/auth/**': ['./src/server/infrastructure/email/templates/**/*'],
  },
  async headers() {
    return ['/login', '/register', '/profile', '/sso-link'].map((source) => ({
      source,
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Referrer-Policy', value: process.env.NODE_ENV === 'development' ? 'no-referrer-when-downgrade' : 'strict-origin-when-cross-origin' },
      ],
    }));
  },
};

export default nextConfig;
