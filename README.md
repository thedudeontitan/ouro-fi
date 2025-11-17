# Velocity Finance (Ouro Finance) - Algorand Perpetual Futures DEX

## 🏆 Overview

Velocity Finance (formerly Ouro Finance) is a decentralized perpetual futures exchange built on the Algorand blockchain. This platform enables users to trade perpetual futures contracts with leverage, providing exposure to various cryptocurrency assets without needing to hold the underlying tokens.

### Key Features

- **Perpetual Futures Trading** - Trade crypto futures contracts without expiration dates
- **Leverage Trading** - Up to 10x leverage on positions
- **Multi-Asset Support** - Trade BTC, ETH, SOL, and ALGO perpetuals
- **Real-time Price Feeds** - Integration with external price oracles
- **USDC Collateral** - All positions backed by USDC stablecoin
- **Decentralized Architecture** - Built entirely on Algorand smart contracts
- **Modern UI/UX** - React-based frontend with TradingView charts

## 🛠️ Setup & Installation Instructions

### Prerequisites

- **Node.js** (v18+ recommended)
- **pnpm** package manager
- **Algorand Wallet** (Pera Wallet, MyAlgo, Defly, or Lute)
- **Testnet ALGO and USDC** for trading

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/thedudeontitan/ouro-fi.git
   cd ouro-fi
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (optional - defaults work for testnet)
   ```

4. **Start development server**
   ```bash
   pnpm run dev
   ```

5. **Access the application**
   ```
   Open http://localhost:5173 in your browser
   ```

### Build for Production

```bash
pnpm run build
pnpm run preview  # Preview production build locally
```

## 🔗 Deployed Smart Contracts & Assets

### Algorand Testnet Contracts

**Smart Contracts:**
- **Oracle Contract**: [`749789285`](https://testnet.algoexplorer.io/application/749789285)
- **DEX Contract**: [`749789305`](https://testnet.algoexplorer.io/application/749789305)
- **OrderBook Contract**: [`749789319`](https://testnet.algoexplorer.io/application/749789319)

**Asset:**
- **USDC (Testnet)**: [`10458941`](https://testnet.algoexplorer.io/asset/10458941)

**Deployer Account**: [`EGMQKGVAYLBI7TWVM4U5JDRKQDD6UVSTV7LFHHKGLFOKRAPCWAJSF7UAXI`](https://testnet.algoexplorer.io/address/EGMQKGVAYLBI7TWVM4U5JDRKQDD6UVSTV7LFHHKGLFOKRAPCWAJSF7UAXI)

### Recent Deployment Transactions
- Oracle Deployment: [`WCBGBIOOGJXB7W6XPENUZ6CYEZXPLD5HSUAQ4YPUJSCMJJFQZ63Q`](https://testnet.algoexplorer.io/tx/WCBGBIOOGJXB7W6XPENUZ6CYEZXPLD5HSUAQ4YPUJSCMJJFQZ63Q)
- DEX Deployment: [`KVHSDFH7L5G2XB22GMHB6ZLWEYAZR7UVDPLZRDP46VTR2VVKJBQQ`](https://testnet.algoexplorer.io/tx/KVHSDFH7L5G2XB22GMHB6ZLWEYAZR7UVDPLZRDP46VTR2VVKJBQQ)
- OrderBook Deployment: [`BQI5AZ7RICY2TQA3RJQWFWJJRYIADBT4SYOPPTKAMVQYFRU4OFMQ`](https://testnet.algoexplorer.io/tx/BQI5AZ7RICY2TQA3RJQWFWJJRYIADBT4SYOPPTKAMVQYFRU4OFMQ)

## 🏗️ Architecture & Components

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx      # Navigation with wallet connection
│   ├── TradingView.tsx # Chart integration
│   ├── Wallet.tsx      # Wallet connection component
│   └── ...
├── pages/              # Main application pages
│   ├── Trade.tsx       # Trading interface
│   ├── LandingPage.tsx # Home page
│   └── Markets.tsx     # Market overview
├── hooks/              # React hooks for logic
│   ├── useModernTrading.ts    # Trading operations
│   ├── useContracts.ts        # Smart contract interactions
│   └── useAlgorandWallet.ts   # Wallet management
├── services/           # External service integrations
│   └── algorand/       # Algorand blockchain services
│       ├── contracts.ts       # Contract definitions & ABIs
│       ├── transactions.ts    # Transaction utilities
│       └── modern-wallet.ts   # Wallet connection logic
└── utils/              # Utility functions
    ├── GetSymbolPrice.ts      # Price feed integration
    └── tokenBalances.ts       # Balance calculations
```

### Smart Contract Architecture

1. **OuroOracle Contract** - Price feed management and validation
2. **OuroDEX Contract** - Core trading logic, position management, and PnL calculations
3. **OuroOrderBook Contract** - Order matching and liquidity management

### Key Technologies

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Blockchain**: Algorand, AlgoSDK v3.5.2
- **Wallet Integration**: @txnlab/use-wallet-react (Pera, MyAlgo, Defly, Lute)
- **State Management**: React Query, Context API
- **Charts**: TradingView Charting Library
- **Deployment**: Vercel (Frontend), Algorand TestNet (Contracts)

## 🌐 Deployed Frontend

**Live Application**: [Velocity Finance on Vercel](https://velocity-finance.vercel.app)

### Application Features

- **Trading Interface**: Real-time trading with live price feeds
- **Portfolio Management**: View open positions, PnL, and trading history
- **Multi-Wallet Support**: Connect with popular Algorand wallets
- **Responsive Design**: Optimized for desktop and mobile devices
- **Real Transactions**: All trades execute on Algorand testnet

### How to Use

1. **Connect Wallet**: Use any supported Algorand wallet
2. **Get Testnet Tokens**:
   - ALGO: [Algorand Testnet Dispenser](https://testnet.algoexplorer.io/dispenser)
   - USDC: [Testnet USDC Faucet](https://app.algofi.org/faucet)
3. **Start Trading**: Select asset, set leverage, choose position size
4. **Monitor Positions**: Track PnL and manage risk in real-time

## 🧪 Testing & Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/components/TradingView.test.tsx
```

### Development Commands

```bash
# Start development server
pnpm dev

# Type checking
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint:fix

# Build optimization analysis
pnpm run build:analyze
```

### Smart Contract Deployment

```bash
# Deploy to testnet (requires Python environment)
cd scripts/
python3 deploy-usdc-contracts.py

# Opt contracts into USDC
python3 opt-in-usdc.py
```

## 📋 Project Highlights

### Technical Achievements

- **Full-Stack DeFi Application** - Complete trading platform from smart contracts to UI
- **Algorand Integration** - Native blockchain integration with proper transaction handling
- **Real Money Movements** - Actual USDC transfers with atomic transaction groups
- **Production Ready** - Deployed and functional on Algorand testnet
- **Modern Development Stack** - TypeScript, React 18, modern tooling

### DeFi Innovation

- **Perpetual Futures** - No expiration date contracts for continuous trading
- **Leverage Mechanism** - Risk-managed leveraged positions up to 10x
- **Multi-Asset Coverage** - Trade major cryptocurrencies via single platform
- **Decentralized Oracle** - On-chain price feeds for accurate valuations
- **Collateral Management** - USDC-backed positions for stability

### User Experience

- **Intuitive Interface** - Professional trading UI similar to centralized exchanges
- **Wallet Integration** - Seamless connection with popular Algorand wallets
- **Real-time Updates** - Live price feeds and position monitoring
- **Mobile Responsive** - Trading on any device

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔧 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Contact

- **GitHub**: [@thedudeontitan](https://github.com/thedudeontitan)
- **Project Link**: [https://github.com/thedudeontitan/ouro-fi](https://github.com/thedudeontitan/ouro-fi)
- **Live Demo**: [https://velocity-finance.vercel.app](https://velocity-finance.vercel.app)

---

*Built with ❤️ on Algorand blockchain*