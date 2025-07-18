import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import { DailyReflection } from './components/DailyReflection'
import { Dashboard } from './components/Dashboard'
import { WeeklySummaries } from './components/WeeklySummaries'
import { WeeklySummaryViewer } from './components/WeeklySummaryViewer'
import { ReflectionViewer } from './components/ReflectionViewer'
import { ProfileSetup } from './components/ProfileSetup'
import { Navigation } from './components/Navigation'
import { Toaster } from './components/ui/toaster'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('reflection')
  const [viewingReflection, setViewingReflection] = useState<string | null>(null)
  const [viewingSummary, setViewingSummary] = useState<string | null>(null)
  const [profileCompleted, setProfileCompleted] = useState(false)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  // Check if profile is completed when user changes
  useEffect(() => {
    if (user?.id) {
      const savedProfile = localStorage.getItem(`founder_profile_${user.id}`)
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile)
          // Check if required fields are filled
          const isCompleted = profile.companyName && 
                            profile.industry && 
                            profile.stage && 
                            profile.goals && 
                            profile.goals.length > 0
          setProfileCompleted(isCompleted)
        } catch (error) {
          console.error('Error parsing profile:', error)
          setProfileCompleted(false)
        }
      } else {
        setProfileCompleted(false)
      }
    }
  }, [user])

  const handleViewReflection = (date: string) => {
    setViewingReflection(date)
  }

  const handleViewSummary = (summaryId: string) => {
    setViewingSummary(summaryId)
  }

  const handleBackToDashboard = () => {
    setViewingReflection(null)
    setCurrentPage('dashboard')
  }

  const handleBackToSummaries = () => {
    setViewingSummary(null)
    setCurrentPage('summaries')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading FounderReflect...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h1 className="text-4xl font-bold text-foreground mb-4">FounderReflect</h1>
          <p className="text-muted-foreground mb-8">
            Daily progress reflection and mental block coaching for early-stage entrepreneurs
          </p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  const renderCurrentPage = () => {
    // Handle viewing specific reflection
    if (viewingReflection) {
      return (
        <ReflectionViewer
          user={user}
          reflectionDate={viewingReflection}
          onBack={handleBackToDashboard}
        />
      )
    }

    // Handle viewing specific weekly summary
    if (viewingSummary) {
      return (
        <WeeklySummaryViewer
          user={user}
          summaryId={viewingSummary}
          onBack={handleBackToSummaries}
          onViewReflection={handleViewReflection}
        />
      )
    }

    // Handle regular pages
    switch (currentPage) {
      case 'reflection':
        return <DailyReflection user={user} />
      case 'dashboard':
        return <Dashboard user={user} onViewReflection={handleViewReflection} />
      case 'summaries':
        return <WeeklySummaries user={user} onViewSummary={handleViewSummary} />
      case 'profile':
        return <ProfileSetup user={user} />
      default:
        return <DailyReflection user={user} />
    }
  }

  // Show profile setup if not completed
  if (!profileCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm">
          Welcome to FounderReflect! Please complete your profile to get started.
        </div>
        <ProfileSetup user={user} onProfileComplete={() => setProfileCompleted(true)} />
        <Toaster />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        user={user}
      />
      <main className="pt-16">
        {renderCurrentPage()}
      </main>
      <Toaster />
    </div>
  )
}

export default App