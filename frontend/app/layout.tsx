import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CurrencyProvider } from "@/context/CurrencyContext"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap"
})

export const metadata: Metadata = {
	title: {
		default: "SubTracker",
		template: `%s | SubTracker`
	},
	description: "SubTracker - Subscription tracking dashboard UI",
	icons: ["/assets/logo-icon.png"]
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			lang='en'
			className='dark'
			suppressHydrationWarning
		>
			<head>
				<link
					rel='stylesheet'
					href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
				/>
			</head>
			<body className={`${inter.variable} antialiased bg-bg text-white`}>
				<CurrencyProvider>
					{children}
					<Toaster />
				</CurrencyProvider>
			</body>
		</html>
	)
}
