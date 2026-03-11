import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	output: "standalone",
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
