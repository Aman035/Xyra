// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title xERC20 - mintable/burnable token controlled by pool only
contract xERC20 is ERC20, Ownable {
    constructor(string memory name_, string memory symbol_, address poolManager) ERC20(name_, symbol_) Ownable(poolManager) {}

    /// @notice Mint xERC20 tokens to a specified address (onlyOwner = pool)
    function mint(address to, uint256 amount) external onlyOwner {
        require(amount > 0, "xERC20: zero amount");
        _mint(to, amount);
    }

    /// @notice Burn xERC20 tokens from a specified address (onlyOwner = pool)
    function burn(address from, uint256 amount) external onlyOwner {
        require(amount > 0, "xERC20: zero amount");
        _burn(from, amount);
    }
}
