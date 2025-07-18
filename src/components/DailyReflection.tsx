import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Sparkles, Calendar, Clock, Target } from 'lucide-react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import { useToast } from '../hooks/use-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface SessionState {
  startTime: number
  questionCount: number
  maxQuestions: number
  isComplete: boolean
  topics: string[]
  topicCoverage: {
    [key: string]: {
      mentioned: boolean
      explored: boolean
      specificity: number // 0-3 scale
      lastQuestionIndex: number
    }
  }
  currentFocus: string | null
}

interface DailyReflectionProps {
  user: any
}

export function DailyReflection({ user }: DailyReflectionProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [todayDate] = useState(new Date().toISOString().split('T')[0])
  const [hasStarted, setHasStarted] = useState(false)
  const [sessionState, setSessionState] = useState<SessionState>({
    startTime: 0,
    questionCount: 0,
    maxQuestions: 5,
    isComplete: false,
    topics: [],
    topicCoverage: {},
    currentFocus: null
  })
  const [currentTime, setCurrentTime] = useState(Date.now())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadTodaysReflection = useCallback(async () => {
    if (!user?.id) return
    try {
      // For now, we'll use localStorage as a fallback until database is available
      const savedReflection = localStorage.getItem(`reflection_${user.id}_${todayDate}`)
      if (savedReflection) {
        const data = JSON.parse(savedReflection)
        setMessages(data.messages || [])
        setHasStarted(data.messages?.length > 0)
        if (data.sessionState) {
          setSessionState(data.sessionState)
        }
      }
    } catch (error) {
      console.error('Error loading reflection:', error)
    }
  }, [user?.id, todayDate])

  useEffect(() => {
    loadTodaysReflection()
  }, [loadTodaysReflection])

  // Update timer every minute when session is active
  useEffect(() => {
    if (!hasStarted || sessionState.isComplete) return

    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [hasStarted, sessionState.isComplete])

  const saveReflection = async (newMessages: Message[], newSessionState?: SessionState) => {
    try {
      const reflectionData = {
        messages: newMessages,
        sessionState: newSessionState || sessionState,
        date: todayDate,
        userId: user.id,
        updatedAt: Date.now()
      }
      
      // Save to localStorage as fallback
      localStorage.setItem(`reflection_${user.id}_${todayDate}`, JSON.stringify(reflectionData))
      
      // TODO: Save to database when available
      // await blink.db.reflections.upsert({
      //   id: `${user.id}_${todayDate}`,
      //   userId: user.id,
      //   date: todayDate,
      //   messages: JSON.stringify(newMessages),
      //   sessionState: JSON.stringify(newSessionState || sessionState),
      //   updatedAt: new Date().toISOString()
      // })
    } catch (error) {
      console.error('Error saving reflection:', error)
    }
  }

  const analyzeConversationContext = async (messages: Message[]): Promise<{
    topics: string[]
    currentTopicSpecificity: number
    shouldMoveToNewTopic: boolean
    suggestedNextTopic: string | null
  }> => {
    if (messages.length < 2) {
      return {
        topics: [],
        currentTopicSpecificity: 0,
        shouldMoveToNewTopic: false,
        suggestedNextTopic: null
      }
    }

    const recentMessages = messages.slice(-4) // Analyze last 4 messages
    const conversationText = recentMessages.map(m => `${m.role}: ${m.content}`).join('\\n')

    try {
      const { object } = await blink.ai.generateObject({
        prompt: `Analyze this founder reflection conversation to determine topic coverage and specificity:

${conversationText}

Evaluate:
1. What specific topics are being discussed (progress, challenges, plans, goals, etc.)
2. How specific/detailed is the current topic discussion (0-3 scale)
3. Whether the founder is repeating themselves or the AI is over-probing
4. What new topic should be explored next

Core topics to track: daily_progress, current_challenges, immediate_plans, goals_status, mental_blocks, team_issues, product_development, customer_feedback, funding, personal_wellbeing`,
        schema: {
          type: 'object',
          properties: {
            topics: {
              type: 'array',
              items: { type: 'string' }
            },
            currentTopicSpecificity: {
              type: 'number',
              minimum: 0,
              maximum: 3
            },
            shouldMoveToNewTopic: {
              type: 'boolean'
            },
            suggestedNextTopic: {
              type: 'string'
            }
          },
          required: ['topics', 'currentTopicSpecificity', 'shouldMoveToNewTopic', 'suggestedNextTopic']
        }
      })

      return object
    } catch (error) {
      console.error('Error analyzing conversation:', error)
      return {
        topics: [],
        currentTopicSpecificity: 1,
        shouldMoveToNewTopic: false,
        suggestedNextTopic: null
      }
    }
  }

  const shouldEndSession = (currentSession: SessionState, elapsedMinutes: number) => {
    return (
      currentSession.questionCount >= currentSession.maxQuestions ||
      elapsedMinutes >= 20 ||
      currentSession.isComplete
    )
  }

  const generateContextualQuestion = async (conversationHistory: Message[], currentSession: SessionState) => {
    const elapsedMinutes = (Date.now() - currentSession.startTime) / (1000 * 60)
    const questionsRemaining = currentSession.maxQuestions - currentSession.questionCount
    
    // Check if we should wrap up the session
    if (shouldEndSession(currentSession, elapsedMinutes)) {
      return `Thank you for taking time to reflect today! You've covered some important ground. 

Based on our conversation, here's what I'm hearing:
- You're making progress on your startup journey
- You have clear next steps to focus on

Remember: consistent daily reflection, even just 15-20 minutes, builds momentum over time. 

Your reflection is complete for today. See you tomorrow! 🚀`
    }

    // Analyze conversation context to avoid repetitive probing
    const analysis = await analyzeConversationContext(conversationHistory)
    
    const contextPrompt = `You are an AI coach for early-stage B2C founders conducting a focused 15-20 minute daily reflection session.

SESSION CONTEXT:
- Question ${currentSession.questionCount + 1} of ${currentSession.maxQuestions}
- ${questionsRemaining} questions remaining
- ${Math.round(elapsedMinutes)} minutes elapsed
- Target: Complete in 15-20 minutes total

CONVERSATION ANALYSIS:
- Current topics covered: ${analysis.topics.join(', ')}
- Current topic specificity: ${analysis.currentTopicSpecificity}/3 (3 = very specific)
- Should move to new topic: ${analysis.shouldMoveToNewTopic}
- Suggested next topic: ${analysis.suggestedNextTopic}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\\n')}

CRITICAL INSTRUCTIONS:
${analysis.shouldMoveToNewTopic ? 
  `MOVE TO NEW TOPIC: The current topic has sufficient specificity (${analysis.currentTopicSpecificity}/3). Transition to exploring "${analysis.suggestedNextTopic}" instead of probing deeper on the current topic.` :
  `CONTINUE CURRENT TOPIC: Current specificity is ${analysis.currentTopicSpecificity}/3. You can ask 1 more follow-up before moving on.`
}

Generate a single, focused question that:
1. ${analysis.shouldMoveToNewTopic ? 'Transitions smoothly to a new topic area' : 'Builds naturally on what they\'ve shared'}
2. Avoids repetitive probing - don't ask for more details if they've already been specific
3. Helps explore progress, problems, or plans efficiently
4. Is motivating and supportive
5. Moves toward actionable insights

IMPORTANT: If the founder has already given specific details about something, acknowledge it and move to a different area. Don't make them repeat themselves.

If this is question 4 or 5, start guiding toward concrete next steps and wrap-up.

Keep it conversational and under 80 words.`

    try {
      const { text } = await blink.ai.generateText({
        prompt: contextPrompt,
        model: 'gpt-4o-mini',
        maxTokens: 120
      })
      return text
    } catch (error) {
      console.error('Error generating question:', error)
      return questionsRemaining <= 1 
        ? "What's one specific action you'll take tomorrow to move your startup forward?"
        : "What's one specific challenge you're facing today, and what small step could you take to move forward?"
    }
  }

  const startReflection = async () => {
    setIsLoading(true)
    setHasStarted(true)
    
    const newSessionState: SessionState = {
      startTime: Date.now(),
      questionCount: 0,
      maxQuestions: 5,
      isComplete: false,
      topics: [],
      topicCoverage: {},
      currentFocus: null
    }
    
    setSessionState(newSessionState)
    
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Welcome to your daily reflection! I'm here to help you think through your startup journey in the next 15-20 minutes. Let's start with something positive: What's one thing you accomplished yesterday that moved your startup forward, no matter how small?",
      timestamp: Date.now()
    }
    
    const newMessages = [welcomeMessage]
    setMessages(newMessages)
    await saveReflection(newMessages, newSessionState)
    setIsLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading || sessionState.isComplete) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Update session state
      const updatedSessionState: SessionState = {
        ...sessionState,
        questionCount: sessionState.questionCount + 1
      }

      const aiResponse = await generateContextualQuestion(updatedMessages, updatedSessionState)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      
      // Check if session should be marked complete
      const elapsedMinutes = (Date.now() - updatedSessionState.startTime) / (1000 * 60)
      const finalSessionState: SessionState = {
        ...updatedSessionState,
        isComplete: shouldEndSession(updatedSessionState, elapsedMinutes)
      }

      setMessages(finalMessages)
      setSessionState(finalSessionState)
      await saveReflection(finalMessages, finalSessionState)
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Daily Reflection</h1>
        </div>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <Card className="min-h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span>Your Reflection Space</span>
            </div>
            {hasStarted && !sessionState.isComplete && (
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>{sessionState.questionCount}/{sessionState.maxQuestions}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{Math.round((currentTime - sessionState.startTime) / (1000 * 60))}min</span>
                </div>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {!hasStarted ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Ready for today's reflection?</h3>
                  <p className="text-muted-foreground mb-6">
                    Take 15-20 minutes to reflect on your progress, challenges, and plans. 
                    I'll ask 3-5 focused questions to help you gain clarity and momentum.
                  </p>
                </div>
                <Button onClick={startReflection} size="lg" className="w-full">
                  Start Today's Reflection
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 mb-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {sessionState.isComplete ? (
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Reflection Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    Great work today. Your insights have been saved and will help track your progress over time.
                  </p>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Share your thoughts..."
                    className="flex-1 min-h-[60px] resize-none"
                    disabled={isLoading || sessionState.isComplete}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading || sessionState.isComplete}
                    size="lg"
                    className="px-4"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}