import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useCompanies } from '@/hooks/useDatabase';

interface CompanyContextType {
  currentCompany: any | null;
  isLoading: boolean;
  error: Error | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: companies, isLoading, error } = useCompanies();
  const defaultCompanyId = import.meta.env.VITE_DEFAULT_COMPANY_ID?.trim();
  const defaultCompanyName = import.meta.env.VITE_DEFAULT_COMPANY_NAME?.trim().toLowerCase();

  const currentCompany = useMemo(() => {
    if (!companies || companies.length === 0) {
      return null;
    }

    if (defaultCompanyId) {
      const matchById = companies.find(company => company.id === defaultCompanyId);
      if (matchById) {
        return matchById;
      }
    }

    if (defaultCompanyName) {
      const matchByName = companies.find(company => company.name?.toLowerCase() === defaultCompanyName);
      if (matchByName) {
        return matchByName;
      }
    }

    return companies[0];
  }, [companies, defaultCompanyId, defaultCompanyName]);

  return (
    <CompanyContext.Provider value={{ currentCompany, isLoading, error }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCurrentCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCurrentCompany must be used within a CompanyProvider');
  }
  return context;
}

export function useCurrentCompanyId() {
  const { currentCompany } = useCurrentCompany();
  return currentCompany?.id;
}
