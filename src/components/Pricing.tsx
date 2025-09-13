import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Individual",
      price: "$9",
      period: "/month",
      description: "Perfect for personal learning and skill development",
      features: [
        "Up to 50 AI-generated quizzes per month",
        "Personal progress tracking",
        "Basic analytics dashboard",
        "Mobile app access",
        "Community support",
        "Quiz sharing capabilities"
      ],
      popular: false,
      cta: "Start Free Trial"
    },
    {
      name: "Professional",
      price: "$29",
      period: "/month",
      description: "Ideal for educators and small teams",
      features: [
        "Unlimited AI-generated quizzes",
        "Advanced analytics & reporting",
        "Team collaboration tools",
        "Custom branding options",
        "Priority support",
        "API access",
        "Bulk user management",
        "Advanced gamification"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Tailored solutions for large organizations",
      features: [
        "Everything in Professional",
        "Unlimited team members",
        "SSO integration",
        "Custom AI model training",
        "Dedicated account manager",
        "On-premise deployment",
        "Advanced security features",
        "Custom integrations",
        "SLA guarantee"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 text-primary text-sm mb-6">
            <Star className="w-4 h-4" />
            <span>Simple Pricing</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Choose the perfect plan
            <span className="gradient-text block">for your learning journey</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Start with our free trial and upgrade as you grow. All plans include 
            our core AI features with no setup fees.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-muted rounded-full p-1">
            <span className="px-4 py-2 text-sm text-muted-foreground">Monthly</span>
            <span className="px-4 py-2 text-sm bg-background rounded-full shadow-sm font-medium">
              Annual (Save 20%)
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                plan.popular 
                  ? 'gradient-card border-primary shadow-glow scale-105' 
                  : 'glass border-border/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="gradient-bg text-white px-4 py-1 text-sm font-semibold">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-base mb-4">{plan.description}</CardDescription>
                
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-4xl font-bold ${plan.popular ? 'gradient-text' : ''}`}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        plan.popular 
                          ? 'gradient-bg text-white' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  variant={plan.popular ? "hero" : "outline"} 
                  size="lg" 
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="glass rounded-2xl p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Not sure which plan is right for you?</h3>
            <p className="text-muted-foreground mb-6">
              All plans come with a 14-day free trial. No credit card required. 
              Cancel anytime with full money-back guarantee.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg">
                Compare All Features
              </Button>
              <Button variant="ghost" size="lg">
                Talk to Our Team
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;