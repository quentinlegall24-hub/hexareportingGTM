/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingIncludes: {
          '/': ['./public/data.json'],
          '/api/reports': ['./public/data.json'],
    },
}
module.exports = nextConfig
