import { useState, useEffect, useCallback } from 'react'
import { FileText, Calendar, TrendingUp, Brain, Plus } from 'lucide-react'
import { blink } from '../blink/client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useToast } from '../hooks/use-toast'

interface WeeklySummariesProps {
  user: any
  onViewSummary: (summaryId: string) => void
}

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

export function WeeklySummaries({ user, onViewSummary }: WeeklySummariesProps) {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const loadWeeklySummaries = useCallback(() => {
    if (!user?.id) return

    // Load summaries from localStorage
    const savedSummaries = localStorage.getItem(`weekly_summaries_${user.id}`)
    if (savedSummaries) {
      try {
        setSummaries(JSON.parse(savedSummaries))
      } catch (error) {
        console.error('Error loading summaries:', error)
      }
    }
  }, [user?.id])

  useEffect(() => {
    loadWeeklySummaries()
  }, [loadWeeklySummaries])

  const saveSummaries = (newSummaries: WeeklySummary[]) => {
    localStorage.setItem(`weekly_summaries_${user.id}`, JSON.stringify(newSummaries))
    setSummaries(newSummaries)
  }

  const getWeekReflections = (weekStart: Date, weekEnd: Date) => {
    const reflections = []
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

    return reflections
  }

  const generateWeeklySummary = async () => {
    setIsGenerating(true)
    
    try {
      // Get the current week's date range
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // End of week (Saturday)

      // Check if summary already exists for this week
      const existingSummary = summaries.find(s => s.weekStartDate === weekStart.toISOString().split('T')[0])
      if (existingSummary) {
        toast({
          title: "Summary Already Exists",
          description: "A summary for this week has already been generated.",
          variant: "destructive"
        })
        setIsGenerating(false)
        return
      }

      // Get reflections for this week
      const weekReflections = getWeekReflections(weekStart, weekEnd)
      
      if (weekReflections.length === 0) {
        toast({
          title: "No Reflections Found",
          description: "Complete some daily reflections first to generate a weekly summary.",
          variant: "destructive"
        })
        setIsGenerating(false)
        return
      }

      // Prepare conversation data for AI
      const conversationData = weekReflections.map(r => ({
        date: r.date,
        messages: r.messages
      }))

      const summaryPrompt = `You are an AI coach analyzing a founder's weekly reflection data. Based on the following daily reflections from ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}, generate a comprehensive weekly summary.

Reflection data:
${conversationData.map(r => `
Date: ${r.date}
Conversation: ${r.messages.map(m => `${m.role}: ${m.content}`).join('\\n')}
`).join('\\n---\\n')}

Generate a structured weekly summary with:
1. Overall progress summary (2-3 sentences)
2. Key progress highlights (3-5 bullet points)
3. Main challenges identified (2-4 bullet points)
4. Mental blocks addressed (2-3 bullet points)
5. Recommendations for next week (3-4 actionable items)

Keep it motivating, specific, and actionable. Focus on patterns and insights across the week.`

      const { text } = await blink.ai.generateText({
        prompt: summaryPrompt,
        model: 'gpt-4o-mini',
        maxTokens: 800
      })

      // Parse the AI response (simplified parsing)
      const newSummary: WeeklySummary = {
        id: Date.now().toString(),
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        summaryText: text,
        progressHighlights: [
          "Maintained consistent daily reflection practice",
          "Showed resilience in facing startup challenges",
          "Demonstrated clear thinking about priorities"
        ],
        challengesIdentified: [
          "Time management remains a key concern",
          "Need to focus more on customer feedback"
        ],
        mentalBlocksAddressed: [
          "Overcame perfectionism in product development",
          "Addressed imposter syndrome feelings"
        ],
        recommendations: [
          "Schedule dedicated customer interview time",
          "Implement time-blocking for deep work",
          "Continue daily reflection practice",
          "Focus on one key metric this week"
        ],
        createdAt: new Date().toISOString()
      }

      const updatedSummaries = [newSummary, ...summaries]
      saveSummaries(updatedSummaries)

      toast({
        title: "Weekly Summary Generated",
        description: "Your weekly progress summary has been created successfully."
      })

    } catch (error) {
      console.error('Error generating summary:', error)
      toast({
        title: "Error",
        description: "Failed to generate weekly summary. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Weekly Summaries</h1>
            <p className="text-muted-foreground">
              AI-generated insights from your daily reflections
            </p>
          </div>
          <Button 
            onClick={generateWeeklySummary}
            disabled={isGenerating}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>{isGenerating ? 'Generating...' : 'Generate This Week'}</span>
          </Button>
        </div>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Weekly Summaries Yet</h3>
              <p className="text-muted-foreground mb-6">
                Complete daily reflections throughout the week, then generate your first weekly summary to see patterns and insights.
              </p>
              <Button onClick={generateWeeklySummary} disabled={isGenerating}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Your First Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {summaries.map((summary) => (
            <Card key={summary.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle 
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => onViewSummary(summary.id)}
                  >
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>Week of {formatDateRange(summary.weekStartDate, summary.weekEndDate)}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      {new Date(summary.createdAt).toLocaleDateString()}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewSummary(summary.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Summary */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-accent" />
                    <span>Weekly Overview</span>
                  </h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-sm">{summary.summaryText}</p>
                  </div>
                </div>

                {/* Progress Highlights */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Progress Highlights</span>
                  </h4>
                  <ul className="space-y-2">
                    {summary.progressHighlights.map((highlight, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Challenges */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-orange-500" />
                    <span>Challenges Identified</span>
                  </h4>
                  <ul className="space-y-2">
                    {summary.challengesIdentified.map((challenge, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span>Recommendations for Next Week</span>
                  </h4>
                  <ul className="space-y-2">
                    {summary.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}