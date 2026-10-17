const KEY = "theme";

/** Runs before first paint so the saved or system theme never flashes the wrong colors. */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem("${KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
