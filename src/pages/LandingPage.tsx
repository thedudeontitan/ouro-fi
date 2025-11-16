import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getSymbolPrice } from "../utils/GetSymbolPrice";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

export default function LandingPage() {
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [algoPrice, setAlgoPrice] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getSymbolPrice("ETHUSD").then(setEthPrice),
      getSymbolPrice("BTCUSD").then(setBtcPrice),
      getSymbolPrice("SOLUSD").then(setSolPrice),
      getSymbolPrice("ALGOUSD").then(setAlgoPrice),
    ]);
  }, []);

  const popularMarkets = [
    { symbol: "ETH", name: "Ethereum", price: ethPrice, change: -3.23, icon: "/eth.png" },
    { symbol: "BTC", name: "Bitcoin", price: btcPrice, change: 2.41, icon: "/btc.png" },
    { symbol: "SOL", name: "Solana", price: solPrice, change: -1.87, icon: "/sol.png" },
    { symbol: "ALGO", name: "Algorand", price: algoPrice, change: 1.24, icon: "/algorand.png" },
  ];

  const features = [
    {
      title: "Off-Chain Order Book",
      description: "Lightning-fast order placement and execution with minimal latency",
      icon: "🤖",
    },
    {
      title: "On-Chain Settlement",
      description: "Trustless and transparent trade settlement via smart contracts",
      icon: "🛡️",
    },
    {
      title: "Leverage Trading",
      description: "Trade with up to 100x leverage on major assets like ETH, BTC, SOL, and ALGO",
      icon: "⚡",
    },
    {
      title: "Low Trading Costs",
      description: "Minimal fees leveraging efficient infrastructure for cost-effective trading",
      icon: "💰",
    },
    {
      title: "Advanced Analytics",
      description: "Real-time price feeds, PnL tracking, and comprehensive portfolio analytics",
      icon: "📊",
    },
    {
      title: "Smart Risk Management",
      description: "Competitive funding rates and advanced risk controls for safer trading",
      icon: "🔒",
    },
  ];

  const roadmapData = [
    {
      quarter: "Q1 2025",
      title: "Initial Launch",
      description: "Launch of core trading features and initial market pairs",
      items: [
        "ETH, BTC, SOL, ALGO trading pairs",
        "Off-chain order book deployment",
        "Basic leverage trading features",
      ],
      status: "current",
    },
    {
      quarter: "Q2 2025",
      title: "Advanced Trading Features",
      description: "Enhanced trading capabilities and improved user experience",
      items: [
        "Advanced order types",
        "Position management tools",
        "Enhanced risk controls",
      ],
    },
    {
      quarter: "Q3 2025",
      title: "Analytics and Insights",
      description: "Comprehensive trading analytics and portfolio insights",
      items: [
        "Advanced PnL tracking",
        "Portfolio analytics dashboard",
        "Market trend analysis",
      ],
    },
    {
      quarter: "Q4 2025",
      title: "Platform Expansion",
      description: "Additional features and market expansion",
      items: [
        "More trading pairs",
        "Cross-chain integration",
        "Enhanced liquidity pools",
      ],
    },
  ];

  return (
    <motion.main
      className="min-h-screen"
      style={{ backgroundColor: '#242931' }}
      initial="hidden"
      animate="show"
      variants={container}
    >
      <div className="pt-20 px-4 lg:px-5 max-w-[1600px] mx-auto mt-5">
        {/* Hero Section */}
        <motion.div
          className="flex flex-col gap-10 bg-gradient-to-br p-8 lg:p-20 rounded-3xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #5e81ac 0%, #a3be8c 100%)`,
            color: '#eceff4'
          }}
          variants={item}
        >

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <pattern
                id="hero-pattern"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path d="M0 0h40v40H0z" fill="none" />
                <circle cx="20" cy="20" r="1" fill="currentColor" />
                <path
                  d="M0 20h40M20 0v40"
                  stroke="currentColor"
                  strokeWidth="0.2"
                />
              </pattern>
              <rect width="100%" height="100%" fill="url(#hero-pattern)" />
            </svg>
          </div>

          <div className="w-full flex flex-col lg:flex-row gap-12 lg:gap-20 relative z-10">
            <motion.div className="flex flex-col gap-8" variants={container}>
              <motion.h1
                className="text-4xl lg:text-6xl font-bold lg:w-[45vw] leading-tight"
                variants={item}
              >
                Ouro Finance: Next-Gen Perpetual Trading
              </motion.h1>
              <motion.h2
                className="text-xl opacity-80 max-w-2xl"
                variants={item}
              >
                Experience lightning-fast perpetual trading with off-chain
                execution and on-chain settlement for maximum security and
                efficiency
              </motion.h2>
              <motion.div variants={item}>
                <motion.button
                  className="px-10 py-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center gap-2"
                  style={{
                    backgroundColor: '#242931',
                    color: '#eceff4',
                  }}
                  onClick={() => navigate("/trade/ALGOUSD")}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                >
                  Start Trading
                  <motion.span
                    initial={{ x: 0 }}
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    →
                  </motion.span>
                </motion.button>
              </motion.div>
            </motion.div>

            <motion.div
              className="lg:ml-auto flex flex-col gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.div
                className="backdrop-blur-sm p-8 rounded-2xl text-xl font-bold w-full lg:w-[400px]"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                Trade Major Assets
                <div className="text-base font-normal mt-2 opacity-70">
                  ETH, BTC, SOL, and ALGO with up to 100x leverage
                </div>
              </motion.div>
              <motion.div
                className="backdrop-blur-sm p-8 rounded-2xl text-xl font-bold w-full lg:w-[400px]"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                Ultra-Low Latency
                <div className="text-base font-normal mt-2 opacity-70">
                  Off-chain order book for instant execution
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Stats Section */}
          <motion.div
            className="flex flex-col lg:flex-row gap-10 relative z-10"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <div className="flex flex-row gap-20">
              <motion.div className="flex flex-col gap-4" variants={item}>
                <motion.span
                  className="text-6xl font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                >
                  4
                </motion.span>
                <span className="text-xl opacity-80">Trading Pairs</span>
              </motion.div>
              <motion.div className="flex flex-col gap-4" variants={item}>
                <motion.span
                  className="text-6xl font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
                >
                  100x
                </motion.span>
                <span className="text-xl opacity-80">Max Leverage</span>
              </motion.div>
              <motion.div className="flex flex-col gap-4" variants={item}>
                <motion.span
                  className="text-6xl font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.0, type: "spring", stiffness: 200 }}
                >
                  0.1%
                </motion.span>
                <span className="text-xl opacity-80">Trading Fee</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Popular Markets */}
        <motion.section
          className="py-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={container}
        >
          <motion.div className="text-center mb-16" variants={item}>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ color: '#eceff4' }}>
              Popular Markets
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: '#d8dee9' }}>
              Trade the most popular crypto assets with competitive spreads
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {popularMarkets.map((market) => (
              <motion.div
                key={market.symbol}
                onClick={() => navigate(`/trade/${market.symbol}USD`)}
                className="backdrop-blur-sm p-8 rounded-2xl border-0 cursor-pointer group"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                variants={item}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: '#3b4252' }}>
                    {market.icon ? (
                      <img src={market.icon} alt={market.name} className="w-8 h-8" />
                    ) : (
                      <span className="text-white font-bold">{market.symbol[0]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: '#eceff4' }}>
                      {market.symbol}/USD
                    </h3>
                    <p className="text-sm" style={{ color: '#d8dee9' }}>
                      {market.name}
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold mb-2"
                     style={{ color: '#a3be8c' }}>
                  ${market.price.toLocaleString(undefined, {
                    minimumFractionDigits: market.price < 1 ? 6 : 2,
                    maximumFractionDigits: market.price < 1 ? 8 : 2
                  })}
                </div>
                <div className={`text-sm font-medium`}
                     style={{
                       color: market.change >= 0
                         ? '#a3be8c'
                         : '#bf616a'
                     }}>
                  {market.change >= 0 ? "+" : ""}{market.change}%
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          className="py-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={container}
        >
          <motion.div className="text-center mb-16" variants={item}>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ color: '#eceff4' }}>
              Advanced Trading Features
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: '#d8dee9' }}>
              Everything you need for professional perpetual trading in one platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="backdrop-blur-sm p-8 rounded-2xl border-0 h-full group"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                variants={item}
              >
                <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                     style={{
                       background: `linear-gradient(135deg, #5e81ac 0%, #a3be8c 100%)`
                     }}>
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: '#eceff4' }}>
                  {feature.title}
                </h3>
                <p className="text-lg leading-relaxed" style={{ color: '#d8dee9' }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Roadmap Section */}
        <section className="py-20 px-4 lg:px-40">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 tracking-tighter" style={{ color: '#eceff4' }}>
              Platform Roadmap
            </h2>
            <p className="text-xl max-w-3xl mx-auto tracking-tight" style={{ color: '#d8dee9' }}>
              Our journey to build the most advanced perpetual trading platform
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-px transform -translate-x-1/2"
                 style={{
                   background: `linear-gradient(to bottom, #5e81ac, #a3be8c)`
                 }} />

            <div className="space-y-20">
              {roadmapData.map((milestone, index) => (
                <div
                  key={index}
                  className={`relative flex flex-col lg:flex-row gap-8 lg:gap-16 items-start ${
                    index % 2 === 0 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`absolute left-8 lg:left-1/2 w-8 h-8 -translate-x-1/2 rounded-full border-2
                      ${
                        milestone.status === "current"
                          ? "bg-gradient-to-r border-0"
                          : "border-opacity-30"
                      }`}
                    style={{
                      borderColor: milestone.status === "current" ? 'transparent' : '#5e81ac',
                      background: milestone.status === "current"
                        ? `linear-gradient(135deg, #5e81ac 0%, #a3be8c 100%)`
                        : 'transparent'
                    }}
                  >
                    <span className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs">
                      📅
                    </span>
                  </div>

                  <div
                    className={`w-full lg:w-[calc(50%-3rem)] pl-20 lg:pl-0 ${
                      index % 2 === 0 ? "lg:text-right" : ""
                    }`}
                  >
                    <div
                      className={`p-8 rounded-2xl backdrop-blur-sm border-2 transition-all duration-300 hover:scale-102
                      ${
                        milestone.status === "current"
                          ? "border-opacity-100"
                          : "border-opacity-10"
                      }`}
                      style={{
                        backgroundColor: milestone.status === "current"
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderColor: milestone.status === "current"
                          ? '#5e81ac'
                          : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="flex items-start gap-6">
                        <div className="h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={{
                               background: `linear-gradient(135deg, #5e81ac 0%, #a3be8c 100%)`
                             }}>
                          <span className="text-xl">🚀</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium${
                                milestone.status === "current"
                                  ? ""
                                  : ""
                              }`}
                              style={{
                                backgroundColor: milestone.status === "current"
                                  ? 'rgba(94, 129, 172, 0.2)'
                                  : 'rgba(255, 255, 255, 0.1)',
                                color: milestone.status === "current"
                                  ? '#5e81ac'
                                  : '#d8dee9'
                              }}
                            >
                              {milestone.quarter}
                            </span>
                            {milestone.status === "current" && (
                              <span className="text-sm px-3 py-1 rounded-full flex items-center gap-2"
                                    style={{
                                      color: '#a3be8c',
                                      backgroundColor: 'rgba(163, 190, 140, 0.1)'
                                    }}>
                                <div className="w-2 h-2 rounded-full animate-pulse"
                                     style={{ backgroundColor: '#a3be8c' }} />
                                Current Focus
                              </span>
                            )}
                          </div>
                          <h3 className="text-2xl font-bold mb-3 tracking-tight" style={{ color: '#eceff4' }}>
                            {milestone.title}
                          </h3>
                          <p className="mb-4 tracking-tight" style={{ color: '#d8dee9' }}>
                            {milestone.description}
                          </p>
                          <ul className="space-y-3">
                            {milestone.items.map((item, itemIndex) => (
                              <li
                                key={itemIndex}
                                className="flex items-center gap-3"
                                style={{ color: '#d8dee9' }}
                              >
                                <div className="w-1.5 h-1.5 rounded-full"
                                     style={{
                                       background: `linear-gradient(135deg, #5e81ac 0%, #a3be8c 100%)`
                                     }} />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="text-center">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 tracking-tighter" style={{ color: '#eceff4' }}>
              Ready to Start Trading?
            </h2>
            <p className="text-xl max-w-3xl mx-auto tracking-tight mb-8" style={{ color: '#d8dee9' }}>
              Join thousands of traders already using Ouro Finance to trade crypto derivatives
            </p>
            <button
              onClick={() => navigate("/trade/ALGOUSD")}
              className="px-10 py-6 rounded-2xl font-bold text-lg transition-all duration-300"
              style={{
                backgroundColor: '#a3be8c',
                color: '#242931',
              }}
            >
              Launch App
            </button>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t py-8"
              style={{
                backgroundColor: '#3b4252',
                borderColor: '#434c5e'
              }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img src="/logo.png" alt="Ouro Logo" className="w-8 h-8 rounded-full" />
              <span className="text-xl font-bold" style={{ color: '#eceff4' }}>
                Ouro Finance
              </span>
            </div>
            <div className="flex space-x-6" style={{ color: '#d8dee9' }}>
              <Link to="/docs" className="transition-colors hover:opacity-80">Docs</Link>
              <Link to="/terms" className="transition-colors hover:opacity-80">Terms</Link>
              <Link to="/privacy" className="transition-colors hover:opacity-80">Privacy</Link>
              <Link to="https://github.com/HackArchive/ouro-finance" target="_blank" className="transition-colors hover:opacity-80">
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </motion.main>
  );
}