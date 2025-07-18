import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Calendar, FileText, MessageSquare, TrendingUp, Brain } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface WeeklySummary {
  id: string
  weekStartDate: string
  weekEndDate: string
  summaryText: string
  progressHighlights: string[]
  challengesIdentified: string[]
  mentalBlocksAddressed: string[]
  recommendations: string[]
  createdAt: string
}

interface ReflectionData {
  date: string
  messages: any[]
  sessionState?: any
  userId: string
  updatedAt: number
}

interface WeeklySummaryViewerProps {
  user: any
  summaryId: string
  onBack: () => void
  onViewReflection: (date: string) => void
}

export function WeeklySummaryViewer({ user, summaryId, onBack, onViewReflection }: WeeklySummaryViewerProps) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [weekReflections, setWeekReflections] = useState<ReflectionData[]>([])
  const [loading, setLoading] = useState(true)

  const loadSummaryAndReflections = useCallback(() => {
    if (!user?.id || !summaryId) {
      setLoading(false)
      return
    }

    try {
      // Load the specific summary
      const savedSummaries = localStorage.getItem(`weekly_summaries_${user.id}`)
      if (savedSummaries) {
        const summaries = JSON.parse(savedSummaries)
        const foundSummary = summaries.find((s: WeeklySummary) => s.id === summaryId)
        
        if (foundSummary) {
          setSummary(foundSummary)
          
          // Load reflections for this week
          const weekStart = new Date(foundSummary.weekStartDate)
          const weekEnd = new Date(foundSummary.weekEndDate)
          
          const reflections: ReflectionData[] = []
          const keys = Object.keys(localStorage).filter(key => 
            key.startsWith(`reflection_${user.id}_`)
          )

          keys.forEach(key => {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}')
              if (data.messages && data.messages.length > 0) {
                const reflectionDate = new Date(data.date)
                if (reflectionDate >= weekStart && reflectionDate <= weekEnd) {
                  reflections.push(data)
                }
              }
            } catch (error) {
              console.error('Error loading reflection:', error)
            }
          })

          setWeekReflections(reflections.sort((a, b) => a.date.localeCompare(b.date)))
        }
      }
    } catch (error) {
      console.error('Error loading summary:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, summaryId])

  useEffect(() => {
    loadSummaryAndReflections()
  }, [loadSummaryAndReflections])

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading weekly summary...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Summaries</span>
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Summary Not Found</h3>
              <p className="text-muted-foreground">
                The requested weekly summary could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="flex items-center space-x-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Summaries</span>
        </Button>
        
        <div className="flex items-center space-x-2 mb-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Weekly Summary</h1>
        </div>
        <p className="text-muted-foreground">{formatDateRange(summary.weekStartDate, summary.weekEndDate)}</p>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">Summary & Insights</TabsTrigger>
          <TabsTrigger value="conversations">Daily Conversations ({weekReflections.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* Main Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-accent" />
                <span>Weekly Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <p className="whitespace-pre-wrap text-sm">{summary.summaryText}</p>
              </div>
            </CardContent>
          </Card>

          {/* Progress Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span>Progress Highlights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.progressHighlights.map((highlight, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{highlight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Challenges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-orange-500" />
                <span>Challenges Identified</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.challengesIdentified.map((challenge, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{challenge}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Recommendations for Next Week</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          {weekReflections.length > 0 ? (
            <div className="space-y-4">
              {weekReflections.map((reflection, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <span>{formatDate(reflection.date)}</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {reflection.messages.length} messages
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewReflection(reflection.date)}
                        >
                          View Full Conversation
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Show first few messages as preview */}
                      {reflection.messages.slice(0, 4).map((message, msgIndex) => (
                        <div
                          key={msgIndex}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg text-sm ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <p className="line-clamp-3">{message.content}</p>
                          </div>
                        </div>
                      ))}
                      
                      {reflection.messages.length > 4 && (
                        <div className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewReflection(reflection.date)}
                            className="text-muted-foreground"
                          >
                            View {reflection.messages.length - 4} more messages...
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Conversations Found</h3>
                  <p className="text-muted-foreground">
                    No daily reflections were found for this week.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}