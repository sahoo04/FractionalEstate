import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Temporarily disabled middleware to fix vendor.js chunk errors
// Route protection middleware
export function middleware(request: NextRequest) {
  // Allow all requests for now
  return NextResponse.next()
}

// Disable matcher to prevent middleware execution
export const config = {
  matcher: [],
}
