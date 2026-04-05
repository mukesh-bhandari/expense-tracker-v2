import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSignInAlt, 
  faUserPlus, 
  faChartLine, 
  faWallet, 
  faShieldAlt, 
  faMobile, 
  faBell, 
  faUsers,
  faArrowRight,
  faDollarSign,
  faCalendarAlt,
  faTags
} from "@fortawesome/free-solid-svg-icons";

function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: faChartLine,
      title: "Smart Analytics",
      description: "Get detailed insights into your spending patterns with interactive charts and reports."
    },
    {
      icon: faWallet,
      title: "Multiple Accounts",
      description: "Track expenses across different accounts, credit cards, and payment methods."
    },
    {
      icon: faTags,
      title: "Category Management",
      description: "Organize your expenses with custom categories and automatic categorization."
    },
    {
      icon: faCalendarAlt,
      title: "Budget Planning",
      description: "Set monthly budgets and get alerts when you're approaching your limits."
    },
    {
      icon: faShieldAlt,
      title: "Secure & Private",
      description: "Your financial data is encrypted and stored securely with bank-level security."
    },
    {
      icon: faMobile,
      title: "Multi-Platform",
      description: "Access your expenses anywhere with our responsive web and mobile apps."
    }
  ];

  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "$2M+", label: "Tracked Expenses" },
    { number: "50+", label: "Countries" },
    { number: "4.9★", label: "User Rating" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faDollarSign} className="text-primary-foreground text-lg" />
              </div>
              <span className="text-xl font-bold text-foreground">ExpenseTracker</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/login")}
                className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="btn-primary-expense px-4 py-2 text-sm font-semibold"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Take Control of Your
            <span className="text-primary block">Financial Future</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Track, analyze, and optimize your spending with our intelligent expense tracking platform. 
            Make informed financial decisions with powerful insights and easy-to-use tools.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={() => navigate("/signup")}
              className="btn-primary-expense px-8 py-4 text-lg font-semibold flex items-center gap-3"
            >
              <FontAwesomeIcon icon={faUserPlus} />
              Start Tracking for Free
              <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 flex items-center gap-3"
            >
              <FontAwesomeIcon icon={faSignInAlt} />
              Sign In
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-border pt-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage Your Expenses
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make expense tracking simple, intuitive, and insightful.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="expense-form p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={feature.icon} className="text-primary text-xl" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Start Tracking in 3 Simple Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Create Your Account</h3>
              <p className="text-muted-foreground">Sign up with your Gmail in seconds and verify your email to get started.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Add Your Expenses</h3>
              <p className="text-muted-foreground">Easily log your daily expenses with our intuitive interface and smart categorization.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Track & Optimize</h3>
              <p className="text-muted-foreground">Analyze your spending patterns and make informed decisions with detailed reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Join thousands of users who have already transformed their financial habits with ExpenseTracker.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/signup")}
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 py-4 text-lg font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <FontAwesomeIcon icon={faUserPlus} />
              Get Started Free
            </button>
            <button
              onClick={() => navigate("/login")}
              className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3"
            >
              <FontAwesomeIcon icon={faSignInAlt} />
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faDollarSign} className="text-primary-foreground text-sm" />
              </div>
              <span className="text-lg font-bold text-foreground">ExpenseTracker</span>
            </div>
            
            <div className="text-muted-foreground text-sm">
              © 2025 ExpenseTracker. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;