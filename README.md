# Xyra.Fi

**Xyra.Fi** is a **universal cross-chain lending protocol** built on [ZetaChain](https://www.zetachain.com/).
It unifies liquidity across multiple blockchains, enabling seamless supply, borrow, repay, and withdraw actions from any chain to any chain.

---

## 🌐 Overview

### Why Xyra.Fi?

Traditional lending protocols are siloed per chain - liquidity on Ethereum, Solana, or Base cannot easily interact. Xyra.Fi leverages ZetaChain’s **universal smart contracts** to unify liquidity, letting users supply and borrow across chains without bridging or manual swaps.

---

## 🏗️ Project Structure

```
Xyra/
├── contracts/                  # Solidity smart contracts
│   ├── src/                    # Protocol source code
│   │   ├── pool/               # LendingPool, PoolManager
│   │   ├── vaults/             # ERC4626 reserves
│   │   ├── interestRate/       # Interest rate logic
│   │   ├── liquidation/        # Liquidation mechanisms
│   │   ├── oracle/             # Price oracles
│   │   ├── swap/               # Cross-chain swap integration via Uni V2
│   │   ├── accessControl/      # Role & access control
│   │   ├── collateral/         # Collateral management
│   │   └── protocol/           # Base + Universal contracts
│   ├── script/                 # Deployment & setup scripts
│   └── test/                   # Foundry unit tests
│
├── e2e/                        # End-to-end cross-chain tests
│   └── src/                    # Scripts for testing cross-chain calls
│
├── frontend/                   # Next.js frontend app
│   ├── app/                    # Pages (home, supply, borrow, portfolio)
│   ├── lib/                    # Chain configs, ABIs, utilities, Zeta Gateway Interaction
│   └── components/             # Reusable UI components
│
└── README.md                   # Project documentation

```

---

## ✨ Features

- **Supply to Vaults**

  - Supply liquidity from **Ethereum Sepolia**, **Base Sepolia**, **Zeta Athens**, or **Solana Devnet**.
  - Supply can be done **on behalf of another address**.
  - If the supplied asset differs from the vault’s reserve asset, it is **automatically swapped**.

- **Borrow Across Chains**

  - Borrow from vaults to any chain and any address.
  - Assets are **swapped internally** if the borrowed asset differs from the vault’s underlying.

- **Withdraw Anywhere**

  - Withdraw supplied liquidity to a specific chain and address.
  - Withdrawals also support cross-asset swaps.

- **Repay Flexibly**

  - Repay borrowed positions from **any chain**, **any asset**, and even **on behalf of another address**.

---

## 📊 Supported Networks

| Action             | Sepolia | Base Sepolia | Zeta Athens | Solana Devnet |
| ------------------ | ------- | ------------ | ----------- | ------------- |
| Wallet Connections | ✅      | ✅           | ✅          | ✅            |
| Interact via       | ✅      | ✅           | ✅          | Coming Soon   |
| Supply             | ✅      | ✅           | ✅          | ✅            |
| Borrow             | ✅      | ✅           | ✅          | ✅            |
| Withdraw           | ✅      | ✅           | ✅          | ✅            |
| Repay              | ✅      | ✅           | ✅          | ✅            |

---

## 🚀 Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) for smart contracts
- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/) for frontend
- [Zeta Universal CLI](https://www.zetachain.com/docs) for cross-chain calls and running E2E Test cases
- Setup `.env` as required by each subdir

### Contracts

```bash
cd contracts
forge install
forge build
forge test
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### E2E Tests

```bash
cd e2e
npm install
npm test
```

## 👥 Contributors

Made with ❤️ by

- [@Aman035](https://github.com/Aman035)
- [@0xnilesh](https://github.com/0xnilesh)

for the **ZetaChain × Google Cloud AI Buildathon** 🚀
