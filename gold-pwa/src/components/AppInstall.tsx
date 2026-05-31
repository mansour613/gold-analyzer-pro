import { Download, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function AppInstall() {
  const [prompt, setPrompt] = useState<any>(null);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  async function installApp() {
    if (!prompt) return;
    await prompt.prompt();
    setPrompt(null);
  }

  return (
    <>
      {!online && (
        <div className="offline-banner">
          <WifiOff size={14} /> Connection lost. Reconnect to update gold data.
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      {prompt && (
        <button className="install-app-btn" onClick={installApp} type="button">
          <Download size={14} /> Install App
        </button>
      )}
    </>
  );
}
