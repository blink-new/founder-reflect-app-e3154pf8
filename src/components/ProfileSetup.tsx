import { useState, useEffect, useCallback } from 'react'
import { User, Building, Target, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useToast } from '../hooks/use-toast'

interface ProfileSetupProps {
  user: any
  onProfileComplete?: () => void
}

interface FounderProfile {
  companyName: string
  industry: string
  stage: string
  goals: string[]
  currentChallenges: string[]
  reflectionStreak: number
  lastReflectionDate: string
}

export function ProfileSetup({ user, onProfileComplete }: ProfileSetupProps) {
  const [profile, setProfile] = useState<FounderProfile>({
    companyName: '',
    industry: '',
    stage: 'pre-seed',
    goals: [],
    currentChallenges: [],
    reflectionStreak: 0,
    lastReflectionDate: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [challengeInput, setChallengeInput] = useState('')
  const { toast } = useToast()

  const loadProfile = useCallback(() => {
    if (!user?.id) return

    const savedProfile = localStorage.getItem(`founder_profile_${user.id}`)
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile))
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }
  }, [user?.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const saveProfile = async () => {
    // Validate required fields
    if (!profile.companyName.trim()) {
      toast({
        title: "Required Field Missing",
        description: "Please enter your company name.",
        variant: "destructive"
      })
      return
    }

    if (!profile.industry.trim()) {
      toast({
        title: "Required Field Missing", 
        description: "Please enter your industry.",
        variant: "destructive"
      })
      return
    }

    if (!profile.stage) {
      toast({
        title: "Required Field Missing",
        description: "Please select your current stage.",
        variant: "destructive"
      })
      return
    }

    if (profile.goals.length === 0) {
      toast({
        title: "Required Field Missing",
        description: "Please add at least one goal.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      const profileData = {
        ...profile,
        updatedAt: new Date().toISOString()
      }
      
      localStorage.setItem(`founder_profile_${user.id}`, JSON.stringify(profileData))
      
      toast({
        title: "Profile Saved",
        description: "Your founder profile has been updated successfully."
      })

      // Call the completion callback if provided
      if (onProfileComplete) {
        onProfileComplete()
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addGoal = () => {
    if (goalInput.trim() && !profile.goals.includes(goalInput.trim())) {
      setProfile(prev => ({
        ...prev,
        goals: [...prev.goals, goalInput.trim()]
      }))
      setGoalInput('')
    }
  }

  const removeGoal = (goalToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      goals: prev.goals.filter(goal => goal !== goalToRemove)
    }))
  }

  const addChallenge = () => {
    if (challengeInput.trim() && !profile.currentChallenges.includes(challengeInput.trim())) {
      setProfile(prev => ({
        ...prev,
        currentChallenges: [...prev.currentChallenges, challengeInput.trim()]
      }))
      setChallengeInput('')
    }
  }

  const removeChallenge = (challengeToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      currentChallenges: prev.currentChallenges.filter(challenge => challenge !== challengeToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      action()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Profile</h1>
        <p className="text-muted-foreground">
          Tell us about your startup journey to get personalized coaching. Fields marked with <span className="text-red-500">*</span> are required.
        </p>
      </div>

      <div className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <span>Company Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={profile.companyName}
                  onChange={(e) => setProfile(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter your company name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="industry">
                  Industry <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="industry"
                  value={profile.industry}
                  onChange={(e) => setProfile(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., SaaS, E-commerce, FinTech"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="stage">
                Current Stage <span className="text-red-500">*</span>
              </Label>
              <Select
                value={profile.stage}
                onValueChange={(value) => setProfile(prev => ({ ...prev, stage: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your current stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea Stage</SelectItem>
                  <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="series-a">Series A</SelectItem>
                  <SelectItem value="series-b">Series B+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-accent" />
              <span>Your Goals <span className="text-red-500">*</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addGoal)}
                placeholder="Add a goal (e.g., Launch MVP, Get first 100 users)"
                className="flex-1"
              />
              <Button onClick={addGoal} disabled={!goalInput.trim()}>
                Add
              </Button>
            </div>
            {profile.goals.length > 0 && (
              <div className="space-y-2">
                {profile.goals.map((goal, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">{goal}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGoal(goal)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-orange-500" />
              <span>Current Challenges</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={challengeInput}
                onChange={(e) => setChallengeInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addChallenge)}
                placeholder="Add a challenge (e.g., Finding product-market fit, Time management)"
                className="flex-1"
              />
              <Button onClick={addChallenge} disabled={!challengeInput.trim()}>
                Add
              </Button>
            </div>
            {profile.currentChallenges.length > 0 && (
              <div className="space-y-2">
                {profile.currentChallenges.map((challenge, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">{challenge}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChallenge(challenge)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div>
                <Label>User ID</Label>
                <Input value={user?.id || ''} disabled className="bg-muted text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={saveProfile} disabled={isLoading} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : onProfileComplete ? 'Complete Setup' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  )
}