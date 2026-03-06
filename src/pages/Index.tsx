import { Link } from "react-router-dom";
import Header from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-primary" />
          <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
                Find Clinical Trials Across Canada
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8 leading-relaxed">
                Search thousands of clinical trials, check your eligibility, and connect with research centres near you. Our AI assistant can help match you with the right trial.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/search"
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-accent text-accent-foreground font-semibold text-base hover:opacity-90 transition-opacity"
                >
                  Search Clinical Trials
                </Link>
                <Link
                  to="/assistant"
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-primary-foreground/30 text-primary-foreground font-semibold text-base hover:bg-primary-foreground/10 transition-colors"
                >
                  Talk to AI Assistant
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Search Trials",
                desc: "Browse and filter clinical trials by cancer type, stage, location, treatment type, and more.",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
              },
              {
                title: "AI-Powered Matching",
                desc: "Describe your condition in plain language and our AI assistant will find relevant trials and check eligibility.",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                ),
              },
              {
                title: "Interactive Map",
                desc: "Locate trial centres near you with our interactive map. See which centres are recruiting and get directions.",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
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
