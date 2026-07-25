import { LucideIcon } from 'lucide-react'

type AuthCardProps = {
  icon: LucideIcon
  title: string
  subtitle: string
  children: React.ReactNode
}

export function AuthCard({ icon: Icon, title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 md:pt-20 pb-12 md:pb-20">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-100 animate-slide-up">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 shadow-lg">
              <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-sm md:text-base text-gray-600">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
