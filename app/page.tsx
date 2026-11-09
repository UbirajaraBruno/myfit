import { env } from "cloudflare:workers";
import { StandaloneApp } from "./standalone-app";

export const dynamic = "force-dynamic";

export default function Home() {
  return <StandaloneApp projectUrl={env.SUPABASE_URL ?? ""} publishableKey={env.SUPABASE_PUBLISHABLE_KEY ?? ""} />;
}

