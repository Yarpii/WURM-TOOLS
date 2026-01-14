"use client";

interface RoleBadgeProps {
  name: string;
  displayName: string;
  color: string;
  icon?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

// Icon mapping to simple unicode/emoji alternatives
const iconMap: Record<string, string> = {
  "shield-check": "\u{1F6E1}",
  "shield": "\u{1F6E1}",
  "hand-helping": "\u{1F91D}",
  "pencil": "\u{270F}",
  "badge-check": "\u{2714}",
  "star": "\u{2B50}",
  "crown": "\u{1F451}",
  "hammer": "\u{1F528}",
  "heart": "\u{2764}",
  "user": "\u{1F464}",
};

export function RoleBadge({
  name,
  displayName,
  color,
  icon = "user",
  size = "sm",
  showIcon = true,
}: RoleBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
        borderWidth: "1px",
      }}
      title={name}
    >
      {showIcon && icon && iconMap[icon] && (
        <span className={iconSize[size]}>{iconMap[icon]}</span>
      )}
      {displayName}
    </span>
  );
}

interface RoleBadgesProps {
  roles: Array<{
    role_name: string;
    role_display_name: string;
    role_color: string;
    role_icon?: string;
  }>;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  maxDisplay?: number;
}

export function RoleBadges({
  roles,
  size = "sm",
  showIcon = true,
  maxDisplay = 3,
}: RoleBadgesProps) {
  if (!roles || roles.length === 0) return null;

  const displayedRoles = roles.slice(0, maxDisplay);
  const remainingCount = roles.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {displayedRoles.map((role) => (
        <RoleBadge
          key={role.role_name}
          name={role.role_name}
          displayName={role.role_display_name}
          color={role.role_color}
          icon={role.role_icon}
          size={size}
          showIcon={showIcon}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-text-muted text-xs">+{remainingCount} more</span>
      )}
    </div>
  );
}

export default RoleBadge;
