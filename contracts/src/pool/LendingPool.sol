// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../protocol/PoolConfigurationProvider.sol";
import "../interfaces/ILendingPool.sol";
import "../vaults/ERC4626Reserve.sol";

contract LendingPool is
    ILendingPool,
    PoolConfigurationProvider,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    IPoolManager public poolManager;
    IPriceOracle public priceOracle;
    ICollateralManager public collateralManager;
    IInterestRateModel public interestRateModel;

    /// @dev user => asset => shares deposited in the vault
    mapping(address => mapping(address => uint256)) internal userShares;

    /// @dev user => asset => debt amount
    mapping(address => mapping(address => uint256)) internal userDebt;

    event Supplied(
        address indexed asset,
        address indexed user,
        address indexed onBehalfOf,
        uint256 amount
    );
    event Withdrawn(
        address indexed asset,
        address indexed user,
        address indexed to,
        uint256 amount
    );
    event Borrowed(
        address indexed asset,
        address indexed user,
        address indexed onBehalfOf,
        uint256 amount
    );
    event Repaid(
        address indexed asset,
        address indexed user,
        address indexed repayer,
        uint256 amount
    );

    constructor(
        address _acm,
        address _poolManager,
        address _interestRateModel,
        address _priceOracle,
        address _collateralManager
    )
        PoolConfigurationProvider(
            _acm,
            _poolManager,
            _interestRateModel,
            _priceOracle,
            _collateralManager
        )
    {
        poolManager = IPoolManager(_poolManager);
        priceOracle = IPriceOracle(_priceOracle);
        collateralManager = ICollateralManager(_collateralManager);
        interestRateModel = IInterestRateModel(_interestRateModel);
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external override nonReentrant {
        require(amount > 0, "LendingPool: amount 0");
        address vaultAddr = poolManager.getVault(asset);
        require(vaultAddr != address(0), "LendingPool: unsupported asset");

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        IERC20(asset).approve(vaultAddr, amount);

        uint256 shares = ERC4626Reserve(vaultAddr).deposit(
            amount,
            address(this)
        );

        userShares[onBehalfOf][asset] += shares;

        emit Supplied(asset, msg.sender, onBehalfOf, amount);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override nonReentrant returns (uint256) {
        require(amount > 0, "LendingPool: amount 0");
        address vaultAddr = poolManager.getVault(asset);
        require(vaultAddr != address(0), "LendingPool: unsupported asset");

        uint256 sharesToBurn = ERC4626Reserve(vaultAddr).previewWithdraw(
            amount
        );
        require(
            userShares[msg.sender][asset] >= sharesToBurn,
            "LendingPool: insufficient balance"
        );

        userShares[msg.sender][asset] -= sharesToBurn;

        uint256 withdrawnAmount = ERC4626Reserve(vaultAddr).withdraw(
            amount,
            to,
            address(this)
        );

        emit Withdrawn(asset, msg.sender, to, withdrawnAmount);

        return withdrawnAmount;
    }

    function borrow(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external override nonReentrant {
        require(amount > 0, "Amount 0");
        address vaultAddr = poolManager.getVault(asset);
        require(vaultAddr != address(0), "Unsupported asset");

        // 1. Validate user collateral & health factor (not shown here, add your own checks)

        // 2. Increase user debt
        userDebt[onBehalfOf][asset] += amount;

        // 3. Transfer tokens from vault or pool to user (simplified)
        IERC20(asset).safeTransfer(onBehalfOf, amount);

        emit Borrowed(asset, onBehalfOf, onBehalfOf, amount);
    }

    function repay(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external override nonReentrant returns (uint256) {
        require(amount > 0, "Amount 0");
        address vaultAddr = poolManager.getVault(asset);
        require(vaultAddr != address(0), "Unsupported asset");

        uint256 debt = userDebt[onBehalfOf][asset];
        require(debt > 0, "No debt");

        // Calculate actual amount to repay (can't repay more than debt)
        uint256 repayAmount = amount > debt ? debt : amount;

        // Transfer tokens from user to pool/vault
        IERC20(asset).safeTransferFrom(msg.sender, address(this), repayAmount);

        // Decrease debt
        userDebt[onBehalfOf][asset] -= repayAmount;

        emit Repaid(asset, onBehalfOf, msg.sender, repayAmount);
        return repayAmount;
    }

    /// @notice View function to get user's vault shares for a given asset
    function getUserShares(
        address user,
        address asset
    ) external view returns (uint256) {
        return userShares[user][asset];
    }

    /// @notice View function to get user's underlying balance for an asset
    function getUserUnderlyingBalance(
        address user,
        address asset
    ) external view returns (uint256) {
        address vaultAddr = poolManager.getVault(asset);
        if (vaultAddr == address(0)) {
            return 0;
        }
        uint256 shares = userShares[user][asset];
        return ERC4626Reserve(vaultAddr).previewRedeem(shares);
    }

    function getUserTotalCollateral(
        address user
    ) public view returns (uint256 totalCollateralUsd) {
        address[] memory assets = poolManager.getAllAssets();

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            if (!poolManager.isCollateralEnabled(asset)) continue;

            address vaultAddr = poolManager.getVault(asset);
            uint256 shares = userShares[user][asset];
            if (shares == 0) continue;

            uint256 underlyingAmount = ERC4626Reserve(vaultAddr).previewRedeem(
                shares
            );

            // Use price oracle to get USD price with decimals handled
            uint256 price = priceOracle.getAssetPrice(asset); // Assume returns price in 1e18 scale
            uint256 decimals = ERC4626Reserve(vaultAddr).decimals();

            uint256 collateralValueUsd = (underlyingAmount * price) /
                (10 ** decimals);
            totalCollateralUsd += collateralValueUsd;
        }
    }

    function getUserTotalDebt(
        address user
    ) public view returns (uint256 totalDebtUsd) {
        address[] memory assets = poolManager.getAllAssets();

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 debt = userDebt[user][asset];
            if (debt == 0) continue;

            uint256 price = priceOracle.getAssetPrice(asset);
            address vaultAddr = poolManager.getVault(asset);
            uint256 decimals = ERC4626Reserve(vaultAddr).decimals();

            uint256 debtValueUsd = (debt * price) / (10 ** decimals);
            totalDebtUsd += debtValueUsd;
        }
    }

    function getHealthFactor(address user) public view returns (uint256) {
        uint256 totalCollateralUsd = getUserTotalCollateral(user);
        uint256 totalDebtUsd = getUserTotalDebt(user);

        if (totalDebtUsd == 0) return type(uint256).max; // no debt → max health

        // Liquidation threshold could be a protocol parameter, e.g., 0.85 (85%)
        uint256 liquidationThreshold = collateralManager
            .getLiquidationThreshold(user);

        return
            (totalCollateralUsd * liquidationThreshold * 1e18) / totalDebtUsd; // scaled by 1e18
    }
}
