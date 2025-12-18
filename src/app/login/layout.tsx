import "../globals.css";
import { Providers } from "../providers";

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--bg-primary)",
            zIndex: 1000
        }}>
            <Providers>
                {children}
            </Providers>
        </div>
    );
}
