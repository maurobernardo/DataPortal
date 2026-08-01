function GoogleIcon() {
  return (
    <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.46H12v4.66h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.83Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.6 4.6 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.6l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  )
}

export function SocialLoginButtons() {
  return (
    <div className="space-y-3">
      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-3 text-xs text-gray-500 uppercase tracking-wide">ou continue com</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="/api/auth/oauth/google"
          className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 transition text-sm md:text-base font-semibold text-gray-700"
        >
          <GoogleIcon />
          Google
        </a>
        <a
          href="/api/auth/oauth/linkedin"
          className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 transition text-sm md:text-base font-semibold text-gray-700"
        >
          <LinkedInIcon />
          LinkedIn
        </a>
      </div>
    </div>
  )
}
