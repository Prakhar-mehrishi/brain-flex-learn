import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  FileText, 
  Award, 
  BarChart3,
  Zap,
  Shield,
  Clock
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Content Generation",
      description: "Generate personalized quizzes from any document or text using advanced AI algorithms.",
      highlight: true
    },
    {
      icon: TrendingUp,
      title: "Adaptive Learning Engine",
      description: "Questions automatically adjust difficulty based on performance to optimize learning outcomes.",
      highlight: false
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive insights into learning patterns, progress tracking, and performance metrics.",
      highlight: false
    },
    {
      icon: Users,
      title: "Multi-Tenant Architecture",
      description: "Secure organizational support with role-based access and data isolation.",
      highlight: false
    },
    {
      icon: Award,
      title: "Gamification System",
      description: "Engaging badges, streaks, leaderboards, and achievements to motivate learners.",
      highlight: false
    },
    {
      icon: FileText,
      title: "Smart Content Management",
      description: "Upload documents in multiple formats and let AI extract quiz-worthy content.",
      highlight: true
    },
    {
      icon: Zap,
      title: "Real-Time Adaptivity",
      description: "Questions adapt in real-time based on current performance and learning patterns.",
      highlight: false
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with SSO integration and compliance-ready data handling.",
      highlight: false
    },
    {
      icon: Clock,
      title: "Instant Feedback",
      description: "AI-generated explanations and personalized learning recommendations.",
      highlight: false
    }
  ];

  return (
    <section className="py-24 bg-gradient-secondary">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 text-primary text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>Powerful Features</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Everything you need for
            <span className="gradient-text block">intelligent learning</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our platform combines cutting-edge AI with proven learning methodologies 
            to create the most effective quiz experience for learners and organizations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className={`relative transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                feature.highlight 
                  ? 'gradient-card border-primary/20 shadow-glow' 
                  : 'glass border-border/50'
              }`}
            >
              {feature.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="gradient-bg text-white text-xs px-3 py-1 rounded-full font-semibold">
                    Popular
                  </span>
                </div>
              )}
              
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  feature.highlight 
                    ? 'gradient-bg text-white shadow-button' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="glass rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Ready to transform learning?</h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of learners and organizations already using our AI-powered platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg">
                Start Free Trial
              </Button>
              <Button variant="outline" size="lg">
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;