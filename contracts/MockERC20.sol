// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice Mock ERC20 token for testing purposes
contract MockERC20 is ERC20 {
    /// @notice Constructor that mints 1,000,000 tokens to the deployer
    /// @param name Token name
    /// @param symbol Token symbol
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /// @notice Mint tokens - for testing purposes
    /// @param amount Amount of tokens to mint
    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
