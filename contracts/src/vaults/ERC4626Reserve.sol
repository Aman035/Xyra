// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ERC4626 Reserve Vault
/// @notice Basic interest-bearing vault for a given ERC20 asset
contract ERC4626Reserve is ERC4626 {
    constructor(IERC20 _asset)
        ERC20(
            string(abi.encodePacked("Vault ", ERC20(address(_asset)).name())),
            string(abi.encodePacked("v", ERC20(address(_asset)).symbol()))
        )
        ERC4626(_asset)
    {}
}
