import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WalletProvider } from "@txnlab/use-wallet-react";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Markets from "./pages/Markets";
import Trade from "./pages/Trade";
import Home from "./pages/Home";
import { walletManager } from "./services/algorand/modern-wallet";

export default function App() {
  return (
    <WalletProvider manager={walletManager}>
      <div data-rk className="min-h-screen" style={{
        backgroundColor: 'var(--rk-colors-modalBackground)',
        color: 'var(--rk-colors-modalText)',
        fontFamily: 'var(--rk-fonts-body)'
      }}>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/trade/:symbol" element={<Trade />} />
          </Routes>
        </BrowserRouter>
      </div>
    </WalletProvider>
  );
}
