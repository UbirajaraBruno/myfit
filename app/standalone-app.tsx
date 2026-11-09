"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { MyFitApp } from "./myfit-app";
import { readSession, requestPasswordReset, setNewPassword, signIn, signOut, signUp, type SupabaseSession } from "./supabase-client";

type View = "login" | "signup" | "forgot" | "recovery";

export function StandaloneApp({ projectUrl, publishableKey }: { projectUrl: string; publishableKey: string }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [view, setView] = useState<View>("login");
  const [ready, setReady] = useState(false);
  const configured = Boolean(projectUrl && publishableKey);

  useEffect(() => {
    if (!configured) { setReady(true); return; }
    readSession(projectUrl, publishableKey).then(({ session, recovery }) => {
      setSession(session);
      if (recovery) setView("recovery");
    }).catch(() => {}).finally(() => setReady(true));
  }, [configured, projectUrl, publishableKey]);

  if (!ready) return <div className="auth-loading"><LoaderCircle size={23}/><span>Carregando seu espaço…</span></div>;
  if (!configured) return <AuthScreen view="login" onViewChange={setView} projectUrl={projectUrl} publishableKey={publishableKey} />;
  if (session && view !== "recovery") return <MyFitApp userName={session.user.email || "Minha conta"} projectUrl={projectUrl} publishableKey={publishableKey} session={session} onLogout={() => { signOut(); setSession(null); setView("login"); }} />;
  return <AuthScreen view={view} onViewChange={setView} projectUrl={projectUrl} publishableKey={publishableKey} session={session} onAuthenticated={setSession} />;
}

function AuthScreen({ view, onViewChange, projectUrl, publishableKey, session, onAuthenticated }: { view: View; onViewChange: (view: View) => void; projectUrl: string; publishableKey: string; session?: SupabaseSession | null; onAuthenticated?: (session: SupabaseSession | null) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const updateView = (next: View) => { onViewChange(next); setMessage(""); setError(""); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (view === "signup") {
        if (password !== confirm) throw new Error("As senhas não coincidem.");
        if (password.length < 8) throw new Error("Use uma senha com pelo menos 8 caracteres.");
        const signedIn = await signUp(projectUrl, publishableKey, email, password);
        if (signedIn) {
          const result = await readSession(projectUrl, publishableKey);
          onAuthenticated?.(result.session);
          setMessage(result.session ? "Conta criada. Bem-vinda ao MyFit!" : "Confira seu e-mail para confirmar o cadastro.");
        } else setMessage("Cadastro iniciado. Confira seu e-mail para confirmar a conta antes de entrar.");
      } else if (view === "login") {
        const next = await signIn(projectUrl, publishableKey, email, password);
        onAuthenticated?.(next);
      } else if (view === "forgot") {
        await requestPasswordReset(projectUrl, publishableKey, email);
        setMessage("Se este e-mail tiver uma conta, enviaremos um link para redefinir a senha.");
      } else {
        if (password.length < 8) throw new Error("Use uma senha com pelo menos 8 caracteres.");
        if (password !== confirm) throw new Error("As senhas não coincidem.");
        if (!session) throw new Error("O link expirou. Solicite uma nova redefinição de senha.");
        await setNewPassword(projectUrl, publishableKey, session, password);
        onAuthenticated?.(null);
        updateView("login");
        setMessage("Senha atualizada. Entre com sua nova senha.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível concluir. Tente novamente.";
      setError(message.includes("Invalid login credentials") ? "E-mail ou senha incorretos." : message.includes("User already registered") ? "Este e-mail já tem cadastro. Entre na sua conta." : message);
    } finally { setBusy(false); }
  };

  const title = view === "signup" ? "Crie sua conta" : view === "forgot" ? "Recuperar senha" : view === "recovery" ? "Nova senha" : "Que bom ter você aqui";
  const subtitle = view === "signup" ? "Seu espaço de treino começa com você." : view === "forgot" ? "Enviaremos um link seguro para seu e-mail." : view === "recovery" ? "Escolha uma nova senha para sua conta." : "Entre para acompanhar sua jornada.";
  return <main className="auth-page"><section className="auth-brand-panel"><div className="auth-brand"><span className="brand-mark"><Activity size={22}/></span><span>my<span className="brand-lilac">fit</span><small>MEU TREINO, MINHA EVOLUÇÃO</small></span></div><div className="auth-message"><span className="auth-overline">SUA JORNADA, DO SEU JEITO</span><h1>Um passo de cada vez.<br/><em>Mais forte a cada dia.</em></h1><p>Treinos, registros e pequenas vitórias em um espaço feito para você.</p><div className="auth-benefit"><span><ShieldCheck size={19}/></span><div><b>Privacidade em primeiro lugar</b><small>Seus dados de treino ficam ligados à sua conta.</small></div></div></div><div className="auth-panel-foot">MYFIT <i>·</i> SEU TREINO, SEU RITMO</div></section><section className="auth-form-panel"><div className="auth-card"><div className="auth-mobile-brand"><span className="brand-mark"><Activity size={19}/></span><b>my<span className="brand-lilac">fit</span></b></div><div className="auth-head"><span className="auth-icon">{view === "forgot" || view === "recovery" ? <LockKeyhole size={19}/> : <Mail size={19}/>}</span><h2>{title}</h2><p>{subtitle}</p></div>{!configured && <div className="auth-alert">O login independente ainda precisa dos dados públicos do projeto Supabase.</div>}{error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="auth-success" role="status"><Check size={16}/>{message}</div>}<form onSubmit={submit}>
    {(view === "login" || view === "signup" || view === "forgot") && <label className="auth-label">E-mail<input type="email" autoComplete="email" placeholder="voce@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)}/></label>}
    {(view === "login" || view === "signup" || view === "recovery") && <label className="auth-label">{view === "recovery" ? "Nova senha" : "Senha"}<input type="password" autoComplete={view === "login" ? "current-password" : "new-password"} placeholder={view === "login" ? "Sua senha" : "Mínimo de 8 caracteres"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}/></label>}
    {(view === "signup" || view === "recovery") && <label className="auth-label">Confirme a senha<input type="password" autoComplete="new-password" placeholder="Digite novamente" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)}/></label>}
    {view === "login" && <button className="auth-text-button forgot-link" type="button" onClick={() => updateView("forgot")}>Esqueci minha senha</button>}
    <button className="auth-submit" disabled={busy || !configured}>{busy ? <><LoaderCircle size={17} className="spin"/> Aguarde…</> : <>{view === "login" ? "Entrar" : view === "signup" ? "Criar minha conta" : view === "forgot" ? "Enviar link de recuperação" : "Salvar nova senha"}<ArrowRight size={17}/></>}</button>
  </form>{view === "login" ? <p className="auth-switch">Ainda não tem conta? <button className="auth-text-button" onClick={() => updateView("signup")}>Cadastre-se</button></p> : view === "signup" ? <p className="auth-switch">Já tem conta? <button className="auth-text-button" onClick={() => updateView("login")}>Entrar</button></p> : <button className="auth-back" onClick={() => updateView("login")}><ArrowLeft size={15}/> Voltar para entrar</button>}<p className="auth-legal">Ao continuar, seus treinos ficam salvos no seu perfil privado.</p></div></section></main>;
}

