import { cn } from "@/lib/utils";

interface BiolegendLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

import { useCurrentCompany } from '@/contexts/CompanyContext';

export function BiolegendLogo({ className, size = "md", showText = true }: BiolegendLogoProps) {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-20 w-20",
    xl: "h-28 w-28",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const { currentCompany } = useCurrentCompany();
  const logoSrc = currentCompany?.logo_url || '/company-logo.svg';
  const companyName = currentCompany?.name || 'Company';

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        <img
          src={logoSrc}
          alt={companyName}
          className="w-full h-full object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-primary", textSizeClasses[size])}>
            {companyName.split(' ')[0]?.toUpperCase() || 'COMPANY'}
          </span>
          <span className={cn("text-xs text-secondary font-medium -mt-1", size === "sm" && "text-[10px]")}>
            {(companyName.split(' ').slice(1).join(' ') || 'MANAGEMENT').toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
