/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        CUSTOM_PORT: process.env.PORT || '3000',
    },
}

module.exports = nextConfig
