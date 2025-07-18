import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Calendar, Target, Brain, Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'

interface DashboardProps {
  user: any
  onViewReflection: (date: string) => void
}

interface ReflectionData {
  date: string
  messages: any[]
  progressScore: number
  mentalBlocks: string[]
  keyInsights: string[]
}

export function Dashboard({ user, onViewReflection }: DashboardProps) {
  const [reflections, setReflections] = useState<ReflectionData[]>([])
  const [streak, setStreak] = useState(0)
  const [weeklyProgress, setWeeklyProgress] = useState(0)

  const loadDashboardData = useCallback(() => {
    if (!user?.id) return

    // Load reflections from localStorage
    const allReflections: ReflectionData[] = []
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(`reflection_${user.id}_`)
    )

    keys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        if (data.messages && data.messages.length > 0) {
          allReflections.push({
            date: data.date,
            messages: data.messages,
            progressScore: Math.floor(Math.random() * 100), // Mock score
            mentalBlocks: [],
            keyInsights: []
          })
        }
      } catch (error) {
        console.error('Error loading reflection:', error)
      }
    })

    setReflections(allReflections.sort((a, b) => b.date.localeCompare(a.date)))
    
    // Calculate streak
    calculateStreak(allReflections)
    
    // Calculate weekly progress
    const thisWeek = allReflections.filter(r => {
      const reflectionDate = new Date(r.date)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return reflectionDate >= weekAgo
    })
    setWeeklyProgress(Math.min((thisWeek.length / 7) * 100, 100))
  }, [user?.id])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const calculateStreak = (reflections: ReflectionData[]) => {
    if (reflections.length === 0) {
      setStreak(0)
      return
    }

    let currentStreak = 0
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // Check if there's a reflection today
    const hasToday = reflections.some(r => r.date === todayStr)
    if (!hasToday) {
      setStreak(0)
      return
    }

    // Count consecutive days
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const checkDateStr = checkDate.toISOString().split('T')[0]
      
      if (reflections.some(r => r.date === checkDateStr)) {
        currentStreak++
      } else {
        break
      }
    }
    
    setStreak(currentStreak)
  }

  const getRecentInsights = () => {
    const recentReflections = reflections.slice(0, 5)
    const insights = [
      "You've been consistently focusing on product development",
      "Customer feedback is becoming a recurring theme",
      "Time management appears to be a growing concern",
      "You're showing strong resilience in facing challenges",
      "Your networking efforts are paying off"
    ]
    return insights.slice(0, Math.min(3, recentReflections.length))
  }

  const getProgressTrend = () => {
    if (reflections.length < 2) return 0
    const recent = reflections.slice(0, 3)
    const older = reflections.slice(3, 6)
    
    const recentAvg = recent.reduce((sum, r) => sum + r.progressScore, 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((sum, r) => sum + r.progressScore, 0) / older.length : recentAvg
    
    return recentAvg - olderAvg
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Your Progress Dashboard</h1>
        <p className="text-muted-foreground">
          Track your founder journey and reflection insights
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reflection Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak} days</div>
            <p className="text-xs text-muted-foreground">
              {streak > 0 ? 'Keep it up!' : 'Start your streak today'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Progress</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(weeklyProgress)}%</div>
            <Progress value={weeklyProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reflections</CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reflections.length}</div>
            <p className="text-xs text-muted-foreground">
              Reflection sessions completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getProgressTrend() > 0 ? '+' : ''}{Math.round(getProgressTrend())}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs previous period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>Recent Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getRecentInsights().length > 0 ? (
              <div className="space-y-3">
                {getRecentInsights().map((insight, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Complete a few reflections to see insights here
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {reflections.length > 0 ? (
              <div className="space-y-4">
                {reflections.slice(0, 5).map((reflection, index) => (
                  <button
                    key={index}
                    onClick={() => onViewReflection(reflection.date)}
                    className="w-full flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(reflection.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {reflection.messages.length} messages exchanged
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {reflection.progressScore}% progress
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No reflections yet. Start your first reflection today!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Motivational Section */}
      {reflections.length > 0 && (
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Keep Building! 🚀</h3>
              <p className="text-muted-foreground">
                You've completed {reflections.length} reflection{reflections.length !== 1 ? 's' : ''} and maintained a {streak}-day streak. 
                Every reflection brings you closer to your goals.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}