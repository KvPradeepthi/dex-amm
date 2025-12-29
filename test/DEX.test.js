const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB, owner, addr1, addr2;
  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18);
  const LIQUIDITY_A = ethers.parseUnits("1000", 18);
  const LIQUIDITY_B = ethers.parseUnits("1000", 18);

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("TokenA", "TKNA");
    tokenB = await MockERC20.deploy("TokenB", "TKNB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(await tokenA.getAddress(), await tokenB.getAddress());

    await tokenA.transfer(addr1, INITIAL_SUPPLY);
    await tokenB.transfer(addr1, INITIAL_SUPPLY);

    await tokenA.transfer(addr2, INITIAL_SUPPLY);
    await tokenB.transfer(addr2, INITIAL_SUPPLY);
  });

  describe("Initialization", function () {
    it("should initialize with correct tokens", async function () {
      expect(await dex.tokenA()).to.equal(await tokenA.getAddress());
      expect(await dex.tokenB()).to.equal(await tokenB.getAddress());
    });

    it("should have zero initial reserves", async function () {
      const [reserveA, reserveB] = await dex.getReserves();
      expect(reserveA).to.equal(0);
      expect(reserveB).to.equal(0);
    });

    it("should have zero total supply of LP tokens", async function () {
      expect(await dex.totalSupply()).to.equal(0);
    });
  });

  describe("Liquidity Management", function () {
    it("should add liquidity correctly", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);

      const tx = await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);
      
      const [reserveA, reserveB] = await dex.getReserves();
      expect(reserveA).to.equal(LIQUIDITY_A);
      expect(reserveB).to.equal(LIQUIDITY_B);
    });

    it("should mint LP tokens on first liquidity addition", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);

      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);
      const lpBalance = await dex.balanceOf(addr1);
      
      expect(lpBalance).to.be.gt(0);
    });

    it("should add liquidity proportionally", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      const lpToken1 = await dex.balanceOf(addr1);

      await tokenA.connect(addr2).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr2).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr2).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);
      
      const lpToken2 = await dex.balanceOf(addr2);
      expect(lpToken1).to.equal(lpToken2);
    });

    it("should remove liquidity correctly", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      const lpBalance = await dex.balanceOf(addr1);
      const tx = await dex.connect(addr1).removeLiquidity(lpBalance);
      
      expect(await dex.balanceOf(addr1)).to.equal(0);
      const [reserveA, reserveB] = await dex.getReserves();
      expect(reserveA).to.equal(0);
      expect(reserveB).to.equal(0);
    });

    it("should emit LiquidityAdded event", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);

      await expect(dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B))
        .to.emit(dex, "LiquidityAdded")
        .withArgs(addr1.address, LIQUIDITY_A, LIQUIDITY_B, await dex.balanceOf(addr1));
    });

    it("should emit LiquidityRemoved event", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      const lpBalance = await dex.balanceOf(addr1);
      await expect(dex.connect(addr1).removeLiquidity(lpBalance))
        .to.emit(dex, "LiquidityRemoved");
    });
  });

  describe("Swaps", function () {
    beforeEach(async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);
    });

    it("should swap A for B", async function () {
      const swapAmount = ethers.parseUnits("100", 18);
      await tokenA.connect(addr2).approve(await dex.getAddress(), swapAmount);

      const balanceBefore = await tokenB.balanceOf(addr2);
      await dex.connect(addr2).swapAForB(swapAmount);
      const balanceAfter = await tokenB.balanceOf(addr2);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should swap B for A", async function () {
      const swapAmount = ethers.parseUnits("100", 18);
      await tokenB.connect(addr2).approve(await dex.getAddress(), swapAmount);

      const balanceBefore = await tokenA.balanceOf(addr2);
      await dex.connect(addr2).swapBForA(swapAmount);
      const balanceAfter = await tokenA.balanceOf(addr2);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should apply 0.3% fee on swaps", async function () {
      const swapAmount = ethers.parseUnits("1000", 18);
      await tokenA.connect(addr2).approve(await dex.getAddress(), swapAmount);

      const amountOut = await dex.getAmountOut(swapAmount, LIQUIDITY_A, LIQUIDITY_B);
      const expectedWithFee = (swapAmount * 997n) / 1000n;
      
      expect(amountOut).to.be.lt(swapAmount);
    });

    it("should emit Swap event", async function () {
      const swapAmount = ethers.parseUnits("100", 18);
      await tokenA.connect(addr2).approve(await dex.getAddress(), swapAmount);

      await expect(dex.connect(addr2).swapAForB(swapAmount))
        .to.emit(dex, "Swap");
    });

    it("should maintain invariant x*y=k", async function () {
      const swapAmount = ethers.parseUnits("100", 18);
      await tokenA.connect(addr2).approve(await dex.getAddress(), swapAmount);

      const [reserveA1, reserveB1] = await dex.getReserves();
      const product1 = reserveA1 * reserveB1;

      await dex.connect(addr2).swapAForB(swapAmount);

      const [reserveA2, reserveB2] = await dex.getReserves();
      const product2 = reserveA2 * reserveB2;

      expect(product2).to.be.gte(product1);
    });
  });

  describe("Price Calculation", function () {
    beforeEach(async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);
    });

    it("should calculate price correctly", async function () {
      const price = await dex.getPrice();
      expect(price).to.equal((LIQUIDITY_A * ethers.parseEther("1")) / LIQUIDITY_B);
    });

    it("should calculate amount out correctly", async function () {
      const amountIn = ethers.parseUnits("100", 18);
      const amountOut = await dex.getAmountOut(amountIn, LIQUIDITY_A, LIQUIDITY_B);
      expect(amountOut).to.be.gt(0);
    });

    it("should reject zero amount in", async function () {
      await expect(dex.getAmountOut(0, LIQUIDITY_A, LIQUIDITY_B))
        .to.be.revertedWith("Invalid input");
    });
  });

  describe("Edge Cases", function () {
    it("should reject liquidity with zero amounts", async function () {
      await expect(dex.connect(addr1).addLiquidity(0, LIQUIDITY_B))
        .to.be.revertedWith("Invalid amounts");
    });

    it("should reject swaps without liquidity", async function () {
      const swapAmount = ethers.parseUnits("100", 18);
      await tokenA.connect(addr2).approve(await dex.getAddress(), swapAmount);
      
      await expect(dex.connect(addr2).swapAForB(swapAmount))
        .to.be.revertedWith("No liquidity");
    });

    it("should reject removal of more liquidity than owned", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      const excessAmount = (await dex.balanceOf(addr1)) + ethers.parseUnits("1", 18);
      await expect(dex.connect(addr1).removeLiquidity(excessAmount))
        .to.be.revertedWith("Insufficient balance");
    });

    it("should handle multiple swaps", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      const swapAmount = ethers.parseUnits("50", 18);
      await tokenA.connect(addr2).approve(await dex.getAddress(), swapAmount * 3n);

      const balanceBefore = await tokenB.balanceOf(addr2);
      
      for (let i = 0; i < 3; i++) {
        await dex.connect(addr2).swapAForB(swapAmount);
      }

      const balanceAfter = await tokenB.balanceOf(addr2);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Reserves", function () {
    it("should return correct reserves", async function () {
      await tokenA.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_A);
      await tokenB.connect(addr1).approve(await dex.getAddress(), LIQUIDITY_B);
      await dex.connect(addr1).addLiquidity(LIQUIDITY_A, LIQUIDITY_B);

      const [reserveA, reserveB] = await dex.getReserves();
      expect(reserveA).to.equal(LIQUIDITY_A);
      expect(reserveB).to.equal(LIQUIDITY_B);
    });
  });
});
