import type { ReactNode } from "react";
import { ProfileMenu } from "./ProfileMenu";
import "./AppHeader.css";

type Page = "board" | "analytics";

export function AppHeader({
  page,
  subtitle,
  totalCount,
  totalLabel = "applications",
  search,
  actions,
  theme,
  onToggleTheme,
  onGoBoard,
  onGoAnalytics,
  onLogout,
}: {
  page: Page;
  subtitle: string;
  totalCount: number;
  totalLabel?: string;
  search?: ReactNode;
  actions?: ReactNode;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onGoBoard: () => void;
  onGoAnalytics: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="topbarSticky">
      <div className="topbarPill">
        <div className="topbarHead">
          <div className="topbarBrandCluster">
            <div className="brandBlock">
              <img src="/jobtracker.png" alt="" className="brandIcon" />
              <div className="brandCopy">
                <div className="brandTitle">Job Tracker</div>
                <div className="brandSub">{subtitle}</div>
              </div>
            </div>

            <div className="totalBadge">
              <span className="totalBadgeCount">{totalCount}</span>
              <span className="totalBadgeLabel">{totalLabel}</span>
            </div>
          </div>

          {search ?? <div className="topbarHeadSpacer" aria-hidden="true" />}

          <ProfileMenu
            page={page}
            theme={theme}
            onToggleTheme={onToggleTheme}
            onGoBoard={onGoBoard}
            onGoAnalytics={onGoAnalytics}
            onLogout={onLogout}
          />
        </div>

        {actions ? <div className="topbarActions">{actions}</div> : null}
      </div>
    </div>
  );
}
