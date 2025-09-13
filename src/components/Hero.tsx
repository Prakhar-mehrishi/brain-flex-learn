import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Zap, Users } from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 gradient-hero opacity-90" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <div className="glass p-4 rounded-xl">
          <Brain className="w-8 h-8 text-primary" />
        </div>
      </div>
      <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: '2s' }}>
        <div className="glass p-3 rounded-lg">
          <Zap className="w-6 h-6 text-primary" />
        </div>
      </div>
      <div className="absolute bottom-32 left-20 animate-float" style={{ animationDelay: '4s' }}>
        <div className="glass p-3 rounded-lg">
          <Users className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm mb-6">
              <Zap className="w-4 h-4" />
              <span>AI-Powered Learning Platform</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Adaptive
              <span className="block gradient-text">Quiz Platform</span>
            </h1>
            
            <p className="text-xl text-white/80 mb-8 max-w-xl">
              Transform learning with AI-generated quizzes that adapt to your progress. 
              Perfect for individuals and organizations seeking personalized education.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button variant="hero" size="xl" className="group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="glass" size="xl" className="text-white">
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center gap-8 text-white/60 text-sm">
              <div className="flex items-center gap-2">
                ✨ <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                🚀 <span>Setup in 2 minutes</span>
              </div>
            </div>
          </div>
          
          {/* Hero Image */}
          <div className="relative">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 animate-pulse-glow">
              <img 
                src={heroDashboard} 
                alt="Adaptive AI Quiz Platform Dashboard"
                className="w-full h-auto rounded-xl shadow-2xl"
              />
              
              {/* Floating Stats */}
              <div className="absolute -top-4 -right-4 glass p-4 rounded-xl">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">98%</div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 glass p-4 rounded-xl">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">10k+</div>
                  <div className="text-xs text-muted-foreground">Learners</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;