/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDashboard from './pages/AdminDashboard';
import ClientAppointments from './pages/ClientAppointments';
import ClientDashboard from './pages/ClientDashboard';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import OtherServices from './pages/OtherServices';
import ProfessionalCard from './pages/ProfessionalCard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import ProfessionalProfile from './pages/ProfessionalProfile';
import ProfessionalReviews from './pages/ProfessionalReviews';
import ProfessionalSchedule from './pages/ProfessionalSchedule';
import SearchProfessionals from './pages/SearchProfessionals';
import PublicProfile from './pages/PublicProfile';
import RequestQuote from './pages/RequestQuote';
import ClientQuotes from './pages/ClientQuotes';
import ProfessionalQuotes from './pages/ProfessionalQuotes';
import JobOpportunities from './pages/JobOpportunities';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "ClientAppointments": ClientAppointments,
    "ClientDashboard": ClientDashboard,
    "Home": Home,
    "Onboarding": Onboarding,
    "OtherServices": OtherServices,
    "ProfessionalCard": ProfessionalCard,
    "ProfessionalDashboard": ProfessionalDashboard,
    "ProfessionalProfile": ProfessionalProfile,
    "ProfessionalReviews": ProfessionalReviews,
    "ProfessionalSchedule": ProfessionalSchedule,
    "SearchProfessionals": SearchProfessionals,
    "PublicProfile": PublicProfile,
    "RequestQuote": RequestQuote,
    "ClientQuotes": ClientQuotes,
    "ProfessionalQuotes": ProfessionalQuotes,
    "JobOpportunities": JobOpportunities,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};