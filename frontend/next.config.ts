import type { NextConfig } from "next"

const internalApiUrl =
	process.env.INTERNAL_API_URL || "http://localhost:5050/api/v1"
const apiProxyOrigin = new URL(internalApiUrl).origin

const nextConfig: NextConfig = {
	output: "standalone",
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${apiProxyOrigin}/api/:path*`
			}
		]
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "100MB"
		}
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cloud.appwrite.io"
			}
		]
	},
	allowedDevOrigins: ["http://192.168.192.1:3000"]
}

export default nextConfig
