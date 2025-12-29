// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DEX (Decentralized Exchange)
/// @notice Uniswap V2-style AMM with x*y=k formula
contract DEX is ERC20, Ownable {
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 private constant FEE = 3; // 0.3%
    
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed swapper, uint256 amountIn, uint256 amountOut, bool isAtoB);
    
    /// @notice Constructor initializes the DEX with two ERC20 tokens
    constructor(address _tokenA, address _tokenB) ERC20("DEX-LP", "DEXLP") {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
    
    /// @notice Get the current reserves
    /// @return _reserveA Reserve amount of token A
    /// @return _reserveB Reserve amount of token B
    function getReserves() public view returns (uint256 _reserveA, uint256 _reserveB) {
        return (reserveA, reserveB);
    }
    
    /// @notice Get the price of tokenB in terms of tokenA
    /// @return price Price as (reserveA * 10^18) / reserveB
    function getPrice() public view returns (uint256) {
        require(reserveB > 0, "No liquidity");
        return (reserveA * 10**18) / reserveB;
    }
    
    /// @notice Calculate output amount given input using x*y=k
    /// @param amountIn Input amount
    /// @param reserveIn Input reserve
    /// @param reserveOut Output reserve
    /// @return amountOut Output amount
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(amountIn > 0, "Invalid input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = (amountIn * 997) / 1000;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn + amountInWithFee;
        return numerator / denominator;
    }
    
    /// @notice Add liquidity to the pool
    /// @param amountA Amount of token A
    /// @param amountB Amount of token B
    /// @return liquidity LP tokens minted
    function addLiquidity(uint256 amountA, uint256 amountB) public returns (uint256) {
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        
        uint256 liquidity;
        
        if (totalSupply() == 0) {
            liquidity = sqrt(amountA * amountB);
        } else {
            uint256 liquidityA = (amountA * totalSupply()) / reserveA;
            uint256 liquidityB = (amountB * totalSupply()) / reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
            require(liquidity > 0, "Insufficient liquidity minted");
        }
        
        reserveA += amountA;
        reserveB += amountB;
        
        _mint(msg.sender, liquidity);
        
        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
        
        return liquidity;
    }
    
    /// @notice Remove liquidity from the pool
    /// @param liquidity Amount of LP tokens to burn
    /// @return amountA Token A amount returned
    /// @return amountB Token B amount returned
    function removeLiquidity(uint256 liquidity) public returns (uint256, uint256) {
        require(liquidity > 0, "Invalid liquidity");
        require(balanceOf(msg.sender) >= liquidity, "Insufficient balance");
        
        uint256 totalLiquidity = totalSupply();
        uint256 amountA = (liquidity * reserveA) / totalLiquidity;
        uint256 amountB = (liquidity * reserveB) / totalLiquidity;
        
        require(amountA > 0 && amountB > 0, "Insufficient liquidity");
        
        _burn(msg.sender, liquidity);
        
        reserveA -= amountA;
        reserveB -= amountB;
        
        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);
        
        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);
        
        return (amountA, amountB);
    }
    
    /// @notice Swap tokenA for tokenB
    /// @param amountA Amount of tokenA to swap
    /// @return amountB Amount of tokenB received
    function swapAForB(uint256 amountA) public returns (uint256) {
        require(amountA > 0, "Invalid amount");
        require(reserveA > 0 && reserveB > 0, "No liquidity");
        
        uint256 amountB = getAmountOut(amountA, reserveA, reserveB);
        require(amountB > 0, "Insufficient output");
        
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transfer(msg.sender, amountB);
        
        reserveA += amountA;
        reserveB -= amountB;
        
        emit Swap(msg.sender, amountA, amountB, true);
        
        return amountB;
    }
    
    /// @notice Swap tokenB for tokenA
    /// @param amountB Amount of tokenB to swap
    /// @return amountA Amount of tokenA received
    function swapBForA(uint256 amountB) public returns (uint256) {
        require(amountB > 0, "Invalid amount");
        require(reserveA > 0 && reserveB > 0, "No liquidity");
        
        uint256 amountA = getAmountOut(amountB, reserveB, reserveA);
        require(amountA > 0, "Insufficient output");
        
        tokenB.transferFrom(msg.sender, address(this), amountB);
        tokenA.transfer(msg.sender, amountA);
        
        reserveB += amountB;
        reserveA -= amountA;
        
        emit Swap(msg.sender, amountB, amountA, false);
        
        return amountA;
    }
    
    /// @notice Calculate square root using Babylonian method
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
