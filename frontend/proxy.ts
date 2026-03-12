import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = [
	"/sign-in",
	"/sign-up",
	"/forgot-password",
	"/_next",
	"/api",
	"/favicon.ico",
	"/assets"
]

export function proxy(req: NextRequest) {
	const { pathname } = req.nextUrl
	const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
	const token = req.cookies.get("token")?.value

	if (!token && !isPublic) {
		const loginUrl = req.nextUrl.clone()
		loginUrl.pathname = "/sign-in"
		return NextResponse.redirect(loginUrl)
	}

	if (token && (pathname === "/sign-in" || pathname === "/sign-up")) {
		const nextUrl = req.nextUrl.clone()
		nextUrl.pathname = "/dashboard"
		return NextResponse.redirect(nextUrl)
	}

	return NextResponse.next()
}

export const config = {
	matcher: ["/:path*"]
}
