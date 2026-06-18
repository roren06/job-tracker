import React from "react";
import { useMe } from "../hooks/useMe";

type Page = "board" | "analytics";

export function ProfileMenu({
  page,
  theme,
  onToggleTheme,
  onGoBoard,
  onGoAnalytics,
  onLogout,
}: {
  page: Page;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onGoBoard: () => void;
  onGoAnalytics: () => void;
  onLogout: () => void;
}) {
  const { data } = useMe();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  const label =
    (data?.user?.name && String(data.user.name).trim()) ||
    (data?.user?.email && String(data.user.email).trim()) ||
    "Account";

  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className={`profileMenu${open ? " isOpen" : ""}`} ref={ref}>
      <button
        type="button"
        className="logoutBtn profileBtn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="profileAvatar" aria-hidden="true">
          <span className="profileAvatarIcon">👤</span>
        </span>
        <span className="profileLabel">{label}</span>
        <span className="profileChevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="profileDropdown" role="menu">
          {page === "board" ? (
            <button
              type="button"
              className="profileItem"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onGoAnalytics();
              }}
            >
              Analytics
            </button>
          ) : (
            <button
              type="button"
              className="profileItem"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onGoBoard();
              }}
            >
              Board
            </button>
          )}

          <button
            type="button"
            className="profileItem"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onToggleTheme();
            }}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <div className="profileDivider" />

          <button
            type="button"
            className="profileItem danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
