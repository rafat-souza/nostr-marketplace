import "./App.css";
import { useNDK } from "./providers/NDKProvider";

function App() {
  const { ndk } = useNDK();

  if (!ndk) return <p>Conectando à rede Nostr...</p>;
  return <div>Conectado com sucesso!</div>;
}

export default App;
