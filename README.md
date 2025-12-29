# DEX-AMM: Uniswap V2-Style Decentralized Exchange

## Overview

DEX-AMM is a simplified implementation of a Uniswap V2-style Automated Market Maker (AMM) decentralized exchange. It enables users to:
- Provide liquidity by depositing equal proportions of two ERC-20 tokens
- Trade between the two tokens using a constant product formula (x*y=k)
- Earn trading fees by providing liquidity
- Mint and burn LP tokens that represent their share of the pool

## Features

- **Liquidity Management**: Add and remove liquidity with automatic LP token minting/burning
- **Swaps**: Trade between two tokens with a 0.3% fee
- **Fee Distribution**: Liquidity providers earn trading fees
- **AMM Formula**: Uses x*y=k to maintain liquidity ratio
- **Events**: Emits events for liquidity changes and swaps
- **Price Calculation**: View current token prices based on reserve ratios

## Architecture

### Contracts

#### MockERC20.sol
A basic ERC-20 token implementation for testing:
- Mints 1,000,000 tokens to deployer on initialization
- Includes a public `mint()` function for testing

#### DEX.sol
The main AMM contract implementing:
- `addLiquidity(uint256 amountA, uint256 amountB)`: Deposit tokens and receive LP tokens
- `removeLiquidity(uint256 liquidity)`: Withdraw tokens using LP tokens
- `swapAForB(uint256 amountA)`: Trade token A for token B
- `swapBForA(uint256 amountB)`: Trade token B for token A
- `getPrice()`: Returns current price of token B in terms of token A
- `getReserves()`: Returns current reserve amounts
- `getAmountOut()`: Calculates output amount for a given input

## Mathematical Implementation

### Liquidity Minting Formula

**First Liquidity Provider:**
```
Liquidity Minted = sqrt(amountA * amountB)
```

**Subsequent Providers:**
```
liquidityA = (amountA * totalSupply) / reserveA
liquidityB = (amountB * totalSupply) / reserveB
Liquidity Minted = min(liquidityA, liquidityB)
```

This ensures proportional ownership and prevents token loss.

### Swap Formula (Constant Product)

```
amountInWithFee = amountIn * (1000 - fee) / 1000 = amountIn * 997 / 1000
amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee)
```

Where:
- Fee = 0.3% (3 basis points)
- The product of reserves increases after each swap (fees add to reserve)
- Users receive slightly less output due to the fee

### Liquidity Removal

```
amountA = (liquidityBurned * reserveA) / totalLiquidity
amountB = (liquidityBurned * reserveB) / totalLiquidity
```

Users receive their proportional share of both reserves.

### Price Calculation

```
price = (reserveA * 10^18) / reserveB
```

Gives the price of token B in terms of token A with 18 decimal precision.

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Docker (for Docker setup)

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/KvPradeepthi/dex-amm.git
   cd dex-amm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile contracts**
   ```bash
   npm run compile
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Generate coverage report**
   ```bash
   npm run coverage
   ```

6. **Deploy contracts** (to Hardhat network)
   ```bash
   npm run deploy
   ```

### Docker Setup

1. **Build the Docker image**
   ```bash
   docker-compose build
   ```

2. **Run tests in Docker**
   ```bash
   docker-compose up
   ```

This will compile contracts and run all tests in an isolated environment.

## Project Structure

```
dex-amm/
├── contracts/
│   ├── DEX.sol              # Main AMM contract
│   └── MockERC20.sol        # Test token implementation
├── test/
│   └── DEX.test.js          # Comprehensive test suite (25+ tests)
├── scripts/
│   └── deploy.js            # Deployment script
├── hardhat.config.js        # Hardhat configuration
├── package.json             # Project dependencies
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker Compose setup
├── .gitignore              # Git ignore rules
├── .dockerignore            # Docker ignore rules
└── README.md               # This file
```

## Contract Addresses

After deployment, contracts will be deployed at the following addresses (on local Hardhat network):
- **TokenA**: Logged in deploy output
- **TokenB**: Logged in deploy output
- **DEX**: Logged in deploy output

Note: Addresses change with each deployment on the test network.

## Test Suite

The project includes 25+ comprehensive tests covering:

- **Initialization**: Token setup and initial state
- **Liquidity Management**: Adding and removing liquidity
- **Swaps**: Token swaps with proper output calculation
- **Price Calculation**: Price computation and amount output
- **Events**: Proper emission of LiquidityAdded, LiquidityRemoved, and Swap events
- **Edge Cases**: Invalid amounts, insufficient liquidity, overflow scenarios
- **AMM Invariants**: Verification of x*y=k maintenance

Run tests with:
```bash
npm test
```

Generate coverage with:
```bash
npm run coverage
```

## Known Limitations

1. **No Slippage Protection**: Smart contract doesn't enforce maximum slippage limits
2. **No Flash Loan Protection**: Contract doesn't protect against flash loan attacks
3. **Simple Price Calculation**: Price is based on direct reserve ratio without decimal considerations
4. **No Liquidity Limits**: No maximum/minimum liquidity constraints
5. **Test Environment Only**: Designed for educational purposes, not production use
6. **No Admin Functions**: No mechanism to pause or upgrade the contract
7. **No Multipath Swaps**: Can only swap between two tokens directly

## Security Considerations

1. **Checked Math**: All operations use safe arithmetic (Solidity 0.8.19+)
2. **Reentrancy Safety**: Tokens transferred after state changes
3. **Access Control**: Public functions have appropriate validations
4. **Input Validation**: All user inputs are validated before processing
5. **Event Logging**: All state changes emit events for transparency

### Not Production Ready
This implementation is for educational purposes only. Production deployment would require:
- Full security audit
- Flash loan protection mechanisms
- Upgrade and pause capabilities
- Rate limiting
- Time lock mechanisms
- Multi-signature governance

## Development

### Running a local Hardhat node
```bash
npx hardhat node
```

### Interacting with contracts
See test file for examples of how to interact with the DEX contract.

## Gas Optimization

- Uses direct arithmetic for calculations
- Stores reserves as state variables for quick access
- Minimizes storage operations during swaps

## Future Enhancements

1. Multi-token pools
2. Dynamic fee structures
3. Liquidity mining rewards
4. LP token staking mechanisms
5. Price oracle integration
6. Governance tokens
7. Cross-chain bridges
8. Farming contracts

## License

MIT License - see LICENSE file for details

## Authors

- KvPradeepthi

## References

- [Uniswap V2 Documentation](https://docs.uniswap.org/protocol/V2/introduction)
- [Constant Product AMM Formula](https://ethereum.org/en/developers/tutorials/uniswap-v2-annotated-code/)
- [ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20)
