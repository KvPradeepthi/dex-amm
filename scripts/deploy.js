const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy MockERC20 tokens
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Token A", "TKNA");
  await tokenA.waitForDeployment();
  console.log("TokenA deployed to:", await tokenA.getAddress());

  const tokenB = await MockERC20.deploy("Token B", "TKNB");
  await tokenB.waitForDeployment();
  console.log("TokenB deployed to:", await tokenB.getAddress());

  // Deploy DEX
  const DEX = await hre.ethers.getContractFactory("DEX");
  const dex = await DEX.deploy(await tokenA.getAddress(), await tokenB.getAddress());
  await dex.waitForDeployment();
  console.log("DEX deployed to:", await dex.getAddress());

  console.log("\nDeployment complete!");
  console.log("TokenA:", await tokenA.getAddress());
  console.log("TokenB:", await tokenB.getAddress());
  console.log("DEX:", await dex.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
