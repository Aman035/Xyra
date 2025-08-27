// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "../protocol/BaseContract.sol";
// import "../interfaces/ILiquidationManager.sol";
// import "../interfaces/ICollateralManager.sol";

// /// @title Liquidation Manager for Handling Undercollateralized Borrowers in Lending Protocols
// /// @author
// /// @notice Triggers liquidations when users fall below minimum health factor threshold.
// /// @dev Coordinates with CollateralManager, DToken, and AToken to seize collateral and reduce debt.
// /// Supports partial liquidations, slippage tolerance, and liquidator incentives.
// /// Can be paused or upgraded via AccessControlManager in case of market emergencies.
// contract LiquidationManager is ILiquidationManager, BaseContract {
//     using SafeERC20 for IERC20;

//     // Liquidation bonus (5% = 1.05e27)
//     uint256 public constant LIQUIDATION_BONUS = 1.05e27;

//     // Maximum amount that can be liquidated in one tx (50%)
//     uint256 public constant CLOSE_FACTOR = 0.5e27;

//     ICollateralManager public immutable collateralManager;

//     event PositionLiquidated(
//         address indexed user,
//         address indexed repayAsset,
//         uint256 repayAmount,
//         address indexed collateralAsset,
//         uint256 liquidatedCollateralAmount
//     );

//     constructor(
//         address _acm,
//         address _collateralManager
//     ) BaseContract(_acm) {
//         require(_collateralManager != address(0), "Invalid collateral manager");
//         collateralManager = ICollateralManager(_collateralManager);
//     }

//     function liquidate(
//         address user,
//         address repayAsset,
//         uint256 repayAmount,
//         address collateralAsset
//     ) external override {
//         require(user != address(0), "Invalid user address");
//         require(repayAsset != address(0), "Invalid repay asset");
//         require(collateralAsset != address(0), "Invalid collateral asset");
//         require(repayAmount > 0, "Amount must be greater than 0");
//         require(isLiquidatable(user), "Position not liquidatable");

//         // Calculate the amount of collateral to seize
//         uint256 collateralAmount = _calculateSeizeAmount(
//             repayAsset,
//             repayAmount,
//             collateralAsset
//         );

//         // Transfer repay asset from liquidator
//         IERC20(repayAsset).safeTransferFrom(msg.sender, address(this), repayAmount);

//         // Update debt and collateral positions
//         // Note: These would need to interact with your LendingPool contract
//         _repayDebt(user, repayAsset, repayAmount);
//         _seizeCollateral(user, collateralAsset, collateralAmount, msg.sender);

//         emit PositionLiquidated(
//             user,
//             repayAsset,
//             repayAmount,
//             collateralAsset,
//             collateralAmount
//         );
//     }

//     function isLiquidatable(address user) public view override returns (bool) {
//         uint256 healthFactor = collateralManager.getHealthFactor(user);
//         return healthFactor < 1e27; // 1.0 in ray format
//     }

//     function _calculateSeizeAmount(
//         address repayAsset,
//         uint256 repayAmount,
//         address collateralAsset
//     ) internal view returns (uint256) {
//         // This would need to use your price oracle to convert between assets
//         // and apply the liquidation bonus
//         // Simplified example:
//         return (repayAmount * LIQUIDATION_BONUS) / 1e27;
//     }

//     function _repayDebt(
//         address user,
//         address asset,
//         uint256 amount
//     ) internal {
//         // Implementation would need to interact with your debt tokens
//         // and lending pool
//     }

//     function _seizeCollateral(
//         address user,
//         address asset,
//         uint256 amount,
//         address recipient
//     ) internal {
//         // Implementation would need to interact with your collateral tokens
//         // and lending pool
//     }
// }
