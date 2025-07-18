import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Calendar, Clock, MessageSquare, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ReflectionData {
  date: string
  messages: Message[]
  sessionState?: {
    startTime: number
    questionCount: number
    maxQuestions: number
    isComplete: boolean
  }
  userId: string
  updatedAt: number
}

interface ReflectionViewerProps {
  user: any
  reflectionDate: string
  onBack: () => void
}

export function ReflectionViewer({ user, reflectionDate, onBack }: ReflectionViewerProps) {
  const [reflection, setReflection] = useState<ReflectionData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReflection = useCallback(() => {
    if (!user?.id || !reflectionDate) {
      setLoading(false)
      return
    }

    try {
      const savedReflection = localStorage.getItem(`reflection_${user.id}_${reflectionDate}`)
      if (savedReflection) {
        const data = JSON.parse(savedReflection)
        setReflection(data)
      }
    } catch (error) {
      console.error('Error loading reflection:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, reflectionDate])

  useEffect(() => {
    loadReflection()
  }, [loadReflection])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSessionDuration = () => {
    if (!reflection?.sessionState || !reflection.messages.length) return null
    
    const firstMessage = reflection.messages[0]
    const lastMessage = reflection.messages[reflection.messages.length - 1]
    const duration = lastMessage.timestamp - firstMessage.timestamp
    
    return Math.round(duration / (1000 * 60)) // Convert to minutes
  }

  const getSessionStats = () => {
    if (!reflection) return null

    const userMessages = reflection.messages.filter(m => m.role === 'user')
    const assistantMessages = reflection.messages.filter(m => m.role === 'assistant')
    
    return {
      totalMessages: reflection.messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      duration: getSessionDuration()
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading reflection...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!reflection) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Reflection Not Found</h3>
              <p className="text-muted-foreground">
                No reflection data found for {formatDate(reflectionDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = getSessionStats()

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
          <span>Back to Dashboard</span>
        </Button>
        
        <div className="flex items-center space-x-2 mb-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Daily Reflection</h1>
        </div>
        <p className="text-muted-foreground">{formatDate(reflection.date)}</p>
      </div>

      {/* Session Stats */}
      {stats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Session Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.totalMessages}</div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{stats.userMessages}</div>
                <p className="text-sm text-muted-foreground">Your Responses</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.assistantMessages}</div>
                <p className="text-sm text-muted-foreground">AI Questions</p>
              </div>
              {stats.duration && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.duration}min</div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
              )}
            </div>
            
            {reflection.sessionState && (
              <div className="mt-4 flex items-center justify-center space-x-4">
                <Badge variant={reflection.sessionState.isComplete ? "default" : "secondary"}>
                  {reflection.sessionState.isComplete ? "Completed" : "In Progress"}
                </Badge>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>{reflection.sessionState.questionCount}/{reflection.sessionState.maxQuestions} questions</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conversation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>Conversation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reflection.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center space-x-2 mt-2 opacity-70">
                    <Clock className="h-3 w-3" />
                    <p className="text-xs">
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Session Highlights</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Completed {stats?.userMessages} thoughtful responses</li>
                <li>• Engaged in {stats?.duration ? `${stats.duration}-minute` : 'focused'} reflection session</li>
                <li>• Explored progress, challenges, and next steps</li>
                {reflection.sessionState?.isComplete && (
                  <li>• Successfully completed full reflection cycle</li>
                )}
              </ul>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                This reflection was part of your daily practice to build self-awareness and maintain momentum in your founder journey.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}