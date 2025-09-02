import { cn } from "@/lib/utils";

interface BiolegendLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

import { useCurrentCompany } from '@/contexts/CompanyContext';

export function BiolegendLogo({ className, size = "md", showText = true }: BiolegendLogoProps) {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-20 w-20"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl"
  };

  const { currentCompany } = useCurrentCompany();
  const logoSrc = currentCompany?.logo_url || 'https://cdn.builder.io/api/v1/image/assets%2Fb048b36350454e4dba55aefd37788f9c%2Fbd04dab542504461a2451b061741034c?format=webp&width=800';
  const companyName = currentCompany?.name || 'Layons Construction Limited';

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
            {companyName.split(' ')[0]?.toUpperCase() || 'LAYONS'}
          </span>
          <span className={cn("text-xs text-secondary font-medium -mt-1", size === "sm" && "text-[10px]")}>
            {(companyName.split(' ').slice(1).join(' ') || 'CONSTRUCTION LIMITED').toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
