/**
 * pages.config.js - Page routing configuration with Lazy Loading
 */
import { lazy } from 'react';

// Layout carrega normalmente pois é usado em todas as páginas
import __Layout from './Layout.jsx';

// Lazy loading para todas as páginas - só carrega quando necessário
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const ClientAppointments = lazy(() => import('./pages/ClientAppointments.jsx'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard.jsx'));
const Home = lazy(() => import('./pages/Home.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const OtherServices = lazy(() => import('./pages/OtherServices.jsx'));
const ProfessionalCard = lazy(() => import('./pages/ProfessionalCard.jsx'));
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard.jsx'));
const ProfessionalProfile = lazy(() => import('./pages/ProfessionalProfile.jsx'));
const ProfessionalReviews = lazy(() => import('./pages/ProfessionalReviews.jsx'));
const ProfessionalSchedule = lazy(() => import('./pages/ProfessionalSchedule.jsx'));
const SearchProfessionals = lazy(() => import('./pages/SearchProfessionals.jsx'));
const PublicProfile = lazy(() => import('./pages/PublicProfile.jsx'));
const RequestQuote = lazy(() => import('./pages/RequestQuote.jsx'));
const ClientQuotes = lazy(() => import('./pages/ClientQuotes.jsx'));
const ProfessionalQuotes = lazy(() => import('./pages/ProfessionalQuotes.jsx'));
const JobOpportunities = lazy(() => import('./pages/JobOpportunities.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));

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
    Login: Login,
};
