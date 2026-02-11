/**
 * Constantes de limites do Portfolio por tipo de plano
 */

export const PORTFOLIO_LIMITS = {
  FREE: {
    MAX_PROJECTS: 3,
    MAX_PHOTOS_PER_PROJECT: 5
  },
  PREMIUM: {
    MAX_PROJECTS: 10,
    MAX_PHOTOS_PER_PROJECT: 10
  }
};

/**
 * Verifica se o profissional tem plano premium ativo
 */
export const isPremiumPlan = (professional) => {
  if (!professional) return false;

  const isPremium = professional.plan_active &&
                    professional.plan_type !== 'free' &&
                    professional.plan_type !== null;

  // Verificar se o plano não expirou
  if (isPremium && professional.plan_expires_at) {
    const expiresAt = new Date(professional.plan_expires_at);
    if (expiresAt < new Date()) {
      return false;
    }
  }

  return isPremium;
};

/**
 * Retorna os limites do portfolio baseado no plano do profissional
 */
export const getPortfolioLimits = (professional) => {
  return isPremiumPlan(professional)
    ? PORTFOLIO_LIMITS.PREMIUM
    : PORTFOLIO_LIMITS.FREE;
};

/**
 * Verifica se o profissional pode adicionar mais projetos
 */
export const canAddProject = (professional, currentCount) => {
  const limits = getPortfolioLimits(professional);
  return currentCount < limits.MAX_PROJECTS;
};

/**
 * Verifica se o profissional pode adicionar mais fotos em um projeto
 */
export const canAddPhoto = (professional, currentPhotoCount) => {
  const limits = getPortfolioLimits(professional);
  return currentPhotoCount < limits.MAX_PHOTOS_PER_PROJECT;
};

/**
 * Retorna quantos projetos ainda podem ser adicionados
 */
export const getRemainingProjects = (professional, currentCount) => {
  const limits = getPortfolioLimits(professional);
  return Math.max(0, limits.MAX_PROJECTS - currentCount);
};

/**
 * Retorna quantas fotos ainda podem ser adicionadas em um projeto
 */
export const getRemainingPhotos = (professional, currentPhotoCount) => {
  const limits = getPortfolioLimits(professional);
  return Math.max(0, limits.MAX_PHOTOS_PER_PROJECT - currentPhotoCount);
};
