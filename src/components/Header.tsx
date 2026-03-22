import { Link, useLocation } from "react-router-dom";
import ProfileDialog from "./ProfileDialog";
import { UserProfile } from "@/data/types";

interface HeaderProps {
  userProfile?: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
}

const Header = ({ userProfile, onProfileUpdate }: HeaderProps) => {
  const location = useLocation();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">Cancer Trials</span>
          <span className="text-lg font-bold text-foreground">Canada</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={location.pathname === "/" ? "nav-link font-semibold" : "nav-link"}
          >
            Home
          </Link>
          <Link
            to="/search"
            className={location.pathname === "/search" ? "nav-link-active" : "nav-link"}
          >
            Search for clinical trials
          </Link>
          <Link
            to="/assistant"
            data-tour="nav-ai-assistant"
            className={location.pathname === "/assistant" ? "nav-link font-semibold" : "nav-link"}
          >
            AI Assistant
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-sm text-muted-foreground">English</span>
          {userProfile && onProfileUpdate && (
            <ProfileDialog userProfile={userProfile} onProfileUpdate={onProfileUpdate} />
          )}
        </div>

        <button className="md:hidden p-2" aria-label="Menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
