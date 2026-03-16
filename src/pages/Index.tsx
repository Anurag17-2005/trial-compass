import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { MessageCircle, Search, Map } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-primary" />
          <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
                Find Clinical Trials Across Canada
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8 leading-relaxed">
                Not sure where to start? Just have a conversation with our AI assistant — it will guide you step by step to find trials that match your condition.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/assistant"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-accent text-accent-foreground font-semibold text-base hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="w-5 h-5" />
                  Start a Conversation
                </Link>
                <Link
                  to="/search"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border-2 border-primary-foreground/30 text-primary-foreground font-semibold text-base hover:bg-primary-foreground/10 transition-colors"
                >
                  <Search className="w-5 h-5" />
                  Search Trials Directly
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* New to this? banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-12 text-center">
            <p className="text-foreground font-medium mb-2">
              🆕 New here? No worries — our AI assistant makes it simple.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Just describe your condition in plain language and we'll find matching trials for you. No medical jargon needed.
            </p>
            <Link
              to="/assistant"
              className="inline-flex items-center gap-1 text-primary font-semibold text-sm hover:underline"
            >
              Try the chat assistant →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Chat with AI",
                desc: "Tell us about your condition in your own words. Our assistant will ask simple questions to understand your needs.",
                icon: <MessageCircle className="w-8 h-8" />,
              },
              {
                title: "Get Matched",
                desc: "We compare your information with available trials and show you the best matches, ranked by relevance and proximity.",
                icon: <Search className="w-8 h-8" />,
              },
              {
                title: "Explore on Map",
                desc: "See trial locations near you on an interactive map. Click any pin to view trial details and contact information.",
                icon: <Map className="w-8 h-8" />,
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-card border border-border rounded-xl p-6">
                <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
