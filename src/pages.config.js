/**
 * pages.config.js - Page routing configuration with Lazy Loading
 */
import { lazy } from 'react';

// Layout carrega normalmente pois é usado em todas as páginas
import __Layout from './Layout.jsx';

// Lazy loading para todas as páginas - só carrega quando necessário
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ClientAppointments = lazy(() => import('./pages/ClientAppointments'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const Home = lazy(() => import('./pages/Home'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OtherServices = lazy(() => import('./pages/OtherServices'));
const ProfessionalCard = lazy(() => import('./pages/ProfessionalCard'));
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard'));
const ProfessionalProfile = lazy(() => import('./pages/ProfessionalProfile'));
const ProfessionalReviews = lazy(() => import('./pages/ProfessionalReviews'));
const ProfessionalSchedule = lazy(() => import('./pages/ProfessionalSchedule'));
const SearchProfessionals = lazy(() => import('./pages/SearchProfessionals'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const RequestQuote = lazy(() => import('./pages/RequestQuote'));
const ClientQuotes = lazy(() => import('./pages/ClientQuotes'));
const ProfessionalQuotes = lazy(() => import('./pages/ProfessionalQuotes'));
const JobOpportunities = lazy(() => import('./pages/JobOpportunities'));
const Login = lazy(() => import('./pages/Login'));

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
