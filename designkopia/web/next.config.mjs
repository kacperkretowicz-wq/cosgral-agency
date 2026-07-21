/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // generowane zdjęcia trafiają do public/ per job; zewnętrzne źródła dodaj tu
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
